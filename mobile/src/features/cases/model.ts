export type AppScreen = 'home' | 'create' | 'detail'

export type CaseStatus = 'draft' | 'sent' | 'resolved' | 'urgent'

export type EvidenceItem = {
  id: string
  type: 'photo' | 'note' | 'document'
  label: string
  capturedAt: string
  hash: string
  hashAlgorithm: 'local-fnv1a' | 'sha-256'
  sourceUri?: string
  mimeType?: string
  sizeBytes?: number
}

export type DiraCase = {
  id: string
  title: string
  address: string
  landlordName: string
  status: CaseStatus
  category: 'handover' | 'repair' | 'deposit' | 'contract'
  deadline: string
  evidence: EvidenceItem[]
  nextAction: string
  createdAt: string
}

export function createStarterCases(): DiraCase[] {
  return [
    {
      id: 'case-deposit-1',
      title: 'החזרת פיקדון אחרי יציאה',
      address: 'דיזנגוף 118, תל אביב',
      landlordName: 'רונית כהן',
      status: 'urgent',
      category: 'deposit',
      deadline: 'תוך 48 שעות',
      nextAction: 'שליחת מכתב מסודר עם ראיות חתומות',
      createdAt: new Date().toISOString(),
      evidence: [
        signedEvidence('צילום מצב קירות', 'photo'),
        signedEvidence('אישור העברה בנקאית', 'document'),
        signedEvidence('סיכום שיחת WhatsApp', 'note'),
      ],
    },
  ]
}

export function createNewCase(input: { title: string; address: string; landlordName: string; category: DiraCase['category'] }): DiraCase {
  return {
    id: `case-${Date.now()}`,
    title: input.title,
    address: input.address,
    landlordName: input.landlordName,
    category: input.category,
    status: 'draft',
    deadline: 'היום',
    nextAction: 'הוספת 3 ראיות ושליחה לבעל הדירה',
    createdAt: new Date().toISOString(),
    evidence: [signedEvidence('תיאור ראשוני', 'note')],
  }
}

export function signedEvidence(label: string, type: EvidenceItem['type']): EvidenceItem {
  const capturedAt = new Date().toISOString()
  const fingerprint = createEvidenceFingerprint(`${type}:${label}:${capturedAt}`)

  return {
    id: `ev-${Math.random().toString(36).slice(2)}`,
    type,
    label,
    capturedAt,
    hash: fingerprint,
    hashAlgorithm: 'local-fnv1a',
  }
}

export function attachEvidence(item: DiraCase, evidence: EvidenceItem): DiraCase {
  return {
    ...item,
    status: item.status === 'resolved' ? item.status : 'draft',
    evidence: [evidence, ...item.evidence],
    nextAction: item.evidence.length + 1 >= 3 ? 'שליחת מכתב מסודר עם ראיות חתומות' : 'הוספת 3 ראיות ושליחה לבעל הדירה',
  }
}

export function createCapturedEvidence(input: {
  label: string
  type: EvidenceItem['type']
  sourceUri?: string
  mimeType?: string
  sizeBytes?: number
  hash: string
}): EvidenceItem {
  return {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: input.type,
    label: input.label,
    capturedAt: new Date().toISOString(),
    hash: input.hash,
    hashAlgorithm: 'sha-256',
    sourceUri: input.sourceUri,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  }
}

function createEvidenceFingerprint(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `local-${(hash >>> 0).toString(16)}`
}