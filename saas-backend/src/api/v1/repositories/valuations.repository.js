'use strict';

const { query } = require('../../../config/database');

const COLS = `id, tenant_id, property_id, method, status,
              estimated_value, currency, confidence,
              inputs, result, error,
              created_at, updated_at, created_by`;

async function create(tenantId, { propertyId, method, inputs, createdBy }) {
  const { rows } = await query(
    `INSERT INTO valuations (tenant_id, property_id, method, inputs, created_by, status)
     VALUES ($1, $2, $3, $4::jsonb, $5, 'pending')
     RETURNING ${COLS}`,
    [tenantId, propertyId, method, JSON.stringify(inputs || {}), createdBy || null],
  );
  return rows[0];
}

async function complete(tenantId, id, { estimatedValue, currency, confidence, result }) {
  const { rows } = await query(
    `UPDATE valuations
        SET status = 'completed',
            estimated_value = $3,
            currency = COALESCE($4, currency),
            confidence = $5,
            result = $6::jsonb,
            error = NULL
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
   RETURNING ${COLS}`,
    [tenantId, id, estimatedValue, currency || null, confidence ?? null, JSON.stringify(result || {})],
  );
  return rows[0] || null;
}

async function fail(tenantId, id, errorMsg) {
  const { rows } = await query(
    `UPDATE valuations SET status = 'failed', error = $3
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
   RETURNING ${COLS}`,
    [tenantId, id, String(errorMsg).slice(0, 2000)],
  );
  return rows[0] || null;
}

async function findById(tenantId, id) {
  const { rows } = await query(
    `SELECT ${COLS} FROM valuations
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rows[0] || null;
}

async function list(tenantId, { propertyId, status, limit, offset }) {
  const params = [tenantId];
  let where = 'tenant_id = $1 AND deleted_at IS NULL';
  if (propertyId) {
    params.push(propertyId);
    where += ` AND property_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    where += ` AND status = $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT ${COLS}, COUNT(*) OVER() AS total_count
       FROM valuations
      WHERE ${where}
   ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return { rows: rows.map(({ total_count, ...r }) => r), total };
}

async function softDelete(tenantId, id) {
  const { rowCount } = await query(
    `UPDATE valuations SET deleted_at = now()
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rowCount > 0;
}

module.exports = { create, complete, fail, findById, list, softDelete };
