'use strict';

/**
 * Production-grade valuation engine for the PropIntel MVP.
 *
 * Three independent approaches (each returning value + confidence + breakdown):
 *   - Comparables  — adjusted price-per-sqm from recent tenant comps (city + type).
 *   - Cost         — replacement cost - depreciation + land contribution.
 *   - Income       — direct cap-rate (NOI / cap rate).
 *
 * Reconciled: weighted average of the three, weights driven by per-method confidence
 * and method preference for the property type (apartments lean comparables, offices
 * lean income, raw land leans cost).
 *
 * All calculations are pure / synchronous and unit-testable.
 */

const ROUND = (n) => Math.round(Number(n));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// ------------------ COMPARABLES -------------------------------------------------

function pricePerSqm(comp) {
  return Number(comp.sale_price) / Number(comp.area_sqm);
}

// Time adjustment: 4%/yr appreciation by default (tenant config could override).
function timeAdjustmentFactor(soldAt, asOf = new Date(), annualPct = 0.04) {
  const ms = asOf.getTime() - new Date(soldAt).getTime();
  const years = ms / (365.25 * 24 * 3600 * 1000);
  return Math.pow(1 + annualPct, years);
}

function adjustComparable(comp, subject, asOf) {
  const adjustments = [];
  let adjustedPpsm = pricePerSqm(comp);

  // Time
  const tFactor = timeAdjustmentFactor(comp.sold_at, asOf);
  adjustedPpsm *= tFactor;
  adjustments.push({ name: 'time', factor: Number(tFactor.toFixed(4)) });

  // Floor: +1% per floor difference, capped ±5%
  if (Number.isFinite(subject.floor) && Number.isFinite(comp.floor)) {
    const f = clamp((Number(subject.floor) - Number(comp.floor)) * 0.01, -0.05, 0.05);
    adjustedPpsm *= 1 + f;
    adjustments.push({ name: 'floor', factor: Number((1 + f).toFixed(4)) });
  }

  // Year built: 0.4% per year newer (capped ±10%)
  if (Number.isFinite(subject.year_built) && Number.isFinite(comp.year_built)) {
    const f = clamp((Number(subject.year_built) - Number(comp.year_built)) * 0.004, -0.1, 0.1);
    adjustedPpsm *= 1 + f;
    adjustments.push({ name: 'age', factor: Number((1 + f).toFixed(4)) });
  }

  // Size: small properties trade at premium per sqm; ±0.4% per sqm of size delta, capped ±8%.
  if (Number.isFinite(subject.area_sqm) && Number.isFinite(comp.area_sqm)) {
    const delta = Number(comp.area_sqm) - Number(subject.area_sqm);
    const f = clamp(delta * 0.0008, -0.08, 0.08);
    adjustedPpsm *= 1 + f;
    adjustments.push({ name: 'size', factor: Number((1 + f).toFixed(4)) });
  }

  return { adjustedPpsm, adjustments };
}

function comparablesValuation({ subject, comps, asOf = new Date() }) {
  if (!subject.area_sqm) {
    return { value: null, confidence: 0, breakdown: { reason: 'subject area_sqm required' } };
  }
  if (!Array.isArray(comps) || comps.length === 0) {
    return { value: null, confidence: 0, breakdown: { reason: 'no comparables' } };
  }

  const adjusted = comps.map((c) => {
    const { adjustedPpsm, adjustments } = adjustComparable(c, subject, asOf);
    return { id: c.id, soldAt: c.sold_at, salePrice: Number(c.sale_price),
      areaSqm: Number(c.area_sqm), adjustedPpsm, adjustments };
  });

  // Use median to reject outliers.
  const sorted = adjusted.slice().sort((a, b) => a.adjustedPpsm - b.adjustedPpsm);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1].adjustedPpsm + sorted[mid].adjustedPpsm) / 2
    : sorted[mid].adjustedPpsm;

  const value = ROUND(median * Number(subject.area_sqm));

  // Confidence: more comps = higher; tighter spread = higher.
  const mean = adjusted.reduce((s, a) => s + a.adjustedPpsm, 0) / adjusted.length;
  const variance = adjusted.reduce((s, a) => s + (a.adjustedPpsm - mean) ** 2, 0) / adjusted.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const sampleScore = clamp(adjusted.length / 8, 0.3, 1);
  const spreadScore = clamp(1 - cv, 0, 1);
  const confidence = Number((0.5 * sampleScore + 0.5 * spreadScore).toFixed(3));

  return {
    value,
    confidence,
    breakdown: {
      method: 'comparables',
      sampleSize: adjusted.length,
      medianPpsm: ROUND(median),
      meanPpsm: ROUND(mean),
      coefficientOfVariation: Number(cv.toFixed(3)),
      adjusted,
    },
  };
}

// ------------------ COST --------------------------------------------------------

const REPLACEMENT_RATE_PER_SQM = {
  apartment: 9000, house: 11000, office: 10000, retail: 12000, other: 8000,
};
const LAND_RATE_PER_SQM = {
  apartment: 12000, house: 6000, office: 11000, retail: 14000, land: 5000, other: 5000,
};

function depreciationPct(yearBuilt, asOf = new Date(), usefulLife = 60) {
  if (!Number.isFinite(yearBuilt)) return 0.15; // unknown — assume mild depreciation
  const age = asOf.getFullYear() - Number(yearBuilt);
  return clamp(age / usefulLife, 0, 0.6);
}

function costApproachValuation({ subject, asOf = new Date() }) {
  if (subject.property_type === 'land') {
    const rate = LAND_RATE_PER_SQM.land;
    if (!subject.area_sqm) return { value: null, confidence: 0, breakdown: { reason: 'land area_sqm required' } };
    const value = ROUND(Number(subject.area_sqm) * rate);
    return { value, confidence: 0.55, breakdown: { method: 'cost', landRatePerSqm: rate, area: subject.area_sqm } };
  }
  if (!subject.area_sqm) {
    return { value: null, confidence: 0, breakdown: { reason: 'area_sqm required' } };
  }

  const replRate = REPLACEMENT_RATE_PER_SQM[subject.property_type] || REPLACEMENT_RATE_PER_SQM.other;
  const replacement = Number(subject.area_sqm) * replRate;
  const dep = depreciationPct(subject.year_built, asOf);
  const depreciated = replacement * (1 - dep);

  // Land contribution: assume land area ≈ 1.5× footprint for houses, 0.4× for apartments.
  const landFactor = subject.property_type === 'house' ? 1.5
    : subject.property_type === 'apartment' ? 0.4
    : 1.0;
  const landRate = LAND_RATE_PER_SQM[subject.property_type] || LAND_RATE_PER_SQM.other;
  const land = Number(subject.area_sqm) * landFactor * landRate;

  const value = ROUND(depreciated + land);
  return {
    value,
    confidence: 0.6,
    breakdown: {
      method: 'cost',
      replacementRatePerSqm: replRate,
      replacementCost: ROUND(replacement),
      depreciationPct: Number(dep.toFixed(3)),
      depreciated: ROUND(depreciated),
      landContribution: ROUND(land),
    },
  };
}

// ------------------ INCOME ------------------------------------------------------

const DEFAULT_CAP_RATES = {
  apartment: 0.035, house: 0.04, office: 0.07, retail: 0.075, land: 0.05, other: 0.06,
};
const DEFAULT_RENT_PER_SQM_MONTH = {
  apartment: 75, house: 70, office: 100, retail: 130, other: 60,
};

function incomeApproachValuation({ subject, inputs = {} }) {
  if (!subject.area_sqm) {
    return { value: null, confidence: 0, breakdown: { reason: 'area_sqm required' } };
  }
  const rentPerSqmMonth = Number(inputs.rentPerSqmMonth)
    || DEFAULT_RENT_PER_SQM_MONTH[subject.property_type]
    || DEFAULT_RENT_PER_SQM_MONTH.other;
  const vacancyRate = Number.isFinite(inputs.vacancyRate) ? Number(inputs.vacancyRate) : 0.05;
  const opexRatio = Number.isFinite(inputs.opexRatio) ? Number(inputs.opexRatio) : 0.20;
  const capRate = Number(inputs.capRate)
    || DEFAULT_CAP_RATES[subject.property_type]
    || DEFAULT_CAP_RATES.other;

  const gpi = Number(subject.area_sqm) * rentPerSqmMonth * 12;
  const egi = gpi * (1 - vacancyRate);
  const noi = egi * (1 - opexRatio);
  const value = ROUND(noi / capRate);

  // Income confidence depends on whether tenant supplied real inputs.
  const usedRealInputs = Boolean(inputs.rentPerSqmMonth || inputs.capRate);
  const confidence = usedRealInputs ? 0.75 : 0.55;

  return {
    value,
    confidence,
    breakdown: {
      method: 'income',
      rentPerSqmMonth, vacancyRate, opexRatio, capRate,
      grossPotentialIncome: ROUND(gpi),
      effectiveGrossIncome: ROUND(egi),
      netOperatingIncome: ROUND(noi),
    },
  };
}

// ------------------ RECONCILIATION ---------------------------------------------

const PREFERENCE = {
  apartment: { comparables: 0.7, cost: 0.1, income: 0.2 },
  house:     { comparables: 0.7, cost: 0.2, income: 0.1 },
  office:    { comparables: 0.3, cost: 0.1, income: 0.6 },
  retail:    { comparables: 0.3, cost: 0.1, income: 0.6 },
  land:      { comparables: 0.4, cost: 0.6, income: 0.0 },
  other:     { comparables: 0.4, cost: 0.3, income: 0.3 },
};

function reconciledValuation({ subject, comps, inputs }) {
  const c = comparablesValuation({ subject, comps });
  const k2 = costApproachValuation({ subject });
  const inc = incomeApproachValuation({ subject, inputs });

  const pref = PREFERENCE[subject.property_type] || PREFERENCE.other;
  const candidates = [
    { name: 'comparables', ...c, pref: pref.comparables },
    { name: 'cost', ...k2, pref: pref.cost },
    { name: 'income', ...inc, pref: pref.income },
  ].filter((x) => x.value !== null && x.pref > 0);

  if (candidates.length === 0) {
    return { value: null, confidence: 0, breakdown: { reason: 'no method produced a value' } };
  }

  // Weight = preference × confidence, normalized.
  const rawWeights = candidates.map((x) => x.pref * Math.max(x.confidence, 0.1));
  const sum = rawWeights.reduce((s, w) => s + w, 0);
  const weights = rawWeights.map((w) => w / sum);

  const value = ROUND(candidates.reduce((acc, x, i) => acc + x.value * weights[i], 0));
  const confidence = Number(
    candidates.reduce((acc, x, i) => acc + x.confidence * weights[i], 0).toFixed(3),
  );

  return {
    value,
    confidence,
    breakdown: {
      method: 'reconciled',
      methods: candidates.map((x, i) => ({
        method: x.name, value: x.value, confidence: x.confidence,
        weight: Number(weights[i].toFixed(3)), breakdown: x.breakdown,
      })),
    },
  };
}

// ------------------ ENTRY -------------------------------------------------------

/**
 * Run a valuation given a method and supporting data.
 * Returns { estimatedValue, currency, confidence, result } or null when not enough data.
 */
function runValuation({ subject, method, comps = [], inputs = {} }) {
  let out;
  switch (method) {
    case 'comparables': out = comparablesValuation({ subject, comps }); break;
    case 'cost':        out = costApproachValuation({ subject }); break;
    case 'income':      out = incomeApproachValuation({ subject, inputs }); break;
    case 'reconciled':  out = reconciledValuation({ subject, comps, inputs }); break;
    default: throw new Error(`Unknown valuation method: ${method}`);
  }
  if (out.value === null) return null;
  return {
    estimatedValue: out.value,
    currency: subject.currency || 'ILS',
    confidence: out.confidence,
    result: { ...out.breakdown, generatedAt: new Date().toISOString() },
  };
}

module.exports = {
  runValuation,
  comparablesValuation,
  costApproachValuation,
  incomeApproachValuation,
  reconciledValuation,
  pricePerSqm,
  timeAdjustmentFactor,
};
