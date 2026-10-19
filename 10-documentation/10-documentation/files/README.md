# SCU Charity Events — PROG2002 Assessment 3

**Unit:** PROG2002 Web Development II (Southern Cross University)
**Assessment:** Assessment 3 — Complete dynamic website (40%, group of 2)
**Student:** [YOUR NAME] — [YOUR STUDENT ID]
**Team:** [TEAM ID] — with [PARTNER NAME]
**Repository:** [GITHUB URL]

---

## 1. Case study

The project continues the **charity events** case study from Assessment 2. A charity
runs fundraising events across the Northern Rivers region (fun runs, gala dinners,
clean-up walks, appeals and so on). In Assessment 2 the public could only **read**
events. Assessment 3 turns the same idea into a **complete dynamic website** by adding:

* a **registration capability** — a member of the public can buy one or more tickets
  for an event;
* an **admin-side website** where charity staff can create, update and delete events;
* a **new REST API surface** (full C.R.U.D. for events, plus registrations and
  categories) that both websites call at run time;
* an optional **external weather API** (Open-Meteo) that forecasts the weather at the
  event location;
* **deployment** of both websites and the API to SCU cPanel.

## 2. Overview

This repository contains one Node.js/Express REST API backed by MySQL, and **two
Angular 22 single-page applications** that consume it: a public client website and a
staff-only admin website. Neither website contains hard-coded event data — every
event, category, registration and forecast shown in the browser is fetched from the
API over HTTP and rendered with Angular, which is what makes the site *dynamic* rather
than *static*. The API exposes search, category filtering, status filtering and
sorting as query parameters so that filtering happens in SQL on the server. Two
integrity rules from the brief are enforced in the API *and* in the database schema:
an event may not be deleted once it has registrations, and the same email address may
register for an event only once. The API can also run without MySQL from an in-memory
dataset (`USE_DEMO_DATA=true`), which is how the automated test suite runs and how the
websites stay demonstrable before a database exists.

## 3. Technology stack

| Layer | Technology | Version used |
| --- | --- | --- |
| Runtime (API) | Node.js | 18 or newer (`api/package.json` → `"engines": { "node": ">=18" }`) |
| Runtime (Angular builds) | Node.js | **24.21.0** (Angular 22 requires Node >= 24.15.0) |
| API framework | Express | ^4.21.2 |
| Database driver | mysql2 | ^3.11.5 |
| Configuration | dotenv | ^16.4.5 |
| CORS middleware | cors | ^2.8.5 |
| Database | MySQL 8.x | also verified against MariaDB 10.x (SCU cPanel) |
| Client website | Angular | ^22.2.0 (standalone components, signals) |
| Admin website | Angular | ^22.2.0 (standalone components, signals) |
| Angular CLI / build | @angular/cli, @angular/build | ^22.2.2 |
| Language | TypeScript | ~6.0.2 (strict) |
| Reactive state / HTTP | RxJS ~7.8.0, `provideHttpClient`, `provideRouter` | — |
| External API (optional) | Open-Meteo forecast API | `https://api.open-meteo.com/v1/forecast` |
| Hosting | SCU cPanel (Node.js app + MySQL + phpMyAdmin) | — |

> **Node version note.** The API itself only needs Node 18+. The **Angular 22 build**
> needs Node >= 24.15.0. If the machine's own Node is older, put a suitable `node.exe`
> in `tools/node/` and `tools/env.ps1` will use it automatically; that file is
> **deliberately not committed** (it is ~90 MB), so a fresh clone falls back to the
> Node already on PATH and `env.ps1` warns when that version is too old to build.
> Production on SCU cPanel uses whatever Node version the hosting provides through
> *Setup Node.js App* — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Build the
> Angular apps **locally** and upload only the built files. See
> [docs/SETUP.md](docs/SETUP.md) for the full detail.

## 4. Repository structure

```text
PROG2002-A3/
├── README.md                     <- this file
├── docs/
│   ├── BUILD-CONTRACT.md         <- the agreed API/schema/layout contract
│   ├── SETUP.md                  <- local environment setup + troubleshooting
│   ├── DEPLOYMENT.md             <- SCU cPanel deployment checklist
│   ├── VIDEO-SCRIPT.md           <- timed script for the 15-minute demo video
│   ├── GENAI-DECLARATION.md      <- the GenAI use declaration (choose one statement)
│   ├── PEER-EVALUATION-NOTES.md  <- guidance for the SCU peer evaluation form
│   └── SUBMISSION-CHECKLIST.md   <- what to submit, tick by tick
│
├── api/                          <- Part: usernameA3-api.zip
│   ├── server.js                 <- Express app: middleware, routes, static SPAs, start-up
│   ├── package.json              <- npm start / npm test
│   ├── .env.example              <- copy to .env and fill in
│   ├── schema.sql                <- DROP + CREATE categories, events, registrations
│   ├── seed.sql                  <- 5 categories, 8 events, 14 registrations
│   ├── db/
│   │   ├── index.js              <- chooses MySQL or the in-memory dataset at start-up
│   │   ├── mysql-repository.js   <- all parameterised SQL (incl. the registration transaction)
│   │   ├── demo-repository.js    <- same interface, in-memory
│   │   └── demo-data.js          <- the in-memory dataset (mirrors seed.sql)
│   ├── lib/
│   │   ├── responses.js          <- eventJson / registrationJson / categoryJson / ok / fail
│   │   ├── validate.js           <- server-side validation for events and registrations
│   │   └── weather.js            <- Open-Meteo proxy, WMO code translation, 30-min cache
│   ├── routes/
│   │   ├── events.js             <- list/search/filter/sort, details, create, update, delete
│   │   ├── categories.js         <- categories with event counts
│   │   ├── registrations.js      <- create a registration, list all registrations
│   │   └── weather.js            <- /api/weather and /api/weather/event/:id
│   ├── tests/
│   │   ├── timezone.test.js      <- Sydney wall-clock / daylight-saving unit tests
│   │   └── api.test.js           <- end-to-end suite; run with `node tests/api.test.js`
│   └── public/                   <- (generated) client + admin production builds
│       ├── client/               <- Part: usernameA3-clientside.zip
│       └── admin/                <- Part: usernameA3-adminside.zip
│
├── angular/                      <- one workspace directory, two Angular applications
│   ├── client/                   <- public client website, dev server on port 4200
│   │   ├── angular.json          <- port 4200 + proxy.conf.json
│   │   ├── proxy.conf.json       <- /api -> http://localhost:3000
│   │   ├── public/               <- hero + brand imagery
│   │   └── src/
│   │       ├── main.ts
│   │       ├── styles.css
│   │       ├── environments/     <- environment.ts and environment.production.ts (apiBase '/api')
│   │       └── app/
│   │           ├── app.ts / app.html / app.css / app.config.ts / app.routes.ts
│   │           ├── models/api.models.ts       <- typed mirrors of the API JSON
│   │           ├── services/event.service.ts  <- the only place the client calls the API
│   │           ├── services/format.service.ts <- display formatting helpers
│   │           ├── shared/event-card/         <- reusable event card component
│   │           └── pages/                     <- Home, Search, Event Details, Registration
│   └── admin/                    <- staff admin website, dev server on port 4201
│       ├── angular.json          <- port 4201 + proxy.conf.json
│       ├── proxy.conf.json       <- /api -> http://localhost:3000
│       ├── public/               <- admin brand imagery
│       └── src/
│           ├── environments/     <- apiBase '/api'
│           └── app/
│               ├── app.ts / app.html          <- the persistent sidebar navigation
│               ├── models/api.models.ts
│               ├── services/                  <- event, category, registration, health services
│               ├── shared/api-format.ts
│               └── pages/                     <- Dashboard, Events, New Event, Edit, Categories
│
└── tools/
    ├── env.ps1                   <- activates a suitable Node and an in-project npm cache
    ├── make-submission-zips.ps1  <- builds usernameA3-*.zip for submission
    ├── find-dead-code.js         <- read-only scan for unreferenced declarations
    ├── fix_seed_dates.py         <- one-off migration that pinned the seed times
    └── node/node.exe             <- optional local Node 24.21.0 for Angular 22 builds
                                     (NOT committed - see the Node version note above)
```

> The `pages` folders under each application hold the routed page components (Home,
> Search, Event Details and Registration on the client; Dashboard, Events, New Event,
> Edit Event and Categories on the admin side).

## 5. Running it locally

Follow these steps in order. Full explanations, both import methods and a
troubleshooting table are in [docs/SETUP.md](docs/SETUP.md).

### Step 0 — Get the tools

* Node.js 18+ for the API (any recent LTS is fine).
* **Node.js 24.15.0 or newer** to build or serve the Angular apps.
* MySQL 8 or MariaDB 10 running locally (XAMPP, WAMP, MAMP or a standalone server).
* A code editor such as VS Code.

In this workspace `tools/env.ps1` is dot-sourced from the repository root. It selects
a suitable Node runtime and keeps npm's cache inside the project folder:

```powershell
. .\tools\env.ps1
node --version    # v24.21.0 when tools/node/node.exe is present, otherwise your own Node
```

If the printed version is older than 24.15.0 the script prints a warning: the API will
still run, but `ng build` and `ng serve` will refuse to start. Install a newer Node, or
drop its `node.exe` into `tools\node\`, and run the script again.

### Step 1 — Create the database

Using the mysql CLI:

```powershell
mysql -u root -p -e "CREATE DATABASE charity_events CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Or create `charity_events` in phpMyAdmin (*New* → *Create database*, collation
`utf8mb4_unicode_ci`).

### Step 2 — Import `schema.sql`, then `seed.sql`

`schema.sql` creates the three tables, so it must be imported **first**; `seed.sql`
inserts the sample data. Using phpMyAdmin: select `charity_events` → **Import** →
*Choose File* → `api/schema.sql` → **Import**, then repeat for `api/seed.sql`.

Using the CLI (from the `api` directory):

```powershell
cd api
mysql -u root -p charity_events < schema.sql
mysql -u root -p charity_events < seed.sql
```

> `schema.sql` starts by dropping `registrations`, `events` and `categories`, so
> re-importing it wipes any data you have added through the admin website.

### Step 3 — Configure `api/.env`

```powershell
cd api
Copy-Item .env.example .env
```

Then edit `.env` so it matches your MySQL installation:

```ini
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=charity_events
USE_DEMO_DATA=false
```

### Step 4 — Install and start the API

```powershell
cd api
npm install
npm start
```

Expected console output:

```text
[db] mode=mysql (connected to root@localhost:3306/charity_events)
[api] Charity Events API listening on http://localhost:3000
[api] client build served: no  admin build served: no
```

### Step 5 — Start the client website (port 4200)

In a **second** terminal, from the repository root:

```powershell
. .\tools\env.ps1
cd angular\client
npm install
npm start
```

Open <http://localhost:4200>.

### Step 6 — Start the admin website (port 4201)

In a **third** terminal, from the repository root:

```powershell
. .\tools\env.ps1
cd angular\admin
npm install
npm start
```

Open <http://localhost:4201>.

Both dev servers proxy `/api` to `http://localhost:3000` through their
`proxy.conf.json`, so no CORS configuration is needed in development and the same
relative `apiBase` (`/api`) works unchanged in production.

### Step 7 — Verify

* <http://localhost:3000/api/health> should report `"database": "mysql"`.
* <http://localhost:3000/api/events> should list 8 events.
* <http://localhost:4200> and <http://localhost:4201> should both load and show data.

### Running everything in demo mode (no MySQL)

Set `USE_DEMO_DATA=true` in `api/.env` and start the API again. `/api/health` then
reports `"database": "demo"` and the API serves the in-memory dataset from
`api/db/demo-data.js`, which mirrors `api/seed.sql`. This is useful for a first look
at the websites, and it is the mode the automated tests use.

## 6. Running the tests

There are two suites. `npm test` in the `api` directory runs both.

### 6.1 Timezone unit tests

`api/tests/timezone.test.js` pins down the Sydney wall-clock conversions that the
whole application depends on, including both daylight-saving transitions and the
stability of the admin edit round trip. It needs no server and no database.

```powershell
cd api
node tests/timezone.test.js
```

```text
Results: 23 passed, 0 failed
```

### 6.2 End-to-end API tests

The suite in `api/tests/api.test.js` starts a real server process against a temporary
copy of the `api` directory (using the in-memory dataset, so it never touches your
`.env` or your database), then exercises every endpoint over real HTTP.

```powershell
cd api
node tests/api.test.js
```

Expected final lines:

```text
----------------------------------------------------------------
Results: 74 passed, 0 failed
```

You can also point the suite at an already-running server:

```powershell
$env:API_BASE = 'http://localhost:3000'
node tests/api.test.js
```

> One weather test calls Open-Meteo over the internet. Without outbound access the
> API answers with a handled `502` and the suite still passes — the test asserts
> "200 or 502" so a lack of internet cannot produce a false failure.

## 7. API endpoint reference

Base path `/api`. All responses are JSON. Success codes are `200` for read / update /
delete and `201` for create; a validation failure is `400`, an unknown id is `404`,
and a business-rule conflict (duplicate registration, capacity exceeded, delete
blocked, registering for a non-Active event) is `409`.

Errors use this shape:

```json
{ "error": "Human readable message", "details": ["optional field errors"] }
```

| Method | URL | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Reports the API status and which data source is live: `"database": "mysql"` or `"database": "demo"` (plus a `detail` string, ISO `time` and API `version`). |
| GET | `/api/categories` | All categories, each with an `event_count`. |
| GET | `/api/categories/:id` | One category; unknown id → 404. |
| GET | `/api/events` | Event list. Query parameters: `search`, `category_id`, `status`, `sort` (`date_asc` default, `date_desc`, `name`, `popular`). Returns `count`, the `filters` that were applied, and `events[]`. |
| GET | `/api/events/:id` | One event **plus** `category_name`, `registration_count`, `tickets_sold` and `registrations[]` (each with `registration_id, full_name, email, phone, registration_date, tickets, notes`), sorted `registration_date DESC`. |
| GET | `/api/events/:id/registrations` | Registrations for one event with a summary (`event_name`, `capacity`, `registration_count`, `tickets_sold`). Add `?order=asc` for oldest first; the default is newest first. |
| POST | `/api/events` | Create an event (admin website). Returns `201` with `{ message, event }`. |
| PUT | `/api/events/:id` | Update an event by id. Also refuses (409) a capacity reduction below the tickets already sold. |
| DELETE | `/api/events/:id` | Delete an event. **`409` when registrations exist**, with a message and `details` explaining the block. |
| POST | `/api/registrations` | Create a registration. Body `{ event_id, full_name, email, phone, tickets, notes? }`. Returns `201` with `{ message, registration, event }`. |
| GET | `/api/registrations` | Every registration, newest first, joined with `event_name` (admin convenience). |
| GET | `/api/weather?latitude=&longitude=` | Server-side proxy of Open-Meteo with a normalised payload. Missing or out-of-range coordinates → 400. |
| GET | `/api/weather/event/:id` | The same forecast using the coordinates stored on the event. No coordinates → 409; unknown id → 404. |
| GET | `/api/weather/codes` | The WMO weather-code legend used by the client (code → description). |

Any other `/api/...` path returns a JSON 404 such as
`{ "error": "Unknown API endpoint: GET /api/does-not-exist" }`.

### Example responses

`GET /api/events?search=Byron&sort=date_asc`

```json
{
  "count": 1,
  "filters": { "search": "Byron", "status": null, "category_id": null, "sort": "date_asc" },
  "events": [
    {
      "event_id": 5,
      "category_id": 4,
      "category_name": "Community",
      "category_description": "Local neighbourhood support and emergency relief.",
      "event_name": "Winter Warmth Community Appeal",
      "description": "A fundraising drive collecting blankets, warm clothing and non-perishable food for families in need across the Northern Rivers region.",
      "event_date": "2026-05-02T22:00:00.000Z",
      "end_date": "2026-05-03T06:00:00.000Z",
      "location_name": "Byron Bay Community Centre",
      "address": "1 Gilmore Crescent, Byron Bay NSW 2481",
      "latitude": -28.643,
      "longitude": 153.612,
      "capacity": 250,
      "ticket_price": 10,
      "image_url": null,
      "status": "Active",
      "created_at": "2026-04-14T08:11:31.000Z",
      "updated_at": "2026-04-14T08:11:31.000Z",
      "registration_count": 2,
      "tickets_sold": 6
    }
  ]
}
```

`GET /api/health` (MySQL mode)

```json
{
  "status": "ok",
  "database": "mysql",
  "detail": "connected to student01_charity@localhost:3306/student01_charity",
  "time": "2026-04-14T08:11:31.204Z",
  "version": "1.0.0"
}
```

`GET /api/weather/event/1` (trimmed)

```json
{
  "latitude": -28.813,
  "longitude": 153.278,
  "timezone": "Australia/Sydney",
  "days": 7,
  "daily": [
    {
      "date": "2026-04-25",
      "weather_code": 61,
      "description": "Rain: Light, moderate, and heavy",
      "label": "Light rain",
      "temperature_max": 24.1,
      "temperature_min": 15.3
    }
  ],
  "source": "https://api.open-meteo.com/v1/forecast",
  "cached": false,
  "event_id": 1,
  "event_name": "Coastal Clean-Up Charity Walk",
  "location_name": "Lismore Riverside Park"
}
```

### Field and validation notes

* Numeric values are returned as **numbers**, not strings (`ticket_price: 10`, not
  `"10.00"`), and dates as ISO-8601 strings.
* `registration_count` and `tickets_sold` are computed by the API on every event
  response.
* Server-side validation (mirrored by the Angular forms) enforces: `event_name` 3–150
  characters; `category_id` must exist; `event_date` required and valid; `location_name`
  required; `capacity` a whole number ≥ 1; `ticket_price` ≥ 0; `status` one of
  `Active`, `Past`, `Suspended`; `latitude`/`longitude` optional but within
  ±90 / ±180; registration `full_name` 2–120 characters; `email` must match a
  standard email pattern (and is stored lower case); `phone` must contain 8–15 digits;
  `tickets` a whole number from 1 to 20; `notes` up to 255 characters.
* Business rules: the same email may register for an event only once (enforced by the
  `uq_registration_event_email` unique key as well as in the API); tickets sold may
  never exceed `capacity`; an event that is not `Active` cannot be registered for; an
  event with registrations cannot be deleted.

## 8. Features implemented (mapped to the brief)

| Brief part | Requirement | Where it lives |
| --- | --- | --- |
| **1. Database improvements** | Analyse the existing schema and add what registration needs | `api/schema.sql` header comments, `docs/VIDEO-SCRIPT.md` §2 |
| | New table recording which event a user registered for, one registration per user per event | `api/schema.sql` → `registrations`, unique key `uq_registration_event_email` |
| | Minimum data: unique id, user details, registration date, contact details, ticket count, event link | `api/schema.sql` columns `registration_id, full_name, email, phone, registration_date, tickets, notes, event_id` |
| | Primary and foreign keys defining the relationships | `registrations.registration_id` (PK), `fk_registrations_event`, `fk_events_category` |
| | At least 10 registrations of seed data | `api/seed.sql` inserts **14** registrations across 5 events |
| | One SQL export of schema **and** data | `api/schema.sql` + `api/seed.sql` |
| **2. RESTful API improvement** | Improved single-event endpoint returning the event **and** its registrations | `GET /api/events/:id` in `api/routes/events.js`; shaping in `api/lib/responses.js` |
| | Create an event | `POST /api/events` |
| | Update an event by id | `PUT /api/events/:id` |
| | Delete an event, **blocked when registrations exist** | `DELETE /api/events/:id` returns 409 with an explanation |
| | Intuitive, resource-based REST URLs and input security | `api/routes/*.js`; all SQL parameterised in `api/db/mysql-repository.js`, sort keys whitelisted in `SORT_SQL` |
| | Testing (Postman or equivalent) | `api/tests/api.test.js` — 74 end-to-end assertions, plus 23 timezone unit tests |
| **3. Client-side website enhancement** | Event page lists the event's registrations, latest first | `GET /api/events/:id` sorted `registration_date DESC`; rendered by the client Event Details page |
| | "Register" button links to the new registration page | client Event Details → `/register?eventId=<id>` |
| | New registration page with a form capturing name, email, phone, tickets, notes | `angular/client/src/app/pages` registration page (reactive form) |
| | Selected event shown on the registration page via the API | `EventService.getEvent(id)` |
| | Finalise button validates, calls the API, shows a confirmation | `EventService.createRegistration()` in `angular/client/src/app/services/event.service.ts` → `POST /api/registrations` |
| | Event id passed between pages | `/register?eventId=<id>` query string |
| | Must call the APIs (no static data) | every client page goes through `EventService`; `apiBase` is `/api` |
| **4. Admin-side website** | List **all** events regardless of status | admin Events page → `GET /api/events` (no status filter) |
| | New event form with validation and a save button | admin New Event page → `POST /api/events` |
| | Update form that also displays the event's registration data | admin Edit Event page → `GET /api/events/:id` + `PUT /api/events/:id` |
| | Delete button per row with clear feedback when blocked | admin Events page → `DELETE /api/events/:id`, rendering the 409 message inline |
| | Persistent navigation menu on every page | `angular/admin/src/app/app.html` sidebar shell (Dashboard, Events, New Event, Categories) |
| | Authentication not required | no auth layer, per the brief |
| **5. Deploy both websites to SCU cPanel** | Public, working deployment of both sites and the API | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md); the API serves the builds from `api/public/client` (`/`) and `api/public/admin` (`/admin`) |
| **6. External Weather API (optional)** | Use Open-Meteo to improve the websites | `api/routes/weather.js` + `api/lib/weather.js`; forecast card on the client Event Details page |
| | Store latitude/longitude on the event | `events.latitude` / `events.longitude` in `api/schema.sql`, populated in `api/seed.sql` |
| | Translate weather codes into meaningful text | `WEATHER_CODES` / `WEATHER_LABELS` in `api/lib/weather.js`, exposed at `GET /api/weather/codes` |
| **Extra credit — Angular** | Use the Angular framework properly for both websites | both SPAs are Angular 22 standalone components with signals, `provideRouter`, `provideHttpClient`, and the new `@if` / `@for` control flow |

## 9. Marking-criteria mapping

The rubric rows from the assessment brief, and the evidence that answers each one.

| Rubric criterion (weight) | How it is met | Evidence to point at |
| --- | --- | --- |
| **Develop a database to serve the scenario (Part 1) — 5%** | Three normalised InnoDB tables with primary keys, foreign keys, indexes, an ENUM status, `created_at`/`updated_at` timestamps, and a unique key that enforces the "one registration per user per event" rule. 5 categories, 8 events and 14 registrations of realistic seed data, with `latitude`/`longitude` added for the weather API. | `api/schema.sql`; `api/seed.sql`; the relationship comments in `schema.sql`; `/api/health` reporting `mysql` |
| **Develop APIs to manage the data (Part 2) — 10%** | Full C.R.U.D. for events plus categories, registrations and the weather proxy. Resource-based URLs, correct status codes (200/201/400/404/409), a consistent `{ error, details }` error shape, validation on every write, parameterised SQL throughout, and a whitelisted sort list. | `api/routes/events.js`; `api/routes/registrations.js`; `api/routes/categories.js`; `api/routes/weather.js`; `api/lib/validate.js`; `api/lib/responses.js`; `api/db/mysql-repository.js`; `api/tests/timezone.test.js` + `api/tests/api.test.js` (74/74 and 23/23 passing, with dedicated timezone regression tests) |
| **Design, develop and deploy a dynamic client-side website (Part 3) — 30%** | Angular 22 standalone SPA with Home, Search, Event Details and Registration pages. Search, category filter, status filter and sort are sent to the API as query parameters (never client-side filtering of a full array), with a result count and empty state. Event Details shows the event, the Open-Meteo forecast and the registration list newest-first; the Register button navigates to the validated registration page, which posts to the API and shows a confirmation. | `angular/client/src/app/services/event.service.ts`; `angular/client/src/app/models/api.models.ts`; `angular/client/src/app/shared/event-card`; `angular/client/src/app/pages`; `angular/client/src/app/app.routes.ts`; `angular/client/src/environments/environment.ts` |
| **Design, develop and deploy a dynamic admin-side website (Part 4) — 30%** | Angular 22 SPA with a persistent sidebar (Dashboard, Events, New Event, Categories), a list of all events in every status, create and update forms with validation and success/error banners, registration data shown on the edit screen, and a per-row delete button that renders the 409 "cannot be deleted" message inline. A live `/api/health` badge proves the front end is talking to the API. | `angular/admin/src/app/app.html`; `angular/admin/src/app/services/event.service.ts`; `angular/admin/src/app/services/category.service.ts`; `angular/admin/src/app/services/registration.service.ts`; `angular/admin/src/app/services/health.service.ts`; `angular/admin/src/app/pages` |
| **Concept understanding (comments, GitHub, video) — 10%** | Every API module and Angular service/component opens with a comment block explaining its role and the design decisions behind it, in the students' own words. Meaningful commit history shows the work progressing. The video script walks through the schema, the request/response cycle and the live demo. | the header comments in `api/server.js`, `api/db/*.js`, `api/lib/*.js`, `api/routes/*.js`, `angular/*/src/app/**`; the GitHub commit history at [GITHUB URL]; [docs/VIDEO-SCRIPT.md](docs/VIDEO-SCRIPT.md) |
| **Teamwork (ULO 2) — 15%** | Work was split between two members with regular commits from both accounts, agreed interfaces recorded in the build contract, and a completed confidential peer evaluation form. | commit authors and messages at [GITHUB URL]; `docs/BUILD-CONTRACT.md`; the peer evaluation form emailed to the tutor; [docs/PEER-EVALUATION-NOTES.md](docs/PEER-EVALUATION-NOTES.md) |
| **Extra points — Angular framework used properly** | Both websites are genuine Angular 22 applications (not plain JavaScript): standalone components, no NgModules, `provideRouter` and `provideHttpClient`, signals for state, typed API models, typed HTTP services, reactive forms and the new `@if` / `@for` control flow. | `angular/client/package.json`; `angular/admin/package.json`; `angular/*/src/app/app.config.ts`; `angular/*/src/app/models/api.models.ts`; `angular/*/src/app/services/*.ts` |
| **Extra points — external weather API** | Open-Meteo is integrated server-side and normalised; WMO codes are translated into text and a short label; responses are cached for 30 minutes; the forecast appears on the event page and is available per event or by coordinate. | `api/lib/weather.js`; `api/routes/weather.js`; `GET /api/weather/event/1`; `GET /api/weather/codes` |

## 10. Documentation index

| Document | Purpose |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | Prerequisites, database import (phpMyAdmin and CLI), `.env` reference, starting the API and both dev servers, and a troubleshooting table. |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step SCU cPanel deployment: MySQL, phpMyAdmin import, production builds, upload, *Setup Node.js App*, verification and troubleshooting. |
| [docs/VIDEO-SCRIPT.md](docs/VIDEO-SCRIPT.md) | A timed script for the maximum 15-minute demo video, plus likely marker questions. |
| [docs/GENAI-DECLARATION.md](docs/GENAI-DECLARATION.md) | Both permitted GenAI declaration statements — keep the one that is true for you. |
| [docs/PEER-EVALUATION-NOTES.md](docs/PEER-EVALUATION-NOTES.md) | How to fill in the official SCU peer evaluation form, with sample scoring and wording. |
| [docs/SUBMISSION-CHECKLIST.md](docs/SUBMISSION-CHECKLIST.md) | Everything to submit, plus a pre-submission self-test. |
| [docs/BUILD-CONTRACT.md](docs/BUILD-CONTRACT.md) | The internal interface contract the team agreed before building. |

---

**Academic integrity:** this submission is the original work of [YOUR NAME] and
[PARTNER NAME]. The Generative AI declaration is included in
[docs/GENAI-DECLARATION.md](docs/GENAI-DECLARATION.md).
