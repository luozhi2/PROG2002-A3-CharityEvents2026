/**
 * EventFormComponent - the shared, validated reactive form behind both the
 * "New Event" and "Edit Event" pages.
 *
 * Responsibilities (all the client-side validation lives here so the two pages
 * cannot drift apart):
 *   - build the reactive form with the same rules the API enforces in
 *     api/lib/validate.js (name 3..150, capacity >= 1 whole number,
 *     ticket_price >= 0, latitude -90..90, longitude -180..180, ...);
 *   - load the category dropdown options from GET /api/categories;
 *   - show a field-level message under every control that is invalid and has
 *     been touched (or after a submit attempt);
 *   - pre-fill from an existing event when the Edit page passes one in;
 *   - emit a ready-to-send EventPayload only when the form is valid - the
 *     parent page performs the POST/PUT so it can own the success/error banners.
 *
 * The component never calls the API itself, which keeps it reusable and easy to
 * test.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Category, EVENT_STATUSES, EventItem, EventPayload, EventStatus } from '../../models/api.models';
import { CategoryService } from '../../services/category.service';
import { formatCurrency, formatDateTime } from '../../shared/api-format';
import { fromSydneyInputValue, sydneyZoneAbbreviation, toSydneyInputValue } from '../../shared/timezone';


/**
 * Optional extra information the parent page can hand back after a failed API
 * call, mapped to form control names so the message appears under the field.
 * (The API's 400 `details[]` strings are also shown in the page banner.)
 */
export interface EventFormFieldErrors {
  [controlName: string]: string;
}

@Component({
  selector: 'app-event-form',
  imports: [ReactiveFormsModule],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.css'
})
export class EventFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);

  /** Existing event (edit mode) or null (create mode). */
  readonly event = input<EventItem | null>(null);

  /**
   * Bumped by the parent after a successful save so the form re-reads the
   * `event` input. A signal input is only allowed to change from the parent
   * inside an effect, which is exactly how it is used here.
   */
  readonly reloadToken = input(0);

  /** True while the parent's POST/PUT is in flight - disables the buttons. */
  readonly submitting = input(false);

  /** Extra messages keyed by control name, e.g. a 409 capacity conflict. */
  readonly fieldErrors = input<EventFormFieldErrors>({});

  /** Emitted with a validated payload; the parent sends it to the API. */
  readonly saveEvent = output<EventPayload>();

  /** Emitted when the admin abandons the form. */
  readonly cancelled = output<void>();

  protected readonly statuses = EVENT_STATUSES;

  /** Category dropdown options, loaded from the API on start-up. */
  protected readonly categories = signal<Category[]>([]);
  protected readonly categoriesError = signal<string | null>(null);
  protected readonly loadingCategories = signal(true);

  /** Set once the admin presses Save, so every invalid field reports at once. */
  protected readonly submitted = signal(false);

  /** True when the form currently holds an existing event (edit mode). */
  protected readonly isEditMode = signal(false);

  /**
   * The reactive form. `nonNullable` is used everywhere so the payload never
   * contains nulls the API would reject for required fields.
   */
  protected readonly form = this.formBuilder.nonNullable.group(
    {
      event_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      category_id: [0, [Validators.required, Validators.min(1)]],
      event_date: ['', [Validators.required, dateTimeValidator]],
      end_date: ['', [dateTimeValidator]],
      location_name: ['', [Validators.required, Validators.maxLength(150)]],
      address: ['', [Validators.maxLength(255)]],
      capacity: [100, [Validators.required, Validators.min(1), integerValidator]],
      ticket_price: [0, [Validators.required, Validators.min(0)]],
      status: ['Active' as EventStatus, [Validators.required]],
      description: ['', [Validators.maxLength(5000)]],
      latitude: ['', [numberInRangeValidator(-90, 90)]],
      longitude: ['', [numberInRangeValidator(-180, 180)]]
    },
    { validators: endAfterStartValidator }
  );

  constructor() {
    this.loadCategories();

    // Re-fill the form whenever the parent supplies a different event (the Edit
    // page loads it asynchronously) or asks for a refresh after a save.
    effect(() => {
      const event = this.event();
      this.reloadToken();
      if (event) this.applyEvent(event);
    });
  }

  /** GET /api/categories - used for the Category dropdown. */
  private loadCategories(): void {
    this.categoryService
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (response) => {
          this.categories.set(response.categories);
          this.loadingCategories.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.categoriesError.set(
            error.status === 0
              ? 'The category list could not be loaded because the API is not reachable.'
              : 'The category list could not be loaded.'
          );
          this.loadingCategories.set(false);
        }
      });
  }

  /**
   * Copy an event from the API into the form.
   *
   * Datetimes arrive as UTC instants and are converted to **Sydney** wall-clock
   * values for the datetime-local inputs, so staff always see the venue's local
   * time no matter which timezone their own computer is set to. Numbers become
   * strings because that is what text/number inputs hold.
   */
  private applyEvent(event: EventItem): void {
    this.isEditMode.set(true);
    this.form.patchValue({
      event_name: event.event_name,
      category_id: event.category_id,
      event_date: toSydneyInputValue(event.event_date),
      end_date: toSydneyInputValue(event.end_date),
      location_name: event.location_name,
      address: event.address ?? '',
      capacity: event.capacity,
      ticket_price: event.ticket_price,
      status: event.status,
      description: event.description ?? '',
      latitude: event.latitude === null ? '' : String(event.latitude),
      longitude: event.longitude === null ? '' : String(event.longitude)
    });
    this.form.markAsPristine();
  }

  /** Submit handler: validate, then hand the payload to the parent page. */
  protected onSubmit(): void {
    this.submitted.set(true);
    // Everything is trimmed by the API too, but trimming here means "   " is
    // caught by the required/minLength rules before a request is made.
    this.trimTextControls();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveEvent.emit(this.buildPayload());
  }

  /** Ask the page to confirm and then discard the entered values. */
  protected onCancel(): void {
    this.cancelled.emit();
  }

  /** 'Active' | 'Past' | 'Suspended' for the radio group. */
  protected setStatus(status: EventStatus): void {
    this.form.controls.status.setValue(status);
  }

  /**
   * Convert the form value into the JSON body POST/PUT /api/events expects.
   *
   * The datetimes the staff member typed are Sydney wall-clock values; they are
   * converted to ISO instants so the API receives an unambiguous moment. Optional
   * text fields become null (not "") so MySQL stores NULL.
   */
  private buildPayload(): EventPayload {
    const value = this.form.getRawValue();
    return {
      event_name: value.event_name.trim(),
      category_id: Number(value.category_id),
      event_date: fromSydneyInputValue(value.event_date) ?? value.event_date,
      end_date: value.end_date ? fromSydneyInputValue(value.end_date) : null,
      location_name: value.location_name.trim(),
      address: value.address.trim() ? value.address.trim() : null,
      capacity: Number(value.capacity),
      ticket_price: Number(value.ticket_price),
      status: value.status,
      description: value.description.trim() ? value.description.trim() : null,
      latitude: value.latitude === '' ? null : Number(value.latitude),
      longitude: value.longitude === '' ? null : Number(value.longitude)
    };
  }

  /** Trim every text control in place so validation sees the real value. */
  private trimTextControls(): void {
    const controls = this.form.controls;
    const textNames = ['event_name', 'location_name', 'address', 'description'] as const;
    for (const name of textNames) {
      const control = controls[name];
      if (typeof control.value === 'string') control.setValue(control.value.trim());
    }
  }

  /**
   * Should the field-level message be shown? Yes when the control is invalid and
   * the admin has touched it (or pressed Save), which avoids nagging messages on
   * a form that has not been filled in yet.
   */
  private showError(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  /**
   * One human-readable message per invalid control. Server-side messages that
   * arrived through the `fieldErrors` input win, because they explain what the
   * API actually rejected.
   */
  protected errorFor(name: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[name];
    if (!this.showError(control)) return null;

    const serverMessage = this.fieldErrors()[name];
    if (serverMessage) return serverMessage;

    const errors: ValidationErrors | null = control.errors;
    if (!errors) return null;

    // Each ValidationErrors entry is pulled out with a concrete shape, because
    // the interface itself types every value as `any`.
    const required = errors['required'] as boolean | undefined;
    const minlength = errors['minlength'] as { requiredLength: number } | undefined;
    const maxlength = errors['maxlength'] as { requiredLength: number } | undefined;
    const min = errors['min'] as { min: number } | undefined;
    const range = errors['range'] as { min: number; max: number } | undefined;

    if (required) return 'This field is required.';
    if (minlength) return `Please use at least ${minlength.requiredLength} characters.`;
    if (maxlength) return `Please use no more than ${maxlength.requiredLength} characters.`;
    if (min) return `The value must be ${min.min} or more.`;
    if (errors['integer']) return 'Please enter a whole number.';
    if (errors['dateTime']) return 'Please enter a valid date and time.';
    if (range) return `Please enter a number between ${range.min} and ${range.max}.`;
    return 'Please check this value.';
  }

  /**
   * Form-level message for the cross-field rule "end_date cannot be earlier
   * than event_date" (also enforced by the API).
   */
  protected get endDateError(): string | null {
    const control = this.form.controls.end_date;
    if (!control.value) return null;
    if (!(control.touched || this.submitted())) return null;
    return this.form.hasError('endBeforeStart')
      ? 'The end date and time cannot be earlier than the start.'
      : null;
  }

  /** Human summary of the event being edited (shown above the fields). */
  protected get editingLabel(): string {
    const event = this.event();
    return event
      ? `#${event.event_id} · ${event.event_name} · ${formatDateTime(event.event_date)}`
      : '';
  }

  /** Formats the price hint with the same currency helper the list pages use. */
  protected priceHint(): string {
    const price = Number(this.form.controls.ticket_price.value || 0);
    return price > 0 ? `Each ticket currently costs ${formatCurrency(price)}.` : 'Free event.';
  }

  /** The timezone the date fields are expressed in, shown beside the labels. */
  protected readonly zoneLabel = sydneyZoneAbbreviation();
}

// ---------------------------------------------------------------------------
// Custom validators
// ---------------------------------------------------------------------------

/**
 * Accepts an empty value (the API treats those fields as optional) and checks
 * that anything else parses into a real Date - mirrors toSqlDateTime().
 */
const dateTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = typeof control.value === 'string' ? control.value.trim() : '';
  if (raw === '') return null;
  return Number.isNaN(new Date(raw).getTime()) ? { dateTime: true } : null;
};

/** Capacity must be a whole number - the API rejects 12.5 with a 400. */
const integerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  return Number.isInteger(Number(value)) ? null : { integer: true };
};

/**
 * Optional numeric field with a legal range (latitude/longitude). An empty box is
 * allowed because the brief lists those fields as optional.
 */
function numberInRangeValidator(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return { range: { min, max } };
    return numeric < min || numeric > max ? { range: { min, max } } : null;
  };
}

/**
 * Cross-field check applied to the whole group: an end date, when supplied, may
 * not precede the start date. Matches the API's own rule.
 */
const endAfterStartValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('event_date')?.value as string | null;
  const end = group.get('end_date')?.value as string | null;
  if (!start || !end) return null;
  // Compare the real instants rather than the wall-clock strings, so the rule
  // stays correct across a daylight-saving change.
  const startInstant = fromSydneyInputValue(start);
  const endInstant = fromSydneyInputValue(end);
  if (!startInstant || !endInstant) return null;
  return new Date(endInstant).getTime() < new Date(startInstant).getTime()
    ? { endBeforeStart: true }
    : null;
};
