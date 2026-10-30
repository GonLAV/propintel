'use strict';

const { query } = require('../../../config/database');

const SAFE = `id, tenant_id, email, full_name, license_number, role, status, last_login_at,
              created_at, updated_at`;

async function findByEmail(tenantId, email) {
  const { rows } = await query(
    `SELECT id, tenant_id, email, password_hash, full_name, role, status
       FROM users
      WHERE tenant_id = $1 AND email = $2 AND deleted_at IS NULL
      LIMIT 1`,
    [tenantId, email],
  );
  return rows[0] || null;
}

async function findByEmailGlobal(email) {
  const { rows } = await query(
    `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.role, u.status,
            t.slug AS tenant_slug
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id AND t.deleted_at IS NULL
      WHERE u.email = $1 AND u.deleted_at IS NULL`,
    [email],
  );
  return rows;
}

async function findById(tenantId, id) {
  const { rows } = await query(
    `SELECT ${SAFE} FROM users
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rows[0] || null;
}

// Deliberately separate from findById (which uses the SAFE column list) --
// password_hash should only ever be fetched by the one call site that needs
// to verify it (changing your own password while logged in).
async function findPasswordHash(tenantId, id) {
  const { rows } = await query(
    `SELECT password_hash FROM users
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rows[0]?.password_hash || null;
}

async function create(client, payload) {
  const {
    tenantId, email, passwordHash, fullName, licenseNumber = null, role = 'member', createdBy = null,
  } = payload;
  const { rows } = await client.query(
    `INSERT INTO users (tenant_id, email, password_hash, full_name, license_number, role, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SAFE}`,
    [tenantId, email, passwordHash, fullName, licenseNumber, role, createdBy],
  );
  return rows[0];
}

async function list(tenantId, { q, role, limit, offset }) {
  const params = [tenantId];
  let where = 'tenant_id = $1 AND deleted_at IS NULL';
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (email ILIKE $${params.length} OR full_name ILIKE $${params.length})`;
  }
  if (role) {
    params.push(role);
    where += ` AND role = $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT ${SAFE}, COUNT(*) OVER() AS total_count
       FROM users
      WHERE ${where}
   ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return { rows: rows.map(({ total_count, ...r }) => r), total };
}

async function update(tenantId, id, fields) {
  const sets = [];
  const params = [tenantId, id];
  Object.entries(fields).forEach(([col, val]) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  });
  if (!sets.length) return findById(tenantId, id);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')}
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
   RETURNING ${SAFE}`,
    params,
  );
  return rows[0] || null;
}

async function softDelete(tenantId, id) {
  const { rowCount } = await query(
    `UPDATE users
        SET deleted_at = now(), status = 'disabled'
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rowCount > 0;
}

async function setLastLogin(id) {
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
}

// Creates the invited user row directly in 'pending' status (no
// password_hash yet) -- see migration 1700000007000 for why this isn't a
// separate invites table. Relies on uq_users_tenant_email to reject
// inviting an email already on the team; the service layer translates
// that unique-violation into a clean Conflict.
async function createInvite(tenantId, {
  email, role, fullName, tokenHash, expiresAt, createdBy,
}) {
  const { rows } = await query(
    `INSERT INTO users (tenant_id, email, full_name, role, status, invite_token_hash, invite_expires_at, created_by)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
     RETURNING ${SAFE}`,
    [tenantId, email, fullName || null, role, tokenHash, expiresAt, createdBy || null],
  );
  return rows[0];
}

// Re-inviting an email that's already pending (not yet accepted) updates
// the same row in place -- a fresh token/expiry and, optionally, an
// updated role/name -- rather than erroring as "already exists".
async function renewInvite(tenantId, id, { role, fullName, tokenHash, expiresAt }) {
  const { rows } = await query(
    `UPDATE users
        SET role = $3, full_name = COALESCE($4, full_name),
            invite_token_hash = $5, invite_expires_at = $6
      WHERE tenant_id = $1 AND id = $2 AND status = 'pending' AND deleted_at IS NULL
  RETURNING ${SAFE}`,
    [tenantId, id, role, fullName || null, tokenHash, expiresAt],
  );
  return rows[0] || null;
}

// Unscoped by tenant_id on purpose -- the accept-invite flow is
// unauthenticated (the caller doesn't know their tenant yet), same as
// findByEmailGlobal. Includes invite_expires_at + tenant_id/role/email so
// the accept-invite page can show "which office + role" before submitting,
// and so the service layer can enforce expiry without a second query.
async function findByInviteTokenHash(tokenHash) {
  const { rows } = await query(
    `SELECT id, tenant_id, email, full_name, role, status, invite_expires_at
       FROM users
      WHERE invite_token_hash = $1 AND deleted_at IS NULL
      LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
}

// Guarded by status = 'pending' so an already-accepted (or otherwise
// mutated) row can never be "accepted" a second time even if a stale token
// value somehow resurfaces.
async function acceptInvite(tenantId, id, { passwordHash, fullName }) {
  const { rows } = await query(
    `UPDATE users
        SET password_hash = $3, full_name = COALESCE($4, full_name),
            status = 'active', invite_token_hash = NULL, invite_expires_at = NULL
      WHERE tenant_id = $1 AND id = $2 AND status = 'pending' AND deleted_at IS NULL
  RETURNING ${SAFE}`,
    [tenantId, id, passwordHash, fullName || null],
  );
  return rows[0] || null;
}

module.exports = {
  findByEmail, findByEmailGlobal, findById, findPasswordHash, create, list, update, softDelete, setLastLogin,
  createInvite, renewInvite, findByInviteTokenHash, acceptInvite,
};
