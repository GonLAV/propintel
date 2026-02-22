export interface UnitParams {
  id: string
  unitNumber: string
  floor: number
  area: number
  rooms: number
  hasFrontFacing: boolean
  hasBalcony: boolean
  balconyArea: number
  condition: 'poor' | 'fair' | 'good' | 'excellent'
  specificFeatures: string[]
}

export interface BuildingParams {
  totalBuildingValue: number
  totalArea: number
  baseValuePerSqm: number
  units: UnitParams[]
}

export interface UnitWeight {
  unitId: string
  unitNumber: string
  floorWeight: number
  areaWeight: number
  frontFacingWeight: number
  conditionWeight: number
  totalWeight: number
  explanation: string
}

export interface UnitValuation {
  unitId: string
  unitNumber: string
  area: number
  floor: number
  baseValue: number
  adjustedValue: number
  valuePerSqm: number
  weightShare: number
  adjustmentFactors: {
    floor: number
    frontFacing: number
    condition: number
    balcony: number
  }
  narrative: string
}

export interface MultiUnitResult {
  buildingValue: number
  totalArea: number
  baseValuePerSqm: number
  units: UnitValuation[]
  totalAllocatedValue: number
  allocationAccuracy: number
  weights: UnitWeight[]
  formula: string
  narrativeHebrew: string
  reconciliation: {
    targetValue: number
    allocatedValue: number
    difference: number
    differencePercent: number
    adjustmentNeeded: boolean
  }
}

export class MultiUnitCalculator {
  private static FLOOR_WEIGHTS = {
    basement: 0.85,
    ground: 0.92,
    first: 1.00,
    second: 1.03,
    third: 1.05,
    fourth: 1.07,
    fifth: 1.09,
    penthouse: 1.15
  }

  private static CONDITION_MULTIPLIERS = {
    poor: 0.85,
    fair: 0.95,
    good: 1.00,
    excellent: 1.10
  }

  static calculate(params: BuildingParams): MultiUnitResult {
    const weights = this.calculateUnitWeights(params.units)
    const totalWeight = weights.reduce((sum, w) => sum + w.totalWeight, 0)

    const unitValuations: UnitValuation[] = params.units.map(unit => {
      const weight = weights.find(w => w.unitId === unit.id)!
      const weightShare = weight.totalWeight / totalWeight

      const baseValue = params.totalBuildingValue * weightShare

      const floorAdjustment = this.getFloorWeight(unit.floor)
      const frontFacingAdjustment = unit.hasFrontFacing ? 1.05 : 1.0
      const conditionAdjustment = this.CONDITION_MULTIPLIERS[unit.condition]
      const balconyAdjustment = unit.hasBalcony ? 1 + (unit.balconyArea * 0.001) : 1.0

      const totalAdjustment = 
        floorAdjustment * 
        frontFacingAdjustment * 
        conditionAdjustment * 
        balconyAdjustment

      const adjustedValue = baseValue * totalAdjustment
      const valuePerSqm = adjustedValue / unit.area

      const narrative = this.generateUnitNarrative(
        unit,
        baseValue,
        adjustedValue,
        {
          floor: (floorAdjustment - 1) * 100,
          frontFacing: (frontFacingAdjustment - 1) * 100,
          condition: (conditionAdjustment - 1) * 100,
          balcony: (balconyAdjustment - 1) * 100
        }
      )

      return {
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        area: unit.area,
        floor: unit.floor,
        baseValue,
        adjustedValue,
        valuePerSqm,
        weightShare,
        adjustmentFactors: {
          floor: (floorAdjustment - 1) * 100,
          frontFacing: (frontFacingAdjustment - 1) * 100,
          condition: (conditionAdjustment - 1) * 100,
          balcony: (balconyAdjustment - 1) * 100
        },
        narrative
      }
    })

    const totalAllocatedValue = unitValuations.reduce((sum, u) => sum + u.adjustedValue, 0)
    const difference = totalAllocatedValue - params.totalBuildingValue
    const differencePercent = (difference / params.totalBuildingValue) * 100
    const allocationAccuracy = 100 - Math.abs(differencePercent)

    const adjustedUnits = this.balanceAllocations(
      unitValuations,
      params.totalBuildingValue,
      totalAllocatedValue
    )

    const formula = this.generateFormula(params, weights, totalWeight)
    const narrativeHebrew = this.generateNarrative(params, adjustedUnits, weights)

    const reconciliation = {
      targetValue: params.totalBuildingValue,
      allocatedValue: totalAllocatedValue,
      difference,
      differencePercent,
      adjustmentNeeded: Math.abs(differencePercent) > 1
    }

    return {
      buildingValue: params.totalBuildingValue,
      totalArea: params.totalArea,
      baseValuePerSqm: params.baseValuePerSqm,
      units: adjustedUnits,
      totalAllocatedValue: adjustedUnits.reduce((sum, u) => sum + u.adjustedValue, 0),
      allocationAccuracy,
      weights,
      formula,
      narrativeHebrew,
      reconciliation
    }
  }

  private static calculateUnitWeights(units: UnitParams[]): UnitWeight[] {
    return units.map(unit => {
      const areaWeight = unit.area

      const floorWeight = this.getFloorWeight(unit.floor)

      const frontFacingWeight = unit.hasFrontFacing ? 1.1 : 1.0

      const conditionWeight = this.CONDITION_MULTIPLIERS[unit.condition]

      const totalWeight = areaWeight * floorWeight * frontFacingWeight * conditionWeight

      const explanation = 
        `יחידה ${unit.unitNumber}: שטח ${unit.area} מ"ר × משקל קומה ${floorWeight} × ` +
        `חזית ${frontFacingWeight} × מצב ${conditionWeight} = ${totalWeight.toFixed(2)}`

      return {
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        floorWeight,
        areaWeight,
        frontFacingWeight,
        conditionWeight,
        totalWeight,
        explanation
      }
    })
  }

  private static getFloorWeight(floor: number): number {
    if (floor < 0) return this.FLOOR_WEIGHTS.basement
    if (floor === 0) return this.FLOOR_WEIGHTS.ground
    if (floor === 1) return this.FLOOR_WEIGHTS.first
    if (floor === 2) return this.FLOOR_WEIGHTS.second
    if (floor === 3) return this.FLOOR_WEIGHTS.third
    if (floor === 4) return this.FLOOR_WEIGHTS.fourth
    if (floor === 5) return this.FLOOR_WEIGHTS.fifth
    if (floor > 5) return this.FLOOR_WEIGHTS.penthouse
    return 1.0
  }

  private static balanceAllocations(
    units: UnitValuation[],
    targetTotal: number,
    currentTotal: number
  ): UnitValuation[] {
    const adjustmentFactor = targetTotal / currentTotal

    return units.map(unit => ({
      ...unit,
      adjustedValue: unit.adjustedValue * adjustmentFactor,
      valuePerSqm: (unit.adjustedValue * adjustmentFactor) / unit.area
    }))
  }

  private static generateUnitNarrative(
    unit: UnitParams,
    baseValue: number,
    adjustedValue: number,
    factors: UnitValuation['adjustmentFactors']
  ): string {
    const lines: string[] = []

    lines.push(`יחידה ${unit.unitNumber} - קומה ${unit.floor}, שטח ${unit.area} מ"ר`)
    lines.push(`שווי בסיס: ${baseValue.toLocaleString('he-IL')} ₪`)
    
    if (factors.floor !== 0) {
      lines.push(`התאמת קומה: ${factors.floor > 0 ? '+' : ''}${factors.floor.toFixed(1)}%`)
    }
    if (factors.frontFacing !== 0) {
      lines.push(`התאמת חזית: ${factors.frontFacing > 0 ? '+' : ''}${factors.frontFacing.toFixed(1)}%`)
    }
    if (factors.condition !== 0) {
      lines.push(`התאמת מצב: ${factors.condition > 0 ? '+' : ''}${factors.condition.toFixed(1)}%`)
    }
    if (factors.balcony !== 0) {
      lines.push(`התאמת מרפסת: ${factors.balcony > 0 ? '+' : ''}${factors.balcony.toFixed(1)}%`)
    }

    lines.push(`שווי מותאם: ${adjustedValue.toLocaleString('he-IL')} ₪`)
    lines.push(`מחיר למ"ר: ${(adjustedValue / unit.area).toLocaleString('he-IL')} ₪`)

    return lines.join('\n')
  }

  private static generateFormula(
    params: BuildingParams,
    weights: UnitWeight[],
    totalWeight: number
  ): string {
    const lines: string[] = []

    lines.push('נוסחת פיצול שווי בניין:')
    lines.push('')
    lines.push('שלב 1: חישוב משקלים')
    weights.forEach(w => {
      lines.push(`  ${w.explanation}`)
    })
    lines.push('')
    lines.push(`סה"כ משקלים: ${totalWeight.toFixed(2)}`)
    lines.push('')
    lines.push('שלב 2: חלוקת שווי לפי משקל')
    lines.push(`שווי בניין: ${params.totalBuildingValue.toLocaleString('he-IL')} ₪`)
    lines.push('')
    lines.push('שווי יחידה = (משקל יחידה / סה"כ משקלים) × שווי בניין')

    return lines.join('\n')
  }

  private static generateNarrative(
    params: BuildingParams,
    units: UnitValuation[],
    _weights: UnitWeight[]
  ): string {
    const lines: string[] = []

    lines.push('חלוקת שווי בניין ליחידות')
    lines.push('='.repeat(60))
    lines.push('')
    lines.push(`שווי הבניין הכולל: ${params.totalBuildingValue.toLocaleString('he-IL')} ₪`)
    lines.push(`שטח כולל: ${params.totalArea.toLocaleString('he-IL')} מ"ר`)
    lines.push(`מספר יחידות: ${units.length}`)
    lines.push('')
    lines.push('השווי חולק בין היחידות על בסיס:')
    lines.push('• שטח היחידה (משקל עיקרי)')
    lines.push('• מיקום בבניין (קומה)')
    lines.push('• חזית / פנים')
    lines.push('• מצב פיזי')
    lines.push('• תוספות (מרפסת, מחסן, וכו\')')
    lines.push('')
    lines.push('פירוט שווי יחידות:')
    lines.push('-'.repeat(60))

    units.forEach(unit => {
      lines.push(`\nיחידה ${unit.unitNumber}:`)
      lines.push(`  שטח: ${unit.area} מ"ר`)
      lines.push(`  שווי: ${unit.adjustedValue.toLocaleString('he-IL')} ₪`)
      lines.push(`  מחיר למ"ר: ${unit.valuePerSqm.toLocaleString('he-IL')} ₪`)
      lines.push(`  חלק מהבניין: ${(unit.weightShare * 100).toFixed(2)}%`)
    })

    lines.push('')
    lines.push('-'.repeat(60))
    const totalValue = units.reduce((sum, u) => sum + u.adjustedValue, 0)
    lines.push(`סה"כ: ${totalValue.toLocaleString('he-IL')} ₪`)

    return lines.join('\n')
  }

  static createAllocationTable(result: MultiUnitResult): string {
    const lines: string[] = []
    
    lines.push('טבלת פיצול שווי יחידות')
    lines.push('='.repeat(120))
    lines.push('')
    
    const header = [
      'יחידה'.padEnd(10),
      'קומה'.padStart(6),
      'שטח'.padStart(8),
      'משקל'.padStart(10),
      'חלק'.padStart(8),
      'שווי'.padStart(18),
      '₪/מ"ר'.padStart(15)
    ].join(' | ')
    
    lines.push(header)
    lines.push('-'.repeat(120))

    result.units.forEach(unit => {
      const weight = result.weights.find(w => w.unitId === unit.unitId)!
      const row = [
        unit.unitNumber.padEnd(10),
        unit.floor.toString().padStart(6),
        `${unit.area} מ"ר`.padStart(8),
        weight.totalWeight.toFixed(2).padStart(10),
        `${(unit.weightShare * 100).toFixed(1)}%`.padStart(8),
        unit.adjustedValue.toLocaleString('he-IL').padStart(18),
        unit.valuePerSqm.toLocaleString('he-IL').padStart(15)
      ].join(' | ')
      lines.push(row)
    })

    lines.push('-'.repeat(120))
    const totalValue = result.units.reduce((sum, u) => sum + u.adjustedValue, 0)
    const avgPerSqm = totalValue / result.totalArea
    
    lines.push(
      'סה"כ'.padEnd(10) + ' | '.padStart(6) +
      `${result.totalArea} מ"ר`.padStart(8) + ' | '.padStart(10) +
      '100.0%'.padStart(8) + ' | ' +
      totalValue.toLocaleString('he-IL').padStart(18) + ' | ' +
      avgPerSqm.toLocaleString('he-IL').padStart(15)
    )

    return lines.join('\n')
  }

  static validateAllocation(result: MultiUnitResult): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (Math.abs(result.reconciliation.differencePercent) > 5) {
      errors.push(
        `סטייה משמעותית מהשווי הכולל: ${result.reconciliation.differencePercent.toFixed(2)}%`
      )
    }

    if (Math.abs(result.reconciliation.differencePercent) > 1) {
      warnings.push(
        `סטייה קלה מהשווי הכולל: ${result.reconciliation.differencePercent.toFixed(2)}%`
      )
    }

    const pricesPerSqm = result.units.map(u => u.valuePerSqm)
    const avgPrice = pricesPerSqm.reduce((sum, p) => sum + p, 0) / pricesPerSqm.length
    const maxDeviation = Math.max(...pricesPerSqm.map(p => Math.abs(p - avgPrice) / avgPrice))

    if (maxDeviation > 0.5) {
      warnings.push(
        `סטייה גבוהה במחירים למ"ר בין היחידות: ${(maxDeviation * 100).toFixed(1)}%`
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}
