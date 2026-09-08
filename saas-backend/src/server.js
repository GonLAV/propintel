'use strict';

require('dotenv').config();

const config = require('./config');
const logger = require('./config/logger');
const { pool } = require('./config/database');
const { redis } = require('./config/redis');
const { buildApp } = require('./app');
const { closeBrowser } = require('./api/v1/services/pdf/pdfRenderer');

async function main() {
  const app = buildApp();

  try { await pool.query('SELECT 1'); logger.info('db ready'); }
  catch (err) { logger.error({ err }, 'db not reachable'); process.exit(1); }

  try { await redis.ping(); logger.info('redis ready'); }
  catch (err) { logger.error({ err }, 'redis not reachable'); process.exit(1); }

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'api listening');
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'graceful shutdown');
    server.close(() => logger.info('http server closed'));
    try { await closeBrowser(); } catch (e) { logger.warn({ err: e }, 'pdf browser close'); }
    try { await pool.end(); } catch (e) { logger.warn({ err: e }, 'pool end'); }
    try { await redis.quit(); } catch (e) { logger.warn({ err: e }, 'redis quit'); }
    setTimeout(() => process.exit(0), 250).unref();
  };
  ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));

  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    shutdown('uncaughtException');
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal startup error', err);
  process.exit(1);
});
