import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdjustmentCalculator, type AdjustmentFactor } from './adjustmentCalculator'
import { CostApproachCalculator, type ConstructionCostParams, type DepreciationParams, type LandValue } from './costApproachCalculator'
import { IncomeCapitalizationCalculator, type CapRateParams, type IncomeParams } from './incomeCapitalizationCalculator'
import { MultiUnitCalculator, type BuildingParams, type UnitParams } from './multiUnitCalculator'
import { WeightedAverageCalculator, type ComparableProperty } from './weightedAverageCalculator'

const SYNTHETIC_NOTE = 'Synthetic fixture - not a real transaction'

function adjustment(
  overrides: Partial<AdjustmentFactor> = {}
): AdjustmentFactor {
  return {
    id: overrides.id ?? 'synthetic-adjustment',
    name: overrides.name ?? 'Synthetic Adjustment',
    nameHebrew: overrides.nameHebrew ?? 'התאמה סינתטית',
    type: overrides.type ?? 'percentage',
    value: overrides.value ?? 0,
    applied: overrides.applied ?? true,
    reasoning: overrides.reasoning ?? SYNTHETIC_NOTE,
    source: overrides.source ?? SYNTHETIC_NOTE,
    category: overrides.category ?? 'physical'
  }
}

function comparable(overrides: Partial<ComparableProperty> = {}): ComparableProperty {
  return {
    id: overrides.id ?? 'synthetic-comparable',
    address: overrides.address ?? SYNTHETIC_NOTE,
    price: overrides.price ?? 2_000_000,
    pricePerSqm: overrides.pricePerSqm ?? 20_000,
    area: overrides.area ?? 100,
    distance: overrides.distance ?? 100,
    similarity: overrides.similarity ?? 90,
    reliability: overrides.reliability ?? 95,
    transactionDate: overrides.transactionDate ?? new Date('2026-08-01'),
    adjustedPrice: overrides.adjustedPrice,
    adjustedPricePerSqm: overrides.adjustedPricePerSqm
  }
}

function constructionParams(overrides: Partial<ConstructionCostParams> = {}): ConstructionCostParams {
  return {
    buildingType: overrides.buildingType ?? 'residential',
    quality: overrides.quality ?? 'standard',
    area: overrides.area ?? 100,
    floors: overrides.floors ?? 2,
    finishLevel: overrides.finishLevel ?? 'standard'
  }
}

function depreciationParams(overrides: Partial<DepreciationParams> = {}): DepreciationParams {
  return {
    buildingAge: overrides.buildingAge ?? 10,
    effectiveAge: overrides.effectiveAge ?? 10,
    totalLifespan: overrides.totalLifespan ?? 50,
    physicalDeteriorationPercent: overrides.physicalDeteriorationPercent ?? 0,
    functionalObsolescencePercent: overrides.functionalObsolescencePercent ?? 5,
    economicObsolescencePercent: overrides.economicObsolescencePercent ?? 0
  }
}

function landValue(overrides: Partial<LandValue> = {}): LandValue {
  return {
    landArea: overrides.landArea ?? 200,
    pricePerSqm: overrides.pricePerSqm ?? 5_000,
    totalLandValue: overrides.totalLandValue ?? 1_000_000,
    source: overrides.source ?? SYNTHETIC_NOTE,
    valuationDate: overrides.valuationDate ?? new Date('2026-09-01')
  }
}

function incomeParams(overrides: Partial<IncomeParams> = {}): IncomeParams {
  return {
    grossAnnualIncome: overrides.grossAnnualIncome ?? 240_000,
    vacancyRate: overrides.vacancyRate ?? 5,
    operatingExpenses: overrides.operatingExpenses ?? 30_000,
    propertyTax: overrides.propertyTax ?? 12_000,
    insurance: overrides.insurance ?? 6_000,
    maintenance: overrides.maintenance ?? 10_000,
    management: overrides.management ?? 8_000,
    utilities: overrides.utilities ?? 2_000,
    otherExpenses: overrides.otherExpenses ?? 0
  }
}

function capRateParams(overrides: Partial<CapRateParams> = {}): CapRateParams {
  return {
    marketCapRate: overrides.marketCapRate ?? 5,
    riskAdjustment: overrides.riskAdjustment ?? 0,
    locationAdjustment: overrides.locationAdjustment ?? 0,
    conditionAdjustment: overrides.conditionAdjustment ?? 0,
    finalCapRate: overrides.finalCapRate ?? 5
  }
}

function unit(overrides: Partial<UnitParams> = {}): UnitParams {
  return {
    id: overrides.id ?? 'synthetic-unit',
    unitNumber: overrides.unitNumber ?? '1',
    floor: overrides.floor ?? 1,
    area: overrides.area ?? 100,
    rooms: overrides.rooms ?? 4,
    hasFrontFacing: overrides.hasFrontFacing ?? false,
    hasBalcony: overrides.hasBalcony ?? false,
    balconyArea: overrides.balconyArea ?? 0,
    condition: overrides.condition ?? 'good',
    specificFeatures: overrides.specificFeatures ?? [SYNTHETIC_NOTE]
  }
}

function buildingParams(overrides: Partial<BuildingParams> = {}): BuildingParams {
  const units = overrides.units ?? [
    unit({ id: 'synthetic-unit-1', unitNumber: '1' }),
    unit({ id: 'synthetic-unit-2', unitNumber: '2' })
  ]

  return {
    totalBuildingValue: overrides.totalBuildingValue ?? 4_000_000,
    totalArea: overrides.totalArea ?? 200,
    baseValuePerSqm: overrides.baseValuePerSqm ?? 20_000,
    units
  }
}

describe('AdjustmentCalculator', () => {
  it('returns base value, per-sqm value, and a single base breakdown row when no adjustments apply', () => {
    const result = AdjustmentCalculator.calculateAdjustments(2_000_000, 100, [])

    expect(result.adjustedPrice).toBe(2_000_000)
    expect(result.adjustedPricePerSqm).toBe(20_000)
    expect(result.totalAdjustmentPercentage).toBe(0)
    expect(result.breakdown).toHaveLength(1)
  })

  it('compounds percentage adjustments in sequence and ignores unapplied adjustments', () => {
    const result = AdjustmentCalculator.calculateAdjustments(2_000_000, 100, [
      adjustment({ id: 'plus-ten', value: 10 }),
      adjustment({ id: 'minus-five', value: -5 }),
      adjustment({ id: 'ignored', value: 50, applied: false })
    ])

    expect(result.adjustedPrice).toBe(2_090_000)
    expect(result.adjustedPricePerSqm).toBe(20_900)
    expect(result.totalAdjustmentPercentage).toBeCloseTo(4.5)
    expect(result.breakdown).toHaveLength(3)
  })

  it('applies absolute and per-sqm adjustments as currency amounts, not percentage totals', () => {
    const result = AdjustmentCalculator.calculateAdjustments(2_000_000, 100, [
      adjustment({ id: 'percentage', value: 10 }),
      adjustment({ id: 'absolute', type: 'absolute', value: -100_000 }),
      adjustment({ id: 'per-sqm', type: 'perSqm', value: 1_000 })
    ])

    expect(result.adjustedPrice).toBe(2_200_000)
    expect(result.totalAdjustmentPercentage).toBe(10)
    expect(result.breakdown.at(-1)?.runningTotal).toBe(2_200_000)
  })

  it('creates standard floor, condition, and time adjustments at boundary values', () => {
    expect(AdjustmentCalculator.createFloorAdjustment(7, false).value).toBe(-9)
    expect(AdjustmentCalculator.createFloorAdjustment(20, true).value).toBe(5)
    expect(AdjustmentCalculator.createConditionAdjustment('renovated').value).toBe(15)
    expect(AdjustmentCalculator.createTimeAdjustment(new Date('2026-01-01'), new Date('2026-09-01'), 4).value).toBe(4)
  })

  it('rejects invalid area instead of returning Infinity per-sqm fields', () => {
    expect(() => AdjustmentCalculator.calculateAdjustments(2_000_000, 0, [])).toThrow('positive area')
  })
})

describe('WeightedAverageCalculator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns exact weighted average, median, range, and high confidence for identical synthetic comparables', () => {
    const comparables = Array.from({ length: 5 }, (_, index) =>
      comparable({ id: `synthetic-comparable-${index}`, price: 2_000_000, pricePerSqm: 20_000 })
    )

    const result = WeightedAverageCalculator.calculate(comparables)

    expect(result.weightedAverage).toBeCloseTo(2_000_000)
    expect(result.weightedAveragePerSqm).toBeCloseTo(20_000)
    expect(result.median).toBe(2_000_000)
    expect(result.range).toBe(0)
    expect(result.standardDeviation).toBe(0)
    expect(result.confidenceLevel).toBe('high')
  })

  it('uses adjusted prices in the weighted result and preserves raw min/max statistics', () => {
    const result = WeightedAverageCalculator.calculate([
      comparable({ id: 'low', price: 1_000_000, pricePerSqm: 10_000, adjustedPrice: 1_100_000, adjustedPricePerSqm: 11_000 }),
      comparable({ id: 'mid', price: 2_000_000, pricePerSqm: 20_000, adjustedPrice: 2_200_000, adjustedPricePerSqm: 22_000 }),
      comparable({ id: 'high', price: 3_000_000, pricePerSqm: 30_000, adjustedPrice: 3_300_000, adjustedPricePerSqm: 33_000 })
    ])

    expect(result.weightedAverage).toBeCloseTo(2_200_000)
    expect(result.weightedAveragePerSqm).toBeCloseTo(22_000)
    expect(result.min).toBe(1_100_000)
    expect(result.max).toBe(3_300_000)
  })

  it('reflects custom weights in comparable weight breakdowns', () => {
    const result = WeightedAverageCalculator.calculate(
      [comparable({ id: 'near', distance: 100, similarity: 80, reliability: 80 })],
      { proximity: 1, similarity: 0, reliability: 0, recency: 0 }
    )

    expect(result.comparables[0].weight).toBe(1)
    expect(result.comparables[0].weightBreakdown.totalWeight).toBe(1)
  })

  it('rejects empty comparables and zero total weights', () => {
    expect(() => WeightedAverageCalculator.calculate([])).toThrow('at least one comparable')
    expect(() =>
      WeightedAverageCalculator.calculate([comparable()], {
        proximity: 0,
        similarity: 0,
        reliability: 0,
        recency: 0
      })
    ).toThrow('positive total comparable weight')
  })
})

describe('CostApproachCalculator', () => {
  it('calculates land value plus depreciated replacement cost', () => {
    const result = CostApproachCalculator.calculate(
      constructionParams(),
      depreciationParams(),
      landValue()
    )

    expect(result.reproductionCost).toBe(600_000)
    expect(result.replacementCost).toBe(600_000)
    expect(result.breakdown.physicalDepreciation).toBe(120_000)
    expect(result.breakdown.functionalObsolescence).toBe(30_000)
    expect(result.totalDepreciation).toBe(150_000)
    expect(result.depreciatedValue).toBe(450_000)
    expect(result.finalValue).toBe(1_450_000)
  })

  it('applies finish-level and construction-quality multipliers at upper boundaries', () => {
    const result = CostApproachCalculator.calculate(
      constructionParams({ buildingType: 'luxury', quality: 'luxury', finishLevel: 'premium', area: 10 }),
      depreciationParams({ buildingAge: 0, totalLifespan: 100, functionalObsolescencePercent: 0 }),
      landValue({ totalLandValue: 500_000 })
    )

    expect(result.reproductionCost).toBe(312_500)
    expect(result.totalDepreciation).toBe(0)
    expect(result.finalValue).toBe(812_500)
    expect(result.depreciationSchedule).toHaveLength(1)
  })

  it('caps physical depreciation schedule at the total lifespan', () => {
    const result = CostApproachCalculator.calculate(
      constructionParams(),
      depreciationParams({ buildingAge: 80, totalLifespan: 50, functionalObsolescencePercent: 0 }),
      landValue()
    )

    expect(result.breakdown.physicalDepreciation).toBe(600_000)
    expect(result.depreciationSchedule).toHaveLength(51)
    expect(result.depreciationSchedule.at(-1)?.remainingValue).toBe(0)
  })

  it('rejects invalid construction area and depreciation percentages', () => {
    expect(() =>
      CostApproachCalculator.calculate(constructionParams({ area: 0 }), depreciationParams(), landValue())
    ).toThrow('positive construction area')

    expect(() =>
      CostApproachCalculator.calculate(
        constructionParams(),
        depreciationParams({ economicObsolescencePercent: 101 }),
        landValue()
      )
    ).toThrow('between 0 and 100')
  })
})

describe('IncomeCapitalizationCalculator', () => {
  it('calculates EGI, NOI, cap-rate value, scenarios, and sensitivity ranges', () => {
    const result = IncomeCapitalizationCalculator.calculate(incomeParams(), capRateParams())

    expect(result.grossIncome).toBe(240_000)
    expect(result.effectiveGrossIncome).toBe(228_000)
    expect(result.totalExpenses).toBe(68_000)
    expect(result.netOperatingIncome).toBe(160_000)
    expect(result.propertyValue).toBe(3_200_000)
    expect(result.scenarios).toHaveLength(3)
    expect(result.sensitivityAnalysis.capRateRange).toHaveLength(9)
    expect(result.sensitivityAnalysis.incomeRange).toHaveLength(9)
    expect(result.sensitivityAnalysis.expenseRange).toHaveLength(9)
  })

  it('handles zero vacancy and zero expenses as valid lower boundaries', () => {
    const result = IncomeCapitalizationCalculator.calculate(
      incomeParams({
        vacancyRate: 0,
        operatingExpenses: 0,
        propertyTax: 0,
        insurance: 0,
        maintenance: 0,
        management: 0,
        utilities: 0,
        otherExpenses: 0
      }),
      capRateParams({ finalCapRate: 4 })
    )

    expect(result.effectiveGrossIncome).toBe(240_000)
    expect(result.totalExpenses).toBe(0)
    expect(result.propertyValue).toBe(6_000_000)
    expect(result.expenseBreakdown).toEqual([])
  })

  it('calculates secondary income ratios', () => {
    expect(IncomeCapitalizationCalculator.calculateCapRate(160_000, 3_200_000)).toBe(5)
    expect(IncomeCapitalizationCalculator.calculateGrossRentMultiplier(3_200_000, 240_000)).toBeCloseTo(13.3333, 4)
    expect(IncomeCapitalizationCalculator.calculateDebtServiceCoverage(160_000, 100_000)).toBe(1.6)
  })

  it('rejects zero cap rate and out-of-range vacancy instead of returning Infinity', () => {
    expect(() => IncomeCapitalizationCalculator.calculate(incomeParams(), capRateParams({ finalCapRate: 0 }))).toThrow(
      'positive final cap rate'
    )

    expect(() => IncomeCapitalizationCalculator.calculate(incomeParams({ vacancyRate: 101 }), capRateParams())).toThrow(
      'vacancy rate between 0 and 100'
    )
  })
})

describe('MultiUnitCalculator', () => {
  it('allocates identical units evenly and reconciles exactly to building value', () => {
    const result = MultiUnitCalculator.calculate(buildingParams())

    expect(result.units).toHaveLength(2)
    expect(result.units[0].adjustedValue).toBe(2_000_000)
    expect(result.units[1].adjustedValue).toBe(2_000_000)
    expect(result.totalAllocatedValue).toBe(4_000_000)
    expect(result.reconciliation.difference).toBe(0)
    expect(result.weights.reduce((sum, weight) => sum + weight.totalWeight, 0)).toBe(200)
  })

  it('balances adjusted unit allocations back to the target building value', () => {
    const result = MultiUnitCalculator.calculate(
      buildingParams({
        units: [
          unit({ id: 'basement-poor', unitNumber: 'A', floor: -1, area: 90, condition: 'poor' }),
          unit({ id: 'penthouse-excellent', unitNumber: 'B', floor: 8, area: 110, condition: 'excellent', hasFrontFacing: true, hasBalcony: true, balconyArea: 12 })
        ]
      })
    )

    expect(result.totalAllocatedValue).toBeCloseTo(result.buildingValue)
    expect(result.units.reduce((sum, value) => sum + value.weightShare, 0)).toBeCloseTo(1)
    expect(result.units[1].adjustedValue).toBeGreaterThan(result.units[0].adjustedValue)
    expect(result.reconciliation.adjustmentNeeded).toBe(true)
  })

  it('validates allocation quality and reports reconciliation warnings', () => {
    const result = MultiUnitCalculator.calculate(
      buildingParams({
        units: [
          unit({ id: 'small', unitNumber: '1', area: 40, floor: 0, condition: 'poor' }),
          unit({ id: 'large', unitNumber: '2', area: 160, floor: 8, condition: 'excellent', hasFrontFacing: true, hasBalcony: true, balconyArea: 20 })
        ]
      })
    )

    const validation = MultiUnitCalculator.validateAllocation(result)

    expect(validation.isValid).toBe(false)
    expect(validation.errors.some(error => error.includes('סטייה משמעותית'))).toBe(true)
    expect(validation.warnings.length).toBeGreaterThan(0)
  })

  it('rejects empty unit sets and zero-area units', () => {
    expect(() => MultiUnitCalculator.calculate(buildingParams({ units: [] }))).toThrow('at least one unit')
    expect(() =>
      MultiUnitCalculator.calculate(buildingParams({ units: [unit({ id: 'zero-area', area: 0 })] }))
    ).toThrow('positive area')
  })
})
