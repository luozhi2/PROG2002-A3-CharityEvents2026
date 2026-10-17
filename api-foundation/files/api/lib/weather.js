'use strict';

/**
 * Open-Meteo integration (optional external API, Part 6 of the brief).
 *
 * The browser asks our own API (/api/weather) and our API calls Open-Meteo
 * server side. Benefits of proxying rather than calling Open-Meteo directly
 * from the Angular app:
 *   - the WMO weather codes are translated once, here, and the client just
 *     renders a description;
 *   - responses are cached for 30 minutes, so a busy page cannot burn through
 *     the free API quota;
 *   - no third-party host has to be allow-listed in the browser.
 */

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

/** WMO weather interpretation codes, as listed in the assessment brief. */
const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear, partly cloudy, and overcast',
  2: 'Mainly clear, partly cloudy, and overcast',
  3: 'Mainly clear, partly cloudy, and overcast',
  45: 'Fog and depositing rime fog',
  48: 'Fog and depositing rime fog',
  51: 'Drizzle: Light, moderate, and dense',
  53: 'Drizzle: Light, moderate, and dense',
  55: 'Drizzle: Light, moderate, and dense',
  61: 'Rain: Light, moderate, and heavy',
  63: 'Rain: Light, moderate, and heavy',
  65: 'Rain: Light, moderate, and heavy',
  80: 'Rain showers: Light, moderate, and violent',
  81: 'Rain showers: Light, moderate, and violent',
  82: 'Rain showers: Light, moderate, and violent',
  95: 'Thunderstorm: Slight or moderate'
};

/** Short label used for the coloured badge on the event page. */
const WEATHER_LABELS = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  80: 'Light showers', 81: 'Showers', 82: 'Violent showers', 95: 'Thunderstorm'
};

const describe = (code) => WEATHER_CODES[code] || 'Unknown';
const label = (code) => WEATHER_LABELS[code] || 'Unknown';

/** Tiny in-memory cache: key -> { expires, payload }. */
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { cache.delete(key); return null; }
  return hit.payload;
}

function cacheSet(key, payload) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

/**
 * Fetch a forecast from Open-Meteo.
 * @param {{ latitude: number, longitude: number, timezone?: string }} options
 * @returns {Promise<object>} normalised payload
 */
async function fetchForecast({ latitude, longitude, timezone = 'Australia/Sydney' }) {
  const key = `${Number(latitude).toFixed(3)},${Number(longitude).toFixed(3)},${timezone}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('forecast_days', '7');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const error = new Error(`Open-Meteo responded with HTTP ${response.status}`);
    error.status = 502;
    throw error;
  }

  const body = await response.json();
  const daily = body.daily || {};
  const dates = daily.time || [];

  const payload = {
    latitude: Number(body.latitude ?? latitude),
    longitude: Number(body.longitude ?? longitude),
    timezone: body.timezone || timezone,
    days: dates.length,
    daily: dates.map((date, index) => {
      const code = Number(daily.weather_code?.[index] ?? -1);
      return {
        date,
        weather_code: code,
        description: describe(code),
        label: label(code),
        temperature_max: daily.temperature_2m_max?.[index] ?? null,
        temperature_min: daily.temperature_2m_min?.[index] ?? null
      };
    }),
    source: OPEN_METEO_URL,
    cached: false
  };

  cacheSet(key, payload);
  return payload;
}

module.exports = { fetchForecast, describe, label, WEATHER_CODES, WEATHER_LABELS, OPEN_METEO_URL };
