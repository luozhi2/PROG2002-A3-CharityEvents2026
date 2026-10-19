# Batch 09 - Admin website: pages and services

**Who commits this batch:** [PARTNER NAME]

**Files in this batch:** 25

## What this batch contains

- `angular/admin/src/app/models/api.models.ts`
- `angular/admin/src/app/services/event.service.ts`
- `angular/admin/src/app/services/category.service.ts`
- `angular/admin/src/app/services/registration.service.ts`
- `angular/admin/src/app/services/health.service.ts`
- `angular/admin/src/app/shared/api-format.ts`
- `angular/admin/src/app/shared/timezone.ts`
- `angular/admin/src/app/components/event-form/event-form.component.ts`
- `angular/admin/src/app/components/event-form/event-form.component.html`
- `angular/admin/src/app/components/event-form/event-form.component.css`
- `angular/admin/src/app/pages/dashboard/dashboard.page.ts`
- `angular/admin/src/app/pages/dashboard/dashboard.page.html`
- `angular/admin/src/app/pages/dashboard/dashboard.page.css`
- `angular/admin/src/app/pages/events/events.page.ts`
- `angular/admin/src/app/pages/events/events.page.html`
- `angular/admin/src/app/pages/events/events.page.css`
- `angular/admin/src/app/pages/event-new/event-new.page.ts`
- `angular/admin/src/app/pages/event-new/event-new.page.html`
- `angular/admin/src/app/pages/event-new/event-new.page.css`
- `angular/admin/src/app/pages/event-edit/event-edit.page.ts`
- `angular/admin/src/app/pages/event-edit/event-edit.page.html`
- `angular/admin/src/app/pages/event-edit/event-edit.page.css`
- `angular/admin/src/app/pages/categories/categories.page.ts`
- `angular/admin/src/app/pages/categories/categories.page.html`
- `angular/admin/src/app/pages/categories/categories.page.css`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "09-admin-pages\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "feat(admin): add the dashboard, event list, CRUD forms and categories pages" -m "Dashboard summarising events by status, registrations and tickets sold, all derived from the API.  Event list showing every status with server-side filtering and search, and Edit and Delete actions per row that surface the 409 integrity message when an event with registrations cannot be removed.  New and Edit event forms that validate before calling the API, with the Edit form also displaying that event registrations."

# 4. push
git push
```

## Commit message to use

```text
feat(admin): add the dashboard, event list, CRUD forms and categories pages
Dashboard summarising events by status, registrations and tickets sold, all
derived from the API.

Event list showing every status with server-side filtering and search, and
Edit and Delete actions per row that surface the 409 integrity message when
an event with registrations cannot be removed.

New and Edit event forms that validate before calling the API, with the Edit
form also displaying that event registrations.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
