[CmdletBinding()]
param(
  [string]$Repository = 'dioscarr/Tabloid',
  [string]$TailnetDomain = 'tail70b7f1.ts.net',
  [string]$SecretPath = "$env:LOCALAPPDATA\Tabloid\preview-oauth-secret.txt",
  [string]$OnlyBranch = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$stateDirectory = Join-Path $env:LOCALAPPDATA 'Tabloid'
$statePath = Join-Path $stateDirectory 'preview-state.json'
$tombstonePath = Join-Path $stateDirectory 'preview-tombstones.json'
$podman = Join-Path $env:LOCALAPPDATA 'Programs\Podman\podman.exe'
$staticNetwork = 'tabloid-static'
$staticVolume = 'tabloid-static-deployments'
$staticGateway = 'tabloid-static-gateway'
$staticGatewayImage = 'localhost/tabloid-static-gateway:latest'
$previewTailscaleImage = 'localhost/tabloid-tailscale-preview:latest'

if (-not (Test-Path $podman)) { throw "Podman was not found at $podman" }
if (-not (Test-Path $SecretPath)) { throw "Tailscale OAuth secret is not configured. Run scripts\configure-preview-deployer.ps1 first." }

New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
$encryptedSecret = (Get-Content -Raw $SecretPath).Trim()
$secureSecret = $encryptedSecret | ConvertTo-SecureString
$secretHandle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
try {
  $oauthSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretHandle)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretHandle)
}

function Get-PreviewId([string]$Branch) {
  $slug = $Branch.ToLowerInvariant() -replace '[^a-z0-9]+', '-'
  $slug = $slug.Trim('-')
  if (-not $slug) { $slug = 'branch' }
  if ($slug.Length -gt 38) { $slug = $slug.Substring(0, 38).TrimEnd('-') }
  $bytes = [Text.Encoding]::UTF8.GetBytes($Branch)
  $sha256 = [Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha256.ComputeHash($bytes)
  } finally {
    $sha256.Dispose()
  }
  $hash = ([BitConverter]::ToString($hashBytes) -replace '-', '').Substring(0, 6).ToLowerInvariant()
  return "$slug-$hash"
}

function Get-PreviewMode([string]$Branch) {
  if ($Branch -eq 'api') { return 'service' }
  return 'static'
}

function Get-PreviewOrigin([string]$Hostname, [string]$TailnetDomain) {
  return "https://$Hostname.$TailnetDomain"
}

function Invoke-Podman {
  param(
    [string[]]$Arguments,
    [switch]$AllowFailure
  )

  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $podman
  $startInfo.UseShellExecute = $false
  $startInfo.Arguments = (($Arguments | ForEach-Object { '"' + ([string]$_).Replace('"', '\"') + '"' }) -join ' ')
  $process = [Diagnostics.Process]::Start($startInfo)
  $process.WaitForExit()
  $exitCode = $process.ExitCode
  if ($exitCode -ne 0) {
    if ($AllowFailure) { return $false }
    throw "Podman failed with exit code ${exitCode}: $($Arguments -join ' ')"
  }
  return $true
}

function Test-Podman([string[]]$Arguments) {
  return Invoke-Podman -Arguments $Arguments -AllowFailure
}

function Ensure-LocalImage([string]$Image, [string]$Containerfile) {
  if (-not (Test-Podman -Arguments @('image', 'exists', $Image))) {
    Invoke-Podman -Arguments @('build', '--format', 'docker', '--file', (Join-Path $repoRoot $Containerfile), '--tag', $Image, $repoRoot) | Out-Null
  }
}

function Wait-ContainerHealthy {
  param(
    [string]$Container,
    [int]$Attempts,
    [int]$DelaySeconds,
    [string]$FailureMessage
  )

  for ($attempt = 0; $attempt -lt $Attempts; $attempt++) {
    if (Test-Podman -Arguments @('healthcheck', 'run', $Container)) { return }
    Start-Sleep -Seconds $DelaySeconds
  }
  throw $FailureMessage
}

function Normalize-Origin([string]$Origin) {
  if (-not $Origin) { return $null }

  $uri = $null
  if (-not [Uri]::TryCreate($Origin, [UriKind]::Absolute, [ref]$uri)) {
    throw "ADMIN_ALLOWED_ORIGINS contains an invalid origin: $Origin"
  }
  if (@('http', 'https') -notcontains $uri.Scheme.ToLowerInvariant() -or $uri.UserInfo -or $uri.AbsolutePath -ne '/' -or $uri.Query -or $uri.Fragment) {
    throw "ADMIN_ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths: $Origin"
  }

  return $uri.GetLeftPart([UriPartial]::Authority)
}

function Join-Origins([string[]]$Origins) {
  $unique = [System.Collections.Generic.List[string]]::new()
  foreach ($originSet in $Origins) {
    if (-not $originSet) { continue }
    foreach ($origin in ([string]$originSet -split ',')) {
      $trimmed = $origin.Trim()
      if (-not $trimmed) { continue }
      $normalized = Normalize-Origin $trimmed
      if ($normalized -and -not $unique.Contains($normalized)) {
        $unique.Add($normalized)
      }
    }
  }
  return [string]::Join(',', $unique)
}

function Ensure-PreviewTailscaleImage {
  Ensure-LocalImage -Image $previewTailscaleImage -Containerfile 'Tailscale.Containerfile'
}

function Ensure-StaticGateway {
  Ensure-LocalImage -Image $staticGatewayImage -Containerfile 'StaticGateway.Containerfile'
  Ensure-PreviewTailscaleImage
  if (-not (Test-Podman -Arguments @('network', 'exists', $staticNetwork))) {
    Invoke-Podman -Arguments @('network', 'create', $staticNetwork) | Out-Null
  }
  if (-not (Test-Podman -Arguments @('volume', 'exists', $staticVolume))) {
    Invoke-Podman -Arguments @('volume', 'create', $staticVolume) | Out-Null
  }
  if (-not (Test-Podman -Arguments @('container', 'exists', $staticGateway))) {
    Invoke-Podman -Arguments @(
      'run', '--detach',
      '--name', $staticGateway,
      '--restart', 'unless-stopped',
      '--network', $staticNetwork,
      '--network-alias', 'tabloid-static-gateway',
      '--volume', "${staticVolume}:/deployments:ro",
      '--health-cmd', 'wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1',
      '--health-interval', '30s',
      '--health-timeout', '3s',
      '--health-retries', '3',
      '--label', 'io.dioscarr.tabloid.static-gateway=true',
      $staticGatewayImage
    ) | Out-Null
  } else {
    Invoke-Podman -Arguments @('start', $staticGateway) -AllowFailure | Out-Null
  }

  Wait-ContainerHealthy -Container $staticGateway -Attempts 15 -DelaySeconds 1 -FailureMessage "Shared static gateway '$staticGateway' did not become healthy."
}

function Publish-StaticDeployment([string]$Id, [string]$Sha, [string]$Image) {
  $script = "set -eu; target=/deployments/$Id/$Sha; mkdir -p `$target; cp -R /usr/share/nginx/html/. `$target/; ln -sfn $Sha /deployments/$Id/current"
  Invoke-Podman -Arguments @(
    'run', '--rm',
    '--entrypoint', '/bin/sh',
    '--volume', "${staticVolume}:/deployments",
    $Image, '-c', $script
  ) | Out-Null
}

function Remove-StaticDeployment([string]$Id) {
  if (-not $Id -or -not (Test-Podman -Arguments @('volume', 'exists', $staticVolume))) { return }
  $script = "rm -rf /deployments/$Id"
  Invoke-Podman -Arguments @(
    'run', '--rm',
    '--entrypoint', '/bin/sh',
    '--volume', "${staticVolume}:/deployments",
    $staticGatewayImage, '-c', $script
  ) -AllowFailure | Out-Null
}

function Start-PreviewTailscale {
  param(
    [string]$Project,
    [string]$Branch,
    [string]$Hostname,
    [string[]]$Networks,
    [string]$Volume,
    [string]$ServeDestination,
    [string]$VerificationUrl,
    [string]$VerificationFailure
  )

  Ensure-PreviewTailscaleImage
  if (-not (Test-Podman -Arguments @('volume', 'exists', $Volume))) {
    Invoke-Podman -Arguments @('volume', 'create', $Volume) | Out-Null
  }

  $tailscaleContainer = "$Project-tailscale"
  if (Test-Podman -Arguments @('container', 'exists', $tailscaleContainer)) {
    Invoke-Podman -Arguments @('rm', '--force', $tailscaleContainer) | Out-Null
  }

  $env:TS_AUTHKEY = "${oauthSecret}?ephemeral=true&preauthorized=true"
  $env:TS_AUTH_ONCE = 'true'
  $env:TS_EXTRA_ARGS = '--advertise-tags=tag:preview'
  $env:TS_HOSTNAME = $Hostname
  $env:TS_STATE_DIR = '/var/lib/tailscale'
  $env:TS_SERVE_CONFIG = '/config/serve.json'
  $env:TS_USERSPACE = 'true'
  $env:TABLOID_SERVE_DESTINATION = $ServeDestination

  $arguments = @(
    'run', '--detach',
    '--name', $tailscaleContainer,
    '--hostname', $Hostname,
    '--restart', 'unless-stopped'
  )
  foreach ($network in $Networks) {
    $arguments += @('--network', $network)
  }
  $arguments += @(
    '--env', 'TS_AUTHKEY',
    '--env', 'TS_AUTH_ONCE',
    '--env', 'TS_EXTRA_ARGS',
    '--env', 'TS_HOSTNAME',
    '--env', 'TS_STATE_DIR',
    '--env', 'TS_SERVE_CONFIG',
    '--env', 'TS_USERSPACE',
    '--env', 'TABLOID_SERVE_DESTINATION',
    '--volume', "${Volume}:/var/lib/tailscale",
    '--label', 'io.dioscarr.tabloid.preview=true',
    '--label', "io.dioscarr.tabloid.branch=$Branch",
    $previewTailscaleImage
  )

  Invoke-Podman -Arguments $arguments | Out-Null

  $authenticated = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (Test-Podman -Arguments @(
      'exec', $tailscaleContainer,
      'tailscale', '--socket=/tmp/tailscaled.sock', 'ip', '-4'
    )) {
      $authenticated = $true
      break
    }
    Start-Sleep -Seconds 2
  }
  if (-not $authenticated) { throw "Tailscale sidecar '$tailscaleContainer' did not authenticate." }

  if (-not (Test-Podman -Arguments @(
    'exec', $tailscaleContainer,
    'wget', '-qO', '/dev/null', $VerificationUrl
  ))) {
    throw $VerificationFailure
  }
}

function Deploy-StaticPreview {
  param(
    [string]$Project,
    [string]$Id,
    [string]$Sha,
    [string]$Branch,
    [string]$Hostname,
    [string]$Image
  )

  $network = $Project
  $tailscaleVolume = "$Project-tailscale-state"
  $appContainer = "$Project-app"

  Ensure-StaticGateway
  Publish-StaticDeployment -Id $Id -Sha $Sha -Image $Image

  if (-not (Test-Podman -Arguments @('network', 'exists', $network))) {
    Invoke-Podman -Arguments @('network', 'create', $network) | Out-Null
  }

  Start-PreviewTailscale `
    -Project $Project `
    -Branch $Branch `
    -Hostname $Hostname `
    -Networks @($network, $staticNetwork) `
    -Volume $tailscaleVolume `
    -ServeDestination "http://tabloid-static-gateway:8080/$Id/current/" `
    -VerificationUrl "http://tabloid-static-gateway:8080/$Id/current/" `
    -VerificationFailure "Tailscale sidecar '$Project-tailscale' cannot reach its static deployment."

  if (Test-Podman -Arguments @('container', 'exists', $appContainer)) {
    Invoke-Podman -Arguments @('rm', '--force', $appContainer) | Out-Null
  }
}

function Deploy-ServicePreview {
  param(
    [string]$Project,
    [string]$Id,
    [string]$Branch,
    [string]$Hostname,
    [string]$Image,
    [string]$TailnetDomain
  )

  $network = $Project
  $tailscaleVolume = "$Project-tailscale-state"
  $adminDataVolume = "$Project-admin-data"
  $appContainer = "$Project-app"
  $previewOrigin = Get-PreviewOrigin -Hostname $Hostname -TailnetDomain $TailnetDomain
  $adminOrigin = Get-PreviewOrigin -Hostname "tabloid-$(Get-PreviewId 'admin')" -TailnetDomain $TailnetDomain
  $allowedOrigins = Join-Origins @($previewOrigin, $adminOrigin, $env:ADMIN_ALLOWED_ORIGINS)

  Ensure-PreviewTailscaleImage
  if (-not (Test-Podman -Arguments @('network', 'exists', $network))) {
    Invoke-Podman -Arguments @('network', 'create', $network) | Out-Null
  }
  if (-not (Test-Podman -Arguments @('volume', 'exists', $adminDataVolume))) {
    Invoke-Podman -Arguments @('volume', 'create', $adminDataVolume) | Out-Null
  }
  if (Test-Podman -Arguments @('container', 'exists', $appContainer)) {
    Invoke-Podman -Arguments @('rm', '--force', $appContainer) | Out-Null
  }

  $arguments = @(
    'run', '--detach',
    '--name', $appContainer,
    '--restart', 'unless-stopped',
    '--network', $network,
    '--network-alias', 'tabloid-app',
    '--volume', "${adminDataVolume}:/var/lib/tabloid-admin",
    '--env', "ADMIN_ALLOWED_ORIGINS=$allowedOrigins",
    '--env', 'ADMIN_DATA_DIR=/var/lib/tabloid-admin'
  )
  if ($env:ADMIN_CSRF_SECRET) { $arguments += @('--env', 'ADMIN_CSRF_SECRET') }
  if ($env:ADMIN_WORKSPACE_REPOSITORIES) { $arguments += @('--env', 'ADMIN_WORKSPACE_REPOSITORIES') }
  if ($env:BRAIN_API_URL) { $arguments += @('--env', 'BRAIN_API_URL') }
  if ($env:BRAIN_ADMIN_TOKEN) { $arguments += @('--env', 'BRAIN_ADMIN_TOKEN') }
  $arguments += @(
    '--label', 'io.dioscarr.tabloid.preview=true',
    '--label', "io.dioscarr.tabloid.branch=$Branch",
    $Image
  )

  Invoke-Podman -Arguments $arguments | Out-Null
  Wait-ContainerHealthy -Container $appContainer -Attempts 30 -DelaySeconds 2 -FailureMessage "Preview application container '$appContainer' did not become healthy."

  Start-PreviewTailscale `
    -Project $Project `
    -Branch $Branch `
    -Hostname $Hostname `
    -Networks @($network) `
    -Volume $tailscaleVolume `
    -ServeDestination 'http://tabloid-app:8080/' `
    -VerificationUrl 'http://tabloid-app:8080/health' `
    -VerificationFailure "Tailscale sidecar '$Project-tailscale' cannot reach the Admin API service."

  Remove-StaticDeployment -Id $Id
}

function Remove-Preview([string]$Project, [string]$Id) {
  foreach ($container in @("$Project-tailscale", "$Project-app")) {
    if (Test-Podman -Arguments @('container', 'exists', $container)) {
      Invoke-Podman -Arguments @('rm', '--force', $container) | Out-Null
    }
  }
  if (Test-Podman -Arguments @('network', 'exists', $Project)) {
    Invoke-Podman -Arguments @('network', 'rm', $Project) | Out-Null
  }
  foreach ($volume in @("$Project-tailscale-state", "$Project-admin-data")) {
    if (Test-Podman -Arguments @('volume', 'exists', $volume)) {
      Invoke-Podman -Arguments @('volume', 'rm', $volume) | Out-Null
    }
  }
  Remove-StaticDeployment -Id $Id
}

$headers = @{ Accept = 'application/vnd.github+json'; 'User-Agent' = 'tabloid-preview-deployer' }
$branchResponse = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$Repository/branches?per_page=100"
$branches = @()
$archivedBranches = @{}
if (Test-Path $tombstonePath) {
  foreach ($record in @(Get-Content -Raw $tombstonePath | ConvertFrom-Json)) {
    if ($record.branch) { $archivedBranches[[string]$record.branch] = $true }
  }
}
foreach ($branchRecord in $branchResponse) {
  if ($branchRecord.name -ne 'main' -and -not $archivedBranches.ContainsKey([string]$branchRecord.name)) { $branches += $branchRecord }
}

$previous = @{}
if (Test-Path $statePath) {
  $saved = Get-Content -Raw $statePath | ConvertFrom-Json
  if ($saved) {
    foreach ($property in $saved.PSObject.Properties) {
      $previous[$property.Name] = $property.Value
    }
  }
}

$desired = @{}
foreach ($branch in $branches) {
  $id = Get-PreviewId $branch.name
  $project = "tabloid-preview-$id"
  $hostname = "tabloid-$id"
  $image = "ghcr.io/dioscarr/tabloid:preview-$id"
  $branchSha = [string]$branch.commit.sha
  $mode = Get-PreviewMode $branch.name
  $previewOrigin = Get-PreviewOrigin -Hostname $hostname -TailnetDomain $TailnetDomain

  if ($OnlyBranch -and [string]$branch.name -ne $OnlyBranch) {
    if ($previous.ContainsKey($project)) { $desired[$project] = $previous[$project] }
    continue
  }

  if ($previous.ContainsKey($project) -and [string]$previous[$project].sha -eq $branchSha -and [string]$previous[$project].mode -eq $mode) {
    $desired[$project] = $previous[$project]
    Write-Host "$($branch.name) is unchanged at $($desired[$project].url)"
    continue
  }

  if (-not (Invoke-Podman -Arguments @('pull', $image) -AllowFailure)) {
    Write-Warning "Preview image is not ready for branch '$($branch.name)'; leaving any current preview untouched."
    if ($previous.ContainsKey($project)) { $desired[$project] = $previous[$project] }
    continue
  }

  if ($mode -eq 'service') {
    Deploy-ServicePreview -Project $project -Id $id -Branch $branch.name -Hostname $hostname -Image $image -TailnetDomain $TailnetDomain
  } else {
    Deploy-StaticPreview -Project $project -Id $id -Sha $branchSha -Branch $branch.name -Hostname $hostname -Image $image
  }

  $record = [ordered]@{
    branch = $branch.name
    hostname = $hostname
    url = "$previewOrigin/"
    image = $image
    sha = $branchSha
    mode = $mode
  }
  if ($mode -eq 'service') {
    $record.apiOrigin = $previewOrigin
  }
  $desired[$project] = $record
  Write-Host "$($branch.name) -> $($desired[$project].url) ($mode)"
}

foreach ($project in @($previous.Keys)) {
  if (-not $desired.ContainsKey($project)) {
    $record = $previous[$project]
    Remove-Preview -Project $project -Id (Get-PreviewId ([string]$record.branch))
    Write-Host "Removed preview for deleted branch '$($record.branch)'."
  }
}

$desired | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $statePath
