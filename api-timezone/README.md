# Batch 05 - Sydney timezone handling

**Who commits this batch:** [YOUR NAME] (you)

**Files in this batch:** 1

## What this batch contains

- `api/lib/timezone.js`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "05-api-timezone\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "feat(api): resolve all event datetimes in Australia/Sydney time" -m "Adds the single place where timezone offsets are resolved, with the daylight-saving offset derived per date.  The convention is documented in docs/BUILD-CONTRACT.md: MySQL stores Sydney wall-clock times, the API returns true UTC instants plus the Sydney calendar day, and the Angular apps render in Sydney time."

# 4. push
git push
```

## Commit message to use

```text
feat(api): resolve all event datetimes in Australia/Sydney time
Adds the single place where timezone offsets are resolved, with the
daylight-saving offset derived per date.

The convention is documented in docs/BUILD-CONTRACT.md: MySQL stores Sydney
wall-clock times, the API returns true UTC instants plus the Sydney calendar
day, and the Angular apps render in Sydney time.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
