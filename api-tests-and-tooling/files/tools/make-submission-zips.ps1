<#
.SYNOPSIS
    Builds the three submission zip files required by the PROG2002 A3 brief.

.DESCRIPTION
    Produces, in the project's dist-submission folder:
        <username>A3-clientside.zip   the client Angular website
        <username>A3-adminside.zip    the admin Angular website
        <username>A3-api.zip          the REST API, the SQL files and the tests

    node_modules, .angular caches, build output and any real .env file are excluded,
    because the marker installs dependencies from package.json and must not receive
    database credentials. Each zip gets its own README in the staging copy, so the
    project folders in the repository are never modified.

.EXAMPLE
    .\tools\make-submission-zips.ps1 -Username abc123
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Username,

    [string]$OutputDirectory = 'dist-submission'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root $OutputDirectory
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Directories that must never appear inside a submission zip.
$excludeDirs = @('node_modules', '.angular', '.git', '.vscode', '.npm-cache',
                 'dist', 'coverage', '.cache', 'dist-submission', 'tools')
# Files that must never appear inside a submission zip.
$excludeFiles = @('.env', '*.log', '*.tsbuildinfo')

function New-ZipFromFolder {
    <#
        Copies a project folder into a staging area (honouring the exclusion lists),
        drops a README.md into it, then zips it. The source folder is only ever read.
    #>
    param(
        [string]$SourceFolder,
        [string]$DestinationZip,
        [string]$EntryPrefix,
        [string]$ReadmeContent
    )

    $staging = Join-Path ([System.IO.Path]::GetTempPath()) ('zipstage-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $staging | Out-Null

    try {
        $target = Join-Path $staging $EntryPrefix
        New-Item -ItemType Directory -Force -Path $target | Out-Null

        $items = Get-ChildItem -LiteralPath $SourceFolder -Recurse -Force -ErrorAction SilentlyContinue | Where-Object {
            $relative = $_.FullName.Substring($SourceFolder.Length).TrimStart('\', '/')
            $parts = $relative -split '[\\/]'

            # Skip anything inside an excluded directory.
            if ($parts | Where-Object { $excludeDirs -contains $_ }) { return $false }

            # Skip excluded file names.
            if (-not $_.PSIsContainer) {
                foreach ($pattern in $excludeFiles) {
                    if ($_.Name -like $pattern) { return $false }
                }
            }
            return $true
        }

        foreach ($item in $items) {
            $relative = $item.FullName.Substring($SourceFolder.Length).TrimStart('\', '/')
            $destination = Join-Path $target $relative

            if ($item.PSIsContainer) {
                New-Item -ItemType Directory -Force -Path $destination | Out-Null
            }
            else {
                $parent = Split-Path -Parent $destination
                if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
                Copy-Item -LiteralPath $item.FullName -Destination $destination -Force
            }
        }

        if ($ReadmeContent) {
            Set-Content -LiteralPath (Join-Path $target 'README.md') -Value $ReadmeContent -Encoding UTF8
        }

        if (Test-Path $DestinationZip) { Remove-Item $DestinationZip -Force }
        Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $DestinationZip -CompressionLevel Optimal

        $sizeKb = [math]::Round((Get-Item $DestinationZip).Length / 1KB, 0)
        $count = (Get-ChildItem $target -Recurse -File | Measure-Object).Count
        Write-Output ("  {0}  ({1} KB, {2} files)" -f (Split-Path -Leaf $DestinationZip), $sizeKb, $count)
    }
    finally {
        Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
    }
}

Write-Output "Building submission zips for username '$Username'"
Write-Output "Output folder: $outDir"
Write-Output ''

# ---------------------------------------------------------------------------
# 1. Client-side website
# ---------------------------------------------------------------------------
$clientSrc = Join-Path $root 'angular\client'
if (-not (Test-Path $clientSrc)) { throw "Client app not found at $clientSrc" }

New-ZipFromFolder -SourceFolder $clientSrc `
    -DestinationZip (Join-Path $outDir "${Username}A3-clientside.zip") `
    -EntryPrefix "${Username}A3-clientside" `
    -ReadmeContent @"
# Charity Events - client-side website (Angular)

PROG2002 Web Development II, Assessment 3.

The public-facing website: home, search, event details (including the list of
registrations, newest first), the event registration page, and an about page that
documents which API endpoints each page uses.

## Run it

The website calls the REST API, so start the API first (see the api zip).

    npm install
    npm start          # http://localhost:4200, proxies /api to http://localhost:3000

Build for production:

    npm run build      # output in dist/client/browser

On SCU cPanel the contents of dist/client/browser are served by the Node/Express
API from api/public/client, so no configuration change is needed.
"@

# ---------------------------------------------------------------------------
# 2. Admin-side website
# ---------------------------------------------------------------------------
$adminSrc = Join-Path $root 'angular\admin'
if (-not (Test-Path $adminSrc)) { throw "Admin app not found at $adminSrc" }

New-ZipFromFolder -SourceFolder $adminSrc `
    -DestinationZip (Join-Path $outDir "${Username}A3-adminside.zip") `
    -EntryPrefix "${Username}A3-adminside" `
    -ReadmeContent @"
# Charity Events - admin-side website (Angular)

PROG2002 Web Development II, Assessment 3.

The staff interface for managing charity events: a dashboard, a list of all events
(Active, Past and Suspended), forms to create and update events, and delete with
clear feedback when an event cannot be removed because it has registrations.

## Run it

    npm install
    npm start          # http://localhost:4201, proxies /api to http://localhost:3000

Build for production:

    npm run build      # output in dist/admin/browser

On SCU cPanel the contents of dist/admin/browser are copied to api/public/admin and
served at /admin by the Node/Express API.
"@

# ---------------------------------------------------------------------------
# 3. API, database and tests
# ---------------------------------------------------------------------------
$apiSrc = Join-Path $root 'api'
if (-not (Test-Path $apiSrc)) { throw "API not found at $apiSrc" }

New-ZipFromFolder -SourceFolder $apiSrc `
    -DestinationZip (Join-Path $outDir "${Username}A3-api.zip") `
    -EntryPrefix "${Username}A3-api" `
    -ReadmeContent @"
# Charity Events API (Node.js + Express + MySQL)

PROG2002 Web Development II, Assessment 3.

## Contents

    schema.sql        database schema (categories, events, registrations)
    seed.sql          initial data: 5 categories, 8 events, 14 registrations
    server.js         Express application; also serves the Angular builds on cPanel
    db/               MySQL repository plus an in-memory fallback dataset
    lib/              validation, response shaping and the Open-Meteo integration
    routes/           events, categories, registrations and weather endpoints
    tests/            end-to-end API test suite
    public/           the built Angular websites are served from here on cPanel

## Run it

Import the database first:

    mysql -u <user> -p < schema.sql
    mysql -u <user> -p < seed.sql
    # or paste both files into phpMyAdmin -> SQL

Then:

    npm install
    copy .env.example .env      # edit the database settings
    npm start                   # http://localhost:3000

Verify: GET http://localhost:3000/api/health should report "database":"mysql".

## Tests

    node tests/api.test.js

The suite runs against the in-memory dataset, so it needs no database.

Full project documentation (setup, deployment, video script, marking map) is in
the GitHub repository under README.md and docs/.
"@

Write-Output ''
Write-Output 'Done. Submission files:'
Get-ChildItem $outDir -Filter *.zip | Sort-Object Name | ForEach-Object {
    Write-Output ("  {0}  ({1} KB)" -f $_.Name, [math]::Round($_.Length / 1KB, 0))
}
Write-Output ''
Write-Output 'Remember: docs/ and README.md belong in the GitHub repository, and the'
Write-Output 'peer evaluation form is emailed to your tutor separately.'
