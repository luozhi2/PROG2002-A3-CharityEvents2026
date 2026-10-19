# Copies this batch into the repository working copy.
# Run it with the repository root as the current directory.
$ErrorActionPreference = "Stop"
# $PSScriptRoot is this batch folder, so the files live directly under it.
$batchRoot = $PSScriptRoot

$files = @(
  'angular/admin/src/app/models/api.models.ts'
  'angular/admin/src/app/services/event.service.ts'
  'angular/admin/src/app/services/category.service.ts'
  'angular/admin/src/app/services/registration.service.ts'
  'angular/admin/src/app/services/health.service.ts'
  'angular/admin/src/app/shared/api-format.ts'
  'angular/admin/src/app/shared/timezone.ts'
  'angular/admin/src/app/components/event-form/event-form.component.ts'
  'angular/admin/src/app/components/event-form/event-form.component.html'
  'angular/admin/src/app/components/event-form/event-form.component.css'
  'angular/admin/src/app/pages/dashboard/dashboard.page.ts'
  'angular/admin/src/app/pages/dashboard/dashboard.page.html'
  'angular/admin/src/app/pages/dashboard/dashboard.page.css'
  'angular/admin/src/app/pages/events/events.page.ts'
  'angular/admin/src/app/pages/events/events.page.html'
  'angular/admin/src/app/pages/events/events.page.css'
  'angular/admin/src/app/pages/event-new/event-new.page.ts'
  'angular/admin/src/app/pages/event-new/event-new.page.html'
  'angular/admin/src/app/pages/event-new/event-new.page.css'
  'angular/admin/src/app/pages/event-edit/event-edit.page.ts'
  'angular/admin/src/app/pages/event-edit/event-edit.page.html'
  'angular/admin/src/app/pages/event-edit/event-edit.page.css'
  'angular/admin/src/app/pages/categories/categories.page.ts'
  'angular/admin/src/app/pages/categories/categories.page.html'
  'angular/admin/src/app/pages/categories/categories.page.css'
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
Write-Output "Batch 09 copied. Next: git add -A && git commit"
