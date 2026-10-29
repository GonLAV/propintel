'use strict';

const bcrypt = require('bcrypt');
const { randomUUID } = require('node:crypto');

const config = require('../../../config');
const logger = require('../../../config/logger');
const { sha256, randomToken } = require('../../../utils/encryption');
const { BadRequest, Unauthorized, NotFound } = require('../../../utils/errors');

const usersRepo = require('../repositories/users.repository');
const tenantsRepo = require('../repositories/tenants.repository');
const resetRepo = require('../repositories/passwordResets.repository');
const refreshRepo = require('../repositories/refreshTokens.repository');

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Request a password reset. Always succeeds with the same shape regardless of
 * whether the email exists, to prevent enumeration.
 *
 * In production wire `dispatchEmail` to a real provider. Here we log the URL.
 */
async function requestReset({ email, tenantSlug, ip, userAgent }) {
  const lowered = String(email).toLowerCase();
  let user = null;
  let tenant = null;

  if (tenantSlug) {
    tenant = await tenantsRepo.findBySlug(tenantSlug);
    if (tenant) {
      const found = await usersRepo.findByEmail(tenant.id, lowered);
      if (found && found.status !== 'disabled') user = found;
    }
  } else {
    const matches = await usersRepo.findByEmailGlobal(lowered);
    const active = matches.filter((m) => m.status !== 'disabled');
    if (active.length === 1) {
      user = active[0];
      tenant = await tenantsRepo.findById(user.tenant_id);
    }
  }

  if (user && tenant) {
    const token = randomToken(48);
    const id = randomUUID();
    await resetRepo.insert({
      id,
      userId: user.id,
      tenantId: tenant.id,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
      ip, userAgent,
    });
    // Email dispatch (stub).
    logger.info({
      event: 'password_reset.requested',
      userId: user.id,
      tenantId: tenant.id,
      // The token is logged at debug level only — do not log secrets in prod.
      resetUrlPreview: `https://app.example.com/reset?token=${token.slice(0, 8)}…`,
    }, 'password reset email would be sent');
    if (!config.isProd) {
      // Was logger.debug -- both .env and .env.example ship LOG_LEVEL=info,
      // which is above pino's debug level, so this never actually printed
      // under the project's own default dev settings (caught in a real
      // appraiser workflow test, not code inspection). Already gated by
      // !config.isProd above, so info level here still never reaches a
      // production log; it just needs to be visible in the common case
      // where someone forgot to lower LOG_LEVEL locally.
      logger.info({ token }, 'DEV ONLY — full reset token (no email provider configured yet)');
    }
  }

  return { ok: true };
}

async function confirmReset({ token, newPassword }) {
  if (!token || !newPassword) throw BadRequest('token and newPassword required');
  const tokenHash = sha256(token);
  const record = await resetRepo.findActiveByHash(tokenHash);
  if (!record) throw Unauthorized('Invalid or expired reset token');
  if (record.used_at) throw Unauthorized('Reset token already used');
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw Unauthorized('Reset token expired');
  }
  const user = await usersRepo.findById(record.tenant_id, record.user_id);
  if (!user) throw NotFound('User not found');

  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await usersRepo.update(record.tenant_id, record.user_id, { password_hash: passwordHash });

  // Invalidate everything: this token, sibling tokens, and all refresh sessions.
  await resetRepo.markUsed(record.id);
  await resetRepo.revokeAllForUser(record.user_id);
  await refreshRepo.revokeAllForUser(record.user_id);

  return { ok: true, userId: record.user_id, tenantId: record.tenant_id };
}

module.exports = { requestReset, confirmReset };
