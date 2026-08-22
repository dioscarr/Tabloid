# Repository instructions

This repository builds several branch-based web applications from one Vite and Tailwind CSS codebase. `main` is The Daily Echo; long-lived product branches include `big-news`, `tech`, and `admin`. GitHub Actions publishes one container image per branch and a Windows scheduled task reconciles private Podman/Tailscale previews.

## Commands

- Install exactly: `npm ci`
- Production build: `npm run build`
- Development server: `npm run dev`
- Before finishing: run `npm run build` and `git diff --check`

## Frontend conventions

- Entry point: `src/main.js`; styling uses Tailwind utility classes and `src/style.css`.
- Keep JavaScript dependency-light unless a new framework is explicitly approved.
- Preserve responsive behavior, semantic HTML, keyboard access, visible focus, and reduced motion.
- Implement loading, empty, permission-denied, stale, and failure states for API-backed UI.
- Never hardcode a real user identity, access decision, health claim, OAuth credential, or privileged API token.

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
