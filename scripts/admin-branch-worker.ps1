[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$stateDirectory = Join-Path $env:LOCALAPPDATA 'Tabloid'
$config = Get-Content -Raw (Join-Path $stateDirectory 'admin-worker.json') | ConvertFrom-Json
$podman = Join-Path $env:LOCALAPPDATA 'Programs\Podman\podman.exe'
$tombstonePath = Join-Path $stateDirectory 'preview-tombstones.json'
$previewStatePath = Join-Path $stateDirectory 'preview-state.json'
$branchCachePath = Join-Path $stateDirectory 'admin-branch-cache.json'
$appGalleryRequestPath = Join-Path $stateDirectory 'app-gallery-requests.json'
$appGalleryAuditPath = Join-Path $stateDirectory 'app-gallery-audit.jsonl'
$appGalleryCreateLockPath = Join-Path $stateDirectory 'app-gallery-create.lock'
$appGalleryTokenPath = Join-Path $stateDirectory 'app-gallery-github-token.json'
$appGalleryTemplatePath = Join-Path $repoRoot 'templates\app-gallery.json'
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

function New-RequestError([int]$Status, [string]$Message) {
  $exception = [System.InvalidOperationException]::new($Message)
  $exception.Data['httpStatus'] = $Status
  throw $exception
}

function Assert-AppGallerySlug([string]$Slug) {
  if (-not $Slug -or $Slug.Length -gt 48 -or $Slug -notmatch '^[a-z0-9][a-z0-9-]{1,47}$') {
    New-RequestError 400 'App slug must contain 2-48 lowercase letters, numbers, or hyphens.'
  }
}

function Get-AppGalleryTemplates {
  try { $registry = Get-Content -Raw $appGalleryTemplatePath | ConvertFrom-Json }
  catch { throw "App Gallery template registry is unavailable." }
  $templates = @($registry.templates)
  if ($templates.Count -eq 0) { throw 'App Gallery template registry is empty.' }
  $ids = @{}
  foreach ($template in $templates) {
    $id = [string]$template.id
    if ($id -notmatch '^[a-z0-9][a-z0-9-]{1,48}$' -or $ids.ContainsKey($id)) { throw 'App Gallery template registry contains an invalid or duplicate ID.' }
    if ([string]$template.sourceBranch -notin @('main', 'admin', 'brain')) { throw 'App Gallery template source branch is not allowlisted.' }
    if ([string]$template.contractPath -ne 'public/app.contract.json') { throw 'App Gallery template contract path is not allowlisted.' }
    $ids[$id] = $true
  }
  return $templates
}

function Get-AppGalleryToken {
  if (-not (Test-Path $appGalleryTokenPath)) { New-RequestError 503 'GitHub App installation token is not configured.' }
  try { $record = Get-Content -Raw $appGalleryTokenPath | ConvertFrom-Json } catch { New-RequestError 503 'GitHub App installation token configuration is invalid.' }
  if ([string]$record.repository -ne 'dioscarr/Tabloid') { New-RequestError 503 'GitHub App installation token scope is invalid.' }
  $expiresAt = [DateTime]::MinValue
  if (-not [DateTime]::TryParse([string]$record.expiresAt, [ref]$expiresAt) -or $expiresAt.ToUniversalTime() -le [DateTime]::UtcNow.AddMinutes(5)) {
    New-RequestError 503 'GitHub App installation token is expired or too close to expiry.'
  }
  try {
    $secure = ([string]$record.encryptedToken) | ConvertTo-SecureString
    $handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle) }
  } catch { New-RequestError 503 'GitHub App installation token could not be decrypted for this Windows account.' }
}

function Invoke-AppGalleryGitHub([string]$Method, [string]$Path, $Body = $null) {
  $token = Get-AppGalleryToken
  $headers = @{
    Accept = 'application/vnd.github+json'
    Authorization = "Bearer $token"
    'User-Agent' = 'tabloid-app-gallery-worker'
    'X-GitHub-Api-Version' = '2022-11-28'
  }
  $parameters = @{ Method = $Method; Headers = $headers; Uri = "https://api.github.com$Path"; TimeoutSec = 30 }
  if ($null -ne $Body) { $parameters.ContentType = 'application/json'; $parameters.Body = ($Body | ConvertTo-Json -Depth 20 -Compress) }
  try { return Invoke-RestMethod @parameters }
  catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    if ($status -eq 404) { New-RequestError 404 'GitHub resource was not found.' }
    if ($status -eq 401 -or $status -eq 403) { New-RequestError 503 'GitHub App installation token was rejected.' }
    New-RequestError 502 'GitHub branch creation request failed.'
  }
}

function Get-AppGalleryRequests {
  if (-not (Test-Path $appGalleryRequestPath)) { return @() }
  try { return @(Get-Content -Raw $appGalleryRequestPath | ConvertFrom-Json) }
  catch { throw 'App Gallery request state is unreadable.' }
}

function Read-RequestJson($Request) {
  $reader = [IO.StreamReader]::new($Request.InputStream, $Request.ContentEncoding)
  try {
    $text = $reader.ReadToEnd()
    if ($text.Length -gt 32768) { New-RequestError 400 'Request body is too large.' }
    if (-not $text) { New-RequestError 400 'Request body is required.' }
    return $text | ConvertFrom-Json
  } catch [System.Management.Automation.RuntimeException] { throw }
  catch { New-RequestError 400 'Request body must be valid JSON.' }
  finally { $reader.Dispose() }
}

function Write-AppGalleryRequests($Records) {
  $temporaryPath = "$appGalleryRequestPath.tmp"
  @($Records) | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $temporaryPath
  Move-Item -Force $temporaryPath $appGalleryRequestPath
}

function Write-AppGalleryAudit([string]$Actor, [string]$Action, [string]$Outcome, [string]$Target = '') {
  # Deliberately omit request text, idempotency keys, tokens, and GitHub bodies.
  [ordered]@{ occurredAt = [DateTime]::UtcNow.ToString('o'); actor = $Actor; action = $Action; outcome = $Outcome; target = $Target } |
    ConvertTo-Json -Compress | Add-Content -Encoding utf8 $appGalleryAuditPath
}

function Get-AppGalleryFingerprint($Body) {
  $canonical = [ordered]@{
    slug = ([string]$Body.slug).Trim().ToLowerInvariant()
    name = ([string]$Body.name).Trim()
    description = ([string]$Body.description).Trim()
    intent = ([string]$Body.intent).Trim()
    templateId = ([string]$Body.templateId).Trim()
  } | ConvertTo-Json -Compress
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($canonical))) -replace '-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function ConvertTo-AppGalleryResponse($Record) {
  [ordered]@{
    id = [string]$Record.id; appId = [string]$Record.appId; name = [string]$Record.name
    description = [string]$Record.description; branch = [string]$Record.branch
    templateId = [string]$Record.templateId; sourceBranch = [string]$Record.sourceBranch
    previewUrl = [string]$Record.previewUrl; commit = $Record.commit; status = [string]$Record.status
    customizationSaved = [bool]$Record.intent; createdAt = [string]$Record.createdAt; updatedAt = [string]$Record.updatedAt
  }
}

function New-AppGalleryApp($Body, [string]$Actor, [string]$IdempotencyKey) {
  if ($IdempotencyKey -notmatch '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') { New-RequestError 400 'A valid Idempotency-Key UUID header is required.' }
  $slug = ([string]$Body.slug).Trim().ToLowerInvariant(); Assert-AppGallerySlug $slug
  $name = ([string]$Body.name).Trim(); $description = ([string]$Body.description).Trim(); $intent = ([string]$Body.intent).Trim()
  if ($name.Length -lt 2 -or $name.Length -gt 80) { New-RequestError 400 'App name must contain 2-80 characters.' }
  if ($description.Length -gt 280) { New-RequestError 400 'Description must not exceed 280 characters.' }
  if ($intent.Length -gt 4000) { New-RequestError 400 'Customization request must not exceed 4000 characters.' }
  $template = @(Get-AppGalleryTemplates | Where-Object id -eq ([string]$Body.templateId))[0]
  if ($null -eq $template) { New-RequestError 400 'Unknown app template.' }
  $fingerprint = Get-AppGalleryFingerprint $Body; $branch = "apps/$slug"
  $lock = [IO.File]::Open($appGalleryCreateLockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
  try {
    $records = @(Get-AppGalleryRequests)
    $existing = @($records | Where-Object idempotencyKey -eq $IdempotencyKey)[0]
    if ($null -ne $existing) {
      if ([string]$existing.fingerprint -ne $fingerprint) { New-RequestError 409 'Idempotency-Key was already used with a different request.' }
      if ([string]$existing.status -notin @('creating', 'failed')) { return @{ app = (ConvertTo-AppGalleryResponse $existing); previewUrl = $existing.previewUrl; customizationSaved = [bool]$existing.intent } }
    }
    $reserved = @($records | Where-Object branch -eq $branch | Where-Object idempotencyKey -ne $IdempotencyKey)[0]
    if ($null -ne $reserved) { New-RequestError 409 "App branch '$branch' is already reserved." }
    if ($null -eq $existing) {
      $existing = [pscustomobject][ordered]@{
        id = [Guid]::NewGuid().ToString(); appId = $slug; name = $name; description = $description; branch = $branch
        templateId = [string]$template.id; sourceBranch = [string]$template.sourceBranch; previewUrl = "https://tabloid-$(Get-PreviewId $branch).tail70b7f1.ts.net/"
        commit = $null; intent = $intent; status = 'creating'; actor = $Actor; idempotencyKey = $IdempotencyKey; fingerprint = $fingerprint; createdAt = [DateTime]::UtcNow.ToString('o'); updatedAt = $null
      }
      $records += $existing; Write-AppGalleryRequests $records
    }
    try {
      $encodedBranch = [Uri]::EscapeDataString($branch)
      try { $ref = Invoke-AppGalleryGitHub 'GET' "/repos/dioscarr/Tabloid/git/ref/heads/$encodedBranch" }
      catch {
        if ($_.Exception.Data['httpStatus'] -ne 404) { throw }
        $ref = $null
      }
      if ($null -ne $ref) {
        $existing.commit = [string]$ref.object.sha; $existing.status = if ($intent) { 'requested' } else { 'created' }; $existing.updatedAt = [DateTime]::UtcNow.ToString('o')
        Write-AppGalleryRequests $records; Write-AppGalleryAudit $Actor 'app.create' 'recovered' $branch
        return @{ app = (ConvertTo-AppGalleryResponse $existing); previewUrl = $existing.previewUrl; customizationSaved = [bool]$existing.intent }
      }
      $source = [Uri]::EscapeDataString([string]$template.sourceBranch)
      $sourceRef = Invoke-AppGalleryGitHub 'GET' "/repos/dioscarr/Tabloid/git/ref/heads/$source"
      $sourceCommit = Invoke-AppGalleryGitHub 'GET' "/repos/dioscarr/Tabloid/git/commits/$($sourceRef.object.sha)"
      $content = Invoke-AppGalleryGitHub 'GET' "/repos/dioscarr/Tabloid/contents/$($template.contractPath)?ref=$source"
      $contract = ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(([string]$content.content -replace '\s', ''))) | ConvertFrom-Json)
      $contract.app.id = $slug; $contract.app.name = $name; $contract.app.branch = $branch
      $contract.app.description = if ($description) { $description } else { "Application created from the $($template.name) template." }
      if ($null -ne $contract.deployment) { $contract.deployment.deploy = $true; $contract.deployment.protected = $false }
      $blob = Invoke-AppGalleryGitHub 'POST' '/repos/dioscarr/Tabloid/git/blobs' @{ content = ($contract | ConvertTo-Json -Depth 20); encoding = 'utf-8' }
      $tree = Invoke-AppGalleryGitHub 'POST' '/repos/dioscarr/Tabloid/git/trees' @{ base_tree = $sourceCommit.tree.sha; tree = @(@{ path = [string]$template.contractPath; mode = '100644'; type = 'blob'; sha = $blob.sha }) }
      $commit = Invoke-AppGalleryGitHub 'POST' '/repos/dioscarr/Tabloid/git/commits' @{ message = "Create $name from $($template.name) template"; tree = $tree.sha; parents = @($sourceRef.object.sha) }
      Invoke-AppGalleryGitHub 'POST' '/repos/dioscarr/Tabloid/git/refs' @{ ref = "refs/heads/$branch"; sha = $commit.sha } | Out-Null
      $existing.commit = [string]$commit.sha; $existing.status = if ($intent) { 'requested' } else { 'created' }; $existing.updatedAt = [DateTime]::UtcNow.ToString('o')
      Write-AppGalleryRequests $records; Write-AppGalleryAudit $Actor 'app.create' 'success' $branch
      return @{ app = (ConvertTo-AppGalleryResponse $existing); previewUrl = $existing.previewUrl; customizationSaved = [bool]$existing.intent }
    } catch {
      $existing.status = 'failed'; $existing.updatedAt = [DateTime]::UtcNow.ToString('o'); Write-AppGalleryRequests $records
      $outcome = if ($_.Exception.Data['httpStatus'] -eq 409) { 'conflict' } else { 'failure' }
      Write-AppGalleryAudit $Actor 'app.create' $outcome $branch; throw
    }
  } finally { $lock.Dispose() }
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
  $tailscaleVolumeName = "$project-tailscale-state"
  $adminDataVolumeName = "$project-admin-data"
  $legacyApp = Test-Resource 'container' $appContainerName
  $staticDeployment = if ($Branch -eq 'main') { $false } else { Test-StaticDeployment $project }
  [ordered]@{
    branch = $Branch; id = $id; project = $project
    image = if ($Branch -eq 'main') { 'ghcr.io/dioscarr/tabloid:main' } else { "ghcr.io/dioscarr/tabloid:preview-$id" }
    appContainer = $legacyApp -or $staticDeployment
    staticHosting = $staticDeployment
    tailscaleContainer = Test-Resource 'container' $tailscaleContainerName
    network = Test-Resource 'network' $networkName
    volume = if ($Branch -eq 'main') { $false } else { (Test-Resource 'volume' $tailscaleVolumeName) -or (Test-Resource 'volume' $adminDataVolumeName) }
    workspace = Test-Workspace $id
    appUrl = if ($Branch -eq 'main') { 'https://tabloid.tail70b7f1.ts.net/' } else { "https://tabloid-$id.tail70b7f1.ts.net/" }
    vscodeUrl = "https://dio.tail70b7f1.ts.net:8443/?folder=/config/workspaces/$id"
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
  if ($PurgeVolume) {
    foreach ($volume in @("$($item.project)-tailscale-state", "$($item.project)-admin-data")) {
      if (Test-Resource 'volume' $volume) { Invoke-Podman @('volume', 'rm', $volume) | Out-Null }
    }
  }
  if (Test-Resource 'volume' $staticVolume) {
    Invoke-Podman @('run', '--rm', '--entrypoint', '/bin/sh', '--volume', "${staticVolume}:/deployments", $staticGatewayImage, '-c', "rm -rf /deployments/$($item.id)") -AllowFailure | Out-Null
  }
  Invoke-Podman @('image', 'rm', $item.image) -AllowFailure | Out-Null
  Get-Inventory $Branch
}

function Write-Json($Response, [int]$Status, $Body) {
  $Response.StatusCode = $Status
  $Response.Headers['Access-Control-Allow-Origin'] = [string]$config.adminOrigin
  $Response.Headers['Access-Control-Allow-Headers'] = 'content-type,idempotency-key'
  $Response.Headers['Access-Control-Allow-Methods'] = 'GET,POST,DELETE,OPTIONS'
  $Response.Headers['Vary'] = 'Origin'
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
    if ($request.HttpMethod -eq 'GET' -and $request.Url.AbsolutePath -eq '/healthz') {
      $context.Response.StatusCode = 200
      $context.Response.ContentType = 'application/json'
      $bytes = [Text.Encoding]::UTF8.GetBytes('{"status":"ok"}')
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $context.Response.Close()
      continue
    }
    if ($request.HttpMethod -eq 'OPTIONS') {
      if ($request.Headers['Origin'] -ne $config.adminOrigin) { $context.Response.StatusCode = 403; $context.Response.Close(); continue }
      Write-Json $context.Response 204 @{}; continue
    }
    $login = [string]$request.Headers['Tailscale-User-Login']
    if ($request.Headers['Origin'] -ne $config.adminOrigin -or $login.ToLowerInvariant() -ne $config.adminLogin.ToLowerInvariant()) {
      Add-Content -Path (Join-Path $stateDirectory 'admin-worker-auth.log') -Value "$([DateTime]::UtcNow.ToString('o')) origin=$($request.Headers['Origin']) login=$login remote=$($request.RemoteEndPoint.Address)"
      Write-AppGalleryAudit $login 'request' 'denied'
      Write-Json $context.Response 403 @{ error = 'Forbidden' }; continue
    }
    if ($request.HttpMethod -eq 'GET' -and $request.Url.AbsolutePath -eq '/api/v1/templates') {
      Write-AppGalleryAudit $login 'templates.read' 'success'
      Write-Json $context.Response 200 @{ templates = @(Get-AppGalleryTemplates) }; continue
    }
    if ($request.HttpMethod -eq 'GET' -and $request.Url.AbsolutePath -eq '/api/v1/app-requests') {
      Write-AppGalleryAudit $login 'app_requests.read' 'success'
      Write-Json $context.Response 200 @{ requests = @(Get-AppGalleryRequests | ForEach-Object { ConvertTo-AppGalleryResponse $_ }) }; continue
    }
    if ($request.HttpMethod -eq 'POST' -and $request.Url.AbsolutePath -eq '/api/v1/apps') {
      Write-AppGalleryAudit $login 'app.create' 'attempt'
      Write-Json $context.Response 201 (New-AppGalleryApp (Read-RequestJson $request) $login ([string]$request.Headers['Idempotency-Key'])); continue
    }
    # This deployment intentionally does not expose the legacy workspace or
    # preview routes. App Gallery has no Podman dependency or browser-triggered
    # container operation surface.
    Write-Json $context.Response 404 @{ error = 'Not found' }
  } catch {
    $status = 500
    if ($_.Exception.Data.Contains('httpStatus')) { $status = [int]$_.Exception.Data['httpStatus'] }
    Write-Json $context.Response $status @{ error = $_.Exception.Message }
  }
}
