[CmdletBinding()]
param(
  [string]$SecretPath = "$env:LOCALAPPDATA\Tabloid\preview-oauth-secret.txt"
)

$ErrorActionPreference = 'Stop'
$stateDirectory = Split-Path -Parent $SecretPath
$syncScript = Join-Path $PSScriptRoot 'sync-previews.ps1'

New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
$secret = Read-Host 'Paste the Tailscale OAuth client secret' -AsSecureString
$secret | ConvertFrom-SecureString | Set-Content -Encoding ascii $SecretPath

$taskName = 'Tabloid Branch Preview Deployer'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$syncScript`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Stored the OAuth secret with Windows DPAPI at $SecretPath"
Write-Host "Registered '$taskName' to reconcile previews every five minutes while this user is logged in."
& $syncScript -SecretPath $SecretPath

