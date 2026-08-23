# Brain platform

Brain is the private intelligence and integration plane for every Tabloid application. It has two deliberately separate interfaces:

- **MCP server:** deterministic tools and resources for app discovery, route inspection, content operations, and future productivity integrations.
- **Agent gateway:** a server-side GitHub Copilot SDK adapter that can discover and invoke those MCP tools. Copilot credentials never enter a browser bundle.

## Application contract

Every branch carries `public/app.contract.json`. New branches created from `main` inherit it and must change the app identity, routes, and editable content surfaces for their product. CI runs `npm run check:brain-contract` before publishing a preview.

The first contract version describes:

- application identity and branch ownership;
- inbound, outbound, and bidirectional routes;
- HTTPS, MCP, event, and webhook protocols;
- admin-editable page surfaces and fields.

Brain discovers these contracts and turns them into its topology, tool catalog, and content studio. A branch is not considered fully integrated until its contract is valid and discoverable.

## Content lifecycle

1. An authenticated administrator opens the shared Brain Studio widget inside an app.
2. The widget reads the app contract and requests Brain's available tools.
3. The administrator selects a page surface and supplies an intent.
4. Brain asks the Copilot SDK agent to produce a structured proposal using only the allowed MCP tools.
5. The app renders a preview and a field-level diff.
6. A human approves the proposal.
7. Brain creates an auditable Git commit or pull request; it never writes directly from an unauthenticated browser request.

## Security boundaries

- Serve Brain only on the private tailnet.
- Require a bearer token or Tailscale identity at both `/mcp` and `/api/v1/*`.
- Store `COPILOT_GITHUB_TOKEN` and `BRAIN_MCP_TOKEN` only in the Brain service environment/secret store.
- Default all mutation tools to proposal-only. Publishing requires an explicit approval record and a narrowly scoped GitHub App/user token.
- Keep app tool allowlists in the contract; do not expose filesystem or shell tools to browser-originated sessions.
- Record the actor, app, surface, prompt, tool calls, diff, approval, commit, and rollback reference.

## Initial MCP tools

- `apps_list`
- `routes_list`
- `content_surfaces_list`
- `content_read`
- `content_propose`
- `content_publish` (disabled until approval and GitHub write integration are configured)

## Deployment shape

Run the Brain service as one persistent private container, separate from the static Brain UI. Give it a stable Tailscale name such as `tabloid-brain-api` and route `/mcp` and `/api/v1/*` to it. Static branch apps use the shared gateway and call only the authenticated REST facade; Copilot SDK and MCP traffic stay server-to-server.
