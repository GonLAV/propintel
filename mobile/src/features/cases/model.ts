import { z } from 'zod'

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

export type DeliveryEvent = {
  id: string
  kind: 'letter' | 'autopilot' | 'ledger'
  outcome: 'shared' | 'dismissed'
  occurredAt: string
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
  deliveryEvents: DeliveryEvent[]
  nextAction: string
  createdAt: string
}

export const caseInputSchema = z.object({
  title: z.string().trim().min(2),
  address: z.string().trim().min(5),
  landlordName: z.string().trim().min(2),
})

export function createStarterCases(): DiraCase[] {
  return []
}

export function createNewCase(input: { title: string; address: string; landlordName: string; category: DiraCase['category'] }): DiraCase {
  return {
    id: `case-${Date.now()}`,
    title: input.title.trim(),
    address: input.address.trim(),
    landlordName: input.landlordName.trim(),
    category: input.category,
    status: 'draft',
    deadline: 'היום',
    nextAction: 'הוספת 3 ראיות ושליחה לבעל הדירה',
    createdAt: new Date().toISOString(),
    evidence: [],
    deliveryEvents: [],
  }
}

export function attachEvidence(item: DiraCase, evidence: EvidenceItem): DiraCase {
  return {
    ...item,
    evidence: [evidence, ...item.evidence],
    nextAction: item.evidence.length + 1 >= 3 ? 'שליחת מכתב מסודר עם ראיות חתומות' : 'הוספת 3 ראיות ושליחה לבעל הדירה',
  }
}

export function recordDeliveryEvent(item: DiraCase, event: Omit<DeliveryEvent, 'id'>): DiraCase {
  return {
    ...item,
    status: event.kind === 'letter' && event.outcome === 'shared' ? 'sent' : item.status,
    deliveryEvents: [
      {
        ...event,
        id: `delivery-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      ...item.deliveryEvents,
    ],
    nextAction: event.kind === 'letter' && event.outcome === 'shared'
      ? 'מעקב אחר תשובת בעל הדירה'
      : item.nextAction,
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