# Batch 04 - API endpoints

**Who commits this batch:** [YOUR NAME] (you)

**Files in this batch:** 4

## What this batch contains

- `api/routes/events.js`
- `api/routes/categories.js`
- `api/routes/registrations.js`
- `api/routes/weather.js`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "04-api-endpoints\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "feat(api): add the event, category, registration and weather endpoints" -m "Event endpoints: list with search, category, status and sort filters; get by id returning the event together with its registrations newest first; create, update and delete.  Delete upholds data integrity: an event that already has registrations is not removed but answered with 409 and an explanation, and capacity cannot be reduced below the tickets already sold.  Registration repeats every validation rule on the server and refuses to oversell capacity."

# 4. push
git push
```

## Commit message to use

```text
feat(api): add the event, category, registration and weather endpoints
Event endpoints: list with search, category, status and sort filters; get by
id returning the event together with its registrations newest first; create,
update and delete.

Delete upholds data integrity: an event that already has registrations is not
removed but answered with 409 and an explanation, and capacity cannot be
reduced below the tickets already sold.

Registration repeats every validation rule on the server and refuses to
oversell capacity.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
