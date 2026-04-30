'use strict';

const pino = require('pino');
const config = require('./index');

const logger = pino({
  level: config.logLevel,
  base: { service: 'propintel-api', env: config.env },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.password_hash',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
