# VIDEO-SCRIPT.md — the demo video (maximum 15 minutes)

A timed script for the assessment video. The brief asks the video to demonstrate your
understanding of the concepts and the code by addressing three key questions, focusing
on your individual contribution:

1. **Database and API architecture** (ULO3: plan and design)
2. **Data flow and interaction between the API and the website** (ULO1 and ULO3)
3. **Website functionality demo** — home page, search page and event page, including
   the **search feature with filtering and validation** (ULO3)

It also requires a walkthrough of the code, the admin site, the optional weather API
and your GitHub progress. The running order below covers all of it inside 15 minutes.

**Total running time: 14 min 40 s.** Times are cumulative targets, not hard limits —
if you fall behind, cut from §7 (deployment) and §8 (GitHub), never from §3–§6.

---

## Before you press record

- [ ] API running with **MySQL** (`/api/health` → `"database": "mysql"`). Not demo mode.
- [ ] Client website on <http://localhost:4200>, admin on <http://localhost:4201>.
- [ ] Two browser windows side by side, or one window with tabs already opened:
      client site, admin site, `http://localhost:3000/api/health`,
      `http://localhost:3000/api/events?search=Byron`.
- [ ] Editor open at the repository root with the files from §2–§5 in tabs.
- [ ] Terminal open, `cd api` done, ready to run the tests.
- [ ] **Notifications off** (Windows: Focus Assist → Alarms only). Close personal tabs.
- [ ] Browser zoom at **110–125 %** so the marker can read the code.
- [ ] Screen resolution 1920×1080 or lower, and test that the recorded text is legible.
- [ ] Rehearse §3, §4 and §5 out loud once — they are the parts worth marks.
- [ ] Say your **name and student ID** in the first 20 seconds, and again in the last
      minute. Markers need to be certain whose work they are watching.

Recording tips: use OBS Studio or Windows Game Bar (`Win`+`G`), record the whole
screen plus microphone, and avoid jump-cuts inside a single explanation. One continuous
take is easier to follow than a heavily edited one — small mistakes are fine.

---

## §1 — Introduction and what the project is (0:00 – 0:45)

**On screen**

- This `README.md` at the top, showing the project title, then the case study
  paragraph in the overview.

**Say**

> "Hi, I'm **[YOUR NAME]**, student ID **[YOUR STUDENT ID]**. This is my contribution to
> Assessment 3 for PROG2002 Web Development II, built with my teammate
> **[PARTNER NAME]** in team **[TEAM ID]**.
>
> Our case study is a charity events website. In Assessment 2 it was a read-only site:
> visitors could browse charity events but not do anything with them. Assessment 3
> turns it into a complete dynamic website. The public can now register for an event and
> buy tickets, staff get a separate admin website where they can create, update and
> delete events, and both websites are served by a new REST API backed by MySQL. There
> is also an optional weather forecast on each event page, from the Open-Meteo API.
>
> In the next fifteen minutes I'll cover the database and API architecture, how data
> flows from MySQL through the API into the browser, and then a live demo of the sites
> — including the search feature with its filtering and validation."

**Files to open:** `README.md`.

---

## §2 — Part 1: the database (0:45 – 3:15)

**On screen**

- `api/schema.sql`, scrolled slowly from the header comment down through the three
  `CREATE TABLE` statements.
- Keep the entity relationship in your head and say it out loud:

  ```text
  categories 1 ──── many events 1 ──── many registrations
  ```

**Say**

> "Starting with the database. The schema file begins with a comment block explaining
> the three changes Assessment 3 required, and those comments are the analysis the
> brief asks for: what the existing schema could not do, and the most effective way to
> store the new information.
>
> The first change was a new **`registrations`** table. The brief requires a table that
> records which event a user registered for, where one user may register for multiple
> events but only once per event. So the columns are a unique identifier, the user's
> name, email and phone, the registration date, the number of tickets, optional notes,
> and `event_id` linking back to the event. The design decision that matters is this
> line: a **unique key on `event_id` and `email`**. That is the database itself
> enforcing 'one registration per person per event' — it is not just a rule in
> application code. It also protects against two requests arriving at the same moment.
>
> The relationships are explicit. `registration_id` is the primary key;
> `fk_registrations_event` is a foreign key back to `events`; `fk_events_category` links
> events to categories. They are all `InnoDB`, which is what makes the foreign keys
> enforced rather than decorative, and the schema uses `utf8mb4` so names with accents
> or emoji do not break.
>
> The second change was two new columns on `events` — `latitude` and `longitude`. The
> optional weather API needs the coordinates of the event location, so I added them as
> `DECIMAL(9,6)`, which gives about ten centimetres of precision, and they are nullable
> because an event without coordinates is still a valid event.
>
> The third change was introducing a **`categories`** table, so the client site can
> filter by category and staff can manage categories separately instead of storing
> category text on every event.
>
> I also added indexes on `status`, `event_date` and `category_id`, because those are
> the three columns the client site filters and sorts on. That matters for the search
> page you will see shortly."

**On screen**

- Switch to `api/seed.sql` and show the three insert blocks.

**Say**

> "The seed file gives the site realistic data: five categories, eight charity events
> across the three statuses — Active, Past and Suspended — with real coordinates for
> each location, and **fourteen registrations**. The brief asks for a minimum of ten, so
> we exceeded it to make the event pages look convincing.
>
> Two details are deliberate. The event dates use `DATE_ADD(NOW(), INTERVAL n DAY)` so
> upcoming events stay upcoming whenever the file is imported, and the registration
> dates use `DATE_SUB` with different offsets — so when the event page lists
> registrations newest first, you can actually see the ordering working rather than
> every row having the same timestamp."

**Files to open:** `api/schema.sql`, `api/seed.sql`.

---

## §3 — Part 2: the REST API (3:15 – 5:45)

**On screen**

- `api/server.js` — the middleware, route mounting and start-up block.

**Say**

> "This is the API. `server.js` creates the Express app, enables CORS for the two
> development servers, parses JSON bodies, and logs one line per API request. That log
> is what we will watch during the demo. It then mounts four routers — events,
> categories, registrations and weather — all under `/api`, and finally serves the two
> built Angular applications.
>
> At start-up it asks the database layer which data source to use. If MySQL answers, the
> API runs on MySQL; if not, it falls back to an in-memory dataset and says so in
> `/api/health`. That fallback is only for convenience during development — the
> submission runs on MySQL, which is why the health badge in the admin site exists: it
> proves at a glance which one is live."

**On screen**

- `api/routes/events.js`, from the route comment block down to the `DELETE` handler.
  Point at each route as you name it.

**Say**

> "The event routes are the core of Part 2, and the brief asked for the full C.R.U.D.
> cycle with intuitive, resource-based URLs.
>
> `GET /api/events` is the list endpoint used by the home page and the search page. It
> accepts four query parameters: `search`, `category_id`, `status` and `sort`. The
> important design decision is that **filtering and sorting happen in SQL, on the
> server** — the API never ships eight events to the browser and lets JavaScript hide
> some of them. The response contains the count, the filters that were applied, and the
> events.
>
> `GET /api/events/:id` is the improved endpoint the brief specifically asks for. It
> returns the event *and* its complete list of registrations, sorted
> `registration_date DESC` — newest first. It also adds three computed values:
> `category_name`, `registration_count` and `tickets_sold`.
>
> `POST /api/events` creates an event and returns `201`.
> `PUT /api/events/:id` updates one.
> `DELETE /api/events/:id` is where the data integrity rule lives. The brief says an
> event may only be deleted if it has not received any registrations. If registrations
> exist, the API refuses with a **409 Conflict** and a message explaining exactly how
> many registrations and tickets are blocking the delete, and suggests suspending the
> event instead. The admin site shows that message to the user rather than failing
> silently.
>
> On REST design and security, as the brief asks: the URLs are plural nouns, the HTTP
> verb carries the action, and the status codes are consistent — 200 for a successful
> read, update or delete, 201 for a create, 400 for validation, 404 for an unknown id
> and 409 for a business-rule conflict. Every write is validated on the server before it
> touches the database, and every SQL statement is parameterised with `?` placeholders,
> which is what prevents SQL injection. Sorting is the one thing that cannot use a
> placeholder, because it is a SQL fragment rather than a value, so the four allowed sort
> keys are whitelisted in a lookup table in the repository — anything else falls back to
> the default instead of being concatenated into the query."

**On screen**

- `api/lib/validate.js` — the `validateEvent` and `validateRegistration` functions.
- Then `api/db/mysql-repository.js` — the `SORT_SQL` block and
  `createRegistrationGuarded`.

**Say**

> "Validation is repeated on the server even though the Angular forms validate too,
> because the API must never trust the browser. `validate.js` checks that the event name
> is three to one hundred and fifty characters, that the category actually exists, that
> the date parses, that capacity is a whole number of at least one, that the price is not
> negative, and that latitude and longitude are in range. For registrations it checks the
> name, the email pattern, that the phone has eight to fifteen digits, and that tickets
> are a whole number between one and twenty. A failure returns 400 with a list of
> field-level messages.
>
> The last piece of API logic worth showing is the registration transaction. Capacity
> and the duplicate check are done inside a single database transaction with
> `SELECT ... FOR UPDATE`, so two people registering for the last ticket at the same
> moment cannot both succeed. Without the transaction, both requests would read the same
> ticket count, both would pass the check, and the event would be oversold."

**Files to open:** `api/server.js`, `api/routes/events.js`, `api/lib/validate.js`,
`api/db/mysql-repository.js`.

---

## §4 — Part 3: data flow from the API to the website (5:45 – 7:30)

**On screen**

- `angular/client/src/app/services/event.service.ts`.

**Say**

> "Now the data flow — how the website actually talks to the API. Everything goes
> through one Angular service, `EventService`, and that is deliberate: there is exactly
> one place in the client website that knows the API exists, so the pages stay simple.
>
> `getEvents()` takes the filters and builds query parameters with Angular's
> `HttpParams`, then calls `/api/events` on the API base. There is a service method for
> each endpoint the site needs: categories, the event list, a single event with its
> registrations, creating a registration, and the weather forecast.
>
> Notice the base URL is `/api`, a **relative** path, not `http://localhost:3000`. In
> development the Angular dev server proxies `/api` to the Express API, and in
> production the API serves the built Angular app from the same origin, so the same code
> works in both places with no edits. That is why there is no CORS problem on cPanel.
>
> The other important part is error handling at the bottom of the file. The API always
> answers with `{ error, details }`, so this operator flattens any HTTP failure into one
> predictable `ApiError` with a readable message, the status code and the field-level
> details. That is what lets a 409 'this event cannot be deleted' message be shown
> straight to the user, and what lets the site say 'cannot reach the API' when the
> server is down, instead of showing a blank page."

**On screen**

- `angular/client/src/app/models/api.models.ts` — the `CharityEvent` interface.

**Say**

> "The response shape is typed. `api.models.ts` mirrors the JSON the API returns —
> event id, category, dates, capacity, price, status, and the computed registration
> count and tickets sold. Because the API normalises types before sending, prices arrive
> as numbers rather than strings, which means the templates can format them without any
> conversion layer."

**On screen**

- `angular/client/src/app/app.routes.ts` (or the pages folder) — show the route table
  and one component's subscribe/render code.

**Say**

> "The final step of the flow is rendering. A page component injects the service, calls
> the method, and stores the result in a signal. The template then renders that signal
> with the new `@for` control flow, so the HTML is generated from the API response — the
> event cards you are about to see do not exist in the HTML file, they are created from
> the JSON."

**Files to open:** `angular/client/src/app/services/event.service.ts`,
`angular/client/src/app/models/api.models.ts`,
`angular/client/src/app/app.routes.ts`, one page component and its template.

---

## §5 — Part 3 live demo: home page and search with filtering and validation (7:30 – 10:00)

**On screen**

- Browser at <http://localhost:4200>. Keep the API terminal visible in a corner if you
  can, because the request log proves the data is coming from the server.

**Say (home page)**

> "This is the client website. The home page has a hero, a search box and a set of
> upcoming Active events, all fetched from `GET /api/events` with `status=Active`. Let me
> prove that is what is happening."

**Do**

- Open DevTools → **Network** tab, reload, click the `/api/events?status=Active` request
  and show the JSON response.

> "There is the request and there is the JSON coming back. Nothing on this page is
> hard-coded."

**Say (search and filtering)**

> "Now the search feature, which the brief singles out. I'll type a **location**."

**Do**

- Type `Byron` in the search box and submit. Point out the result count and the single
  result.

> "One result — the Winter Warmth Community Appeal, because 'Byron' is in its location.
> The search matches on the event **name**, the **location** and the **description**, and
> that happens in the SQL query on the server. In the terminal you can see the exact
> request: `/api/events?search=Byron`.

> Now I'll search by **description** instead."

**Do**

- Search `blankets`. Show that the Winter Warmth event is found even though 'blankets'
  is not in its name or location.

> "Same event, found through the description. That is the `LIKE` clause across three
> columns.

> Next, **filtering**. I'll clear the search and add a category filter."

**Do**

- Choose the **Environment** category, then show the count.

> "Now only Environment events. The category filter is a separate query parameter,
> `category_id=2`, so the two can be combined."

**Do**

- In the search page, type `charity` **and** select Environment **and** the Active
  status, then show the results and the applied-filter summary.

> "Search, category and status combine into one request: `search=charity`,
> `category_id=2`, `status=Active`. Again, the filtering is happening in the database,
> not in JavaScript.

> Finally, **sorting** — newest first, soonest first, name, or most popular by tickets
> sold."

**Do**

- Change the sort to *Popular* and show the order changing.

**Say (empty state and validation)**

> "Two more things the marker will look for: the empty state and validation. If I search
> for something that does not exist..."

**Do**

- Search `zzzznotarealevent`.

> "...the API correctly returns zero events, and the page shows a friendly 'no events
> found' message with a suggestion to clear the filters, rather than a blank screen.

> And validation: the search is trimmed and sent as a parameter, so an empty search
> simply returns every event rather than breaking. If the API is unavailable the service
> catches it and the page tells the user the API cannot be reached — the site never
> fails silently. I'll show that at the end of the video by stopping the server."

**Files to open (if you show code after the demo):** the search page component.

---

## §6 — Event details and the registration flow (10:00 – 11:30)

**On screen**

- Client site, an event details page (open **Coastal Clean-Up Charity Walk**).

**Say**

> "This is the event details page, which Assessment 2 already had and Assessment 3 asks
> us to improve. Two new things are required and both are here. First, the list of
> registrations for this event, retrieved from the improved single-event endpoint and
> sorted by the latest registration date — you can see the most recent registration at
> the top, and the API test suite asserts that ordering. Second, the Register button now
> links to the new registration page."

**Do**

- Scroll to the registration list, point at the dates descending. Click **Register**.

**Say**

> "The button passes the event id in the URL as a query string — `/register?eventId=1` —
> which is how the registration page knows which event to fetch. It immediately calls
> the API for that event, so the user can see exactly what they are registering for.

> The form collects the details the brief lists: name, email, phone, number of tickets
> and optional notes. It is an Angular reactive form with validators on every required
> field, mirroring the server rules."

**Do**

- Submit the form empty first, so the inline validation errors appear.
- Then enter an invalid email to show the pattern check.
- Then fill it in correctly (name, a valid email, a phone number, two tickets) and
  submit.

**Say**

> "Empty, it blocks me with field-level messages before any request is sent — that is
> the client-side validation the brief asks for. Let me fix that and submit properly.

> The POST goes to `/api/registrations`, and the API re-validates everything, checks the
> event exists and is Active, checks this email has not already registered for this
> event, and checks there is enough capacity left — all inside one transaction. On
> success it returns **201** with the new registration and a message, and the page shows
> the confirmation with the reference number and the navigation options.

> Let me prove the business rules work: if I try to register the same email for the same
> event again, the server refuses with **409** and the page shows the reason — 'already
> registered'. And the database would refuse it anyway, because of that unique key I
> showed you earlier."

**Files to open:** the registration page component and `api/routes/registrations.js`.

---

## §7 — The optional weather API (11:30 – 12:30)

**On screen**

- Back on the event details page, the weather forecast card.
- Then `api/lib/weather.js` and `api/routes/weather.js`.

**Say**

> "This is the optional external API, worth extra marks. The event page shows a
> forecast for the event's location, using the Open-Meteo API the brief suggests, with
> the coordinates stored on the event.

> The design decision here is that the **browser never calls Open-Meteo directly**. It
> calls our own `/api/weather/event/:id`, and our API calls Open-Meteo server side. That
> gives us three things. First, the WMO weather codes are translated into meaningful
> text once, in this lookup table, exactly as the brief's table lists them — 'Clear sky',
> 'Rain: Light, moderate, and heavy', 'Thunderstorm: Slight or moderate' — so the Angular
> component only has to render a string. Second, responses are cached for thirty
> minutes, so a busy page cannot burn through the free quota, and the payload reports
> whether the answer came from the cache. Third, the third-party host never has to be
> allow-listed in the browser, and switching weather providers would only change this one
> file.
>
> The endpoint is defensive: the coordinates are range-checked and return 400 if they
> are wrong, an unknown event id returns 404, and an event with no coordinates returns
> 409 with a clear explanation instead of a crash. If Open-Meteo itself is unreachable,
> the API returns a handled 502 and the event page still renders — a missing forecast
> never breaks the page, which is exactly what you want for an optional feature."

**Files to open:** `api/lib/weather.js`, `api/routes/weather.js`.

---

## §8 — Part 4: the admin website (12:30 – 13:45)

**On screen**

- Browser at <http://localhost:4201>.

**Say**

> "This is the admin website for charity staff. The brief asks for a persistent
> navigation menu on every page, so the shell is a sidebar with Dashboard, Events, New
> Event and Categories, and the routed page renders beside it — the menu never
> disappears. In the footer there is a live API status badge, which is polling
> `/api/health` every thirty seconds and reporting that we are connected to MySQL.
> That is a deliberate choice: it shows the front end is genuinely talking to the
> Express API.
>
> Under Events, the brief asks for a complete list of **every** event regardless of
> status. Here are all eight — Active, Past and Suspended — with the administrative
> columns: category, date, location, capacity, tickets sold and status. The client site
> only shows Active events, so this endpoint deliberately is not filtered, which is the
> difference between the public and admin views.
>
> **Create.** I'll add a new event."

**Do**

- **New Event** → click Save with fields empty to show validation → then fill in a name,
  category, date, location, capacity, price, status and coordinates → Save. Show the
  success banner and the new row in the list.

> "The form validates before it calls the API — the brief requires that — and the API
> validates again on the server. It returns 201 and the banner confirms which event was
> created. That is a POST to `/api/events`.

> **Update.** Now I'll edit an existing event."

**Do**

- Click **Edit** on an event that has registrations, e.g. Coastal Clean-Up Charity Walk.
  Show that the form is prefilled **and** that the event's registration data is
  displayed below it. Change the capacity and save.

> "The brief specifically asks the update screen to also retrieve and display the
> associated registration data, for the staff member's benefit — it is here, with the
> name, email, phone, date and ticket count for each registration. That is a `PUT` to
> `/api/events/:id`, and on success the banner confirms the update. If I tried to reduce
> capacity below the tickets already sold, the API would refuse with 409, because you
> cannot sell tickets you no longer have.

> **Delete, and the integrity rule.**"

**Do**

- Click **Delete** on Coastal Clean-Up Charity Walk (which has registrations). Show the
  inline message.

> "This event has registrations, so the API blocks the delete with a 409 and the page
> shows the reason inline: it cannot be deleted because it has four registrations
> covering eight tickets, and it suggests suspending the event instead. That is the data
> integrity requirement from the brief, enforced by the API rather than hidden in the
> interface.
>
> Now an event with no registrations."

**Do**

- Delete the event you created earlier. Show the success message and the row
  disappearing.

> "That one deletes cleanly with a `DELETE` to `/api/events/:id`.

> Finally the **Categories** page, which lists the five categories with how many events
> each one has — that count is computed by the API, not stored, so it can never go stale."

**Files to open:** `angular/admin/src/app/app.html`,
`angular/admin/src/app/services/event.service.ts`.

---

## §9 — Deployment, tests and GitHub progress (13:45 – 14:30)

**On screen**

- The deployed site on cPanel (`/`, `/admin`, `/api/health`) or
  `docs/DEPLOYMENT.md` if the live site is slow to wake.
- Then the terminal running the test suite.

**Say**

> "Both websites and the API are deployed to my SCU cPanel account. The API runs as a
> Node.js application, the database is a cPanel MySQL database, and the same Express
> process serves the API under `/api`, the client website at the root, and the admin
> website under `/admin`. Because everything is on one origin, the apps just use the
> relative `/api` path — that is why there is no CORS or mixed-content problem in
> production. The Angular apps are built locally with Node 24 and only the built files
> are uploaded, because cPanel's Node version is too old for Angular 22 and shared
> hosting should not be compiling an Angular application. You can see the live
> `/api/health` reporting MySQL.
>
> For testing, I wrote an end-to-end suite that starts a real server and exercises every
> endpoint over HTTP — nothing is mocked — including the search, filtering, sorting,
> validation failures, the duplicate-registration conflict, the capacity conflict, the
> blocked delete, and the weather proxy."

**Do**

- Run `cd api; node tests/api.test.js` and let it finish on camera.

> "All 67 assertions pass. That suite is also the evidence for the API part of the
> rubric.
>
> On teamwork and work progress: all our work is in the GitHub repository, committed
> regularly by both of us."

**On screen**

- The GitHub repository → **Commits** view, scrolled to show a series of dated commits
  from both authors.

**Say**

> "Each commit has a message describing what changed — schema first, then the API
> routes, then the client pages, then the admin pages, then deployment — and both team
> members appear as authors, which is the evidence of the teamwork ULO. The build
> contract in `docs/` is the interface we agreed on before we started, so our two halves
> met in the middle without breaking each other."

**Files to open:** `docs/DEPLOYMENT.md`, `api/tests/api.test.js`, the GitHub commits
page.

---

## §10 — Closing and reflection (14:30 – 14:45)

**On screen**

- Back to the live client site home page.

**Say**

> "To summarise: a MySQL database with a new registrations table and a unique key that
> enforces one registration per person per event; a REST API with full C.R.U.D. for
> events, server-side validation, parameterised SQL and correct status codes; an Angular
> client website with a search page that filters in the database and a validated
> registration flow; a separate Angular admin website with persistent navigation and
> complete event management; and both deployed to cPanel. If I had more time I would add
> staff authentication, pagination and a proper delete for registrations.
>
> I'm **[YOUR NAME]**, student ID **[YOUR STUDENT ID]**. Thank you for watching."

---

## After recording

- [ ] Watch it back at 1× and check that every explanation is audible and the code is
      legible. Re-record a section if not.
- [ ] Check the total length is **under 15 minutes**.
- [ ] Check the file plays in a browser as well as a media player.
- [ ] Upload it to your **SCU OneDrive**.
- [ ] Right-click the file → **Share** → set the permission to "Anyone with the link
      can view" (SCU accounts can restrict this to the organisation if your tutor
      prefers — ask if unsure).
- [ ] Copy the **shareable link**, open it in a private/incognito window to confirm
      someone outside your session can view it, and paste the link into your submission
      (see [SUBMISSION-CHECKLIST.md](SUBMISSION-CHECKLIST.md)).
- [ ] Do not rely on a Blackboard upload of a large video file if the brief asks for a
      link — an unopenable link scores nothing.

---

## Questions the marker may ask, and how to answer

| Question | A good answer |
| --- | --- |
| **Why did you choose MySQL and not a document database?** | "The data is strongly relational — events belong to categories and registrations belong to events — and the rules the brief cares about, one registration per person per event and no deleting an event that has registrations, are enforced naturally by primary keys, foreign keys and a unique constraint. A relational engine gives me those guarantees at the storage layer rather than only in application code." |
| **How does your design stop a user registering twice for the same event?** | "Twice over. In the API a transaction checks for an existing row with the same `event_id` and email before inserting, and the database has a unique key on `(event_id, email)`. If two requests race, the second insert fails with a duplicate-entry error, which the API catches and returns as a 409 with a friendly message." |
| **What stops the last ticket being sold twice?** | "The capacity check and the insert run inside one transaction, and the ticket total is read with `SELECT ... FOR UPDATE`, which locks the rows for that event. The second request waits, then reads the updated total and is refused with a 409 that says how many tickets remain." |
| **Why is the delete blocked rather than cascading?** | "The brief requires data integrity: an event can only be deleted if it has no registrations. Cascading would silently destroy donation records, so the API refuses with a 409 and suggests suspending the event instead — the event keeps its history and stops accepting registrations." |
| **Where does your SQL injection protection come from?** | "Every statement uses parameterised `?` placeholders, so user input is sent as data and never concatenated into SQL. The one thing that cannot be parameterised is the `ORDER BY` fragment, so the four allowed sort keys are whitelisted — an unknown sort value falls back to the default rather than reaching the query." |
| **Is your search done on the client or the server? And why does it matter?** | "On the server, in SQL. The Angular page sends `search`, `category_id`, `status` and `sort` as query parameters, and the API builds the `WHERE` clause. It matters because the browser never receives the full dataset: it is correct when the table grows, it keeps the payload small, and it means the same logic is reusable by any client." |
| **How do you validate input, and why in two places?** | "The Angular reactive forms validate for instant feedback, and the API re-validates every write because it must never trust the browser — someone can post directly to the endpoint with Postman or curl. The API answers a bad request with 400 and a `details` array naming the failing fields, which the form displays." |
| **Why is there a demo/demo-data mode? Are you cheating?** | "No — the submission runs on MySQL, and `/api/health` on the deployed site reports `mysql`. The in-memory dataset exists so the websites and the automated test suite can run before a database is available, and so a failed connection degrades gracefully instead of crashing. It is clearly labelled in the health response rather than hidden." |
| **Why is the weather call proxied through your API instead of the browser calling Open-Meteo?** | "Three reasons: the weather codes are translated once on the server so the component only renders text; responses are cached for 30 minutes so the page cannot exhaust the free quota; and no third-party host has to be trusted by the browser. It also means changing provider touches one file." |
| **Why Angular rather than plain JavaScript?** | "The brief offers extra marks for using the framework properly, and it fits the problem: standalone components for the pages, typed services for the API, signals for state, reactive forms for the registration and admin forms, and the router for navigation between the home, search, details and registration pages. The typed models also mean a change to an API field is caught at compile time rather than at run time." |
| **What was the hardest part?** | Give an honest, specific answer, for example: "Agreeing the API response shape before we split the work, and keeping the registrations list correctly ordered while the same endpoint also had to return the computed ticket totals. We solved it by writing the response shape into a build contract first and having the test suite assert the ordering and the totals." |
| **What would you do differently?** | "Add staff authentication to the admin site, add pagination to the admin event list, and allow deleting an individual registration — at the moment the only way to free an event for deletion is to edit the database." |
| **Which parts did you personally write?** | Name your files precisely, for example: "I wrote `schema.sql`, the events routes, the validation layer and the test suite; my teammate wrote the admin pages and the deployment script." Then be ready to open any of them and explain the code line by line. |
| **Show me a bug you fixed.** | Pick a real one from your history — for example a date format that MySQL rejected, or the registrations list appearing oldest-first — and explain the cause and the fix. A concrete story scores better than claiming there were no bugs. |
