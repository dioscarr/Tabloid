# Preview Deployment Platform

## Purpose

Make every non-`main` branch an independently deployable Tabloid application while keeping branch previews isolated, observable, reversible, and discoverable through the launcher.

Branches are products, not merge candidates. The deployment system must work when a branch is created from `main`, `admin`, `brain`, `Authorization`, or any other application branch.

## Current behavior

- `.github/workflows/publish-preview.yml` builds preview images after pushes to non-`main` branches.
- Images are published to GHCR using a branch preview tag.
- A Windows scheduled task runs `scripts/sync-previews.ps1` every five minutes.
- The script reconciles GitHub branches with Podman containers and Tailscale sidecars.
- Deleted branches have their recorded preview resources removed.
- The scheduled task currently uses an interactive Windows principal.

The five-minute task is a reconciliation safety net, not the ideal primary deployment trigger.

## Target architecture

```text
GitHub push
  -> GitHub Actions builds immutable image
  -> authenticated deployment webhook
  -> Podman deployment API
  -> app container + Tailscale sidecar
  -> readiness and connectivity checks
  -> deployment status and audit record
  -> Access Control registration
  -> launcher exposes authorized application
```

## Required implementation

### 1. Immediate deployment after a successful build

Update the preview workflow so that it:

1. Checks out the pushed branch.
2. Builds and publishes an immutable image tagged with the commit SHA.
3. Publishes a human-readable preview tag.
4. Sends an authenticated deployment request to the Podman host.
5. Waits for deployment health.
6. Reports the preview URL and commit in the GitHub Actions summary.

Required image tags:

```text
ghcr.io/dioscarr/tabloid:sha-<commit-sha>
ghcr.io/dioscarr/tabloid:preview-<branch-id>
```

The deployment must use `sha-<commit-sha>`, not a mutable tag.

### 2. Podman deployment API

Create a private deployment service on the Podman host with an endpoint similar to:

```http
POST /deploy
```

Request:

```json
{
  "repository": "dioscarr/Tabloid",
  "branch": "brain",
  "commit": "abc123",
  "image": "ghcr.io/dioscarr/tabloid:sha-abc123",
  "runtime": "dynamic",
  "appId": "brain"
}
```

The service must:

- Require an authentication token or signed webhook.
- Validate repository, branch, image, and commit values.
- Deploy only the requested branch.
- Preserve isolation between branch networks, containers, volumes, and Tailscale hostnames.
- Pull the exact immutable image.
- Replace containers safely.
- Run readiness checks before declaring success.
- Return deployment status, URL, image, and commit.
- Write an audit record for success and failure.
- Prevent concurrent deployments for the same branch.

Do not expose the deployment API publicly. It should be reachable only through the private Tailscale network.

### 3. Deployment state

Persist deployment state per branch:

```json
{
  "appId": "brain",
  "branch": "brain",
  "commit": "abc123",
  "image": "ghcr.io/dioscarr/tabloid:sha-abc123",
  "imageDigest": "sha256:...",
  "url": "https://tabloid-brain-xxxxxx.tail70b7f1.ts.net/",
  "status": "healthy",
  "deployedAt": "2026-08-23T12:00:00Z",
  "previousSuccessfulImage": "ghcr.io/dioscarr/tabloid:sha-old123"
}
```

Expose read-only deployment status for the Brain/Admin control planes.

### 4. Health and readiness

Every deployable application must expose a readiness endpoint, preferably `/health` or `/ready`.

A deployment is successful only when:

- The application container is healthy.
- The readiness endpoint responds successfully.
- The Tailscale sidecar authenticates.
- The sidecar can reach the application.
- The application reports the expected `appId`, branch, and commit.
- The final private URL responds.

Example response:

```json
{
  "status": "healthy",
  "appId": "brain",
  "branch": "brain",
  "commit": "abc123",
  "version": "2026.08.23.1"
}
```

### 5. Rollback

Add a rollback operation:

```http
POST /deployments/{branch}/rollback
```

Rollback must redeploy the previous known-good immutable image without rebuilding it.

Rollback actions must require authorization and create an audit event.

### 6. Reconciliation and cleanup

Keep `scripts/sync-previews.ps1`, but change its role to fallback reconciliation.

It must:

- Reconcile branch state at a safe interval.
- Detect missing or unhealthy deployments.
- Repair drift.
- Remove previews for deleted branches.
- Stop previews that exceed their configured TTL.
- Preserve protected branches.
- Never delete application data automatically.
- Use labels to identify only Tabloid-managed resources.

Required labels:

```text
io.dioscarr.tabloid.preview=true
io.dioscarr.tabloid.managed=true
io.dioscarr.tabloid.branch=<branch>
io.dioscarr.tabloid.commit=<commit>
io.dioscarr.tabloid.app-id=<appId>
```

Protected branches should include:

- `main`
- `brain`
- `admin`
- `Authorization`

### 7. Scheduled task reliability

The current task uses an interactive user session. Replace it with a dedicated deployment service account or Windows service.

Also add:

- Structured logs.
- Exit-code recording.
- Retry with backoff.
- A lock to prevent overlapping runs.
- Failure notifications.
- Last-successful-run status.
- Safe handling when GitHub or GHCR is unavailable.

### 8. Branch application contract

Every branch must declare its deployment metadata in its application contract:

```json
{
  "appId": "brain",
  "branch": "brain",
  "runtime": "dynamic",
  "deploy": true,
  "protected": true,
  "healthPath": "/health",
  "ttlDays": 30,
  "capabilities": [
    "content.read",
    "content.propose"
  ]
}
```

Supported runtimes:

- `static`
- `dynamic`
- `combined`

The workflow must derive identity and preview naming from the current branch and contract. It must not assume the branch was created from `main`.

### 9. Access Control and launcher integration

After a deployment succeeds:

1. Register or update the application in Access Control.
2. Store its branch, runtime, URL, capabilities, and health state.
3. Make the launcher display only applications visible to the current user.
4. Keep Brain as the topology/orchestration source.
5. Keep Access Control as the authority for visibility and access.

Deployment status must not be treated as authorization.

## Rollout order

### Phase 1 — Safe foundation

- Add immutable SHA image tags.
- Add health/readiness metadata.
- Add deployment state.
- Add deployment labels.
- Add tests for preview ID generation and branch isolation.

### Phase 2 — Deployment API

- Create the private Podman deployment API.
- Add authentication.
- Add per-branch locking.
- Add container replacement and readiness checks.
- Add deployment status and audit records.

### Phase 3 — GitHub integration

- Call the deployment API from `publish-preview.yml`.
- Wait for health confirmation.
- Publish URL and status in the workflow summary.
- Preserve the scheduled reconciler as fallback.

### Phase 4 — Operations

- Add rollback.
- Replace interactive scheduled task execution.
- Add TTL cleanup and protected branches.
- Add failure alerts and operational logs.

### Phase 5 — Platform integration

- Register deployments with Access Control.
- Expose deployment state to Brain/Admin.
- Filter launcher results through authorization.
- Add internal deployment controls.

## Acceptance criteria

The implementation is complete when:

- A push to any branch containing the workflow builds and publishes an image.
- The image is deployed using its immutable commit tag.
- A branch deployment does not affect another branch.
- The deployment URL is available only through the private Tailscale network.
- A failed health check leaves the previous healthy deployment available.
- Rollback restores the previous immutable image.
- Deleted branches are cleaned up safely.
- Protected branches are never removed automatically.
- The five-minute reconciler repairs drift but is not required for normal push deployment.
- Deployment state is visible to Brain/Admin.
- Access Control determines launcher visibility.
- No deployment secret is committed to Git or exposed to the browser.
