'use strict';

/**
 * Server-side validation for the write endpoints.
 *
 * The Angular forms run the same rules on the client so the user gets instant
 * feedback, but the API never trusts the browser: every rule is repeated here
 * and a 400 is returned with a list of field-level messages.
 */

const { getRepository } = require('../db');
const { sydneyWallClockToInstant } = require('./timezone');

const EVENT_STATUSES = ['Active', 'Past', 'Suspended'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Tidy a free-text value: strings are trimmed, anything else becomes "". */
const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** Optional text: "" becomes null so MySQL stores NULL rather than an empty string. */
const optionalText = (value) => (text(value) === '' ? null : text(value));

/**
 * Accept the three datetime spellings that reach this API:
 *   - "2026-03-14T09:00"        from an <input type="datetime-local"> (Sydney wall clock)
 *   - "2026-03-14 09:00:00"     a plain SQL datetime (Sydney wall clock)
 *   - "2026-03-13T22:00:00.000Z" a real UTC instant
 * Returns "YYYY-MM-DD HH:MM:SS" (Sydney wall clock, as MySQL stores it) or null.
 *
 * The stored form is always Sydney wall-clock; the API converts back to a UTC
 * instant when it serialises a response. See lib/timezone.js.
 */
function toSqlDateTime(value) {
  if (value === null || value === undefined || value === '') return null;

  const raw = String(value).trim();
  const instant = sydneyWallClockToInstant(raw);
  if (!instant) return null;

  // Format the instant back as Sydney wall clock.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}:${parts.second}`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** A number check that also allows the value 0. */
function validNumber(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

/**
 * Validate an event payload (used by POST /api/events and PUT /api/events/:id).
 * @returns {{ errors: string[], data?: object }}
 */
async function validateEvent(body = {}) {
  const errors = [];
  const data = {
    event_name: text(body.event_name),
    description: optionalText(body.description),
    category_id: toNumber(body.category_id),
    event_date: toSqlDateTime(body.event_date),
    end_date: toSqlDateTime(body.end_date),
    location_name: text(body.location_name),
    address: optionalText(body.address),
    latitude: toNumber(body.latitude),
    longitude: toNumber(body.longitude),
    capacity: toNumber(body.capacity),
    ticket_price: toNumber(body.ticket_price),
    image_url: optionalText(body.image_url),
    status: text(body.status) || 'Active'
  };

  if (data.event_name.length < 3 || data.event_name.length > 150) {
    errors.push('event_name is required and must be between 3 and 150 characters.');
  }
  if (data.description && data.description.length > 5000) {
    errors.push('description must be 5000 characters or fewer.');
  }
  if (data.category_id === null || !Number.isInteger(data.category_id)) {
    errors.push('category_id is required and must be an integer.');
  } else {
    const categories = await getRepository().listCategories();
    if (!categories.some((c) => Number(c.category_id) === data.category_id)) {
      errors.push(`category_id ${data.category_id} does not exist.`);
    }
  }
  if (!data.event_date) {
    errors.push('event_date is required and must be a valid date/time.');
  }
  if (body.end_date && !data.end_date) {
    errors.push('end_date must be a valid date/time when supplied.');
  }
  if (data.event_date && data.end_date) {
    // Compare real instants rather than the wall-clock strings, so the rule stays
    // correct across a daylight-saving change.
    const start = sydneyWallClockToInstant(data.event_date);
    const end = sydneyWallClockToInstant(data.end_date);
    if (start && end && end.getTime() < start.getTime()) {
      errors.push('end_date cannot be earlier than event_date.');
    }
  }
  if (!data.location_name) {
    errors.push('location_name is required.');
  }
  if (!validNumber(data.latitude) || data.latitude < -90 || data.latitude > 90) {
    if (body.latitude !== undefined && body.latitude !== null && body.latitude !== '') {
      errors.push('latitude must be a number between -90 and 90.');
    } else {
      data.latitude = null;
    }
  }
  if (!validNumber(data.longitude) || data.longitude < -180 || data.longitude > 180) {
    if (body.longitude !== undefined && body.longitude !== null && body.longitude !== '') {
      errors.push('longitude must be a number between -180 and 180.');
    } else {
      data.longitude = null;
    }
  }
  if (!validNumber(data.capacity) || !Number.isInteger(data.capacity) || data.capacity < 1) {
    errors.push('capacity is required and must be a whole number of at least 1.');
  }
  if (!validNumber(data.ticket_price) || data.ticket_price < 0) {
    errors.push('ticket_price is required and must be 0 or more.');
  }
  if (!EVENT_STATUSES.includes(data.status)) {
    errors.push(`status must be one of ${EVENT_STATUSES.join(', ')}.`);
  }

  return errors.length ? { errors } : { errors: [], data };
}

/**
 * Validate a registration payload (POST /api/registrations).
 * @returns {{ errors: string[], data?: object, status?: number }}
 */
function validateRegistration(body = {}) {
  const errors = [];
  const data = {
    event_id: toNumber(body.event_id),
    full_name: text(body.full_name),
    email: text(body.email).toLowerCase(),
    phone: text(body.phone),
    tickets: toNumber(body.tickets),
    notes: optionalText(body.notes)
  };

  if (data.event_id === null || !Number.isInteger(data.event_id) || data.event_id < 1) {
    errors.push('event_id is required and must be a positive integer.');
  }
  if (data.full_name.length < 2 || data.full_name.length > 120) {
    errors.push('full_name is required and must be between 2 and 120 characters.');
  }
  if (!EMAIL_PATTERN.test(data.email) || data.email.length > 150) {
    errors.push('email is required and must be a valid email address.');
  }
  const phoneDigits = data.phone.replace(/[^0-9]/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.push('phone is required and must contain between 8 and 15 digits.');
  }
  if (!validNumber(data.tickets) || !Number.isInteger(data.tickets) || data.tickets < 1 || data.tickets > 20) {
    errors.push('tickets is required and must be a whole number between 1 and 20.');
  }
  if (data.notes && data.notes.length > 255) {
    errors.push('notes must be 255 characters or fewer.');
  }

  return errors.length ? { errors } : { errors: [], data };
}

module.exports = {
  validateEvent,
  validateRegistration,
  toSqlDateTime,
  EVENT_STATUSES,
  EMAIL_PATTERN
};
