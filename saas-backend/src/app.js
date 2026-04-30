'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const logger = require('./config/logger');
const { pool } = require('./config/database');
const { redis } = require('./config/redis');

const correlationId = require('./middleware/correlationId');
const httpLogger = require('./middleware/httpLogger');
const metrics = require('./middleware/metrics');
const { ipLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const apiV1 = require('./api/v1/routes');

function buildApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(correlationId);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: config.isProd ? undefined : false,
  }));
  app.use(cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    maxAge: 600,
  }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use(cookieParser(config.cookie.secret));
  app.use(httpLogger);
  app.use(metrics.middleware);
  app.use(ipLimiter);

  app.get('/metrics', metrics.handler);
  app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'propintel-api' }));
  app.get('/readyz', async (req, res) => {
    const out = { db: 'down', redis: 'down' };
    try { await pool.query('SELECT 1'); out.db = 'up'; } catch (e) { logger.warn({ err: e }, 'readyz db'); }
    try { await redis.ping(); out.redis = 'up'; } catch (e) { logger.warn({ err: e }, 'readyz redis'); }
    const ok = out.db === 'up' && out.redis === 'up';
    res.status(ok ? 200 : 503).json(out);
  });

  app.use(config.apiPrefix, apiV1);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
