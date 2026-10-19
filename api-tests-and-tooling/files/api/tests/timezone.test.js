'use strict';

/**
 * Unit tests for the timezone helpers.
 *
 * These pin down the exact behaviour the whole application depends on, including
 * the daylight-saving transitions, so a future change cannot silently shift every
 * event by an hour.
 *
 * Run:  node tests/timezone.test.js
 */

const assert = require('node:assert/strict');
const {
  EVENT_TIME_ZONE,
  zoneOffsetMinutes,
  sydneyWallClockToInstant,
  sydneyDateKey,
  instantToSydneyInputValue,
  sydneyOffsetLabel,
  sydneyWallClockIn
} = require('../lib/timezone');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

console.log('\nTimezone helper tests');
console.log(`Event timezone: ${EVENT_TIME_ZONE}\n`);

// ---------------------------------------------------------------------------
console.log('Daylight saving offsets');
// ---------------------------------------------------------------------------
test('Sydney is UTC+11 (AEDT) in January', () => {
  assert.equal(zoneOffsetMinutes(new Date('2026-01-15T00:00:00Z')), 660);
});

test('Sydney is UTC+10 (AEST) in July', () => {
  assert.equal(zoneOffsetMinutes(new Date('2026-07-15T00:00:00Z')), 600);
});

test('the offset label names the abbreviation and the offset', () => {
  assert.equal(sydneyOffsetLabel('2026-01-15 12:00:00'), 'AEDT (UTC+11)');
  assert.equal(sydneyOffsetLabel('2026-07-15 12:00:00'), 'AEST (UTC+10)');
});

// ---------------------------------------------------------------------------
console.log('\nSydney wall clock -> UTC instant');
// ---------------------------------------------------------------------------
test('09:00 Sydney in summer becomes 22:00 UTC the previous day', () => {
  const instant = sydneyWallClockToInstant('2026-01-15 09:00:00');
  assert.equal(instant.toISOString(), '2026-01-14T22:00:00.000Z');
});

test('09:00 Sydney in winter becomes 23:00 UTC the previous day', () => {
  const instant = sydneyWallClockToInstant('2026-07-15 09:00:00');
  assert.equal(instant.toISOString(), '2026-07-14T23:00:00.000Z');
});

test('both ISO and SQL datetime spellings are accepted', () => {
  const sql = sydneyWallClockToInstant('2026-03-14 09:00:00');
  const iso = sydneyWallClockToInstant('2026-03-14T09:00:00');
  assert.equal(sql.toISOString(), iso.toISOString());
});

test('seconds may be omitted', () => {
  assert.equal(
    sydneyWallClockToInstant('2026-03-14 09:00').toISOString(),
    sydneyWallClockToInstant('2026-03-14 09:00:00').toISOString()
  );
});

test('an explicit instant is passed through untouched', () => {
  const instant = sydneyWallClockToInstant('2026-03-14T09:00:00.000Z');
  assert.equal(instant.toISOString(), '2026-03-14T09:00:00.000Z');
});

test('empty and unparseable values return null', () => {
  assert.equal(sydneyWallClockToInstant(''), null);
  assert.equal(sydneyWallClockToInstant(null), null);
  assert.equal(sydneyWallClockToInstant('not a date'), null);
});

// ---------------------------------------------------------------------------
console.log('\nRound trip is stable (the admin edit form depends on this)');
// ---------------------------------------------------------------------------
for (const wallClock of [
  '2026-01-15 09:00:00',
  '2026-07-15 09:00:00',
  '2026-04-05 01:30:00', // just before the DST changeover
  '2026-10-04 03:30:00', // just after the DST changeover
  '2026-12-31 23:45:00'
]) {
  test(`instantToSydneyInputValue(sydneyWallClockToInstant("${wallClock}")) returns the same wall clock`, () => {
    const instant = sydneyWallClockToInstant(wallClock);
    const back = instantToSydneyInputValue(instant);
    const expected = wallClock.slice(0, 16).replace(' ', 'T');
    assert.equal(back, expected, `round trip produced ${back}, expected ${expected}`);
  });
}

test('the datetime-local value never carries a timezone suffix', () => {
  const value = instantToSydneyInputValue(sydneyWallClockToInstant('2026-01-15 09:00:00'));
  assert.equal(value, '2026-01-15T09:00');
  assert.ok(!value.includes('Z'));
});

// ---------------------------------------------------------------------------
console.log('\nSydney calendar day (used to match the weather forecast)');
// ---------------------------------------------------------------------------
test('a 09:00 Sydney event is that same Sydney day, not the previous UTC day', () => {
  const instant = sydneyWallClockToInstant('2026-01-15 09:00:00');
  // The UTC date is the 14th; the Sydney date must still be the 15th.
  assert.equal(instant.toISOString().slice(0, 10), '2026-01-14');
  assert.equal(sydneyDateKey(instant), '2026-01-15');
});

test('a 23:00 Sydney event stays on its own Sydney day', () => {
  const instant = sydneyWallClockToInstant('2026-01-15 23:00:00');
  assert.equal(sydneyDateKey(instant), '2026-01-15');
});

test('a midnight Sydney event is dated to the new day', () => {
  const instant = sydneyWallClockToInstant('2026-01-15 00:30:00');
  assert.equal(sydneyDateKey(instant), '2026-01-15');
});

test('sydneyDateKey accepts a wall-clock string directly', () => {
  assert.equal(sydneyDateKey('2026-07-15 09:00:00'), '2026-07-15');
});

// ---------------------------------------------------------------------------
console.log('\nRelative date construction for the demo dataset');
// ---------------------------------------------------------------------------
test('sydneyWallClockIn returns a naive SQL datetime at the requested time', () => {
  const value = sydneyWallClockIn(12, 9, 0);
  assert.match(value, /^\d{4}-\d{2}-\d{2} 09:00:00$/);
});

test('sydneyWallClockIn uses the Sydney day, not the host day', () => {
  // 15:00 UTC is already the next day in Sydney during AEDT, so the date built
  // from "today in Sydney" must reflect that.
  const todayInSydney = sydneyDateKey(new Date());
  assert.equal(sydneyWallClockIn(0, 9, 0).slice(0, 10), todayInSydney);
});

test('a negative offset produces a past date and a positive one a future date', () => {
  const past = sydneyWallClockIn(-30, 9, 0).slice(0, 10);
  const future = sydneyWallClockIn(30, 9, 0).slice(0, 10);
  assert.ok(past < future, `${past} should be before ${future}`);
});

test('dates produced by sydneyWallClockIn convert back to the same Sydney day', () => {
  for (const days of [-70, -35, -1, 0, 1, 6, 12, 25, 40, 55]) {
    const wallClock = sydneyWallClockIn(days, 9, 0);
    const instant = sydneyWallClockToInstant(wallClock);
    assert.equal(
      sydneyDateKey(instant),
      wallClock.slice(0, 10),
      `day ${days}: ${wallClock} did not round trip`
    );
  }
});

// ---------------------------------------------------------------------------
console.log(`\n${'-'.repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
