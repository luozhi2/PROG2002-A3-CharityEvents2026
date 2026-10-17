# Batch 03 - API foundation: server, data access and helpers

**Who commits this batch:** [YOUR NAME] (you)

**Files in this batch:** 10

## What this batch contains

- `api/package.json`
- `api/package-lock.json`
- `api/server.js`
- `api/db/index.js`
- `api/db/mysql-repository.js`
- `api/db/demo-repository.js`
- `api/db/demo-data.js`
- `api/lib/responses.js`
- `api/lib/validate.js`
- `api/lib/weather.js`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "03-api-foundation\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "feat(api): add the Express server, data access layer and helpers" -m "Adds the Express application, the MySQL data access layer with an in-memory fallback so the site is demonstrable before the database exists, and the shared helpers for validation, response shaping and the Open-Meteo weather proxy.  All SQL is parameterised and sort keys are whitelisted."

# 4. push
git push
```

## Commit message to use

```text
feat(api): add the Express server, data access layer and helpers
Adds the Express application, the MySQL data access layer with an in-memory
fallback so the site is demonstrable before the database exists, and the
shared helpers for validation, response shaping and the Open-Meteo weather
proxy.

All SQL is parameterised and sort keys are whitelisted.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
