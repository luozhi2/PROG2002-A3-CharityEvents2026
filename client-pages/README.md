# Batch 07 - Client website: pages

**Who commits this batch:** [YOUR NAME] (you)

**Files in this batch:** 22

## What this batch contains

- `angular/client/src/app/models/api.models.ts`
- `angular/client/src/app/services/event.service.ts`
- `angular/client/src/app/services/format.service.ts`
- `angular/client/src/app/shared/event-card/event-card.ts`
- `angular/client/src/app/shared/event-card/event-card.html`
- `angular/client/src/app/shared/event-card/event-card.css`
- `angular/client/src/app/pages/home/home.ts`
- `angular/client/src/app/pages/home/home.html`
- `angular/client/src/app/pages/home/home.css`
- `angular/client/src/app/pages/search/search.ts`
- `angular/client/src/app/pages/search/search.html`
- `angular/client/src/app/pages/search/search.css`
- `angular/client/src/app/pages/event-detail/event-detail.ts`
- `angular/client/src/app/pages/event-detail/event-detail.html`
- `angular/client/src/app/pages/event-detail/event-detail.css`
- `angular/client/src/app/pages/registration/registration.ts`
- `angular/client/src/app/pages/registration/registration.html`
- `angular/client/src/app/pages/registration/registration.css`
- `angular/client/src/app/pages/about/about.ts`
- `angular/client/src/app/pages/about/about.html`
- `angular/client/src/app/pages/about/about.css`
- `angular/client/src/app/pages/not-found/not-found.ts`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "07-client-pages\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "feat(client): add the home, search, event details and registration pages" -m "Home page with a hero, category tiles and the next upcoming events. Search page that sends every filter to the API and mirrors them into the URL.  Event details page that renders the event, its registrations newest first and a seven-day Open-Meteo forecast, with the Register button linking to the new registration page.  Registration page that confirms the selected event, validates the form, posts to the API and shows a confirmation with the registration reference."

# 4. push
git push
```

## Commit message to use

```text
feat(client): add the home, search, event details and registration pages
Home page with a hero, category tiles and the next upcoming events. Search
page that sends every filter to the API and mirrors them into the URL.

Event details page that renders the event, its registrations newest first and
a seven-day Open-Meteo forecast, with the Register button linking to the new
registration page.

Registration page that confirms the selected event, validates the form, posts
to the API and shows a confirmation with the registration reference.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
