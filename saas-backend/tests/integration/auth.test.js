'use strict';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), end: jest.fn() },
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  withTransaction: jest.fn(async (fn) => fn({ query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }) })),
}));
jest.mock('../../src/config/redis', () => ({
  redis: { ping: jest.fn().mockResolvedValue('PONG'), quit: jest.fn(), set: jest.fn() },
  rawClient: { call: jest.fn() },
}));
jest.mock('../../src/middleware/rateLimiter', () => ({
  ipLimiter: (req, res, next) => next(),
  userLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
}));

const request = require('supertest');
const { buildApp } = require('../../src/app');

describe('auth validation', () => {
  const app = buildApp();

  test('register rejects weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'a@b.com', password: 'short', fullName: 'X',
        tenantName: 'Acme', tenantSlug: 'acme',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  test('login rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  test('protected /me requires auth', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
