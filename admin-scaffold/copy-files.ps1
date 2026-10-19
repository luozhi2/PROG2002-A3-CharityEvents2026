# Copies this batch into the repository working copy.
# Run it with the repository root as the current directory.
$ErrorActionPreference = "Stop"
# $PSScriptRoot is this batch folder, so the files live directly under it.
$batchRoot = $PSScriptRoot

$files = @(
  'angular/admin/.editorconfig'
  'angular/admin/.gitignore'
  'angular/admin/.prettierrc'
  'angular/admin/.vscode/extensions.json'
  'angular/admin/.vscode/launch.json'
  'angular/admin/.vscode/tasks.json'
  'angular/admin/README.md'
  'angular/admin/angular.json'
  'angular/admin/package.json'
  'angular/admin/package-lock.json'
  'angular/admin/proxy.conf.json'
  'angular/admin/tsconfig.json'
  'angular/admin/tsconfig.app.json'
  'angular/admin/tsconfig.spec.json'
  'angular/admin/src/index.html'
  'angular/admin/src/main.ts'
  'angular/admin/src/styles.css'
  'angular/admin/src/environments/environment.ts'
  'angular/admin/src/environments/environment.production.ts'
  'angular/admin/src/app/app.ts'
  'angular/admin/src/app/app.html'
  'angular/admin/src/app/app.css'
  'angular/admin/src/app/app.config.ts'
  'angular/admin/src/app/app.routes.ts'
  'angular/admin/public/favicon.ico'
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
Write-Output "Batch 08 copied. Next: git add -A && git commit"
