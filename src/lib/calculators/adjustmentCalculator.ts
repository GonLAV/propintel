export interface AdjustmentFactor {
  id: string
  name: string
  nameHebrew: string
  type: 'percentage' | 'absolute' | 'perSqm'
  value: number
  applied: boolean
  reasoning: string
  source: string
  category: 'physical' | 'location' | 'time' | 'condition' | 'amenities'
}

export interface AdjustmentCalculation {
  basePrice: number
  basePricePerSqm: number
  area: number
  adjustments: AdjustmentFactor[]
  totalAdjustmentPercentage: number
  adjustedPrice: number
  adjustedPricePerSqm: number
  breakdown: AdjustmentBreakdown[]
  formula: string
  narrativeHebrew: string
}

export interface AdjustmentBreakdown {
  step: number
  description: string
  calculation: string
  value: number
  runningTotal: number
}

export class AdjustmentCalculator {
  private static STANDARD_ADJUSTMENTS = {
    floor: {
      ground: -3,
      first: 0,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      penthouse: 8,
      basement: -15
    },
    elevator: {
      withElevator: 0,
      withoutElevatorUpTo3: -2,
      withoutElevatorAbove3: -5
    },
    parking: {
      none: 0,
      single: 7,
      double: 12,
      covered: 10
    },
    storage: {
      none: 0,
      small: 2,
      medium: 3,
      large: 5
    },
    condition: {
      poor: -15,
      fair: -8,
      good: 0,
      veryGood: 5,
      excellent: 10,
      renovated: 15
    },
    age: {
      new: 10,
      upTo5: 5,
      upTo10: 0,
      upTo20: -5,
      upTo30: -10,
      above30: -15
    },
    direction: {
      north: -3,
      south: 5,
      east: 2,
      west: 0,
      seaView: 15,
      parkView: 8,
      cityView: 5
    }
  }

  static calculateAdjustments(
    basePrice: number,
    area: number,
    adjustments: AdjustmentFactor[]
  ): AdjustmentCalculation {
    const basePricePerSqm = basePrice / area
    const breakdown: AdjustmentBreakdown[] = []
    
    breakdown.push({
      step: 0,
      description: 'מחיר בסיס',
      calculation: `${basePrice.toLocaleString('he-IL')} ₪`,
      value: basePrice,
      runningTotal: basePrice
    })

    let runningTotal = basePrice
    let totalAdjustmentPercentage = 0
    const appliedAdjustments = adjustments.filter(a => a.applied)

    appliedAdjustments.forEach((adj, index) => {
      let adjustmentValue = 0
      
      if (adj.type === 'percentage') {
        adjustmentValue = (runningTotal * adj.value) / 100
      } else if (adj.type === 'absolute') {
        adjustmentValue = adj.value
      } else if (adj.type === 'perSqm') {
        adjustmentValue = adj.value * area
      }

      runningTotal += adjustmentValue
      totalAdjustmentPercentage += adj.value

      breakdown.push({
        step: index + 1,
        description: `${adj.nameHebrew} (${adj.value > 0 ? '+' : ''}${adj.value}%)`,
        calculation: adj.type === 'percentage' 
          ? `${breakdown[index].runningTotal.toLocaleString('he-IL')} × ${adj.value}% = ${adjustmentValue.toLocaleString('he-IL')}`
          : `${adjustmentValue.toLocaleString('he-IL')} ₪`,
        value: adjustmentValue,
        runningTotal
      })
    })

    const adjustedPrice = runningTotal
    const adjustedPricePerSqm = adjustedPrice / area

    const formula = this.generateFormula(basePrice, appliedAdjustments)
    const narrativeHebrew = this.generateNarrative(
      basePrice,
      adjustedPrice,
      area,
      appliedAdjustments
    )

    return {
      basePrice,
      basePricePerSqm,
      area,
      adjustments,
      totalAdjustmentPercentage,
      adjustedPrice,
      adjustedPricePerSqm,
      breakdown,
      formula,
      narrativeHebrew
    }
  }

  private static generateFormula(
    basePrice: number,
    adjustments: AdjustmentFactor[]
  ): string {
    if (adjustments.length === 0) {
      return `שווי = ${basePrice.toLocaleString('he-IL')} ₪`
    }

    const adjustmentTerms = adjustments
      .map(a => `(1 ${a.value >= 0 ? '+' : '-'} ${Math.abs(a.value)}%)`)
      .join(' × ')

    return `שווי = ${basePrice.toLocaleString('he-IL')} × ${adjustmentTerms}`
  }

  private static generateNarrative(
    basePrice: number,
    adjustedPrice: number,
    area: number,
    adjustments: AdjustmentFactor[]
  ): string {
    const lines: string[] = []
    
    lines.push(`מחיר הבסיס נקבע על ${basePrice.toLocaleString('he-IL')} ₪ (${(basePrice / area).toLocaleString('he-IL')} ₪/מ"ר).`)
    
    if (adjustments.length > 0) {
      lines.push('\nבוצעו ההתאמות הבאות:')
      adjustments.forEach(adj => {
        lines.push(`• ${adj.nameHebrew}: ${adj.value > 0 ? '+' : ''}${adj.value}% - ${adj.reasoning}`)
      })
    }

    const totalChange = ((adjustedPrice - basePrice) / basePrice) * 100
    lines.push(
      `\nלאחר ביצוע כלל ההתאמות, השווי המותאם עומד על ${adjustedPrice.toLocaleString('he-IL')} ₪ ` +
      `(${(adjustedPrice / area).toLocaleString('he-IL')} ₪/מ"ר), ` +
      `המהווה שינוי של ${totalChange.toFixed(2)}% ממחיר הבסיס.`
    )

    return lines.join('\n')
  }

  static getStandardAdjustment(
    category: keyof typeof AdjustmentCalculator.STANDARD_ADJUSTMENTS,
    subcategory: string
  ): number {
    const categoryData = this.STANDARD_ADJUSTMENTS[category] as Record<string, number>
    return categoryData[subcategory] ?? 0
  }

  static createFloorAdjustment(floor: number, hasElevator: boolean): AdjustmentFactor {
    let value = 0
    let reasoning = ''
    
    if (hasElevator) {
      value = Math.min(floor * 0.5, 5)
      reasoning = `בניין עם מעלית - התאמה של ${value}% לקומה ${floor}`
    } else {
      if (floor <= 3) {
        value = -2
        reasoning = `ללא מעלית עד קומה 3 - התאמה של ${value}%`
      } else {
        value = -5 - (floor - 3)
        reasoning = `ללא מעלית מעל קומה 3 - התאמה של ${value}%`
      }
    }

    return {
      id: 'floor',
      name: 'Floor Adjustment',
      nameHebrew: 'התאמת קומה',
      type: 'percentage',
      value,
      applied: true,
      reasoning,
      source: 'תקן שמאי 19 - סעיף 4.2',
      category: 'physical'
    }
  }

  static createConditionAdjustment(
    condition: keyof typeof AdjustmentCalculator.STANDARD_ADJUSTMENTS.condition
  ): AdjustmentFactor {
    const value = this.STANDARD_ADJUSTMENTS.condition[condition]
    
    const conditionNames: Record<string, string> = {
      poor: 'גרוע',
      fair: 'בינוני',
      good: 'טוב',
      veryGood: 'טוב מאוד',
      excellent: 'מצוין',
      renovated: 'משופץ'
    }

    return {
      id: 'condition',
      name: 'Condition Adjustment',
      nameHebrew: 'התאמת מצב פיזי',
      type: 'percentage',
      value,
      applied: true,
      reasoning: `מצב הנכס מוגדר כ${conditionNames[condition]}`,
      source: 'תקן שמאי 19 - סעיף 5.1',
      category: 'condition'
    }
  }

  static createTimeAdjustment(
    transactionDate: Date,
    valuationDate: Date,
    indexChange: number
  ): AdjustmentFactor {
    const monthsDiff = Math.floor(
      (valuationDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )

    return {
      id: 'time',
      name: 'Time Adjustment',
      nameHebrew: 'התאמת זמן',
      type: 'percentage',
      value: indexChange,
      applied: true,
      reasoning: `הצמדה למדד על פני ${monthsDiff} חודשים (שינוי של ${indexChange}%)`,
      source: 'מדד המחירים לצרכן - לשכת הסטטיסטיקה המרכזית',
      category: 'time'
    }
  }
}
