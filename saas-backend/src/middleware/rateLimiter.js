'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redis } = require('../config/redis');
const config = require('../config');
const { TooMany } = require('../utils/errors');

function makeStore(prefix) {
  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: `rl:${prefix}:`,
  });
}

function buildLimiter({ windowMs, max, keyGenerator, prefix }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    store: makeStore(prefix),
    handler: (req, res, next) => next(TooMany()),
  });
}

const ipLimiter = buildLimiter({
  windowMs: config.rateLimit.ipWindowMs,
  max: config.rateLimit.ipMax,
  keyGenerator: (req) => req.ip,
  prefix: 'ip',
});

const userLimiter = buildLimiter({
  windowMs: config.rateLimit.userWindowMs,
  max: config.rateLimit.userMax,
  keyGenerator: (req) => (req.user ? `u:${req.user.id}` : `ip:${req.ip}`),
  prefix: 'user',
});

const authLimiter = buildLimiter({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  keyGenerator: (req) => `${req.ip}:${(req.body && req.body.email) || ''}`.toLowerCase(),
  prefix: 'auth',
});

module.exports = { ipLimiter, userLimiter, authLimiter };
