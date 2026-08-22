# Backend implementation guide

## Boundary

Build a separate Admin API. The Vite application remains an untrusted browser client. The API owns authorization, validation, audit writes, authentik integration, GitHub credential exchange, and Podman workspace orchestration.

Recommended initial runtime: TypeScript with Fastify or NestJS and PostgreSQL. Prefer a small modular monolith until independent scaling or ownership justifies additional services.

## Modules

- `identity`: session validation and normalized current-user claims
- `users`: user lifecycle, invitations, groups, and session revocation
- `applications`: application registry, URLs, health, and OIDC configuration
- `authorization`: roles, groups, policies, and effective-access evaluation
- `audit`: append-only administrative and authentication event projection
- `workspaces`: desired state, provisioning jobs, lifecycle, quotas, and expiry
- `providers`: narrow clients for authentik, GitHub, Podman, and Tailscale

## API contract

All routes live below `/api/v1`. Mutations require CSRF protection where cookie sessions are used, an idempotency key for provisioning operations, and an audit context.

```text
GET    /session
DELETE /session
GET    /users
POST   /users/invitations
GET    /users/:id
PATCH  /users/:id
POST   /users/:id/groups
DELETE /users/:id/groups/:groupId
POST   /users/:id/sessions/revoke

GET    /applications
POST   /applications
GET    /applications/:id
PATCH  /applications/:id
GET    /applications/:id/access
PUT    /applications/:id/access

GET    /roles
GET    /audit-events

GET    /workspaces
POST   /workspaces
GET    /workspaces/:id
POST   /workspaces/:id/start
POST   /workspaces/:id/stop
DELETE /workspaces/:id
GET    /workspaces/:id/events
```

## Workspace create request

```json
{
  "repository": "dioscarr/Tabloid",
  "ref": "refs/heads/admin",
  "name": "admin-backend",
  "environmentProfile": "branch-default",
  "environment": {
    "LOG_LEVEL": "info",
    "FEATURE_AUDIT_EXPORT": "false"
  },
  "secretRefs": ["github-app-installation"],
  "ttlHours": 24,
  "resources": { "cpus": 2, "memoryMb": 4096, "diskGb": 20 },
  "extensions": ["github.copilot", "github.copilot-chat"]
}
```

The server returns `202 Accepted` with a workspace ID and provisioning status. Provisioning runs asynchronously and records ordered lifecycle events.

`environment` accepts only keys present in the selected profile's allowlist. `secretRefs` contains opaque server-side identifiers; secret values are never accepted from or returned to the browser.

## Data model

- `applications`: id, slug, name, branch, url, identity_provider_id, status
- `role_bindings`: subject_type, subject_id, role, application_id, created_by
- `workspace`: id, owner_id, repository, ref, status, hostname, expires_at, resource_policy
- `workspace_event`: workspace_id, sequence, type, message, occurred_at
- `audit_event`: actor_id, action, target_type, target_id, application_id, outcome, context, occurred_at

authentik remains the source of truth for identities, groups, sessions, and federation. Store external IDs rather than duplicating passwords or identity secrets.

## Workspace provisioning

1. Authorize the owner and validate repository/ref against an allowlist.
2. Create a short-lived GitHub credential with only required repository permissions.
3. Create a dedicated Podman network and persistent workspace volume.
4. Start a purpose-built code-server image as a non-root user with CPU, memory, process, and disk quotas.
5. Clone the repository into the persistent workspace and check out the requested branch.
6. Run `npm run env:branch -- --branch <branch>` to generate public branch configuration in `.env.local`.
7. Resolve approved secret references into process-scoped environment variables or mounted secret files. Do not write them to `.env.local`.
8. Configure Git identity without persisting a reusable personal access token in `.git/config`.
9. Start a dedicated Tailscale sidecar and expose code-server privately; never enable Funnel.
10. Verify code-server internally and through its private HTTPS URL before marking the workspace ready.
11. Revoke bootstrap credentials after clone and use short-lived credentials for future Git operations.
12. Stop expired workspaces automatically; require an explicit retention choice before deleting storage.

## Security requirements

- Never mount the Podman socket into the Admin frontend or code-server workspace.
- Run provisioning through a constrained worker with allowlisted operations and resource-name prefixes.
- Default-deny outbound access where practical; explicitly permit GitHub and required registries.
- Require MFA for owners and admins.
- Use short-lived GitHub App installation tokens instead of broad personal tokens.
- Validate clone URLs and refs; do not pass untrusted values through a shell.
- Encrypt secrets at rest, redact them from events, and rotate on suspected disclosure.
- Rate-limit invitations, access changes, workspace creation, and login callbacks.

## Backend test matrix

- authorization for every route and role
- owner lockout prevention
- unsafe redirect URI and repository rejection
- idempotent workspace creation
- failed clone, image pull, health check, and Tailscale authentication
- stop/start with persistent files intact
- expiry behavior and explicit deletion
- secret redaction in logs and audit context
- authentik/GitHub/Podman timeout and retry boundaries
