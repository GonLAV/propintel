'use strict';

const { query } = require('../../../config/database');

const COLS = `id, tenant_id, city, property_type, area_sqm, rooms, floor, year_built,
              sale_price, currency, sold_at, source, metadata, created_at`;

async function findSimilar(tenantId, { city, propertyType, limit = 12, sinceDays = 730 }) {
  const { rows } = await query(
    `SELECT ${COLS}
       FROM comparable_sales
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND city = $2
        AND property_type = $3
        AND sold_at >= now() - ($4 || ' days')::interval
   ORDER BY sold_at DESC
      LIMIT $5`,
    [tenantId, city, propertyType, sinceDays, limit],
  );
  return rows;
}

async function insert(tenantId, payload) {
  const { rows } = await query(
    `INSERT INTO comparable_sales
       (tenant_id, city, property_type, area_sqm, rooms, floor, year_built,
        sale_price, currency, sold_at, source, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING ${COLS}`,
    [
      tenantId,
      payload.city,
      payload.propertyType,
      payload.areaSqm,
      payload.rooms ?? null,
      payload.floor ?? null,
      payload.yearBuilt ?? null,
      payload.salePrice,
      payload.currency || 'ILS',
      payload.soldAt,
      payload.source || null,
      JSON.stringify(payload.metadata || {}),
    ],
  );
  return rows[0];
}

module.exports = { findSimilar, insert };
