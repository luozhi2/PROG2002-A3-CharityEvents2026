# Batch 08 - Admin website: configuration and shell

**Who commits this batch:** [PARTNER NAME]

**Files in this batch:** 25

## What this batch contains

- `angular/admin/.editorconfig`
- `angular/admin/.gitignore`
- `angular/admin/.prettierrc`
- `angular/admin/.vscode/extensions.json`
- `angular/admin/.vscode/launch.json`
- `angular/admin/.vscode/tasks.json`
- `angular/admin/README.md`
- `angular/admin/angular.json`
- `angular/admin/package.json`
- `angular/admin/package-lock.json`
- `angular/admin/proxy.conf.json`
- `angular/admin/tsconfig.json`
- `angular/admin/tsconfig.app.json`
- `angular/admin/tsconfig.spec.json`
- `angular/admin/src/index.html`
- `angular/admin/src/main.ts`
- `angular/admin/src/styles.css`
- `angular/admin/src/environments/environment.ts`
- `angular/admin/src/environments/environment.production.ts`
- `angular/admin/src/app/app.ts`
- `angular/admin/src/app/app.html`
- `angular/admin/src/app/app.css`
- `angular/admin/src/app/app.config.ts`
- `angular/admin/src/app/app.routes.ts`
- `angular/admin/public/favicon.ico`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "08-admin-scaffold\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "feat(admin): add the Angular admin app shell and sidebar navigation" -m "Adds the admin application configuration, routing, stylesheet and the sidebar navigation that is present on every admin page: Dashboard, Events, New Event and Categories."

# 4. push
git push
```

## Commit message to use

```text
feat(admin): add the Angular admin app shell and sidebar navigation
Adds the admin application configuration, routing, stylesheet and the
sidebar navigation that is present on every admin page: Dashboard, Events,
New Event and Categories.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
