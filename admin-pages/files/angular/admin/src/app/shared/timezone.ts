/**
 * Sydney timezone helpers for the admin website.
 *
 * Read together with api/lib/timezone.js, which documents the convention:
 * everything staff type is an **Australia/Sydney wall-clock** time, because that
 * is the clock the events actually run on.
 *
 * Why this file exists: the API returns real UTC instants, and a native
 * `<input type="datetime-local">` shows the *browser's* local time. Without a
 * conversion, an administrator working from outside New South Wales would see
 * (and could accidentally save) a shifted time. These two functions keep the
 * form pinned to Sydney time whichever machine it is opened on.
 */

/** The timezone every event datetime is expressed in. */
export const EVENT_TIME_ZONE = 'Australia/Sydney';

/** "AEDT" or "AEST", for labelling the date fields. */
export function sydneyZoneAbbreviation(reference: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: EVENT_TIME_ZONE,
    timeZoneName: 'short'
  }).formatToParts(reference);
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? 'AEST/AEDT';
}

/**
 * A UTC instant from the API -> the "YYYY-MM-DDTHH:mm" an
 * `<input type="datetime-local">` needs, expressed in Sydney time.
 */
export function toSydneyInputValue(value: string | null): string {
  if (!value) return '';
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return '';

  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }

  const hour = parts['hour'] === '24' ? '00' : parts['hour'];
  return `${parts['year']}-${parts['month']}-${parts['day']}T${hour}:${parts['minute']}`;
}

/**
 * The offset of Sydney from UTC, in minutes, at a given moment
 * (660 = UTC+11 in summer, 600 = UTC+10 in winter).
 */
function offsetMinutesAt(instant: Date): number {
  const parts: Record<string, number> = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  const hour = parts['hour'] === 24 ? 0 : parts['hour'];
  const asUtc = Date.UTC(
    parts['year'], parts['month'] - 1, parts['day'],
    hour, parts['minute'], parts['second']
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/**
 * A "YYYY-MM-DDTHH:mm" value typed into the form -> the datetime string the API
 * expects. The value is interpreted as Sydney time and returned as an ISO
 * instant, so the meaning survives the trip to the server.
 *
 * Returns null for an empty value, because those fields are optional.
 */
export function fromSydneyInputValue(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;

  const naiveAsUtc = Date.UTC(
    Number(match[1]), Number(match[2]) - 1, Number(match[3]),
    Number(match[4]), Number(match[5])
  );

  // Two passes so the offset is correct on either side of a daylight-saving change.
  let offset = offsetMinutesAt(new Date(naiveAsUtc));
  let candidate = naiveAsUtc - offset * 60_000;
  const refined = offsetMinutesAt(new Date(candidate));
  if (refined !== offset) candidate = naiveAsUtc - refined * 60_000;

  return new Date(candidate).toISOString();
}
