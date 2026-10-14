import { describe, expect, it } from 'vitest'
import { estimatePropertyValue } from '@/lib/propertyPresets'

describe('property preset valuation', () => {
  it('rejects non-positive and non-finite areas', () => {
    expect(estimatePropertyValue('apartment', 0, 'תל אביב-יפו')).toBeNull()
    expect(estimatePropertyValue('apartment', Number.POSITIVE_INFINITY, 'תל אביב-יפו')).toBeNull()
  })
})
