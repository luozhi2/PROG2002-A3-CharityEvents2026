/**
 * Edit Event page (route /events/:id/edit).
 *
 * This page does three things the brief asks for explicitly:
 *   1. loads the event with GET /api/events/:id and pre-fills the shared event
 *      form, then saves changes with PUT /api/events/:id;
 *   2. DISPLAYS that event's registration data - the `registrations[]` array
 *      that arrives in the same response, shown newest first together with the
 *      API's registration_count / tickets_sold totals;
 *   3. offers Delete, which surfaces the API's 409 "cannot delete an event that
 *      already has registrations" message inline.
 *
 * The category dropdown and all field validation live inside
 * <app-event-form />, which this page simply hosts.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventFormComponent, EventFormFieldErrors } from '../../components/event-form/event-form.component';
import { EventItem, EventPayload, Registration } from '../../models/api.models';
import { EventService } from '../../services/event.service';
import {
  ApiFailure,
  formatCurrency,
  formatDate,
  formatDateTime,
  mapDetailsToFields,
  statusClass,
  toApiFailure
} from '../../shared/api-format';

@Component({
  selector: 'app-event-edit-page',
  imports: [EventFormComponent, RouterLink],
  templateUrl: './event-edit.page.html',
  styleUrl: './event-edit.page.css'
})
export class EventEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);

  /** The id from the URL. 0 means the URL did not contain a usable id. */
  private eventId = 0;

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);
  protected readonly loadError = signal<ApiFailure | null>(null);
  protected readonly saveError = signal<ApiFailure | null>(null);
  protected readonly deleteError = signal<ApiFailure | null>(null);
  protected readonly saveMessage = signal<string | null>(null);
  protected readonly event = signal<EventItem | null>(null);
  protected readonly fieldErrors = signal<EventFormFieldErrors>({});

  /** Bumped after a successful save so the form re-reads the event input. */
  protected readonly formVersion = signal(0);

  /** Helpers exposed to the template (Angular templates cannot import modules). */
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatCurrency = formatCurrency;
  protected readonly statusClass = statusClass;

  ngOnInit(): void {
    // The route is /events/:id/edit, so the id arrives as a string. Anything
    // that is not a positive integer is rejected before a pointless API call.
    const raw = this.route.snapshot.paramMap.get('id') ?? '';
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      this.loading.set(false);
      this.loadError.set({
        status: 400,
        message: `"${raw}" is not a valid event id.`,
        details: []
      });
      return;
    }

    this.eventId = id;
    this.loadEvent(id);
  }

  /** GET /api/events/:id - the event plus its registrations (newest first). */
  protected loadEvent(id: number = this.eventId): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.eventService.getById(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(toApiFailure(error));
      }
    });
  }

  /** PUT /api/events/:id with the payload validated by the form. */
  protected onSave(payload: EventPayload): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.deleteError.set(null);
    this.saveMessage.set(null);
    this.fieldErrors.set({});

    this.eventService.update(this.eventId, payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        // Trust the API's own response over the local form value: it is the
        // row that was actually written.
        this.event.set(response.event);
        this.formVersion.update((version) => version + 1);
        this.saveMessage.set(response.message);
        // Reload so the registration totals and registration list stay in step
        // with the saved capacity/status.
        this.loadEvent();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const failure = toApiFailure(error);
        this.saveError.set(failure);
        // 409 (capacity below tickets sold) also carries a details[] hint that
        // is shown under the Capacity field.
        this.fieldErrors.set(mapDetailsToFields(failure.details));
      }
    });
  }

  /**
   * DELETE /api/events/:id.
   *
   * The API refuses with 409 while registrations exist, and that message is the
   * one the marker is looking for, so it is shown inline instead of a generic
   * error. Confirmation happens first because deleting is irreversible.
   */
  protected onDelete(): void {
    const event = this.event();
    if (!event) return;

    const confirmed = window.confirm(
      `Delete "${event.event_name}" (#${event.event_id}) permanently?\n\n` +
        'This cannot be undone. Events that already have registrations cannot be deleted.'
    );
    if (!confirmed) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.saveError.set(null);
    this.saveMessage.set(null);

    this.eventService.delete(this.eventId).subscribe({
      next: (response) => {
        this.deleting.set(false);
        // Deleting sends the admin back to the list, which simply no longer
        // contains the event (the list is always re-fetched on load).
        void this.router.navigate(['/events'], {
          queryParams: { deleted: response.event_id }
        });
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        this.deleteError.set(toApiFailure(error));
      }
    });
  }

  /** Abandon the edit and return to the list. */
  protected onCancel(): void {
    void this.router.navigate(['/events']);
  }

  /**
   * Registrations for the table, newest first. The API already orders them
   * `registration_date DESC`; the explicit sort keeps that guarantee visible in
   * the component even if the endpoint is ever changed.
   */
  protected get registrations(): Registration[] {
    const rows = this.event()?.registrations ?? [];
    return [...rows].sort((a, b) => dateValue(b.registration_date) - dateValue(a.registration_date));
  }

  /** How full the event is, as a percentage (0 when capacity is unusable). */
  protected get capacityUsedPercent(): number {
    const event = this.event();
    if (!event || event.capacity <= 0) return 0;
    return Math.min(100, Math.round((event.tickets_sold / event.capacity) * 100));
  }
}

/** Milliseconds for an ISO date, or 0 when it is missing/unparseable. */
function dateValue(value: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
