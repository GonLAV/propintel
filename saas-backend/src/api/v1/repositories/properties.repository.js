'use strict';

const { query } = require('../../../config/database');

const COLS = `id, tenant_id, external_ref, address, city, property_type,
              area_sqm, rooms, floor, year_built, block, parcel, sub_parcel, visit_date, metadata,
              created_at, updated_at, created_by`;

const FIELD_MAP = {
  externalRef: 'external_ref',
  address: 'address',
  city: 'city',
  propertyType: 'property_type',
  areaSqm: 'area_sqm',
  rooms: 'rooms',
  floor: 'floor',
  yearBuilt: 'year_built',
  block: 'block',
  parcel: 'parcel',
  subParcel: 'sub_parcel',
  visitDate: 'visit_date',
  metadata: 'metadata',
};

async function create(tenantId, payload, createdBy) {
  const cols = ['tenant_id', 'created_by'];
  const vals = [tenantId, createdBy];
  Object.entries(payload).forEach(([k, v]) => {
    if (FIELD_MAP[k] && v !== undefined) {
      cols.push(FIELD_MAP[k]);
      vals.push(k === 'metadata' ? JSON.stringify(v) : v);
    }
  });
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO properties (${cols.join(', ')}) VALUES (${placeholders})
     RETURNING ${COLS}`,
    vals,
  );
  return rows[0];
}

async function findById(tenantId, id) {
  const { rows } = await query(
    `SELECT ${COLS} FROM properties
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rows[0] || null;
}

async function list(tenantId, { q, city, propertyType, limit, offset }) {
  const params = [tenantId];
  let where = 'p.tenant_id = $1 AND p.deleted_at IS NULL';
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (p.address ILIKE $${params.length} OR p.external_ref ILIKE $${params.length})`;
  }
  if (city) {
    params.push(city);
    where += ` AND p.city = $${params.length}`;
  }
  if (propertyType) {
    params.push(propertyType);
    where += ` AND p.property_type = $${params.length}`;
  }
  params.push(limit, offset);
  // One query, LEFT JOINed aggregate counts (not N+1): how many valuations
  // and reports each property has, for the case-status badge on the list
  // page ("אין שומה" / "יש שומה, אין דוח" / "הופק דוח").
  const cols = COLS.split(',').map((c) => `p.${c.trim()}`).join(', ');
  const { rows } = await query(
    `SELECT ${cols}, COUNT(*) OVER() AS total_count,
            COALESCE(v.valuations_count, 0) AS valuations_count,
            COALESCE(r.reports_count, 0) AS reports_count
       FROM properties p
       LEFT JOIN (
         SELECT property_id, COUNT(*) AS valuations_count
           FROM valuations
          WHERE tenant_id = $1 AND deleted_at IS NULL
          GROUP BY property_id
       ) v ON v.property_id = p.id
       LEFT JOIN (
         SELECT val.property_id, COUNT(rep.id) AS reports_count
           FROM valuations val
           JOIN reports rep ON rep.valuation_id = val.id AND rep.deleted_at IS NULL
          WHERE val.tenant_id = $1 AND val.deleted_at IS NULL
          GROUP BY val.property_id
       ) r ON r.property_id = p.id
      WHERE ${where}
   ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const total = rows[0] ? Number(rows[0].total_count) : 0;
  return {
    rows: rows.map(({ total_count, valuations_count, reports_count, ...r }) => ({
      ...r,
      valuations_count: Number(valuations_count),
      reports_count: Number(reports_count),
    })),
    total,
  };
}

async function update(tenantId, id, payload) {
  const sets = [];
  const params = [tenantId, id];
  Object.entries(payload).forEach(([k, v]) => {
    if (FIELD_MAP[k] && v !== undefined) {
      params.push(k === 'metadata' ? JSON.stringify(v) : v);
      sets.push(`${FIELD_MAP[k]} = $${params.length}`);
    }
  });
  if (!sets.length) return findById(tenantId, id);
  const { rows } = await query(
    `UPDATE properties SET ${sets.join(', ')}
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
   RETURNING ${COLS}`,
    params,
  );
  return rows[0] || null;
}

async function softDelete(tenantId, id) {
  const { rowCount } = await query(
    `UPDATE properties SET deleted_at = now()
      WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
    [tenantId, id],
  );
  return rowCount > 0;
}

module.exports = { create, findById, list, update, softDelete };
