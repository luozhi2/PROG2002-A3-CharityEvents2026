/**
 * RegistrationService - the admin convenience endpoint GET /api/registrations.
 *
 * The dashboard uses it to total registrations and tickets sold without
 * fetching every event individually. Each row is joined with its event_name by
 * the API, so no extra lookups are needed here.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegistrationListResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/registrations`;

  /** GET /api/registrations -> all registrations with their event_name. */
  list(): Observable<RegistrationListResponse> {
    return this.http.get<RegistrationListResponse>(this.baseUrl);
  }
}
