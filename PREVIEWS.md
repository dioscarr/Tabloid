# Branch previews

Every non-`main` branch is built as a private Tailscale preview.

The preview identifier is a normalized branch name plus the first six characters of its SHA-256 hash. For example, `feature/new-header` becomes a URL shaped like:

```text
https://tabloid-feature-new-header-xxxxxx.tail70b7f1.ts.net/
```

GitHub Actions publishes `ghcr.io/dioscarr/tabloid:preview-<id>`. A constrained Windows task runs `scripts/sync-previews.ps1` every five minutes. It deploys available branch images as isolated Podman Compose projects and removes projects recorded for branches that no longer exist. Production remains the `main` branch at `https://tabloid.tail70b7f1.ts.net/`.

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

