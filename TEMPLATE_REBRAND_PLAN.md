# Template Rebrand Plan

## Decision

The next visual exploration will use [AstroPaper](https://github.com/satnaing/astro-paper) as an open-source reference. AstroPaper is an MIT-licensed editorial theme built with Astro, TypeScript, and Tailwind CSS. It is useful for studying article pages, featured content, tags, search, pagination, typography, accessibility, and responsive editorial layouts.

This is a design and component reference, not a decision to replace the current build system. The first implementation should port the useful patterns into the existing Vite, Tailwind CSS, and plain JavaScript application.

## What stays in place

The following are deployment and platform contracts and should remain unchanged during the rebrand:

- Existing root HTML entry pages and relative URL behavior.
- `src/main.js` as the application entry point.
- `src/shared-nav.js`, including the app launcher and Brain Studio.
- The `mountSharedNav()` import and call required by `npm run check:shared-nav`.
- `src/content-adapter.js` and `src/live-feed.js` integration points.
- `vite.config.js`, `package-lock.json`, `Containerfile`, Nginx, Tailscale, GitHub Actions, and branch preview automation.

The new visual layer may replace page markup, typography, colors, layout components, and content presentation while preserving those contracts.

## Shared navigation placement

New headers should provide a slot for the platform launcher:

```html
<div data-shared-nav-slot></div>
```

`mountSharedNav()` detects this slot and mounts the existing launcher there. Do not copy or fork the launcher into a template header.

## Branch policy

`main`, `big-news`, `tech`, and `admin` each represent an individual product application. They are not environments that should be merged together. Shared documentation and infrastructure changes must be propagated independently, preferably by cherry-picking a focused commit onto each maintained product branch. Product-specific branding, content, routes, and behavior must remain branch-local.

Temporary workspace, feature, and synchronization branches are not propagation targets unless a task explicitly names one.

## Candidate references

- [AstroPaper](https://github.com/satnaing/astro-paper) - MIT; strongest editorial and article-page reference.
- [AstroWind](https://github.com/onwidget/astrowind) - MIT; broader modern content/product layouts.
- [AstroPlate](https://github.com/Themefisher/astroplate) - MIT; Markdown/MDX content patterns.
- [Astro Nano](https://github.com/markhorn-dev/astro-nano) - MIT; lightweight editorial patterns.
- [Tailwind Nextjs Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) - MIT; useful article and metadata reference, but built on Next.js.
- [Cruip Tailwind Dashboard](https://github.com/cruip/tailwind-dashboard-template) - GPL; useful for a possible internal dashboard, not the default public-site reference.

Licenses and bundled asset terms must be rechecked before copying implementation code or media. Prefer original Big News assets or explicitly licensed replacements.

## First implementation slice

Begin with the AstroPaper-inspired shell on the current `big-news` product branch:

1. Preserve the shared launcher slot and current integration hooks.
2. Rework the header, home page hierarchy, section listing, and article-like section view.
3. Keep existing routes and deployment files working.
4. Run `npm run check:shared-nav`, `npm run build`, and `git diff --check` before propagation.