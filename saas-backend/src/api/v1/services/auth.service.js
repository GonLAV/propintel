'use strict';

const bcrypt = require('bcrypt');
const { randomUUID } = require('node:crypto');

const config = require('../../../config');
const { withTransaction, pool } = require('../../../config/database');
const { signAccessToken } = require('../../../utils/jwt');
const { sha256, randomToken } = require('../../../utils/encryption');
const { Unauthorized, Conflict, BadRequest } = require('../../../utils/errors');

const usersRepo = require('../repositories/users.repository');
const tenantsRepo = require('../repositories/tenants.repository');
const refreshRepo = require('../repositories/refreshTokens.repository');

function parseTtlMs(ttl) {
  const m = String(ttl).match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]];
}

async function issueRefreshToken({ userId, tenantId, familyId, ip, userAgent, client = pool }) {
  const token = randomToken(48);
  const id = randomUUID();
  await refreshRepo.insert(client, {
    id,
    userId,
    tenantId,
    tokenHash: sha256(token),
    familyId: familyId || id,
    expiresAt: new Date(Date.now() + parseTtlMs(config.jwt.refreshTtl)),
    ip: ip || null,
    userAgent: userAgent || null,
  });
  return { token, id, familyId: familyId || id };
}

async function register({
  email, password, fullName, tenantName, tenantSlug, licenseNumber, ip, userAgent,
}) {
  const existing = await tenantsRepo.findBySlug(tenantSlug);
  if (existing) throw Conflict('Tenant slug already in use');

  return withTransaction(async (client) => {
    const tenant = await tenantsRepo.create(client, { name: tenantName, slug: tenantSlug });
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = await usersRepo.create(client, {
      tenantId: tenant.id, email, passwordHash, fullName, licenseNumber, role: 'owner',
    });
    const accessToken = signAccessToken({ sub: user.id, tenantId: tenant.id, role: user.role });
    const { token: refreshToken } = await issueRefreshToken({
      userId: user.id, tenantId: tenant.id, ip, userAgent, client,
    });
    // Same email can legitimately exist under more than one tenant (e.g. an
    // appraiser running two separate offices) -- not blocked. But until now
    // this was completely silent: a mistyped tenantSlug (or just forgetting
    // an existing office) created a second, disconnected tenant with no
    // indication anything unusual happened. Flag it here (reusing the same
    // lookup login() already does for its multi-tenant-ambiguity check, so
    // this adds no new account-enumeration surface -- it only runs after a
    // real registration has already succeeded) so the UI can tell the user.
    // This lookup runs on a separate (non-transactional) connection while
    // the current INSERT is still uncommitted on `client`, so it never sees
    // the user just created above -- only other, already-committed users
    // with this email. That means "any row at all" is the right test, not
    // "more than one": a bare length check against 1 would silently never
    // fire (this was caught live, not by inspection -- the off-by-one only
    // shows up by actually running two real registrations back to back).
    const others = await usersRepo.findByEmailGlobal(email);
    const otherTenantsExist = others.length > 0;
    return { user, tenant, accessToken, refreshToken, otherTenantsExist };
  });
}

async function login({ email, password, tenantSlug, ip, userAgent }) {
  let userRow = null;
  if (tenantSlug) {
    const tenant = await tenantsRepo.findBySlug(tenantSlug);
    if (!tenant) throw Unauthorized('Invalid credentials');
    userRow = await usersRepo.findByEmail(tenant.id, email);
  } else {
    const matches = await usersRepo.findByEmailGlobal(email);
    if (matches.length > 1) {
      throw BadRequest('Multiple tenants found for this email; please specify tenantSlug');
    }
    [userRow] = matches;
  }
  if (!userRow || !userRow.password_hash) throw Unauthorized('Invalid credentials');
  if (userRow.status !== 'active') throw Unauthorized('Account disabled');

  const ok = await bcrypt.compare(password, userRow.password_hash);
  if (!ok) throw Unauthorized('Invalid credentials');

  await usersRepo.setLastLogin(userRow.id);

  const accessToken = signAccessToken({
    sub: userRow.id, tenantId: userRow.tenant_id, role: userRow.role,
  });
  const { token: refreshToken } = await issueRefreshToken({
    userId: userRow.id, tenantId: userRow.tenant_id, ip, userAgent,
  });
  return {
    user: { id: userRow.id, email: userRow.email, role: userRow.role, tenantId: userRow.tenant_id },
    accessToken,
    refreshToken,
  };
}

// A client can legitimately race itself: several API calls fired around
// the same moment all hold the same (about to rotate) refresh token --
// ordinary page-load behavior, not an attack. Without this grace window,
// whichever request loses that race gets "reuse detected" and the entire
// token family is revoked, silently destroying a session that a moment
// earlier looked completely healthy (several requests had just received
// valid, working rotated tokens of their own). This is the standard,
// documented mitigation for refresh-token-rotation races (see e.g. Auth0's
// "refresh token reuse interval"): only treat reuse of an already-rotated
// token as theft once it's stale beyond a short window. A real stolen
// token, used later/elsewhere, still triggers full reuse-detection below --
// this only narrows the window, it doesn't remove the protection.
const REFRESH_REUSE_GRACE_MS = 10_000;
const REFRESH_CHAIN_MAX_HOPS = 10;

async function findLiveHeadWithinGrace(row) {
  const revokedMsAgo = Date.now() - new Date(row.revoked_at).getTime();
  if (revokedMsAgo > REFRESH_REUSE_GRACE_MS) return null;

  let current = row;
  for (let hop = 0; hop < REFRESH_CHAIN_MAX_HOPS; hop += 1) {
    if (!current.replaced_by_id) return null;
    // eslint-disable-next-line no-await-in-loop
    const next = await refreshRepo.findById(current.replaced_by_id);
    if (!next) return null;
    if (!next.revoked_at) {
      return new Date(next.expires_at).getTime() > Date.now() ? next : null;
    }
    current = next;
  }
  return null;
}

async function refresh({ refreshToken, ip, userAgent }) {
  const hash = sha256(refreshToken);
  let row = await refreshRepo.findByHash(hash);
  if (!row) throw Unauthorized('Invalid refresh token');

  if (row.revoked_at) {
    const liveHead = await findLiveHeadWithinGrace(row);
    if (!liveHead) {
      // Stale reuse outside the grace window, or a broken/expired chain:
      // treat as likely theft, revoke the entire family.
      await refreshRepo.revokeFamily(row.family_id);
      throw Unauthorized('Refresh token reuse detected');
    }
    row = liveHead;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw Unauthorized('Refresh token expired');
  }

  const issued = await issueRefreshToken({
    userId: row.user_id, tenantId: row.tenant_id, familyId: row.family_id, ip, userAgent,
  });
  await refreshRepo.revokeById(row.id, issued.id);

  const user = await usersRepo.findById(row.tenant_id, row.user_id);
  if (!user || user.status !== 'active') throw Unauthorized('User not active');

  const accessToken = signAccessToken({ sub: user.id, tenantId: user.tenant_id, role: user.role });
  return { accessToken, refreshToken: issued.token };
}

async function logout({ refreshToken }) {
  const hash = sha256(refreshToken);
  const row = await refreshRepo.findByHash(hash);
  if (row && !row.revoked_at) await refreshRepo.revokeById(row.id);
}

// Change your own password while logged in -- distinct from the forgot-
// password email flow (passwordReset.service.js), which is for when you
// can't log in at all. Until this existed there was no way to update your
// password without going through the (currently email-unwired) reset flow.
async function changePassword({ tenantId, userId, currentPassword, newPassword }) {
  const hash = await usersRepo.findPasswordHash(tenantId, userId);
  if (!hash) throw Unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(currentPassword, hash);
  if (!ok) throw Unauthorized('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await usersRepo.update(tenantId, userId, { password_hash: newHash });

  // Same security posture as a reset-confirm: a password change revokes all
  // refresh-token sessions, forcing re-login everywhere (including any
  // session an attacker may have). The caller's current access token stays
  // valid until its own short TTL expires, same as reset-confirm.
  await refreshRepo.revokeAllForUser(userId);
}

module.exports = { register, login, refresh, logout, changePassword, parseTtlMs };
