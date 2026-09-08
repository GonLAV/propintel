'use strict';

const bcrypt = require('bcrypt');
const { randomUUID } = require('node:crypto');

const config = require('../../../config');
const { withTransaction } = require('../../../config/database');
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

async function issueRefreshToken({ userId, tenantId, familyId, ip, userAgent }) {
  const token = randomToken(48);
  const id = randomUUID();
  await refreshRepo.insert({
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

async function register({ email, password, fullName, tenantName, tenantSlug, ip, userAgent }) {
  const existing = await tenantsRepo.findBySlug(tenantSlug);
  if (existing) throw Conflict('Tenant slug already in use');

  return withTransaction(async (client) => {
    const tenant = await tenantsRepo.create(client, { name: tenantName, slug: tenantSlug });
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = await usersRepo.create(client, {
      tenantId: tenant.id, email, passwordHash, fullName, role: 'owner',
    });
    const accessToken = signAccessToken({ sub: user.id, tenantId: tenant.id, role: user.role });
    const { token: refreshToken } = await issueRefreshToken({
      userId: user.id, tenantId: tenant.id, ip, userAgent,
    });
    return { user, tenant, accessToken, refreshToken };
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

async function refresh({ refreshToken, ip, userAgent }) {
  const hash = sha256(refreshToken);
  const row = await refreshRepo.findByHash(hash);
  if (!row) throw Unauthorized('Invalid refresh token');

  if (row.revoked_at) {
    // Reuse of a revoked token: revoke entire family (likely theft).
    await refreshRepo.revokeFamily(row.family_id);
    throw Unauthorized('Refresh token reuse detected');
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

module.exports = { register, login, refresh, logout, parseTtlMs };
