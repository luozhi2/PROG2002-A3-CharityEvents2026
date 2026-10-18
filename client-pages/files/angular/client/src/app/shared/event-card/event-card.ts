import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CharityEvent } from '../../models/api.models';
import { FormatService } from '../../services/format.service';

/**
 * A single event summary card.
 *
 * Reused by the home page and the search page so the presentation of an event is
 * defined in exactly one place. The card links to the event detail page, which is
 * then responsible for fetching that event's registrations.
 */
@Component({
  selector: 'app-event-card',
  imports: [RouterLink],
  templateUrl: './event-card.html',
  styleUrl: './event-card.css'
})
export class EventCardComponent {
  @Input({ required: true }) event!: CharityEvent;

  /** Highlighted styling for the first card on the home page. */
  @Input() featured = false;

  private readonly format = inject(FormatService);

  // The template calls these wrappers rather than the service directly, which
  // keeps the template readable and avoids repeating the service name everywhere.
  formatPrice(value: number): string { return this.format.price(value, true); }
  formatDate(value: string | null): string { return this.format.eventDate(value); }
  formatTime(value: string | null): string { return this.format.time(value); }
  countdown(value: string | null): string { return this.format.countdown(value); }
  percentSold(event: CharityEvent): number { return this.format.percentSold(event.tickets_sold, event.capacity); }
  remaining(event: CharityEvent): number { return this.format.remaining(event.capacity, event.tickets_sold); }
}
