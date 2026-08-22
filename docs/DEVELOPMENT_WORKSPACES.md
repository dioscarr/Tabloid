# Private development workspaces

## Answer

Yes, Admin can deploy a browser-based VS Code environment with a selected Git repository and branch already checked out. Use LinuxServer code-server for interactive editing and GitHub Copilot cloud agent for asynchronous delegated implementation.

These are complementary:

- **code-server workspace:** you interact with VS Code, terminal, Git, and Copilot Chat through the browser.
- **Copilot cloud agent:** you assign a well-specified GitHub issue; it works on a branch and opens a pull request for review.

Do not keep a browser workspace running merely to host unattended agent work when GitHub's delegated workflow can produce a reviewable pull request independently.

## Repository preparation

The repository includes:

- `.github/copilot-instructions.md` for build, architecture, and validation context
- `.github/agents/backend-engineer.agent.md` for server, identity, and orchestration tasks
- `.github/agents/frontend-ui.agent.md` for page and component work
- `docs/TEAM_HANDOFF.md` as the product and acceptance-criteria index

Create one issue per bounded outcome. Include affected page/API, user story, acceptance criteria, authorization requirements, error states, and validation commands. Assign the issue to the appropriate agent and review its pull request.

## Workspace image

Build a pinned image derived from LinuxServer code-server. Add only reviewed tools: Git, GitHub CLI, Node, project package managers, Podman remote client if required by a constrained backend workflow, and approved VS Code extensions. Do not install extensions by mutable `latest` identifiers during every startup.

The workspace runs as a non-root user. Persist `/config` and the repository workspace in named volumes. Apply CPU/memory/process limits and an expiry. Attach it only to a dedicated DNS-enabled network and a private Tailscale sidecar.

## Git credentials

Preferred: a GitHub App issues a short-lived installation token scoped to repository contents and pull requests. The provisioning worker clones with the bootstrap token, removes it from the remote URL, and makes later credentials available only through a credential helper or short-lived exchange.

Never bake a personal access token into the image, environment committed to Git, shell history, `.git/config`, or a reusable volume.

## Lifecycle

```text
Requested → Authorized → Provisioning → Cloning → Starting
          → Verifying → Ready → Stopped → Expired → Archived/Deleted
```

The Admin API owns this state machine. The browser requests desired state and observes events; it never runs Podman directly.

## First production slice

1. One repository allowlisted: `dioscarr/Tabloid`.
2. Existing branches only; branch creation remains a separate Git operation.
3. Small and medium resource presets.
4. Twenty-four-hour default expiry.
5. Private Tailscale access only.
6. Start, stop, open, and explicit delete actions.
7. GitHub App token exchange.
8. Audit events for every lifecycle and access action.
