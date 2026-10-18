// Development environment settings.
// apiBase stays "/api" so the Angular dev server proxies requests to the Express
// API (see proxy.conf.json -> http://localhost:3000) and, in production on SCU
// cPanel, the built app is served by that same Express server.
export const environment = {
  production: false,
  apiBase: '/api'
};
