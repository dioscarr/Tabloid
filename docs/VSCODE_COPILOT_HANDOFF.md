# VS Code Copilot handoff: launcher parity and Vibe verification

## Objective

Use a low-cost Copilot coding agent to make sure Brain and every generated Tabloid app expose the same shared application launcher and Vibe handoff behavior. Preserve unrelated user changes and do not deploy, publish, merge, or handle credentials.

## Current state

- Brain imports and calls `mountSharedNav()` from `src/main.js`.
- Brain provides `[data-shared-nav-slot]` in its header.
- Brain’s launcher now includes `Vibe ✦` and `Brain Studio ✦`.
- The main Tabloid template has `src/vibe-handoff.js` and `npm run check:vibe-handoff`.
- The main template’s launcher contract checks required Vibe and Brain Studio behavior.
- Brain has `npm run check:shared-nav` and a tracked `.githooks/pre-commit` hook.

## Remaining work

Bring Brain and the template to the same implementation shape:

1. Add `src/vibe-handoff.js` to Brain, exporting the Vibe origin and a pure `buildVibeHref(currentApp)` function.
2. Update Brain’s `src/shared-nav.js` to import and use that helper rather than constructing the Vibe URL inline.
3. Add `scripts/verify-vibe-handoff.mjs` and `npm run check:vibe-handoff` to Brain. Keep it deterministic and offline; cover a feature branch, `main`, URL encoding, missing app fallback, and the required Vibe origin.
4. Ensure `npm run check:shared-nav` validates the mount import/call, slot, Vibe, and Brain Studio requirements.
5. Ensure the pre-commit hook runs the launcher and Vibe checks. Keep the hook tracked in `.githooks/pre-commit`; document that users enable it with:

   ```bash
   git config core.hooksPath .githooks
   ```

6. Run and report:

   ```bash
   npm run check:shared-nav
   npm run check:vibe-handoff
   npm run build
   git diff --check
   ```

## Acceptance criteria

- Brain and the template use the same pure Vibe URL helper and test cases.
- Every app entry point mounts the shared launcher and provides a slot or supported legacy target.
- Launcher output includes branch switching, Vibe, and Brain Studio.
- Offline checks pass without network access or secrets.
- Live health checks are optional and must not be required for the default pre-commit hook.
- No credentials, deployments, publishing, or destructive cleanup.
