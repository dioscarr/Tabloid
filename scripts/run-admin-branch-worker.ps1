[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$worker = Join-Path $PSScriptRoot 'admin-branch-worker.ps1'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $worker
