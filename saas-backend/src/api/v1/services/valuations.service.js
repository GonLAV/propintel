'use strict';

const { NotFound } = require('../../../utils/errors');
const { paginate } = require('../../../utils/pagination');
const { redis } = require('../../../config/redis');
const logger = require('../../../config/logger');

const repo = require('../repositories/valuations.repository');
const propsRepo = require('../repositories/properties.repository');
const compsRepo = require('../repositories/comparables.repository');
const { runValuation } = require('./valuationEngine');
const metrics = require('../../../middleware/metrics');

const CACHE_TTL_SECONDS = 60 * 60; // 1h

async function create(tenantId, { propertyId, method, inputs, createdBy }) {
  const property = await propsRepo.findById(tenantId, propertyId);
  if (!property) throw NotFound('Property not found');

  let valuation = await repo.create(tenantId, { propertyId, method, inputs, createdBy });
  try {
    let comps = [];
    if (method === 'comparables' || method === 'reconciled') {
      comps = await compsRepo.findSimilar(tenantId, {
        city: property.city,
        propertyType: property.property_type,
      });
    }
    const out = runValuation({ subject: property, method, comps, inputs: inputs || {} });
    if (!out) {
      valuation = await repo.fail(tenantId, valuation.id, 'Insufficient inputs (areaSqm required)');
      metrics.counter('valuations_total', { method, status: 'failed' });
    } else {
      valuation = await repo.complete(tenantId, valuation.id, out);
      try {
        await redis.set(
          `val:${tenantId}:${propertyId}:${method}`,
          JSON.stringify(out),
          'EX', CACHE_TTL_SECONDS,
        );
      } catch (e) { logger.warn({ err: e }, 'redis cache set failed'); }
      metrics.counter('valuations_total', { method, status: 'completed' });
    }
  } catch (err) {
    logger.error({ err }, 'valuation engine error');
    valuation = await repo.fail(tenantId, valuation.id, err.message || 'engine error');
    metrics.counter('valuations_total', { method, status: 'failed' });
  }
  return valuation;
}

async function getById(tenantId, id) {
  const v = await repo.findById(tenantId, id);
  if (!v) throw NotFound('Valuation not found');
  return v;
}

async function list(tenantId, query) {
  const { limit, offset, page, pageSize } = paginate(query);
  const { rows, total } = await repo.list(tenantId, {
    propertyId: query.propertyId, status: query.status, limit, offset,
  });
  return { items: rows, page, pageSize, total };
}

async function softDelete(tenantId, id) {
  const ok = await repo.softDelete(tenantId, id);
  if (!ok) throw NotFound('Valuation not found');
}

module.exports = { create, getById, list, softDelete };
