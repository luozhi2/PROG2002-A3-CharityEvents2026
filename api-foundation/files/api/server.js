'use strict';

/**
 * PROG2002 Web Development II - Assessment 3
 * Charity Events RESTful API (Node.js + Express + MySQL)
 *
 * Start locally:   npm install && npm start        -> http://localhost:3000
 * On SCU cPanel:   register this file as the Application startup file.
 *
 * The same process also serves the two Angular production builds when they are
 * present in api/public (see docs/DEPLOYMENT.md), which is how the site runs on
 * cPanel:
 *     /            -> client website   (api/public/client)
 *     /admin       -> admin website    (api/public/admin)
 */

require('dotenv').config();

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const eventsRouter = require('./routes/events');
const categoriesRouter = require('./routes/categories');
const registrationsRouter = require('./routes/registrations');
const weatherRouter = require('./routes/weather');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.disable('x-powered-by');

// CORS is enabled so the Angular dev servers (ports 4200 and 4201) can call this
// API during development. In production on cPanel both apps are served from the
// same origin, so no cross-origin request is made.
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Development request log: one line per API call, which makes the "data flow"
// section of the demo video easy to narrate.
app.use('/api', (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started} ms)`);
  });
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    database: db.getMode(),
    detail: db.getModeDetail(),
    time: new Date().toISOString(),
    version: require('./package.json').version
  });
});

app.use('/api/events', eventsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/weather', weatherRouter);

// ---------------------------------------------------------------------------
// Serve the built Angular applications when they exist (production / cPanel).
// ---------------------------------------------------------------------------
const PUBLIC_DIR = path.join(__dirname, 'public');
const CLIENT_DIR = path.join(PUBLIC_DIR, 'client');
const ADMIN_DIR = path.join(PUBLIC_DIR, 'admin');

/** Serve a static Angular build and make unknown routes fall back to index.html. */
function mountSpa(urlPath, directory) {
  if (!fs.existsSync(path.join(directory, 'index.html'))) return false;
  app.use(urlPath, express.static(directory, { index: false }));
  app.get(new RegExp(`^${urlPath === '/' ? '' : urlPath}/.*$`), (req, res) => {
    res.sendFile(path.join(directory, 'index.html'));
  });
  return true;
}

const adminMounted = mountSpa('/admin', ADMIN_DIR);
const clientMounted = mountSpa('/', CLIENT_DIR);

// Shared assets such as the generated brand images live directly in public/.
app.use(express.static(PUBLIC_DIR));

// A friendly landing response when the client app has not been built yet.
if (!clientMounted) app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>PROG2002 A3 API</title>
<style>body{font-family:system-ui,sans-serif;max-width:44rem;margin:3rem auto;line-height:1.6;padding:0 1rem}
code{background:#f2f2f2;padding:.15rem .35rem;border-radius:4px}</style></head>
<body>
  <h1>Charity Events API is running</h1>
  <p>Database mode: <strong>${db.getMode()}</strong> &mdash; ${db.getModeDetail()}</p>
  <p>The Angular websites have not been built into <code>api/public</code> yet.</p>
  <ul>
    <li>API health: <a href="/api/health">/api/health</a></li>
    <li>Events: <a href="/api/events">/api/events</a></li>
    <li>Categories: <a href="/api/categories">/api/categories</a></li>
    <li>Weather example: <a href="/api/weather?latitude=-28.813&amp;longitude=153.278">/api/weather?latitude=-28.813&amp;longitude=153.278</a></li>
  </ul>
</body></html>`);
});

// ---------------------------------------------------------------------------
// 404 + error handling for the API
// ---------------------------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Unknown API endpoint: ${req.method} ${req.originalUrl}` });
});

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
app.use((error, req, res, next) => {
  console.error('[api error]', error);
  const status = error.status || 500;
  res.status(status).json({
    error: status === 500 ? 'The server could not complete the request.' : error.message,
    details: process.env.NODE_ENV === 'production' ? undefined : [String(error.message)]
  });
});

// ---------------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------------
async function start() {
  const repository = await db.init();
  const mode = db.getMode();
  console.log(`[db] mode=${mode} (${db.getModeDetail()})`);
  if (mode === 'demo') {
    console.log('[db] Using the in-memory demo dataset. Import schema.sql + seed.sql and set ' +
                'the DB_* variables in .env to use MySQL.');
  }

  const server = app.listen(PORT, () => {
    console.log(`[api] Charity Events API listening on http://localhost:${PORT}`);
    console.log(`[api] client build served: ${clientMounted ? 'yes' : 'no'}  admin build served: ${adminMounted ? 'yes' : 'no'}`);
  });

  // Close the database pool cleanly so cPanel restarts do not leak connections.
  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return { app, server, repository };
}

if (require.main === module) {
  start().catch((error) => {
    console.error('[api] failed to start', error);
    process.exit(1);
  });
}

module.exports = { app, start };
