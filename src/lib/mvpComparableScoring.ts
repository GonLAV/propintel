export interface ComparableFeatures {
  id: string
  distanceMeters: number
  areaSqm: number
  floorNum: number
  rooms: number
  buildingAgeYears: number
  priceNis: number
}

export interface SubjectFeatures {
  areaSqm: number
  floorNum: number
  rooms: number
  buildingAgeYears: number
}

export interface ScoredComparable {
  id: string
  score: number
  geoSimilarity: number
  areaSimilarity: number
  floorSimilarity: number
  roomSimilarity: number
  buildingSimilarity: number
  adjustedPriceNis: number
  pricePerSqm: number
}

export interface ValuationSummary {
  low: number
  mid: number
  high: number
  comparablesUsed: number
  outlierIds: string[]
}

export function scoreComparable(subject: SubjectFeatures, comp: ComparableFeatures): ScoredComparable {
  const geoSimilarity = clamp(1 - comp.distanceMeters / 3000, 0, 1)
  const areaSimilarity = clamp(1 - Math.abs(subject.areaSqm - comp.areaSqm) / 120, 0, 1)
  const floorSimilarity = clamp(1 - Math.abs(subject.floorNum - comp.floorNum) / 15, 0, 1)
  const roomSimilarity = clamp(1 - Math.abs(subject.rooms - comp.rooms) / 5, 0, 1)
  const buildingSimilarity = clamp(1 - Math.abs(subject.buildingAgeYears - comp.buildingAgeYears) / 60, 0, 1)

  const score =
    0.30 * geoSimilarity +
    0.25 * areaSimilarity +
    0.15 * floorSimilarity +
    0.15 * roomSimilarity +
    0.15 * buildingSimilarity

  const adjustmentPct =
    (subject.floorNum - comp.floorNum) * 0.004 +
    (subject.rooms - comp.rooms) * 0.01 +
    ((subject.areaSqm - comp.areaSqm) / 100) * 0.02

  const boundedAdjustment = clamp(adjustmentPct, -0.2, 0.2)
  const adjustedPriceNis = Math.round(comp.priceNis * (1 + boundedAdjustment))

  return {
    id: comp.id,
    score: clamp(score, 0, 1),
    geoSimilarity,
    areaSimilarity,
    floorSimilarity,
    roomSimilarity,
    buildingSimilarity,
    adjustedPriceNis,
    pricePerSqm: comp.areaSqm > 0 ? comp.priceNis / comp.areaSqm : 0,
  }
}

export function rankComparables(subject: SubjectFeatures, comps: ComparableFeatures[], topK: number): ScoredComparable[] {
  return comps
    .map((comp) => scoreComparable(subject, comp))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, topK))
}

export function filterPriceOutliersByIqr(scored: ScoredComparable[]): {
  kept: ScoredComparable[]
  outliers: ScoredComparable[]
} {
  const prices = scored
    .map((s) => s.pricePerSqm)
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b)

  if (prices.length < 5) {
    return { kept: scored, outliers: [] }
  }

  const q1 = percentile(prices, 0.25)
  const q3 = percentile(prices, 0.75)
  const iqr = q3 - q1

  const min = q1 - 1.5 * iqr
  const max = q3 + 1.5 * iqr

  const kept = scored.filter((s) => s.pricePerSqm >= min && s.pricePerSqm <= max)
  const outliers = scored.filter((s) => s.pricePerSqm < min || s.pricePerSqm > max)
  return { kept, outliers }
}

export function calculateValuationRange(scored: ScoredComparable[]): ValuationSummary {
  const { kept, outliers } = filterPriceOutliersByIqr(scored)
  const pool = kept.length ? kept : scored

  if (!pool.length) {
    return {
      low: 0,
      mid: 0,
      high: 0,
      comparablesUsed: 0,
      outlierIds: [],
    }
  }

  const weights = pool.map((x) => x.score)
  const weightedMid = weightedMean(pool.map((x) => x.adjustedPriceNis), weights)
  const dispersion = stddev(pool.map((x) => x.adjustedPriceNis)) / Math.max(1, weightedMid)
  const spread = clamp(0.06 + dispersion, 0.08, 0.18)

  return {
    low: Math.round(weightedMid * (1 - spread)),
    mid: Math.round(weightedMid),
    high: Math.round(weightedMid * (1 + spread)),
    comparablesUsed: pool.length,
    outlierIds: outliers.map((x) => x.id),
  }
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const idx = (values.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return values[lo]
  const w = idx - lo
  return values[lo] * (1 - w) + values[hi] * w
}

function weightedMean(values: number[], weights: number[]): number {
  if (!values.length) return 0
  let sum = 0
  let wSum = 0
  for (let i = 0; i < values.length; i++) {
    const w = Math.max(0.0001, weights[i] ?? 0.0001)
    sum += values[i] * w
    wSum += w
  }
  return wSum ? sum / wSum : 0
}

function stddev(values: number[]): number {
  if (values.length <= 1) return 0
  const m = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((acc, x) => acc + (x - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
