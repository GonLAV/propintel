'use strict';

const repo = require('../repositories/comparables.repository');

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

module.exports = { create, list };
