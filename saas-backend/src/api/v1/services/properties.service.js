'use strict';

const { NotFound } = require('../../../utils/errors');
const { paginate } = require('../../../utils/pagination');
const repo = require('../repositories/properties.repository');

async function create(tenantId, payload, createdBy) {
  return repo.create(tenantId, payload, createdBy);
}

async function getById(tenantId, id) {
  const p = await repo.findById(tenantId, id);
  if (!p) throw NotFound('Property not found');
  return p;
}

async function list(tenantId, query) {
  const { limit, offset, page, pageSize } = paginate(query);
  const { rows, total } = await repo.list(tenantId, {
    q: query.q, city: query.city, propertyType: query.propertyType, limit, offset,
  });
  return { items: rows, page, pageSize, total };
}

async function update(tenantId, id, payload) {
  const p = await repo.update(tenantId, id, payload);
  if (!p) throw NotFound('Property not found');
  return p;
}

async function softDelete(tenantId, id) {
  const ok = await repo.softDelete(tenantId, id);
  if (!ok) throw NotFound('Property not found');
}

module.exports = { create, getById, list, update, softDelete };
