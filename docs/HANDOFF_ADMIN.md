# Handoff: Admin control plane

**Repository/branch:** `Tabloid`, `admin`  
**Owns:** Admin UI, Admin API, persistence, authorization boundary, audit
projection, and operator-facing lifecycle controls.

## Source of truth

- UI entry: `src/main.js`
- API entry: `api/server.js`
- Persistence: `api/store.js`
- Provider boundary: `api/providers.js`
- Contracts: `docs/BACKEND_IMPLEMENTATION.md`,
  `docs/FRONTEND_UIUX.md`, `docs/OPERATIONS_CONTRACT.md`

## Current boundary

The API is deliberately fail-closed and persists desired state. Provider
adapters for authentik, GitHub, Podman, and Tailscale are not live execution
paths yet. The UI includes representative fixtures and planned-state copy;
replace those surfaces with authenticated API reads incrementally rather than
claiming that fixtures are live.

## Safe implementation pattern

Validate at the API boundary, authorize against the authenticated actor,
persist the intent and audit event atomically, enqueue a worker job, and make
the UI follow the operation by ID. Never pass provider credentials through
the browser. Destructive actions require explicit confirmation and must
protect the final active owner.

## Acceptance checklist

- loading, empty, denied, stale, failure, and success states;
- request ID and durable audit event;
- idempotent mutation and replay behavior;
- server-side authorization and input validation;
- keyboard and narrow-screen behavior;
- worker evidence and rollback path documented.

