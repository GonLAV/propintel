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

// "עקרונות, גורמים ושיקולים" (תקן 1.1 §5.10) — the standard leaves this
// section's content to the appraiser's own judgment, with no fixed wording
// to quote (unlike the conflict-of-interest declaration). Rather than invent
// generic boilerplate, this describes the actual calculation that was
// performed: real numbers already in valuation.result, never fabricated.
// Returns one sentence per underlying method actually run (handles
// 'reconciled' by describing each sub-method it weighted together).
const METHOD_WEIGHT_LABELS = {
  comparables: 'השוואת מכירות', cost: 'גישת העלות', income: 'גישת ההיוון',
};

const ADJUSTMENT_TYPE_LABELS = { time: 'זמן', floor: 'קומה', age: 'גיל בניין', size: 'שטח' };

// Which adjustment types actually fired across the comps used, in the
// engine's own fixed order -- not a hardcoded list. age/size only apply
// when both the subject and the comp have that field populated
// (adjustComparable in valuationEngine.js), which isn't guaranteed (e.g.
// the comparable-entry form doesn't collect yearBuilt), so a report where
// no comp had an age match must not claim an age adjustment was applied.
function appliedAdjustmentTypes(adjustedComps) {
  const seen = new Set();
  (adjustedComps || []).forEach((c) => {
    (c.adjustments || []).forEach((a) => seen.add(a.name));
  });
  return ['time', 'floor', 'age', 'size']
    .filter((name) => seen.has(name))
    .map((name) => ADJUSTMENT_TYPE_LABELS[name]);
}

function principlesSentenceFor(method, breakdown) {
  switch (method) {
    case 'comparables': {
      const n = breakdown.sampleSize;
      const cv = breakdown.coefficientOfVariation;
      const spread = cv == null ? null : cv < 0.1 ? 'נמוך' : cv < 0.25 ? 'בינוני' : 'גבוה';
      const types = appliedAdjustmentTypes(breakdown.adjusted);
      const typesText = types.length
        ? `לאחר התאמות ${types.join(', ')}`
        : 'ללא התאמות נוספות מעבר למחיר הגולמי למ"ר';
      return `גישת ההשוואה: נותחו ${n ?? '—'} עסקאות השוואה, ${typesText}. `
        + `נעשה שימוש בחציון מחיר-למ"ר המתואם (ולא בממוצע) כדי להפחית את השפעת חריגים`
        + (spread ? `; פיזור המחירים המתואמים בין העסקאות היה ${spread}.` : '.');
    }
    case 'cost': {
      // Raw land has no building to depreciate — a distinct, simpler
      // breakdown shape (landRatePerSqm + area only, no replacementCost/
      // depreciationPct/landValueSource).
      if (breakdown.landValueSource === undefined && breakdown.landRatePerSqm !== undefined) {
        return `גישת העלות (קרקע פנויה): שווי הנכס נגזר ישירות מתעריף שווי-קרקע למ"ר, ללא רכיב כינון/פחת של מבנה.`;
      }
      const depPct = breakdown.depreciationPct != null ? Math.round(breakdown.depreciationPct * 100) : null;
      const landSrc = breakdown.landValueSource === 'market-abstraction'
        ? 'אמדן שווי הקרקע התבסס על ניתוח עסקאות השוואה מקומיות (שיטת הפחתה/ייחוס), לא על טבלת תעריפים כללית'
        : 'אמדן שווי הקרקע התבסס על טבלת תעריפים ארצית, בהיעדר מספיק עסקאות-השוואה מקומיות לביסוס אמדן ספציפי';
      return `גישת העלות: שווי הנכס נגזר מעלות כינון/הקמה מחדש של המבנה`
        + (depPct != null ? `, בניכוי פחת של כ-${depPct}% בהתאם לגיל המבנה` : '')
        + `, בתוספת אמדן שווי הקרקע. ${landSrc}.`;
    }
    case 'income': {
      const capPct = breakdown.capRate != null ? (breakdown.capRate * 100).toFixed(1) : null;
      const sourceNote = breakdown.rentPerSqmMonth && breakdown.capRate
        ? 'נתוני השכירות ושיעור ההיוון סופקו ספציפית לנכס זה'
        : 'בהיעדר נתוני שכירות/היוון ספציפיים לנכס, הופעלו ערכי ברירת-מחדל שמרניים לפי סוג הנכס — יש לעדכנם בנתונים אמיתיים טרם מסירת חוות דעת סופית';
      return `גישת ההיוון: שווי הנכס נגזר מהיוון ההכנסה התפעולית נטו (לאחר תפוסה-ריקה והוצאות תפעול) `
        + `בשיעור היוון של ${capPct != null ? `${capPct}%` : '—'}. ${sourceNote}.`;
    }
    default:
      return null;
  }
}

function extractPrinciplesSummary(valuation) {
  const result = valuation.result || {};
  if (valuation.method === 'reconciled') {
    const methods = result.methods || [];
    const sentences = methods
      .map((m) => principlesSentenceFor(m.method, m.breakdown || {}))
      .filter(Boolean);
    const weights = methods
      .map((m) => `${METHOD_WEIGHT_LABELS[m.method] || m.method} (${Math.round((m.weight || 0) * 100)}%)`)
      .join(', ');
    if (sentences.length === 0) return null;
    return [
      ...sentences,
      `השווי הסופי משקלל ${methods.length} שיטות עצמאיות, במשקלים המשקפים הן את התאמת השיטה לסוג הנכס והן את רמת הביטחון שהניבה כל שיטה בנפרד: ${weights}.`,
    ];
  }
  const sentence = principlesSentenceFor(valuation.method, result);
  return sentence ? [sentence] : null;
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
  valuationId, title, format, createdBy, clientName, purpose, principlesNotes,
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
    valuationId, title, format, payload, createdBy, clientName, purpose, principlesNotes,
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
        legalRightsNotes: property.legal_rights_notes,
        planningStatusNotes: property.planning_status_notes,
      },
      valuation: { ...base.valuation, valuationDate: valuation.created_at },
      comparables: extractComparables(valuation),
      reconciliation: extractReconciliation(valuation),
      costBreakdown: extractCostBreakdown(valuation),
      principlesSummary: extractPrinciplesSummary(valuation),
      principlesNotes: report.principles_notes,
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
