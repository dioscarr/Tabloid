# App Gallery browser contract

The App Gallery renders its local app inventory and starter template choices
without waiting for a worker, deployment system, Podman, or GitHub.

`VITE_APP_GALLERY_WORKER_ORIGIN` is an optional public origin for the private
worker. It is routing configuration only and must never contain a credential,
token, or secret. When set, the browser uses these worker routes:

```text
GET  /api/v1/templates
POST /api/v1/apps
GET  /api/v1/app-requests
```

The create request body is:

```json
{
  "templateId": "static",
  "name": "Example app",
  "slug": "example-app",
  "description": "Optional app description"
}
```

`POST /api/v1/apps` includes an `Idempotency-Key` header. The browser retains
that key when retrying unchanged details. The worker remains authoritative for
authorization, template validity, branch creation, preview deployment, and
all credentialed operations. A `401` or `403` is shown as a presentation-layer
permission-denied state; it is not a client-side authorization decision.

Template and request refresh failures show a stale-data notice while leaving
the gallery and create form available. Request cards only display branch or
preview information returned by the worker.
