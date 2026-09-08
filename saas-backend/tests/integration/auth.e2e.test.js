'use strict';

// Deliberately does NOT mock src/config/database or src/config/redis.
// Every other test in this suite mocks the DB, which is exactly why the
// register->issueRefreshToken foreign-key bug (refresh_tokens_user_id_fkey,
// caused by writing the refresh token through the pool instead of the
// open transaction's client) shipped without a failing test. This file
// exercises the real Postgres + Redis so that class of bug fails CI.
//
// Requires migrations already applied to DATABASE_URL (`npm run migrate`).
// Skips itself if it cannot reach Postgres, so it never blocks a
// no-DB local `npm test` run.

const request = require('supertest');
const { randomUUID } = require('node:crypto');

let dbReachable = true;
try {
  // eslint-disable-next-line global-require
  require('pg');
} catch {
  dbReachable = false;
}

const { pool } = require('../../src/config/database');
const { redis } = require('../../src/config/redis');
const { buildApp } = require('../../src/app');

describe('auth end-to-end (real Postgres + Redis)', () => {
  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  const email = `${slug}@propintel.test`;
  const password = 'TestPass123!';
  let app;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      dbReachable = false;
    }
    app = buildApp();
  });

  afterAll(async () => {
    if (dbReachable) {
      await pool.query('DELETE FROM tenants WHERE slug = $1', [slug]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await redis.quit().catch(() => {});
  });

  test('register creates tenant+user and issues a usable session', async () => {
    if (!dbReachable) return; // no live Postgres in this environment — skip, don't fail

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email, password, fullName: 'E2E Test', tenantName: 'E2E Tenant', tenantSlug: slug,
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.tenant.slug).toBe(slug);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();

    // The bug this test targets: register() runs tenant+user creation inside
    // a transaction, then issues a refresh token. If that insert goes
    // through the pool instead of the transaction's client, the user row
    // is invisible (uncommitted) and this fails with a 500 FK violation.
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  test('login with the freshly-registered user succeeds', async () => {
    if (!dbReachable) return;

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password, tenantSlug: slug });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });
});
