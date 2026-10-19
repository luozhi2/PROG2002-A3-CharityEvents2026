/**
 * HealthService - calls GET /api/health so the admin shell can show whether the
 * REST API (and its database) is reachable.
 *
 * This is a "nice to have" for the demo video: the sidebar footer tells the
 * marker at a glance that the Angular app is talking to the Express API.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HealthResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  check(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${environment.apiBase}/health`);
  }
}
