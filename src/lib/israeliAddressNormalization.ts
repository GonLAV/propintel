export interface ParsedIsraeliAddress {
  city: string | null
  street: string | null
  houseNumber: string | null
  entrance: string | null
  apartment: string | null
}

export interface NormalizedAddressResult extends ParsedIsraeliAddress {
  raw: string
  cleaned: string
  normalized: string
  canonicalStreet: string | null
  confidence: number
}

const abbreviations: Array<[RegExp, string]> = [
  [/\bרח\.?\s*/gi, 'רחוב '],
  [/\bשד\.?\s*/gi, 'שדרות '],
  [/\bככר\b/gi, 'כיכר'],
  [/\bתא\b/gi, 'תל אביב'],
  [/\bת"א\b/gi, 'תל אביב'],
]

const removableTokens = [
  /\bדירה\s*\d+[א-ת]?/gi,
  /\bקומה\s*\d+[א-ת]?/gi,
  /\bכניסה\s*[א-ת\d]+/gi,
  /\bמס\.?\s*דירה\s*\d+/gi,
]

const streetAliases: Record<string, string[]> = {
  ויצמן: ['וייצמן', 'ויצמן'],
  הרצל: ['הרצל', 'הרצל׳', 'הרצל\''],
  'בן גוריון': ['בן-גוריון', 'בן גוריון', 'בןגוריון'],
}

export function normalizeIsraeliAddress(raw: string): NormalizedAddressResult {
  const original = String(raw || '').trim()
  let cleaned = original

  for (const [pattern, replacement] of abbreviations) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  for (const token of removableTokens) {
    cleaned = cleaned.replace(token, ' ')
  }

  cleaned = cleaned
    .replace(/["'׳`]/g, '')
    .replace(/[\u200E\u200F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const parsed = parseAddressParts(cleaned)
  const canonicalStreet = canonicalizeStreet(parsed.street)

  const normalized = [
    parsed.city,
    canonicalStreet,
    parsed.houseNumber,
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()

  const confidence = estimateAddressConfidence({
    hasCity: Boolean(parsed.city),
    hasStreet: Boolean(parsed.street),
    hasHouseNumber: Boolean(parsed.houseNumber),
    cleaned,
    normalized,
  })

  return {
    raw: original,
    cleaned,
    normalized,
    canonicalStreet,
    confidence,
    ...parsed,
  }
}

export function parseAddressParts(input: string): ParsedIsraeliAddress {
  const text = String(input || '').trim()

  const houseMatch = text.match(/(\d{1,5}[א-תA-Za-z]?)/)
  const houseNumber = houseMatch?.[1] ?? null

  const city = extractCity(text)

  let street = text
  if (city) {
    street = street.replace(new RegExp(`\\b${escapeRegExp(city)}\\b`, 'gi'), '').trim()
  }
  if (houseNumber) {
    street = street.replace(houseNumber, '').trim()
  }

  street = street
    .replace(/^רחוב\s+/i, '')
    .replace(/^שדרות\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  const entranceMatch = text.match(/כניסה\s*([א-ת\d]+)/i)
  const apartmentMatch = text.match(/(?:דירה|דיר)\s*(\d+[א-ת]?)/i)

  return {
    city,
    street: street || null,
    houseNumber,
    entrance: entranceMatch?.[1] ?? null,
    apartment: apartmentMatch?.[1] ?? null,
  }
}

export function fuzzyAddressScore(a: string, b: string): number {
  const x = normalizeIsraeliAddress(a).normalized
  const y = normalizeIsraeliAddress(b).normalized
  if (!x || !y) return 0

  const lev = levenshtein(x, y)
  const maxLen = Math.max(x.length, y.length)
  const levScore = maxLen ? 1 - lev / maxLen : 0

  const triScore = trigramSimilarity(x, y)
  return clamp(0.6 * levScore + 0.4 * triScore, 0, 1)
}

export function dedupeFingerprint(input: {
  normalizedAddress: string
  city: string | null
  lat?: number | null
  lon?: number | null
  areaSqm?: number | null
}): string {
  const latBin = input.lat == null ? 'na' : String(Math.round(input.lat * 1000))
  const lonBin = input.lon == null ? 'na' : String(Math.round(input.lon * 1000))
  const areaBin = input.areaSqm == null ? 'na' : String(Math.round(input.areaSqm / 5) * 5)

  return [
    input.normalizedAddress.trim().toLowerCase(),
    (input.city ?? '').trim().toLowerCase(),
    latBin,
    lonBin,
    areaBin,
  ].join('|')
}

function canonicalizeStreet(street: string | null): string | null {
  if (!street) return null
  const normalized = street.trim().replace(/\s+/g, ' ').toLowerCase()

  for (const [canonical, aliases] of Object.entries(streetAliases)) {
    if (aliases.some((alias) => normalized === alias.toLowerCase())) {
      return canonical
    }
  }

  return street
}

function extractCity(text: string): string | null {
  const knownCities = [
    'תל אביב',
    'תל אביב-יפו',
    'ירושלים',
    'חיפה',
    'ראשון לציון',
    'פתח תקווה',
    'נתניה',
    'באר שבע',
  ]

  const found = knownCities.find((city) => text.includes(city))
  return found ?? null
}

function estimateAddressConfidence(input: {
  hasCity: boolean
  hasStreet: boolean
  hasHouseNumber: boolean
  cleaned: string
  normalized: string
}): number {
  let score = 0
  if (input.hasCity) score += 0.35
  if (input.hasStreet) score += 0.35
  if (input.hasHouseNumber) score += 0.2

  if (input.cleaned.length >= 10) score += 0.05
  if (input.normalized.includes('|')) score += 0.05

  return clamp(score, 0, 1)
}

function trigramSimilarity(a: string, b: string): number {
  const setA = trigrams(a)
  const setB = trigrams(b)
  if (setA.size === 0 || setB.size === 0) return 0

  let intersect = 0
  for (const token of setA) {
    if (setB.has(token)) intersect += 1
  }

  return (2 * intersect) / (setA.size + setB.size)
}

function trigrams(text: string): Set<string> {
  const padded = `  ${text}  `
  const out = new Set<string>()

  for (let i = 0; i < padded.length - 2; i++) {
    out.add(padded.slice(i, i + 3))
  }

  return out
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))

  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }

  return dp[a.length][b.length]
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
