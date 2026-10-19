# Copies this batch into the repository working copy.
# Run it with the repository root as the current directory.
$ErrorActionPreference = "Stop"
# $PSScriptRoot is this batch folder, so the files live directly under it.
$batchRoot = $PSScriptRoot

$files = @(
  'api/tests/timezone.test.js'
  'api/tests/api.test.js'
  'tools/env.ps1'
  'tools/make-submission-zips.ps1'
  'tools/find-dead-code.js'
  'tools/fix_seed_dates.py'
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
Write-Output "Batch 11 copied. Next: git add -A && git commit"
