# Repository instructions

This branch builds AstroPaper as an Astro and Tailwind CSS application. `main` is The Daily Echo; long-lived product branches include `big-news`, `tech`, and `admin`. GitHub Actions publishes one container image per branch and a Windows scheduled task reconciles private Podman/Tailscale previews.

The brand-independent `src/shared-nav.js` shell is mandatory on every branch. Rebrands may change the product header and page navigation, but must preserve the `mountSharedNav()` import and call. `npm run check:shared-nav` and preview publishing enforce this contract so every live or newly created branch remains reachable from the repository app switcher.

## Branch independence

- `main`, `big-news`, `tech`, and `admin` are independent product applications, not stages of one application.
- Do not merge one product branch into another. Changes intended for more than one product must be applied independently, preferably by cherry-picking a focused commit and then reviewing the result in each branch.
- Keep each branch's brand, content model, routes, and product behavior independent unless a change is explicitly documented as shared infrastructure.
- The shared launcher, deployment files, preview automation, and required Copilot instructions are cross-branch infrastructure. Preserve them on every maintained product branch.
- Temporary workspace, feature, and synchronization branches are not product branches and must not be used as propagation targets unless explicitly requested.

## AstroPaper implementation

AstroPaper is the approved Astro/Tailwind editorial implementation for this branch. It is inspired by the MIT-licensed [AstroPaper](https://github.com/satnaing/astro-paper) theme, but uses original content and components. Do not copy template content, fonts, images, or icons without verifying their licenses.

The implementation must preserve:

- `src/shared-nav.js` and the `mountSharedNav()` import/call in `src/layouts/BaseLayout.astro`.
- Astro pages in `src/pages/`, content in `src/content/posts/`, and branch-aware static routes.
- `astro.config.mjs`, `Containerfile`, Nginx, Tailscale, GitHub Actions, and branch-preview behavior unless the change is separately approved.

Before copying code, fonts, images, icons, or other assets from a template, verify the upstream license and the license of each bundled asset. Prefer original brand assets and local or explicitly licensed media.

## Commands

- Install exactly: `npm ci`
- Production build: `npm run build`
- Development server: `npm run dev`
- Generate branch environment: `npm run env:branch -- --branch <branch>`
- Before finishing: run `npm run build` and `git diff --check`

## Frontend conventions

- Entry points: `src/pages/`; shared rendering lives in `src/layouts/BaseLayout.astro`; styling uses Tailwind and `src/style.css`.
- Keep JavaScript dependency-light unless a new framework is explicitly approved.
- Preserve responsive behavior, semantic HTML, keyboard access, visible focus, and reduced motion.
- Implement loading, empty, permission-denied, stale, and failure states for API-backed UI.
- Never hardcode a real user identity, access decision, health claim, OAuth credential, or privileged API token.
- Only variables prefixed with `PUBLIC_` are browser-visible in Astro. Never place secrets in a `PUBLIC_*` variable or generated `.env` file.

## Admin architecture

- Read `ADMIN_ARCHITECTURE.md` and the relevant file in `docs/` before Admin work.
- The browser is untrusted. Identity, authorization, authentik integration, audit writes, GitHub tokens, and Podman operations belong in a server API.
- Default access is denied. Prevent owner lockout. Require explicit confirmation for destructive actions.
- Workspace provisioning must be asynchronous, idempotent, resource-limited, privately routed, and audited.

## Delivery

- Work on the issue's branch and open a pull request; do not modify unrelated product branches.
- Keep changes scoped to the issue and document assumptions.
- Include tests proportional to risk and list commands executed in the pull request.
- Never delete containers, networks, volumes, branches, or user data as a troubleshooting shortcut.
