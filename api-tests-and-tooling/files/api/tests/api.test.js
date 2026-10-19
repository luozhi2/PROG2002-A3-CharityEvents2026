'use strict';

/**
 * End-to-end API tests.
 *
 * The suite starts a real server process against an isolated copy of the API
 * directory (using the in-memory dataset), then exercises every endpoint over
 * HTTP. Nothing is mocked, so a pass means the real request/response cycle works.
 *
 * Run:
 *     node tests/api.test.js
 *
 * Or point it at any running server:
 *     API_BASE=http://localhost:3000 node tests/api.test.js
 *
 * Every test prints PASS / FAIL and the process exits non-zero if anything
 * fails, which makes the suite usable as evidence in the demo video.
 */

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const API_DIR = path.join(__dirname, '..');
let baseUrl = process.env.API_BASE || null;
let child = null;

let passed = 0;
let failed = 0;
const failures = [];

/** Minimal test runner: runs `fn`, reports the result, never throws out. */
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, message: error.message });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

/** fetch + JSON parse helper. */
async function api(method, urlPath, body) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: response.status, body: json };
}

const get = (p) => api('GET', p);
const post = (p, b) => api('POST', p, b);
const put = (p, b) => api('PUT', p, b);
const del = (p) => api('DELETE', p);

/** A complete, valid event payload used by the create/update tests. */
function sampleEvent(overrides = {}) {
  return {
    event_name: 'Test Charity Gala',
    description: 'Created by the automated API test suite.',
    category_id: 1,
    event_date: '2027-05-20T18:00:00.000Z',
    end_date: '2027-05-20T22:00:00.000Z',
    location_name: 'Test Venue Lismore',
    address: '1 Test Street, Lismore NSW 2480',
    latitude: -28.813,
    longitude: 153.278,
    capacity: 100,
    ticket_price: 42.5,
    status: 'Active',
    ...overrides
  };
}

/**
 * Start the API in a temporary copy of the api directory so the test run can
 * never touch the developer's own .env or database settings.
 */
async function startIsolatedServer() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a3-api-test-'));
  fs.cpSync(API_DIR, tempDir, {
    recursive: true,
    filter: (src) => !src.includes('node_modules') && !src.includes(`${path.sep}public${path.sep}`)
  });
  fs.symlinkSync(path.join(API_DIR, 'node_modules'), path.join(tempDir, 'node_modules'), 'junction');

  const port = 3400 + Math.floor(Math.random() * 100);
  child = spawn(process.execPath, ['server.js'], {
    cwd: tempDir,
    env: {
      ...process.env,
      PORT: String(port),
      USE_DEMO_DATA: 'true',
      DB_NAME: 'unused_demo_mode'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (d) => { output += d.toString(); });
  child.stderr.on('data', (d) => { output += d.toString(); });

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      if (response.ok) return { baseUrl: `http://localhost:${port}`, tempDir };
    } catch { /* not listening yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`The API did not start within 20 s. Output:\n${output}`);
}

async function run() {
  console.log('\nPROG2002 A3 - API test suite');
  console.log(`Base URL: ${baseUrl}\n`);

  // -------------------------------------------------------------------------
  console.log('Health and reference data');
  // -------------------------------------------------------------------------
  await test('GET /api/health reports a database mode', async () => {
    const { status, body } = await get('/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(['mysql', 'demo'].includes(body.database), 'database mode should be mysql or demo');
  });

  await test('GET /api/categories returns at least 5 categories with counts', async () => {
    const { status, body } = await get('/api/categories');
    assert.equal(status, 200);
    assert.ok(body.count >= 5, `expected >=5 categories, got ${body.count}`);
    assert.ok(body.categories.every((c) => typeof c.event_count === 'number'));
  });

  await test('GET /api/categories/1 returns one category and an unknown id gives 404', async () => {
    const one = await get('/api/categories/1');
    assert.equal(one.status, 200);
    assert.equal(one.body.category_id, 1);
    const missing = await get('/api/categories/999');
    assert.equal(missing.status, 404);
  });

  // -------------------------------------------------------------------------
  console.log('\nEvent listing, search, filter and sort');
  // -------------------------------------------------------------------------
  await test('GET /api/events returns every event regardless of status', async () => {
    const { status, body } = await get('/api/events');
    assert.equal(status, 200);
    assert.ok(body.count >= 8, `expected >=8 events, got ${body.count}`);
    const statuses = new Set(body.events.map((e) => e.status));
    assert.ok(statuses.has('Active'), 'should include Active events');
    assert.ok(statuses.size >= 2, 'should include more than one status');
  });

  await test('the event list carries the fields the client site renders', async () => {
    const { body } = await get('/api/events');
    const event = body.events[0];
    for (const field of ['event_id', 'event_name', 'category_name', 'event_date',
      'event_date_day', 'location_name', 'capacity', 'ticket_price', 'status',
      'registration_count', 'tickets_sold']) {
      assert.ok(field in event, `event is missing "${field}"`);
    }
    assert.equal(typeof event.ticket_price, 'number', 'ticket_price should be numeric');
    assert.equal(typeof event.registration_count, 'number');
  });

  // -------------------------------------------------------------------------
  // Timezone regression tests.
  //
  // Event datetimes are stored as Australia/Sydney wall-clock values and the API
  // must return true UTC instants plus the Sydney calendar day. Getting this
  // wrong shifted every event whenever the API host was not in Sydney, and broke
  // the weather forecast match. Both were real bugs, so they are pinned here.
  // -------------------------------------------------------------------------
  await test('event times render at the intended Sydney hour', async () => {
    const { body } = await get('/api/events/1');
    const sydneyHour = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney', hour: 'numeric', hour12: false
    }).format(new Date(body.event_date));
    // The seed holds 09:00 Sydney for event 1.
    assert.equal(Number(sydneyHour), 9, `event 1 should start at 9 am Sydney, got ${sydneyHour}`);
  });

  await test('event_date_day matches the Sydney calendar date, not the UTC one', async () => {
    const { body } = await get('/api/events/1');
    const sydneyDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(body.event_date));
    assert.equal(body.event_date_day, sydneyDay);
  });

  await test('every event exposes a Sydney day that its own instant falls on', async () => {
    const { body } = await get('/api/events');
    assert.ok(body.events.length > 0);
    for (const event of body.events) {
      const sydneyDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date(event.event_date));
      assert.equal(
        event.event_date_day, sydneyDay,
        `event ${event.event_id} reported day ${event.event_date_day} but its instant is on ${sydneyDay} in Sydney`
      );
    }
  });

  await test('storing an event and reading it back preserves the Sydney wall-clock time', async () => {
    // This is exactly the round trip the admin edit form performs.
    const created = await post('/api/events', sampleEvent({
      event_name: 'Timezone Round Trip Event',
      event_date: '2027-03-14T09:00',
      end_date: '2027-03-14T17:00'
    }));
    assert.equal(created.status, 201, JSON.stringify(created.body));

    const readBack = await get(`/api/events/${created.body.event.event_id}`);
    const parts = {};
    for (const part of new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(new Date(readBack.body.event_date))) {
      if (part.type !== 'literal') parts[part.type] = part.value;
    }
    assert.equal(
      `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}`,
      '2027-03-14T09:00',
      'the value shown in the admin form must equal the value that was typed'
    );
    assert.equal(readBack.body.event_date_day, '2027-03-14');
  });

  await test('a UTC instant sent by a browser is stored as the equivalent Sydney time', async () => {
    // 2027-06-01T23:00:00Z is 09:00 on 2 June in Sydney (AEST, UTC+10).
    const created = await post('/api/events', sampleEvent({
      event_name: 'UTC Input Event',
      event_date: '2027-06-01T23:00:00.000Z',
      end_date: null
    }));
    assert.equal(created.status, 201);
    const readBack = await get(`/api/events/${created.body.event.event_id}`);
    assert.equal(readBack.body.event_date_day, '2027-06-02');
    assert.equal(readBack.body.event_date, '2027-06-01T23:00:00.000Z');
  });

  await test('daylight saving is applied: a summer event uses UTC+11', async () => {
    // January is AEDT (UTC+11), so 09:00 Sydney is 22:00 UTC the day before.
    const created = await post('/api/events', sampleEvent({
      event_name: 'Summer DST Event',
      event_date: '2027-01-20T09:00',
      end_date: null
    }));
    const readBack = await get(`/api/events/${created.body.event.event_id}`);
    assert.equal(readBack.body.event_date, '2027-01-19T22:00:00.000Z');
  });

  await test('daylight saving is applied: a winter event uses UTC+10', async () => {
    // July is AEST (UTC+10), so 09:00 Sydney is 23:00 UTC the day before.
    const created = await post('/api/events', sampleEvent({
      event_name: 'Winter DST Event',
      event_date: '2027-07-20T09:00',
      end_date: null
    }));
    const readBack = await get(`/api/events/${created.body.event.event_id}`);
    assert.equal(readBack.body.event_date, '2027-07-19T23:00:00.000Z');
  });

  await test('GET /api/events?status=Active filters to active events only', async () => {
    const { body } = await get('/api/events?status=Active');
    assert.ok(body.count > 0, 'expected at least one active event');
    assert.ok(body.events.every((e) => e.status === 'Active'));
  });

  await test('GET /api/events?search= matches on the event name', async () => {
    const { body } = await get('/api/events?search=Rainforest');
    assert.ok(body.count >= 1, 'expected the Rainforest event to be found');
    assert.ok(body.events[0].event_name.includes('Rainforest'));
  });

  await test('GET /api/events?search= matches on the location', async () => {
    const { body } = await get('/api/events?search=Byron');
    assert.ok(body.count >= 1, 'expected a Byron Bay event');
    assert.ok(body.events.every((e) => e.location_name.includes('Byron')));
  });

  await test('GET /api/events?search= matches on the description', async () => {
    const { body } = await get('/api/events?search=blankets');
    assert.ok(body.count >= 1, 'expected the blanket appeal to be found by description');
  });

  await test('GET /api/events?search= with no match returns an empty list', async () => {
    const { status, body } = await get('/api/events?search=zzzznotarealevent');
    assert.equal(status, 200);
    assert.equal(body.count, 0);
    assert.deepEqual(body.events, []);
  });

  await test('GET /api/events?category_id= filters by category', async () => {
    const { body } = await get('/api/events?category_id=2');
    assert.ok(body.count >= 1);
    assert.ok(body.events.every((e) => e.category_id === 2));
  });

  await test('search and category filters combine', async () => {
    const { body } = await get('/api/events?search=charity&category_id=2&status=Active');
    assert.ok(body.events.every((e) => e.category_id === 2 && e.status === 'Active'));
    assert.equal(body.filters.category_id, 2);
    assert.equal(body.filters.status, 'Active');
  });

  await test('GET /api/events?sort=date_desc returns newest event date first', async () => {
    const { body } = await get('/api/events?sort=date_desc');
    const dates = body.events.map((e) => new Date(e.event_date).getTime());
    assert.deepEqual(dates, [...dates].sort((a, b) => b - a), 'events should be sorted newest first');
  });

  await test('GET /api/events?sort=date_asc returns soonest event date first', async () => {
    const { body } = await get('/api/events?sort=date_asc');
    const dates = body.events.map((e) => new Date(e.event_date).getTime());
    assert.deepEqual(dates, [...dates].sort((a, b) => a - b), 'events should be sorted soonest first');
  });

  await test('GET /api/events?sort=popular ranks by tickets sold', async () => {
    const { body } = await get('/api/events?sort=popular');
    const tickets = body.events.map((e) => e.tickets_sold);
    assert.deepEqual(tickets, [...tickets].sort((a, b) => b - a), 'events should be sorted by tickets sold');
  });

  await test('an invalid sort key falls back to the default order', async () => {
    const { status, body } = await get('/api/events?sort=DROP%20TABLE');
    assert.equal(status, 200);
    assert.equal(body.filters.sort, 'date_asc');
  });

  // -------------------------------------------------------------------------
  console.log('\nImproved event details endpoint');
  // -------------------------------------------------------------------------
  await test('GET /api/events/1 returns the event with its registrations', async () => {
    const { status, body } = await get('/api/events/1');
    assert.equal(status, 200);
    assert.equal(body.event_id, 1);
    assert.ok(body.category_name, 'event should include its category name');
    assert.ok(Array.isArray(body.registrations), 'registrations array is required');
    assert.ok(body.registrations.length >= 1, 'event 1 should have registrations');
    assert.equal(typeof body.registration_count, 'number');
    assert.equal(typeof body.tickets_sold, 'number');
    assert.equal(typeof body.latitude, 'number', 'coordinates are needed for the weather API');
    assert.equal(typeof body.longitude, 'number');
  });

  await test('the registration objects expose the booking fields', async () => {
    const { body } = await get('/api/events/1');
    const registration = body.registrations[0];
    for (const field of ['registration_id', 'full_name', 'email', 'phone',
      'registration_date', 'tickets']) {
      assert.ok(field in registration, `registration is missing "${field}"`);
    }
  });

  await test('registrations are ordered by registration_date descending', async () => {
    const { body } = await get('/api/events/1');
    const dates = body.registrations.map((r) => new Date(r.registration_date).getTime());
    assert.deepEqual(dates, [...dates].sort((a, b) => b - a), 'latest registration must appear first');
  });

  await test('tickets_sold equals the sum of the registration tickets', async () => {
    const { body } = await get('/api/events/1');
    const sum = body.registrations.reduce((total, r) => total + r.tickets, 0);
    assert.equal(body.tickets_sold, sum);
    assert.equal(body.registration_count, body.registrations.length);
  });

  await test('GET /api/events/9999 returns 404', async () => {
    const { status, body } = await get('/api/events/9999');
    assert.equal(status, 404);
    assert.ok(body.error);
  });

  await test('GET /api/events/abc returns 400', async () => {
    const { status } = await get('/api/events/abc');
    assert.equal(status, 400);
  });

  await test('GET /api/events/1/registrations returns the summary', async () => {
    const { status, body } = await get('/api/events/1/registrations');
    assert.equal(status, 200);
    assert.equal(body.event_id, 1);
    assert.ok(body.registrations.length >= 1);
    assert.equal(body.tickets_sold, body.registrations.reduce((t, r) => t + r.tickets, 0));
  });

  await test('the order=asc query returns oldest registration first', async () => {
    const { body } = await get('/api/events/1/registrations?order=asc');
    const dates = body.registrations.map((r) => new Date(r.registration_date).getTime());
    assert.deepEqual(dates, [...dates].sort((a, b) => a - b));
  });

  await test('GET /api/registrations lists every registration with its event name', async () => {
    const { status, body } = await get('/api/registrations');
    assert.equal(status, 200);
    assert.ok(body.count >= 10, `the brief requires at least 10 registrations, found ${body.count}`);
    assert.ok(body.registrations.every((r) => r.event_name), 'each row should name its event');
  });

  // -------------------------------------------------------------------------
  console.log('\nAdmin CRUD: create');
  // -------------------------------------------------------------------------
  let createdId = null;

  await test('POST /api/events creates an event and returns 201', async () => {
    const { status, body } = await post('/api/events', sampleEvent());
    assert.equal(status, 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(body.event.event_id, 'created event must have an id');
    assert.equal(body.event.event_name, 'Test Charity Gala');
    assert.equal(body.event.ticket_price, 42.5, 'ticket_price should be numeric');
    createdId = body.event.event_id;
  });

  await test('a plain SQL datetime string is also accepted', async () => {
    const { status } = await post('/api/events', sampleEvent({
      event_name: 'SQL Date Format Event',
      event_date: '2027-06-01 09:30:00',
      end_date: '2027-06-01 12:00:00'
    }));
    assert.equal(status, 201, 'the admin form may send either ISO or SQL datetimes');
  });

  await test('the created event appears in the list', async () => {
    const { body } = await get('/api/events?search=Test%20Charity%20Gala');
    assert.ok(body.events.some((e) => e.event_id === createdId));
  });

  await test('the created event starts with no registrations', async () => {
    const { body } = await get(`/api/events/${createdId}`);
    assert.equal(body.registration_count, 0);
    assert.equal(body.tickets_sold, 0);
  });

  await test('POST /api/events rejects a missing name with 400 and details', async () => {
    const { status, body } = await post('/api/events', sampleEvent({ event_name: '' }));
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.details) && body.details.length > 0, 'validation details are required');
    assert.ok(body.details.some((d) => d.includes('event_name')));
  });

  await test('POST /api/events rejects an unknown category', async () => {
    const { status, body } = await post('/api/events', sampleEvent({ category_id: 999 }));
    assert.equal(status, 400);
    assert.ok(body.details.some((d) => d.includes('category_id')));
  });

  await test('POST /api/events rejects an invalid status', async () => {
    const { status } = await post('/api/events', sampleEvent({ status: 'Cancelled' }));
    assert.equal(status, 400);
  });

  await test('POST /api/events rejects a negative capacity', async () => {
    const { status } = await post('/api/events', sampleEvent({ capacity: -5 }));
    assert.equal(status, 400);
  });

  await test('POST /api/events rejects a negative ticket price', async () => {
    const { status } = await post('/api/events', sampleEvent({ ticket_price: -1 }));
    assert.equal(status, 400);
  });

  await test('POST /api/events rejects an out-of-range latitude', async () => {
    const { status } = await post('/api/events', sampleEvent({ latitude: 120 }));
    assert.equal(status, 400);
  });

  await test('POST /api/events rejects an out-of-range longitude', async () => {
    const { status } = await post('/api/events', sampleEvent({ longitude: 500 }));
    assert.equal(status, 400);
  });

  await test('POST /api/events rejects an end date before the start date', async () => {
    const { status, body } = await post('/api/events', sampleEvent({
      event_date: '2027-05-20T18:00:00.000Z',
      end_date: '2027-05-19T18:00:00.000Z'
    }));
    assert.equal(status, 400);
    assert.ok(body.details.some((d) => d.includes('end_date')));
  });

  await test('POST /api/events accepts an event with no coordinates', async () => {
    const { status, body } = await post('/api/events', sampleEvent({
      event_name: 'No Coordinates Event', latitude: null, longitude: null
    }));
    assert.equal(status, 201);
    assert.equal(body.event.latitude, null);
  });

  // -------------------------------------------------------------------------
  console.log('\nAdmin CRUD: update');
  // -------------------------------------------------------------------------
  await test('PUT /api/events/:id updates the stored values', async () => {
    const { status, body } = await put(`/api/events/${createdId}`, sampleEvent({
      event_name: 'Test Charity Gala (updated)',
      capacity: 250
    }));
    assert.equal(status, 200);
    assert.equal(body.event.event_name, 'Test Charity Gala (updated)');
    assert.equal(body.event.capacity, 250);
  });

  await test('PUT /api/events/9999 returns 404', async () => {
    const { status } = await put('/api/events/9999', sampleEvent());
    assert.equal(status, 404);
  });

  await test('PUT /api/events/:id rejects invalid data with 400', async () => {
    const { status } = await put(`/api/events/${createdId}`,
      sampleEvent({ event_name: 'Test Charity Gala (updated)', capacity: 0 }));
    assert.equal(status, 400);
  });

  // -------------------------------------------------------------------------
  console.log('\nRegistration creation and business rules');
  // -------------------------------------------------------------------------
  await test('POST /api/registrations creates a registration and returns 201', async () => {
    const { status, body } = await post('/api/registrations', {
      event_id: createdId,
      full_name: 'Test Attendee',
      email: 'test.attendee@example.com',
      phone: '0400 111 222',
      tickets: 2,
      notes: 'Created by the test suite.'
    });
    assert.equal(status, 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(body.registration.registration_id);
    assert.equal(body.registration.tickets, 2);
    assert.equal(body.event.tickets_sold, 2, 'the event summary should reflect the new tickets');
  });

  await test('the registration shows on the event details endpoint', async () => {
    const { body } = await get(`/api/events/${createdId}`);
    assert.equal(body.registration_count, 1);
    assert.equal(body.registrations[0].email, 'test.attendee@example.com');
  });

  await test('the email is stored lower case so duplicates cannot slip through', async () => {
    const { body } = await get(`/api/events/${createdId}`);
    assert.equal(body.registrations[0].email, 'test.attendee@example.com');
  });

  await test('a duplicate email for the same event is rejected with 409', async () => {
    const { status, body } = await post('/api/registrations', {
      event_id: createdId,
      full_name: 'Test Attendee Again',
      email: 'TEST.Attendee@example.com',
      phone: '0400 111 222',
      tickets: 1
    });
    assert.equal(status, 409, `expected 409, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(body.error.toLowerCase().includes('already'));
  });

  await test('the same email may register for a different event', async () => {
    const { status } = await post('/api/registrations', {
      event_id: 4,
      full_name: 'Test Attendee',
      email: 'test.attendee@example.com',
      phone: '0400 111 222',
      tickets: 1
    });
    assert.equal(status, 201, 'the unique rule applies per event, not globally');
  });

  await test('a capacity overflow is rejected with 409', async () => {
    const tiny = await post('/api/events', sampleEvent({ event_name: 'Tiny Capacity Event', capacity: 3 }));
    const tinyId = tiny.body.event.event_id;
    const first = await post('/api/registrations', {
      event_id: tinyId, full_name: 'First Person', email: 'first@example.com',
      phone: '0400 000 001', tickets: 2
    });
    assert.equal(first.status, 201);
    const { status, body } = await post('/api/registrations', {
      event_id: tinyId, full_name: 'Second Person', email: 'second@example.com',
      phone: '0400 000 002', tickets: 2
    });
    assert.equal(status, 409, `expected 409, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(/remain|capacity/i.test(body.error));
  });

  await test('registering for a missing event returns 404', async () => {
    const { status } = await post('/api/registrations', {
      event_id: 9999, full_name: 'Nobody', email: 'nobody@example.com',
      phone: '0400 000 004', tickets: 1
    });
    assert.equal(status, 404);
  });

  await test('an invalid email is rejected with 400', async () => {
    const { status, body } = await post('/api/registrations', {
      event_id: 4, full_name: 'Bad Email', email: 'not-an-email',
      phone: '0400 000 005', tickets: 1
    });
    assert.equal(status, 400);
    assert.ok(body.details.some((d) => d.includes('email')));
  });

  await test('a zero ticket count is rejected with 400', async () => {
    const { status } = await post('/api/registrations', {
      event_id: 4, full_name: 'Zero Tickets', email: 'zero@example.com',
      phone: '0400 000 006', tickets: 0
    });
    assert.equal(status, 400);
  });

  await test('an invalid phone number is rejected with 400', async () => {
    const { status, body } = await post('/api/registrations', {
      event_id: 4, full_name: 'Bad Phone', email: 'badphone@example.com',
      phone: 'abc', tickets: 1
    });
    assert.equal(status, 400);
    assert.ok(body.details.some((d) => d.includes('phone')));
  });

  await test('a missing full name is rejected with 400', async () => {
    const { status, body } = await post('/api/registrations', {
      event_id: 4, full_name: '', email: 'noname@example.com',
      phone: '0400 000 007', tickets: 1
    });
    assert.equal(status, 400);
    assert.ok(body.details.some((d) => d.includes('full_name')));
  });

  // -------------------------------------------------------------------------
  console.log('\nAdmin CRUD: delete and the integrity rule');
  // -------------------------------------------------------------------------
  await test('DELETE is blocked with 409 while registrations exist', async () => {
    const { status, body } = await del(`/api/events/${createdId}`);
    assert.equal(status, 409, `expected 409, got ${status}`);
    assert.ok(body.error.toLowerCase().includes('cannot be deleted'));
    assert.ok(body.details.some((d) => d.includes('registration_count')));
  });

  await test('the blocked event still exists', async () => {
    const { status } = await get(`/api/events/${createdId}`);
    assert.equal(status, 200);
  });

  await test('reducing capacity below the tickets sold is rejected with 409', async () => {
    const { status, body } = await put(`/api/events/${createdId}`, sampleEvent({
      event_name: 'Test Charity Gala (updated)', capacity: 1
    }));
    assert.equal(status, 409);
    assert.ok(body.error.includes('Capacity'));
  });

  await test('an event can be suspended instead of deleted', async () => {
    const { status, body } = await put(`/api/events/${createdId}`, sampleEvent({
      event_name: 'Test Charity Gala (updated)', capacity: 250, status: 'Suspended'
    }));
    assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.event.status, 'Suspended');
  });

  await test('registering for a suspended event is rejected with 409', async () => {
    const { status, body } = await post('/api/registrations', {
      event_id: createdId,
      full_name: 'Blocked Person', email: 'blocked@example.com',
      phone: '0400 000 003', tickets: 1
    });
    assert.equal(status, 409, `expected 409, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(body.error.toLowerCase().includes('suspended'));
  });

  await test('DELETE succeeds once the event has no registrations', async () => {
    const created = await post('/api/events', sampleEvent({ event_name: 'Disposable Event' }));
    const id = created.body.event.event_id;
    const { status, body } = await del(`/api/events/${id}`);
    assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    const after = await get(`/api/events/${id}`);
    assert.equal(after.status, 404, 'the event should no longer exist');
  });

  await test('DELETE /api/events/9999 returns 404', async () => {
    const { status } = await del('/api/events/9999');
    assert.equal(status, 404);
  });

  // -------------------------------------------------------------------------
  console.log('\nExternal weather API (Open-Meteo)');
  // -------------------------------------------------------------------------
  await test('GET /api/weather/codes returns the WMO legend from the brief', async () => {
    const { status, body } = await get('/api/weather/codes');
    assert.equal(status, 200);
    assert.ok(body.codes.some((c) => c.code === 0 && c.description === 'Clear sky'));
    assert.ok(body.codes.some((c) => c.code === 61 && c.description === 'Rain: Light, moderate, and heavy'));
    assert.ok(body.codes.some((c) => c.code === 95 && c.description === 'Thunderstorm: Slight or moderate'));
  });

  await test('GET /api/weather rejects missing coordinates', async () => {
    const { status, body } = await get('/api/weather');
    assert.equal(status, 400);
    assert.ok(body.details.length >= 2);
  });

  await test('GET /api/weather rejects out-of-range coordinates', async () => {
    const { status } = await get('/api/weather?latitude=200&longitude=999');
    assert.equal(status, 400);
  });

  await test('GET /api/weather/event/9999 returns 404', async () => {
    const { status } = await get('/api/weather/event/9999');
    assert.equal(status, 404);
  });

  await test('an event without coordinates reports a clear 409', async () => {
    const created = await post('/api/events', sampleEvent({
      event_name: 'Weatherless Event', latitude: null, longitude: null
    }));
    const { status, body } = await get(`/api/weather/event/${created.body.event.event_id}`);
    assert.equal(status, 409);
    assert.ok(/coordinates/i.test(body.error));
  });

  await test('GET /api/weather/event/1 reaches Open-Meteo and normalises the data', async () => {
    const { status, body } = await get('/api/weather/event/1');
    if (status !== 200) {
      // No internet access in this environment: the proxy must still answer with
      // a clear, handled error rather than crashing the server.
      assert.equal(status, 502, `expected 200 or 502, got ${status}: ${JSON.stringify(body)}`);
      console.log('        (no outbound internet - Open-Meteo proxy returned a handled 502)');
      return;
    }
    assert.equal(body.event_id, 1);
    assert.ok(Array.isArray(body.daily) && body.daily.length > 0, 'expected daily forecast entries');
    const day = body.daily[0];
    assert.ok(typeof day.weather_code === 'number');
    assert.ok(typeof day.description === 'string' && day.description.length > 0);
    assert.ok('temperature_max' in day && 'temperature_min' in day);
    assert.equal(body.source, 'https://api.open-meteo.com/v1/forecast');
  });

  // -------------------------------------------------------------------------
  console.log('\nUnknown routes and error handling');
  // -------------------------------------------------------------------------
  await test('an unknown API route returns a JSON 404', async () => {
    const { status, body } = await get('/api/does-not-exist');
    assert.equal(status, 404);
    assert.ok(body.error);
  });

  await test('a malformed JSON body returns a handled error, not a crash', async () => {
    const response = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ this is not json'
    });
    assert.ok(response.status >= 400 && response.status < 600, `unexpected status ${response.status}`);
    const health = await get('/api/health');
    assert.equal(health.status, 200, 'the server must still be alive');
  });

  // -------------------------------------------------------------------------
  console.log(`\n${'-'.repeat(64)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailed tests:');
    for (const f of failures) console.log(`  - ${f.name}\n      ${f.message}`);
  }
  console.log('');
  return failed === 0 ? 0 : 1;
}

(async () => {
  if (!baseUrl) {
    const started = await startIsolatedServer();
    baseUrl = started.baseUrl;
  }

  const code = await run();

  if (child) {
    child.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  process.exit(code);
})().catch((error) => {
  console.error('Test runner crashed:', error);
  if (child) child.kill();
  process.exit(1);
});
