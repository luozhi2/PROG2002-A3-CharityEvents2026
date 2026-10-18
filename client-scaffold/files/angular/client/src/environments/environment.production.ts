// Production environment settings.
// Because api/public/client is served by the Express API itself, the API lives at
// the same origin and no absolute URL (and therefore no CORS) is required.
export const environment = {
  production: true,
  apiBase: '/api'
};
