# Admin product handoff

## Product outcome

Admin is the private control plane for every application in this repository. An owner can manage people, application access, security policies, audit history, and disposable development workspaces without exposing credentials to a browser or mounting the Podman socket into the frontend.

## Delivery rules

- Work from a GitHub issue with explicit acceptance criteria.
- Create a focused branch and pull request; never push feature work directly to `main`.
- Keep identity and privileged container operations behind authenticated server APIs.
- Treat the current dashboard data as representative fixtures until its corresponding API is connected.
- Run `npm ci`, `npm run build`, and relevant backend tests before requesting review.
- Include loading, empty, success, permission-denied, and failure states.
- Preserve keyboard navigation, visible focus, semantic labels, responsive layouts, and reduced-motion behavior.
- Never commit OAuth secrets, GitHub tokens, authentik tokens, or generated user credentials.

## Page map

### Overview

Purpose: summarize user count, applications, sessions, alerts, recent activity, and security actions.

Acceptance: every metric comes from an API, links to its detailed page, includes a loading skeleton and timestamp, and does not imply health from stale data.

### Users

Purpose: search, invite, inspect, activate/deactivate, assign groups, revoke sessions, and review a user's effective access.

Acceptance: destructive or access-reducing actions require confirmation; owner lockout is prevented; mutations are audited; pagination and filtering are server-driven.

### Applications

Purpose: register an application, display its private URL and health, bind groups/roles, configure OIDC redirect URIs, and inspect effective policies.

Acceptance: default access is denied; duplicate slugs and unsafe redirect URIs are rejected; health is verified through the intended route.

### Roles & access

Purpose: manage owner, admin, editor, viewer, and service roles plus application-specific groups.

Acceptance: the UI displays inherited and direct access separately; service identities cannot receive interactive-login privileges.

### Audit log

Purpose: show authentication and administrative events with actor, target, application, timestamp, client context, and outcome.

Acceptance: filters are shareable through URL parameters; event details are immutable in the Admin application; secrets are redacted.

### Development workspaces

Purpose: create a private code-server workspace from a repository and branch, observe provisioning, open it, stop it, and archive or remove it.

Acceptance: each workspace has isolated storage, a dedicated network, resource limits, a private Tailscale hostname, an expiry, and a narrowly scoped repository credential. The UI never receives the Podman socket or an unrestricted GitHub token.

### Settings

Purpose: configure identity provider status, Google federation, session policy, MFA requirements, notifications, and system defaults.

Acceptance: secret values can be replaced but never read back; configuration validation precedes activation; high-risk changes require owner confirmation.

## Definition of done

A feature is complete when its UI states, authorization checks, server validation, audit event, automated tests, documentation, responsive behavior, and rollback behavior are all implemented.
