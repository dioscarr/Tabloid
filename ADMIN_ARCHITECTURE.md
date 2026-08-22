# Shared identity architecture

The `admin` branch is the control-plane interface. It must never store Google OAuth secrets or an authentik API token in the browser bundle.

## Responsibility split

- **authentik:** central identity provider, Google federation, sessions, groups, MFA, application registrations, and access policies.
- **Admin API:** narrow server-side adapter for the authentik API. It validates the administrator's session and exposes only approved user, group, application, and audit operations.
- **Admin UI:** control-plane experience for users, roles, applications, sessions, invitations, and audit history.
- **Shared profile package:** reusable frontend component and session client used by every application. It shows the current user, application launcher, profile, and sign-out actions.
- **Application gateway:** validates OIDC sessions before traffic reaches each private application. Static applications should not implement authentication independently.

## Planned URLs

- `https://auth.tail70b7f1.ts.net/` — authentik and shared login
- `https://tabloid-admin-<preview-id>.tail70b7f1.ts.net/` — admin interface
- Existing application hostnames remain unchanged and redirect unauthenticated users to the shared login.

## Google setup inputs

Google authentication cannot be activated until an OAuth web client is created. Its redirect URI will point to the authentik Google source callback. Store the client ID and client secret in the identity-service environment or secret store, never in Git.

## Initial roles

- `owner`: full identity, application, policy, and recovery control
- `admin`: user and application access management without owner recovery rights
- `editor`: application content administration
- `viewer`: read-only application access
- `service`: narrowly scoped machine identity with no interactive login

Default access is denied. Membership in an application group grants access to that application. Privileged roles require MFA and all mutations produce an audit event.
