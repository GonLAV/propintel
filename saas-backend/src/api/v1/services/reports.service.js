'use strict';

const { NotFound, BadRequest } = require('../../../utils/errors');
const { paginate } = require('../../../utils/pagination');
const repo = require('../repositories/reports.repository');
const valRepo = require('../repositories/valuations.repository');
const propsRepo = require('../repositories/properties.repository');

function buildPayload({ valuation, property }) {
  return {
    generatedAt: new Date().toISOString(),
    property: {
      id: property.id,
      address: property.address,
      city: property.city,
      propertyType: property.property_type,
      areaSqm: property.area_sqm,
      yearBuilt: property.year_built,
    },
    valuation: {
      id: valuation.id,
      method: valuation.method,
      status: valuation.status,
      estimatedValue: valuation.estimated_value,
      currency: valuation.currency,
      confidence: valuation.confidence,
      result: valuation.result,
    },
  };
}

function renderMarkdown(p) {
  const lines = [
    `# Appraisal Report`,
    `Generated: ${p.generatedAt}`,
    ``,
    `## Property`,
    `- Address: ${p.property.address}, ${p.property.city}`,
    `- Type: ${p.property.propertyType}`,
    `- Area: ${p.property.areaSqm ?? 'N/A'} sqm`,
    `- Year built: ${p.property.yearBuilt ?? 'N/A'}`,
    ``,
    `## Valuation`,
    `- Method: ${p.valuation.method}`,
    `- Status: ${p.valuation.status}`,
    `- Estimated value: ${p.valuation.estimatedValue ?? 'N/A'} ${p.valuation.currency}`,
    `- Confidence: ${p.valuation.confidence ?? 'N/A'}`,
  ];
  return lines.join('\n');
}

async function create(tenantId, { valuationId, title, format, createdBy }) {
  const valuation = await valRepo.findById(tenantId, valuationId);
  if (!valuation) throw NotFound('Valuation not found');
  if (valuation.status !== 'completed') {
    throw BadRequest('Cannot create report for a valuation that is not completed');
  }
  const property = await propsRepo.findById(tenantId, valuation.property_id);
  if (!property) throw NotFound('Property not found');

  const base = buildPayload({ valuation, property });
  const payload = format === 'markdown' ? { ...base, markdown: renderMarkdown(base) } : base;

  // PDF generation is not implemented in the MVP; the API still records the
  // intended format so a worker can later produce and attach storage_url.
  return repo.create(tenantId, { valuationId, title, format, payload, createdBy });
}

async function getById(tenantId, id) {
  const r = await repo.findById(tenantId, id);
  if (!r) throw NotFound('Report not found');
  return r;
}

async function list(tenantId, query) {
  const { limit, offset, page, pageSize } = paginate(query);
  const { rows, total } = await repo.list(tenantId, {
    valuationId: query.valuationId, limit, offset,
  });
  return { items: rows, page, pageSize, total };
}

async function softDelete(tenantId, id) {
  const ok = await repo.softDelete(tenantId, id);
  if (!ok) throw NotFound('Report not found');
}

module.exports = { create, getById, list, softDelete };
