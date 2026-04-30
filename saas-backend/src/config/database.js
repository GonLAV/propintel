'use strict';

const { Pool } = require('pg');
const config = require('./index');
const logger = require('./logger');

const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.poolMax,
  idleTimeoutMillis: config.database.idleTimeoutMs,
  connectionTimeoutMillis: config.database.connectionTimeoutMs,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => logger.error({ err }, 'PG pool error'));

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const ms = Date.now() - start;
  if (ms > 250) logger.warn({ ms, rows: res.rowCount, sql: text }, 'slow query');
  return res;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
