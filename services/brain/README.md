# Brain service boundary

Browser clients may use the read-only `GET` API from approved Tabloid Tailnet
origins. They cannot configure tools or skills, create drafts, generate
proposals, publish, or roll back content.

The Admin server proxy is the only caller for mutations. Every mutation must
send:

- `Authorization: Bearer <BRAIN_ADMIN_TOKEN>` from
  `BRAIN_ADMIN_TOKEN` or `BRAIN_ADMIN_TOKEN_FILE`;
- an `Origin` exactly matching `BRAIN_ADMIN_ORIGIN`; and
- the authenticated user identity in `X-Actor`.

Brain sends that header identity to Authorization for the route-specific action
and fails closed if the decision is denied or unavailable. Body-supplied
actors are rejected. The Admin token must differ from `BRAIN_MCP_TOKEN`; MCP
is read-only and cannot mutate content.

Draft fields must exactly match an application/page surface in `catalog.js`.
Publishing and rollback additionally require `confirmed: true` after the
Authorization decision. There is no cookie authentication on this boundary,
so CSRF protection is not applicable; the bearer token, trusted server origin,
and actor authorization are required instead.

`POST /api/v1/intents/decompose` is an Admin-only `intents.decompose` mutation.
It accepts a strict `{ "intent": "...", "appIdHint": "optional-id" }` body,
requires an intent of 20–8000 characters, and persists the generated
decomposition in the control store's `intents` section. It returns 503 without
calling a model when the server-side Copilot token is not configured.

`deploy-brain.ps1` creates the shared `tabloid-brain-admin-token` Podman secret
when absent and mounts it at `/run/secrets/brain_admin_token`. The Admin
service should mount that same secret for its API proxy; deployments never
print its value.

## Skill Studio

The Skills section supports read-only previews plus governed Studio-mode create,
edit, scope, enable/disable, and delete actions. Browser mutations call the
Admin API at the public build-time `VITE_ADMIN_API_URL`; Admin applies identity,
role, CSRF, idempotency, and audit controls before forwarding to Brain with the
server-only Admin credential.

Brain exposes these Admin-only skill routes:

- `POST /api/v1/skills/generate` returns a reviewable draft and does not persist it;
- `POST /api/v1/skills` creates a validated skill;
- `GET /api/v1/skills/:id` returns the full preview, including instructions;
- `PUT /api/v1/skills/:id` updates content, tools, status, and application scope;
- `POST /api/v1/skills/:id` changes enabled status only; and
- `DELETE /api/v1/skills/:id` removes a custom or built-in skill.

Hermes generation uses the OpenAI-compatible Hermes API server. Configure only
on the Brain service:

- `HERMES_API_URL=http://host.containers.internal:8642/v1`
- `HERMES_API_KEY` or `HERMES_API_KEY_FILE`
- optional `HERMES_MODEL` (defaults to `hermes-agent`)

Start Hermes with its authenticated API server enabled before using Generate.
The key is server-side and must never be added to `VITE_*` variables or the
browser bundle. Skill drafts are schema-validated against Brain's registered
application and tool catalogs before they can be saved.
