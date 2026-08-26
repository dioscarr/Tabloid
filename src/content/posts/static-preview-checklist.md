---
title: "A practical checklist for shipping a private static preview"
description: "Static output is only the first step: health checks, immutable assets, and private routing make a preview useful."
pubDate: 2026-08-22
tags: ["Deployment", "Operations"]
minutes: 5
featured: true
---

A static site is simple to build, but a usable preview needs more than a successful build command. The useful unit is a small container that can be checked, routed, and replaced without any hidden local state.

## Build once, serve plainly

Astro writes a static `dist` directory. The production container copies that directory into unprivileged Nginx, which serves the generated HTML and cacheable assets on port 8080. This avoids coupling the preview to a development server or a Node process that does not need to be present at runtime.

The health check stays intentionally boring: request the root document and require a successful response. Tailscale waits for that health signal before it starts routing traffic to the application container.

## Treat the branch as the preview identity

The publishing workflow creates an image tag from the branch name and a short hash. The reconciler then uses that image to create an isolated Podman network and Tailscale sidecar. A reader receives a private URL while the deployment process receives a deterministic identifier.

No article content is stored in the preview infrastructure. Deleting a stale preview therefore means reconciling declared resources, not guessing about data ownership.

## Verify the small contracts

Before publishing, verify the shared navigation contract, build the site, and inspect the diff for whitespace errors. These short checks catch the highest-risk accidental regressions: an unreachable app launcher, a missing static route, or a container build that no longer receives the configuration it needs.
