'use strict';

const logger = require('../../../config/logger');
const config = require('../../../config');
const { NotFound, Forbidden, BadRequest, Conflict } = require('../../../utils/errors');
const usersRepo = require('../repositories/users.repository');
const { encrypt, sha256, randomToken } = require('../../../utils/encryption');
const { paginate } = require('../../../utils/pagination');

// More generous than the password-reset token's 1 hour: an invite is
// typically relayed asynchronously (WhatsApp/email/in person), not opened
// immediately.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function list(tenantId, query) {
  const { limit, offset, page, pageSize } = paginate(query);
  const { rows, total } = await usersRepo.list(tenantId, {
    q: query.q, role: query.role, limit, offset,
  });
  return { items: rows, page, pageSize, total };
}

async function getById(tenantId, id) {
  const u = await usersRepo.findById(tenantId, id);
  if (!u) throw NotFound('User not found');
  return u;
}

async function update(tenantId, id, fields) {
  const dbFields = {};
  if (fields.fullName !== undefined)     dbFields.full_name = fields.fullName;
  if (fields.status !== undefined)       dbFields.status = fields.status;
  if (fields.phone !== undefined)        dbFields.phone_encrypted = encrypt(fields.phone);
  if (fields.licenseNumber !== undefined) dbFields.license_number = fields.licenseNumber;
  const u = await usersRepo.update(tenantId, id, dbFields);
  if (!u) throw NotFound('User not found');
  return u;
}

async function changeRole({ tenantId, actor, targetId, newRole }) {
  if (actor.id === targetId && newRole !== actor.role) {
    throw BadRequest('You cannot change your own role');
  }
  if (newRole === 'owner' && actor.role !== 'owner') {
    throw Forbidden('Only an owner can grant owner role');
  }
  const u = await usersRepo.update(tenantId, targetId, { role: newRole });
  if (!u) throw NotFound('User not found');
  return u;
}

async function softDelete({ tenantId, actor, targetId }) {
  if (actor.id === targetId) throw BadRequest('You cannot delete yourself');
  const ok = await usersRepo.softDelete(tenantId, targetId);
  if (!ok) throw NotFound('User not found');
}

// Invite-by-link, no email provider required: the raw token is returned
// to the (already-authenticated) inviting admin/owner so they can share it
// themselves -- unlike a password-reset token, this one is meant to be
// handed to a third party, the same way Slack/Linear/Notion's "copy invite
// link" works. Still also logged for local/dev visibility, same honest
// "no provider wired yet" pattern as passwordReset.service.js.
async function invite({ tenantId, actor, email, role, fullName }) {
  if (role === 'owner' && actor.role !== 'owner') {
    throw Forbidden('Only an owner can invite a new owner');
  }
  const lowered = String(email).toLowerCase();
  const token = randomToken(48);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const existing = await usersRepo.findByEmail(tenantId, lowered);
  let user;
  if (existing && existing.status === 'pending') {
    // Not yet accepted -- re-inviting refreshes the token/role/name in
    // place rather than erroring as "already exists".
    user = await usersRepo.renewInvite(tenantId, existing.id, { role, fullName, tokenHash, expiresAt });
  } else if (existing) {
    throw Conflict('משתמש/ת עם כתובת האימייל הזו כבר קיים/ת בארגון');
  } else {
    try {
      user = await usersRepo.createInvite(tenantId, {
        email: lowered, role, fullName, tokenHash, expiresAt, createdBy: actor.id,
      });
    } catch (err) {
      // Race: two invites for the same email submitted concurrently both
      // pass the findByEmail check above before either INSERT commits --
      // uq_users_tenant_email catches it at the DB level even though the
      // application-level check above didn't.
      if (err.code === '23505') throw Conflict('משתמש/ת עם כתובת האימייל הזו כבר קיים/ת בארגון');
      throw err;
    }
  }

  logger.info({ event: 'user.invite', tenantId, email: lowered, role }, 'invite email would be sent');
  if (!config.isProd) {
    logger.info({ token }, 'DEV ONLY — full invite token (no email provider configured yet)');
  }

  return { user, inviteToken: token, expiresAt };
}

module.exports = { list, getById, update, changeRole, softDelete, invite };
