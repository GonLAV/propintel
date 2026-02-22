import { describe, expect, it } from 'vitest'
import {
  applyAdjustments,
  searchTopComparables,
  valuateFromComparables,
  type PropertyFeaturePayload,
  type SubjectPropertyInput,
} from '@/lib/aiComparableEngine'

const subject: SubjectPropertyInput = {
  id: 'subject-1',
  address: 'רחוב המבחן 1',
  city: 'תל אביב-יפו',
  lat: 32.08,
  lng: 34.78,
  propertyType: 'apartment',
  sizeSqm: 95,
  floor: 5,
  buildingAge: 20,
  conditionScore: 7,
  hasElevator: true,
  hasParking: true,
  hasBalcony: true,
  hasView: false,
  noiseLevel: 5,
  renovationState: 'renovated',
  planningPotentialScore: 4,
}

const pool: PropertyFeaturePayload[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `comp-${i}`,
  address: `רחוב השוואה ${i}`,
  city: 'תל אביב-יפו',
  lat: 32.08 + i * 0.0002,
  lng: 34.78 + i * 0.0002,
  propertyType: 'apartment',
  sizeSqm: 90 + i,
  floor: 4 + (i % 4),
  buildingAge: 18 + (i % 5),
  conditionScore: 6 + (i % 3),
  hasElevator: true,
  hasParking: i % 2 === 0,
  hasBalcony: true,
  hasView: false,
  noiseLevel: 5,
  renovationState: i % 3 === 0 ? 'partial' : 'renovated',
  planningPotentialScore: 3 + (i % 3),
  saleDate: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString(),
  salePrice: 2_100_000 + i * 30_000,
}))

describe('aiComparableEngine', () => {
  it('finds and ranks top comparables', () => {
    const ranked = searchTopComparables({ subject, comparablesPool: pool, topK: 8 })

    expect(ranked).toHaveLength(8)
    expect(ranked[0].similarity).toBeGreaterThanOrEqual(ranked[7].similarity)
  })

  it('produces valuation range and confidence', () => {
    const ranked = searchTopComparables({ subject, comparablesPool: pool, topK: 10 })
    const adjusted = ranked.map((x) => applyAdjustments(subject, x))
    const valuation = valuateFromComparables(adjusted, 'weighted-mean')

    expect(valuation.range.low).toBeLessThanOrEqual(valuation.range.mid)
    expect(valuation.range.mid).toBeLessThanOrEqual(valuation.range.high)
    expect(valuation.confidenceScore).toBeGreaterThanOrEqual(0)
    expect(valuation.confidenceScore).toBeLessThanOrEqual(100)
  })
})
