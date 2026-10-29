'use strict';

// Real Postgres + Redis, no mocks — regression coverage for Nachshon's
// (persona appraiser) review finding #3 (agent-hq/appraiser-review.md):
// the dev-only "full reset token" log line used logger.debug(), but both
// .env and .env.example ship LOG_LEVEL=info — above pino's debug level —
// so under the project's own documented default dev setup, that line
// never actually printed. During the pre-real-email-provider period, that
// was the ONLY way anyone with server access could manually recover a
// user's reset link, and it was silently broken. Caught by actually
// registering a user and requesting a reset, not by reading the code.
//
// Requires migrations already applied to DATABASE_URL. Skips itself if
// Postgres isn't reachable, same convention as the other *.e2e.test.js files.

const request = require('supertest');
const { randomUUID } = require('node:crypto');

let dbReachable = true;

const { pool } = require('../../src/config/database');
const { redis } = require('../../src/config/redis');
const { buildApp } = require('../../src/app');
const logger = require('../../src/config/logger');

describe('password reset token visibility (real Postgres + Redis)', () => {
  const slug = `e2e-reset-${randomUUID().slice(0, 8)}`;
  const email = `${slug}@propintel.test`;
  const password = 'TestPass123!';
  let app;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      dbReachable = false;
      return;
    }
    app = buildApp();
    await request(app).post('/api/v1/auth/register').send({
      email, password, fullName: 'Reset E2E', tenantName: 'Reset E2E Tenant', tenantSlug: slug,
    });
  });

  afterAll(async () => {
    if (dbReachable) {
      await pool.query('DELETE FROM tenants WHERE slug = $1', [slug]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await redis.quit().catch(() => {});
  });

  test('logs the full reset token at a level visible under the project\'s own default LOG_LEVEL=info, not debug', async () => {
    if (!dbReachable) return;

    const infoSpy = jest.spyOn(logger, 'info');
    const debugSpy = jest.spyOn(logger, 'debug');

    const res = await request(app)
      .post('/api/v1/auth/password/reset/request')
      .send({ email });
    expect(res.status).toBe(202);

    // Regression guard: this must not move back to .debug, which is below
    // the shipped LOG_LEVEL=info default and would silently stop printing
    // again without any test failing elsewhere to catch it.
    const debugCallWithToken = debugSpy.mock.calls.find(
      (call) => call[0] && typeof call[0] === 'object' && 'token' in call[0],
    );
    expect(debugCallWithToken).toBeUndefined();

    const infoCallWithToken = infoSpy.mock.calls.find(
      (call) => call[0] && typeof call[0] === 'object' && 'token' in call[0],
    );
    expect(infoCallWithToken).toBeDefined();
    const [logObject] = infoCallWithToken;
    expect(typeof logObject.token).toBe('string');
    expect(logObject.token.length).toBeGreaterThan(20);

    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });
});
