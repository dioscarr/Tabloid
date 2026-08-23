$worker = Get-Content -Raw (Join-Path $PSScriptRoot '..\scripts\admin-branch-worker.ps1')
$registry = Get-Content -Raw (Join-Path $PSScriptRoot '..\templates\app-gallery.json') | ConvertFrom-Json

Describe 'App Gallery worker contract' {
  It 'has a non-empty, allowlisted template registry' {
    $registry.templates.Count | Should BeGreaterThan 0
    @($registry.templates.sourceBranch | Select-Object -Unique | Where-Object { $_ -notin @('main', 'admin', 'app-gallery', 'big-news', 'tech') }).Count | Should Be 0
    @($registry.templates.contractPath | Select-Object -Unique | Where-Object { $_ -ne 'public/app.contract.json' }).Count | Should Be 0
  }

  It 'requires exact-origin Tailscale authorization and idempotency' {
    $worker | Should Match "Tailscale-User-Login"
    $worker | Should Match "Idempotency-Key"
    $worker | Should Match "Access-Control-Allow-Origin"
    $worker | Should Match "app-gallery-github-token.json"
  }

  It 'uses Git Data APIs and does not use Podman for app creation' {
    $createFunction = [regex]::Match($worker, '(?s)function New-AppGalleryApp.*?(?=\r?\nfunction Invoke-Podman)').Value
    $worker | Should Match "/git/blobs"
    $worker | Should Match "/git/trees"
    $worker | Should Match "/git/refs"
    $createFunction | Should Not Match 'Invoke-Podman'
  }
}
