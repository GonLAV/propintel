'use strict';

// Real Postgres + Redis, no mocks — regression coverage for comparable-sale
// deletion (Nachshon's review, agent-hq/appraiser-review.md finding #1):
// comparables are shared tenant-wide market data (looked up by city+type,
// not scoped to one property), so a single bad entry (typo'd price, wrong
// area) silently poisoned every valuation for that city/type combination
// forever, with no way to remove it. This covers the DELETE route added to
// fix that: success + list no longer shows it, tenant isolation (another
// tenant's comparable looks like 404, not a leaked 403), and a plain
// not-found for a nonexistent id.
//
// Requires migrations already applied to DATABASE_URL. Skips itself if
// Postgres isn't reachable, same convention as the other *.e2e.test.js files.

const request = require('supertest');
const { randomUUID } = require('node:crypto');

let dbReachable = true;

const { pool } = require('../../src/config/database');
const { redis } = require('../../src/config/redis');
const { buildApp } = require('../../src/app');

describe('comparable-sale deletion (real Postgres + Redis)', () => {
  const slugA = `e2e-comp-a-${randomUUID().slice(0, 8)}`;
  const slugB = `e2e-comp-b-${randomUUID().slice(0, 8)}`;
  const city = 'חיפה';
  let app;
  let tokenA;
  let tokenB;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      dbReachable = false;
      return;
    }
    app = buildApp();

    const regA = await request(app).post('/api/v1/auth/register').send({
      email: `${slugA}@propintel.test`, password: 'TestPass123!',
      fullName: 'Tenant A', tenantName: 'Tenant A Co', tenantSlug: slugA,
    });
    tokenA = regA.body.accessToken;

    const regB = await request(app).post('/api/v1/auth/register').send({
      email: `${slugB}@propintel.test`, password: 'TestPass123!',
      fullName: 'Tenant B', tenantName: 'Tenant B Co', tenantSlug: slugB,
    });
    tokenB = regB.body.accessToken;
  });

  afterAll(async () => {
    if (dbReachable) {
      await pool.query('DELETE FROM tenants WHERE slug IN ($1, $2)', [slugA, slugB]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await redis.quit().catch(() => {});
  });

  test('owner can delete their own comparable; it then disappears from the list', async () => {
    if (!dbReachable) return;

    const created = await request(app)
      .post('/api/v1/comparables')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        city, propertyType: 'apartment', areaSqm: 80, floor: 3, yearBuilt: 2010,
        salePrice: 2_000_000, soldAt: '2025-06-01', source: 'test',
      });
    expect(created.status).toBe(201);
    const compId = created.body.id;

    const beforeList = await request(app)
      .get(`/api/v1/comparables?city=${encodeURIComponent(city)}&propertyType=apartment`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(beforeList.body.items.map((c) => c.id)).toContain(compId);

    const del = await request(app)
      .delete(`/api/v1/comparables/${compId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(204);

    const afterList = await request(app)
      .get(`/api/v1/comparables?city=${encodeURIComponent(city)}&propertyType=apartment`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(afterList.body.items.map((c) => c.id)).not.toContain(compId);
  });

  test('deleting a nonexistent id returns 404', async () => {
    if (!dbReachable) return;

    const res = await request(app)
      .delete(`/api/v1/comparables/${randomUUID()}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  test('tenant isolation: another tenant\'s comparable looks like 404, not a leaked record', async () => {
    if (!dbReachable) return;

    const created = await request(app)
      .post('/api/v1/comparables')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        city, propertyType: 'apartment', areaSqm: 90, floor: 2, yearBuilt: 2012,
        salePrice: 2_300_000, soldAt: '2025-07-01', source: 'test',
      });
    const compId = created.body.id;

    const crossDelete = await request(app)
      .delete(`/api/v1/comparables/${compId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(crossDelete.status).toBe(404);

    // Confirm tenant A's comparable survived the cross-tenant attempt.
    const list = await request(app)
      .get(`/api/v1/comparables?city=${encodeURIComponent(city)}&propertyType=apartment`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.body.items.map((c) => c.id)).toContain(compId);
  });

  test('rejects a non-UUID id with a validation error, not a 500', async () => {
    if (!dbReachable) return;

    const res = await request(app)
      .delete('/api/v1/comparables/not-a-uuid')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });
});
