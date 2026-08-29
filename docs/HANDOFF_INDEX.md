# Tabloid handoff index

Use this index before changing a subsystem. Each handoff identifies the
owner, source of truth, current boundary, safe change pattern, and the next
backlog stories.

| Handoff | Owner | Use when |
| --- | --- | --- |
| [Admin control plane](HANDOFF_ADMIN.md) | Admin repository, `admin` | Identity, API, access, audit, settings, or operator UI |
| [App Gallery](HANDOFF_APP_GALLERY.md) | App Gallery repository, `app-gallery` | Templates, app creation, branch requests, or retry UX |
| [Brain](HANDOFF_BRAIN.md) | Brain repository, `brain` | Analysis, MCP tools, Studio, topology, or Vibe integration |
| [Workers and previews](HANDOFF_WORKERS.md) | Admin worker and deployment repositories | GitHub, Podman, Tailscale, workspace, or preview lifecycle |
| [Shared launcher](HANDOFF_SHARED_LAUNCHER.md) | Each product repository independently | App switching, Vibe, Brain Studio, or fallback behavior |

## Cross-system change protocol

1. Identify the owning repository and named product branch.
2. Read the applicable handoff and `OPERATIONS_CONTRACT.md`.
3. Record the operation or data contract before editing UI.
4. Keep credentials and privileged calls server-side.
5. Make a focused change in the owning repository; do not merge product
   branches.
6. Add or update the smallest contract check that proves the behavior.
7. Verify the local build and the relevant worker/API/preview surface.
8. Record commit, image, hostname, and rollback information in the handoff
   or issue.

## Backlog usage

The [system backlog](SYSTEM_BACKLOG.md) contains 120 independently actionable
stories. Start with P0 stories in dependency order, then take the smallest
vertical slice that connects API, worker, UI, audit, and verification.

