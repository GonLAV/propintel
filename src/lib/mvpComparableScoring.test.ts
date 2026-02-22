import { describe, expect, it } from 'vitest'
import {
  calculateValuationRange,
  filterPriceOutliersByIqr,
  rankComparables,
  type ComparableFeatures,
  type SubjectFeatures,
} from '@/lib/mvpComparableScoring'

const subject: SubjectFeatures = {
  areaSqm: 100,
  floorNum: 5,
  rooms: 4,
  buildingAgeYears: 20,
}

const comparables: ComparableFeatures[] = [
  { id: 'a', distanceMeters: 300, areaSqm: 98, floorNum: 5, rooms: 4, buildingAgeYears: 18, priceNis: 2_700_000 },
  { id: 'b', distanceMeters: 450, areaSqm: 105, floorNum: 6, rooms: 4, buildingAgeYears: 22, priceNis: 2_850_000 },
  { id: 'c', distanceMeters: 650, areaSqm: 92, floorNum: 4, rooms: 3.5, buildingAgeYears: 25, priceNis: 2_550_000 },
  { id: 'd', distanceMeters: 900, areaSqm: 110, floorNum: 7, rooms: 4.5, buildingAgeYears: 15, priceNis: 2_980_000 },
  { id: 'e', distanceMeters: 1200, areaSqm: 95, floorNum: 3, rooms: 4, buildingAgeYears: 30, priceNis: 2_400_000 },
  { id: 'x-outlier', distanceMeters: 400, areaSqm: 100, floorNum: 5, rooms: 4, buildingAgeYears: 19, priceNis: 5_900_000 },
]

describe('mvpComparableScoring', () => {
  it('ranks comparables by descending score', () => {
    const ranked = rankComparables(subject, comparables, 5)
    expect(ranked).toHaveLength(5)
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
  })

  it('filters outliers and returns valuation range', () => {
    const ranked = rankComparables(subject, comparables, 6)
    const { outliers } = filterPriceOutliersByIqr(ranked)
    const valuation = calculateValuationRange(ranked)

    expect(outliers.some((x) => x.id === 'x-outlier')).toBe(true)
    expect(valuation.low).toBeLessThanOrEqual(valuation.mid)
    expect(valuation.mid).toBeLessThanOrEqual(valuation.high)
    expect(valuation.comparablesUsed).toBeGreaterThan(0)
  })
})
