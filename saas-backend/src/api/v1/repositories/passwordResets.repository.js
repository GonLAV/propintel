'use strict';

const { query } = require('../../../config/database');

async function insert({ id, userId, tenantId, tokenHash, expiresAt, ip, userAgent }) {
  await query(
    `INSERT INTO password_resets (id, user_id, tenant_id, token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, tenantId, tokenHash, expiresAt, ip || null, userAgent || null],
  );
}

async function findActiveByHash(tokenHash) {
  const { rows } = await query(
    `SELECT id, user_id, tenant_id, expires_at, used_at
       FROM password_resets
      WHERE token_hash = $1
      LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function markUsed(id) {
  await query('UPDATE password_resets SET used_at = now() WHERE id = $1', [id]);
}

async function revokeAllForUser(userId) {
  await query(
    `UPDATE password_resets SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}

module.exports = { insert, findActiveByHash, markUsed, revokeAllForUser };
