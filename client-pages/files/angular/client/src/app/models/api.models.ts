/**
 * Typed models describing the JSON returned by the Charity Events API.
 *
 * They mirror the response shapes documented in docs/BUILD-CONTRACT.md, so every
 * component works with strongly typed data instead of `any`.
 */

/** A charity event category, e.g. "Environment". */
export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
  event_count: number;
}

/** The three states an event can be in. */
export type EventStatus = 'Active' | 'Past' | 'Suspended';

/** A charity event as returned by GET /api/events and GET /api/events/:id. */
export interface CharityEvent {
  event_id: number;
  category_id: number;
  category_name: string | null;
  category_description: string | null;
  event_name: string;
  description: string | null;
  /**
   * A real UTC instant. Every event happens in the Northern Rivers region of
   * NSW, so the time the organiser intended is the time in Australia/Sydney, and
   * the event pages render it in that timezone.
   */
  event_date: string;
  end_date: string | null;
  /**
   * The Sydney calendar date ("YYYY-MM-DD") the event starts on, computed by the
   * API. Used to line the event up with Open-Meteo's forecast, whose daily[].date
   * values are local dates. Deriving this in the browser from the UTC instant
   * would be wrong for any event starting before 11 am Sydney time.
   */
  event_date_day: string | null;
  end_date_day: string | null;
  location_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  ticket_price: number;
  image_url: string | null;
  status: EventStatus;
  created_at: string | null;
  updated_at: string | null;
  registration_count: number;
  tickets_sold: number;
}

/** A single ticket purchase / registration for an event. */
export interface Registration {
  registration_id: number;
  event_id: number;
  event_name?: string | null;
  full_name: string;
  email: string;
  phone: string;
  registration_date: string;
  tickets: number;
  notes: string | null;
}

/** GET /api/events/:id - the event plus every registration, newest first. */
export interface EventDetail extends CharityEvent {
  registrations: Registration[];
}

/** Body sent to POST /api/registrations. */
export interface RegistrationRequest {
  event_id: number;
  full_name: string;
  email: string;
  phone: string;
  tickets: number;
  notes?: string | null;
}

/** The response of POST /api/registrations. */
export interface RegistrationResponse {
  message: string;
  registration: Registration;
  event: CharityEvent;
}

/** The response envelope of GET /api/events. */
export interface EventListResponse {
  count: number;
  filters: {
    search: string | null;
    status: EventStatus | null;
    category_id: number | null;
    sort: EventSort;
  };
  events: CharityEvent[];
}

/** The sort options the API accepts. */
export type EventSort = 'date_asc' | 'date_desc' | 'name' | 'popular';

/** Filters used by the search page. */
export interface EventQuery {
  search?: string | null;
  category_id?: number | null;
  status?: EventStatus | null;
  sort?: EventSort;
}

/** One day of the Open-Meteo forecast, already translated by our API. */
export interface WeatherDay {
  date: string;
  weather_code: number;
  description: string;
  label: string;
  temperature_max: number | null;
  temperature_min: number | null;
}

/** Normalised payload of GET /api/weather/event/:id. */
export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  days: number;
  daily: WeatherDay[];
  source: string;
  cached: boolean;
  event_id?: number;
  event_name?: string;
  location_name?: string;
}
