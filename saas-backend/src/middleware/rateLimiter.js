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
  // Most auth endpoints carry `email` in the body, keying the budget per
  // (ip, account). A few carry a one-time `token` instead (invite
  // accept/info, password-reset confirm), and password/change is
  // authenticated but has neither -- falling through to a shared
  // empty-string key would collapse every such request from one IP into a
  // single bucket, so a handful of concurrent invite-accepts from one
  // office network (or just a few password changes) could lock out
  // everyone else's unrelated request (found by a real multi-invite test,
  // not by inspection; confirmed on password/change by the same symptom
  // recurring on a second endpoint). Key on whichever identifier the
  // request actually carries so distinct accounts/tokens never share one.
  keyGenerator: (req) => {
    const body = req.body || {};
    const subject = body.email || body.token || (req.params && req.params.token)
      || (req.user && req.user.id) || '';
    return `${req.ip}:${String(subject).toLowerCase()}`;
  },
  prefix: 'auth',
});

module.exports = { ipLimiter, userLimiter, authLimiter };
