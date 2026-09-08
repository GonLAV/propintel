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

module.exports = {
  findByEmail, findByEmailGlobal, findById, create, list, update, softDelete, setLastLogin,
};
