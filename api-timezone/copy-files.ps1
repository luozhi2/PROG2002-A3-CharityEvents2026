# Copies this batch into the repository working copy.
# Run it with the repository root as the current directory.
$ErrorActionPreference = "Stop"
# $PSScriptRoot is this batch folder, so the files live directly under it.
$batchRoot = $PSScriptRoot

$files = @(
  'api/lib/timezone.js'
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
Write-Output "Batch 05 copied. Next: git add -A && git commit"
