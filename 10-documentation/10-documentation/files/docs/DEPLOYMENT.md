# DEPLOYMENT.md — deploying to SCU cPanel

An ordered checklist for putting both websites and the API on the public internet from
your SCU cPanel account, as required by Part 5 of the assessment brief.

Work through it top to bottom and tick each step. Problems you are likely to hit are
listed in [§9](#9-troubleshooting-what-students-actually-hit).

**What you are deploying**

| URL on your cPanel domain | What is served | Where it lives in the upload |
| --- | --- | --- |
| `https://<your-domain>/` | The client charity website (Angular build) | `api/public/client` |
| `https://<your-domain>/admin` | The admin website (Angular build) | `api/public/admin` |
| `https://<your-domain>/api/...` | The Express REST API | `api/server.js` |

One Node.js application serves all three: `api/server.js` mounts the API under `/api`,
then serves the two static Angular builds. Because everything is on one origin, the
websites call `/api` with no CORS and no absolute URLs.

---

## 0. Before you start

- [ ] Your cPanel login details from your SCU email.
- [ ] The project working locally, with `node tests/api.test.js` reporting
      `67 passed, 0 failed`.
- [ ] The database details you are about to create on cPanel (host, database name,
      user, password).
- [ ] A cPanel Node.js version of **18 or newer** for the API. If the version picker
      offers 18/20/22, choose the newest.

> ### Build locally — do not build on cPanel
>
> The Angular apps in this project are **Angular 22**, which needs **Node >= 24.15.0**
> to build. cPanel's *Setup Node.js App* frequently offers an older Node version, and
> you cannot choose it anyway: `ng build` is far too heavy for a shared hosting
> account.
>
> **Run `npm run build` on your own machine**, then upload only the built output. The
> server never needs the Angular source, `node_modules` or the Angular CLI. The API
> itself only needs Node 18+, so the API runs happily on whatever cPanel provides.
> Documented honestly: this project was built and tested with Node 24.21.0 locally and
> is deployed to the hosting Node version offered by cPanel for the API process.

---

## 1. Log in to cPanel

- [ ] Go to the cPanel URL from your SCU email (usually
      `https://<your-domain>:2083` or a shared `cpanel.scu.edu.au` address) and sign in
      with your SCU cPanel username and password.
- [ ] Note your **cPanel username** (for example `student01`). Every database and
      database user you create will be prefixed with it — `student01_charity`, not
      `charity`. Getting this wrong is the single most common deployment failure.

## 2. Create the MySQL database and user

- [ ] In cPanel, open **MySQL® Databases**.
- [ ] Under **Create New Database**, enter `charity`. cPanel shows the full name as
      `<username>_charity`. Click **Create Database**.
      *Example: `student01_charity`.*
- [ ] Under **MySQL Users → Add New User**, enter a username (`charityuser`) and a
      strong password. cPanel shows the full name as `<username>_charityuser`. Click
      **Create User**. **Write the password down.**
- [ ] Under **Add User To Database**, choose the user and the database you just
      created, click **Add**, tick **ALL PRIVILEGES**, and click **Make Changes**.
- [ ] Record the three values you will need in step 6:

  ```ini
  DB_NAME=student01_charity
  DB_USER=student01_charityuser
  DB_PASSWORD=<the password you just set>
  DB_HOST=localhost
  ```

  (`DB_PORT=3306` is correct unless cPanel tells you otherwise.)

> cPanel **always** prepends `<username>_`. Typing `charity` instead of
> `student01_charity` in `DB_NAME` produces `ER_BAD_DB_ERROR: Unknown database`.

## 3. Import `schema.sql` and `seed.sql` through phpMyAdmin

- [ ] In cPanel, open **phpMyAdmin**.
- [ ] In the left sidebar, click the database you just created
      (`student01_charity`). **Do not skip this** — importing while a different
      database is selected puts the tables in the wrong place.
- [ ] Open the **Import** tab → **Choose File** → `api/schema.sql` → ensure the
      character set is `utf-8` → **Import**. Wait for "Import has been successfully
      finished".
- [ ] Repeat for `api/seed.sql`.
- [ ] Verify: click the database, then the **Structure** tab. You should see
      `categories`, `events` and `registrations`.
- [ ] Verify the data: open the **SQL** tab and run

  ```sql
  SELECT COUNT(*) AS categories FROM categories;
  SELECT COUNT(*) AS events FROM events;
  SELECT COUNT(*) AS registrations FROM registrations;
  ```

  Expected: **5**, **8** and **14**. The brief requires at least 10 registrations.

## 4. Build both Angular apps for production (locally)

In PowerShell on your own machine, from the repository root:

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3
. .\tools\env.ps1
node --version        # must be v24.15.0 or newer
```

### Client website

```powershell
cd angular\client
npm install
node node_modules\@angular\cli\bin\ng.js build
```

`npm run build` runs exactly the same command; use whichever you prefer. The build
writes to `angular/client/dist/client/browser/`, which contains `index.html`, the
hashed JavaScript and CSS files, and `favicon.ico`.

### Admin website

```powershell
cd ..\admin
npm install
node node_modules\@angular\cli\bin\ng.js build
```

The admin build writes to `angular/admin/dist/admin/browser/`.

> **Check the output folder name.** Angular's application builder writes into a
> `browser` sub-folder. If your build produced `dist/client/` with `index.html`
> directly inside it (no `browser` sub-folder), copy that folder's contents instead —
> what matters is that the destination ends up containing `index.html`.

## 5. Copy the builds into the API's `public` folder

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3

# Client  -> api/public/client
New-Item -ItemType Directory -Force -Path api\public\client | Out-Null
Copy-Item -Recurse -Force angular\client\dist\client\browser\* api\public\client\

# Admin   -> api/public/admin
New-Item -ItemType Directory -Force -Path api\public\admin | Out-Null
Copy-Item -Recurse -Force angular\admin\dist\admin\browser\* api\public\admin\
```

Confirm the structure before uploading:

```powershell
Get-ChildItem api\public\client | Select-Object Name
Get-ChildItem api\public\admin  | Select-Object Name
```

Both listings must include `index.html`. `api/server.js` checks for that file at
start-up and logs `client build served: yes  admin build served: yes`; if it is
missing, the API falls back to a plain "Angular websites have not been built" landing
page at `/` and `/admin` returns 404.

> If the admin app's routes fail to load under `/admin`, the built `index.html` may be
> using `<base href="/">`. Serving it from `/admin` then makes the browser request the
> JavaScript bundles from the site root. Fix it by changing the build to
> `ng build --base-href /admin/`, or leave the base href at `/` only if the bundles
> resolve correctly through the API's static handler. Test `/admin` in a browser
> before you finish — a blank page with 404s in the console is this problem.

## 6. Upload the `api` folder

Upload the `api` folder **without `node_modules`** (it is thousands of files and will
be reinstalled on the server).

You can create the zip locally:

```powershell
cd C:\Users\11757\Desktop\liangyuez\PROG2002-A3
Compress-Archive -Path api\* -DestinationPath a3-api-upload.zip -Force
```

…then in cPanel:

- [ ] Open **File Manager**.
- [ ] Navigate to the folder that will hold the application. This is usually your
      account home (`/home/<username>`) or `/home/<username>/api`. Remember the path —
      you need it in step 7.
- [ ] Click **Upload**, choose `a3-api-upload.zip`, and wait for it to finish.
- [ ] Go back to the upload folder, right-click the zip and choose **Extract**.
- [ ] Delete the zip afterwards to save space.
- [ ] Confirm the folder contains `server.js`, `package.json`, `schema.sql`,
      `seed.sql`, `routes/`, `lib/`, `db/`, `tests/` and `public/`.

**Or upload by FTP:** connect with the SFTP/FTP details from cPanel → **FTP Accounts**
using FileZilla, then drag the same files across, skipping `node_modules`.

> Do **not** upload `api/.env` with your local settings. The cPanel application gets
> its configuration from the *Setup Node.js App* screen in step 7. Uploading a stale
> `.env` is a classic cause of the app connecting to the wrong database.

## 7. Create the Node.js application (Setup Node.js App)

- [ ] In cPanel, open **Setup Node.js App** (some accounts call it **Node.js
      Selector**).
- [ ] Click **Create Application**.
- [ ] Fill the form in:

  | Field | Value |
  | --- | --- |
  | Node.js version | The newest offered that is **18 or newer** |
  | Application mode | `Production` |
  | Application root | The folder from step 6 that contains `server.js`, e.g. `api` |
  | Application URL | Your domain, and **leave the path empty** so the API and both websites are reachable from the domain root |
  | Application startup file | `server.js` |

- [ ] Add the environment variables. Use **Add Variable** for each one
      (cPanel stores them here rather than in a `.env` file):

  | Variable | Value |
  | --- | --- |
  | `DB_HOST` | `localhost` |
  | `DB_PORT` | `3306` |
  | `DB_USER` | `student01_charityuser` (your prefixed username) |
  | `DB_PASSWORD` | the password from step 2 |
  | `DB_NAME` | `student01_charity` (your prefixed database name) |
  | `USE_DEMO_DATA` | `false` |
  | `NODE_ENV` | `production` |

  Do **not** set `PORT` unless cPanel asks for one — the host assigns the port to the
  application. `api/server.js` reads `process.env.PORT` and falls back to `3000`.
  Setting `NODE_ENV=production` also trims raw error details out of API error
  responses.

- [ ] Click **Create**.

> Setting `USE_DEMO_DATA` to anything other than exactly `true` (lower case) keeps the
> API on MySQL. If the database is unreachable the API falls back to the demo dataset
> and `/api/health` reports `"database": "demo"` — useful as a safety net, but you must
> fix the cause: the marker expects to see `mysql`.

## 8. Install dependencies and restart the app

- [ ] Still on the *Setup Node.js App* screen, open your application and click
      **Run NPM Install** (or **Run JS script** → `npm install`). Wait for it to
      report success — this reads `api/package.json` and installs `express`, `cors`,
      `dotenv` and `mysql2`.
- [ ] Click **Restart** (some versions label it **Stop** then **Start**) so the new
      environment variables and the fresh `node_modules` are picked up.
- [ ] Confirm the app shows as **started / running**.

> Every time you change an environment variable or upload new files, **restart the
> application**. cPanel does not restart it for you, so the old process keeps serving
> the old files — the "but I uploaded it!" trap.

## 9. Verify the deployment

Open these in a browser, replacing `<your-domain>` with your cPanel domain:

- [ ] **`https://<your-domain>/api/health`**

  ```json
  {
    "status": "ok",
    "database": "mysql",
    "detail": "connected to student01_charityuser@localhost:3306/student01_charity",
    "time": "...",
    "version": "1.0.0"
  }
  ```

  `"database": "mysql"` is the important part. `"demo"` means the API could not reach
  MySQL — go to [§10](#10-troubleshooting).

- [ ] **`https://<your-domain>/api/events`** → `"count": 8` and a list of events.
- [ ] **`https://<your-domain>/api/events?search=Byron`** → `"count": 1`.
- [ ] **`https://<your-domain>/`** → the client website loads with hero imagery, the
      search box and upcoming events. Open DevTools → **Network** and confirm the page
      issues requests to `/api/events` and they return **200**.
- [ ] **`https://<your-domain>/admin`** → the admin site loads with the sidebar and an
      "API online · MySQL" health badge, and the Events list shows all eight events
      (Active, Past and Suspended).
- [ ] **`https://<your-domain>/api/weather/event/1`** → a `daily` forecast array.
- [ ] Run one live change end to end: create an event in the admin site, check it
      appears on the client site, then delete it. Then try to delete **Coastal Clean-Up
      Charity Walk** (which has registrations) and confirm the admin site shows the
      "cannot be deleted" message.

---

## 10. Troubleshooting: what students actually hit

| Symptom | Cause | Fix |
| --- | --- | --- |
| **Wrong database prefix** — `ER_BAD_DB_ERROR: Unknown database 'charity_events'` | `DB_NAME` uses the name you typed in the *Create New Database* box instead of the full prefixed name cPanel created. | In cPanel → *MySQL Databases*, read the exact name (e.g. `student01_charity`) and put that in `DB_NAME`. Do the same for `DB_USER`. Restart the app. |
| Same problem for the user — `ER_ACCESS_DENIED_ERROR ... 'student01_charityuser'@'localhost'` even though the password is right | The user was created but never added to the database, or the privileges were not saved. | *MySQL Databases* → **Add User To Database** → pick both → **ALL PRIVILEGES** → **Make Changes**. Then check the password has no unescaped characters. |
| **503 Service Unavailable** from the Node app (or a generic "Application is not running" page) | The app crashed on start-up, is stopped, or its startup file is wrong. | Open *Setup Node.js App*: confirm the status is **started**, the **Application root** really contains `server.js`, the **startup file** is exactly `server.js`, and the Node version is 18+. Use **Restart**. If it still fails, check the app's stderr log in *Setup Node.js App* → the log icon, or in File Manager under `stderr.log` / `~/.npm/_logs`. A common cause is a missing `npm install`. |
| **503 / 500 with "Cannot find module 'express'"** | `npm install` was never run on the server, or it failed. | *Setup Node.js App* → **Run NPM Install**. Then **Restart**. Confirm `api/node_modules` now exists in File Manager. |
| **Permission errors** — "Forbidden", "403", or the app cannot read `schema.sql` / write a log | Files uploaded by FTP/File Manager have the wrong permissions. | In File Manager select the uploaded folders → **Change Permissions**: directories `755`, files `644`. Do not use `777`. Make sure the extract step actually ran — an unextracted zip leaves you with no readable files. |
| **Missing `public` builds** — `/` shows "The Angular websites have not been built into api/public yet", or `/admin` returns 404 | `api/public/client/index.html` or `api/public/admin/index.html` is absent on the server. | Complete steps 4–5, then re-upload the whole `api/public` folder and **restart the app**. Confirm in File Manager that both folders contain `index.html`. `server.js` decides at start-up whether to mount them, so a restart is mandatory after uploading. |
| **Blank page at `/admin`** with 404s for `/main-*.js` in the console | The admin build's `<base href="/">` makes the browser fetch bundles from the site root instead of `/admin`. | Rebuild with a base href that matches the mount path (`ng build --base-href /admin/`), copy the new build into `api/public/admin`, and restart the app. |
| **Mixed content warning** — "Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'" | Something is calling `http://` from an HTTPS page, or an old build with an absolute `http://localhost:3000` API URL was uploaded. | Both Angular apps must resolve the API from a **relative** `/api` base (`src/environments/environment.ts` and `environment.production.ts` both use `apiBase: '/api'`). Rebuild after checking those files, re-upload, and restart. Never hard-code a hostname in the app. |
| **The app "sleeps" / the first request takes 20–30 seconds, or the site is dead until you open cPanel** | Shared hosting suspends idle Node processes, and the process restarts on the next request. | This is normal behaviour on cPanel. Warm the app up by visiting `/api/health` a minute before your demo or before the marker looks at it, and note it in the video. If the app shows as stopped, start it again from *Setup Node.js App*. |
| **`/api/health` says `"database": "demo"`** on cPanel | `USE_DEMO_DATA` is `true`, or MySQL is unreachable from the app. | Read the `detail` field. Set `USE_DEMO_DATA` to `false`, re-check `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`, then **restart**. |
| **Node version too old on the server for the API** | The account's only Node option is below 18, or Angular was built on the server. | The API needs Node 18+; if nothing suitable is offered, contact your tutor. **Never build Angular on cPanel** — build locally (Node 24.15+) and upload the built files, as in steps 4–5. |
| **Edited a file on the server but nothing changed** | The Node process is still running the old code. | **Restart** the application after every upload or edit. |
| **Database quota or disk full** | `node_modules` pushed the account over its limit. | Delete local build caches and any uploaded zips with File Manager; never upload `node_modules` from your machine. |

---

## 11. Post-deployment checklist

- [ ] `/api/health` reports `"database": "mysql"`.
- [ ] `/api/events` returns 8 events and `/api/events?search=` filters them.
- [ ] `/` loads the client site and its DevTools Network tab shows live `/api` calls.
- [ ] `/admin` loads with a working sidebar and the health badge.
- [ ] Admin create, update and delete all work against the deployed database.
- [ ] Deleting an event with registrations is blocked, with the message shown in the
      browser.
- [ ] The registration flow on the client site writes a new row to `registrations` on
      cPanel (verify in phpMyAdmin).
- [ ] `/api/weather/event/1` returns a forecast.
- [ ] Both URLs and the GitHub link are recorded in your submission — see
      [SUBMISSION-CHECKLIST.md](SUBMISSION-CHECKLIST.md).
