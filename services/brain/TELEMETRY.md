# Brain telemetry

Brain accepts sanitized application signals and exposes the aggregated results to the topology UI and MCP clients.

## Runtime paths

- `POST /api/v1/telemetry/signals` accepts application signals.
- `GET /api/v1/telemetry/routes?range=24h` returns rolling route totals.
- `GET /api/v1/telemetry/stream` provides Server-Sent Events for live topology updates.
- MCP tool `telemetry_routes` returns the same aggregate as the REST endpoint.

The service runs in the Brain Podman container and is exposed only through the Tailscale sidecar at `tabloid-brain-api.tail70b7f1.ts.net`. The local deployment script mounts the persistent telemetry store at `/data/telemetry.json`.

## Signal shape

```json
{
  "sourceApp": "ai-news",
  "targetApp": "brain",
  "targetRoute": "/api/v1/content",
  "eventType": "connection_open",
  "connectionId": "connection-example-0001",
  "status": 200,
  "durationMs": 0,
  "occurredAt": "2026-08-24T23:00:00.000Z"
}
```

Signals are validated, retained for approximately 25 hours, and capped at 20,000 records. Aggregates include request count, server error count, average latency, and active connection count. `connection_open` and `connection_heartbeat` maintain an active connection; `connection_close` removes it, and connections expire after 45 seconds without a heartbeat. Brain stores no request body, cookie, token, visitor ID, or user identity in telemetry.

The browser clients use the narrow REST ingest endpoint rather than MCP. MCP requires a server-side bearer token and is reserved for authenticated agents and read-only topology queries. SSE is one-way and best-effort; REST remains the recovery path when a stream disconnects.

The current browser emitter sends one page-view signal when the content adapter initializes. It measures application engagement, not raw network packets. Additional server-side adapters can emit real request duration and status values as they become available.
