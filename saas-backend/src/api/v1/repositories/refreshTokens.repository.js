'use strict';

const { query } = require('../../../config/database');

const execute = (client, text, params) => (client ? client.query(text, params) : query(text, params));

async function insert({
  id, userId, tenantId, tokenHash, familyId, expiresAt, ip, userAgent,
}, client = null) {
  const { rows } = await execute(
    client,
    `INSERT INTO refresh_tokens
       (id, user_id, tenant_id, token_hash, family_id, expires_at, ip, user_agent)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [id || null, userId, tenantId, tokenHash, familyId, expiresAt, ip, userAgent],
  );
  return rows[0].id;
}

async function findByHash(tokenHash, client = null, { forUpdate = false } = {}) {
  const { rows } = await execute(
    client,
    `SELECT id, user_id, tenant_id, family_id, expires_at, revoked_at, replaced_by_id
       FROM refresh_tokens WHERE token_hash = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function revokeById(id, replacedById = null, client = null) {
  const { rowCount } = await execute(
    client,
    `UPDATE refresh_tokens
        SET revoked_at = now(),
            replaced_by_id = COALESCE($2, replaced_by_id)
      WHERE id = $1 AND revoked_at IS NULL`,
    [id, replacedById],
  );
  return rowCount === 1;
}

async function revokeFamily(familyId, client = null) {
  await execute(
    client,
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE family_id = $1 AND revoked_at IS NULL`,
    [familyId],
  );
}

async function revokeAllForUser(userId, client = null) {
  await execute(
    client,
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

module.exports = { insert, findByHash, revokeById, revokeFamily, revokeAllForUser };
