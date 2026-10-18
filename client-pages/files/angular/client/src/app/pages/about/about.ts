import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';

/**
 * About page.
 *
 * Explains the case study and, importantly for the marker, documents how the
 * website is put together: which API endpoints each page calls, how the data
 * flows, and where the external weather API fits in.
 */
@Component({
  selector: 'app-about',
  imports: [RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class AboutPage {
  /** Shown so the reader can see which API base the build is pointing at. */
  protected readonly apiBase = environment.apiBase;

  /** The endpoint map rendered as a table on the page. */
  protected readonly endpoints: { method: string; path: string; purpose: string; usedBy: string }[] = [
    { method: 'GET', path: '/api/health', purpose: 'Reports whether MySQL or the demo dataset is in use.', usedBy: 'Diagnostics' },
    { method: 'GET', path: '/api/events', purpose: 'Lists events with search, category, status and sort filters.', usedBy: 'Home, Search' },
    { method: 'GET', path: '/api/events/:id', purpose: 'One event plus all of its registrations, newest first.', usedBy: 'Event details' },
    { method: 'GET', path: '/api/events/:id/registrations', purpose: 'Registrations and ticket totals for one event.', usedBy: 'Event details' },
    { method: 'GET', path: '/api/categories', purpose: 'The categories used by the search filter.', usedBy: 'Home, Search' },
    { method: 'POST', path: '/api/registrations', purpose: 'Creates a registration after validation.', usedBy: 'Registration' },
    { method: 'GET', path: '/api/weather/event/:id', purpose: 'Proxies Open-Meteo for the event location.', usedBy: 'Event details' }
  ];
}
