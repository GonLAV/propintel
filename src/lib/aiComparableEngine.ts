import { z } from 'zod'

export type PropertyTypeIL =
  | 'apartment'
  | 'penthouse'
  | 'garden-apartment'
  | 'duplex'
  | 'house'
  | 'commercial'

export type RenovationState = 'new' | 'renovated' | 'partial' | 'needs-renovation'

export interface PropertyFeaturePayload {
  id: string
  address: string
  city: string
  neighborhood?: string
  lat: number
  lng: number
  propertyType: PropertyTypeIL
  sizeSqm: number
  floor: number
  totalFloors?: number
  buildingAge: number
  conditionScore: number // 1-10
  hasElevator: boolean
  hasParking: boolean
  hasBalcony: boolean
  hasView: boolean
  noiseLevel: number // 1-10 (10 = noisy)
  renovationState: RenovationState
  planningPotentialScore: number // 0-10
  saleDate: string
  salePrice: number
}

export type SubjectPropertyInput = Omit<PropertyFeaturePayload, 'saleDate' | 'salePrice'>

export interface SimilarityResult {
  comparable: PropertyFeaturePayload
  similarity: number
  distanceMeters: number
  explanation: string[]
}

export interface AdjustmentBreakdown {
  floor: number
  elevator: number
  renovation: number
  balcony: number
  parking: number
  view: number
  noise: number
  size: number
  planningPotential: number
  mlResidual: number
  totalPercent: number
  adjustedPrice: number
}

export interface ComparableWithAdjustment extends SimilarityResult {
  adjustment: AdjustmentBreakdown
  weight: number
}

export interface ValuationRange {
  low: number
  mid: number
  high: number
}

export interface ValuationOutput {
  strategy: 'mean' | 'weighted-mean' | 'hedonic'
  range: ValuationRange
  confidenceScore: number
  comparablesUsed: number
  rejectedOutliers: string[]
  rationale: string[]
}

export interface ManualOverrideEvent {
  comparableId: string
  field: keyof AdjustmentBreakdown
  oldValue: number
  newValue: number
  reason: string
  appraiserId: string
  timestamp: string
}

export interface ComparableSearchRequest {
  subject: SubjectPropertyInput
  comparablesPool: PropertyFeaturePayload[]
  topK?: number
}

export interface MLAdjustmentWeights {
  floor: number
  elevator: number
  renovation: number
  balcony: number
  parking: number
  view: number
  noise: number
  size: number
  planningPotential: number
  intercept: number
}

export const comparableSearchRequestSchema = z.object({
  subject: z.object({
    id: z.string(),
    address: z.string(),
    city: z.string(),
    neighborhood: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
    propertyType: z.enum(['apartment', 'penthouse', 'garden-apartment', 'duplex', 'house', 'commercial']),
    sizeSqm: z.number().positive(),
    floor: z.number(),
    totalFloors: z.number().optional(),
    buildingAge: z.number().min(0),
    conditionScore: z.number().min(1).max(10),
    hasElevator: z.boolean(),
    hasParking: z.boolean(),
    hasBalcony: z.boolean(),
    hasView: z.boolean(),
    noiseLevel: z.number().min(1).max(10),
    renovationState: z.enum(['new', 'renovated', 'partial', 'needs-renovation']),
    planningPotentialScore: z.number().min(0).max(10),
  }),
  comparablesPool: z.array(z.any()),
  topK: z.number().int().positive().optional(),
})

const EARTH_RADIUS_M = 6_371_000

const renovationEmbedding: Record<RenovationState, number> = {
  new: 1,
  renovated: 0.8,
  partial: 0.45,
  'needs-renovation': 0.1,
}

const propertyTypeEmbedding: Record<PropertyTypeIL, number> = {
  apartment: 0.2,
  penthouse: 0.9,
  'garden-apartment': 0.75,
  duplex: 0.65,
  house: 1,
  commercial: 0,
}

const defaultMLWeights: MLAdjustmentWeights = {
  floor: 0.004,
  elevator: 0.025,
  renovation: 0.03,
  balcony: 0.012,
  parking: 0.03,
  view: 0.018,
  noise: -0.01,
  size: -0.002,
  planningPotential: 0.015,
  intercept: 0,
}

export function normalizeIsraeliAddress(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/רח\.?\s*/g, 'רחוב ')
    .replace(/שד\.?\s*/g, 'שדרות ')
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
}

export function duplicateFingerprint(input: PropertyFeaturePayload): string {
  return [
    normalizeIsraeliAddress(input.address),
    input.city.trim().toLowerCase(),
    Math.round(input.lat * 10_000),
    Math.round(input.lng * 10_000),
    new Date(input.saleDate).toISOString().slice(0, 10),
    Math.round(input.salePrice / 1_000),
    Math.round(input.sizeSqm),
  ].join('|')
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = degToRad(bLat - aLat)
  const dLng = degToRad(bLng - aLng)
  const lat1 = degToRad(aLat)
  const lat2 = degToRad(bLat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function toFeatureVector(input: SubjectPropertyInput | PropertyFeaturePayload): number[] {
  return [
    input.lat,
    input.lng,
    propertyTypeEmbedding[input.propertyType],
    normalized(input.sizeSqm, 20, 300),
    normalized(input.floor, -1, 60),
    normalized(input.buildingAge, 0, 120),
    normalized(input.conditionScore, 1, 10),
    as01(input.hasElevator),
    as01(input.hasParking),
    as01(input.hasBalcony),
    as01(input.hasView),
    normalized(input.noiseLevel, 1, 10),
    renovationEmbedding[input.renovationState],
    normalized(input.planningPotentialScore, 0, 10),
  ]
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] ** 2
    normB += b[i] ** 2
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function searchTopComparables(request: ComparableSearchRequest): SimilarityResult[] {
  comparableSearchRequestSchema.parse(request)

  const topK = request.topK ?? 25
  const subjectVector = toFeatureVector(request.subject)

  return request.comparablesPool
    .map((comparable) => {
      const distanceMeters = haversineMeters(
        request.subject.lat,
        request.subject.lng,
        comparable.lat,
        comparable.lng,
      )

      const typePenalty = comparable.propertyType === request.subject.propertyType ? 0 : 0.12
      const similarity = Math.max(
        0,
        cosineSimilarity(subjectVector, toFeatureVector(comparable)) - typePenalty,
      )

      return {
        comparable,
        similarity,
        distanceMeters,
        explanation: explainSimilarity(request.subject, comparable, similarity, distanceMeters),
      }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}

export function applyAdjustments(
  subject: SubjectPropertyInput,
  candidate: SimilarityResult,
  mlWeights: MLAdjustmentWeights = defaultMLWeights,
): ComparableWithAdjustment {
  const c = candidate.comparable

  const floor = clampPercent((subject.floor - c.floor) * 0.004, -0.08, 0.08)
  const elevator = subject.hasElevator === c.hasElevator ? 0 : subject.hasElevator ? 0.025 : -0.025
  const renovation = clampPercent(
    (renovationEmbedding[subject.renovationState] - renovationEmbedding[c.renovationState]) * 0.07,
    -0.12,
    0.12,
  )
  const balcony = subject.hasBalcony === c.hasBalcony ? 0 : subject.hasBalcony ? 0.012 : -0.012
  const parking = subject.hasParking === c.hasParking ? 0 : subject.hasParking ? 0.03 : -0.03
  const view = subject.hasView === c.hasView ? 0 : subject.hasView ? 0.018 : -0.018
  const noise = clampPercent((c.noiseLevel - subject.noiseLevel) * 0.01, -0.05, 0.05)
  const size = clampPercent((subject.sizeSqm - c.sizeSqm) / 100 * 0.02, -0.08, 0.08)
  const planningPotential = clampPercent((subject.planningPotentialScore - c.planningPotentialScore) * 0.01, -0.06, 0.06)

  const mlResidual =
    mlWeights.intercept +
    mlWeights.floor * (subject.floor - c.floor) +
    mlWeights.elevator * boolDiff(subject.hasElevator, c.hasElevator) +
    mlWeights.renovation * (renovationEmbedding[subject.renovationState] - renovationEmbedding[c.renovationState]) +
    mlWeights.balcony * boolDiff(subject.hasBalcony, c.hasBalcony) +
    mlWeights.parking * boolDiff(subject.hasParking, c.hasParking) +
    mlWeights.view * boolDiff(subject.hasView, c.hasView) +
    mlWeights.noise * (subject.noiseLevel - c.noiseLevel) +
    mlWeights.size * (subject.sizeSqm - c.sizeSqm) +
    mlWeights.planningPotential * (subject.planningPotentialScore - c.planningPotentialScore)

  const totalPercent = clampPercent(
    floor + elevator + renovation + balcony + parking + view + noise + size + planningPotential + mlResidual,
    -0.25,
    0.25,
  )

  const adjustedPrice = Math.round(c.salePrice * (1 + totalPercent))

  return {
    ...candidate,
    adjustment: {
      floor,
      elevator,
      renovation,
      balcony,
      parking,
      view,
      noise,
      size,
      planningPotential,
      mlResidual,
      totalPercent,
      adjustedPrice,
    },
    weight: calculateComparableWeight(candidate.similarity, candidate.distanceMeters, c.saleDate),
  }
}

export function removePriceOutliers(items: ComparableWithAdjustment[]): {
  filtered: ComparableWithAdjustment[]
  rejectedIds: string[]
} {
  if (items.length < 4) return { filtered: items, rejectedIds: [] }

  const values = items.map((x) => x.adjustment.adjustedPrice).sort((a, b) => a - b)
  const q1 = percentile(values, 0.25)
  const q3 = percentile(values, 0.75)
  const iqr = q3 - q1
  const minAllowed = q1 - 1.5 * iqr
  const maxAllowed = q3 + 1.5 * iqr

  const filtered = items.filter((x) => x.adjustment.adjustedPrice >= minAllowed && x.adjustment.adjustedPrice <= maxAllowed)
  const rejectedIds = items
    .filter((x) => x.adjustment.adjustedPrice < minAllowed || x.adjustment.adjustedPrice > maxAllowed)
    .map((x) => x.comparable.id)

  return { filtered, rejectedIds }
}

export function valuateFromComparables(
  adjustedComparables: ComparableWithAdjustment[],
  strategy: ValuationOutput['strategy'],
): ValuationOutput {
  const { filtered, rejectedIds } = removePriceOutliers(adjustedComparables)
  const prices = filtered.map((x) => x.adjustment.adjustedPrice)

  if (prices.length === 0) {
    return {
      strategy,
      range: { low: 0, mid: 0, high: 0 },
      confidenceScore: 0,
      comparablesUsed: 0,
      rejectedOutliers: rejectedIds,
      rationale: ['No valid comparables after outlier removal'],
    }
  }

  const mid =
    strategy === 'mean'
      ? Math.round(mean(prices))
      : strategy === 'weighted-mean'
        ? Math.round(weightedMean(filtered.map((x) => x.adjustment.adjustedPrice), filtered.map((x) => x.weight)))
        : Math.round(hedonicLikeEstimate(filtered))

  const dispersion = stddev(prices) / Math.max(1, mid)
  const baseSpread = clamp(0.04 + dispersion, 0.05, 0.18)

  const range = {
    low: Math.round(mid * (1 - baseSpread)),
    mid,
    high: Math.round(mid * (1 + baseSpread)),
  }

  const confidenceScore = computeConfidenceScore(filtered, dispersion)

  return {
    strategy,
    range,
    confidenceScore,
    comparablesUsed: filtered.length,
    rejectedOutliers: rejectedIds,
    rationale: [
      `${filtered.length} comparables used after outlier filtering`,
      `Dispersion=${(dispersion * 100).toFixed(1)}%`,
      `Strategy=${strategy}`,
      'Final value is a range (court-safe) and not a single point estimate',
    ],
  }
}

export function applyManualOverride(
  comparable: ComparableWithAdjustment,
  patch: Partial<AdjustmentBreakdown>,
  appraiserId: string,
  reason: string,
): { updated: ComparableWithAdjustment; auditTrail: ManualOverrideEvent[] } {
  const next: AdjustmentBreakdown = {
    ...comparable.adjustment,
    ...patch,
  }

  next.totalPercent = clampPercent(
    next.floor +
      next.elevator +
      next.renovation +
      next.balcony +
      next.parking +
      next.view +
      next.noise +
      next.size +
      next.planningPotential +
      next.mlResidual,
    -0.25,
    0.25,
  )
  next.adjustedPrice = Math.round(comparable.comparable.salePrice * (1 + next.totalPercent))

  const events: ManualOverrideEvent[] = Object.entries(patch).flatMap(([field, value]) => {
    const key = field as keyof AdjustmentBreakdown
    if (typeof value !== 'number') return []

    return [{
      comparableId: comparable.comparable.id,
      field: key,
      oldValue: comparable.adjustment[key] as number,
      newValue: value,
      reason,
      appraiserId,
      timestamp: new Date().toISOString(),
    }]
  })

  return {
    updated: {
      ...comparable,
      adjustment: next,
    },
    auditTrail: events,
  }
}

function explainSimilarity(
  subject: SubjectPropertyInput,
  comparable: PropertyFeaturePayload,
  similarity: number,
  distanceMeters: number,
): string[] {
  const reasons: string[] = []
  if (distanceMeters <= 700) reasons.push('Very close geo-location')
  if (comparable.propertyType === subject.propertyType) reasons.push('Same property type')
  if (Math.abs(comparable.sizeSqm - subject.sizeSqm) <= 15) reasons.push('Similar built area')
  if (Math.abs(comparable.floor - subject.floor) <= 2) reasons.push('Similar floor level')
  if (Math.abs(comparable.conditionScore - subject.conditionScore) <= 2) reasons.push('Condition profile is close')
  reasons.push(`Similarity score=${(similarity * 100).toFixed(1)}%`)
  return reasons
}

function calculateComparableWeight(similarity: number, distanceMeters: number, saleDate: string): number {
  const distancePenalty = clamp(distanceMeters / 4000, 0, 1)
  const months = monthsAgo(saleDate)
  const recencyPenalty = clamp(months / 36, 0, 1)

  const raw = similarity * 0.65 + (1 - distancePenalty) * 0.2 + (1 - recencyPenalty) * 0.15
  return clamp(raw, 0.01, 1)
}

function computeConfidenceScore(items: ComparableWithAdjustment[], dispersion: number): number {
  const nFactor = clamp(items.length / 12, 0, 1)
  const simFactor = mean(items.map((x) => x.similarity))
  const recencyFactor = 1 - mean(items.map((x) => clamp(monthsAgo(x.comparable.saleDate) / 36, 0, 1)))
  const dispersionFactor = 1 - clamp(dispersion / 0.2, 0, 1)

  return Math.round((nFactor * 0.25 + simFactor * 0.35 + recencyFactor * 0.2 + dispersionFactor * 0.2) * 100)
}

function hedonicLikeEstimate(items: ComparableWithAdjustment[]): number {
  const values = items.map((x) => x.adjustment.adjustedPrice)
  const median = percentile(values.slice().sort((a, b) => a - b), 0.5)
  const weighted = weightedMean(values, items.map((x) => x.weight))
  return 0.55 * weighted + 0.45 * median
}

function monthsAgo(date: string): number {
  const now = new Date()
  const d = new Date(date)
  const m = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth()
  return Math.max(0, m)
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const index = (values.length - 1) * p
  const lo = Math.floor(index)
  const hi = Math.ceil(index)
  if (lo === hi) return values[lo]
  const w = index - lo
  return values[lo] * (1 - w) + values[hi] * w
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function weightedMean(values: number[], weights: number[]): number {
  if (values.length === 0) return 0
  let sum = 0
  let wSum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * (weights[i] ?? 0)
    wSum += weights[i] ?? 0
  }
  return wSum > 0 ? sum / wSum : mean(values)
}

function stddev(values: number[]): number {
  if (values.length <= 1) return 0
  const m = mean(values)
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function as01(x: boolean): number {
  return x ? 1 : 0
}

function boolDiff(a: boolean, b: boolean): number {
  return a === b ? 0 : a ? 1 : -1
}

function normalized(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return clamp((value - min) / (max - min), 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampPercent(value: number, min: number, max: number): number {
  return clamp(value, min, max)
}

function degToRad(deg: number): number {
  return deg * Math.PI / 180
}
