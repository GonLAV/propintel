'use strict';

// Mock infra so the app can boot without Postgres/Redis in CI unit-test mode.
jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), end: jest.fn() },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  withTransaction: jest.fn(async (fn) => fn({ query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) })),
}));
jest.mock('../../src/config/redis', () => ({
  redis: { ping: jest.fn().mockResolvedValue('PONG'), quit: jest.fn() },
  rawClient: { call: jest.fn() },
}));
jest.mock('../../src/middleware/rateLimiter', () => ({
  ipLimiter: (req, res, next) => next(),
  userLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
}));

const request = require('supertest');
const { buildApp } = require('../../src/app');

describe('health endpoints', () => {
  const app = buildApp();

  test('GET /healthz returns ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /readyz returns 200 when deps are mocked up', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body.db).toBe('up');
    expect(res.body.redis).toBe('up');
  });

  test('unknown route returns 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
