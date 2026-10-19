/**
 * EventService - the single place that knows the event URLs of the REST API.
 *
 * Every component talks to the API through this service, which keeps the
 * endpoint paths and query-parameter names (search, status, category_id, sort)
 * in one file that matches docs/BUILD-CONTRACT.md exactly.
 *
 * All methods return cold Observables; the calling component subscribes and
 * owns its own loading/error signals.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DeleteResponse,
  EventItem,
  EventListResponse,
  EventPayload,
  EventSort,
  EventStatus,
  EventWriteResponse,
  RegistrationListResponse
} from '../models/api.models';

/** Optional filters accepted by GET /api/events. */
export interface EventQuery {
  search?: string;
  status?: EventStatus | null;
  category_id?: number | null;
  sort?: EventSort;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/events`;

  /**
   * GET /api/events - every status is returned by the API, which is what the
   * admin list needs. Filtering and searching happen on the server: an empty
   * filter is simply left out of the query string.
   */
  list(query: EventQuery = {}): Observable<EventListResponse> {
    let params = new HttpParams();
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.status) params = params.set('status', query.status);
    if (query.category_id) params = params.set('category_id', String(query.category_id));
    if (query.sort) params = params.set('sort', query.sort);

    return this.http.get<EventListResponse>(this.baseUrl, { params });
  }

  /**
   * GET /api/events/:id - one event plus category_name, registration_count,
   * tickets_sold and `registrations[]` sorted newest first.
   */
  getById(id: number): Observable<EventItem> {
    return this.http.get<EventItem>(`${this.baseUrl}/${id}`);
  }

  /** POST /api/events - 201 on success, 400 with `details[]` when validation fails. */
  create(payload: EventPayload): Observable<EventWriteResponse> {
    return this.http.post<EventWriteResponse>(this.baseUrl, payload);
  }

  /** PUT /api/events/:id - 200 on success; 409 if capacity drops below tickets sold. */
  update(id: number, payload: EventPayload): Observable<EventWriteResponse> {
    return this.http.put<EventWriteResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /**
   * DELETE /api/events/:id - the API answers 409 while the event still has
   * registrations, so the caller must surface that message to the admin.
   */
  delete(id: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * GET /api/events/:id/registrations - the same registration data as the
   * single-event endpoint, useful when only the list needs refreshing.
   */
  listRegistrations(id: number): Observable<RegistrationListResponse> {
    return this.http.get<RegistrationListResponse>(`${this.baseUrl}/${id}/registrations`);
  }
}
