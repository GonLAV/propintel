import {
  dedupeFingerprint,
  normalizeIsraeliAddress,
  type NormalizedAddressResult,
} from '@/lib/israeliAddressNormalization'

export interface RawTransactionRecord {
  source: string
  sourceRecordId: string
  address: string
  city?: string
  transactionDate: string
  priceNis: number
  areaSqm?: number
  floorNum?: number
  rooms?: number
  lat?: number
  lon?: number
}

export interface CleanedTransactionRecord extends RawTransactionRecord {
  normalizedAddress: NormalizedAddressResult
  completenessScore: number
  dedupeKey: string
  confidenceScore: number
}

export interface IngestionResult {
  cleaned: CleanedTransactionRecord[]
  duplicates: CleanedTransactionRecord[]
  errors: Array<{ index: number; reason: string }>
}

export function runMvpIngestionPipeline(rawRows: RawTransactionRecord[]): IngestionResult {
  const cleaned: CleanedTransactionRecord[] = []
  const duplicates: CleanedTransactionRecord[] = []
  const errors: Array<{ index: number; reason: string }> = []

  const dedupeSet = new Set<string>()

  rawRows.forEach((row, index) => {
    const validation = validateRawTransaction(row)
    if (validation !== 'ok') {
      errors.push({ index, reason: validation })
      return
    }

    const normalizedAddress = normalizeIsraeliAddress(row.address)
    const completenessScore = computeCompletenessScore(row)
    const confidenceScore = computeConfidenceScore({
      sourceReliability: sourceReliability(row.source),
      recencyScore: recencyScore(row.transactionDate),
      addressMatchQuality: normalizedAddress.confidence,
      completenessScore,
      outlierRisk: 0.5,
    })

    const dedupeKey = dedupeFingerprint({
      normalizedAddress: normalizedAddress.normalized,
      city: row.city ?? normalizedAddress.city,
      lat: row.lat,
      lon: row.lon,
      areaSqm: row.areaSqm,
    })

    const cleanedRow: CleanedTransactionRecord = {
      ...row,
      normalizedAddress,
      completenessScore,
      dedupeKey,
      confidenceScore,
    }

    if (dedupeSet.has(dedupeKey)) {
      duplicates.push(cleanedRow)
      return
    }

    dedupeSet.add(dedupeKey)
    cleaned.push(cleanedRow)
  })

  return {
    cleaned,
    duplicates,
    errors,
  }
}

export function computeConfidenceScore(input: {
  sourceReliability: number
  recencyScore: number
  addressMatchQuality: number
  completenessScore: number
  outlierRisk: number
}): number {
  const score =
    0.35 * input.sourceReliability +
    0.25 * input.recencyScore +
    0.25 * input.addressMatchQuality +
    0.15 * input.completenessScore -
    0.1 * input.outlierRisk

  return clamp(score, 0, 1)
}

function validateRawTransaction(row: RawTransactionRecord): 'ok' | string {
  if (!row.source) return 'missing source'
  if (!row.sourceRecordId) return 'missing sourceRecordId'
  if (!row.address) return 'missing address'
  if (!row.transactionDate) return 'missing transactionDate'
  if (!Number.isFinite(row.priceNis) || row.priceNis <= 0) return 'invalid price'
  return 'ok'
}

function computeCompletenessScore(row: RawTransactionRecord): number {
  let score = 0.4 // base: required fields
  if (row.areaSqm != null) score += 0.2
  if (row.floorNum != null) score += 0.1
  if (row.rooms != null) score += 0.1
  if (row.lat != null && row.lon != null) score += 0.2
  return clamp(score, 0, 1)
}

function recencyScore(dateStr: string): number {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 0

  const now = new Date()
  const months = Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth())
  return clamp(1 - months / 48, 0, 1)
}

function sourceReliability(source: string): number {
  const key = source.trim().toLowerCase()
  if (key.includes('tax') || key.includes('gov') || key.includes('official')) return 0.95
  if (key.includes('listing') || key.includes('marketplace')) return 0.65
  return 0.75
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
