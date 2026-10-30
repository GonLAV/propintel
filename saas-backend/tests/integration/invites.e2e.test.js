'use strict';

// Real Postgres + Redis, no mocks — regression coverage for a gap Caleb
// (competitive research) and Nachshon (appraiser review, 2026-10-29
// finding #6) both independently flagged: there was no way to add a
// second user to a tenant at all. users.service.js had no create/invite
// function, even though the role model (owner/admin/member/viewer) and
// the users.status CHECK already included 'pending'.
//
// Exercises the real end-to-end loop: an owner invites a teammate by
// email+role -> the raw invite token is returned directly in the API
// response (no email provider required, same pattern Slack/Linear/Notion
// use for "copy invite link") -> the unauthenticated accept-invite
// endpoint previews then consumes it -> the new member can actually log
// in with the session it's handed back.
//
// Requires migrations already applied to DATABASE_URL. Skips itself if
// Postgres isn't reachable, same convention as the other *.e2e.test.js files.

const request = require('supertest');
const { randomUUID } = require('node:crypto');

let dbReachable = true;

const { pool } = require('../../src/config/database');
const { redis } = require('../../src/config/redis');
const { buildApp } = require('../../src/app');

describe('team invites (real Postgres + Redis)', () => {
  const slug = `e2e-inv-${randomUUID().slice(0, 8)}`;
  const ownerEmail = `owner-${slug}@propintel.test`;
  let app;
  let ownerToken;

  beforeAll(async () => {
    try {
      await pool.query('SELECT 1');
    } catch {
      dbReachable = false;
      return;
    }
    app = buildApp();
    const reg = await request(app).post('/api/v1/auth/register').send({
      email: ownerEmail, password: 'TestPass123!', fullName: 'בעל/ת המשרד', tenantName: 'משרד הזמנות', tenantSlug: slug,
    });
    ownerToken = reg.body.accessToken;
    expect(reg.body.user.role).toBe('owner');
  });

  afterAll(async () => {
    if (dbReachable) {
      await pool.query('DELETE FROM tenants WHERE slug = $1', [slug]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await redis.quit().catch(() => {});
  });

  test('owner invites a member: the response carries a usable token and the user is pending', async () => {
    if (!dbReachable) return;

    const invite = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: `member-${slug}@propintel.test`, role: 'member', fullName: 'שמאי/ת חדש/ה' });

    expect(invite.status).toBe(201);
    expect(invite.body.user.status).toBe('pending');
    expect(invite.body.user.role).toBe('member');
    expect(typeof invite.body.inviteToken).toBe('string');
    expect(invite.body.inviteToken.length).toBeGreaterThan(20);
    expect(invite.body.user.password_hash).toBeUndefined(); // SAFE column list, never leaked

    const info = await request(app).get(`/api/v1/auth/invite/${invite.body.inviteToken}`);
    expect(info.status).toBe(200);
    expect(info.body).toMatchObject({
      email: `member-${slug}@propintel.test`, role: 'member', tenantName: 'משרד הזמנות',
    });

    const accept = await request(app).post('/api/v1/auth/invite/accept').send({
      token: invite.body.inviteToken, password: 'MemberPass123!', fullName: 'שמאי/ת חדש/ה בפועל',
    });
    expect(accept.status).toBe(200);
    expect(accept.body.user.status).toBe('active');
    expect(accept.body.user.full_name).toBe('שמאי/ת חדש/ה בפועל');
    expect(accept.body.tenant.name).toBe('משרד הזמנות');
    expect(typeof accept.body.accessToken).toBe('string');

    // The session the accept flow hands back must actually work.
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accept.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe('member');
    expect(me.body.tenant.name).toBe('משרד הזמנות');

    // Already accepted: the token is consumed, not reusable.
    const infoAfter = await request(app).get(`/api/v1/auth/invite/${invite.body.inviteToken}`);
    expect(infoAfter.status).toBe(401);
    const acceptAgain = await request(app).post('/api/v1/auth/invite/accept').send({
      token: invite.body.inviteToken, password: 'AnotherPass123!',
    });
    expect(acceptAgain.status).toBe(401);
  });

  test('a bogus/unknown token is rejected with the same "invalid or expired" shape', async () => {
    if (!dbReachable) return;

    const info = await request(app).get('/api/v1/auth/invite/this-token-was-never-issued-at-all');
    expect(info.status).toBe(401);

    const accept = await request(app).post('/api/v1/auth/invite/accept').send({
      token: 'this-token-was-never-issued-at-all', password: 'SomePass123!',
    });
    expect(accept.status).toBe(401);
  });

  test('inviting an email that is already an active member is rejected, not silently overwritten', async () => {
    if (!dbReachable) return;

    const dup = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: ownerEmail, role: 'member' });
    expect(dup.status).toBe(409);
  });

  test('re-inviting a still-pending invitee refreshes the token instead of erroring, and invalidates the old one', async () => {
    if (!dbReachable) return;

    const email = `pending-${slug}@propintel.test`;
    const first = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email, role: 'viewer' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email, role: 'admin' }); // also changes the role while re-inviting
    expect(second.status).toBe(201);
    expect(second.body.inviteToken).not.toBe(first.body.inviteToken);
    expect(second.body.user.id).toBe(first.body.user.id); // same row, not a duplicate

    const oldTokenInfo = await request(app).get(`/api/v1/auth/invite/${first.body.inviteToken}`);
    expect(oldTokenInfo.status).toBe(401);

    const newTokenInfo = await request(app).get(`/api/v1/auth/invite/${second.body.inviteToken}`);
    expect(newTokenInfo.status).toBe(200);
    expect(newTokenInfo.body.role).toBe('admin');
  });

  test('a pending invitee shows up in the regular team list with status "pending"', async () => {
    if (!dbReachable) return;

    const email = `listed-${slug}@propintel.test`;
    await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email, role: 'member' });

    const list = await request(app)
      .get('/api/v1/users?pageSize=100')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(list.status).toBe(200);
    const row = list.body.items.find((u) => u.email === email);
    expect(row).toBeDefined();
    expect(row.status).toBe('pending');
  });

  test('a non-owner/admin cannot invite; only an owner can invite a new owner', async () => {
    if (!dbReachable) return;

    // Create and accept a plain "member" invite to get a non-admin session.
    const memberEmail = `plain-member-${slug}@propintel.test`;
    const inv = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberEmail, role: 'member' });
    const accepted = await request(app).post('/api/v1/auth/invite/accept').send({
      token: inv.body.inviteToken, password: 'PlainPass123!',
    });
    const memberToken = accepted.body.accessToken;

    const forbidden = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: `blocked-${slug}@propintel.test`, role: 'viewer' });
    expect(forbidden.status).toBe(403);

    // Promote that member to admin, then confirm an admin still cannot grant owner.
    const promoted = await request(app)
      .patch(`/api/v1/users/${accepted.body.user.id}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'admin' });
    expect(promoted.status).toBe(200);

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: memberEmail, password: 'PlainPass123!', tenantSlug: slug,
    });
    const adminToken = adminLogin.body.accessToken;

    const adminInvitingOwner = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `wannabe-owner-${slug}@propintel.test`, role: 'owner' });
    expect(adminInvitingOwner.status).toBe(403);

    const ownerInvitingOwner = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: `second-owner-${slug}@propintel.test`, role: 'owner' });
    expect(ownerInvitingOwner.status).toBe(201);
    expect(ownerInvitingOwner.body.user.role).toBe('owner');
  });
});
