# Batch 02 - Database schema and seed data

**Who commits this batch:** [YOUR NAME] (you)

**Files in this batch:** 2

## What this batch contains

- `api/schema.sql`
- `api/seed.sql`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "02-database-schema\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "feat(db): add the A3 schema and seed data for event registration" -m "Adds the categories table, adds latitude and longitude to events so the weather API can forecast the event location, and introduces the registrations table.  One user may register for an event only once, enforced by the unique key on (event_id, email). Event datetimes are stored as Australia/Sydney wall-clock times, built from CURDATE() with an explicit hour so the time of day does not depend on the database server timezone."

# 4. push
git push
```

## Commit message to use

```text
feat(db): add the A3 schema and seed data for event registration
Adds the categories table, adds latitude and longitude to events so the
weather API can forecast the event location, and introduces the
registrations table.

One user may register for an event only once, enforced by the unique key on
(event_id, email). Event datetimes are stored as Australia/Sydney wall-clock
times, built from CURDATE() with an explicit hour so the time of day does not
depend on the database server timezone.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
