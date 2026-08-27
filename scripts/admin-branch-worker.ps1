[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$stateDirectory = Join-Path $env:LOCALAPPDATA 'Tabloid'
$config = Get-Content -Raw (Join-Path $stateDirectory 'admin-worker.json') | ConvertFrom-Json
$podman = Join-Path $env:LOCALAPPDATA 'Programs\Podman\podman.exe'
$tombstonePath = Join-Path $stateDirectory 'preview-tombstones.json'
$previewStatePath = Join-Path $stateDirectory 'preview-state.json'
$branchCachePath = Join-Path $stateDirectory 'admin-branch-cache.json'
$staticVolume = 'tabloid-static-deployments'
$staticGatewayImage = 'localhost/tabloid-static-gateway:latest'
$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$($config.port)/")

function Get-PreviewId([string]$Branch) {
  $slug = ($Branch.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
  if (-not $slug) { $slug = 'branch' }
  if ($slug.Length -gt 38) { $slug = $slug.Substring(0, 38).TrimEnd('-') }
  $sha = [Security.Cryptography.SHA256]::Create()
  try { $hash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Branch))) -replace '-', '').Substring(0, 6).ToLowerInvariant() }
  finally { $sha.Dispose() }
  "$slug-$hash"
}

function Assert-Branch([string]$Branch) {
  if (-not $Branch -or $Branch.Length -gt 120 -or $Branch -notmatch '^[A-Za-z0-9._/-]+$' -or $Branch.Contains('..')) { throw 'Invalid branch' }
}

function Invoke-Podman([string[]]$Arguments, [switch]$AllowFailure) {
  $output = @(& $podman @Arguments 2>&1)
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0 -and -not $AllowFailure) {
    $detail = (($output | Select-Object -Last 8) -join ' ').Trim()
    if ($detail.Length -gt 1200) { $detail = $detail.Substring(0, 1200) }
    if ($detail) { throw "Podman command failed: $($Arguments[0]): $detail" }
    throw "Podman command failed: $($Arguments[0])"
  }
  $exitCode -eq 0
}

function Test-Resource([string]$Kind, [string]$Name) { Invoke-Podman @($Kind, 'exists', $Name) -AllowFailure }

function Test-Workspace([string]$Id) {
  Invoke-Podman @('exec', '--user', 'abc', 'code-server', 'test', '-e', "/config/workspaces/$Id/.git") -AllowFailure
}

function Test-StaticDeployment([string]$Project) {
  if (-not (Test-Path $previewStatePath)) { return $false }
  try {
    $state = Get-Content -Raw $previewStatePath | ConvertFrom-Json
    $record = $state.PSObject.Properties[$Project]
    return $null -ne $record -and [string]$record.Value.mode -eq 'static'
  } catch { return $false }
}

function Get-BranchNames {
  try {
    $remote = Invoke-RestMethod -Headers @{ Accept = 'application/vnd.github+json'; 'User-Agent' = 'tabloid-admin-worker' } -Uri 'https://api.github.com/repos/dioscarr/Tabloid/branches?per_page=100' -TimeoutSec 20
    $names = @($remote | ForEach-Object { [string]$_.name })
    $names | ConvertTo-Json | Set-Content -Encoding utf8 $branchCachePath
    return $names
  } catch {
    if (Test-Path $branchCachePath) { return @(Get-Content -Raw $branchCachePath | ConvertFrom-Json) }
    $names = @('main')
    if (Test-Path $previewStatePath) {
      $state = Get-Content -Raw $previewStatePath | ConvertFrom-Json
      $names += @($state.PSObject.Properties | ForEach-Object { [string]$_.Value.branch })
    }
    return @($names | Sort-Object -Unique)
  }
}

function Get-Inventory([string]$Branch) {
  $id = Get-PreviewId $Branch
  $project = if ($Branch -eq 'main') { 'my-web-stack' } else { "tabloid-preview-$id" }
  $appContainerName = if ($Branch -eq 'main') { 'tabloid' } else { "$project-app" }
  $tailscaleContainerName = if ($Branch -eq 'main') { 'tabloid-tailscale' } else { "$project-tailscale" }
  $networkName = if ($Branch -eq 'main') { 'my-web-stack_default' } else { $project }
  $legacyApp = Test-Resource 'container' $appContainerName
  $staticDeployment = if ($Branch -eq 'main') { $false } else { Test-StaticDeployment $project }
  [ordered]@{
    branch = $Branch; id = $id; project = $project
    image = if ($Branch -eq 'main') { 'ghcr.io/dioscarr/tabloid:main' } else { "ghcr.io/dioscarr/tabloid:preview-$id" }
    appContainer = $legacyApp -or $staticDeployment
    staticHosting = $staticDeployment
    tailscaleContainer = Test-Resource 'container' $tailscaleContainerName
    network = Test-Resource 'network' $networkName
    volume = if ($Branch -eq 'main') { $false } else { Test-Resource 'volume' "$project-tailscale-state" }
    workspace = Test-Workspace $id
    appUrl = if ($Branch -eq 'main') { 'https://tabloid.tail70b7f1.ts.net/' } else { "https://tabloid-$id.tail70b7f1.ts.net/" }
    vscodeUrl = "http://tabloid-code-server.tail70b7f1.ts.net/?folder=/config/workspaces/$id"
  }
}

function New-Workspace([string]$Branch) {
  Assert-Branch $Branch
  $id = Get-PreviewId $Branch
  Invoke-Podman @('exec', '--user', 'abc', 'code-server', 'mkdir', '-p', '/config/workspaces') | Out-Null
  Invoke-Podman @('exec', '--user', 'abc', 'code-server', 'git', '-C', '/config/workspace', 'fetch', 'origin', "refs/heads/${Branch}:refs/remotes/origin/${Branch}") | Out-Null
  if (-not (Test-Workspace $id)) {
    Invoke-Podman @('exec', '--user', 'abc', 'code-server', 'git', '-C', '/config/workspace', 'worktree', 'add', '-B', "workspace/$id", "/config/workspaces/$id", "origin/$Branch") | Out-Null
  }
  $environmentCommand = "cd /config/workspaces/$id && if [ -f scripts/generate-branch-env.mjs ]; then npm run env:branch -- --branch '$Branch'; else node /config/workspace/scripts/generate-branch-env.mjs --branch '$Branch'; fi"
  Invoke-Podman @('exec', '--user', 'abc', 'code-server', 'sh', '-lc', $environmentCommand) | Out-Null
  Get-Inventory $Branch
}

function Add-Tombstone([string]$Branch) {
  $records = @()
  if (Test-Path $tombstonePath) { $records = @(Get-Content -Raw $tombstonePath | ConvertFrom-Json) }
  if (-not @($records | Where-Object branch -eq $Branch).Count) { $records += [pscustomobject]@{ branch = $Branch; archivedAt = [DateTime]::UtcNow.ToString('o') } }
  $records | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $tombstonePath
}

function Remove-Preview([string]$Branch, [bool]$PurgeVolume) {
  Assert-Branch $Branch
  if ($Branch -eq 'main') { throw 'Production cannot be removed by this worker' }
  $item = Get-Inventory $Branch
  Add-Tombstone $Branch
  foreach ($container in @("$($item.project)-tailscale", "$($item.project)-app")) { if (Test-Resource 'container' $container) { Invoke-Podman @('rm', '--force', $container) | Out-Null } }
  if (Test-Resource 'network' $item.project) { Invoke-Podman @('network', 'rm', $item.project) | Out-Null }
  if ($PurgeVolume -and (Test-Resource 'volume' "$($item.project)-tailscale-state")) { Invoke-Podman @('volume', 'rm', "$($item.project)-tailscale-state") | Out-Null }
  if (Test-Resource 'volume' $staticVolume) {
    Invoke-Podman @('run', '--rm', '--user', '0', '--entrypoint', '/bin/sh', '--volume', "${staticVolume}:/deployments", $staticGatewayImage, '-c', "rm -rf /deployments/$($item.id)") -AllowFailure | Out-Null
  }
  Invoke-Podman @('image', 'rm', $item.image) -AllowFailure | Out-Null
  Get-Inventory $Branch
}

function Write-Json($Response, [int]$Status, $Body) {
  $Response.StatusCode = $Status
  $Response.Headers['Access-Control-Allow-Origin'] = [string]$config.adminOrigin
  $Response.Headers['Access-Control-Allow-Headers'] = 'content-type'
  $Response.Headers['Access-Control-Allow-Methods'] = 'GET,POST,DELETE,OPTIONS'
  if ($Status -eq 204) { $Response.Close(); return }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 8 -Compress))
  $Response.ContentType = 'application/json'
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.Close()
}

$listener.Start()
Write-Host "Tabloid Admin worker listening on http://127.0.0.1:$($config.port)/"
while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $request = $context.Request
    if ($request.HttpMethod -eq 'OPTIONS') { Write-Json $context.Response 204 @{}; continue }
    $login = [string]$request.Headers['Tailscale-User-Login']
    if ($request.Headers['Origin'] -ne $config.adminOrigin -or $login.ToLowerInvariant() -ne $config.adminLogin.ToLowerInvariant()) {
      Add-Content -Path (Join-Path $stateDirectory 'admin-worker-auth.log') -Value "$([DateTime]::UtcNow.ToString('o')) origin=$($request.Headers['Origin']) login=$login remote=$($request.RemoteEndPoint.Address)"
      Write-Json $context.Response 403 @{ error = 'Forbidden' }; continue
    }
    if ($request.HttpMethod -eq 'GET' -and $request.Url.AbsolutePath -eq '/api/v1/branches') {
      Write-Json $context.Response 200 @{ branches = @(Get-BranchNames | ForEach-Object { Get-Inventory $_ }) }; continue
    }
    if ($request.Url.AbsolutePath -notmatch '^/api/v1/branches/([^/]+)/(workspace|preview)$') { Write-Json $context.Response 404 @{ error = 'Not found' }; continue }
    $branch = [Uri]::UnescapeDataString($Matches[1]); $action = $Matches[2]
    if ($request.HttpMethod -eq 'POST' -and $action -eq 'workspace') { Write-Json $context.Response 200 (New-Workspace $branch); continue }
    if ($request.HttpMethod -eq 'DELETE' -and $action -eq 'preview') { Write-Json $context.Response 200 (Remove-Preview $branch ($request.QueryString['purgeVolume'] -eq 'true')); continue }
    Write-Json $context.Response 405 @{ error = 'Method not allowed' }
  } catch { Write-Json $context.Response 500 @{ error = $_.Exception.Message } }
}


