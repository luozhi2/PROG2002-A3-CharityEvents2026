import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Fallback page for any URL that does not match a route.
 * It keeps the visitor inside the site instead of showing a blank screen.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <div class="empty-state">
        <div class="empty-state__icon" aria-hidden="true">🧭</div>
        <h1>We could not find that page</h1>
        <p>The link may be out of date, or the event may have been removed.</p>
        <div class="notfound-actions">
          <a class="button" routerLink="/">Go to the home page</a>
          <a class="button button--outline" routerLink="/search">Search for an event</a>
        </div>
      </div>
    </div>
  `,
  styles: `
    .empty-state { max-width: 34rem; margin-inline: auto; }
    .empty-state h1 { font-size: 1.5rem; }
    .notfound-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      margin-top: 1.5rem;
    }
  `
})
export class NotFoundPage {}
