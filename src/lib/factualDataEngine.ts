export type SourceCredibility = 'official' | 'government' | 'municipality' | 'registry' | 'vendor' | 'user' | 'unknown'

export interface SourceMeta {
  source: string
  credibility?: SourceCredibility
  updatedAt?: string
  notes?: string
}

export interface PropertyFact {
  address?: {
    city?: string
    street?: string
    houseNumber?: string
    postalCode?: string
    neighborhood?: string
  }
  builtArea?: number
  totalArea?: number
  floor?: number
  totalFloors?: number
  buildYear?: number
  amenities?: string[]
  source?: SourceMeta
}

export interface TransactionFact {
  id: string
  price: number
  date: string
  area?: number
  address?: {
    city?: string
    street?: string
    houseNumber?: string
  }
  dealNature?: string
  assetType?: string
  source?: SourceMeta
}

export interface PlanningFact {
  planId?: string
  planName?: string
  landUse?: string
  rightsDescription?: string
  buildRatio?: number
  notes?: string
  source?: SourceMeta
}

export interface DataLayerInput {
  property?: PropertyFact
  transactions?: TransactionFact[]
  planning?: PlanningFact[]
  sourceMeta?: SourceMeta
}

export interface FactualDataResult {
  property_summary: Record<string, unknown> | null
  transactions_used: Array<Record<string, unknown>>
  outliers_detected: Array<Record<string, unknown>>
  missing_data: string[]
  data_reliability_score: number
  notes_for_appraiser: string
}

function scoreCompleteness(fields: Array<string | number | undefined | null>): number {
  const total = fields.length
  if (!total) return 0
  const present = fields.filter((v) => v !== undefined && v !== null && v !== '').length
  return Math.round((present / total) * 100)
}

function scoreSource(cred?: SourceCredibility): number {
  switch (cred) {
    case 'official':
    case 'registry':
      return 100
    case 'government':
    case 'municipality':
      return 95
    case 'vendor':
      return 75
    case 'user':
      return 50
    default:
      return 60
  }
}

function scoreRecency(dateIso?: string): number {
  if (!dateIso) return 50
  const dt = new Date(dateIso).getTime()
  if (Number.isNaN(dt)) return 50
  const days = (Date.now() - dt) / (1000 * 60 * 60 * 24)
  if (days <= 90) return 100
  if (days <= 180) return 90
  if (days <= 365) return 75
  if (days <= 730) return 60
  return 40
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function pricePerSqm(tx: TransactionFact): number | null {
  if (!tx.area || tx.area <= 0) return null
  return tx.price / tx.area
}

function median(values: number[]): number {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2
  return sorted[mid]
}

function detectTransactionOutliers(transactions: TransactionFact[]): { filtered: TransactionFact[]; outliers: TransactionFact[]; deviation: Map<string, number> } {
  if (!transactions.length) return { filtered: [], outliers: [], deviation: new Map() }
  const ppsValues = transactions
    .map((t) => pricePerSqm(t))
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const center = median(ppsValues)
  const outliers: TransactionFact[] = []
  const filtered: TransactionFact[] = []
  const deviation = new Map<string, number>()

  for (const tx of transactions) {
    const pps = pricePerSqm(tx)
    if (!pps || !Number.isFinite(center)) {
      filtered.push(tx)
      continue
    }
    const devPct = Math.abs(pps - center) / center
    deviation.set(tx.id, devPct)
    if (devPct > 0.4) {
      outliers.push(tx)
    } else {
      filtered.push(tx)
    }
  }
  return { filtered, outliers, deviation }
}

function reliabilityScore(params: {
  completeness: number
  source: number
  recency: number
  consistency?: number
}): number {
  const { completeness, source, recency, consistency = 70 } = params
  const score =
    completeness * 0.35 +
    source * 0.3 +
    recency * 0.2 +
    consistency * 0.15
  return Math.round(clamp(score, 0, 100))
}

function summarizeProperty(property?: PropertyFact) {
  if (!property) return null
  return {
    address: property.address || null,
    builtArea: property.builtArea ?? null,
    totalArea: property.totalArea ?? null,
    floor: property.floor ?? null,
    totalFloors: property.totalFloors ?? null,
    buildYear: property.buildYear ?? null,
    amenities: property.amenities || [],
    source: property.source || null
  }
}

function buildMissing(property?: PropertyFact, transactions?: TransactionFact[], planning?: PlanningFact[]): string[] {
  const missing: string[] = []
  if (!property) {
    missing.push('Missing property details')
  } else {
    if (!property.address?.city || !property.address?.street) missing.push('Property address incomplete')
    if (!property.builtArea && !property.totalArea) missing.push('Property area missing')
  }
  if (!transactions || !transactions.length) missing.push('No transaction records')
  if (!planning || !planning.length) missing.push('No planning/zoning records')
  return missing
}

function normalizeTransactions(transactions: TransactionFact[], deviation: Map<string, number>) {
  return transactions.map((tx) => {
    const completeness = scoreCompleteness([
      tx.price,
      tx.date,
      tx.area,
      tx.address?.city,
      tx.address?.street
    ])
    const source = scoreSource(tx.source?.credibility)
    const recency = scoreRecency(tx.date)
    const pps = pricePerSqm(tx)
    const devPct = deviation.get(tx.id)
    const consistency = devPct !== undefined && devPct !== null ? clamp(100 - devPct * 100, 0, 100) : 70
    const reliability = reliabilityScore({ completeness, source, recency, consistency })

    return {
      id: tx.id,
      price: tx.price,
      pricePerSqm: pps,
      date: tx.date,
      area: tx.area ?? null,
      address: tx.address || null,
      dealNature: tx.dealNature || null,
      assetType: tx.assetType || null,
      source: tx.source || null,
      reliability
    }
  })
}

export function buildFactualDataLayer(input: DataLayerInput): FactualDataResult {
  const property = summarizeProperty(input.property)
  const missing = buildMissing(input.property, input.transactions, input.planning)

  const { filtered, outliers, deviation } = detectTransactionOutliers(input.transactions || [])
  const transactions_used = normalizeTransactions(filtered, deviation)
  const outliers_detected = normalizeTransactions(outliers, deviation)

  const propertyCompleteness = scoreCompleteness([
    input.property?.address?.city,
    input.property?.address?.street,
    input.property?.builtArea,
    input.property?.totalArea,
    input.property?.floor,
    input.property?.buildYear
  ])
  const propertySourceScore = scoreSource(input.property?.source?.credibility)
  const propertyRecency = scoreRecency(input.property?.source?.updatedAt)
  const propertyReliability = reliabilityScore({
    completeness: propertyCompleteness,
    source: propertySourceScore,
    recency: propertyRecency,
    consistency: 80
  })

  const transactionScores = transactions_used.map((t) => t.reliability)
  const avgTxScore = transactionScores.length ? Math.round(transactionScores.reduce((a, b) => a + b, 0) / transactionScores.length) : 0

  const data_reliability_score = Math.round(
    clamp(propertyReliability * 0.45 + avgTxScore * 0.45 + (missing.length ? 50 : 80) * 0.1, 0, 100)
  )

  const notes: string[] = []
  if (missing.length) notes.push('Data is incomplete; verify missing items before use.')
  if (outliers_detected.length) notes.push('Outliers removed from main set; review manually if relevant.')
  notes.push('No valuation or price opinion generated; factual data only.')

  return {
    property_summary: property,
    transactions_used,
    outliers_detected,
    missing_data: missing,
    data_reliability_score,
    notes_for_appraiser: notes.join(' ')
  }
}
