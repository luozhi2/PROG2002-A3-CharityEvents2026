/**
 * Dashboard page (route /dashboard) - the summary screen of the admin site.
 *
 * Every number shown here is DERIVED FROM THE API, not hard-coded:
 *   - GET /api/events        -> counts per status, upcoming events, capacity,
 *                               total tickets sold and registration rows
 *   - GET /api/registrations -> the admin convenience feed used for the total
 *                               registration count and the latest sign-ups
 *
 * The two requests run in parallel with forkJoin; a failure of either one puts
 * the page into a readable error state with a retry button instead of leaving a
 * blank screen.
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventItem, EventStatus, Registration } from '../../models/api.models';
import { EventService } from '../../services/event.service';
import { RegistrationService } from '../../services/registration.service';
import {
  ApiFailure,
  formatCurrency,
  formatDate,
  formatDateTime,
  isFuture,
  statusClass,
  toApiFailure
} from '../../shared/api-format';

/** A single KPI tile on the dashboard. */
interface Metric {
  label: string;
  value: string;
  hint: string;
  tone: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardPage implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly registrationService = inject(RegistrationService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<ApiFailure | null>(null);

  /** Raw data straight from the API. */
  protected readonly events = signal<EventItem[]>([]);
  protected readonly registrations = signal<Registration[]>([]);

  /** Helpers for the template. */
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatCurrency = formatCurrency;
  protected readonly statusClass = statusClass;

  // -------------------------------------------------------------------------
  // Derived statistics (computed signals recalculate automatically whenever the
  // fetched data changes, so the template never does arithmetic).
  // -------------------------------------------------------------------------

  /** { Active: n, Past: n, Suspended: n } - counts of events by status. */
  protected readonly statusCounts = computed<Record<EventStatus, number>>(() => {
    const counts: Record<EventStatus, number> = { Active: 0, Past: 0, Suspended: 0 };
    for (const event of this.events()) counts[event.status] += 1;
    return counts;
  });

  /** Total registrations recorded against every event. */
  protected readonly totalRegistrations = computed(() =>
    this.events().reduce((sum, event) => sum + event.registration_count, 0)
  );

  /** Total tickets sold - the figure the charity cares about. */
  protected readonly totalTicketsSold = computed(() =>
    this.events().reduce((sum, event) => sum + event.tickets_sold, 0)
  );

  /** Total seats offered across all events (for the occupancy percentage). */
  protected readonly totalCapacity = computed(() =>
    this.events().reduce((sum, event) => sum + event.capacity, 0)
  );

  /** How full the whole program is, as a percentage. */
  protected readonly occupancyPercent = computed(() => {
    const capacity = this.totalCapacity();
    return capacity > 0 ? Math.round((this.totalTicketsSold() / capacity) * 100) : 0;
  });

  /** Projected income if every remaining ticket is sold at the listed price. */
  protected readonly projectedRevenue = computed(() =>
    this.events().reduce((sum, event) => sum + event.capacity * event.ticket_price, 0)
  );

  /** Money already raised by tickets sold. */
  protected readonly ticketsRevenue = computed(() =>
    this.events().reduce((sum, event) => sum + event.tickets_sold * event.ticket_price, 0)
  );

  /** Active events whose start date is still in the future. */
  protected readonly upcomingEvents = computed(() =>
    this.events()
      .filter((event) => event.status === 'Active' && isFuture(event.event_date))
      .sort((a, b) => dateValue(a.event_date) - dateValue(b.event_date))
  );

  /** The five events that have sold the most tickets. */
  protected readonly topEvents = computed(() =>
    [...this.events()].sort((a, b) => b.tickets_sold - a.tickets_sold).slice(0, 5)
  );

  /** The five most recent sign-ups, newest first. */
  protected readonly latestRegistrations = computed(() =>
    [...this.registrations()]
      .sort((a, b) => dateValue(b.registration_date) - dateValue(a.registration_date))
      .slice(0, 5)
  );

  /** The KPI tiles at the top of the page. */
  protected readonly metrics = computed<Metric[]>(() => [
    {
      label: 'Total events',
      value: String(this.events().length),
      hint: `${this.statusCounts().Active} active · ${this.statusCounts().Past} past · ${this.statusCounts().Suspended} suspended`,
      tone: 'neutral'
    },
    {
      label: 'Total registrations',
      value: String(this.totalRegistrations()),
      hint: 'Rows in the registrations table',
      tone: 'brand'
    },
    {
      label: 'Total tickets sold',
      value: String(this.totalTicketsSold()),
      hint: `${this.occupancyPercent()}% of ${this.totalCapacity()} places`,
      tone: 'green'
    },
    {
      label: 'Upcoming events',
      value: String(this.upcomingEvents().length),
      hint: 'Active events dated in the future',
      tone: 'amber'
    },
    {
      label: 'Tickets sold value',
      value: formatCurrency(this.ticketsRevenue()),
      hint: `of ${formatCurrency(this.projectedRevenue())} if all places sell`,
      tone: 'neutral'
    }
  ]);

  ngOnInit(): void {
    this.load();
  }

  /**
   * Fetch both feeds in parallel. forkJoin only emits once BOTH requests have
   * succeeded, so any failure lands in the single error handler below.
   */
  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({
      events: this.eventService.list({ sort: 'date_asc' }),
      registrations: this.registrationService.list()
    }).subscribe({
      next: ({ events, registrations }) => {
        this.events.set(events.events);
        this.registrations.set(registrations.registrations);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.events.set([]);
        this.registrations.set([]);
        this.loading.set(false);
        this.loadError.set(toApiFailure(error));
      }
    });
  }
}

/** Milliseconds for an ISO date, or 0 when it is missing/unparseable. */
function dateValue(value: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
