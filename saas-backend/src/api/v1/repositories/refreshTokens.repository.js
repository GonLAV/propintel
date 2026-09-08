'use strict';

const { query } = require('../../../config/database');

async function insert(client, { id, userId, tenantId, tokenHash, familyId, expiresAt, ip, userAgent }) {
  const { rows } = await client.query(
    `INSERT INTO refresh_tokens
       (id, user_id, tenant_id, token_hash, family_id, expires_at, ip, user_agent)
     VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [id || null, userId, tenantId, tokenHash, familyId, expiresAt, ip, userAgent],
  );
  return rows[0].id;
}

async function findByHash(tokenHash) {
  const { rows } = await query(
    `SELECT id, user_id, tenant_id, family_id, expires_at, revoked_at, replaced_by_id
       FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function revokeById(id, replacedById = null) {
  await query(
    `UPDATE refresh_tokens
        SET revoked_at = now(),
            replaced_by_id = COALESCE($2, replaced_by_id)
      WHERE id = $1 AND revoked_at IS NULL`,
    [id, replacedById],
  );
}

async function revokeFamily(familyId) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE family_id = $1 AND revoked_at IS NULL`,
    [familyId],
  );
}

async function revokeAllForUser(userId) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

module.exports = { insert, findByHash, revokeById, revokeFamily, revokeAllForUser };
