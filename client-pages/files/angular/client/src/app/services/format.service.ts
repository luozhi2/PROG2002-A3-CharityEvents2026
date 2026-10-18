/**
 * Presentation helpers shared by several pages.
 *
 * Angular does not ship a currency/date pipe configured for Australia, and the
 * weather API returns WMO codes that mean nothing to a visitor, so both mappings
 * live here and are used from templates.
 */
import { Injectable } from '@angular/core';

/** Optional mapping from a WMO weather code to a simple pictogram. */
const WEATHER_ICONS: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  80: '🌦️',
  81: '🌧️',
  82: '⛈️',
  95: '⛈️'
};

/** Every event happens in the Northern Rivers region of NSW. */
const EVENT_TIME_ZONE = 'Australia/Sydney';

@Injectable({ providedIn: 'root' })
export class FormatService {
  /** "$15.00", "$0.00" for free events, or "Free" when the caller asks for it. */
  price(value: number, freeLabel = false): string {
    if (freeLabel && Number(value) === 0) return 'Free';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  /**
   * "Sat 14 Mar 2026" - the calendar date of the event **in Sydney**.
   *
   * Rendering in the venue's timezone matters: for an event starting at 9:00 am
   * Sydney, a visitor in Europe would otherwise see the previous day's date.
   */
  eventDate(value: string | null): string {
    if (!value) return 'Date to be confirmed';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: EVENT_TIME_ZONE,
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }).format(date);
  }

  /**
   * "9:00 am" - the time of day at the venue, always shown in Sydney time so it
   * matches what the organiser advertised.
   */
  time(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: EVENT_TIME_ZONE,
      hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  /**
   * The timezone abbreviation for an event time: "AEDT" in summer, "AEST" in
   * winter. Shown beside event times so it is unambiguous which clock applies.
   */
  timeZoneLabel(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: EVENT_TIME_ZONE,
      timeZoneName: 'short'
    }).formatToParts(date);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
  }

  /** "14 Mar 2026, 9:00 am" - used in the registrations table. */
  dateTime(value: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  /** "3 days ago" / "in 5 days" - relative label for registration rows. */
  relative(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const days = Math.round((Date.now() - date.getTime()) / 86_400_000);
    const formatter = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' });
    if (Math.abs(days) < 1) return 'today';
    if (Math.abs(days) < 30) return formatter.format(-days, 'day');
    return formatter.format(-Math.round(days / 30), 'month');
  }

  /** True when the event date is still in the future. */
  isUpcoming(value: string | null): boolean {
    if (!value) return false;
    return new Date(value).getTime() > Date.now();
  }

  /** How many days until the event (negative when it has passed). */
  daysUntil(value: string | null): number {
    if (!value) return 0;
    return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  }

  /** A friendly sentence such as "Starts in 12 days" or "This event has ended". */
  countdown(value: string | null): string {
    if (!value) return '';
    const days = this.daysUntil(value);
    if (days < 0) return 'This event has ended';
    if (days === 0) return 'Happening today';
    if (days === 1) return 'Starts tomorrow';
    return `Starts in ${days} days`;
  }

  /** Emoji for a WMO weather code, used on the forecast strip. */
  weatherIcon(code: number): string {
    return WEATHER_ICONS[code] ?? '🌡️';
  }

  /** "24° / 15°" for a forecast day. */
  temperature(max: number | null, min: number | null): string {
    const round = (v: number | null) => (v === null || v === undefined ? '–' : `${Math.round(Number(v))}°`);
    return `${round(max)} / ${round(min)}`;
  }

  /** Short weekday label for a forecast day: "Sat". */
  weekday(value: string | null): string {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-AU', { weekday: 'short' }).format(date);
  }

  /** "14 Mar" for a forecast day in the weather strip. */
  shortDate(value: string | null): string {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(date);
  }

  /** Percentage of capacity already sold, clamped to 0-100. */
  percentSold(sold: number, capacity: number): number {
    if (!capacity) return 0;
    return Math.min(100, Math.round((Number(sold) / Number(capacity)) * 100));
  }

  /** Tickets still available for an event. */
  remaining(capacity: number, sold: number): number {
    return Math.max(0, Number(capacity) - Number(sold));
  }
}
