'use strict';

/**
 * Timezone handling for the Charity Events case study.
 *
 * THE CONVENTION
 * --------------
 * Every event happens in the Northern Rivers region of New South Wales, so all
 * event datetimes are **Australia/Sydney wall-clock times**:
 *
 *   - MySQL stores a naive DATETIME, e.g. "2026-10-28 09:00:00", meaning
 *     9:00 am in Sydney. This is what seed.sql inserts and what staff type into
 *     the admin form.
 *   - The API converts that to a real UTC instant and serialises it with the
 *     correct offset, so a browser anywhere in the world renders the time that
 *     was actually intended. 09:00 Sydney becomes
 *     "2026-10-27T22:00:00.000Z" (AEDT, UTC+11).
 *   - The Angular apps therefore parse plain ISO instants and never have to
 *     guess a timezone.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Naively doing `new Date('2026-10-28 09:00:00')` lets the *server's* timezone
 * decide what the value means. On a cPanel host running in UTC that silently
 * shifts every event by 11 hours. Everything timezone-related goes through the
 * two functions below instead.
 *
 * Daylight saving: Sydney switches between AEST (UTC+10) and AEDT (UTC+11), and
 * the switch happens at 2 am on a Sunday. Both functions derive the offset for
 * the specific date from the IANA database, so summer and winter events are both
 * correct.
 */

/** The IANA zone every event datetime is expressed in. */
const EVENT_TIME_ZONE = 'Australia/Sydney';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Matches a naive SQL DATETIME ("2026-10-28 09:00:00" or "...T09:00:00"). */
const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

const pad = (value, width = 2) => String(value).padStart(width, '0');

/**
 * Offset of a timezone from UTC, in minutes, at a given moment.
 * Sydney returns 660 (UTC+11) in summer and 600 (UTC+10) in winter.
 */
function zoneOffsetMinutes(instant, timeZone = EVENT_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const parts = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }

  // "24" is returned for midnight by some ICU versions; normalise it.
  const hour = parts.hour === 24 ? 0 : parts.hour;

  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, hour, parts.minute, parts.second);
  return Math.round((asUtc - instant.getTime()) / MS_PER_MINUTE);
}

/**
 * Turn a Sydney wall-clock datetime into the true UTC instant.
 *
 * "2026-10-28 09:00:00" -> Date for 2026-10-27T22:00:00.000Z
 *
 * The offset is resolved twice: the first guess uses the offset at the naive
 * instant, the second re-checks it at the corrected instant.
 *
 * KNOWN LIMITATION - the two hours a year when Sydney changes offset:
 *   - Spring forward (early October): 2:00-3:00 am does not exist. Such a value
 *     is normalised forward, so "02:30" becomes 03:30.
 *   - Fall back (early April): 2:00-3:00 am happens twice. Such a value resolves
 *     to the first occurrence, so re-opening it in the admin form shows 03:30.
 * Both cases are outside the hours a charity event would realistically start, and
 * every other time of year round-trips exactly. Verified in tests/timezone.test.js.
 *
 * @returns {Date|null} null when the input is empty or not a naive datetime.
 */
function sydneyWallClockToInstant(value, timeZone = EVENT_TIME_ZONE) {
  if (value === null || value === undefined || value === '') return null;

  // Already an instant (has a Z or an offset): keep it as-is.
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  const match = NAIVE_DATETIME.exec(raw);
  if (!match) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day, hour, minute, second = '00'] = match;
  const naiveAsUtc = Date.UTC(
    Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second)
  );
  if (Number.isNaN(naiveAsUtc)) return null;

  // Pass 1: assume the offset in force at the naive instant.
  let offset = zoneOffsetMinutes(new Date(naiveAsUtc), timeZone);
  let candidate = naiveAsUtc - offset * MS_PER_MINUTE;

  // Pass 2: re-derive the offset at the corrected instant.
  const refined = zoneOffsetMinutes(new Date(candidate), timeZone);
  if (refined !== offset) {
    offset = refined;
    candidate = naiveAsUtc - offset * MS_PER_MINUTE;
  }

  return new Date(candidate);
}

/**
 * The calendar date a moment falls on **in Sydney**, as "YYYY-MM-DD".
 *
 * Used to line an event up with the Open-Meteo forecast, whose `daily[].date`
 * values are local dates. Comparing a UTC date instead is wrong for any event
 * before 11 am Sydney time.
 */
function sydneyDateKey(value, timeZone = EVENT_TIME_ZONE) {
  const instant = value instanceof Date ? value : sydneyWallClockToInstant(value, timeZone);
  if (!instant) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return formatter.format(instant); // en-CA yields YYYY-MM-DD
}

/**
 * Inverse of sydneyWallClockToInstant: express an instant as the
 * "YYYY-MM-DDTHH:mm" string an <input type="datetime-local"> expects, showing
 * the Sydney wall-clock time.
 *
 * The admin form uses this so staff always see and edit the venue's local time,
 * no matter which timezone their own computer is in.
 */
function instantToSydneyInputValue(value, timeZone = EVENT_TIME_ZONE) {
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  const parts = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }

  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

/**
 * A human label for the Sydney offset on a given date, e.g. "AEDT (UTC+11)".
 * Handy in documentation and for asserting daylight-saving behaviour in tests.
 */
function sydneyOffsetLabel(value) {
  const instant = value instanceof Date ? value : sydneyWallClockToInstant(value);
  if (!instant) return '';
  const offset = zoneOffsetMinutes(instant);
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const suffix = minutes ? `:${pad(minutes)}` : '';
  const abbreviation = offset === 660 ? 'AEDT' : offset === 600 ? 'AEST' : 'AEST/AEDT';
  return `${abbreviation} (UTC${sign}${hours}${suffix})`;
}

/**
 * A naive Sydney wall-clock string for "now plus N days" at a fixed local time.
 * Used to build the demonstration dataset so upcoming events stay upcoming.
 *
 * @param {number} days   offset from today (may be negative)
 * @param {number} hour   Sydney local hour, 0-23
 * @param {number} minute Sydney local minute
 * @returns {string} "YYYY-MM-DD HH:MM:SS" in Sydney wall-clock time
 */
function sydneyWallClockIn(days, hour = 9, minute = 0) {
  // Work out today's Sydney date, then move by whole days in UTC to avoid
  // daylight-saving arithmetic on the day boundary.
  const todayKey = sydneyDateKey(new Date());
  const [year, month, day] = todayKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const dateKey = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
  return `${dateKey} ${pad(hour)}:${pad(minute)}:00`;
}

module.exports = {
  EVENT_TIME_ZONE,
  zoneOffsetMinutes,
  sydneyWallClockToInstant,
  sydneyDateKey,
  instantToSydneyInputValue,
  sydneyOffsetLabel,
  sydneyWallClockIn,
  MS_PER_DAY
};
