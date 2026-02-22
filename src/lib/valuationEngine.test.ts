import { describe, it, expect, beforeEach } from 'vitest'
import { ValuationEngine } from './valuationEngine'
import { recommendValuationMethod } from './valuationDecision'
import { parseCSV } from './csvImport'
import { ReportGenerator } from './reportGenerator'
import type { Property, Comparable } from './types'

function createTestProperty(): Property {
  return {
    id: 'test-prop-1',
    clientId: 'client-1',
    status: 'in-progress',
    address: {
      street: 'רחוב לוינסקי 22',
      city: 'תל אביב',
      neighborhood: 'פלורנטין',
      postalCode: '64161'
    },
    type: 'apartment',
    details: {
      builtArea: 85,
      rooms: 3.5,
      bedrooms: 2,
      bathrooms: 1,
      floor: 3,
      totalFloors: 5,
      buildYear: 2010,
      condition: 'good',
      parking: 1,
      storage: true,
      balcony: true,
      elevator: true,
      accessible: false
    },
    features: [],
    description: 'דירת 3.5 חדרים בפלורנטין',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

function createTestComparables(): Comparable[] {
  return [
    {
      id: 'comp-1',
      address: 'רחוב לוינסקי 22, תל אביב',
      type: 'apartment',
      salePrice: 2850000,
      saleDate: '2024-01-15',
      builtArea: 82,
      rooms: 3.5,
      floor: 2,
      distance: 0.3,
      adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
      adjustedPrice: 2850000,
      pricePerSqm: 34756,
      selected: true,
      similarityScore: 92
    },
    {
      id: 'comp-2',
      address: 'רחוב נחלת בנימין 8, תל אביב',
      type: 'apartment',
      salePrice: 3100000,
      saleDate: '2024-02-01',
      builtArea: 90,
      rooms: 4,
      floor: 4,
      distance: 0.5,
      adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
      adjustedPrice: 3100000,
      pricePerSqm: 34444,
      selected: true,
      similarityScore: 88
    },
    {
      id: 'comp-3',
      address: 'רחוב שנקין 45, תל אביב',
      type: 'apartment',
      salePrice: 2950000,
      saleDate: '2023-12-20',
      builtArea: 87,
      rooms: 3.5,
      floor: 1,
      distance: 0.8,
      adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
      adjustedPrice: 2950000,
      pricePerSqm: 33908,
      selected: true,
      similarityScore: 85
    }
  ]
}

describe('Valuation Engine', () => {
  let property: Property
  let comparables: Comparable[]

  beforeEach(() => {
    property = createTestProperty()
    comparables = createTestComparables()
  })

  describe('Comparable Sales Approach', () => {
    it('should calculate value from comparables', () => {
      const result = ValuationEngine.calculateComparableSalesApproach(property, comparables)

      expect(result).toBeDefined()
      expect(result.method).toBe('comparable-sales')
      expect(result.estimatedValue).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })

    it('should return value in range', () => {
      const result = ValuationEngine.calculateComparableSalesApproach(property, comparables)

      expect(result.estimatedValue).toBeGreaterThanOrEqual(result.valueRange.min)
      expect(result.estimatedValue).toBeLessThanOrEqual(result.valueRange.max)
    })

    it('should include quality checks', () => {
      const result = ValuationEngine.calculateComparableSalesApproach(property, comparables)

      expect(result.qualityChecks).toBeDefined()
      expect(Array.isArray(result.qualityChecks)).toBe(true)
    })

    it('should throw error with no selected comparables', () => {
      const emptyComps = comparables.map(c => ({ ...c, selected: false }))
      expect(() => ValuationEngine.calculateComparableSalesApproach(property, emptyComps)).toThrow()
    })
  })

  describe('Cost Approach', () => {
    it('should calculate value from land + construction', () => {
      const result = ValuationEngine.calculateCostApproach(property, 1500000, 6500)

      expect(result).toBeDefined()
      expect(result.method).toBe('cost-approach')
      expect(result.estimatedValue).toBeGreaterThan(0)
      expect(result.confidence).toBe(75)
    })

    it('should apply depreciation for older properties', () => {
      const oldProperty = { ...property, details: { ...property.details, buildYear: 1950 } }
      const result = ValuationEngine.calculateCostApproach(oldProperty, 1500000, 6500)

      // Should have meaningful depreciation
      expect(result.estimatedValue).toBeGreaterThan(0)
      expect(result.limitations.length).toBeGreaterThan(0)
    })
  })

  describe('Income Approach', () => {
    it('should calculate value from NOI', () => {
      const result = ValuationEngine.calculateIncomeApproach(property, 5500, 0.05, 0.30, 0.05)

      expect(result).toBeDefined()
      expect(result.method).toBe('income-approach')
      expect(result.estimatedValue).toBeGreaterThan(0)
      expect(result.confidence).toBe(80)
    })

    it('should have quality checks for parameters', () => {
      const result = ValuationEngine.calculateIncomeApproach(property, 5500, 0.05, 0.30, 0.05)

      expect(result.qualityChecks).toBeDefined()
      expect(Array.isArray(result.qualityChecks)).toBe(true)
    })
  })

  describe('Hybrid Reconciliation', () => {
    it('should reconcile multiple valuation methods', () => {
      const comp = ValuationEngine.calculateComparableSalesApproach(property, comparables)
      const cost = ValuationEngine.calculateCostApproach(property, 1500000, 6500)
      const income = ValuationEngine.calculateIncomeApproach(property, 5500, 0.05, 0.30, 0.05)

      const hybrid = ValuationEngine.reconcileValuations([comp, cost, income])

      expect(hybrid.method).toBe('hybrid')
      expect(hybrid.estimatedValue).toBeGreaterThan(0)
      expect(hybrid.confidence).toBeGreaterThan(0)
    })

    it('should use provided weights', () => {
      const comp = ValuationEngine.calculateComparableSalesApproach(property, comparables)
      const cost = ValuationEngine.calculateCostApproach(property, 1500000, 6500)

      const hybrid1 = ValuationEngine.reconcileValuations([comp, cost], { 'comparable-sales': 1, 'cost-approach': 0 })
      const hybrid2 = ValuationEngine.reconcileValuations([comp, cost], { 'comparable-sales': 0, 'cost-approach': 1 })

      // Heavy weight on comp should be closer to comp value
      expect(Math.abs(hybrid1.estimatedValue - comp.estimatedValue)).toBeLessThan(
        Math.abs(hybrid2.estimatedValue - comp.estimatedValue)
      )
    })
  })
})

describe('Decision Engine', () => {
  it('should recommend comparable sales for residential property', () => {
    const property = createTestProperty()
    const recommendation = recommendValuationMethod(property, {
      comparables: createTestComparables()
    })

    expect(recommendation.recommendedMethod).toBe('comparable-sales')
  })

  it('should warn about low sample', () => {
    const property = createTestProperty()
    const recommendation = recommendValuationMethod(property, {
      comparables: createTestComparables().slice(0, 1)
    })

    expect(recommendation.warnings.length).toBeGreaterThan(0)
    expect(recommendation.warnings[0]).toContain('לא נבחרו עסקאות')
  })

  it('should recommend income approach for commercial property', () => {
    const property = { ...createTestProperty(), type: 'commercial' as const }
    const recommendation = recommendValuationMethod(property)

    expect(recommendation.recommendedMethod).toBe('income-approach')
  })
})

describe('CSV Import', () => {
  it('should parse valid CSV', () => {
    const csv = `address,type,salePrice,saleDate,builtArea,rooms,floor
רחוב לוינסקי 22,apartment,2850000,2024-01-15,82,3.5,2
רחוב נחלת בנימין 8,apartment,3100000,2024-02-01,90,4,4`

    const result = parseCSV(csv)

    expect(result.comparables.length).toBe(2)
    expect(result.errors.length).toBe(0)
    expect(result.comparables[0].address).toBe('רחוב לוינסקי 22')
  })

  it('should handle missing optional fields', () => {
    const csv = `address,salePrice,builtArea
כתובת א,2850000,82
כתובת ב,3100000,90`

    const result = parseCSV(csv)

    expect(result.comparables.length).toBe(2)
    expect(result.comparables[0].type).toBe('apartment') // default
  })

  it('should report errors for invalid data', () => {
    const csv = `address,salePrice,builtArea
כתובת א,invalid,82`

    const result = parseCSV(csv)

    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('Report Generator', () => {
  it('should generate standard sections', () => {
    const property = createTestProperty()
    const comparables = createTestComparables()
    const comp = ValuationEngine.calculateComparableSalesApproach(property, comparables)

    const sections = ReportGenerator.generateStandardSections(property, [comp], comparables)

    expect(sections.length).toBeGreaterThan(0)
    expect(sections.every(s => s.title && s.content)).toBe(true)
  })

  it('should generate property identification section', () => {
    const property = createTestProperty()
    const comparables = createTestComparables()
    const comp = ValuationEngine.calculateComparableSalesApproach(property, comparables)

    const sections = ReportGenerator.generateStandardSections(property, [comp], comparables)
    const idSection = sections.find(s => s.id === 'property-id')

    expect(idSection).toBeDefined()
    expect(idSection!.content).toContain(property.address.street)
  })
})
