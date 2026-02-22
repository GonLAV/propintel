export interface ConstructionCostParams {
  buildingType: 'residential' | 'commercial' | 'industrial' | 'luxury'
  quality: 'basic' | 'standard' | 'high' | 'luxury'
  area: number
  floors: number
  finishLevel: 'shell' | 'basic' | 'standard' | 'premium'
}

export interface DepreciationParams {
  buildingAge: number
  effectiveAge: number
  totalLifespan: number
  physicalDeteriorationPercent: number
  functionalObsolescencePercent: number
  economicObsolescencePercent: number
}

export interface LandValue {
  landArea: number
  pricePerSqm: number
  totalLandValue: number
  source: string
  valuationDate: Date
}

export interface CostApproachResult {
  landValue: number
  reproductionCost: number
  replacementCost: number
  totalDepreciation: number
  depreciatedValue: number
  finalValue: number
  breakdown: {
    landValue: number
    buildingCost: number
    physicalDepreciation: number
    functionalObsolescence: number
    economicObsolescence: number
  }
  formula: string
  narrativeHebrew: string
  depreciationSchedule: DepreciationBreakdown[]
}

export interface DepreciationBreakdown {
  year: number
  age: number
  annualDepreciation: number
  cumulativeDepreciation: number
  remainingValue: number
  depreciationPercent: number
}

export class CostApproachCalculator {
  private static CONSTRUCTION_COSTS = {
    residential: {
      basic: 4500,
      standard: 6000,
      high: 8500,
      luxury: 12000
    },
    commercial: {
      basic: 5000,
      standard: 7000,
      high: 10000,
      luxury: 15000
    },
    industrial: {
      basic: 3500,
      standard: 5000,
      high: 7000,
      luxury: 10000
    },
    luxury: {
      basic: 8000,
      standard: 12000,
      high: 16000,
      luxury: 25000
    }
  }

  private static FINISH_LEVEL_MULTIPLIERS = {
    shell: 0.65,
    basic: 0.85,
    standard: 1.0,
    premium: 1.25
  }

  private static LIFESPAN_YEARS = {
    residential: 75,
    commercial: 60,
    industrial: 50,
    luxury: 100
  }

  static calculate(
    constructionParams: ConstructionCostParams,
    depreciationParams: DepreciationParams,
    landValue: LandValue,
    costSource: string = 'מחירון דקל 2024'
  ): CostApproachResult {
    const baseCostPerSqm = this.getConstructionCost(
      constructionParams.buildingType,
      constructionParams.quality
    )

    const finishMultiplier = this.FINISH_LEVEL_MULTIPLIERS[constructionParams.finishLevel]
    const adjustedCostPerSqm = baseCostPerSqm * finishMultiplier

    const reproductionCost = adjustedCostPerSqm * constructionParams.area
    const replacementCost = reproductionCost

    const physicalDepreciation = this.calculatePhysicalDepreciation(
      depreciationParams.buildingAge,
      depreciationParams.totalLifespan,
      reproductionCost
    )

    const functionalObsolescence = (reproductionCost * depreciationParams.functionalObsolescencePercent) / 100
    const economicObsolescence = (reproductionCost * depreciationParams.economicObsolescencePercent) / 100

    const totalDepreciation = physicalDepreciation + functionalObsolescence + economicObsolescence
    const depreciatedValue = reproductionCost - totalDepreciation

    const finalValue = landValue.totalLandValue + depreciatedValue

    const depreciationSchedule = this.generateDepreciationSchedule(
      reproductionCost,
      depreciationParams.totalLifespan,
      depreciationParams.buildingAge
    )

    const formula = this.generateFormula(
      landValue.totalLandValue,
      reproductionCost,
      totalDepreciation
    )

    const narrativeHebrew = this.generateNarrative(
      constructionParams,
      landValue,
      reproductionCost,
      totalDepreciation,
      finalValue,
      costSource
    )

    return {
      landValue: landValue.totalLandValue,
      reproductionCost,
      replacementCost,
      totalDepreciation,
      depreciatedValue,
      finalValue,
      breakdown: {
        landValue: landValue.totalLandValue,
        buildingCost: reproductionCost,
        physicalDepreciation,
        functionalObsolescence,
        economicObsolescence
      },
      formula,
      narrativeHebrew,
      depreciationSchedule
    }
  }

  private static getConstructionCost(
    buildingType: ConstructionCostParams['buildingType'],
    quality: ConstructionCostParams['quality']
  ): number {
    return this.CONSTRUCTION_COSTS[buildingType][quality]
  }

  private static calculatePhysicalDepreciation(
    age: number,
    lifespan: number,
    buildingCost: number
  ): number {
    const depreciationPercent = Math.min((age / lifespan) * 100, 100)
    return (buildingCost * depreciationPercent) / 100
  }

  private static generateDepreciationSchedule(
    initialValue: number,
    lifespan: number,
    currentAge: number
  ): DepreciationBreakdown[] {
    const schedule: DepreciationBreakdown[] = []
    const annualDepreciationRate = 100 / lifespan

    for (let year = 0; year <= Math.min(currentAge, lifespan); year++) {
      const depreciationPercent = Math.min((year / lifespan) * 100, 100)
      const cumulativeDepreciation = (initialValue * depreciationPercent) / 100
      const remainingValue = initialValue - cumulativeDepreciation
      const annualDepreciation = year > 0 ? (initialValue * annualDepreciationRate) / 100 : 0

      schedule.push({
        year,
        age: year,
        annualDepreciation,
        cumulativeDepreciation,
        remainingValue,
        depreciationPercent
      })
    }

    return schedule
  }

  private static generateFormula(
    landValue: number,
    buildingCost: number,
    totalDepreciation: number
  ): string {
    return (
      `שווי = ערך קרקע + (עלות בנייה - פחת)\n` +
      `שווי = ${landValue.toLocaleString('he-IL')} + (${buildingCost.toLocaleString('he-IL')} - ${totalDepreciation.toLocaleString('he-IL')})\n` +
      `שווי = ${landValue.toLocaleString('he-IL')} + ${(buildingCost - totalDepreciation).toLocaleString('he-IL')}\n` +
      `שווי = ${(landValue + buildingCost - totalDepreciation).toLocaleString('he-IL')} ₪`
    )
  }

  private static generateNarrative(
    constructionParams: ConstructionCostParams,
    landValue: LandValue,
    reproductionCost: number,
    totalDepreciation: number,
    finalValue: number,
    costSource: string
  ): string {
    const lines: string[] = []

    lines.push('שיטת העלות')
    lines.push('='.repeat(60))
    lines.push('')
    lines.push('שווי הנכס חושב לפי שיטת העלות, המבוססת על עלות הבנייה בניכוי פחת ובתוספת ערך הקרקע.')
    lines.push('')

    lines.push('1. ערך הקרקע:')
    lines.push(`   שטח הקרקע: ${landValue.landArea.toLocaleString('he-IL')} מ"ר`)
    lines.push(`   מחיר למ"ר: ${landValue.pricePerSqm.toLocaleString('he-IL')} ₪`)
    lines.push(`   ערך כולל: ${landValue.totalLandValue.toLocaleString('he-IL')} ₪`)
    lines.push(`   מקור: ${landValue.source}`)
    lines.push('')

    const buildingTypeHebrew = {
      residential: 'מגורים',
      commercial: 'מסחרי',
      industrial: 'תעשייה',
      luxury: 'יוקרה'
    }

    const qualityHebrew = {
      basic: 'בסיסית',
      standard: 'סטנדרטית',
      high: 'גבוהה',
      luxury: 'יוקרה'
    }

    lines.push('2. עלות הבנייה:')
    lines.push(`   סוג מבנה: ${buildingTypeHebrew[constructionParams.buildingType]}`)
    lines.push(`   רמת איכות: ${qualityHebrew[constructionParams.quality]}`)
    lines.push(`   שטח בנוי: ${constructionParams.area.toLocaleString('he-IL')} מ"ר`)
    lines.push(`   עלות בנייה כוללת: ${reproductionCost.toLocaleString('he-IL')} ₪`)
    lines.push(`   מקור: ${costSource}`)
    lines.push('')

    lines.push('3. פחת:')
    const depreciationPercent = (totalDepreciation / reproductionCost) * 100
    lines.push(`   פחת כולל: ${totalDepreciation.toLocaleString('he-IL')} ₪ (${depreciationPercent.toFixed(1)}%)`)
    lines.push('')

    lines.push('4. שווי סופי:')
    lines.push(`   ערך קרקע: ${landValue.totalLandValue.toLocaleString('he-IL')} ₪`)
    lines.push(`   עלות בנייה לאחר פחת: ${(reproductionCost - totalDepreciation).toLocaleString('he-IL')} ₪`)
    lines.push(`   שווי כולל: ${finalValue.toLocaleString('he-IL')} ₪`)

    return lines.join('\n')
  }

  static createDepreciationReport(schedule: DepreciationBreakdown[]): string {
    const lines: string[] = []
    
    lines.push('לוח פחת מפורט')
    lines.push('='.repeat(100))
    lines.push('')
    lines.push('שנה | גיל | פחת שנתי | פחת מצטבר | ערך נותר | אחוז פחת')
    lines.push('-'.repeat(100))

    schedule.forEach(item => {
      const row = [
        item.year.toString().padStart(4),
        item.age.toString().padStart(4),
        item.annualDepreciation.toLocaleString('he-IL').padStart(15),
        item.cumulativeDepreciation.toLocaleString('he-IL').padStart(15),
        item.remainingValue.toLocaleString('he-IL').padStart(15),
        `${item.depreciationPercent.toFixed(2)}%`.padStart(10)
      ]
      lines.push(row.join(' | '))
    })

    return lines.join('\n')
  }

  static updateCostIndex(
    baseCost: number,
    baseYear: number,
    currentYear: number,
    indexChange: number
  ): number {
    const _years = currentYear - baseYear
    return baseCost * (1 + indexChange / 100)
  }
}
