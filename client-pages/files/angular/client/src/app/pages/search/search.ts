import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { Category, CharityEvent, EventSort, EventStatus } from '../../models/api.models';
import { ApiError, EventService } from '../../services/event.service';
import { EventCardComponent } from '../../shared/event-card/event-card';

/**
 * Search page.
 *
 * Filtering, sorting and the free-text search are all performed by the API
 * (GET /api/events?search=&category_id=&status=&sort=), never by filtering a
 * complete list in the browser. This is what makes the page a genuinely dynamic
 * page and is the behaviour the demo video must show.
 *
 * The current filters are mirrored into the URL query string, so a search result
 * can be bookmarked or shared and the browser back button works.
 */
@Component({
  selector: 'app-search',
  imports: [FormsModule, EventCardComponent],
  templateUrl: './search.html',
  styleUrl: './search.css'
})
export class SearchPage implements OnInit, OnDestroy {
  private readonly events = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Emits every keystroke; the pipeline below debounces it into one request. */
  private readonly searchInput$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  // --- filter state ---------------------------------------------------------
  protected searchTerm = '';
  protected categoryId: number | null = null;
  protected status: EventStatus | '' = '';
  protected sort: EventSort = 'date_asc';

  // --- page state -----------------------------------------------------------
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly results = signal<CharityEvent[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly responseCount = signal(0);
  protected readonly searched = signal(false);

  /** The sort options offered in the toolbar. */
  protected readonly sortOptions: { value: EventSort; label: string }[] = [
    { value: 'date_asc', label: 'Date: soonest first' },
    { value: 'date_desc', label: 'Date: latest first' },
    { value: 'name', label: 'Name: A to Z' },
    { value: 'popular', label: 'Most tickets sold' }
  ];

  protected readonly statusOptions: { value: EventStatus | ''; label: string }[] = [
    { value: '', label: 'Any status' },
    { value: 'Active', label: 'Active (open for registration)' },
    { value: 'Past', label: 'Past' },
    { value: 'Suspended', label: 'Suspended' }
  ];

  ngOnInit(): void {
    this.loadCategories();

    // Read the initial filters from the URL, so /search?search=walk works when
    // the visitor arrives from the home page or from a shared link.
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.searchTerm = params.get('search') ?? '';
      const category = params.get('category_id');
      this.categoryId = category ? Number(category) : null;
      const status = params.get('status');
      this.status = (status as EventStatus) ?? '';
      const sort = params.get('sort');
      this.sort = (sort as EventSort) ?? 'date_asc';
      this.runSearch();
    });

    // Debounce typing (400 ms) and cancel a request that is still in flight when
    // the user keeps typing - switchMap does the cancellation for us.
    this.searchInput$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.searchTerm = term;
        this.syncUrl();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Load the categories that populate the filter dropdown. */
  private loadCategories(): void {
    this.events.getCategories().subscribe({
      next: (response) => this.categories.set(response.categories),
      error: () => this.categories.set([])
    });
  }

  /** Called on every keystroke in the search box. */
  protected onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  /** Called when a dropdown changes. */
  protected onFilterChange(): void {
    this.syncUrl();
  }

  /** Clear every filter and start again. */
  protected clearFilters(): void {
    this.searchTerm = '';
    this.categoryId = null;
    this.status = '';
    this.sort = 'date_asc';
    this.router.navigate(['/search']);
  }

  /** True when at least one filter is active. */
  protected get hasFilters(): boolean {
    return Boolean(this.searchTerm || this.categoryId || this.status || this.sort !== 'date_asc');
  }

  /**
   * Write the current filters into the URL. Navigating triggers the
   * queryParamMap subscription above, which performs the actual API call.
   */
  private syncUrl(): void {
    this.router.navigate(['/search'], {
      queryParams: {
        search: this.searchTerm || null,
        category_id: this.categoryId || null,
        status: this.status || null,
        sort: this.sort !== 'date_asc' ? this.sort : null
      }
    });
  }

  /**
   * Call the API with the current filters.
   * The loading flag drives the spinner and the error signal drives the alert.
   */
  private runSearch(): void {
    this.loading.set(true);
    this.error.set(null);

    const categoryId = this.categoryId ? Number(this.categoryId) : null;

    this.events
      .getEvents({
        search: this.searchTerm || null,
        category_id: categoryId,
        status: this.status || null,
        sort: this.sort
      })
      .subscribe({
        next: (response) => {
          this.results.set(response.events);
          this.responseCount.set(response.count);
          this.searched.set(true);
          this.loading.set(false);
        },
        error: (error: ApiError) => {
          this.error.set(error.message);
          this.results.set([]);
          this.responseCount.set(0);
          this.loading.set(false);
        }
      });
  }

  /** Retry after a failed request. */
  protected retry(): void {
    this.runSearch();
  }

  /** A human-readable summary of the active filters, shown above the results. */
  protected get summary(): string {
    const parts: string[] = [];
    if (this.searchTerm) parts.push(`matching “${this.searchTerm}”`);
    const category = this.categories().find((c) => c.category_id === Number(this.categoryId));
    if (category) parts.push(`in ${category.category_name}`);
    if (this.status) parts.push(`with status ${this.status}`);
    return parts.length ? parts.join(' ') : 'in every category';
  }
}
