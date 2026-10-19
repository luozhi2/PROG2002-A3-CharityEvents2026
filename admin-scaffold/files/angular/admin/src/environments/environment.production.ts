/**
 * Production environment settings.
 *
 * The built admin site is uploaded to api/public/admin and served by the same
 * Express process as the REST API, so the relative "/api" base is correct on
 * cPanel as well. The only difference from environment.ts is the flag.
 */
export const environment = {
  production: true,
  apiBase: '/api'
};
