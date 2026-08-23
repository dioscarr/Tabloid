[CmdletBinding()]
param(
  [string]$SecretPath = "$env:LOCALAPPDATA\Tabloid\preview-oauth-secret.txt",
  [ValidateRange(10, 3600)]
  [int]$IntervalSeconds = 30
)

$ErrorActionPreference = 'Stop'
$syncScript = Join-Path $PSScriptRoot 'sync-previews.ps1'

while ($true) {
  try {
    & $syncScript -SecretPath $SecretPath
  } catch {
    Write-Warning "Preview reconciliation failed: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $IntervalSeconds
}
