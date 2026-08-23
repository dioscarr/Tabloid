[CmdletBinding()]
param(
  [Parameter(Mandatory)] [DateTime]$ExpiresAt
)

$ErrorActionPreference = 'Stop'
$stateDirectory = Join-Path $env:LOCALAPPDATA 'Tabloid'
$tokenPath = Join-Path $stateDirectory 'app-gallery-github-token.json'

if ($ExpiresAt.Kind -eq [DateTimeKind]::Unspecified) { $ExpiresAt = [DateTime]::SpecifyKind($ExpiresAt, [DateTimeKind]::Utc) }
$expiresUtc = $ExpiresAt.ToUniversalTime()
if ($expiresUtc -le [DateTime]::UtcNow.AddMinutes(5) -or $expiresUtc -gt [DateTime]::UtcNow.AddHours(1)) {
  throw 'ExpiresAt must be more than five minutes and no more than one hour from now.'
}

New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
$token = Read-Host 'GitHub App installation token (Contents: write for dioscarr/Tabloid only)' -AsSecureString
$encrypted = $token | ConvertFrom-SecureString
[ordered]@{
  encryptedToken = $encrypted
  expiresAt = $expiresUtc.ToString('o')
  repository = 'dioscarr/Tabloid'
} | ConvertTo-Json | Set-Content -Encoding utf8 $tokenPath
Write-Host "Short-lived GitHub App installation token stored for the current Windows user until $($expiresUtc.ToString('o'))."
