/**
 * New Event page (route /events/new).
 *
 * Hosts the shared <app-event-form /> and owns everything that is specific to
 * creating an event:
 *   - calls POST /api/events through EventService when the form emits a valid
 *     payload (client-side validation has already run inside the form);
 *   - shows a success banner containing the id of the event the API created;
 *   - on HTTP 400 shows the API's `error` message plus every entry of its
 *     `details[]` array, and maps those strings back onto the offending fields
 *     so the admin can see exactly what to fix.
 */

import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EventFormComponent, EventFormFieldErrors } from '../../components/event-form/event-form.component';
import { EventPayload } from '../../models/api.models';
import { EventService } from '../../services/event.service';
import { ApiFailure, formatDateTime, mapDetailsToFields, toApiFailure } from '../../shared/api-format';

/** The banner shown after a successful create. */
interface CreatedEvent {
  event_id: number;
  event_name: string;
  event_date: string | null;
  editUrl: string;
}

@Component({
  selector: 'app-event-new-page',
  imports: [EventFormComponent, RouterLink],
  templateUrl: './event-new.page.html',
  styleUrl: './event-new.page.css'
})
export class EventNewPage {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly failure = signal<ApiFailure | null>(null);
  protected readonly fieldErrors = signal<EventFormFieldErrors>({});
  protected readonly created = signal<CreatedEvent | null>(null);

  /** Bumped after a successful save so the form resets to its defaults. */
  protected readonly formVersion = signal(0);

  /** Format the created event's date for the success banner. */
  protected readonly formatDateTime = formatDateTime;

  /**
   * POST /api/events with the payload the form validated and emitted.
   * The API answers 201 with { message, event }.
   */
  protected onSave(payload: EventPayload): void {
    this.saving.set(true);
    this.failure.set(null);
    this.fieldErrors.set({});

    this.eventService.create(payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.created.set({
          event_id: response.event.event_id,
          event_name: response.event.event_name,
          event_date: response.event.event_date,
          editUrl: `/events/${response.event.event_id}/edit`
        });
        // Reset the form for the next event ("create another" workflow).
        this.formVersion.update((version) => version + 1);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const failure = toApiFailure(error);
        this.failure.set(failure);
        this.fieldErrors.set(mapDetailsToFields(failure.details));
      }
    });
  }

  /** Cancel returns to the events list without sending anything. */
  protected onCancel(): void {
    void this.router.navigate(['/events']);
  }

  /** Dismiss the success banner so another event can be entered. */
  protected clearCreated(): void {
    this.created.set(null);
  }
}
