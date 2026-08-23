[CmdletBinding()]
param(
  [string]$SecretPath = "$env:LOCALAPPDATA\Tabloid\preview-oauth-secret.txt"
)

$ErrorActionPreference = 'Stop'
$stateDirectory = Split-Path -Parent $SecretPath
$runner = Join-Path $PSScriptRoot 'run-preview-deployer.ps1'

New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
$secret = Read-Host 'Paste the Tailscale OAuth client secret' -AsSecureString
$secret | ConvertFrom-SecureString | Set-Content -Encoding ascii -NoNewline $SecretPath

$taskName = 'Tabloid Branch Preview Deployer'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`" -SecretPath `"$SecretPath`" -IntervalSeconds 30"
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 30)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Stored the OAuth secret with Windows DPAPI at $SecretPath"
Write-Host "Registered '$taskName' to reconcile previews every 30 seconds while this user is logged in."
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName $taskName
