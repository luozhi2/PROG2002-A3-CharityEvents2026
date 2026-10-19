# SCU Charity Events — A3 Build Contract (source of truth)

Every worker building this project MUST follow this document exactly.
Do not rename JSON fields, routes, or file paths. Other workers depend on them.

## Repository layout

```
PROG2002-A3/
  README.md
  docs/                      -> plans, setup, deployment, video script, declarations
  api/                       -> Part: usernameA3-api.zip
    server.js
    db.js
    schema.sql
    seed.sql
    package.json
    .env.example
    routes/
      events.js
      categories.js
      registrations.js
      weather.js
    public/                  -> production build output of both Angular apps (generated)
  angular/                   -> one Angular workspace, two applications
    package.json
    angular.json
    tsconfig.json
    client/                  -> Part: usernameA3-clientside.zip
      src/...
      proxy.conf.json
    admin/                   -> Part: usernameA3-adminside.zip
      src/...
      proxy.conf.json
```

API runs on `http://localhost:3000`. Angular client dev server `http://localhost:4200`,
admin dev server `http://localhost:4201`. Both dev servers proxy `/api` -> `:3000`
via `proxy.conf.json`.

Every Angular app resolves its API base as:

```ts
// src/environments/environment.ts
export const environment = { production: false, apiBase: '/api' };
```

so it works in dev (proxy) and on cPanel (same origin) without edits.

## Database schema (MySQL 8, must also run on MariaDB 10.x as used by SCU cPanel)

```sql
CREATE TABLE categories (
  category_id   INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(80)  NOT NULL UNIQUE,
  description   VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE events (
  event_id      INT AUTO_INCREMENT PRIMARY KEY,
  category_id   INT           NOT NULL,
  event_name    VARCHAR(150)  NOT NULL,
  description   TEXT          NULL,
  event_date    DATETIME      NOT NULL,
  end_date      DATETIME      NULL,
  location_name VARCHAR(150)  NOT NULL,
  address       VARCHAR(255)  NULL,
  latitude      DECIMAL(9,6)  NULL,          -- added for the Open-Meteo weather API
  longitude     DECIMAL(9,6)  NULL,          -- added for the Open-Meteo weather API
  capacity      INT           NOT NULL DEFAULT 100,
  ticket_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  image_url     VARCHAR(500)  NULL,
  status        ENUM('Active','Past','Suspended') NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
  INDEX idx_events_status (status),
  INDEX idx_events_date (event_date),
  INDEX idx_events_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE registrations (
  registration_id   INT AUTO_INCREMENT PRIMARY KEY,
  event_id          INT           NOT NULL,
  full_name         VARCHAR(120)  NOT NULL,
  email             VARCHAR(150)  NOT NULL,
  phone             VARCHAR(30)   NOT NULL,
  registration_date DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tickets           INT           NOT NULL DEFAULT 1,
  notes             VARCHAR(255)  NULL,
  CONSTRAINT fk_registrations_event FOREIGN KEY (event_id) REFERENCES events(event_id),
  CONSTRAINT uq_registration_event_email UNIQUE (event_id, email),
  INDEX idx_registrations_event (event_id),
  INDEX idx_registrations_date (registration_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`uq_registration_event_email` enforces "one user may register for an event only once".
`seed.sql` must insert >= 5 categories, >= 8 events (mix of Active/Past/Suspended, with
latitude/longitude filled) and **>= 10 registrations** spread across events, using
`DATE_SUB(NOW(), INTERVAL n DAY)` style values so the "latest first" ordering is visible.

Connection settings come from env with cPanel-friendly names:
`DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PORT`.

## REST API contract

Base path `/api`. All responses are JSON. Errors use:
```json
{ "error": "Human readable message", "details": ["optional field errors"] }
```
Success codes: 200 read/update/delete, 201 create. Validation failure: 400.
Unknown id: 404. Business-rule conflict (duplicate registration, delete blocked): 409.

| Method | URL | Purpose |
| --- | --- | --- |
| GET | `/api/health` | `{ "status": "ok", "db": "connected"\|"demo" }` |
| GET | `/api/categories` | all categories, each with `event_count` |
| GET | `/api/events` | list. Query: `search`, `category_id`, `status`, `sort` (`date_asc` default, `date_desc`, `name`, `popular`) |
| GET | `/api/events/:id` | single event **plus** `category_name`, `registration_count`, `tickets_sold` and `registrations[]` (each with `registration_id, full_name, email, phone, registration_date, tickets, notes`), registrations sorted `registration_date DESC` |
| POST | `/api/events` | create (Part 2 admin) |
| PUT | `/api/events/:id` | update by id |
| DELETE | `/api/events/:id` | delete. **409 if registrations exist**, message must explain the block |
| GET | `/api/events/:id/registrations` | registrations for one event, `registration_date DESC` |
| POST | `/api/registrations` | create a registration. Body `{ event_id, full_name, email, phone, tickets, notes? }` |
| GET | `/api/registrations` | all registrations (admin convenience), joined with `event_name` |
| GET | `/api/weather?latitude=&longitude=` | server-side proxy of Open-Meteo, returns a normalised payload |
| GET | `/api/weather/event/:id` | same, using the event's stored coordinates |

### Event object returned by the API

```json
{
  "event_id": 1,
  "event_name": "Coastal Clean-Up Charity Walk",
  "description": "...",
  "category_id": 2,
  "category_name": "Environment",
  "event_date": "2026-03-13T22:00:00.000Z",
  "end_date": null,
  "event_date_day": "2026-03-14",
  "end_date_day": null,
  "location_name": "Lismore Riverside Park",
  "address": "Riverside Park, Lismore NSW 2480",
  "latitude": -28.813000,
  "longitude": 153.278000,
  "capacity": 200,
  "ticket_price": 15,
  "image_url": null,
  "status": "Active",
  "created_at": "...",
  "updated_at": "...",
  "registration_count": 4,
  "tickets_sold": 9
}
```

## Timezone convention (important)

Every charity event in this case study happens in the Northern Rivers region of
New South Wales, so **all event datetimes are Australia/Sydney wall-clock times**:

| Layer | Representation |
| --- | --- |
| MySQL | a naive `DATETIME`, e.g. `2026-03-14 09:00:00` meaning 9:00 am Sydney |
| API request body | either a Sydney wall-clock string (`2026-03-14T09:00`, `2026-03-14 09:00:00`) or a UTC instant (`2026-03-13T22:00:00.000Z`) |
| API response | a true UTC instant (`event_date`) **plus** the Sydney calendar day (`event_date_day`) |
| Angular `datetime-local` input | the Sydney wall-clock value, converted by `angular/admin/src/app/shared/timezone.ts` |
| Angular display | `FormatService.eventDate()` / `.time()` render in `Australia/Sydney` and add the `AEDT`/`AEST` label |

Rules that follow from this:

- Never call `new Date(naiveString)` on a value straight from the database: that
  lets the *server's* timezone decide the meaning and shifts every event if the
  host is not in Sydney. Use `api/lib/timezone.js`.
- Never derive a calendar day from `toISOString().slice(0, 10)`. For anything
  starting before 11 am Sydney the UTC date is the previous day. Use
  `event_date_day` from the API, or `sydneyDateKey()`.
- The API applies the daylight-saving offset for the specific date, so summer
  events are UTC+11 (AEDT) and winter events UTC+10 (AEST).

### Validation rules (server side, mirrored client side)

- `event_name`: required, 3..150 chars
- `category_id`: required, must exist
- `event_date`: required, valid datetime
- `location_name`: required
- `capacity`: required integer >= 1
- `ticket_price`: required number >= 0
- `status`: one of `Active`, `Past`, `Suspended`
- `latitude`/`longitude`: optional, if present must be -90..90 / -180..180
- registration: `event_id` must exist (404), `full_name` required, `email` required and
  must match `^[^\s@]+@[^\s@]+\.[^\s@]+$`, `phone` required, `tickets` integer >= 1,
  and `tickets` may not push `tickets_sold` past `capacity` (409). Duplicate
  `(event_id, email)` -> 409. Registration on a non-`Active` event -> 409.

### Weather payload

```json
{
  "latitude": -28.813, "longitude": 153.278,
  "timezone": "Australia/Sydney",
  "daily": [
    { "date": "2026-03-14", "weather_code": 61, "description": "Rain: Light, moderate, and heavy",
      "temperature_max": 24.1, "temperature_min": 15.3 }
  ],
  "source": "https://api.open-meteo.com/v1/forecast"
}
```

Weather-code mapping (from the brief) lives in the API and is reused verbatim:
`0 Clear sky` · `1,2,3 Mainly clear, partly cloudy, and overcast` · `45,48 Fog and depositing rime fog` ·
`51,53,55 Drizzle: Light, moderate, and dense` · `61,63,65 Rain: Light, moderate, and heavy` ·
`80,81,82 Rain showers: Light, moderate, and violent` · `95 Thunderstorm: Slight or moderate`.
Unknown codes -> `Unknown`.

## Home / Search / Details content rules (client side, from Assessment 2 + A3)

- Home: hero, a search box that routes to Search, category tiles, list of upcoming Active events.
- Search: text search + category filter + status filter + sort; results update through the API
  (never client-side filtering of a full array); show a result count and an empty state.
- Event Details: event info, weather forecast card, the **registrations list sorted latest first**,
  and a Register button that navigates to `/register?eventId=<id>`.
- Registration page: shows the selected event's info, a validated reactive form, posts to
  `/api/registrations`, shows a confirmation with a reference number, then offers navigation.

## Admin site rules

- Persistent navigation on every page: Dashboard, Events, New Event, Categories.
- Events list: all statuses, key admin columns, Edit + Delete per row, delete shows the
  409 blocked message inline.
- New Event form and Edit Event form: full validation before the API call, success/error banner.
- Edit Event also displays that event's registration data.

## Style rules

- TypeScript strict, Angular standalone components, `provideRouter`, `provideHttpClient`,
  signals for state, new `@if`/`@for` control flow. No NgModules.
- Every component gets a short comment block explaining its role (marks come from comments).
- Hero and brand imagery lives in `client/public/` (client) and `admin/public/` (admin).
