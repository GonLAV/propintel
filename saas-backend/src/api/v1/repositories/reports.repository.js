'use strict';

const { query } = require('../../../config/database');

const COLS = `id, tenant_id, valuation_id, title, format, payload, storage_url,
              client_name, purpose, created_at, updated_at, created_by`;

async function create(tenantId, {
  valuationId, title, format, payload, createdBy, clientName, purpose,
}) {
  const { rows } = await query(
    `INSERT INTO reports (tenant_id, valuation_id, title, format, payload, created_by, client_name, purpose)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
     RETURNING ${COLS}`,
    [tenantId, valuationId, title, format, JSON.stringify(payload || {}), createdBy || null,
      clientName || null, purpose || null],
  );
  return rows[0];
}

async function findById(tenantId, id) {
  const { rows } = await query(
    `SELECT ${COLS} FROM reports
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rows[0] || null;
}

async function list(tenantId, { valuationId, limit, offset }) {
  const params = [tenantId];
  let where = 'tenant_id = $1 AND deleted_at IS NULL';
  if (valuationId) {
    params.push(valuationId);
    where += ` AND valuation_id = $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT ${COLS}, COUNT(*) OVER() AS total_count
       FROM reports
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
    `UPDATE reports SET deleted_at = now()
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rowCount > 0;
}

async function setStorageUrl(tenantId, id, storageUrl) {
  const { rows } = await query(
    `UPDATE reports SET storage_url = $3
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
      RETURNING ${COLS}`,
    [tenantId, id, storageUrl],
  );
  return rows[0] || null;
}

module.exports = { create, findById, list, softDelete, setStorageUrl };
