import { describe, expect, it } from 'vitest'
import { calculateSizeNormalizationAdjustment } from '@/lib/valuationAssistantMath'

describe('valuation assistant size normalization', () => {
  it('adjusts a smaller comparable upward to the larger subject area', () => {
    const result = calculateSizeNormalizationAdjustment(100, 80, 1_600_000)
    expect(result.percentage).toBeCloseTo(25)
    expect(result.amount).toBeCloseTo(400_000)
    expect(result.normalizedValue).toBeCloseTo(2_000_000)
  })

  it('adjusts a larger comparable downward to the smaller subject area', () => {
    const result = calculateSizeNormalizationAdjustment(80, 100, 2_000_000)
    expect(result.percentage).toBeCloseTo(-20)
    expect(result.amount).toBeCloseTo(-400_000)
    expect(result.normalizedValue).toBeCloseTo(1_600_000)
  })

  it('rejects zero area to prevent infinite results', () => {
    expect(() => calculateSizeNormalizationAdjustment(100, 0, 1_000_000)).toThrow(/positive/)
  })
})
