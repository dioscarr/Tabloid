[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$galleryWorker = Join-Path (Split-Path -Parent $PSScriptRoot) 'work\app-gallery-direct\scripts\admin-branch-worker.ps1'
$worker = if (Test-Path $galleryWorker) { $galleryWorker } else { Join-Path $PSScriptRoot 'admin-branch-worker.ps1' }
$log = Join-Path $env:LOCALAPPDATA 'Tabloid\admin-worker-supervisor.log'

while ($true) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $worker
  $exitCode = $LASTEXITCODE
  Add-Content -Path $log -Value "$([DateTime]::UtcNow.ToString('o')) worker exited code=$exitCode; restarting"
  Start-Sleep -Seconds 2
}
