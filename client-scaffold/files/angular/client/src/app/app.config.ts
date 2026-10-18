import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

/**
 * Application-wide providers.
 *
 * - provideRouter            : client-side routing between the pages
 * - withInMemoryScrolling    : return to the top when navigating to a new page
 * - provideHttpClient        : the HttpClient used by EventService to call the API
 * - withFetch                : use the modern Fetch API backend for HttpClient
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withFetch()),
    provideZonelessChangeDetection()
  ]
};
