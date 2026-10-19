/**
 * CategoryService - reads the category list from GET /api/categories.
 *
 * The admin site uses it in two places: the Category dropdown on the event
 * forms (category_id comes from here) and the read-only Categories page, which
 * also shows the API-computed `event_count` for each category.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category, CategoryListResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/categories`;

  /** GET /api/categories -> every category with its event_count. */
  list(): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(this.baseUrl);
  }

  /** GET /api/categories/:id - used when a single category is needed. */
  getById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/${id}`);
  }
}
