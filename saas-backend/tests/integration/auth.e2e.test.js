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

  describe('change password (while logged in)', () => {
    const newPassword = 'NewTestPass456!';
    let accessToken;
    let refreshToken;

    beforeAll(async () => {
      if (!dbReachable) return;
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password, tenantSlug: slug });
      accessToken = login.body.accessToken;
      refreshToken = login.body.refreshToken;
    });

    test('rejects the wrong current password', async () => {
      if (!dbReachable) return;
      const res = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'TotallyWrongPassword1', newPassword });
      expect(res.status).toBe(401);
    });

    test('changes the password, old password stops working, new password works, and other sessions are revoked', async () => {
      if (!dbReachable) return;

      const change = await request(app)
        .post('/api/v1/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: password, newPassword });
      expect(change.status).toBe(200);
      expect(change.body.ok).toBe(true);

      // Old refresh token from before the change must be revoked.
      const refreshWithOld = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(refreshWithOld.status).toBe(401);

      // Old password no longer authenticates.
      const loginOld = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password, tenantSlug: slug });
      expect(loginOld.status).toBe(401);

      // New password does.
      const loginNew = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: newPassword, tenantSlug: slug });
      expect(loginNew.status).toBe(200);
      expect(loginNew.body.accessToken).toBeTruthy();
    });
  });

  // Regression: register()'s otherTenantsExist check queries through the
  // plain (non-transactional) pool while the just-created user's own INSERT
  // is still uncommitted on the transaction's dedicated client -- so that
  // query never sees the row it just created, only other, already-committed
  // users with the same email. A first draft of this check used
  // `matches.length > 1` (treating the result as "me + others"), which is
  // off by one: it's actually just "others", so that version silently never
  // fired for any real duplicate. Mocked-DB tests can't catch this -- it only
  // shows up against a real Postgres transaction, same class of bug as the
  // register->refresh-token test above.
  describe('duplicate email across separate tenants', () => {
    const slugA = `e2e-dup-a-${randomUUID().slice(0, 8)}`;
    const slugB = `e2e-dup-b-${randomUUID().slice(0, 8)}`;
    const dupEmail = `${slugA}@propintel.test`;

    afterAll(async () => {
      if (dbReachable) {
        await pool.query('DELETE FROM tenants WHERE slug IN ($1, $2)', [slugA, slugB]).catch(() => {});
      }
    });

    test('first registration with a fresh email reports no other tenants', async () => {
      if (!dbReachable) return;
      const res = await request(app).post('/api/v1/auth/register').send({
        email: dupEmail, password, fullName: 'Dup A', tenantName: 'Dup Tenant A', tenantSlug: slugA,
      });
      expect(res.status).toBe(201);
      expect(res.body.otherTenantsExist).toBe(false);
    });

    test('second registration with the same email (different tenant) reports other tenants exist', async () => {
      if (!dbReachable) return;
      const res = await request(app).post('/api/v1/auth/register').send({
        email: dupEmail, password, fullName: 'Dup B', tenantName: 'Dup Tenant B', tenantSlug: slugB,
      });
      expect(res.status).toBe(201);
      expect(res.body.otherTenantsExist).toBe(true);
      // Both tenants are real and independent -- not blocked, just flagged.
      expect(res.body.tenant.slug).toBe(slugB);
    });
  });

  // Regression: refresh-token rotation is single-use by design (reusing an
  // already-rotated token revokes the whole family -- theft detection). But
  // a real client can legitimately race itself: several API calls fired
  // around the same moment all present the same about-to-expire refresh
  // token (ordinary page-load behavior, not an attack). Caught live, not by
  // inspection: firing 5 concurrent requests through the frontend's silent-
  // refresh proxy with one shared refresh token initially destroyed the
  // entire session (every participant's freshly-rotated token came back
  // dead too) -- the race's "loser" triggered family-wide revocation that
  // also nuked the "winners'" brand-new tokens. The fix is the standard,
  // documented mitigation for this exact race (see e.g. Auth0's "refresh
  // token reuse interval"): a short grace window where reusing an
  // already-rotated token walks forward to the current live token instead
  // of being treated as theft.
  describe('refresh-token rotation race', () => {
    const raceSlug = `e2e-race-${randomUUID().slice(0, 8)}`;
    const raceEmail = `${raceSlug}@propintel.test`;
    let refreshToken0;

    beforeAll(async () => {
      if (!dbReachable) return;
      const reg = await request(app).post('/api/v1/auth/register').send({
        email: raceEmail, password, fullName: 'Race Test', tenantName: 'Race Tenant', tenantSlug: raceSlug,
      });
      refreshToken0 = reg.body.refreshToken;
    });

    afterAll(async () => {
      if (dbReachable) {
        await pool.query('DELETE FROM tenants WHERE slug = $1', [raceSlug]).catch(() => {});
      }
    });

    test('concurrent refreshes of the same token all succeed, and the session survives', async () => {
      if (!dbReachable) return;

      const results = await Promise.all(
        Array.from({ length: 5 }, () => request(app).post('/api/v1/auth/refresh').send({ refreshToken: refreshToken0 })),
      );
      const statuses = results.map((r) => r.status);
      expect(statuses.every((s) => s === 200)).toBe(true);

      // Every participant's resulting token must actually still work --
      // the bug this guards against had participants receiving a 200 with
      // a token that was, moments later, already revoked by a sibling's
      // false-positive theft detection.
      const last = results[results.length - 1].body.refreshToken;
      const followUp = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: last });
      expect(followUp.status).toBe(200);
    });

    test('reuse of a genuinely stale (outside the grace window) token still revokes the family', async () => {
      if (!dbReachable) return;

      const reg = await request(app).post('/api/v1/auth/register').send({
        email: `stale-${raceSlug}@propintel.test`, password, fullName: 'Stale Test', tenantName: 'Stale Tenant', tenantSlug: `stale-${raceSlug}`,
      });
      const staleToken = reg.body.refreshToken;

      const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: staleToken });
      expect(first.status).toBe(200);
      const currentToken = first.body.refreshToken;

      // Backdate the rotation past the grace window instead of a real
      // 10+s sleep -- exercises the same comparison the service makes.
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = now() - interval '1 minute' WHERE token_hash = encode(digest($1, 'sha256'), 'hex')",
        [staleToken],
      );

      const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: staleToken });
      expect(replay.status).toBe(401);

      const currentStillWorks = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: currentToken });
      expect(currentStillWorks.status).toBe(401);

      await pool.query('DELETE FROM tenants WHERE slug = $1', [`stale-${raceSlug}`]).catch(() => {});
    });
  });
});
