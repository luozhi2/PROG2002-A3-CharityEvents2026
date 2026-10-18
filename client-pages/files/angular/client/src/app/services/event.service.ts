import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Category,
  EventDetail,
  EventListResponse,
  EventQuery,
  RegistrationRequest,
  RegistrationResponse,
  WeatherForecast
} from '../models/api.models';

/**
 * A normalised API failure.
 *
 * The Express API answers with { error, details? }. This class flattens that
 * (plus network failures) into one predictable shape so components can render a
 * useful message without knowing about HttpErrorResponse.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: string[] = []
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the server refused the request because of a business rule. */
  get isConflict(): boolean {
    return this.status === 409;
  }

  /** True when the request never reached the API (server down, no network). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

/**
 * The single place the client website talks to the backend.
 *
 * Every page goes through this service, which is what makes the site a dynamic
 * website: no event data is hard-coded in the Angular code, it is all fetched
 * from the REST API at run time.
 */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}`;

  /** GET /api/categories - used by the search filter and the registration page. */
  getCategories(): Observable<{ count: number; categories: Category[] }> {
    return this.http
      .get<{ count: number; categories: Category[] }>(`${this.baseUrl}/categories`)
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/events with optional search / category / status / sort filters.
   * Filtering happens on the server; the browser only renders what comes back.
   */
  getEvents(query: EventQuery = {}): Observable<EventListResponse> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.category_id) params = params.set('category_id', String(query.category_id));
    if (query.status) params = params.set('status', query.status);
    if (query.sort) params = params.set('sort', query.sort);

    return this.http
      .get<EventListResponse>(`${this.baseUrl}/events`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Convenience helper for the home page: the next few active events. */
  getUpcomingEvents(limit = 3): Observable<EventListResponse> {
    return this.getEvents({ status: 'Active', sort: 'date_asc' });
  }

  /** GET /api/events/:id - the event WITH its registrations (latest first). */
  getEvent(id: number): Observable<EventDetail> {
    return this.http
      .get<EventDetail>(`${this.baseUrl}/events/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** POST /api/registrations - finalises a registration. */
  createRegistration(payload: RegistrationRequest): Observable<RegistrationResponse> {
    return this.http
      .post<RegistrationResponse>(`${this.baseUrl}/registrations`, payload)
      .pipe(catchError(this.handleError));
  }

  /**
   * GET /api/weather/event/:id - the Open-Meteo forecast for the event location.
   * Returns null instead of throwing when the forecast is unavailable, because a
   * missing forecast must never stop the event page from rendering.
   */
  getEventWeather(id: number): Observable<WeatherForecast> {
    return this.http
      .get<WeatherForecast>(`${this.baseUrl}/weather/event/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** Turn any HttpErrorResponse into an ApiError with a readable message. */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    if (error.status === 0) {
      return throwError(() => new ApiError(
        'Cannot reach the Charity Events API. Check that the Node.js server is running.',
        0
      ));
    }

    const body = error.error as { error?: string; details?: string[] } | null;
    const message = body?.error || `The server returned an unexpected ${error.status} error.`;
    return throwError(() => new ApiError(message, error.status, body?.details ?? []));
  };
}
