import crypto from 'node:crypto'

export function runMvpIngestionPipeline(records, kind = 'transaction') {
  const cleaned = []
  const duplicates = []
  const errors = []
  const seen = new Set()

  records.forEach((record, index) => {
    const err = validateRecord(record, kind)
    if (err) {
      errors.push({ index, reason: err })
      return
    }

    const normalizedAddress = normalizeIsraeliAddress(record.address)
    const completeness = completenessScore(record, kind)
    const sourceScore = sourceReliability(record.source)
    const recency = recencyScore(kind === 'transaction' ? record.transactionDate : record.listingDate)
    const confidence = clamp(
      0.35 * sourceScore + 0.25 * recency + 0.25 * normalizedAddress.confidence + 0.15 * completeness,
      0,
      1,
    )

    const dedupeKey = makeDedupeKey({
      normalizedAddress: normalizedAddress.normalized,
      city: record.city ?? normalizedAddress.city,
      lat: record.lat,
      lon: record.lon,
      area: record.area,
      eventDate: kind === 'transaction' ? record.transactionDate : record.listingDate,
      eventPrice: record.price,
    })

    const row = {
      id: `${kind}_${crypto.randomUUID()}`,
      ...record,
      normalizedAddress,
      completenessScore: completeness,
      confidenceScore: confidence,
      dedupeKey,
      kind,
    }

    if (seen.has(dedupeKey)) {
      duplicates.push(row)
    } else {
      seen.add(dedupeKey)
      cleaned.push(row)
    }
  })

  return {
    kind,
    total: records.length,
    cleaned,
    duplicates,
    errors,
    stats: {
      cleanCount: cleaned.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      avgConfidence: cleaned.length
        ? cleaned.reduce((acc, r) => acc + r.confidenceScore, 0) / cleaned.length
        : 0,
    },
  }
}

function validateRecord(record, kind) {
  if (!record || typeof record !== 'object') return 'record must be an object'
  if (!record.source) return 'missing source'
  if (!record.sourceRecordId) return 'missing sourceRecordId'
  if (!record.address) return 'missing address'
  if (!Number.isFinite(Number(record.price)) || Number(record.price) <= 0) return 'invalid price'
  if (kind === 'transaction' && !record.transactionDate) return 'missing transactionDate'
  if (kind === 'listing' && !record.listingDate) return 'missing listingDate'
  return null
}

function normalizeIsraeliAddress(raw) {
  let cleaned = String(raw || '').trim()
    .replace(/\bרח\.?\s*/gi, 'רחוב ')
    .replace(/\bשד\.?\s*/gi, 'שדרות ')
    .replace(/["'׳`]/g, '')
    .replace(/[\u200E\u200F]/g, '')

  cleaned = cleaned
    .replace(/\bדירה\s*\d+[א-ת]?/gi, ' ')
    .replace(/\bקומה\s*\d+[א-ת]?/gi, ' ')
    .replace(/\bכניסה\s*[א-ת\d]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const houseMatch = cleaned.match(/(\d{1,5}[א-תA-Za-z]?)/)
  const houseNumber = houseMatch?.[1] ?? null

  const city = extractCity(cleaned)
  let street = cleaned
  if (city) street = street.replace(new RegExp(`\\b${escapeRegExp(city)}\\b`, 'gi'), '').trim()
  if (houseNumber) street = street.replace(houseNumber, '').trim()

  street = street
    .replace(/^רחוב\s+/i, '')
    .replace(/^שדרות\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  const canonicalStreet = canonicalStreetName(street || null)
  const normalized = [city, canonicalStreet, houseNumber]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()

  let confidence = 0
  if (city) confidence += 0.35
  if (canonicalStreet) confidence += 0.35
  if (houseNumber) confidence += 0.2
  if (cleaned.length >= 10) confidence += 0.05
  if (normalized.includes('|')) confidence += 0.05

  return {
    raw,
    cleaned,
    normalized,
    city,
    street: street || null,
    canonicalStreet,
    houseNumber,
    confidence: clamp(confidence, 0, 1),
  }
}

function extractCity(text) {
  const known = [
    'תל אביב',
    'תל אביב-יפו',
    'ירושלים',
    'חיפה',
    'ראשון לציון',
    'פתח תקווה',
    'נתניה',
    'באר שבע',
  ]
  return known.find((city) => text.includes(city)) ?? null
}

function canonicalStreetName(street) {
  if (!street) return null
  const s = street.toLowerCase().replace(/\s+/g, ' ').trim()
  if (['וייצמן', 'ויצמן'].includes(s)) return 'ויצמן'
  if (['בן-גוריון', 'בן גוריון', 'בןגוריון'].includes(s)) return 'בן גוריון'
  if (['הרצל', 'הרצל׳'].includes(s)) return 'הרצל'
  return street
}

function completenessScore(record, kind) {
  let score = 0.4
  if (record.area != null) score += 0.2
  if (record.floor != null) score += 0.1
  if (record.rooms != null) score += 0.1
  if (record.lat != null && record.lon != null) score += 0.2
  if (kind === 'listing' && record.status) score += 0.05
  return clamp(score, 0, 1)
}

function sourceReliability(source) {
  const s = String(source || '').toLowerCase()
  if (s.includes('gov') || s.includes('tax') || s.includes('official')) return 0.95
  if (s.includes('listing') || s.includes('market')) return 0.65
  return 0.75
}

function recencyScore(dateText) {
  const d = new Date(dateText)
  if (Number.isNaN(d.getTime())) return 0
  const now = new Date()
  const months = Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth())
  return clamp(1 - months / 48, 0, 1)
}

function makeDedupeKey(input) {
  const latBin = input.lat == null ? 'na' : Math.round(Number(input.lat) * 1000)
  const lonBin = input.lon == null ? 'na' : Math.round(Number(input.lon) * 1000)
  const areaBin = input.area == null ? 'na' : Math.round(Number(input.area) / 5) * 5
  const priceBin = input.eventPrice == null ? 'na' : Math.round(Number(input.eventPrice) / 1000)
  const day = input.eventDate ? String(input.eventDate).slice(0, 10) : 'na'

  return [
    String(input.normalizedAddress || '').trim().toLowerCase(),
    String(input.city || '').trim().toLowerCase(),
    latBin,
    lonBin,
    areaBin,
    day,
    priceBin,
  ].join('|')
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)))
}
