/**
 * Type definitions for the Charity Events REST API.
 *
 * The field names here are copied verbatim from docs/BUILD-CONTRACT.md and from
 * api/lib/responses.js, so the JSON returned by the API can be used directly
 * without any mapping layer.
 */

/** The three legal values of events.status (MySQL ENUM in schema.sql). */
export type EventStatus = 'Active' | 'Past' | 'Suspended';

/** Every legal value of the API's ?status= filter (plus "all" for the UI). */
export const EVENT_STATUSES: readonly EventStatus[] = ['Active', 'Past', 'Suspended'];

/** Legal values of the API's ?sort= query parameter. */
export type EventSort = 'date_asc' | 'date_desc' | 'name' | 'popular';

/** A row of the categories table, as returned by GET /api/categories. */
export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
  /** Number of events linked to this category (computed by the API). */
  event_count: number;
}

/**
 * The event object returned by the API.
 *
 * `category_name`, `registration_count` and `tickets_sold` are computed by the
 * API's eventJson() helper; `registrations` is only present on the single-event
 * endpoint (GET /api/events/:id).
 */
export interface EventItem {
  event_id: number;
  category_id: number;
  category_name: string | null;
  category_description: string | null;
  event_name: string;
  description: string | null;
  /** A real UTC instant; render it in Australia/Sydney (see shared/timezone.ts). */
  event_date: string | null;
  end_date: string | null;
  /** The Sydney calendar date ("YYYY-MM-DD") the event starts on. */
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
  /** Present only on GET /api/events/:id, sorted registration_date DESC. */
  registrations?: Registration[];
}

/** A row of the registrations table, as returned by the API. */
export interface Registration {
  registration_id: number;
  event_id: number;
  event_name: string | null;
  full_name: string;
  email: string;
  phone: string;
  registration_date: string | null;
  tickets: number;
  notes: string | null;
}

/** The payload POST /api/events and PUT /api/events/:id expect as the body. */
export interface EventPayload {
  event_name: string;
  category_id: number;
  event_date: string;
  location_name: string;
  capacity: number;
  ticket_price: number;
  status: EventStatus;
  description?: string | null;
  address?: string | null;
  end_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** GET /api/events -> { count, filters, events } */
export interface EventListResponse {
  count: number;
  filters: {
    search: string | null;
    status: EventStatus | null;
    category_id: number | null;
    sort: EventSort;
  };
  events: EventItem[];
}

/** POST /api/events and PUT /api/events/:id -> { message, event } */
export interface EventWriteResponse {
  message: string;
  event: EventItem;
}

/** DELETE /api/events/:id -> { message, event_id } */
export interface DeleteResponse {
  message: string;
  event_id: number;
}

/** GET /api/categories -> { count, categories } */
export interface CategoryListResponse {
  count: number;
  categories: Category[];
}

/** GET /api/registrations -> { count, registrations } */
export interface RegistrationListResponse {
  count: number;
  registrations: Registration[];
}

/** GET /api/health -> connectivity banner in the sidebar footer. */
export interface HealthResponse {
  status: string;
  database: string;
  detail: string;
  time: string;
  version: string;
}

/**
 * The error body every failing API call returns:
 *   { "error": "Human readable message", "details": ["optional field errors"] }
 */
export interface ApiErrorBody {
  error?: string;
  details?: string[];
}
