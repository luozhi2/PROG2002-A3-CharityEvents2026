import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CharityEvent, Registration, RegistrationRequest } from '../../models/api.models';
import { ApiError, EventService } from '../../services/event.service';
import { FormatService } from '../../services/format.service';

/**
 * Registration page (new in Assessment 3).
 *
 * The visitor arrives here from the event detail page with the event id in the
 * URL query string: /events/register?eventId=3
 *
 * The page then:
 *   1. loads the selected event through the API so the visitor can confirm what
 *      they are registering for, including how many tickets remain;
 *   2. validates the form on the client (required fields, email format, phone
 *      digits, ticket range, tickets <= remaining capacity) and shows inline
 *      messages plus a summary alert when submission is blocked;
 *   3. POSTs to /api/registrations and reports the result;
 *   4. on success shows a confirmation panel with the registration reference and
 *      the options to register for another event or return to the event page.
 */
@Component({
  selector: 'app-registration',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registration.html',
  styleUrl: './registration.css'
})
export class RegistrationPage implements OnInit {
  private readonly events = inject(EventService);
  private readonly format = inject(FormatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // --- event state ----------------------------------------------------------
  protected readonly loadingEvent = signal(true);
  protected readonly eventError = signal<string | null>(null);
  protected readonly event = signal<CharityEvent | null>(null);

  // --- submission state ----------------------------------------------------
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly serverDetails = signal<string[]>([]);
  protected readonly confirmation = signal<Registration | null>(null);

  /** Set when the form was submitted with invalid values. */
  protected readonly validationAttempted = signal(false);

  /** The event id taken from the URL, or null when the link was incomplete. */
  protected readonly eventId = signal<number | null>(null);

  /** Tickets still available for the selected event. */
  protected readonly remaining = computed(() => {
    const current = this.event();
    return current ? this.format.remaining(current.capacity, current.tickets_sold) : 0;
  });

  /**
   * Why registration is closed, or null when the form should be shown.
   *
   * Checked before the form is rendered so a visitor who reaches this page with a
   * direct link (/events/register?eventId=1) is told plainly that the event is
   * sold out or closed, instead of being shown a form that can never validate.
   */
  protected readonly blockedReason = computed<string | null>(() => {
    const current = this.event();
    if (!current) return null;
    if (current.status !== 'Active') {
      return `This event is currently ${current.status.toLowerCase()}, so online registration is closed.`;
    }
    if (this.remaining() <= 0) {
      return 'Every ticket for this event has already been taken, so no further registrations can be accepted.';
    }
    return null;
  });

  /** Estimated total price for the number of tickets currently entered. */
  protected readonly estimatedTotal = computed(() => {
    const current = this.event();
    const tickets = Number(this.form.controls.tickets.value) || 0;
    return current ? current.ticket_price * tickets : 0;
  });

  /**
   * The registration form.
   *
   * A custom validator (ticketsAvailable) cross-checks the entered ticket count
   * against the capacity that the API reported, so the user is told before the
   * request is sent that there are not enough tickets left.
   */
  protected readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    phone: ['', [Validators.required, this.phoneValidator()]],
    tickets: [1, [Validators.required, Validators.min(1), Validators.max(20), this.ticketsAvailable()]],
    notes: ['', [Validators.maxLength(255)]]
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('eventId');
      const id = raw ? Number(raw) : NaN;

      if (!Number.isInteger(id) || id < 1) {
        this.eventError.set(
          'No event was selected. Open an event from the search page and use its Register button.'
        );
        this.loadingEvent.set(false);
        return;
      }

      this.eventId.set(id);
      this.loadEvent(id);
    });
  }

  /** Load the event being registered for. */
  private loadEvent(id: number): void {
    this.loadingEvent.set(true);
    this.eventError.set(null);

    this.events.getEvent(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.loadingEvent.set(false);

        // Pre-select a sensible number of tickets: one, or fewer if that is all
        // that is left. When nothing is left the form is not rendered at all
        // (see blockedReason), so the value is only a placeholder.
        const remaining = this.format.remaining(event.capacity, event.tickets_sold);
        this.form.controls.tickets.setValue(remaining > 0 ? 1 : 0);
        this.form.controls.tickets.updateValueAndValidity();
      },
      error: (error: ApiError) => {
        this.eventError.set(
          error.status === 404
            ? 'That event no longer exists, so a registration cannot be created.'
            : error.message
        );
        this.loadingEvent.set(false);
      }
    });
  }

  /** Custom validator: an Australian-style phone number of 8 to 15 digits. */
  private phoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '').trim();
      if (!value) return null; // "required" already covers the empty case.
      const digits = value.replace(/[^0-9]/g, '');
      if (digits.length < 8 || digits.length > 15) {
        return { phone: 'Enter a phone number with 8 to 15 digits.' };
      }
      return null;
    };
  }

  /** Custom validator: the requested tickets must fit the remaining capacity. */
  private ticketsAvailable(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = Number(control.value);
      if (!Number.isFinite(value)) return null;
      const available = this.remaining();
      if (this.event() && value > available) {
        return {
          capacity: available > 0
            ? `Only ${available} ticket(s) remain for this event.`
            : 'This event is sold out.'
        };
      }
      return null;
    };
  }

  /** The form control names, used for typing the error helpers below. */
  private static readonly FIELDS = ['full_name', 'email', 'phone', 'tickets', 'notes'] as const;

  /** True when the named control is invalid and the user should see the error. */
  protected showError(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || this.validationAttempted());
  }

  /** The first validation message for a control, or null. */
  protected errorFor(name: string): string | null {
    const control = this.form.get(name);
    if (!control || !control.errors) return null;

    if (control.errors['required']) return 'This field is required.';
    if (control.errors['email']) return 'Enter a valid email address, for example name@example.com.';
    if (control.errors['minlength']) {
      return `Enter at least ${control.errors['minlength'].requiredLength} characters.`;
    }
    if (control.errors['maxlength']) {
      return `Use no more than ${control.errors['maxlength'].requiredLength} characters.`;
    }
    if (control.errors['phone']) return String(control.errors['phone']);
    if (control.errors['capacity']) return String(control.errors['capacity']);
    if (control.errors['min']) return 'Enter at least 1 ticket.';
    if (control.errors['max']) return 'The maximum is 20 tickets per registration.';
    return 'Please check this value.';
  }

  /** A list of every validation problem, shown in one alert on submit. */
  protected validationSummary(): string[] {
    const messages: string[] = [];
    const labels: Record<string, string> = {
      full_name: 'Full name',
      email: 'Email address',
      phone: 'Phone number',
      tickets: 'Number of tickets',
      notes: 'Notes'
    };

    for (const name of RegistrationPage.FIELDS) {
      const control = this.form.get(name)!;
      if (control.invalid) {
        messages.push(`${labels[name]}: ${this.errorFor(name)}`);
      }
    }
    return messages;
  }

  /** True while the form is invalid, used to describe the disabled button. */
  protected get formInvalid(): boolean {
    return this.form.invalid;
  }

  /**
   * Submit the registration.
   *
   * Validation first (client side), then the POST. A 409 from the API - duplicate
   * email or not enough tickets left - is shown as an explanatory alert rather
   * than a generic failure.
   */
  protected submit(): void {
    this.validationAttempted.set(true);
    this.submitError.set(null);
    this.serverDetails.set([]);

    if (this.form.invalid) {
      // Mark every control as touched so the inline messages appear.
      this.form.markAllAsTouched();
      return;
    }

    const id = this.eventId();
    if (!id) {
      this.submitError.set('No event was selected, so the registration cannot be submitted.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: RegistrationRequest = {
      event_id: id,
      full_name: value.full_name.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      tickets: Number(value.tickets),
      notes: value.notes?.trim() ? value.notes.trim() : null
    };

    this.submitting.set(true);

    this.events.createRegistration(payload).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.submitted.set(true);
        this.confirmation.set(response.registration);
        this.event.set(response.event);
        // The confirmation replaces the form, so move the viewport to the top of
        // the page where the confirmation message is rendered.
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error: ApiError) => {
        this.submitting.set(false);
        this.submitError.set(error.message);
        this.serverDetails.set(error.details);
      }
    });
  }

  /** Start again: clear the form and the previous errors for another booking. */
  protected registerAnother(): void {
    this.submitted.set(false);
    this.confirmation.set(null);
    this.submitError.set(null);
    this.serverDetails.set([]);
    this.validationAttempted.set(false);
    this.form.reset({ full_name: '', email: '', phone: '', tickets: 1, notes: '' });
    this.form.controls.tickets.updateValueAndValidity();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Go back to the event that was just booked. */
  protected backToEvent(): void {
    const id = this.eventId();
    if (id) this.router.navigate(['/events', id]);
  }

  // Template helpers.
  protected formatDate(value: string | null): string { return this.format.eventDate(value); }
  protected formatTime(value: string | null): string { return this.format.time(value); }
  protected formatPrice(value: number): string { return this.format.price(value, true); }
  protected formatDateTime(value: string | null): string { return this.format.dateTime(value); }
}
