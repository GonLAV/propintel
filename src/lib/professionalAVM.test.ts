import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfessionalAVM, performAVMValuation, type AVMTransaction } from './professionalAVM'
import type { Property } from './types'

const SYNTHETIC_NOTE = 'Synthetic fixture - not a real transaction'

function createSubject(overrides: Partial<Property> = {}): Property {
  const base: Property = {
    id: 'synthetic-subject-1',
    clientId: 'synthetic-client',
    status: 'in-progress',
    address: {
      street: 'Synthetic Subject Street 1',
      city: 'Synthetic City',
      neighborhood: 'Synthetic Neighborhood',
      postalCode: '00000'
    },
    type: 'apartment',
    details: {
      builtArea: 100,
      rooms: 4,
      bedrooms: 3,
      bathrooms: 2,
      floor: 3,
      totalFloors: 8,
      buildYear: 2020,
      condition: 'good',
      parking: 1,
      storage: true,
      balcony: true,
      elevator: true,
      accessible: false
    },
    features: [SYNTHETIC_NOTE],
    description: SYNTHETIC_NOTE,
    photos: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  }

  return { ...base, ...overrides }
}

function createTransaction(overrides: Partial<AVMTransaction> = {}): AVMTransaction {
  return {
    id: overrides.id ?? 'synthetic-transaction',
    address: `${SYNTHETIC_NOTE} ${overrides.id ?? ''}`.trim(),
    date: '2026-08-01',
    price: 3_000_000,
    usableArea: 100,
    pricePerSqm: 30_000,
    floor: 3,
    totalFloors: 8,
    rooms: 4,
    hasElevator: true,
    hasParking: true,
    hasBalcony: true,
    buildingAge: 6,
    condition: 'good',
    propertyType: 'apartment',
    source: 'tax-authority',
    verified: true,
    ...overrides
  }
}

function createComparableSet(): AVMTransaction[] {
  return [
    createTransaction({ id: 'synthetic-comp-1', date: '2026-08-01' }),
    createTransaction({ id: 'synthetic-comp-2', date: '2026-07-15' }),
    createTransaction({ id: 'synthetic-comp-3', date: '2026-07-01' }),
    createTransaction({ id: 'synthetic-comp-4', date: '2026-06-15' }),
    createTransaction({ id: 'synthetic-comp-5', date: '2026-06-01' }),
    createTransaction({ id: 'synthetic-comp-6', date: '2026-05-15' })
  ]
}

describe('ProfessionalAVM', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calculates a deterministic happy-path valuation from synthetic comparable transactions', async () => {
    const result = await new ProfessionalAVM().valuate(createSubject(), createComparableSet())

    expect(result.estimatedValue).toBe(3_000_000)
    expect(result.pricePerSqm).toBe(30_000)
    expect(result.valueRange).toEqual({ low: 2_700_000, mid: 3_000_000, high: 3_300_000 })
    expect(result.comparablesAfterFiltering).toBe(6)
    expect(result.totalComparablesFound).toBe(6)
    expect(result.comparablesUsed).toHaveLength(6)
    expect(result.standard22Compliant).toBe(false)
    expect(result.reportNumber).toMatch(/^AVM-2026-\d{6}$/)
  })

  it('returns internally consistent confidence, quality, statistics, and range metrics', async () => {
    const result = await new ProfessionalAVM().valuate(createSubject(), createComparableSet())

    const confidenceSum = Object.values(result.confidenceBreakdown).reduce((sum, value) => sum + value, 0)
    expect(result.confidenceScore).toBe(confidenceSum)
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0)
    expect(result.confidenceScore).toBeLessThanOrEqual(100)
    expect(result.dataQuality).toBeGreaterThanOrEqual(0)
    expect(result.dataQuality).toBeLessThanOrEqual(100)
    expect(result.valueRange.low).toBe(Math.round(result.estimatedValue * 0.9))
    expect(result.valueRange.high).toBe(Math.round(result.estimatedValue * 1.1))
    expect(result.statistics.mean).toBe(result.pricePerSqm)
    expect(result.statistics.stdDev).toBe(0)
    expect(result.statistics.coefficientOfVariation).toBe(0)
  })

  it('applies adjustment breakdowns and weighted-average math for boundary-like comparable differences', async () => {
    const transactions = [
      createTransaction({ id: 'larger-older-no-features', usableArea: 130, price: 3_900_000, floor: 1, hasElevator: false, hasParking: false, hasBalcony: false, buildingAge: 30, condition: 'fair', distanceMeters: 500 }),
      createTransaction({ id: 'subject-like-1', price: 3_100_000 }),
      createTransaction({ id: 'subject-like-2', price: 2_900_000 }),
      createTransaction({ id: 'subject-like-3', price: 3_050_000 }),
      createTransaction({ id: 'subject-like-4', price: 2_950_000 })
    ]

    const result = await new ProfessionalAVM({ minComparables: 5, minSimilarityScore: 50 }).valuate(createSubject(), transactions)
    const adjustedComparables = result.comparablesUsed
    const largerOlderComparable = adjustedComparables.find(comp => comp.id === 'larger-older-no-features')
    const totalWeight = adjustedComparables.reduce((sum, comp) => sum + comp.similarityScore! * comp.timeWeight!, 0)
    const expectedWeightedPricePerSqm = Math.round(
      adjustedComparables.reduce(
        (sum, comp) => sum + comp.adjustedPrice! * comp.similarityScore! * comp.timeWeight!,
        0
      ) / totalWeight
    )

    expect(result.pricePerSqm).toBe(expectedWeightedPricePerSqm)
    expect(result.estimatedValue).toBe(result.pricePerSqm * createSubject().details.builtArea)
    expect(largerOlderComparable?.adjustments?.total).toBeCloseTo(0.203, 5)
    expect(largerOlderComparable?.adjustedPrice).toBe(36_090)
  })

  it('filters invalid, stale, dissimilar, and statistical outlier transactions before valuation', async () => {
    const transactions = [
      ...createComparableSet(),
      createTransaction({ id: 'synthetic-unverified', verified: false }),
      createTransaction({ id: 'synthetic-zero-price', price: 0 }),
      createTransaction({ id: 'synthetic-price-outlier', price: 20_000_000, usableArea: 100 }),
      createTransaction({ id: 'synthetic-stale', date: '2023-01-01' }),
      createTransaction({ id: 'synthetic-wrong-type', propertyType: 'garden-apartment' }),
      createTransaction({ id: 'synthetic-too-large', usableArea: 200 })
    ]

    const result = await new ProfessionalAVM().valuate(createSubject(), transactions)

    expect(result.totalComparablesFound).toBe(8)
    expect(result.comparablesAfterFiltering).toBe(6)
    expect(result.comparablesUsed.map(comp => comp.id)).toEqual([
      'synthetic-comp-1',
      'synthetic-comp-2',
      'synthetic-comp-3',
      'synthetic-comp-4',
      'synthetic-comp-5',
      'synthetic-comp-6'
    ])
  })

  it('reports warning and low-confidence flags when too few comparables are available', async () => {
    const result = await new ProfessionalAVM({ minComparables: 5 }).valuate(
      createSubject(),
      createComparableSet().slice(0, 2)
    )

    expect(result.comparablesAfterFiltering).toBe(2)
    expect(result.warnings).toContain('⚠️ אזהרה: מספר עסקאות מצומצם - ביטחון נמוך')
    expect(result.lowConfidenceFlags.some(flag => flag.includes('מספר עסקאות נמוך'))).toBe(true)
  })

  it('adds a unique-property warning for penthouse subjects', async () => {
    const result = await new ProfessionalAVM({ minComparables: 2 }).valuate(
      createSubject({ type: 'penthouse' }),
      [
        createTransaction({ id: 'synthetic-penthouse-1', propertyType: 'penthouse' }),
        createTransaction({ id: 'synthetic-penthouse-2', propertyType: 'penthouse' })
      ]
    )

    expect(result.warnings).toContain('נכס ייחודי - יש להתאים את השמאות לפי מאפיינים ספציפיים')
  })

  it('rejects an empty transaction set instead of returning NaN valuation fields', async () => {
    await expect(new ProfessionalAVM().valuate(createSubject(), [])).rejects.toThrow(
      'at least one valid comparable transaction'
    )
  })

  it('rejects invalid subject area instead of returning a zero or invalid estimate', async () => {
    await expect(
      new ProfessionalAVM().valuate(
        createSubject({ details: { ...createSubject().details, builtArea: 0 } }),
        createComparableSet()
      )
    ).rejects.toThrow('positive subject built area')
  })

  it('exposes the convenience valuation function with the same result shape', async () => {
    const result = await performAVMValuation(createSubject(), createComparableSet())

    expect(result.estimatedValue).toBeGreaterThan(0)
    expect(result.disclaimer).toContain('Automated Valuation Model')
    expect(result.assumptions.length).toBeGreaterThan(0)
    expect(result.limitations.length).toBeGreaterThan(0)
  })
})
