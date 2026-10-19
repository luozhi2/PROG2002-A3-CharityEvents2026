/**
 * Categories page (route /categories).
 *
 * Read-only display of GET /api/categories. The brief does not ask for category
 * CRUD, so this page shows each category with the `event_count` the API
 * calculates, plus a share-of-events bar that makes the distribution readable at
 * a glance. The categories themselves are also what feeds the Category dropdown
 * on the New/Edit event forms.
 *
 * Loading and error states are handled so the page never renders blank when the
 * API is unavailable.
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../models/api.models';
import { CategoryService } from '../../services/category.service';
import { ApiFailure, toApiFailure } from '../../shared/api-format';

@Component({
  selector: 'app-categories-page',
  imports: [RouterLink],
  templateUrl: './categories.page.html',
  styleUrl: './categories.page.css'
})
export class CategoriesPage implements OnInit {
  private readonly categoryService = inject(CategoryService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<ApiFailure | null>(null);
  protected readonly categories = signal<Category[]>([]);

  /** Sum of every category's event_count (i.e. all events in the database). */
  protected readonly totalEvents = computed(() =>
    this.categories().reduce((sum, category) => sum + category.event_count, 0)
  );

  /** The busiest category, used in the page summary line. */
  protected readonly busiestCategory = computed<Category | null>(() => {
    const rows = [...this.categories()].sort((a, b) => b.event_count - a.event_count);
    return rows.length ? rows[0] : null;
  });

  ngOnInit(): void {
    this.load();
  }

  /** GET /api/categories -> { count, categories } with event_count per row. */
  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.categoryService.list().subscribe({
      next: (response) => {
        this.categories.set(response.categories);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.categories.set([]);
        this.loading.set(false);
        this.loadError.set(toApiFailure(error));
      }
    });
  }

  /**
   * Width (in percent) of a category's share bar. Uses the total number of
   * events; when there are none the bar is simply empty.
   */
  protected sharePercent(eventCount: number): number {
    const total = this.totalEvents();
    return total > 0 ? Math.round((eventCount / total) * 100) : 0;
  }
}
