# Handoff: Brain

**Repository/branch:** `Tabloid-brain-production`, `brain`  
**Owns:** Brain API, MCP/tool discovery, content intelligence, Brain Studio,
topology visualization, and the Brain-side Vibe integration.

## Current boundary

Brain can report health and capabilities and supports controlled analysis
flows. Admin remains the owner of application provisioning, identity, access,
and privileged infrastructure. Brain may analyze an intent or provide
context, but it must not create branches, containers, credentials, or routes
directly.

## Important behavior

- Keep 2D/3D selection callbacks guarded against recursive focus.
- Keep reduced-motion and keyboard behavior in topology views.
- Return structured tool contracts and explicit provider errors.
- Do not accept browser-provided Admin, GitHub, Podman, or Tailscale tokens.
- Keep Vibe links pure, deterministic, and safe to test offline.

## Change protocol

Read the Brain-specific `docs/VSCODE_COPILOT_HANDOFF.md` first. Changes to the
deployed `brain` branch must be focused because the control-plane branch
`copilot/brain-admin-boundary` has intentionally divergent history. Reconcile
the API contract before attempting any cherry-pick, and preserve the deployed
topology and freeze fix.

