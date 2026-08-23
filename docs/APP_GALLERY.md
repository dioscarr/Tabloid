# App Gallery worker

## Threat boundary and authorization

The App Gallery browser is untrusted.  It may send only a template ID, name,
description, slug, optional intent, and an idempotency UUID.  The private
worker listens on `127.0.0.1` and is published only by Tailscale Serve.  It
accepts a request only when both the exact configured gallery origin and the
Tailscale-injected `Tailscale-User-Login` match the configured owner.  Do not
place another proxy in front of the loopback listener or forward that header.

`GET /api/v1/templates`, `POST /api/v1/apps`, and
`GET /api/v1/app-requests` are the complete App Gallery surface.  `GET
/healthz` returns no application or credential data for the local service
check.  CORS is exact-origin, includes `Vary: Origin`, and allows only
`content-type,idempotency-key`.

The browser never receives a GitHub token.  Configure a GitHub App
installation token interactively, scoped to **Contents: write** for
`dioscarr/Tabloid` only, with:

```powershell
.\scripts\configure-app-gallery-github-token.ps1 -ExpiresAt (Get-Date).ToUniversalTime().AddMinutes(55)
```

The token is DPAPI-protected for the Windows account, rejected when it has
five minutes or less remaining, and is never written to the repository,
response, audit record, or log.  Refresh it using the GitHub App token
exchange before it expires.  This bootstrap configuration is intentionally
server-side; it is not an API route.

## Creation, validation, and recovery

The checked-in `templates/app-gallery.json` is a registry, not client input.
Its IDs, source branches (`main`, `admin`, `app-gallery`, `big-news`, `tech`), and
`public/app.contract.json` path are validated before use.  The worker accepts
only a 2--48 character lowercase slug and creates only `apps/<slug>`.
It reads the selected source ref, creates a replacement contract blob/tree/
commit using GitHub Git Data APIs, then creates that exact ref.  It never
accepts a target ref, clone URL, shell command, Podman command, or template
path from the browser.

`POST /api/v1/apps` requires a UUID `Idempotency-Key`.  A key is bound to a
hash of the validated request; reuse with changed content returns `409`.
Concurrent creates are serialized by a local lock.  If a timeout occurs after
GitHub created the ref, retrying the same request recovers the ref and returns
its recorded status rather than creating another branch.  A reserved slug
returns `409`; malformed input returns `400`; expired/missing GitHub
credentials return `503`; GitHub failures return `502`.

Creation state is persisted in `%LOCALAPPDATA%\Tabloid\app-gallery-requests.json`
with atomic replacement.  The status endpoint returns redacted records only.
Every allowed read, create attempt, success, denial, conflict, and failure is
appended to `%LOCALAPPDATA%\Tabloid\app-gallery-audit.jsonl`; token values,
idempotency keys, request intent, and upstream response bodies are excluded.

## Operations and rollback

Configure the worker with the deployed App Gallery URL, not the API branch:

```powershell
.\scripts\configure-admin-branch-worker.ps1 `
  -AdminLogin 'owner@example.invalid' `
  -AdminOrigin 'https://tabloid-app-gallery-0f8e89.tail70b7f1.ts.net'
```

The worker is reached from that page through the existing private Tailscale
Serve origin `https://dio.tail70b7f1.ts.net:9443`; this public URL contains no
credential.  Test local liveness with `Invoke-WebRequest
http://127.0.0.1:8790/healthz`.  Test authenticated routes only through the
private Serve path.

To roll back the worker, stop the scheduled task and restore the prior
`admin-branch-worker.ps1`; this does not delete branches or request state.
To roll back one application, disable its deployment first and delete
`apps/<slug>` only through the reviewed GitHub change-management process.
Do not use Podman as an App Gallery dependency and do not delete state files
as a recovery action.
