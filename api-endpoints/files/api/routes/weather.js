'use strict';

/**
 * Weather endpoints (optional external API - Open-Meteo).
 *
 *   GET /api/weather?latitude=-28.813&longitude=153.278
 *   GET /api/weather/event/:id          uses the coordinates stored on the event
 *
 * The Open-Meteo response is normalised and the WMO weather codes are
 * translated into text, so the Angular components only render data.
 */

const express = require('express');
const { getRepository } = require('../db');
const { fetchForecast, WEATHER_CODES } = require('../lib/weather');
const { ok, fail } = require('../lib/responses');

const router = express.Router();

/** Reject missing or out-of-range coordinates before calling the external API. */
function parseCoordinates(query) {
  const latitude = Number(query.latitude);
  const longitude = Number(query.longitude);
  const errors = [];

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push('latitude is required and must be a number between -90 and 90.');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push('longitude is required and must be a number between -180 and 180.');
  }
  return { latitude, longitude, errors };
}

// ---------------------------------------------------------------------------
// GET /api/weather/codes - the WMO code legend used to build the page legend
// ---------------------------------------------------------------------------
router.get('/codes', (req, res) => {
  const codes = Object.entries(WEATHER_CODES).map(([code, description]) => ({
    code: Number(code),
    description
  }));
  ok(res, { count: codes.length, codes });
});

// ---------------------------------------------------------------------------
// GET /api/weather/event/:id
// ---------------------------------------------------------------------------
router.get('/event/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return fail(res, 400, 'The event id must be a positive integer.');
    }

    const event = await getRepository().getEventCoordinates(id);
    if (!event) return fail(res, 404, `No event found with id ${id}.`);

    if (event.latitude === null || event.longitude === null) {
      return fail(res, 409,
        `"${event.event_name}" does not have coordinates recorded, so no forecast is available. ` +
        'Add latitude and longitude to the event in the admin website.');
    }

    const forecast = await fetchForecast({
      latitude: Number(event.latitude),
      longitude: Number(event.longitude)
    });

    ok(res, {
      ...forecast,
      event_id: event.event_id,
      event_name: event.event_name,
      location_name: event.location_name
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/weather?latitude=&longitude=
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { latitude, longitude, errors } = parseCoordinates(req.query);
    if (errors.length) return fail(res, 400, 'The coordinates are not valid.', errors);

    const forecast = await fetchForecast({ latitude, longitude });
    ok(res, forecast);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
