[CmdletBinding()]
param(
  [string]$Repository = 'dioscarr/Tabloid',
  [string]$TailnetDomain = 'tail70b7f1.ts.net',
  [string]$SecretPath = "$env:LOCALAPPDATA\Tabloid\preview-oauth-secret.txt"
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repoRoot 'preview\compose.yaml'
$stateDirectory = Join-Path $env:LOCALAPPDATA 'Tabloid'
$statePath = Join-Path $stateDirectory 'preview-state.json'
$podman = Join-Path $env:LOCALAPPDATA 'Programs\Podman\podman.exe'

if (-not (Test-Path $podman)) { throw "Podman was not found at $podman" }
if (-not (Test-Path $composeFile)) { throw "Preview Compose file was not found at $composeFile" }
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

function Invoke-Compose([string[]]$Arguments) {
  & $podman compose --file $composeFile @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Podman Compose failed with exit code $LASTEXITCODE" }
}

$headers = @{ Accept = 'application/vnd.github+json'; 'User-Agent' = 'tabloid-preview-deployer' }
$branches = @(Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$Repository/branches?per_page=100") |
  Where-Object { $_.name -ne 'main' }

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

  & $podman pull $image | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Preview image is not ready for branch '$($branch.name)'; leaving any current preview untouched."
    if ($previous.ContainsKey($project)) { $desired[$project] = $previous[$project] }
    continue
  }

  $env:PREVIEW_BRANCH = $branch.name
  $env:PREVIEW_HOSTNAME = $hostname
  $env:PREVIEW_IMAGE = $image
  $env:TS_OAUTH_SECRET = $oauthSecret
  Invoke-Compose @('--project-name', $project, 'up', '-d', '--pull', 'always', '--remove-orphans')

  $desired[$project] = [ordered]@{
    branch = $branch.name
    hostname = $hostname
    url = "https://$hostname.$TailnetDomain/"
    image = $image
  }
  Write-Host "$($branch.name) -> $($desired[$project].url)"
}

foreach ($project in @($previous.Keys)) {
  if (-not $desired.ContainsKey($project)) {
    $record = $previous[$project]
    $env:PREVIEW_BRANCH = [string]$record.branch
    $env:PREVIEW_HOSTNAME = [string]$record.hostname
    $env:PREVIEW_IMAGE = [string]$record.image
    $env:TS_OAUTH_SECRET = $oauthSecret
    Invoke-Compose @('--project-name', $project, 'down', '--volumes', '--remove-orphans')
    Write-Host "Removed preview for deleted branch '$($record.branch)'."
  }
}

$desired | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $statePath
