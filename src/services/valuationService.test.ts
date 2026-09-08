import { describe, expect, it } from 'vitest'
import { valuate } from './valuationService'
import type { Comparable, Property } from '@/lib/types'

const property: Property = {
  id: 'service-property',
  clientId: 'client',
  status: 'in-progress',
  address: { street: '1 Main', city: 'Tel Aviv', neighborhood: 'Center', postalCode: '' },
  type: 'apartment',
  details: {
    builtArea: 80, rooms: 3, bedrooms: 2, bathrooms: 1, floor: 2, totalFloors: 5,
    buildYear: 2010, condition: 'good', parking: 1, storage: true, balcony: true,
    elevator: true, accessible: false
  },
  features: [], description: '', photos: [], createdAt: '2024-01-01', updatedAt: '2024-01-01'
}

const comparable = (id: string, price: number): Comparable => ({
  id, address: `${id} Main`, type: 'apartment', salePrice: price, saleDate: '2024-01-01',
  builtArea: 80, rooms: 3, floor: 2, distance: 0.5,
  adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
  adjustedPrice: price, pricePerSqm: price / 80, selected: true, similarityScore: 90
})

describe('valuation service', () => {
  it.each([
    ['comparable-sales', { method: 'comparable-sales' as const, property, comparables: [comparable('a', 2400000), comparable('b', 2500000), comparable('c', 2600000)] }],
    ['cost-approach', { method: 'cost-approach' as const, property, landValue: 1200000, constructionCostPerSqm: 6500 }],
    ['income-approach', { method: 'income-approach' as const, property, monthlyRent: 5500, vacancyRate: 0.05, expenseRatio: 0.3, capRate: 0.05 }]
  ])('normalizes %s results', async (_, request) => {
    const result = await valuate(request)
    expect(result.estimate.value).toBe(result.estimatedValue)
    expect(result.provenance.source).toBe('valuation-engine')
    expect(result.quality.score).toBe(result.confidence)
  })

  it('normalizes professional AVM results and provenance', async () => {
    const result = await valuate({
      method: 'professional-avm',
      property,
      config: { minComparables: 1, minSimilarityScore: 0 },
      transactions: [{
        id: 'avm-1',
        address: '1 Main',
        date: '2026-09-01',
        price: 2500000,
        usableArea: 80,
        pricePerSqm: 31250,
        floor: 2,
        totalFloors: 5,
        rooms: 3,
        hasElevator: true,
        hasParking: true,
        hasBalcony: true,
        buildingAge: 16,
        condition: 'good',
        propertyType: 'apartment',
        source: 'nadlan-gov-il',
        verified: true
      }]
    })
    expect(result.method).toBe('professional-avm')
    expect(result.provenance.source).toBe('professional-avm')
    expect(result.estimate.range.min).toBeLessThan(result.estimate.value)
  })

  it('rejects invalid inputs before calling an engine', async () => {
    await expect(valuate({
      method: 'cost-approach',
      property: { ...property, details: { ...property.details, builtArea: 0 } },
      landValue: 100,
      constructionCostPerSqm: 100
    })).rejects.toThrow()
  })

  it('reconciles deterministically through the existing engine', async () => {
    const requests = [
      { method: 'cost-approach' as const, property, landValue: 1200000, constructionCostPerSqm: 6500 },
      { method: 'income-approach' as const, property, monthlyRent: 5500, vacancyRate: 0.05, expenseRatio: 0.3, capRate: 0.05 }
    ]
    const results = await Promise.all(requests.map(valuate))
    const first = await valuate({ method: 'hybrid', results: results.map(result => result.legacyResult as never) })
    const second = await valuate({ method: 'hybrid', results: results.map(result => result.legacyResult as never) })
    expect(first.estimate).toEqual(second.estimate)
  })

  it('surfaces quality warnings without changing engine output', async () => {
    const result = await valuate({ method: 'comparable-sales', property, comparables: [comparable('a', 2400000)] })
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.legacyResult.estimatedValue).toBe(result.estimatedValue)
  })
})
