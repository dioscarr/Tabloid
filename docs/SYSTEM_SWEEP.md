# Tabloid system sweep

**Date:** 2026-08-29  
**Scope:** Admin, App Gallery, Brain, Dashboard, static product applications,
the Windows workers, Podman, Tailscale, and GitHub Actions.

## Current system shape

Tabloid is a collection of independent product applications connected by a
shared launcher and a private control plane. Admin owns identity, policy,
application registration, audit, and desired operations. App Gallery owns
template discovery and product creation requests. Brain owns analysis and
content intelligence. Dashboard owns operational views. The Windows workers
reconcile desired state into GitHub branches, containers, networks, volumes,
and private Tailscale routes.

The browser is untrusted. GitHub, Podman, Tailscale, identity-provider, and
service credentials must remain behind server APIs or workers.

## What is complete enough to rely on

- Shared navigation is required in every maintained application.
- Admin API validation, origin/CSRF/idempotency checks, audit persistence, and
  default-deny provider behavior are established.
- App Gallery template and provision requests are persisted with lifecycle
  events, but provisioning is still queue-only until a real provider worker is
  enabled.
- Workspace requests persist desired state, but do not yet create or manage
  code-server, credentials, containers, or routes.
- Brain health, tool discovery, diagnostics, topology selection, and the
  3D-label recursion guard are available in the Brain branch.
- Branch preview publishing is automated through GitHub Actions.
- The Windows worker owns branch cleanup and preview resource reconciliation.

## Incomplete or risky boundaries

1. **Provisioning execution:** queued App Gallery requests need an idempotent,
   observable worker that creates branches, publishes images, and registers
   private routes.
2. **Workspace execution:** queued workspace intents need a constrained
   worker, resource quotas, credential lifecycle, expiry handling, and route
   verification.
3. **Identity:** the Admin browser still presents representative identity
   fixtures until an authenticated session adapter and authentik integration
   are deployed.
4. **Admin data:** overview, users, applications, and audit screens need
   server-driven data, pagination, mutation feedback, and stale-data states.
5. **Launcher parity:** product branches have different shared-nav revisions;
   Vibe and degraded fallback behavior must be standardized independently in
   each repository.
6. **Cross-app operations:** no single governed operation model yet links an
   app intent, branch, deployment, preview route, workspace, audit trail, and
   rollback.
7. **Observability:** request IDs and audit events exist, but end-to-end
   correlation across API, worker, GitHub Actions, Podman, and Tailscale is
   not yet a first-class view.
8. **Recovery:** failure and retry contracts exist in pieces; operators need
   explicit replay, quarantine, cancellation, rollback, and cleanup tools.
9. **Product polish:** several screens still use fixtures, static controls, or
   planned-state copy. Accessibility, responsive behavior, and degraded
   states need systematic acceptance checks.
10. **Branch independence:** shared infrastructure must be propagated by
    focused commits, never by merging product branches together.

## Operating decision

Treat every requested operation as a durable state machine:

`requested -> authorized -> queued -> running -> verified -> ready`

with explicit terminal and recoverable states:

`failed`, `cancelled`, `expired`, `quarantined`, and `rolled_back`.

Every transition should have an actor, request ID, idempotency key, timestamp,
provider evidence, safe user-facing message, and an operator recovery action.

## Definition of a polished feature

A feature is not complete when its button works once. It is complete when the
owning API validates it, authorization and audit are enforced, the worker can
retry it safely, the UI exposes loading/empty/denied/stale/failure states,
the operation is observable, documentation describes ownership and rollback,
and an automated check covers the important contract.

