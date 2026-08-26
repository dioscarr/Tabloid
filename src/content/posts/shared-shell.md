---
title: "Why the shared shell belongs above every branch app"
description: "AstroPaper keeps the editorial surface focused while Tabloid's shared launcher connects every live branch."
pubDate: 2026-08-25
tags: ["Architecture", "Navigation"]
minutes: 4
featured: true
---

An editorial site should make reading feel quiet. A branch-based product platform has a different obligation: it must make the next useful destination easy to find. AstroPaper separates those jobs cleanly.

The page header carries the publication's identity and the shared launcher remains a small, predictable control. It is not a second navigation system or an interruption to the reading experience. It is the way a reader can move from one live Tabloid application to another without memorizing preview addresses.

## A shell is a promise

The same launcher is mounted in the site layout, not copied into individual pages. That gives every route the same reachable starting point, whether the reader arrived on a post, a tag archive, or a preview deployment.

The contract is deliberately small: import the shared navigation module, call `mountSharedNav()`, and leave a named slot in the header. The component owns its own accessible menu and failure state; the publication owns its editorial design.

## Keep the boundary clear

AstroPaper provides the static, fast reading surface. The shared shell provides branch discovery and the optional Brain Studio entry point. Neither needs to know how the other renders its content, which keeps future rebrands from accidentally breaking the application switcher.

That boundary turns a familiar blog layout into a dependable front door for a growing set of branch apps.
