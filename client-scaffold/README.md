# Batch 06 - Client website: configuration and shell

**Who commits this batch:** [YOUR NAME] (you)

**Files in this batch:** 27

## What this batch contains

- `angular/client/.editorconfig`
- `angular/client/.gitignore`
- `angular/client/.prettierrc`
- `angular/client/.vscode/extensions.json`
- `angular/client/.vscode/launch.json`
- `angular/client/.vscode/tasks.json`
- `angular/client/README.md`
- `angular/client/angular.json`
- `angular/client/package.json`
- `angular/client/package-lock.json`
- `angular/client/proxy.conf.json`
- `angular/client/tsconfig.json`
- `angular/client/tsconfig.app.json`
- `angular/client/tsconfig.spec.json`
- `angular/client/src/index.html`
- `angular/client/src/main.ts`
- `angular/client/src/styles.css`
- `angular/client/src/environments/environment.ts`
- `angular/client/src/environments/environment.production.ts`
- `angular/client/src/app/app.ts`
- `angular/client/src/app/app.html`
- `angular/client/src/app/app.css`
- `angular/client/src/app/app.config.ts`
- `angular/client/src/app/app.routes.ts`
- `angular/client/public/favicon.ico`
- `angular/client/public/hero.svg`
- `angular/client/public/event-placeholder.svg`

## How to upload it

Work in your clone of the repository. From the repository root, in PowerShell:

```powershell
# 1. copy this batch's files into your working copy
& "06-client-scaffold\copy-files.ps1"

# 2. check what changed
git status

# 3. commit
git add -A
git commit -m "feat(client): add the Angular client app shell and navigation" -m "Adds the Angular application configuration, routing, the global stylesheet and the header, navigation and footer shell that every page renders inside."

# 4. push
git push
```

## Commit message to use

```text
feat(client): add the Angular client app shell and navigation
Adds the Angular application configuration, routing, the global stylesheet
and the header, navigation and footer shell that every page renders inside.
```

> Do not start the next batch until this one is pushed. The batches are ordered
> so that the project builds in the same sequence it was written.
