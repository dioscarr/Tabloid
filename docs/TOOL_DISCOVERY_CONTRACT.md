# Brain tool discovery contract

Brain is the server-side MCP host and orchestrator. Applications expose capabilities
through this read-only discovery contract before any invocation is attempted.

`GET /api/v1/capabilities` (also available as `GET /api/v1/tools/discovery`) returns
JSON matching `services/brain/src/tool-contract.js`:

- `app`: stable application identity (`id`, `name`, `branch`)
- `capabilities`: stable tool id, display metadata, JSON-compatible `inputSchema`,
  `risk`, `approvalMode`, and `endpoint`/`protocol`
- `host`: the Brain host identity

Risk values are `read-only`, `generative`, `write`, or `destructive`. Approval modes
are `automatic`, `review`, `manual`, or `blocked`. Discovery never returns tokens,
credentials, or implementation secrets. Destructive capabilities are not currently
registered; future applications must default to `blocked` until explicitly approved.

The endpoint is browser-readable only from the existing allowlisted Tailnet origins,
or server-readable with the MCP bearer token. Capability invocation remains subject
to Brain authorization and tool enablement.
