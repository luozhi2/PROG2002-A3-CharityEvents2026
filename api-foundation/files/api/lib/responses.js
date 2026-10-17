'use strict';

/**
 * Helpers that shape every API response, so the JSON returned to the Angular
 * apps always has the same types and field names (documented in
 * docs/BUILD-CONTRACT.md).
 */

const { sydneyWallClockToInstant, sydneyDateKey } = require('./timezone');

/**
 * Normalise a datetime value into an ISO-8601 UTC instant, or null.
 *
 * MySQL hands back a naive string such as "2026-10-28 09:00:00", which means
 * 9:00 am **Sydney** time - not the API host's local time. Interpreting it with
 * the host timezone is what used to shift every event whenever the server did
 * not run in Sydney, so the conversion is delegated to lib/timezone.js.
 */
function iso(value) {
  if (!value) return null;
  const instant = sydneyWallClockToInstant(value);
  return instant ? instant.toISOString() : null;
}

/**
 * The Sydney calendar date ("YYYY-MM-DD") that a datetime falls on.
 *
 * The client compares this against Open-Meteo's daily[].date, which is a local
 * date. Deriving the day from the UTC instant instead would be wrong for any
 * event starting before 11 am Sydney time (the UTC date is then the day before).
 */
function dayKey(value) {
  if (!value) return null;
  return sydneyDateKey(value);
}

/** Convert a database numeric string ("15.00") into a real number. */
function num(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Shape one event row for the client. */
function eventJson(row) {
  if (!row) return null;
  return {
    event_id: Number(row.event_id),
    category_id: Number(row.category_id),
    category_name: row.category_name ?? null,
    category_description: row.category_description ?? null,
    event_name: row.event_name,
    description: row.description ?? null,
    // A true UTC instant: a browser in any timezone renders the intended time.
    event_date: iso(row.event_date),
    end_date: iso(row.end_date),
    // The Sydney calendar day, ready to match against the weather forecast.
    event_date_day: dayKey(row.event_date),
    end_date_day: dayKey(row.end_date),
    location_name: row.location_name,
    address: row.address ?? null,
    latitude: row.latitude === null || row.latitude === undefined ? null : num(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : num(row.longitude),
    capacity: num(row.capacity),
    ticket_price: num(row.ticket_price),
    image_url: row.image_url ?? null,
    status: row.status,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
    registration_count: num(row.registration_count),
    tickets_sold: num(row.tickets_sold)
  };
}

/** Shape one registration row for the client. */
function registrationJson(row) {
  if (!row) return null;
  return {
    registration_id: Number(row.registration_id),
    event_id: Number(row.event_id),
    event_name: row.event_name ?? null,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    registration_date: iso(row.registration_date),
    tickets: num(row.tickets),
    notes: row.notes ?? null
  };
}

function categoryJson(row) {
  return {
    category_id: Number(row.category_id),
    category_name: row.category_name,
    description: row.description ?? null,
    event_count: num(row.event_count)
  };
}

const ok = (res, payload, status = 200) => res.status(status).json(payload);

const fail = (res, status, error, details) =>
  res.status(status).json(details && details.length ? { error, details } : { error });

module.exports = { iso, dayKey, num, eventJson, registrationJson, categoryJson, ok, fail };
