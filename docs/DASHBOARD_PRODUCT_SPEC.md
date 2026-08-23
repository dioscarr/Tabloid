# System Dashboard product specification

## Product promise

The System Dashboard is the read-only operational view of the Tabloid platform. It answers: **Is everything healthy? What is consuming capacity? What will need attention next?** Dashboard explains and forecasts; Admin changes access, workspaces, and preview lifecycle.

## User jobs

1. Confirm every published branch is reachable and on the expected commit.
2. Understand host, WSL, Podman, container, image, volume, and network usage.
3. Trace a push through GitHub build, reconciliation, Podman deployment, and Tailscale routing.
4. Identify stale previews and orphaned resources without deleting them here.
5. Estimate when capacity will cross a configurable threshold.
6. Open the related application or Admin action.

## Information architecture

- **Overview:** health, freshness, resource history, forecast, incidents, recommended action.
- **Applications:** branch/commit, workflow, image digest, containers, Tailscale route, URL probe, workspace, deployment age, drift.
- **Resources:** Windows host, WSL VM, Podman, reclaimable storage, and branch attribution.
- **Delivery:** workflow runs, publication, reconciliation, deployed SHA/digest, duration and failures.
- **Network:** Tailscale device/Serve state, HTTP status and latency. Never show secrets.
- **Activity:** normalized build, deploy, health, capacity, workspace, and cleanup events.

## Truth and freshness

- `live`: collected within 30 seconds; `recent`: 31 seconds–5 minutes; `stale`: older or unavailable.
- Every widget exposes `observedAt`; projections also show model, horizon, samples, and confidence.
- Unknown is rendered as Unknown—never as zero, healthy, or an empty list.
- The current screen remains labeled **prototype data** until live adapters replace fixtures.

## Projections v1

Store five-minute aggregates for 30 days. Use linear regression over the latest seven days only with at least 288 samples and R² >= 0.35. Forecast memory (75/90%), disk (70/85%), preview count, and image storage. Clamp impossible values. Never alert from a low-confidence forecast alone.

## Non-goals

Enterprise monitoring, destructive operations, public exposure, invented billing estimates, or silently substituting fixtures after a live request fails.

## Success criteria

- A failing layer can be identified within 60 seconds.
- Every deployed branch maps to its Git SHA and image digest.
- Stale and projected data are unmistakable.
- Overview loads in under two seconds on the tailnet.
- One failed collector does not make the rest of the dashboard unusable.
