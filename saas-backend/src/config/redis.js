'use strict';

const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

const redis = new Redis(config.redis.url, {
  keyPrefix: config.redis.keyPrefix,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('connect', () => logger.info('Redis connected'));

module.exports = { redis };
