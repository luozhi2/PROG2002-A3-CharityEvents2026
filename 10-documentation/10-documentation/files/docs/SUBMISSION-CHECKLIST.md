# Submission checklist — PROG2002 Assessment 3

Everything the assessment brief asks you to submit, plus a self-test to run first.
Replace every `[SQUARE BRACKET]` placeholder before you submit.

---

## 1. What must be submitted

Based on the brief's *Deliverables & Submissions* section. Everything except the peer evaluation
form goes to the **submission link on Blackboard**; the peer evaluation form is emailed separately.

- [ ] **Three zip files** (the brief names them `usernameA3-*.zip` — use *your* SCU username):
  - [ ] `[username]A3-clientside.zip` — the client Angular website
  - [ ] `[username]A3-adminside.zip` — the admin Angular website
  - [ ] `[username]A3-api.zip` — the Node/Express API, the SQL files and the documentation
  - Build all three with `tools\make-submission-zips.ps1` (see section 3). They are written to
    `dist-submission\`.
- [ ] **The link to your GitHub repository** (do not upload the code to Blackboard, just the link).
  - [ ] The repository is private, or protected so other students cannot copy your work
  - [ ] Your marker has been invited as a collaborator **if** your tutor requires access to mark it
  - [ ] The link works when opened in a private browser window while logged in as the marker
- [ ] **The demo video** — a file or a shareable link
  - [ ] Maximum 15 minutes
  - [ ] Uploaded to your **SCU OneDrive**, with a shareable link created
  - [ ] The link is set to "anyone with the link can view" (or your tutor's account can view it)
  - [ ] It answers the three required questions: database/API architecture, data flow between API
        and website, and the live functionality demo (home, search with filtering, event page)
  - [ ] It shows your **individual** contribution
- [ ] **The peer evaluation form**, emailed **directly to your tutor (not to UA)**, before the due date
  - [ ] Subject line: `PROG2002_A3_[Team_ID]_[Member_name]`
  - [ ] Completed individually and confidentially (your partner sends their own)
  - [ ] Every placeholder replaced and every rating genuinely yours
- [ ] **The GenAI declaration** included in your submission
  - [ ] Keep exactly one of the two statements from `docs/GENAI-DECLARATION.md`
  - [ ] If you used GenAI, list the tool(s) and the specific permitted purpose(s)

## 2. Repository requirements (these carry marks)

- [ ] A GitHub repository exists containing the whole project
- [ ] Work was committed **regularly** across the assessment period, not in one final commit
- [ ] **Every commit message explains what changed** in that commit
- [ ] The commit history shows both team members contributing
- [ ] The repository includes the SQL files, both Angular applications and the API

> The brief is explicit: failing to show the correct work progress will cause the assignment to
> fail. A single "final commit" is the most common way students lose these marks.

## 3. Building the submission zips

From the project root, in PowerShell:

```powershell
.\tools\make-submission-zips.ps1 -Username [your-scu-username]
```

This produces `dist-submission\[username]A3-clientside.zip`, `[username]A3-adminside.zip` and
`[username]A3-api.zip`. Each zip excludes `node_modules`, `.angular` caches and previous build
output, and includes a `README.md` explaining what the contents are and how to run them.

Before zipping, build both Angular apps so the marker can also see a production build:

```powershell
. .\tools\env.ps1
cd angular\client; node node_modules\@angular\cli\bin\ng.js build --configuration production
cd ..\admin;     node node_modules\@angular\cli\bin\ng.js build --configuration production
```

## 4. Pre-submission self-test

Run through this on a clean machine or a fresh clone before you submit. Each line is something the
marker is likely to try.

### Database

- [ ] `schema.sql` imports with no errors into an empty database
- [ ] `seed.sql` imports after it with no errors
- [ ] The database contains 3 tables: `categories`, `events`, `registrations`
- [ ] `events` has `latitude` and `longitude` columns
- [ ] There are at least **10 rows** in `registrations`
- [ ] `registrations` has a unique key covering `(event_id, email)`
- [ ] Foreign keys exist from `events` → `categories` and `registrations` → `events`

### API

- [ ] `npm install` completes in the `api` folder
- [ ] The server starts and logs its listening port
- [ ] `GET /api/health` returns `"status":"ok"` and `"database":"mysql"` (not `"demo"`)
- [ ] `GET /api/events` lists the seeded events
- [ ] `GET /api/events/1` returns the event **and** a `registrations` array
- [ ] The registrations are ordered newest first
- [ ] `GET /api/events?search=byron` returns only matching events
- [ ] `POST /api/registrations` with valid data returns `201`
- [ ] `POST /api/registrations` with the **same email and event** returns `409`
- [ ] `DELETE /api/events/1` (an event with registrations) returns `409` with a clear message
- [ ] `DELETE` on an event with no registrations returns `200`
- [ ] `GET /api/weather/event/1` returns a daily forecast (needs outbound internet)
- [ ] `node tests/api.test.js` reports all tests passing

### Client website

- [ ] The home page loads and shows upcoming events (not a hard-coded list)
- [ ] The category tiles filter through to the search page
- [ ] Search filters by keyword, category, status and sort, and the result count changes
- [ ] A search with no matches shows the empty state, not a blank page
- [ ] The event detail page shows the event, the weather forecast and the registrations table
- [ ] The registrations are shown newest first
- [ ] The **Register** button goes to the registration page and carries the event id
- [ ] Submitting an empty form shows validation messages and does **not** call the API
- [ ] An invalid email shows the email validation message
- [ ] A valid submission shows the confirmation with a reference number
- [ ] Registering the same email twice for one event shows the "already registered" message
- [ ] Turning the API off shows a friendly error with a retry button, not a blank page

### Admin website

- [ ] The navigation menu (Dashboard, Events, New Event, Categories) is on **every** page
- [ ] The events list shows Active, Past **and** Suspended events
- [ ] The list can be filtered by status and searched
- [ ] Creating a new event works and the new event appears in the list
- [ ] Creating with missing required fields is blocked with validation messages
- [ ] Editing an event loads its current values and also shows its registrations
- [ ] Saving an edit updates the event
- [ ] Deleting an event that has registrations shows the blocked message clearly
- [ ] Deleting an event with no registrations succeeds

### Deployment (ULO3)

- [ ] The API is deployed to your own SCU cPanel and `/api/health` reports `mysql`
- [ ] The client website loads from the cPanel URL
- [ ] The admin website loads from `/admin` on the cPanel URL
- [ ] Both deployed sites fetch live data (adding an event in the admin site appears on the client site)

### Submission hygiene

- [ ] No `node_modules` folders inside any zip
- [ ] No `.env` file with real credentials inside any zip (`.env.example` is fine)
- [ ] No database passwords committed to GitHub
- [ ] The `docs/Peer Evaluation form - COMPLETED.docx` copy has been personalised and sent
- [ ] The GenAI declaration is included in the submission
- [ ] The academic integrity declaration is included in the submission
- [ ] The GitHub link in the submission opens for the marker
- [ ] The video link in the submission opens for the marker

## 5. Common last-minute problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| Marker sees `"database":"demo"` | `.env` has `USE_DEMO_DATA=true`, or the DB credentials are wrong | Set `USE_DEMO_DATA=false` and check `DB_*`; the `detail` field in `/api/health` names the actual error |
| `/admin` shows the client website | The admin build was not copied into `api/public/admin` | Rebuild the admin app and copy `dist/admin/browser/*` into `api/public/admin/` |
| Pages load but no events appear | The API is not running, or the URL is wrong | Open `/api/health` in a browser |
| Angular dev server will not start | Node version too old for Angular 22 | Use the bundled Node via `. .\tools\env.ps1` |
| Weather card says forecast unavailable | No outbound internet, or the event has no coordinates | Check the event has latitude/longitude; the rest of the page still works by design |
| Delete always blocked | The event genuinely has registrations — this is the required behaviour | Suspend the event instead, or delete a different event |
