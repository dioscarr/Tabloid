# AstroPaper migration

## Decision

This `AstroPaper` branch is an Astro and Tailwind editorial application inspired by the information architecture of the MIT-licensed [AstroPaper](https://github.com/satnaing/astro-paper) theme. The implementation uses original Tabloid-focused Markdown content and locally authored components; no template content, fonts, images, or icons were copied.

## Product surface

AstroPaper provides:

- a clean home page with featured and recent posts;
- static post pages generated from `src/content/posts/*.md`;
- tag archives, client-side local search, and an about page;
- responsive navigation, a persisted light/dark theme choice, visible focus, and reduced-motion support.

The Astro entry points live in `src/pages/`, with shared metadata and the product shell in `src/layouts/BaseLayout.astro`.

## Platform contracts retained

The migration retains the existing deployment architecture:

- `Containerfile` builds Astro's static `dist` output and serves it from unprivileged Nginx;
- Nginx, Compose, preview Compose, Tailscale configuration, preview reconciliation, and publishing workflows remain in place;
- the health endpoint remains `http://127.0.0.1:8080/`;
- the branch is `AstroPaper`.

The brand-independent `src/shared-nav.js` shell remains mandatory. `BaseLayout.astro` imports it, calls `mountSharedNav()`, and provides `[data-shared-nav-slot]`. `npm run check:shared-nav` verifies this contract before preview publishing.

## Content and licensing

All sample posts are original writing about AstroPaper, Tabloid, deployment, and editorial product design. Future assets or copied code must have their licenses verified first; prefer original or explicitly licensed material.
