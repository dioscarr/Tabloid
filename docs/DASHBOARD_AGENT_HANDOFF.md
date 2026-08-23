# Dashboard implementation handoff

Entry point for the VS Code/Copilot agent working on `dashboard`.

## Current state

The branch contains a responsive system-dashboard prototype built with Vite and Tailwind CSS. Values are fixtures. Preserve `mountSharedNav()` and `[data-shared-nav-slot]`; the shared application switcher stays integrated into the header.

## Target architecture

```text
Tailnet browser -> dashboard UI -> read-only dashboard API -> SQLite snapshots
                                      |-> Windows/WSL collector
                                      |-> Podman collector
                                      |-> GitHub collector
                                      |-> Tailscale/probe collector
                                      `-> preview-state adapter
```

Run the API/collector as a separate least-privilege service. Never put Podman, GitHub, Tailscale, or code-server credentials in the frontend. Mutations link to Admin.

## API contract

- `GET /healthz`
- `GET /api/dashboard/v1/summary?range=24h`
- `GET /api/dashboard/v1/apps`
- `GET /api/dashboard/v1/resources?range=24h&step=5m`
- `GET /api/dashboard/v1/delivery?branch=dashboard`
- `GET /api/dashboard/v1/routes`
- `GET /api/dashboard/v1/events?cursor=&severity=&branch=`
- `GET /api/dashboard/v1/forecast?metric=memory_used_ratio`

Every response includes `observedAt`, `freshness`, and `sourceStatus`. Measurements include units. Return errors per source so partial data can render.

```ts
type SourceStatus = { source: 'host'|'podman'|'github'|'tailscale'|'previews'; ok: boolean; observedAt: string; error?: string }
type AppRuntime = { branch: string; commitSha: string; imageDigest?: string; containers: Health[]; route?: Probe; workspaceReady: boolean; deployedAt?: string }
type MetricPoint = { metric: string; value: number; unit: string; observedAt: string; labels: Record<string,string> }
type Event = { id: string; type: string; severity: 'info'|'warning'|'critical'; source: string; branch?: string; message: string; occurredAt: string }
type Forecast = { metric: string; threshold: number; predictedAt?: string; confidence: 'low'|'medium'|'high'; model: string; sampleCount: number }
```

## Delivery plan

### Phase 1 — truthful inventory

1. Add TypeScript and a small component/router layer without redesigning the shell.
2. Add API shell, SQLite migrations, source status, and a fixture adapter.
3. Implement Podman and preview-state collectors.
4. Replace app/resource fixtures; cover loading, empty, stale, partial, and error states.
5. Add normalization/schema unit tests and a browser smoke test.

### Phase 2 — delivery and routing

Add read-only GitHub and Tailscale adapters, route probes, deployment tracing, branch drift, and a normalized event timeline.

### Phase 3 — history and forecast

Add five-minute snapshots, 30-day retention, range/step queries, projection rules, and configurable warnings.

## UX and security requirements

- Fully usable at 375 px; keyboard navigation, visible focus, semantic tables, text plus color status.
- Timestamp/freshness on each data group; clearly separate observed and projected data.
- Honor `prefers-reduced-motion`.
- Private/Tailscale-only API, strict Origin policy, read-only service permissions, structured audit logs.
- Never return OAuth secrets, auth keys, GitHub tokens, cookies, or code-server credentials.

## Acceptance tests

- A failed collector shows partial data while healthy sources render.
- Unknown never renders as `0`.
- App rows expose branch HEAD, deployed SHA/digest, and drift.
- Route failures distinguish app, sidecar, DNS/Serve, and probe layers.
- Forecasts are suppressed below sample/confidence requirements.
- `npm run build` and shared-nav verification pass.

## Copilot start prompt

> Work only on `dashboard`. Read `docs/DASHBOARD_PRODUCT_SPEC.md`, `docs/DASHBOARD_AGENT_HANDOFF.md`, `PREVIEWS.md`, and `docs/DEVELOPMENT_WORKSPACES.md`. Implement Phase 1 in small commits. Preserve the shared-nav slot and private Tailscale boundary. Treat current values as fixtures until their adapter exists, and never silently fall back to fixtures after a live request fails. Run the build and tests before handoff.
