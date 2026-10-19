# Batch 11 - Automated tests and project tooling

**Who commits this batch:** [YOUR NAME] (you)

**Files in this batch:** 6

## What this batch contains

- `api/tests/timezone.test.js`
- `api/tests/api.test.js`
- `tools/env.ps1`
- `tools/make-submission-zips.ps1`
- `tools/find-dead-code.js`
- `tools/fix_seed_dates.py`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "11-api-tests-and-tooling\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "test(api): add the automated test suites and project tooling" -m "Timezone unit tests covering both daylight-saving transitions and the stability of the admin edit round trip, and an end-to-end API suite that starts a real server and exercises every endpoint over HTTP.  Also adds the build environment helper, the submission packaging script and the dead-code scanner."

# 4. push
git push
```

## Commit message to use

```text
test(api): add the automated test suites and project tooling
Timezone unit tests covering both daylight-saving transitions and the
stability of the admin edit round trip, and an end-to-end API suite that
starts a real server and exercises every endpoint over HTTP.

Also adds the build environment helper, the submission packaging script and
the dead-code scanner.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
