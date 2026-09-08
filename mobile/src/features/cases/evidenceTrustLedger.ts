import { DiraCase, EvidenceItem } from '@/features/cases/model'

export type EvidenceLedgerEntry = {
  id: string
  label: string
  type: EvidenceItem['type']
  capturedAt: string
  digest: string
  chainProof: string
  trustSignals: string[]
}

export type EvidenceTrustLedger = {
  trustScore: number
  tier: 'verified' | 'review' | 'fragile'
  headline: string
  chainId: string
  entries: EvidenceLedgerEntry[]
  warnings: string[]
  shareText: string
}

export function generateEvidenceTrustLedger(item: DiraCase): EvidenceTrustLedger {
  const entries = buildLedgerEntries(item.evidence)
  const warnings = findLedgerWarnings(item.evidence, entries)
  const trustScore = calculateTrustScore(item.evidence, warnings)
  const tier = trustScore >= 82 ? 'verified' : trustScore >= 58 ? 'review' : 'fragile'
  const chainId = entries.length ? entries[entries.length - 1].chainProof : createLedgerDigest(`${item.id}:empty`)
  const headline = buildHeadline(tier, entries.length)

  return {
    trustScore,
    tier,
    headline,
    chainId,
    entries,
    warnings,
    shareText: buildShareText(item, trustScore, tier, chainId, entries, warnings),
  }
}

function buildLedgerEntries(evidence: EvidenceItem[]): EvidenceLedgerEntry[] {
  const orderedEvidence = [...evidence].sort((first, second) => new Date(first.capturedAt).getTime() - new Date(second.capturedAt).getTime())
  let previousProof = 'ledger-root'

  return orderedEvidence.map((entry, index) => {
    const digest = createLedgerDigest(`${entry.id}:${entry.hash}:${entry.capturedAt}:${entry.label}:${entry.type}`)
    const chainProof = createLedgerDigest(`${previousProof}:${digest}:${index}`)
    previousProof = chainProof

    return {
      id: entry.id,
      label: entry.label,
      type: entry.type,
      capturedAt: entry.capturedAt,
      digest,
      chainProof,
      trustSignals: buildTrustSignals(entry),
    }
  })
}

function calculateTrustScore(evidence: EvidenceItem[], warnings: string[]) {
  if (!evidence.length) return 18

  const shaCount = evidence.filter((entry) => entry.hashAlgorithm === 'sha-256').length
  const richMetadataCount = evidence.filter((entry) => Boolean(entry.sourceUri || entry.mimeType || entry.sizeBytes)).length
  const typeCoverage = new Set(evidence.map((entry) => entry.type)).size

  const base = 35
  const volumeScore = Math.min(evidence.length * 9, 30)
  const shaScore = Math.round((shaCount / evidence.length) * 18)
  const metadataScore = Math.round((richMetadataCount / evidence.length) * 10)
  const coverageScore = typeCoverage >= 3 ? 7 : typeCoverage === 2 ? 4 : 0
  const warningPenalty = warnings.length * 8

  return clamp(base + volumeScore + shaScore + metadataScore + coverageScore - warningPenalty, 10, 100)
}

function findLedgerWarnings(evidence: EvidenceItem[], entries: EvidenceLedgerEntry[]) {
  const warnings: string[] = []

  if (evidence.length < 3) warnings.push('פחות משלוש ראיות מקשה להציג רצף מלא')
  if (!evidence.some((entry) => entry.type === 'photo')) warnings.push('אין צילום שמראה מצב פיזי')
  if (!evidence.some((entry) => entry.type === 'note' || entry.type === 'document')) warnings.push('אין תיעוד כתוב שמסביר את ההקשר')
  if (evidence.some((entry) => entry.hashAlgorithm !== 'sha-256')) warnings.push('חלק מהראיות נוצרו כחתימת דמו מקומית ולא כ-SHA-256')
  if (hasTimeCollision(entries)) warnings.push('יש ראיות עם זמן זהה או קרוב מאוד; כדאי לוודא שהסדר ברור')

  return warnings
}

function buildTrustSignals(entry: EvidenceItem) {
  const signals = ['חותמת זמן']
  if (entry.hashAlgorithm === 'sha-256') signals.push('SHA-256')
  if (entry.mimeType) signals.push(entry.mimeType)
  if (entry.sizeBytes) signals.push(`${Math.round(entry.sizeBytes / 1024)}KB`)
  return signals
}

function hasTimeCollision(entries: EvidenceLedgerEntry[]) {
  return entries.some((entry, index) => {
    const previous = entries[index - 1]
    if (!previous) return false
    const currentTime = new Date(entry.capturedAt).getTime()
    const previousTime = new Date(previous.capturedAt).getTime()
    return Math.abs(currentTime - previousTime) < 1000
  })
}

function buildHeadline(tier: EvidenceTrustLedger['tier'], count: number) {
  if (tier === 'verified') return `שרשרת ראיות חזקה עם ${count} פריטים מסודרים`
  if (tier === 'review') return `שרשרת ראיות שימושית, אבל כדאי לחזק לפני הסלמה`
  return 'שרשרת הראיות עדיין חלשה ודורשת השלמה'
}

function buildShareText(
  item: DiraCase,
  trustScore: number,
  tier: EvidenceTrustLedger['tier'],
  chainId: string,
  entries: EvidenceLedgerEntry[],
  warnings: string[],
) {
  const tierLabel = tier === 'verified' ? 'חזקה' : tier === 'review' ? 'דורשת בדיקה' : 'חלשה'
  const evidenceLines = entries.map((entry, index) => `${index + 1}. ${entry.label} | ${entry.digest} | ${entry.chainProof}`)
  const warningLines = warnings.length ? [`חוסרים: ${warnings.join(' · ')}`] : ['לא זוהו חוסרים מרכזיים בשרשרת המטא-דאטה.']

  return [
    'DiraShield Evidence Trust Ledger',
    `תיק: ${item.title}`,
    `כתובת: ${item.address}`,
    `ציון אמון: ${trustScore}/100 (${tierLabel})`,
    `Chain ID: ${chainId}`,
    '',
    ...evidenceLines,
    '',
    ...warningLines,
    '',
    'הסיכום מבוסס על מטא-דאטה מקומית של הראיות ואינו מהווה אישור משפטי.',
  ].join('\n')
}

function createLedgerDigest(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `ledger-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}