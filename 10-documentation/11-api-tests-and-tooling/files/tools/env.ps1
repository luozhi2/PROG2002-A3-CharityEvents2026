# Shared build environment for the PROG2002-A3 workspace.
# Dot-source this before any npm / ng / node command:
#     . .\tools\env.ps1
#
# WHY THIS FILE EXISTS
# Angular 22 requires Node >= 24.15.0. If the machine's own Node is older, put a
# suitable node.exe in tools/node/ and this script puts it first on PATH.
#
# tools/node/node.exe IS NOT COMMITTED (it is ~90 MB). A fresh clone therefore
# falls back to whatever `node` is already on PATH, and warns when that version
# is too old to build the Angular applications. The API itself only needs Node 18+.

$script:Root = Split-Path -Parent $PSScriptRoot
$script:BundledNodeDir = Join-Path $script:Root 'tools\node'
$script:BundledNodeExe = Join-Path $script:BundledNodeDir 'node.exe'

# The oldest Node that can build the Angular applications.
$script:MinimumNode = [version]'24.15.0'

if (Test-Path $script:BundledNodeExe) {
    $env:PATH = "$script:BundledNodeDir;$env:PATH"
    $script:NodeSource = "$script:BundledNodeExe (supplied with this workspace)"
}
else {
    $script:NodeSource = 'the node already on PATH'
}

# Keep npm's cache inside the project folder.
$env:npm_config_cache = Join-Path $script:Root '.npm-cache'
$env:npm_config_update_notifier = 'false'
$env:npm_config_fund = 'false'
$env:npm_config_audit = 'false'
$env:npm_config_yes = 'true'

New-Item -ItemType Directory -Force -Path $env:npm_config_cache | Out-Null

# ---------------------------------------------------------------------------
# Report the environment, and warn (without failing) when the Node version
# cannot build the Angular apps.
# ---------------------------------------------------------------------------
$nodeVersionText = (& node --version) 2>$null
$npmVersionText = (npm --version) 2>$null

Write-Output "[env] node   = $nodeVersionText  (from $script:NodeSource)"
Write-Output "[env] npm    = $npmVersionText"
Write-Output "[env] cache  = $env:npm_config_cache"

try {
    $actual = [version]($nodeVersionText -replace '^v', '')
    if ($actual -lt $script:MinimumNode) {
        Write-Output ''
        Write-Output "[env] WARNING: Node $actual is older than the $script:MinimumNode that Angular 22 requires."
        Write-Output "[env]          The API will run, but 'ng build' and 'ng serve' will refuse to start."
        Write-Output "[env]          Install Node $script:MinimumNode or newer, or place its node.exe in"
        Write-Output "[env]          tools\node\ so this script picks it up automatically."
        Write-Output ''
    }
}
catch {
    Write-Output "[env] WARNING: could not read the Node version from '$nodeVersionText'."
}
