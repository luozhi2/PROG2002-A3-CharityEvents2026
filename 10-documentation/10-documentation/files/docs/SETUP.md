# SETUP.md — local development environment

How to get the SCU Charity Events project (PROG2002 Assessment 3) running on a
Windows machine, from a clean checkout to both websites loading live API data.

Commands are written for **Windows PowerShell**. Replace `[YOUR NAME]` style
placeholders where they appear. If a step fails, jump to
[§9 Troubleshooting](#9-troubleshooting).

---

## 1. Prerequisites

| Requirement | Why it is needed | How to check |
| --- | --- | --- |
| **Node.js 18 or newer** | Runs the Express API (`api/package.json` declares `"engines": { "node": ">=18" }`) | `node --version` |
| **Node.js 24.15.0 or newer** | Angular 22 refuses to build or serve on older Node versions | `node --version` |
| **MySQL 8.x or MariaDB 10.x** | The database. MySQL 8 is the development target; MariaDB 10.x is what SCU cPanel runs, so either works. | `mysql --version` |
| A MySQL client — **phpMyAdmin** (bundled with XAMPP/WAMP/MAMP) or the **mysql CLI** | To create the database and import the two SQL files | open <http://localhost/phpmyadmin> |
| **A code editor** | VS Code is recommended; the `.vscode` folders in the project already hold launch and task configuration | — |
| A modern browser | Chrome or Edge, for the sites and the DevTools Network tab | — |

### About the Node version

The API and the Angular apps have different requirements, so this workspace ships its
own Node:

* `tools/node/node.exe` is **Node 24.21.0**, new enough for Angular 22.
* `tools/env.ps1` puts that folder first on `PATH` for the current PowerShell session
  and also points npm's cache at `.npm-cache` inside the workspace.

**Dot-source it before any `npm`, `ng` or `node` command** (note the leading `. `):

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3
. .\tools\env.ps1
```

Expected output:

```text
[env] node   = v24.21.0  (C:\Users\11757\Desktop\liangyuez\PROG2002-A3\tools\node\node.exe)
[env] npm    = <version>
[env] cache  = C:\Users\11757\Desktop\liangyuez\PROG2002-A3\.npm-cache
```

Dot-sourcing only affects the current window — repeat it every time you open a new
terminal. If you have Node 24.15+ installed globally you can skip `env.ps1`, but the
API is happy on any Node 18+.

---

## 2. Create the database

The project expects a database named **`charity_events`** by default (change it with
`DB_NAME` in `.env` if you prefer another name).

### With phpMyAdmin

1. Start your MySQL server (XAMPP/WAMP control panel, or `net start mysql`).
2. Open <http://localhost/phpmyadmin>.
3. Click **New** in the left sidebar.
4. Database name: `charity_events`.
5. Collation: `utf8mb4_unicode_ci` (matches `api/schema.sql`).
6. Click **Create**.

### With the mysql CLI

```powershell
mysql -u root -p -e "CREATE DATABASE charity_events CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

If your `root` account has no password, drop the `-p`:

```powershell
mysql -u root -e "CREATE DATABASE charity_events CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

> Using a non-root account? Create the database *and* the user first, then grant
> privileges — see [§9](#9-troubleshooting) for `ER_ACCESS_DENIED_ERROR`.

---

## 3. Import the two SQL files

`schema.sql` must be imported **before** `seed.sql`: the first file creates the
tables, the second inserts the sample rows.

`api/schema.sql` begins by dropping `registrations`, `events` and `categories`, so it
can be re-imported safely — but re-importing it **deletes anything you have added**
through the admin website.

### Option A — phpMyAdmin

1. In phpMyAdmin, select `charity_events` in the left sidebar.
2. Open the **Import** tab.
3. **Choose File** → `PROG2002-A3\api\schema.sql`.
4. Leave the format as SQL and the character set as `utf-8`, then click **Import**.
5. Wait for the green "Import has been successfully finished" message.
6. Repeat steps 2–5 for `PROG2002-A3\api\seed.sql`.

### Option B — mysql CLI

Run from the `api` directory so the relative file names resolve:

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3\api
mysql -u root -p charity_events < schema.sql
mysql -u root -p charity_events < seed.sql
```

Or from anywhere, with absolute paths (PowerShell's `<` redirection is not supported
by `mysql.exe` when the client is not on the path, so piping is the reliable form):

```powershell
Get-Content C:\Users\11757\Desktop\liangyuez\PROG2002-A3\api\schema.sql | mysql -u root -p charity_events
Get-Content C:\Users\11757\Desktop\liangyuez\PROG2002-A3\api\seed.sql   | mysql -u root -p charity_events
```

### Verify the import

```powershell
mysql -u root -p charity_events -e "SELECT COUNT(*) AS categories FROM categories; SELECT COUNT(*) AS events FROM events; SELECT COUNT(*) AS registrations FROM registrations;"
```

Expected:

```text
+------------+
| categories |
+------------+
|          5 |
+------------+
+--------+
| events |
+--------+
|      8 |
+--------+
+---------------+
| registrations |
+---------------+
|            14 |
+---------------+
```

The brief requires a **minimum of 10 registrations**; the seed file provides 14.

---

## 4. Configure `api/.env`

The API reads its settings from `api/.env`, which is **not** committed to Git. Create
it from the template:

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3\api
Copy-Item .env.example .env
```

Then open `api/.env` in your editor. A working local configuration looks like this:

```ini
# Web server
PORT=3000

# MySQL connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=charity_events

# Set to "true" to skip MySQL entirely and serve the demo dataset
USE_DEMO_DATA=false
```

### Every variable, explained

| Variable | Default if unset | What it does | Notes |
| --- | --- | --- | --- |
| `PORT` | `3000` | The TCP port the Express API listens on | Must match the `target` in both `proxy.conf.json` files (`http://localhost:3000`). On SCU cPanel the host normally supplies the port, so leave the cPanel value alone there. |
| `DB_HOST` | `localhost` | MySQL server hostname | `localhost` for a local server. On cPanel it is also `localhost` as seen from the hosting account. |
| `DB_PORT` | `3306` | MySQL port | `3306` unless your server was configured otherwise. |
| `DB_USER` | `root` | MySQL user used by the API | Locally `root` is usually fine. **On cPanel this must be the full prefixed name**, e.g. `student01_charityuser`. |
| `DB_PASSWORD` | empty | Password for `DB_USER` | Blank is only safe for a local `root` with no password. On cPanel use the password you set when creating the user. |
| `DB_NAME` | `charity_events` | The database schema the API queries | On cPanel this must include the account prefix, e.g. `student01_charity`. |
| `USE_DEMO_DATA` | `false` | Set to **`true`** to skip MySQL completely and serve the in-memory dataset in `api/db/demo-data.js` | The comparison is case-sensitive for `true` only: write exactly `true` in lower case. The same setting is used by the automated test suite. |

> **Important:** `.env` must stay out of Git. If your `.gitignore` does not already
> list it, add `.env` — the cPanel credentials in it are secret.

### What "demo mode" means

With `USE_DEMO_DATA=true`, **or** when MySQL is unreachable, the API automatically
falls back to the in-memory dataset in `api/db/demo-data.js` (which mirrors
`api/seed.sql`) and `/api/health` reports:

```json
{ "status": "ok", "database": "demo", "detail": "USE_DEMO_DATA=true in .env", ... }
```

With a working MySQL connection it reports `"database": "mysql"`. If you see `demo`
when you expected `mysql`, the `detail` field tells you why — see
[§9](#9-troubleshooting).

---

## 5. Install and start the API

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3
. .\tools\env.ps1
cd api
npm install
npm start
```

`npm start` runs `node server.js`. Expected console output:

```text
[db] mode=mysql (connected to root@localhost:3306/charity_events)
[api] Charity Events API listening on http://localhost:3000
[api] client build served: no  admin build served: no
```

Useful variants:

```powershell
npm run dev     # node --watch server.js  - restarts automatically when you save a file
npm test        # node tests/api.test.js  - the 67-assertion end-to-end suite
```

Every API request is logged to the console as one line
(`GET /api/events?search=Byron -> 200 (4 ms)`), which makes the "data flow" section of
the demo video easy to narrate.

Leave this terminal running. Stop the server with `Ctrl+C`.

---

## 6. Start the client website (port 4200)

Open a **second** PowerShell window:

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3
. .\tools\env.ps1
cd angular\client
npm install
npm start
```

`npm start` runs `ng serve`, which reads the `serve` options in
`angular/client/angular.json`:

* `"port": 4200`
* `"proxyConfig": "proxy.conf.json"` → forwards every `/api` request to
  `http://localhost:3000`

Browse to <http://localhost:4200>.

## 7. Start the admin website (port 4201)

Open a **third** PowerShell window:

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3
. .\tools\env.ps1
cd angular\admin
npm install
npm start
```

`angular/admin/angular.json` sets `"port": 4201` and the same `/api` proxy. Browse to
<http://localhost:4201>.

> Because both apps resolve the API from `src/environments/environment.ts`
> (`apiBase: '/api'`) and the dev server proxies that path, the API can run on any
> port as long as `proxy.conf.json` and `PORT` agree. The admin app expects a
> `proxy.conf.json` next to its `angular.json`; if `ng serve` reports that the file is
> missing, that file has not been added to the admin app yet.

---

## 8. Verify everything works

| Check | How | Expected |
| --- | --- | --- |
| API is alive | <http://localhost:3000/api/health> in a browser | `"status": "ok"` and `"database": "mysql"` |
| MySQL is really being used | the `detail` field of `/api/health` | `connected to root@localhost:3306/charity_events` |
| Events are served | <http://localhost:3000/api/events> | `"count": 8` and an `events` array |
| Search works | <http://localhost:3000/api/events?search=Byron> | `"count": 1` (Winter Warmth Community Appeal) |
| Filtering works | <http://localhost:3000/api/events?category_id=2&status=Active> | only Active Environment events |
| Registrations exist | <http://localhost:3000/api/registrations> | `"count": 14`, each row with an `event_name` |
| Weather proxy works | <http://localhost:3000/api/weather/event/1> | a `daily` array of 7 forecast days |
| Client site loads | <http://localhost:4200> | hero, category tiles, upcoming Active events |
| Search page filters | type in the search box on <http://localhost:4200> | results change and a result count is shown; the API terminal logs the request |
| Registration flow works | open an event → **Register** → complete the form | confirmation message with a reference number |
| Admin site loads | <http://localhost:4201> | sidebar with Dashboard / Events / New Event / Categories, and an "API online · MySQL" badge |
| Admin C.R.U.D. works | create, edit and delete an event in the admin site | success banners; deleting an event that has registrations shows the 409 message inline |
| Test suite passes | `cd api; node tests/api.test.js` | `Results: 67 passed, 0 failed` |

---

## 9. Troubleshooting

| Symptom | What it means | Fix |
| --- | --- | --- |
| **`ECONNREFUSED`** — `connect ECONNREFUSED 127.0.0.1:3306`, or the API console logs `MySQL unavailable (ECONNREFUSED)` | Nothing is listening on the MySQL port, so MySQL is not running (or is on another port). The API silently falls back to demo mode, which is why `/api/health` says `demo`. | Start the MySQL service: XAMPP/WAMP control panel → **Start** MySQL, or `net start mysql` in an elevated PowerShell. Confirm the port with `Test-NetConnection localhost -Port 3306`. |
| **`ECONNREFUSED`** from a website — "Cannot reach the Charity Events API" | The Angular dev server is running but the API is not, or it is on a different port. | Start the API (`cd api; npm start`) and check the port matches the `target` in `angular/client/proxy.conf.json` and `angular/admin/proxy.conf.json`. |
| **`ER_ACCESS_DENIED_ERROR`** — `Access denied for user 'root'@'localhost' (using password: YES/NO)` | Wrong `DB_USER` or `DB_PASSWORD` in `api/.env`. | Fix the two variables. `(using password: NO)` means `DB_PASSWORD` is empty but the account has a password; `(using password: YES)` means the password is wrong. Quote values that contain `#`, spaces or special characters, e.g. `DB_PASSWORD="p@ss word"`. Check what the server expects with `mysql -u root -p`. |
| **`ER_BAD_DB_ERROR`** — `Unknown database 'charity_events'` | The database has not been created, or `DB_NAME` names something that does not exist. | Run the `CREATE DATABASE charity_events ...` statement from [§2](#2-create-the-database), or correct `DB_NAME`. List what exists with `mysql -u root -p -e "SHOW DATABASES;"`. |
| **"Unknown database"** in phpMyAdmin after import | The import was run against a different database (for example `information_schema`), so the tables do not appear where the API looks. | Click the `charity_events` database in the left sidebar **first**, then use its **Import** tab. Re-check with `mysql -u root -p charity_events -e "SHOW TABLES;"` — you should see `categories`, `events`, `registrations`. |
| **CORS error in the browser console** — "has been blocked by CORS policy" during local development | The site is calling the API on an absolute URL on a different origin instead of the proxied relative `/api` path, or `cors()` middleware was removed from `api/server.js`. | Keep `apiBase: '/api'` in `src/environments/environment.ts` so the dev-server proxy handles it. `api/server.js` already enables `app.use(cors())`; check the request URL in the DevTools **Network** tab — it should be `http://localhost:4200/api/...`, not `:3000`. |
| **Port already in use** — `EADDRINUSE: address already in use :::3000` (or 4200 / 4201) | Another process (often a previous run of the same server) holds the port. | Find and stop it: `Get-NetTCPConnection -LocalPort 3000 \| Select-Object OwningProcess` then `Stop-Process -Id <pid>`. Or change `PORT` in `api/.env` **and** the `target` in both `proxy.conf.json` files together. For Angular, `ng serve --port 4300` works for a one-off. |
| **"The site shows demo data"** — `/api/health` reports `"database": "demo"` | Either `USE_DEMO_DATA=true`, or the API could not reach MySQL at start-up. | Read the `detail` field: `USE_DEMO_DATA=true in .env` means the flag is set — change it to `false`; `MySQL unavailable (...)` means a connection problem — fix MySQL, then **restart the API** (the mode is chosen once, at start-up). |
| **Angular Node version error** — `Node.js version v18.x.x detected. The Angular CLI requires a minimum Node.js version of 24.15.0` (or a `Cannot find module '@angular/build'` style failure right after) | `ng` is running on a Node older than 24.15. | Dot-source `tools/env.ps1` in that terminal and re-run: `. .\tools\env.ps1; node --version` must print `v24.21.0`. Opening a fresh terminal forgets the setting, so do it again. If it still fails, delete `angular/client/node_modules` (or `angular/admin/node_modules`) and run `npm install` again with the correct Node active. |
| **`ng serve` complains that `proxy.conf.json` is missing** | `angular.json` references a proxy file that has not been added yet. | Check whether `angular/client/proxy.conf.json` / `angular/admin/proxy.conf.json` exists. The client one is present and contains a `"/api"` → `http://localhost:3000` rule; the admin one must contain the same rule. Do not remove the `proxyConfig` entry — recreate the file instead. |
| **`npm install` fails behind the SCU network / proxy** | npm cannot reach the registry. | The workspace already points npm's cache at `.npm-cache`; if a proxy is required, set `npm config set proxy http://<proxy>:<port>` and `npm config set https-proxy http://<proxy>:<port>`, then retry. |
| **PowerShell refuses to run a `.ps1` script** — "running scripts is disabled on this system" | Execution policy. | Run once for the current user: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. |
| **`mysql` is not recognised** as a command | The MySQL `bin` folder is not on `PATH` (common with XAMPP). | Use the full path, e.g. `C:\xampp\mysql\bin\mysql.exe -u root -p charity_events < schema.sql`, or import through phpMyAdmin instead. |
