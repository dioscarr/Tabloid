[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$EnvironmentFile,
  [string]$ComposeFile = (Join-Path $PSScriptRoot '..\compose.yaml')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf)) {
  throw "The host-only environment file '$EnvironmentFile' does not exist."
}

if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) {
  throw "The compose file '$ComposeFile' does not exist."
}

function Invoke-Compose {
  param([string[]]$Arguments)

  & podman compose --env-file $EnvironmentFile -f $ComposeFile @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Podman Compose failed: $($Arguments -join ' ')"
  }
}

function Wait-ForHealthy {
  param(
    [string]$Container,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $health = & podman inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $Container
    if ($LASTEXITCODE -eq 0 -and $health -eq 'healthy') {
      return
    }
    Start-Sleep -Seconds 3
  } while ((Get-Date) -lt $deadline)

  throw "Container '$Container' did not become healthy within $TimeoutSeconds seconds."
}

Invoke-Compose @('pull')
Invoke-Compose @('up', '--detach')

& podman exec 'tabloid-data-postgres' pg_isready -U 'tabloid_admin' -d 'tabloid'
if ($LASTEXITCODE -ne 0) {
  throw "Managed PostgreSQL container 'tabloid-data-postgres' is not ready."
}

Wait-ForHealthy -Container 'tabloid'

$tailscaleState = & podman inspect --format '{{.State.Status}}' 'tabloid-tailscale'
if ($LASTEXITCODE -ne 0 -or $tailscaleState -ne 'running') {
  throw "Tailscale sidecar 'tabloid-tailscale' is not running."
}

Write-Host 'Production application, database, and Tailscale sidecar are running.'
