# Main TailAdmin deployment

`vendor/tailadmin` contains the complete upstream
[TailAdmin free Tailwind dashboard template](https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template)
at upstream commit `44ac4719ef1762907c84c4df459842de9eea70b0`. It is MIT licensed;
the upstream `LICENSE` is retained with the vendored source.

The currently deployed application remains the existing Vite shell. This keeps
the mandatory shared launcher and established static Nginx/Tailscale deployment
contract intact while the template is integrated in follow-up work.

## Production data plane

`compose.yaml` provisions `tabloid-db`, a PostgreSQL 17 database with:

- a persistent `tabloid-postgres` Podman volume;
- a health check before dependent services use it;
- no published host port and an internal-only `tabloid-private` network;
- Tailscale attached only to `tabloid-edge`, where it can serve `tabloid`.

Copy `.env.production.example` to a host-only deployment environment, replace
the placeholder values there, and never commit that generated environment file.
The database password must be a unique random value kept only on the Podman
host or in the deployment secret store.

## Automated images and deployment

The existing `publish-containers.yml` workflow continues to publish the
production `main` image tag and immutable SHA tags. The host-only
`reconcile-production.ps1` script pulls `main`, starts the compose services,
and verifies PostgreSQL, the application, and Tailscale. Register its scheduled
reconciler once from an interactive account that owns the rootless Podman state:

```powershell
.\scripts\configure-production-deployer.ps1 `
  -RepositoryPath C:\path\to\Tabloid `
  -EnvironmentFile C:\path\to\host-only-production.env
```

The task runs every five minutes by default. It is idempotent: it retains the
database volume and Tailscale state, starts PostgreSQL on the private network,
and exposes only the application through the Tailscale sidecar.
