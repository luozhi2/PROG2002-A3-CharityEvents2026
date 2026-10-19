/**
 * Application-wide providers for the standalone admin app (no NgModules).
 *
 *  - provideRouter(routes)      : the admin routes from app.routes.ts
 *  - provideHttpClient()        : HttpClient used by every service in src/app/services
 *  - provideBrowserGlobalErrorListeners() : surfaces uncaught errors in the console
 */
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient()
  ]
};
