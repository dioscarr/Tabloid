# Tabloid workspace instructions

Use `C:\Users\Drod\Source\Tabloid\Tabloid` as the primary workspace root.

## Workspace layout

The root folder is the Admin application. The other applications are separate
repositories/worktrees listed in `Tabloid.code-workspace`:

- Admin: `.`
- AI News: `Tabloid/ai-news`
- App Gallery: `Tabloid/Tabloid-app-gallery`
- AstroPaper: `Tabloid/AstroPaper`
- Authorization: `Tabloid/Authorization`
- Big News: `Tabloid/big-news`
- Big News DR: `Tabloid/big-news-dr`
- Brain: `../Tabloid-brain-production`
- Dashboard: `../Tabloid-dashboard`
- Main Production: `../Tabloid-main-production`
- Tech: `Tabloid/tech`

Additional repositories alongside the Admin repository:

- Brain production: `../Tabloid-brain-production`
- Dashboard: `../Tabloid-dashboard`
- Main production: `../Tabloid-main-production`

These repositories are in scope for inspection when a task crosses service
boundaries. Use the workspace file and the actual repository path to select
the target; do not assume every service lives in the Admin repository.

Before editing, identify the relevant application and check its Git status.
Treat nested applications as separate repositories; do not apply changes to
the Admin root unless the task concerns Admin.

For cross-repository debugging, inspect the relevant source, API contract,
deployment configuration, and recent Git history in each affected repository.
Report which repository and branch owns every change.

## App creation architecture

App Gallery creates applications through the Admin API, not the older Brain
app-creation endpoint.

- App Gallery source: `Tabloid/Tabloid-app-gallery/src/main.js`
- Admin API source: `api/server.js` and `api/store.js`
- Provisioning endpoint: `POST /api/v1/applications/provision`
- Template endpoint: `GET /api/v1/app-templates`
- Provisioning requests are persisted as app-provision requests/events.

When debugging Gallery deployment, trace the flow through App Gallery, Admin
API authorization/CSRF handling, request persistence, and the provisioning
worker before changing Brain or Dashboard.

## Git and deployment

Check the target repository and branch before committing. Preserve unrelated
user changes, especially line-ending-only changes in the Admin checkout. Do
not commit generated `dist`, `.astro`, or dependency files unless the task
explicitly requires them.

Always commit and push changes to the existing named application branch. Do
not create, use, or commit duplicate `workspace/*` branches. A `workspace/*`
branch is allowed only when the user explicitly asks for it, creates it by
hand, or the App Gallery workflow creates it as part of provisioning.
