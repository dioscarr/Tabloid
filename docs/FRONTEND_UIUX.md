# Frontend and UI/UX implementation guide

## Experience principles

- Make access and risk legible before making the interface visually impressive.
- Show effective access, not just configured roles.
- Separate safe routine actions from destructive or security-sensitive actions.
- Never display invented live metrics once fixtures are removed.
- Keep the dark control-plane visual language: slate surfaces, indigo primary actions, emerald health, amber warnings, and rose destructive states.

## Shared shell

The sidebar, command search, notifications, app launcher, and profile menu form the Admin shell. The profile/app menu becomes a versioned shared frontend package consumed by every application; session state comes from `GET /api/v1/session`, not local hardcoded identity data.

Required shared states:

- authenticated
- session loading
- session expired
- insufficient permission
- identity provider unavailable
- offline/reconnecting

## Component inventory

- `AppShell`, `Sidebar`, `MobileNav`, `CommandSearch`
- `ProfileMenu`, `AppSwitcher`, `NotificationCenter`
- `MetricCard`, `StatusBadge`, `HealthIndicator`
- `DataTable`, `FilterBar`, `Pagination`, `EmptyState`, `Skeleton`
- `UserDrawer`, `InviteDialog`, `RoleBindingEditor`
- `ApplicationCard`, `AccessPolicyMatrix`, `RedirectUriEditor`
- `AuditTimeline`, `EventDetailDrawer`
- `WorkspaceCreateWizard`, `WorkspaceCard`, `ProvisioningTimeline`, `ResourceMeter`
- `ConfirmDialog`, `PermissionGate`, `InlineError`, `Toast`

## Page-specific UX

### Users

Use a server-driven table on desktop and stacked identity cards on narrow screens. Selecting a user opens a route-addressable detail drawer. Show direct groups, inherited roles, applications, active sessions, and recent security activity.

### Applications

Cards summarize health and user count; the detail page owns access policies, OIDC redirects, private URLs, and deployment metadata. Never place secrets in copyable UI after initial creation.

### Roles & access

Use a subject-by-application matrix only for comparison. Editing occurs in a focused drawer that explains inherited access and resulting permissions before save.

### Audit log

Use a dense, filterable timeline with readable action sentences. Preserve machine identifiers in detail views. Errors and denials must be as discoverable as successful events.

### Workspaces

The create wizard asks for repository, branch, workspace name, lifespan, and resource preset. Advanced settings contain extensions and environment references. A provisioning timeline shows queued, volume, clone, start, identity, health, and ready states. Stop and delete are distinct actions.

## Accessibility and quality

- Meet WCAG 2.2 AA contrast and interaction requirements.
- All operations must be keyboard accessible with visible focus.
- Dialog focus is trapped and restored to its trigger.
- Status cannot rely on color alone.
- Tables include headers and accessible row actions.
- Announce asynchronous provisioning and mutation results through live regions.
- Honor reduced motion and avoid decorative animation during security actions.
- Test at 320px, 768px, 1280px, and 1536px widths.

## Frontend test matrix

- component states with fixtures
- route-level authorization
- keyboard-only workflows
- mobile sidebar and long table behavior
- form validation and server error mapping
- expired-session recovery without losing safe draft input
- loading, empty, partial, degraded, and stale-data states
- workspace lifecycle updates through polling or server-sent events
