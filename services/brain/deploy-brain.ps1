[CmdletBinding()]
param(
  [string]$TailscaleSecretPath = "$env:LOCALAPPDATA\Tabloid\preview-oauth-secret.txt",
  [string]$Hostname = 'tabloid-brain-api',
  [string]$TailnetDomain = 'tail70b7f1.ts.net'
)

$ErrorActionPreference = 'Stop'
$podman = Join-Path $env:LOCALAPPDATA 'Programs\Podman\podman.exe'
$serviceRoot = $PSScriptRoot
$network = 'tabloid-brain-platform'
$serviceContainer = 'tabloid-brain-service'
$tailscaleContainer = 'tabloid-brain-service-tailscale'
$stateVolume = 'tabloid-brain-service-tailscale-state'
$contentVolume = 'tabloid-brain-content'
$openRouterSecretName = 'tabloid-brain-openrouter-key'
$mcpSecretName = 'tabloid-brain-mcp-token'

if (-not (Test-Path $podman)) { throw "Podman was not found at $podman" }
if (-not (Test-Path $TailscaleSecretPath)) { throw "Tailscale OAuth secret is missing. Configure the preview deployer first." }

function Invoke-Podman([string[]]$Arguments, [switch]$AllowFailure) {
  & $podman @Arguments | Out-Host
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0 -and -not $AllowFailure) { throw "Podman failed: $($Arguments -join ' ')" }
  return $exitCode -eq 0
}

function Read-PlainSecret([string]$Path) {
  $secure = (Get-Content -Raw $Path).Trim() | ConvertTo-SecureString
  $handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle) }
}

Write-Host 'An OpenRouter API key is required by the server-side Brain generator.'
$openRouterSecure = Read-Host 'Paste the OpenRouter API key' -AsSecureString
$openRouterHandle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($openRouterSecure)
$openRouterKey = $null
$tempOpenRouter = [IO.Path]::GetTempFileName()
$tempMcp = [IO.Path]::GetTempFileName()
try {
  $openRouterKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($openRouterHandle)
  if (-not $openRouterKey) { throw 'The OpenRouter API key cannot be empty.' }
  [IO.File]::WriteAllText($tempOpenRouter, $openRouterKey)
  $random = New-Object byte[] 48
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($random) } finally { $generator.Dispose() }
  [IO.File]::WriteAllText($tempMcp, [Convert]::ToBase64String($random))

  foreach ($container in @($tailscaleContainer, $serviceContainer)) {
    if (Invoke-Podman @('container', 'exists', $container) -AllowFailure) { Invoke-Podman @('rm', '--force', $container) | Out-Null }
  }
  foreach ($name in @($openRouterSecretName, $mcpSecretName)) {
    if (Invoke-Podman @('secret', 'exists', $name) -AllowFailure) { Invoke-Podman @('secret', 'rm', $name) | Out-Null }
  }
  Invoke-Podman @('secret', 'create', $openRouterSecretName, $tempOpenRouter) | Out-Null
  Invoke-Podman @('secret', 'create', $mcpSecretName, $tempMcp) | Out-Null
} finally {
  if ($openRouterHandle -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($openRouterHandle) }
  $openRouterKey = $null
  Remove-Item -Force -ErrorAction SilentlyContinue $tempOpenRouter, $tempMcp
}

Invoke-Podman @('build', '-t', 'localhost/tabloid-brain-service:latest', '-f', (Join-Path $serviceRoot 'Containerfile'), $serviceRoot) | Out-Null
Invoke-Podman @('build', '-t', 'localhost/tabloid-brain-tailscale:latest', '-f', (Join-Path $serviceRoot 'Tailscale.Containerfile'), $serviceRoot) | Out-Null
if (-not (Invoke-Podman @('network', 'exists', $network) -AllowFailure)) { Invoke-Podman @('network', 'create', $network) | Out-Null }
if (-not (Invoke-Podman @('volume', 'exists', $stateVolume) -AllowFailure)) { Invoke-Podman @('volume', 'create', $stateVolume) | Out-Null }
if (-not (Invoke-Podman @('volume', 'exists', $contentVolume) -AllowFailure)) { Invoke-Podman @('volume', 'create', $contentVolume) | Out-Null }

Invoke-Podman @(
  'run', '--detach', '--name', $serviceContainer, '--restart', 'unless-stopped',
  '--network', $network, '--network-alias', 'brain-service',
  '--secret', "$openRouterSecretName,target=openrouter_api_key", '--secret', "$mcpSecretName,target=brain_mcp_token",
  '--env', 'OPENROUTER_API_KEY_FILE=/run/secrets/openrouter_api_key', '--env', 'GENERATION_PRIMARY=openrouter',
  '--env', 'BRAIN_MCP_TOKEN_FILE=/run/secrets/brain_mcp_token',
  '--env', 'BRAIN_MCP_URL=http://127.0.0.1:8787/mcp', '--env', 'AUTHZ_API_URL=https://tabloid-authorization.tail70b7f1.ts.net', '--env', 'AUTHZ_SERVICE_TOKEN',
  '--env', 'BRAIN_CONTENT_STORE=/data/content.json', '--env', 'BRAIN_TELEMETRY_STORE=/data/telemetry.json', '--volume', "${contentVolume}:/data",
  '--label', 'io.dioscarr.tabloid.service=brain',
  'localhost/tabloid-brain-service:latest'
) | Out-Null

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  & $podman exec $serviceContainer node -e "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
  if ($LASTEXITCODE -eq 0) { break }
  if ($attempt -eq 19) { throw 'Brain service failed its health check.' }
  Start-Sleep -Seconds 1
}

$oauthSecret = Read-PlainSecret $TailscaleSecretPath
$env:TS_AUTHKEY = "${oauthSecret}?ephemeral=true&preauthorized=true"
$env:TS_AUTH_ONCE = 'true'
$env:TS_EXTRA_ARGS = '--advertise-tags=tag:preview'
$env:TS_HOSTNAME = $Hostname
$env:TS_STATE_DIR = '/var/lib/tailscale'
$env:TS_SERVE_CONFIG = '/config/serve.json'
$env:TS_USERSPACE = 'true'

Invoke-Podman @(
  'run', '--detach', '--name', $tailscaleContainer, '--hostname', $Hostname, '--restart', 'unless-stopped',
  '--network', $network, '--env', 'TS_AUTHKEY', '--env', 'TS_AUTH_ONCE', '--env', 'TS_EXTRA_ARGS',
  '--env', 'TS_HOSTNAME', '--env', 'TS_STATE_DIR', '--env', 'TS_SERVE_CONFIG', '--env', 'TS_USERSPACE',
  '--volume', "${stateVolume}:/var/lib/tailscale", '--label', 'io.dioscarr.tabloid.service=brain',
  'localhost/tabloid-brain-tailscale:latest'
) | Out-Null

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  & $podman exec $tailscaleContainer tailscale --socket=/tmp/tailscaled.sock ip -4
  if ($LASTEXITCODE -eq 0) { break }
  if ($attempt -eq 29) { throw 'Brain Tailscale sidecar did not authenticate.' }
  Start-Sleep -Seconds 2
}

$url = "https://$Hostname.$TailnetDomain/"
Write-Host "Brain service deployed: $url"
Write-Host 'The OpenRouter and MCP credentials are stored as Podman secrets, not in the repository or browser bundle.'
