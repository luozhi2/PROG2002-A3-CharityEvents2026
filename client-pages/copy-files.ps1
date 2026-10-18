# Copies this batch into the repository working copy.
# Run it with the repository root as the current directory.
$ErrorActionPreference = "Stop"
# $PSScriptRoot is this batch folder, so the files live directly under it.
$batchRoot = $PSScriptRoot

$files = @(
  'angular/client/src/app/models/api.models.ts'
  'angular/client/src/app/services/event.service.ts'
  'angular/client/src/app/services/format.service.ts'
  'angular/client/src/app/shared/event-card/event-card.ts'
  'angular/client/src/app/shared/event-card/event-card.html'
  'angular/client/src/app/shared/event-card/event-card.css'
  'angular/client/src/app/pages/home/home.ts'
  'angular/client/src/app/pages/home/home.html'
  'angular/client/src/app/pages/home/home.css'
  'angular/client/src/app/pages/search/search.ts'
  'angular/client/src/app/pages/search/search.html'
  'angular/client/src/app/pages/search/search.css'
  'angular/client/src/app/pages/event-detail/event-detail.ts'
  'angular/client/src/app/pages/event-detail/event-detail.html'
  'angular/client/src/app/pages/event-detail/event-detail.css'
  'angular/client/src/app/pages/registration/registration.ts'
  'angular/client/src/app/pages/registration/registration.html'
  'angular/client/src/app/pages/registration/registration.css'
  'angular/client/src/app/pages/about/about.ts'
  'angular/client/src/app/pages/about/about.html'
  'angular/client/src/app/pages/about/about.css'
  'angular/client/src/app/pages/not-found/not-found.ts'
)

foreach ($file in $files) {
    $source = Join-Path (Join-Path $batchRoot "files") $file
    $target = Join-Path (Get-Location) $file
    $targetDir = Split-Path -Parent $target
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
    Copy-Item -LiteralPath $source -Destination $target -Force
    Write-Output "  copied $file"
}

Write-Output ""
Write-Output "Batch 07 copied. Next: git add -A && git commit"
