# Handoff: shared launcher

**Owner:** Each maintained product repository independently.  
**Required contract:** `src/shared-nav.js` and a
`mountSharedNav()` import/call in `src/main.js`.

## Required entries

The launcher should show discovered product branches, VS Code workspace access,
Vibe, Brain Studio where supported, the current application indicator, a
branch-management link, and a useful degraded fallback. The fallback must
still expose VS Code, Vibe, Brain Studio, Production, and a retry/status
message when branch discovery fails.

## Parity rules

Do not merge product branches to obtain parity. Apply a focused launcher
change in each owning worktree, preserve that product's branding and API
authorization behavior, run the local shared-nav contract, then build and
publish that branch. The Vibe URL helper must remain pure and its smoke test
must not require credentials or a live network.

## Known drift

Launcher revisions currently differ across the maintained branches. Treat
parity as a backlog item, not as permission to overwrite branch-specific
logos, authorization sources, or deployment configuration.

