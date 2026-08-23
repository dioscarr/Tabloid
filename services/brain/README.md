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
