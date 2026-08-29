# VS Code Copilot handoff: verify Vibe setup

## Objective

Use a low-cost Copilot coding agent to verify that the Vibe setup works end to end. Do not make broad refactors or overwrite unrelated uncommitted work.

Repository: `dioscarr/Tabloid`

Likely feature to verify: the shared launcher in `src/shared-nav.js`, including the `Vibe ✦` link and Brain Studio entry.

## What is already implemented

- `src/shared-nav.js` builds a Vibe URL at `https://tabloid-vibe.tail70b7f1.ts.net`.
- When the current branch is recognized, the link includes `model=vibe-<branch>` and a prefilled improvement prompt.
- Branch discovery uses Authorization first, then Brain/GitHub fallback.
- Static contract checks exist:
  - `npm run check:shared-nav`
  - `npm run check:brain-contract`
- `Containerfile` runs both contract checks before the image is built.
- Preview deployment infrastructure exists in `scripts/sync-previews.ps1`, `preview/compose.yaml`, and the preview GitHub workflows.

## Harness assessment

There is a partial build/contract harness, but not a complete Vibe end-to-end harness. There is no browser test that opens the launcher, verifies the generated Vibe URL, follows it, and confirms that the Vibe service receives the expected model and prompt. Add the smallest reliable smoke test possible.

## Agent instructions

1. Inspect the current worktree first. Preserve unrelated user changes.
2. Confirm the Vibe service/repository configuration and identify its health endpoint or documented startup command. Do not invent credentials.
3. Run the existing checks and build in a working Node environment:

   ```powershell
   npm run check:shared-nav
   npm run check:brain-contract
   npm run build
   ```

4. Add a focused smoke harness for the launcher/Vibe handoff. Prefer a dependency-free Node test or the repository's existing test framework. It should verify:
   - main branch and feature branch URL generation;
   - URL encoding of the model and prompt;
   - fallback behavior when branch discovery fails;
   - the link points to `tabloid-vibe.tail70b7f1.ts.net`.
5. If a real Vibe endpoint is reachable, add an opt-in live check controlled by an environment variable. The default test must remain offline and deterministic.
6. Run all checks, report exact commands and results, and list any external prerequisites that remain (Tailscale access, Vibe health, Copilot token, or service deployment).

## Acceptance criteria

- Existing checks pass.
- Production build passes.
- A deterministic offline smoke test covers the Vibe launcher URL.
- Any live Vibe verification is clearly separated and never requires secrets in the browser bundle.
- No publish, deployment, merge, or destructive cleanup is performed without explicit approval.
