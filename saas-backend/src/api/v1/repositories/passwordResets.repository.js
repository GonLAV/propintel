'use strict';

const { query } = require('../../../config/database');

const execute = (client, text, params) => (client ? client.query(text, params) : query(text, params));

async function insert({
  id, userId, tenantId, tokenHash, expiresAt, ip, userAgent,
}, client = null) {
  await execute(
    client,
    `INSERT INTO password_resets (id, user_id, tenant_id, token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, tenantId, tokenHash, expiresAt, ip || null, userAgent || null],
  );
}

async function findActiveByHash(tokenHash, client = null, { forUpdate = false } = {}) {
  const { rows } = await execute(
    client,
    `SELECT id, user_id, tenant_id, expires_at, used_at
       FROM password_resets
      WHERE token_hash = $1
      LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [tokenHash],
  );
  return rows[0] || null;
}

async function markUsed(id, client = null) {
  const { rowCount } = await execute(
    client,
    'UPDATE password_resets SET used_at = now() WHERE id = $1 AND used_at IS NULL',
    [id],
  );
  return rowCount === 1;
}

async function revokeAllForUser(userId, client = null) {
  await execute(
    client,
    `UPDATE password_resets SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}

module.exports = { insert, findActiveByHash, markUsed, revokeAllForUser };
