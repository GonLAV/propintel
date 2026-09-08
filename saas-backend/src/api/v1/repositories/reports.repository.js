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

async function list(tenantId, { valuationId, propertyId, limit, offset }) {
  const params = [tenantId];
  let where = 'r.tenant_id = $1 AND r.deleted_at IS NULL';
  if (valuationId) {
    params.push(valuationId);
    where += ` AND r.valuation_id = $${params.length}`;
  }
  if (propertyId) {
    // Reports don't carry property_id directly — join through the
    // valuation they were generated from to reach it, same join shape as
    // properties.repository.js#list's valuation/report count subqueries.
    params.push(propertyId);
    where += ` AND v.property_id = $${params.length}`;
  }
  params.push(limit, offset);
  const rCols = COLS.split(',').map((c) => `r.${c.trim()}`).join(', ');
  const { rows } = await query(
    `SELECT ${rCols}, COUNT(*) OVER() AS total_count,
            v.property_id AS valuation_property_id,
            v.method AS valuation_method,
            v.estimated_value AS valuation_estimated_value,
            v.currency AS valuation_currency,
            p.address AS property_address,
            p.city AS property_city
       FROM reports r
       LEFT JOIN valuations v ON v.id = r.valuation_id
       LEFT JOIN properties p ON p.id = v.property_id
      WHERE ${where}
   ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return {
    rows: rows.map(({
      total_count: totalCount,
      valuation_property_id: valuationPropertyId,
      valuation_method: valuationMethod,
      valuation_estimated_value: valuationEstimatedValue,
      valuation_currency: valuationCurrency,
      property_address: propertyAddress,
      property_city: propertyCity,
      ...r
    }) => ({
      ...r,
      property: propertyAddress === null && propertyCity === null ? null : {
        id: valuationPropertyId,
        address: propertyAddress,
        city: propertyCity,
      },
      valuation_summary: valuationMethod === null ? null : {
        method: valuationMethod,
        estimatedValue: valuationEstimatedValue === null ? null : Number(valuationEstimatedValue),
        currency: valuationCurrency,
      },
    })),
    total,
  };
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
