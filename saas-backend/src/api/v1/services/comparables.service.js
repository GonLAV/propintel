'use strict';

const repo = require('../repositories/comparables.repository');
const { NotFound } = require('../../../utils/errors');

async function create(tenantId, payload) {
  return repo.insert(tenantId, payload);
}

async function list(tenantId, query) {
  const rows = await repo.findSimilar(tenantId, {
    city: query.city,
    propertyType: query.propertyType,
    limit: query.limit,
    sinceDays: query.sinceDays,
  });
  return { items: rows, total: rows.length };
}

// Comparables are shared tenant-wide market data (looked up by city+type,
// not scoped to one property) -- a single bad entry (typo'd sale price,
// wrong area) silently poisons every valuation in that city/type from then
// on, for every property, with no warning. Until this existed there was no
// way to remove one.
async function remove(tenantId, id) {
  const existing = await repo.findById(tenantId, id);
  if (!existing) throw NotFound('Comparable not found');
  await repo.softDelete(tenantId, id);
}

module.exports = { create, list, remove };
