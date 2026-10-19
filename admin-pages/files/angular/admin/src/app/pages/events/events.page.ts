/**
 * Events list page (route /events).
 *
 * Shows EVERY event regardless of status, exactly as GET /api/events returns it
 * (Active, Past and Suspended), with the admin columns: id, name, category,
 * date, location, status, capacity, tickets sold / registrations and price.
 *
 * Filtering and searching are done BY THE SERVER: the status dropdown and the
 * search box are put straight into the query string (?status= and ?search=) and
 * the list is re-fetched. Nothing is filtered in the browser, which is what the
 * brief requires and what keeps the result count honest.
 *
 * Each row has Edit and Delete. Delete asks for confirmation first, then calls
 * DELETE /api/events/:id; a 409 response (the "event already has registrations"
 * integrity rule) is displayed inline with the server's own message.
 */

import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { EventItem, EventSort, EventStatus, EVENT_STATUSES } from '../../models/api.models';
import { EventService } from '../../services/event.service';
import {
  ApiFailure,
  formatCurrency,
  formatDate,
  statusClass,
  toApiFailure
} from '../../shared/api-format';

/** A row of the ?status= dropdown: the three API values plus "any". */
interface StatusOption {
  value: EventStatus | '';
  label: string;
}

/** A row of the ?sort= dropdown (the API's four sort keys). */
interface SortOption {
  value: EventSort;
  label: string;
}

@Component({
  selector: 'app-events-page',
  imports: [RouterLink],
  templateUrl: './events.page.html',
  styleUrl: './events.page.css'
})
export class EventsPage implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Typing in the search box, debounced so every keystroke is not a request. */
  private readonly searchInput = new Subject<string>();

  protected readonly statusOptions: readonly StatusOption[] = [
    { value: '', label: 'All statuses' },
    { value: 'Active', label: 'Active' },
    { value: 'Past', label: 'Past' },
    { value: 'Suspended', label: 'Suspended' }
  ];

  protected readonly sortOptions: readonly SortOption[] = [
    { value: 'date_asc', label: 'Date (soonest first)' },
    { value: 'date_desc', label: 'Date (latest first)' },
    { value: 'name', label: 'Name (A–Z)' },
    { value: 'popular', label: 'Most tickets sold' }
  ];

  /** Filter state - all three are sent to the API as query parameters. */
  protected readonly search = signal('');
  protected readonly status = signal<EventStatus | ''>('');
  protected readonly sort = signal<EventSort>('date_asc');

  /** Result state. */
  protected readonly events = signal<EventItem[]>([]);
  protected readonly resultCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly listError = signal<ApiFailure | null>(null);

  /** Delete state: which row is busy, and the message to show. */
  protected readonly deletingId = signal<number | null>(null);
  protected readonly deleteError = signal<{ eventId: number; failure: ApiFailure } | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  /** Helpers used by the table cells. */
  protected readonly formatDate = formatDate;
  protected readonly formatCurrency = formatCurrency;
  protected readonly statusClass = statusClass;
  protected readonly statuses = EVENT_STATUSES;

  constructor() {
    // Debounce the search box (300 ms) before it triggers a server request.
    this.searchInput
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.search.set(value);
        this.loadEvents();
      });
  }

  ngOnInit(): void {
    // The Edit page redirects here with ?deleted=<id> after a successful delete,
    // so the admin gets confirmation on the page they land on.
    const deleted = this.route.snapshot.queryParamMap.get('deleted');
    if (deleted) this.successMessage.set(`Event #${deleted} was deleted.`);

    this.loadEvents();
  }

  /** GET /api/events with the current ?search=, ?status= and ?sort= values. */
  protected loadEvents(): void {
    this.loading.set(true);
    this.listError.set(null);

    const status = this.status();
    this.eventService
      .list({
        search: this.search(),
        // An empty dropdown value means "no status filter at all".
        status: status === '' ? null : status,
        sort: this.sort()
      })
      .subscribe({
        next: (response) => {
          this.events.set(response.events);
          this.resultCount.set(response.count);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.events.set([]);
          this.resultCount.set(0);
          this.loading.set(false);
          this.listError.set(toApiFailure(error));
        }
      });
  }

  /** Search box handler - pushes the value through the debounce. */
  protected onSearchInput(value: string): void {
    this.searchInput.next(value);
  }

  /** Clear every filter and go back to the default listing. */
  protected clearFilters(): void {
    this.searchInput.next('');
    this.search.set('');
    this.status.set('');
    this.sort.set('date_asc');
    this.loadEvents();
  }

  /** True when a filter is narrowing the list (used for the empty-state text). */
  protected get hasActiveFilters(): boolean {
    return this.search() !== '' || this.status() !== '' || this.sort() !== 'date_asc';
  }

  /**
   * DELETE /api/events/:id after a confirmation prompt.
   *
   * A 409 means the event still has registrations: the API's message explains
   * how many, and it is shown in the banner above the table AND on the row.
   */
  protected onDelete(event: EventItem): void {
    const confirmed = window.confirm(
      `Delete "${event.event_name}" (#${event.event_id}) permanently?\n\n` +
        `It has ${event.registration_count} registration(s) covering ${event.tickets_sold} ticket(s). ` +
        'Events with registrations cannot be deleted.'
    );
    if (!confirmed) return;

    this.deletingId.set(event.event_id);
    this.deleteError.set(null);
    this.successMessage.set(null);

    this.eventService.delete(event.event_id).subscribe({
      next: (response) => {
        this.deletingId.set(null);
        // Remove the row locally and refresh so the totals still come from the API.
        this.events.update((rows) => rows.filter((row) => row.event_id !== response.event_id));
        this.resultCount.update((count) => Math.max(0, count - 1));
        this.successMessage.set(response.message);
        this.loadEvents();
      },
      error: (error: unknown) => {
        this.deletingId.set(null);
        this.deleteError.set({ eventId: event.event_id, failure: toApiFailure(error) });
      }
    });
  }

  /** Hide the delete banner (for example after the admin has read it). */
  protected dismissDeleteError(): void {
    this.deleteError.set(null);
  }

  /** Hide the success banner. */
  protected dismissSuccess(): void {
    this.successMessage.set(null);
  }
}
