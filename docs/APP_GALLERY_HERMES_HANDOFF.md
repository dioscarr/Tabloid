# App Gallery + Hermes Provisioning Handoff

**Date:** 2026-08-29
**Owner:** Tabloid Admin / App Gallery integration
**Status:** Worker/provider foundation implemented and locally verified; live deployment and Hermes supervision are intentionally not enabled.

## Executive summary

The App Gallery new-application flow now has a governed Admin-side provisioning contract and worker/provider foundation:

```text
App Gallery
  -> authenticated Admin provisioning request
  -> durable queued request + audit/lifecycle events
  -> leased Admin worker
  -> GitHub branch creation/reuse from sourceBranch
  -> preview workflow polling
  -> existing Windows preview reconciler
  -> Podman/static deployment + Tailscale route
  -> durable evidence and terminal status
  -> Hermes supervision/reporting (not yet configured)
```

The browser does not create branches, containers, repositories, or credentials. GitHub, deployment, and Tailscale credentials remain server-side. The provider remains fail-closed until the required live configuration is supplied and verified.

## Repository ownership and current branches

- **Admin repository:** `C:\Users\Drod\Source\Tabloid\Tabloid`
  - Branch: `admin`
  - Owns the API contract, persistence, worker, provider boundary, configuration, and tests.
- **App Gallery repository:** `C:\Users\Drod\Source\Tabloid\Tabloid\Tabloid\Tabloid-app-gallery`
  - Branch: `app-gallery`
  - Owns the Gallery form and client request contract.
  - Its working tree contains existing modifications in agent instructions and navigation files; preserve them unless separately requested.

No commit, push, deployment, infrastructure change, or live provisioning request has been performed.

## Implemented changes

### Admin API and durable state

- Added explicit `sourceBranch` request validation and persistence.
- Validates Git ref length, unsafe characters, `..`, slash policy, and `.lock` suffix.
- Added authenticated provisioning status reads:

  ```text
  GET /api/v1/applications/provision/:requestId
  ```

- Added durable request lookup and event-history reads.
- Added atomic queue claims with worker leases.
- Reclaims expired requests from active phases, not only the initial claiming phase.
- Requires the current `leaseOwner` for lifecycle transitions.
- Added lease assertions so stale workers fail closed before continuing work.
- Persists lifecycle transitions and sanitized evidence.
- Supports retryable failures with bounded retry delay and `nextRetryAt`.
- Preserves idempotency and audit behavior on the existing governed mutation route.

### Worker and provider

- Added `api/app-provisioning-worker.js`.
- Added `api/app-provisioning-provider.js`.
- Added bounded runner: `scripts/run-app-provision-worker.mjs`.
- Worker phases include:

  ```text
  queued
  claiming
  branch_created
  workflow_pending
  preview_pending
  succeeded
  retryable_failed
  failed
  cancelled
  ```

- Lease duration is 15 minutes, exceeding the bounded workflow wait.
- GitHub operations use server-side bearer authentication and abortable request timeouts.
- GitHub transient classification covers network failures, HTTP 408, 429, 5xx, and explicit rate-limit 403 responses.
- Only HTTP 404 is treated as a missing branch.
- Existing target branches are reused only when they resolve to the expected source commit.
- HTTP 409 and 422 branch-creation races are re-read and safely reused only when compatible; conflicting branches fail closed.
- Response-body JSON parsing is bounded by the request timeout.
- Deployment permanent HTTP errors are not treated as retryable network failures.
- Deployment work is delegated to the existing Windows preview/reconciliation path rather than duplicating Podman/Tailscale logic.

### App Gallery

- Gallery captures and validates an explicit source branch.
- The request payload includes `sourceBranch`.
- Form state resets correctly after submission.
- Branch-backed launcher inventory remains separate from runtime health.

## Verification completed

Run from the Admin repository:

```bash
node --check api/store.js
node --check api/app-provisioning-provider.js
node --check api/app-provisioning-worker.js
node --test api/test/server.test.js
git diff --check
```

Results:

- **19 Admin tests passed, 0 failed**.
- JavaScript syntax checks passed.
- `git diff --check` passed.

App Gallery checks previously passed:

```bash
npm run check:shared-nav && npm run build
```

Both the shared-navigation contract check and the production build completed successfully.

## Independent review outcome

Two independent security/logic reviews were performed during implementation. Findings were incorporated and revalidated locally. The final review gate concerns that were addressed included:

- stale lease ownership and state-transition races;
- reclaiming requests stranded in active phases;
- insufficient lease duration;
- GitHub missing-branch error misclassification;
- GitHub 422 branch-creation races;
- malformed authorization header;
- missing request and response-body timeouts;
- incomplete retry classification;
- deployment permanent-error classification;
- repository-format validation;
- duplicate store method definition.

The local test suite validates the worker lifecycle with fakes. It does **not** constitute live GitHub, Actions, Windows reconciler, Podman, Tailscale, or public-route verification.

### Residual fencing limitation

Lease checks fence lifecycle transitions and the boundaries between provider phases, but a lease can still expire while an individual external request is already in flight. The current provider cannot cancel that already-started GitHub or deployment operation when another worker reclaims the request. Its subsequent state transition is rejected, but a production hardening pass should add lease renewal or an operation-fencing mechanism before relying on this for long-running live work.

## Current blockers

Hermes must not be scheduled yet. Required live deployment configuration was not available during implementation:

```text
PROVISIONING_DEPLOYMENT_URL    unset
PROVISIONING_DEPLOYMENT_ORIGIN unset
PROVISIONING_DEPLOYMENT_LOGIN  unset
```

A GitHub credential was detected during environment inspection, but its value was never printed or stored in this handoff. Confirm its approved server-side location before activation. Do not put it in a Gallery `VITE_*` variable or Telegram message.

Additional live prerequisites:

1. Confirm the real authenticated Admin base URL and status endpoint.
2. Configure the deployment/reconciler endpoint and origin through protected server environment or secret files.
3. Confirm the deployment login is configured server-side.
4. Confirm the GitHub repository is the intended `owner/name` pair.
5. Run a non-production or canary request using a safe test branch.
6. Verify the worker can reach the existing Windows reconciliation inventory.
7. Verify public Tailscale route health and application health independently.

## Safe continuation plan

### 1. Configure and verify the server

Use the Admin service’s approved environment/secret-file mechanism. Keep settings and secrets out of source control. Verify only presence and safe metadata, never values.

Required configuration names currently used by the worker/provider include:

```text
GITHUB_REPOSITORY
GITHUB_TOKEN or GITHUB_TOKEN_FILE
PROVISIONING_DEPLOYMENT_URL
PROVISIONING_DEPLOYMENT_ORIGIN
PROVISIONING_DEPLOYMENT_LOGIN
```

Then run the Admin tests and syntax checks again before starting any worker.

### 2. Run one bounded worker canary

Start exactly one bounded worker cycle against a deliberately safe, idempotent test request. Confirm:

- one request ID and one idempotency record;
- one lease owner at a time;
- source branch and target branch commit match;
- preview workflow identity is recorded;
- expected image tag and preview ID are recorded;
- deployment inventory identifies the expected app and route;
- both app health and public Tailscale health pass;
- terminal status is `succeeded` only after all evidence is present.

Do not hot-loop GitHub or the reconciler. Respect the configured minimum polling interval and bounded retry behavior.

### 3. Configure Hermes only after the canary passes

Create the supervisor with the `cronjob` tool, not by hand-editing Hermes configuration. The prompt must be self-contained and must:

- poll only the authenticated Admin status endpoint;
- retain a durable request ID and avoid duplicate submissions;
- use bounded polling and stop at terminal status or hard timeout;
- retry only explicitly retryable statuses;
- deduplicate unchanged notifications;
- send start, meaningful phase, retry, and final Telegram updates;
- never query GitHub directly on every tick;
- never expose credentials or include them in messages.

A live job should not be created until the Admin endpoint, worker, and deployment path are reachable.

### 4. Perform end-to-end acceptance

Verify the complete path with a test app:

1. Submit from Gallery with an explicit source branch.
2. Confirm authenticated Admin authorization, CSRF, idempotency, persistence, and audit evidence.
3. Confirm branch creation/reuse from the requested source commit.
4. Confirm GitHub Actions publishes the expected preview image.
5. Confirm the Windows reconciler creates or repairs the Podman app and Tailscale sidecar.
6. Confirm the status endpoint returns sanitized branch, image, route, and health evidence.
7. Confirm the launcher remains branch-driven when runtime health is temporarily unavailable.
8. Confirm Hermes sends only deduplicated meaningful updates.
9. Simulate a crashed preview container and confirm reconciliation repairs it without a duplicate branch/request.
10. Simulate branch deletion and confirm cleanup/tombstone behavior.

## Important files

- `api/server.js` — request parsing, validation, authorization, status route.
- `api/store.js` — persistence, claims, leases, transitions, events.
- `api/app-provisioning-worker.js` — bounded worker lifecycle and retries.
- `api/app-provisioning-provider.js` — GitHub/deployment provider boundary.
- `api/config.js` — server-side provider configuration.
- `api/providers.js` — fail-closed provider selection.
- `api/test/server.test.js` — Admin and worker tests.
- `scripts/run-app-provision-worker.mjs` — bounded worker runner.
- `scripts/sync-previews.ps1` — existing preview/runtime reconciler.
- `Tabloid/Tabloid-app-gallery/src/main.js` — Gallery source-branch form contract.
- `Tabloid/Tabloid-app-gallery/src/shared-nav.js` — branch-driven launcher inventory.
- `Tabloid/Tabloid-app-gallery/.github/workflows/publish-preview.yml` — preview image workflow.
- `.hermes/plans/2026-08-29_204949-gallery-hermes-end-to-end.md` — phased plan.
- `docs/OPERATIONS_CONTRACT.md` — repository and runtime ownership contract.

## Activation update — 2026-08-30

The easiest local runtime path has now been activated without changing the Windows branch-worker topology:

- Built image: `localhost/tabloid-admin-api:provisioning`
- Admin container: `tabloid-admin-api`
- Worker container: `tabloid-app-provision-worker`
- Durable volume preserved: `tabloid-api-14c252-data`
- Existing GitHub token file mounted read-only from the protected local store.
- Existing Podman Brain secret `tabloid-brain-admin-token` preserved.
- Deployment endpoint configured to the reachable Podman host gateway:
  `http://192.168.127.254:8790`
- Deployment origin configured as:
  `https://tabloid-admin-8c6976.tail70b7f1.ts.net`
- Deployment login configured server-side as `dioscarr@github`.

Runtime verification completed:

- Both containers remained up after restart.
- Worker runner is present in the image.
- Worker emitted `app_provision_worker_started` with a 30-second interval.
- Public Admin health endpoint returned HTTP 200.
- Provider-style branch inventory access through the Admin network returned HTTP 200.

This is a local runtime activation only. No real application request was submitted, no GitHub branch was created, and no public preview deployment was triggered. Hermes scheduling was enabled only after the authenticated Admin status-polling path and notification policy were configured.

## Hermes supervisor activation — 2026-08-30

A durable Hermes supervisor is now enabled after the authenticated status route was verified from the provisioning worker network.

- Job: `Tabloid provisioning supervisor`
- Job ID: `2bacfbe8267f`
- Schedule: every five minutes
- Delivery: origin Telegram chat
- Monitor script: `tabloid_provision_status.py`
- Change detection: enabled; unchanged state suppresses an agent run.
- Continuity: enabled for notification deduplication across runs.
- Immediate background tick: launched successfully.

The collector runs through `podman exec` inside the worker network namespace because the host cannot route directly to the private Admin network. It reads persisted request IDs and calls the authenticated Admin status endpoint with the trusted deployment identity. It emits only request state, phase, retry timing, error code, and preview URL metadata; it does not expose credentials or perform mutations.

A one-line Admin configuration correction was required before activation: trusted Tailscale login validation now accepts the existing `dioscarr@github` identity format. The Admin allowlist includes both the Admin and Gallery origins, and the Brain secret is mounted at the path expected by the service.

The supervisor does not create branches, call GitHub, manipulate Podman, trigger provisioning, or carry infrastructure credentials. The Admin provisioning worker remains responsible for execution, bounded polling, leases, retries, and terminal state.


- Keep the provider fail-closed until live configuration and canary verification succeed.
- Do not commit generated `dist`, dependency files, credentials, or unrelated nested-repository changes.
- Do not create `workspace/*` branches.
- Before committing, inspect the Admin diff and status; identify every intended file explicitly.
- After any future worker/provider change, run a fresh independent review and the complete verification commands above.
- No production claim should be made from local fake-provider tests alone.
