'use strict';

/**
 * Chooses the data access layer at start-up.
 *
 *   USE_DEMO_DATA=true   -> always use the in-memory dataset
 *   otherwise            -> try MySQL; if the server is unreachable the API falls
 *                           back to the in-memory dataset and says so in /api/health
 *
 * This keeps the website demonstrable before the SCU cPanel database exists,
 * while the real submission uses MySQL.
 */

const mysql = require('mysql2/promise');
const { createSqlRepository } = require('./mysql-repository');
const { createDemoRepository } = require('./demo-repository');

let repository = null;
let pool = null;
let mode = 'unknown';
let modeDetail = '';

/** Promise that rejects after `ms` so a dead database cannot hang start-up. */
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function dbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'charity_events'
  };
}

/** Run `fn` inside a transaction with automatic commit / rollback. */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try { await conn.rollback(); } catch { /* connection already gone */ }
    throw error;
  } finally {
    conn.release();
  }
}

async function init() {
  const wantDemo = String(process.env.USE_DEMO_DATA || '').toLowerCase() === 'true';
  if (wantDemo) {
    repository = createDemoRepository();
    mode = 'demo';
    modeDetail = 'USE_DEMO_DATA=true in .env';
    return repository;
  }

  const config = dbConfig();
  try {
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true // return DATETIME as "YYYY-MM-DD HH:MM:SS" strings
    });
    const conn = await withTimeout(pool.getConnection(), 4000, 'MySQL connection timed out');
    await conn.ping();
    conn.release();

    repository = createSqlRepository(pool, withTransaction);
    mode = 'mysql';
    modeDetail = `connected to ${config.user}@${config.host}:${config.port}/${config.database}`;
    return repository;
  } catch (error) {
    if (pool) { try { await pool.end(); } catch { /* ignore */ } pool = null; }
    repository = createDemoRepository();
    mode = 'demo';
    modeDetail = `MySQL unavailable (${error.code || error.message}); using the in-memory dataset`;
    return repository;
  }
}

function getRepository() {
  if (!repository) throw new Error('Database not initialised - call initDb() first');
  return repository;
}

const getMode = () => mode;
const getModeDetail = () => modeDetail;

async function close() {
  if (repository) await repository.close();
  repository = null;
}

module.exports = { init, getRepository, getMode, getModeDetail, close, dbConfig };
