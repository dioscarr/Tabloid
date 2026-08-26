# Main TailAdmin deployment

`vendor/tailadmin` contains the complete upstream
[TailAdmin free Tailwind dashboard template](https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template)
at upstream commit `44ac4719ef1762907c84c4df459842de9eea70b0`. It is MIT licensed;
the upstream `LICENSE` is retained with the vendored source.

The currently deployed application remains the existing Vite shell. This keeps
the mandatory shared launcher and established static Nginx/Tailscale deployment
contract intact while the template is integrated in follow-up work.

## Production data plane

The production Podman host already runs the managed `tabloid-data-postgres`
PostgreSQL 17 service. It has:

- a persistent `tabloid-data-postgres` Podman volume;
- a Podman-managed `tabloid-data-postgres-password` secret;
- no published host port and the private `tabloid-data-platform` network.

`compose.yaml` attaches only the web application to that private network. The
Tailscale sidecar remains solely on `tabloid-edge`, so it can serve the web app
but never publishes PostgreSQL. A future server API can connect to
`data-postgres:5432` using the Podman-managed secret; the static browser bundle
never receives database credentials.

Copy `.env.production.example` to a host-only deployment environment, replace
the Tailscale placeholder there, and never commit that generated environment
file. The database password is not represented in this file.

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

The task runs every five minutes by default. It is idempotent: it checks the
managed PostgreSQL instance, retains Tailscale state, and exposes only the
application through the Tailscale sidecar.
