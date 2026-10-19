/**
 * Small shared helpers used by several admin components.
 *
 * Keeping the date/currency/error formatting here means the pages stay short and
 * every screen shows dates and API errors in exactly the same way.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/api.models';

/**
 * A message plus the optional field-level list from the API's `details[]`.
 * Components render `message` in the banner and `details` as a bullet list -
 * the 400 responses from POST/PUT /api/events arrive in this shape.
 */
export interface ApiFailure {
  status: number;
  message: string;
  details: string[];
}

/** Format Options shared by the date formatters below (short, Australian style). */
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
};

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  ...DATE_FORMAT,
  hour: '2-digit',
  minute: '2-digit'
};

/**
 * Turn an ISO-8601 string from the API into "14 Mar 2026".
 * Returns an em dash for null/unparseable values so tables never show "Invalid Date".
 */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('en-AU', DATE_FORMAT).format(date) : '—';
}

/** Turn an ISO-8601 string into "14 Mar 2026, 09:00 am". */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('en-AU', DATE_TIME_FORMAT).format(date) : '—';
}

/**
 * Format a ticket price as AUD. The API sends ticket_price as a number, but
 * older rows used to arrive as a numeric string, so both are accepted.
 */
export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(
    Number.isFinite(amount) ? amount : 0
  );
}

/**
 * Convert an ISO-8601 datetime into the value a <input type="datetime-local">
 * expects ("YYYY-MM-DDTHH:mm"). Local time is used on purpose: what the admin
 * typed into the box is what is shown back when the form is re-opened.
 */
export function toDateTimeLocal(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** True when an ISO datetime is in the future (used for the "upcoming" count). */
export function isFuture(value: string | null | undefined): boolean {
  const date = toDate(value);
  return date !== null && date.getTime() > Date.now();
}

/**
 * CSS class suffix for a status pill, e.g. status--Active. Angular's
 * [class] binding cannot concatenate strings, so components call this helper.
 */
export function statusClass(status: string): string {
  return `status--${status}`;
}

/**
 * Normalise anything thrown by HttpClient into an ApiFailure.
 *
 * Handled cases:
 *   - status 0  -> the API is not running (or the proxy target is down)
 *   - the contract's { error, details } body (400 validation, 409 integrity rule)
 *   - a plain string body, or an Express HTML error page
 */
export function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    const parsed = typeof body === 'string' ? safeJson(body) : (body as ApiErrorBody | null);

    const message =
      parsed?.error ??
      (error.status === 0
        ? 'The API could not be reached. Start it with "node server.js" on port 3000 and try again.'
        : error.message || `The request failed with HTTP ${error.status}.`);

    return {
      status: error.status,
      message,
      details: Array.isArray(parsed?.details) ? parsed.details : []
    };
  }

  // Non-HttpClient failure (a bug in a subscribe handler, for example).
  const message = error instanceof Error ? error.message : String(error);
  return { status: 0, message, details: [] };
}

/** Parse a JSON string defensively; returns null when it is not JSON. */
function safeJson(text: string): ApiErrorBody | null {
  try {
    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return null;
  }
}

/** The form controls the event payload can report an error for. */
const EVENT_FIELDS = [
  'event_name',
  'category_id',
  'event_date',
  'end_date',
  'location_name',
  'address',
  'capacity',
  'ticket_price',
  'status',
  'description',
  'latitude',
  'longitude'
] as const;

/**
 * Turn the API's 400 `details[]` strings into per-field messages for the event
 * form, e.g. "capacity is required and must be a whole number of at least 1."
 * ends up under the Capacity box.
 *
 * The API names the offending field at the start of each message, so the first
 * known field name found in the string wins. Messages that mention no known
 * field are still listed in the page banner by the caller.
 */
export function mapDetailsToFields(details: readonly string[]): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const detail of details) {
    const field = EVENT_FIELDS.find((name) => detail.includes(name));
    if (field && !mapped[field]) mapped[field] = detail;
  }
  return mapped;
}

/** Shared guard so the formatters never build an "Invalid Date". */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
