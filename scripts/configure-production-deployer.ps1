[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$RepositoryPath,
  [Parameter(Mandatory)]
  [string]$EnvironmentFile,
  [ValidateRange(1, 60)]
  [int]$IntervalMinutes = 5
)

$ErrorActionPreference = 'Stop'
$reconciler = Join-Path $RepositoryPath 'scripts\reconcile-production.ps1'

if (-not (Test-Path -LiteralPath $reconciler -PathType Leaf)) {
  throw "Could not find '$reconciler'."
}

if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf)) {
  throw "The host-only environment file '$EnvironmentFile' does not exist."
}

$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$reconciler`" -EnvironmentFile `"$EnvironmentFile`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName 'Tabloid Main Production Deployer' -Action $action -Trigger $trigger -Settings $settings -Description 'Reconciles the Tabloid main image, private PostgreSQL database, and Tailscale sidecar.' -Force | Out-Null
Start-ScheduledTask -TaskName 'Tabloid Main Production Deployer'

Write-Host "Registered Tabloid Main Production Deployer to reconcile every $IntervalMinutes minutes."
