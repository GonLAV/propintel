import { describe, expect, it } from 'vitest'
import {
  DiraCase,
  attachEvidence,
  caseInputSchema,
  createCapturedEvidence,
  createNewCase,
  recordDeliveryEvent,
} from './model'

function createCase(status: DiraCase['status'] = 'urgent') {
  return {
    ...createNewCase({
      title: 'תיק בדיקה',
      address: 'רחוב הבדיקה 1',
      landlordName: 'בעל הדירה',
      category: 'deposit',
    }),
    status,
  }
}

describe('case input validation', () => {
  it('trims accepted fields before creating a case', () => {
    const parsed = caseInputSchema.parse({
      title: '  החזרת פיקדון  ',
      address: '  דיזנגוף 118  ',
      landlordName: '  רונית כהן  ',
    })
    const item = createNewCase({ ...parsed, category: 'deposit' })

    expect(item.title).toBe('החזרת פיקדון')
    expect(item.address).toBe('דיזנגוף 118')
    expect(item.landlordName).toBe('רונית כהן')
  })

  it('rejects whitespace-only values', () => {
    expect(caseInputSchema.safeParse({
      title: '   ',
      address: '\t',
      landlordName: '  ',
    }).success).toBe(false)
  })
})

describe('case lifecycle', () => {
  it.each<DiraCase['status']>(['draft', 'sent', 'resolved', 'urgent'])(
    'preserves %s status when evidence is attached',
    (status) => {
      const item = createCase(status)
      const evidence = createCapturedEvidence({
        label: 'צילום',
        type: 'photo',
        hash: 'a'.repeat(64),
      })

      expect(attachEvidence(item, evidence).status).toBe(status)
    },
  )

  it('marks a letter as sent only after a shared outcome', () => {
    const item = createCase('urgent')
    const dismissed = recordDeliveryEvent(item, {
      kind: 'letter',
      outcome: 'dismissed',
      occurredAt: new Date().toISOString(),
    })
    const shared = recordDeliveryEvent(dismissed, {
      kind: 'letter',
      outcome: 'shared',
      occurredAt: new Date().toISOString(),
    })

    expect(dismissed.status).toBe('urgent')
    expect(shared.status).toBe('sent')
    expect(shared.deliveryEvents).toHaveLength(2)
  })
})
