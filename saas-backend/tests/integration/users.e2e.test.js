'use strict';

// Real Postgres + Redis, no mocks — regression coverage for Nachshon's
// (persona appraiser) review finding #4 (agent-hq/appraiser-review.md):
// license_number (מספר רישיון שמאי) could only ever be set once, at
// registration -- there was no way to add it later (if the appraiser
// registered without one) or correct a typo, because
// validators/users.validator.js's `update` schema didn't accept it at all
// (services/users.service.js's explicit field whitelist would have silently
// dropped it even if the validator had let it through).
//
// Requires migrations already applied to DATABASE_URL. Skips itself if
// Postgres isn't reachable, same convention as the other *.e2e.test.js files.

const request = require('supertest');
const { randomUUID } = require('node:crypto');

let dbReachable = true;

const { pool } = require('../../src/config/database');
const { redis } = require('../../src/config/redis');
const { buildApp } = require('../../src/app');

describe('user profile update (real Postgres + Redis)', () => {
  const slug = `e2e-user-${randomUUID().slice(0, 8)}`;
  const email = `${slug}@propintel.test`;
  let app;
  let token;
  let userId;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      dbReachable = false;
      return;
    }
    app = buildApp();
    const reg = await request(app).post('/api/v1/auth/register').send({
      email, password: 'TestPass123!', fullName: 'License Edit', tenantName: 'License Edit Tenant', tenantSlug: slug,
    });
    token = reg.body.accessToken;
    userId = reg.body.user.id;
    expect(reg.body.user.license_number).toBeNull();
  });

  afterAll(async () => {
    if (dbReachable) {
      await pool.query('DELETE FROM tenants WHERE slug = $1', [slug]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await redis.quit().catch(() => {});
  });

  test('license number can be set after registration and persists', async () => {
    if (!dbReachable) return;

    const patch = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ licenseNumber: '84321' });
    expect(patch.status).toBe(200);
    expect(patch.body.license_number).toBe('84321');

    const fetched = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetched.body.license_number).toBe('84321');
  });

  test('license number can be cleared back to null', async () => {
    if (!dbReachable) return;

    const patch = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ licenseNumber: null });
    expect(patch.status).toBe(200);
    expect(patch.body.license_number).toBeNull();
  });

  test('updating other fields (e.g. fullName) does not require or clear licenseNumber', async () => {
    if (!dbReachable) return;

    await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ licenseNumber: '11111' });

    const patch = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'License Edit Updated' });
    expect(patch.status).toBe(200);
    expect(patch.body.full_name).toBe('License Edit Updated');
    expect(patch.body.license_number).toBe('11111');
  });
});
