[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string]$AdminLogin,
  [string]$AdminOrigin = 'https://tabloid-admin-8c6976.tail70b7f1.ts.net',
  [string]$GalleryOrigin = 'https://tabloid-app-gallery-0f8e89.tail70b7f1.ts.net',
  [int]$Port = 8790,
  [int]$HttpsPort = 9443
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot 'run-admin-branch-worker.ps1'
$stateDirectory = Join-Path $env:LOCALAPPDATA 'Tabloid'
$configPath = Join-Path $stateDirectory 'admin-worker.json'
New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
[ordered]@{ adminLogin = $AdminLogin.ToLowerInvariant(); adminOrigin = $AdminOrigin; allowedOrigins = @($AdminOrigin, $GalleryOrigin); port = $Port } | ConvertTo-Json | Set-Content -Encoding utf8 $configPath

$taskName = 'Tabloid Admin Branch Worker'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 30)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Private branch workspace and preview lifecycle worker for Tabloid Admin.' -Force | Out-Null
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'powershell.exe' -and $_.CommandLine -like '*scripts\admin-branch-worker.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-ScheduledTask -TaskName $taskName

$tailscale = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
if (-not (Test-Path $tailscale)) { throw "Tailscale CLI was not found at $tailscale" }
& $tailscale serve --bg --https=$HttpsPort "http://127.0.0.1:$Port"
Write-Host "Admin worker configured for $AdminLogin at https://dio.tail70b7f1.ts.net:$HttpsPort/"
