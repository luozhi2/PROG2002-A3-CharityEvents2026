import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { EventDetail, Registration, WeatherForecast } from '../../models/api.models';
import { ApiError, EventService } from '../../services/event.service';
import { FormatService } from '../../services/format.service';

/**
 * Event detail page.
 *
 * This is the Assessment 2 page enhanced for Assessment 3. It now:
 *   - calls GET /api/events/:id, which returns the event together with the
 *     complete list of that event's registrations, newest first;
 *   - renders those registrations in a table (the capability the page did not
 *     have before);
 *   - shows a seven-day Open-Meteo forecast for the event location;
 *   - links its Register button to the new registration page, passing the event
 *     id as a URL query string.
 */
@Component({
  selector: 'app-event-detail',
  imports: [RouterLink],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.css'
})
export class EventDetailPage implements OnInit {
  private readonly events = inject(EventService);
  private readonly format = inject(FormatService);
  private readonly route = inject(ActivatedRoute);

  // --- page state -----------------------------------------------------------
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly event = signal<EventDetail | null>(null);

  /** The weather card has its own state so a failure never breaks the page. */
  protected readonly weatherLoading = signal(false);
  protected readonly weatherError = signal<string | null>(null);
  protected readonly weather = signal<WeatherForecast | null>(null);

  /**
   * The forecast for the day the event actually starts, or null when the event is
   * further out than the seven-day window.
   *
   * The comparison uses `event_date_day`, which the API computes as the calendar
   * date in Australia/Sydney - the same basis as Open-Meteo's `daily[].date`. An
   * earlier version derived the day from the UTC instant, which is the *previous*
   * date for any event starting before 11 am Sydney time, so the highlight was
   * almost always missing.
   */
  protected readonly eventDayForecast = computed(() => {
    const forecast = this.weather();
    const current = this.event();
    if (!forecast || !current) return null;

    const eventDay = current.event_date_day;
    if (!eventDay) return null;

    return forecast.daily.find((day) => day.date === eventDay) ?? null;
  });

  /** Tickets still available, derived from the event's capacity and sales. */
  protected remaining(event: EventDetail): number {
    return this.format.remaining(event.capacity, event.tickets_sold);
  }

  /** Percentage of the event's capacity that has been sold. */
  protected readonly percentSold = computed(() => {
    const current = this.event();
    return current ? this.format.percentSold(current.tickets_sold, current.capacity) : 0;
  });

  /** True when the event is Active and tickets remain. */
  protected readonly canRegister = computed(() => {
    const current = this.event();
    return Boolean(current && current.status === 'Active' &&
      this.format.remaining(current.capacity, current.tickets_sold) > 0);
  });

  ngOnInit(): void {
    // React to the route parameter so /events/1 -> /events/2 works without a
    // full page reload.
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isInteger(id) || id < 1) {
        this.error.set('That event id is not valid.');
        this.loading.set(false);
        return;
      }
      this.loadEvent(id);
    });
  }

  /** Fetch the event and its registrations from the API. */
  private loadEvent(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.event.set(null);
    this.weather.set(null);
    this.weatherError.set(null);

    this.events.getEvent(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.loading.set(false);
        // The forecast is a secondary concern: request it only after the event
        // information is on screen, and only when coordinates are recorded.
        if (event.latitude !== null && event.longitude !== null) {
          this.loadWeather(id);
        } else {
          this.weatherError.set('No coordinates are recorded for this event, so no forecast is available.');
        }
      },
      error: (error: ApiError) => {
        this.error.set(
          error.status === 404
            ? 'We could not find that event. It may have been removed by an administrator.'
            : error.message
        );
        this.loading.set(false);
      }
    });
  }

  /** Fetch the Open-Meteo forecast through our own API. */
  private loadWeather(id: number): void {
    this.weatherLoading.set(true);
    this.weatherError.set(null);

    this.events.getEventWeather(id).subscribe({
      next: (forecast) => {
        this.weather.set(forecast);
        this.weatherLoading.set(false);
      },
      error: (error: ApiError) => {
        this.weatherError.set(error.message);
        this.weatherLoading.set(false);
      }
    });
  }

  /** Retry the whole page load. */
  protected reload(): void {
    const current = this.event();
    const id = current ? current.event_id : Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.loadEvent(id);
  }

  /** Label used by the "Register" button depending on the event state. */
  protected registerLabel(): string {
    const current = this.event();
    if (!current) return 'Register';
    if (current.status !== 'Active') return `Registration closed (${current.status.toLowerCase()})`;
    if (this.remaining(current) === 0) return 'Sold out';
    return `Register for this event — ${this.format.price(current.ticket_price, true)} per ticket`;
  }

  /** Total value of the tickets already sold, shown to the visitor. */
  protected get raisedSoFar(): number {
    const current = this.event();
    return current ? current.tickets_sold * current.ticket_price : 0;
  }

  // Template helpers.
  protected formatDate(value: string | null): string { return this.format.eventDate(value); }
  protected formatTime(value: string | null): string { return this.format.time(value); }
  protected timeZoneLabel(value: string | null): string { return this.format.timeZoneLabel(value); }
  protected formatDateTime(value: string | null): string { return this.format.dateTime(value); }
  protected formatRelative(value: string | null): string { return this.format.relative(value); }
  protected formatPrice(value: number): string { return this.format.price(value, true); }
  protected countdown(value: string | null): string { return this.format.countdown(value); }
  protected weatherIcon(code: number): string { return this.format.weatherIcon(code); }
  protected temperature(max: number | null, min: number | null): string { return this.format.temperature(max, min); }
  protected weekday(value: string | null): string { return this.format.weekday(value); }
  protected shortDate(value: string | null): string { return this.format.shortDate(value); }

  /** Initials shown in the avatar circle of each registration row. */
  protected initials(registration: Registration): string {
    return registration.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
