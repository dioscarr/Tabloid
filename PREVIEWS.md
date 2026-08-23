# Branch previews

Every non-`main` branch is built as a private Tailscale preview.

The preview identifier is a normalized branch name plus the first six characters of its SHA-256 hash. For example, `feature/new-header` becomes a URL shaped like:

```text
https://tabloid-feature-new-header-xxxxxx.tail70b7f1.ts.net/
```

GitHub Actions publishes `ghcr.io/dioscarr/tabloid:preview-<id>`. A constrained Windows task runs `scripts/sync-previews.ps1` every five minutes. The image is the immutable delivery artifact; the reconciler extracts `/usr/share/nginx/html` into the `tabloid-static-deployments` Podman volume under `<id>/<commit>` and atomically moves `<id>/current` after extraction succeeds.

One `tabloid-static-gateway` container mounts that volume read-only and serves every branch. Each branch retains its dedicated Tailscale sidecar, network, state volume, hostname, and HTTPS URL, so the shared application switcher does not change. The sidecar proxies to `<id>/current` over the private `tabloid-static` network. There is no per-branch Nginx application container.

Only images containing `/usr/share/nginx/html` are eligible for this static preview pipeline. A non-static branch image is skipped with a warning and does not prevent previews for other branches from reconciling.

The reconciler verifies the shared gateway, the extracted branch path, and Tailscale authentication before removing a legacy app container. It removes only resources recorded for branches that no longer exist. Production remains the separately managed `main` deployment at `https://tabloid.tail70b7f1.ts.net/`.

For a canary deployment, reconcile one branch without touching the others:

```powershell
.\scripts\sync-previews.ps1 -OnlyBranch dashboard
```

## One-time setup

1. In the Tailscale admin console, define `tag:preview` and permit the intended tailnet users to reach it on TCP port 443.
2. Create an OAuth client with the `auth_keys` scope restricted to `tag:preview`.
3. From Windows PowerShell, run:

   ```powershell
   Set-Location C:\Users\Drod\Documents\Codex\2026-08-21\wh\Tabloid
   .\scripts\configure-preview-deployer.ps1
   ```

4. Paste the OAuth client secret only into the secure PowerShell prompt. The script protects it with Windows DPAPI and registers the five-minute scheduled task.

Do not commit OAuth credentials or place them in GitHub Actions. The GitHub workflow only builds images; deployment credentials stay on the Podman host.
