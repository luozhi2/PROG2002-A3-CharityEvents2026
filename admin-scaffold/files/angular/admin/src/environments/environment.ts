/**
 * Development environment settings.
 *
 * `apiBase` stays as the relative path "/api" so the app works in every
 * environment without edits:
 *   - `ng serve` proxies /api -> http://localhost:3000 (see proxy.conf.json)
 *   - the cPanel production build is served by the same Express app (same origin)
 *
 * `ng build --configuration production` replaces this file with
 * environment.production.ts (see angular.json -> fileReplacements).
 */
export const environment = {
  production: false,
  apiBase: '/api'
};
