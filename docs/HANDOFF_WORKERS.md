# Handoff: workers, previews, and runtime reconciliation

**Owner:** Windows Admin/preview workers plus the owning application
repositories.  
**Owns:** GitHub branch operations, image readiness, Podman resources,
Tailscale routes, workspace lifecycle, cleanup, and recovery.

## Runtime rule

Repository files are desired state. Podman containers, networks, volumes,
images, Tailscale routes, and worker leases are runtime state. Inspect before
changing. Never delete broad resources as a troubleshooting shortcut.

## Required job properties

Every job is authenticated, allowlisted, idempotent, resource-limited,
lease-based, observable, retryable with backoff, and safe to cancel. Resource
names use an ownership prefix. Cleanup must verify ownership before removal.
Expired workspaces stop before deletion, and deletion requires an explicit
retention decision.

## Provisioning sequence

Authorize -> claim -> validate template/ref -> create/reuse branch -> await
image -> register app -> create/reconcile route -> verify HTTPS and health ->
publish ready evidence. On failure, retain the request and evidence, mark the
safe recovery state, and expose replay or cleanup rather than silently
retrying forever.

## Operator verification

Check worker health, job lease, GitHub run, Podman health, sidecar logs,
Tailscale route, public HTTPS, API health, and audit event correlation. Record
the commit SHA, image digest, hostname, request ID, and verification time.

