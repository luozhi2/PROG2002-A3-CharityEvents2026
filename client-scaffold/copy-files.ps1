# Copies this batch into the repository working copy.
# Run it with the repository root as the current directory.
$ErrorActionPreference = "Stop"
# $PSScriptRoot is this batch folder, so the files live directly under it.
$batchRoot = $PSScriptRoot

$files = @(
  'angular/client/.editorconfig'
  'angular/client/.gitignore'
  'angular/client/.prettierrc'
  'angular/client/.vscode/extensions.json'
  'angular/client/.vscode/launch.json'
  'angular/client/.vscode/tasks.json'
  'angular/client/README.md'
  'angular/client/angular.json'
  'angular/client/package.json'
  'angular/client/package-lock.json'
  'angular/client/proxy.conf.json'
  'angular/client/tsconfig.json'
  'angular/client/tsconfig.app.json'
  'angular/client/tsconfig.spec.json'
  'angular/client/src/index.html'
  'angular/client/src/main.ts'
  'angular/client/src/styles.css'
  'angular/client/src/environments/environment.ts'
  'angular/client/src/environments/environment.production.ts'
  'angular/client/src/app/app.ts'
  'angular/client/src/app/app.html'
  'angular/client/src/app/app.css'
  'angular/client/src/app/app.config.ts'
  'angular/client/src/app/app.routes.ts'
  'angular/client/public/favicon.ico'
  'angular/client/public/hero.svg'
  'angular/client/public/event-placeholder.svg'
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
Write-Output "Batch 06 copied. Next: git add -A && git commit"
