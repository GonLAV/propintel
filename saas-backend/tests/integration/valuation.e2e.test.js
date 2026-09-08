'use strict';

// Real Postgres + Redis, no mocks — exercises the full appraisal loop that
// is the actual point of the product: register -> create property ->
// add comparable sales -> run a comparables valuation -> get a real number
// back. Before the comparables.routes.js addition, there was no way to
// reach comparables.repository.js#insert through the API at all, so the
// "comparables" and "reconciled" valuation methods could never produce a
// value for any tenant. This test fails if that regresses.
//
// Requires migrations already applied to DATABASE_URL. Skips itself if
// Postgres isn't reachable, same convention as auth.e2e.test.js.

const request = require('supertest');
const { randomUUID } = require('node:crypto');

let dbReachable = true;

const { pool } = require('../../src/config/database');
const { redis } = require('../../src/config/redis');
const { buildApp } = require('../../src/app');

describe('valuation end-to-end (real Postgres + Redis)', () => {
  const slug = `e2e-val-${randomUUID().slice(0, 8)}`;
  const email = `${slug}@propintel.test`;
  const password = 'TestPass123!';
  const city = 'תל אביב';
  let app;
  let token;
  let propertyId;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      dbReachable = false;
      return;
    }
    app = buildApp();

    const reg = await request(app).post('/api/v1/auth/register').send({
      email, password, fullName: 'E2E Valuer', tenantName: 'E2E Valuation Tenant', tenantSlug: slug,
    });
    token = reg.body.accessToken;

    const prop = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: 'Test St 1', city, propertyType: 'apartment', areaSqm: 85, rooms: 3.5, floor: 4, yearBuilt: 2005 });
    propertyId = prop.body.id;

    for (let i = 1; i <= 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app)
        .post('/api/v1/comparables')
        .set('Authorization', `Bearer ${token}`)
        .send({
          city, propertyType: 'apartment', areaSqm: 80 + i, rooms: 3.5, floor: i + 1, yearBuilt: 2004,
          salePrice: 1800000 + i * 50000, soldAt: `2025-0${i}-15`, source: 'test',
        });
    }
  });

  afterAll(async () => {
    if (dbReachable) {
      await pool.query('DELETE FROM tenants WHERE slug = $1', [slug]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await redis.quit().catch(() => {});
  });

  test('comparables valuation produces a value from real comparable sales', async () => {
    if (!dbReachable) return;

    const res = await request(app)
      .post('/api/v1/valuations')
      .set('Authorization', `Bearer ${token}`)
      .send({ propertyId, method: 'comparables' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('completed');
    expect(Number(res.body.estimated_value)).toBeGreaterThan(0);
    expect(res.body.result.sampleSize).toBe(5);
  });

  test('reconciled valuation blends comparables, cost and income', async () => {
    if (!dbReachable) return;

    const res = await request(app)
      .post('/api/v1/valuations')
      .set('Authorization', `Bearer ${token}`)
      .send({ propertyId, method: 'reconciled' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('completed');
    expect(res.body.result.methods.length).toBeGreaterThan(0);
  });
});
