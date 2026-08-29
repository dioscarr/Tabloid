# Admin API foundation

This directory is the server-side foundation that will replace the Admin UI's representative fixture data. The Vite frontend remains a separate, untrusted client; it has no access to identity-provider, GitHub, Podman, or Tailscale credentials.

When the `api` branch preview is deployed, the browser landing page at that branch origin is an API explorer for this service rather than a normal application shell. App Gallery continues to own preview-card presentation independently; browser clients use the public `VITE_ADMIN_API_ORIGIN` value to reach this API origin.

## Run

```powershell
$env:NODE_ENV = 'development'
$env:ADMIN_DEV_IDENTITY = '{"id":"dev-owner","displayName":"Development Owner","roles":["owner"]}'
$env:ADMIN_CSRF_SECRET = 'local-development-only-secret'
npm run start:api
```

`ADMIN_DEV_IDENTITY` is intentionally accepted only with `NODE_ENV=development`. It is a local development escape hatch, not an authentication mechanism. In every other mode the API is default-deny until a server-side session adapter is added.

## Configuration

| Variable | Purpose |
| --- | --- |
| `ADMIN_HOST`, `ADMIN_PORT` | Listener address and port; defaults are `0.0.0.0:8080`. |
| `ADMIN_DATA_DIR` | Non-public persistence directory. The container defaults to `/var/lib/tabloid-admin`; mount it as durable storage. |
| `ADMIN_STATIC_DIR` | Built Vite assets, defaulting to `dist`. The server rejects a data directory within it. |
| `ADMIN_ALLOWED_ORIGINS` | Comma-separated exact browser origins. No wildcard is accepted; HTTPS is required in production. Same-origin requests need no CORS grant. |
| `ADMIN_WORKSPACE_REPOSITORIES` | Comma-separated repository allowlist for queued workspace requests. An empty allowlist rejects every workspace request. |
| `ADMIN_CSRF_SECRET` | Server-only HMAC key for future cookie-session mutations. Mutations fail closed until it is configured. |
| `ADMIN_DEV_IDENTITY` | Development-only JSON identity; never use a `VITE_*` variable for it. |
| `BRAIN_API_URL` | Canonical HTTP(S) origin of the trusted Brain service (for example, `https://brain.internal`), without a path or credentials. App-intent analysis fails closed when it is unset. |
| `BRAIN_ADMIN_TOKEN` | Server-only Brain service token. Never use a `VITE_*` variable for it or return it to a client. App-intent analysis fails closed when it is unset. |

The API exposes authenticated reads for session, overview, users, applications, audit events, workspace requests, and governed app templates. Owners and admins can update a persisted user's `active`/`inactive` status through `PATCH /api/v1/users/:id/status`; an admin cannot change an owner, and the final active owner cannot be deactivated. Owners and admins can atomically replace application bindings through `PUT /api/v1/applications/:id/access`; this requires `X-Confirm-Access-Change: true`.

The App Gallery uses `GET /api/v1/app-templates` and `POST /api/v1/applications/provision`. Provision requests accept only a known `templateId` plus unique lowercase `appId` and `branch`, reject reserved identities, and persist a queued request, actor, lifecycle event, and hashed idempotency reference. A request does **not** create a Git branch, container, or application; the app-provisioning provider remains fail-closed until an explicit server-side implementation is installed.

Owners and admins can submit a 20–8000-character product brief through `POST /api/v1/app-intents`, then inspect persisted results through `GET /api/v1/app-intents` and `GET /api/v1/app-intents/:id`. The API creates an `analyzing` record before it calls the configured Brain service at `POST /api/v1/intents/decompose`; the server supplies `Authorization: Bearer $BRAIN_ADMIN_TOKEN` and an `X-Actor` derived from the authenticated session. Brain must return JSON containing `decomposition`. The API stores that provider response unchanged as the record's decomposition and marks it `draft`; it never synthesizes a decomposition. If Brain is unavailable, the stored record becomes `failed` with no decomposition and the response clearly reports the failure.

Owners can create queued workspace requests with `POST /api/v1/workspaces`, inspect them through `GET /api/v1/workspaces/:id` and `/api/v1/workspaces/:id/events`, then express start, stop, or deletion intent with `POST /api/v1/workspaces/:id/start`, `POST /api/v1/workspaces/:id/stop`, and `DELETE /api/v1/workspaces/:id`. These persist desired state only; they do not start containers, create credentials, or contact external systems.

Every mutation requires JSON, an allowed origin, a CSRF token, and an `Idempotency-Key`; successful mutations are audited. The `authentik`, GitHub, and Podman provider contracts are fail-closed placeholders until a server-side adapter is explicitly installed. They accept no client-provided credentials.

Data is stored outside static assets as JSON collections plus append-only audit, workspace-event, and app-provision-event streams. Audit contexts redact keys such as passwords, secrets, tokens, cookies, and credentials before writing.
