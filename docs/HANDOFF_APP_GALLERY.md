# Handoff: App Gallery

**Repository/branch:** `Tabloid/Tabloid-app-gallery`, `app-gallery`  
**Owns:** Governed template discovery, app configuration form, product brief
submission, and provisioning-request status.

## Source of truth

- UI: `Tabloid/Tabloid-app-gallery/src/main.js`
- Admin API contract: `api/server.js`, `api/app-templates.js`
- Worker contract: `docs/HANDOFF_WORKERS.md`

## Current boundary

Gallery submits `POST /api/v1/applications/provision` with a template ID,
lowercase app ID, branch, CSRF protection, and idempotency key. The API
persists the request and events but intentionally does not create a GitHub
branch, container, or Tailscale route until the provisioning provider is
installed.

## Safe implementation pattern

Keep the draft locally and server-side request ID separately. Retry unchanged
details with the same idempotency key. Display queued, running, verified,
failed, cancelled, and retryable states from the API rather than inferring
them from a button response. A successful `202` means accepted, not deployed.

## Next integration

Add a durable job consumer that claims one request, validates the governed
template again, creates or reuses the branch, waits for the image workflow,
registers the application, reconciles the private route, and records
evidence. The UI should link to the operation timeline and never expose
provider tokens.

