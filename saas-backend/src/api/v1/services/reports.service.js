'use strict';

const logger = require('../../../config/logger');
const { NotFound, BadRequest } = require('../../../utils/errors');
const { paginate } = require('../../../utils/pagination');
const repo = require('../repositories/reports.repository');
const valRepo = require('../repositories/valuations.repository');
const propsRepo = require('../repositories/properties.repository');
const tenantsRepo = require('../repositories/tenants.repository');
const usersRepo = require('../repositories/users.repository');
const { renderReportHtml } = require('./pdf/reportTemplate');
const { renderHtmlToPdf } = require('./pdf/pdfRenderer');
const { savePdf, readPdf } = require('./pdf/reportStorage');

function buildPayload({ valuation, property }) {
  return {
    generatedAt: new Date().toISOString(),
    property: {
      id: property.id,
      address: property.address,
      city: property.city,
      propertyType: property.property_type,
      areaSqm: property.area_sqm,
      rooms: property.rooms,
      floor: property.floor,
      yearBuilt: property.year_built,
    },
    valuation: {
      id: valuation.id,
      method: valuation.method,
      status: valuation.status,
      // pg returns `numeric` columns as strings — coerce here so every
      // consumer (template, markdown, isFinite checks) sees real numbers.
      estimatedValue: valuation.estimated_value === null ? null : Number(valuation.estimated_value),
      currency: valuation.currency,
      confidence: valuation.confidence === null ? null : Number(valuation.confidence),
      result: valuation.result,
    },
  };
}

// Pulls the comparable-sale list actually used by the engine out of the
// stored valuation result, rather than re-querying comparable_sales — this
// is what the number in the report was actually computed from, even if the
// tenant's comp pool has since changed.
function extractComparables(valuation) {
  const result = valuation.result || {};
  if (valuation.method === 'comparables') return result.adjusted || null;
  if (valuation.method === 'reconciled') {
    const sub = (result.methods || []).find((m) => m.method === 'comparables');
    return sub?.breakdown?.adjusted || null;
  }
  return null;
}

function extractReconciliation(valuation) {
  if (valuation.method !== 'reconciled') return null;
  return (valuation.result || {}).methods || null;
}

// Additional value bases (replacement cost, land) only when the cost
// approach was actually run for this valuation (method 'cost' or
// 'reconciled') — never invented for a comparables/income-only valuation.
function extractCostBreakdown(valuation) {
  const result = valuation.result || {};
  if (valuation.method === 'cost') {
    return {
      replacementCost: result.replacementCost ?? null,
      landContribution: result.landContribution ?? null,
    };
  }
  if (valuation.method === 'reconciled') {
    const sub = (result.methods || []).find((m) => m.method === 'cost');
    if (!sub?.breakdown) return null;
    return {
      replacementCost: sub.breakdown.replacementCost ?? null,
      landContribution: sub.breakdown.landContribution ?? null,
    };
  }
  return null;
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

async function create(tenantId, {
  valuationId, title, format, createdBy, clientName, purpose,
}) {
  const valuation = await valRepo.findById(tenantId, valuationId);
  if (!valuation) throw NotFound('Valuation not found');
  if (valuation.status !== 'completed') {
    throw BadRequest('Cannot create report for a valuation that is not completed');
  }
  const property = await propsRepo.findById(tenantId, valuation.property_id);
  if (!property) throw NotFound('Property not found');

  const base = buildPayload({ valuation, property });
  const payload = format === 'markdown' ? { ...base, markdown: renderMarkdown(base) } : base;

  let report = await repo.create(tenantId, {
    valuationId, title, format, payload, createdBy, clientName, purpose,
  });

  if (format === 'pdf') {
    const [tenant, appraiser] = await Promise.all([
      tenantsRepo.findById(tenantId),
      usersRepo.findById(tenantId, createdBy).catch(() => null),
    ]);
    const { html, headerTemplate, footerTemplate } = renderReportHtml({
      reportId: report.id,
      title,
      generatedAt: base.generatedAt,
      office: { name: tenant?.name || null },
      appraiser: {
        fullName: appraiser?.full_name || null,
        email: appraiser?.email || null,
        licenseNumber: appraiser?.license_number || null,
      },
      report: { clientName: report.client_name, purpose: report.purpose },
      property: {
        ...base.property,
        externalRef: property.external_ref,
        block: property.block,
        parcel: property.parcel,
        subParcel: property.sub_parcel,
        visitDate: property.visit_date,
      },
      valuation: { ...base.valuation, valuationDate: valuation.created_at },
      comparables: extractComparables(valuation),
      reconciliation: extractReconciliation(valuation),
      costBreakdown: extractCostBreakdown(valuation),
    });
    try {
      const pdfBuffer = await renderHtmlToPdf(html, { headerTemplate, footerTemplate });
      await savePdf(tenantId, report.id, pdfBuffer);
      report = await repo.setStorageUrl(tenantId, report.id, `/api/v1/reports/${report.id}/pdf`);
    } catch (err) {
      // The JSON record already exists and is useful on its own; a PDF
      // rendering failure (e.g. browser unavailable) shouldn't 500 the
      // whole request — surface it via a null storage_url instead.
      logger.error({ err, reportId: report.id }, 'pdf report generation failed');
    }
  }

  return report;
}

async function getById(tenantId, id) {
  const r = await repo.findById(tenantId, id);
  if (!r) throw NotFound('Report not found');
  return r;
}

async function list(tenantId, query) {
  const { limit, offset, page, pageSize } = paginate(query);
  const { rows, total } = await repo.list(tenantId, {
    valuationId: query.valuationId, propertyId: query.propertyId, limit, offset,
  });
  return { items: rows, page, pageSize, total };
}

async function softDelete(tenantId, id) {
  const ok = await repo.softDelete(tenantId, id);
  if (!ok) throw NotFound('Report not found');
}

async function getPdf(tenantId, id) {
  const r = await repo.findById(tenantId, id);
  if (!r) throw NotFound('Report not found');
  if (r.format !== 'pdf' || !r.storage_url) {
    throw BadRequest('This report was not generated as a PDF');
  }
  const buffer = await readPdf(tenantId, id).catch(() => null);
  if (!buffer) throw NotFound('PDF file not found on storage');
  return { buffer, filename: `${r.title}.pdf` };
}

module.exports = { create, getById, list, softDelete, getPdf };
