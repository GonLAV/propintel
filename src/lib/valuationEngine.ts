import type { Property, Comparable, PropertyCondition, ValuationResult, ValuationQualityCheck, ValuationCalculation } from './types'
import {
  CONDITION_MULTIPLIERS,
  FLOOR_ADJUSTMENTS,
  MAX_FLOOR_KEY,
  FEATURE_VALUES,
  EFFECTIVE_AGE_FACTORS,
  LOCATION_DISTANCE_ADJUSTMENTS,
  LOCATION_DEFAULT_ADJUSTMENT,
  SIZE_ADJUSTMENT_NOOP_THRESHOLD,
  SIZE_ADJUSTMENT_FACTOR,
  AGE_ADJUSTMENT_STEPS,
  AGE_DEFAULT_ADJUSTMENT
} from './valuationTables'

export type { ValuationResult, ValuationQualityCheck, ValuationCalculation }

export interface AdjustmentFactors {
  location: number
  size: number
  condition: number
  floor: number
  age: number
  features: number
}

export class ValuationEngine {

  /**
   * Reconcile multiple method results into a single hybrid result.
   * This does not re-run calculations; it only combines outputs.
   */
  static reconcileValuations(
    results: ValuationResult[],
    weights?: Partial<Record<ValuationResult['method'], number>>
  ): ValuationResult {
    if (results.length === 0) {
      throw new Error('אין תוצאות לשקלול')
    }

    const defaultWeights: Record<ValuationResult['method'], number> = {
      'comparable-sales': 0.6,
      'income-approach': 0.6,
      'cost-approach': 0.4,
      'hybrid': 0
    }

    const methodWeights = results.map(r => {
      const w = weights?.[r.method] ?? defaultWeights[r.method] ?? 1
      return { result: r, weight: Math.max(w, 0) }
    }).filter(x => x.weight > 0)

    const totalWeight = methodWeights.reduce((sum, x) => sum + x.weight, 0)
    const weightedValue = methodWeights.reduce((sum, x) => sum + x.result.estimatedValue * x.weight, 0) / totalWeight
    const estimatedValue = Math.round(weightedValue / 1000) * 1000

    const mins = results.map(r => r.valueRange.min)
    const maxs = results.map(r => r.valueRange.max)
    const valueRange = {
      min: Math.round(Math.min(...mins) / 1000) * 1000,
      max: Math.round(Math.max(...maxs) / 1000) * 1000
    }

    const confidence = Math.round(
      methodWeights.reduce((sum, x) => sum + x.result.confidence * x.weight, 0) / totalWeight
    )

    const allChecks = results.flatMap(r => r.qualityChecks || [])
    const divergenceCheck = this.buildDivergenceCheck(results)

    return {
      method: 'hybrid',
      estimatedValue,
      valueRange,
      confidence,
      methodology: 'שקלול תוצאות בין שיטות שומה (Reconciliation) על בסיס משקולות והערכת איכות הנתונים.',
      calculations: [
        {
          step: 'שקלול בין שיטות',
          description: `שקלול ${results.length} תוצאות שומה`,
          formula: 'Σ(שווי שיטה × משקל) / Σ(משקלות)',
          inputs: Object.fromEntries(methodWeights.map(x => [x.result.method, x.weight])),
          result: estimatedValue
        }
      ],
      reconciliation: this.buildHybridReconciliation(results, estimatedValue),
      assumptions: Array.from(new Set(results.flatMap(r => r.assumptions))),
      limitations: Array.from(new Set(results.flatMap(r => r.limitations))),
      qualityChecks: divergenceCheck ? [...allChecks, divergenceCheck] : allChecks
    }
  }
  
  static calculateComparableSalesApproach(
    property: Property,
    comparables: Comparable[]
  ): ValuationResult {
    const selectedComps = comparables.filter(c => c.selected)
    
    if (selectedComps.length === 0) {
      throw new Error('אין נכסים להשוואה שנבחרו')
    }

    const calculations: ValuationCalculation[] = []
    
    const adjustedPrices = selectedComps.map(comp => {
      const adjustments = this.calculateAdjustments(property, comp)
      return {
        comparable: comp,
        adjustments,
        adjustedPrice: comp.salePrice * (1 + adjustments.total)
      }
    })

    const avgAdjustedPrice = adjustedPrices.reduce((sum, item) => sum + item.adjustedPrice, 0) / adjustedPrices.length
    
    calculations.push({
      step: 'ממוצע מחירים מתואמים',
      description: `ממוצע ${selectedComps.length} עסקאות דומות לאחר התאמות`,
      formula: 'Σ(מחיר עסקה × (1 + התאמות)) / מספר עסקאות',
      inputs: {
        'מספר עסקאות': selectedComps.length,
        'טווח מחירים': `₪${Math.min(...adjustedPrices.map(p => p.adjustedPrice)).toLocaleString()} - ₪${Math.max(...adjustedPrices.map(p => p.adjustedPrice)).toLocaleString()}`
      },
      result: avgAdjustedPrice
    })

    const weightedValue = this.applyWeightedReconciliation(adjustedPrices)
    
    calculations.push({
      step: 'שווי משוקלל',
      description: 'ערך סופי לאחר שקלול עסקאות לפי רלוונטיות',
      formula: 'Σ(מחיר מתואם × משקל דמיון) / Σ(משקלות)',
      inputs: {
        'משקלול': 'לפי ציון דמיון'
      },
      result: weightedValue
    })

    const finalValue = Math.round(weightedValue / 1000) * 1000
    const standardDeviation = this.calculateStandardDeviation(adjustedPrices.map(p => p.adjustedPrice))
    const valueRange = {
      min: Math.round((finalValue - standardDeviation) / 1000) * 1000,
      max: Math.round((finalValue + standardDeviation) / 1000) * 1000
    }

    const confidence = this.calculateConfidence(selectedComps, standardDeviation, avgAdjustedPrice)

    const qualityChecks = this.buildComparableQualityChecks(selectedComps, adjustedPrices, standardDeviation, avgAdjustedPrice)

    return {
      method: 'comparable-sales',
      estimatedValue: finalValue,
      valueRange,
      confidence,
      methodology: this.generateComparableMethodology(selectedComps.length, property),
      calculations,
      reconciliation: this.generateReconciliation(adjustedPrices, finalValue, confidence),
      assumptions: this.generateAssumptions('comparable-sales'),
      limitations: this.generateLimitations('comparable-sales', selectedComps.length),
      qualityChecks
    }
  }

  static calculateComparableSalesApproachProfessional(
    property: Property,
    comparables: Comparable[]
  ): ValuationResult {
    const valuationDate = new Date(property.updatedAt || new Date().toISOString())
    const filtered = this.hardFilterComparables(property, comparables)
    if (filtered.length === 0) {
      throw new Error('לא נמצאו עסקאות מתאימות לאחר סינון איכותי')
    }

    const marketPpsqm = this.computeMarketPricePerSqm(filtered)
    const floorCoeff = 10000
    const conditionCoeff = 0.03
    const planningFactor = 0.05

    const adjusted = filtered.map(comp => {
      const breakdown = this.adjustTransactionAbsolute(property, comp, marketPpsqm, floorCoeff, conditionCoeff, planningFactor)
      const timeW = this.timeDecay(comp.saleDate, valuationDate)
      const distW = this.distanceDecay(comp.distance)
      const qualityW = this.dataQualityScore(comp, breakdown)
      const weight = timeW * distW * qualityW
      return { comparable: comp, breakdown, adjustedPrice: breakdown.adjustedPrice, weight }
    })

    const totalWeight = adjusted.reduce((s, a) => s + a.weight, 0)
    const weightedSum = adjusted.reduce((s, a) => s + a.adjustedPrice * a.weight, 0)
    const finalValueRaw = weightedSum / totalWeight
    const finalValue = Math.round(finalValueRaw / 1000) * 1000

    const prices = adjusted.map(a => a.adjustedPrice)
    const std = this.calculateStandardDeviation(prices)
    const valueRange = {
      min: Math.round((finalValueRaw - std) / 1000) * 1000,
      max: Math.round((finalValueRaw + std) / 1000) * 1000
    }

    const confidence = this.calculateConfidence(filtered, std, finalValueRaw)

    const calculations: ValuationCalculation[] = [
      {
        step: 'שווי למ"ר בשוק',
        description: 'ממוצע שווי למ"ר בעסקאות לאחר סינון איכותי',
        formula: 'Σ(מחיר למ"ר) / מספר עסקאות',
        inputs: { 'מספר עסקאות': filtered.length },
        result: marketPpsqm
      },
      {
        step: 'שקלול עסקאות',
        description: 'שקלול מחירים מתוקנים לפי זמן, מרחק ואיכות נתונים',
        formula: 'Σ(מחיר מתוקן × משקל) / Σ(משקלות)',
        inputs: { 'Σ משקלות': totalWeight },
        result: finalValue
      }
    ]

    const qualityChecks = this.buildComparableQualityChecks(filtered, adjusted.map(a => ({ comparable: a.comparable, adjustments: { total: 0 }, adjustedPrice: a.adjustedPrice })), std, finalValueRaw)

    const details = adjusted.map(a => ({
      id: a.comparable.id,
      address: a.comparable.address,
      basePrice: a.comparable.salePrice,
      adjustedPrice: a.adjustedPrice,
      weight: a.weight,
      adjustments: a.breakdown.adjustments
    }))

    return {
      method: 'comparable-sales',
      estimatedValue: finalValue,
      valueRange,
      confidence,
      methodology: 'שיטת ההשוואה מקצועית עם סינון קשיח, התאמות אבסולוטיות ושקלול לפי זמן/מרחק/איכות נתונים.',
      calculations,
      reconciliation: `שווי סופי נקבע בשקלול ${filtered.length} עסקאות לאחר התאמות ושקלול לפי זמן ומרחק.`,
      assumptions: this.generateAssumptions('comparable-sales'),
      limitations: this.generateLimitations('comparable-sales', filtered.length),
      qualityChecks,
      transactionDetails: details
    }
  }

  private static dynamicRadiusKm(city: string): number {
    const dense = ['תל אביב', 'ירושלים', 'חיפה', 'רמת גן', 'גבעתיים']
    return dense.includes(city) ? 1.0 : 3.0
  }

  private static hardFilterComparables(property: Property, comps: Comparable[]): Comparable[] {
    const radius = this.dynamicRadiusKm(property.address.city)
    const subjectArea = property.details.builtArea
    return comps.filter(c => {
      const areaOk = Math.abs(c.builtArea - subjectArea) / subjectArea <= 0.25
      const priceOk = c.salePrice > 0
      const distanceOk = typeof c.distance === 'number' ? c.distance <= radius : true
      return areaOk && priceOk && distanceOk && c.selected
    })
  }

  private static timeDecay(saleDate: string, valuationDate: Date): number {
    const months = Math.max(0, (valuationDate.getTime() - new Date(saleDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
    const decay = Math.exp(-months / 24)
    return Math.min(1, Math.max(0.5, decay))
  }

  private static distanceDecay(distanceKm: number): number {
    if (!(distanceKm > 0)) return 1
    const decay = Math.exp(-distanceKm / 2)
    return Math.min(1, Math.max(0.5, decay))
  }

  private static dataQualityScore(comp: Comparable, breakdown: { adjustments: Record<string, number> }): number {
    let score = 1
    const keys = Object.keys(breakdown.adjustments)
    if (keys.length < 3) score *= 0.9
    return score
  }

  private static computeMarketPricePerSqm(comps: Comparable[]): number {
    const values = comps.map(c => c.salePrice / Math.max(1, c.builtArea))
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    return Math.round(avg)
  }

  private static adjustTransactionAbsolute(
    property: Property,
    comp: Comparable,
    marketPricePerSqm: number,
    floorCoefficient: number,
    conditionCoefficient: number,
    planningValueFactor: number
  ): { adjustedPrice: number; adjustments: Record<string, number> } {
    const base = comp.salePrice
    const areaAdj = (property.details.builtArea - comp.builtArea) * marketPricePerSqm * 0.6
    const floorAdj = (property.details.floor - comp.floor) * floorCoefficient
    const condMap: Record<PropertyCondition, number> = {
      new: 1.0,
      excellent: 0.95,
      good: 0.9,
      fair: 0.85,
      poor: 0.8,
      'renovation-needed': 0.75
    }
    const subjectCond = condMap[property.details.condition]
    const compCond = subjectCond
    const conditionAdj = (subjectCond - compCond) * base * conditionCoefficient
    const planningAdj = 0 * planningValueFactor
    const adjustedPrice = base + areaAdj + floorAdj + conditionAdj + planningAdj
    return { adjustedPrice, adjustments: { areaAdj, floorAdj, conditionAdj, planningAdj } }
  }

  static calculateCostApproach(property: Property, landValue: number, constructionCostPerSqm: number): ValuationResult {
    const calculations: ValuationCalculation[] = []
    
    const buildingAge = new Date().getFullYear() - property.details.buildYear
    const effectiveAge = this.calculateEffectiveAge(buildingAge, property.details.condition)
    const economicLife = 60
    
    calculations.push({
      step: 'ערך קרקע',
      description: 'שווי הקרקע כפי שנקבע',
      formula: 'ערך קרקע',
      inputs: {
        'ערך קרקע מוערך': `₪${landValue.toLocaleString()}`
      },
      result: landValue
    })

    const buildingCost = property.details.builtArea * constructionCostPerSqm
    
    calculations.push({
      step: 'עלות בנייה',
      description: 'עלות בנייה חדשה של המבנה',
      formula: 'שטח בנוי × עלות בנייה למ"ר',
      inputs: {
        'שטח בנוי': property.details.builtArea,
        'עלות למ"ר': constructionCostPerSqm
      },
      result: buildingCost
    })

    const depreciationRate = effectiveAge / economicLife
    const depreciation = buildingCost * depreciationRate
    
    calculations.push({
      step: 'פחת',
      description: 'פחת מצטבר בגין גיל ובלאי',
      formula: '(גיל אפקטיבי / אורך חיים כלכלי) × עלות בנייה',
      inputs: {
        'גיל אפקטיבי': effectiveAge,
        'אורך חיים כלכלי': economicLife,
        'שיעור פחת': `${(depreciationRate * 100).toFixed(1)}%`
      },
      result: depreciation
    })

    const buildingValue = buildingCost - depreciation
    const totalValue = Math.round((landValue + buildingValue) / 1000) * 1000

    calculations.push({
      step: 'שווי כולל',
      description: 'ערך קרקע + ערך מבנה לאחר פחת',
      formula: 'ערך קרקע + (עלות בנייה - פחת)',
      inputs: {
        'ערך קרקע': landValue,
        'ערך מבנה': buildingValue
      },
      result: totalValue
    })

    const valueRange = {
      min: Math.round(totalValue * 0.90 / 1000) * 1000,
      max: Math.round(totalValue * 1.10 / 1000) * 1000
    }

    const qualityChecks = this.buildCostQualityChecks({ landValue, constructionCostPerSqm, depreciationRate })

    return {
      method: 'cost-approach',
      estimatedValue: totalValue,
      valueRange,
      confidence: 75,
      methodology: this.generateCostMethodology(property, landValue, constructionCostPerSqm),
      calculations,
      reconciliation: `שווי הנכס נקבע בשיטת העלות, המתבססת על ערך הקרקע בתוספת עלות בנייה חלופית בניכוי פחת. המבנה בגיל ${buildingAge} שנים (גיל אפקטיבי ${effectiveAge} שנים) עם שיעור פחת של ${(depreciationRate * 100).toFixed(1)}%.`,
      assumptions: this.generateAssumptions('cost-approach'),
      limitations: this.generateLimitations('cost-approach', 0),
      qualityChecks
    }
  }

  static calculateIncomeApproach(
    property: Property,
    monthlyRent: number,
    vacancyRate: number = 0.05,
    operatingExpenseRatio: number = 0.30,
    capitalizationRate: number = 0.05
  ): ValuationResult {
    const calculations: ValuationCalculation[] = []
    
    const annualGrossIncome = monthlyRent * 12
    
    calculations.push({
      step: 'הכנסה ברוטו שנתית',
      description: 'הכנסת שכירות צפויה לשנה',
      formula: 'שכירות חודשית × 12',
      inputs: {
        'שכירות חודשית': monthlyRent
      },
      result: annualGrossIncome
    })

    const vacancyLoss = annualGrossIncome * vacancyRate
    const effectiveGrossIncome = annualGrossIncome - vacancyLoss
    
    calculations.push({
      step: 'הכנסה אפקטיבית',
      description: 'הכנסה ברוטו בניכוי אובדן פינויים',
      formula: 'הכנסה ברוטו × (1 - שיעור פינויים)',
      inputs: {
        'הכנסה ברוטו': annualGrossIncome,
        'שיעור פינויים': `${(vacancyRate * 100)}%`
      },
      result: effectiveGrossIncome
    })

    const operatingExpenses = effectiveGrossIncome * operatingExpenseRatio
    const netOperatingIncome = effectiveGrossIncome - operatingExpenses
    
    calculations.push({
      step: 'הכנסה תפעולית נטו (NOI)',
      description: 'הכנסה אפקטיבית בניכוי הוצאות תפעול',
      formula: 'הכנסה אפקטיבית × (1 - יחס הוצאות)',
      inputs: {
        'הכנסה אפקטיבית': effectiveGrossIncome,
        'יחס הוצאות': `${(operatingExpenseRatio * 100)}%`,
        'הוצאות שנתיות': operatingExpenses
      },
      result: netOperatingIncome
    })

    const estimatedValue = Math.round((netOperatingIncome / capitalizationRate) / 1000) * 1000
    
    calculations.push({
      step: 'שווי לפי היוון',
      description: 'ערך הנכס על בסיס הכנסה והיוון',
      formula: 'NOI / שיעור היוון',
      inputs: {
        'NOI': netOperatingIncome,
        'שיעור היוון': `${(capitalizationRate * 100)}%`
      },
      result: estimatedValue
    })

    const valueRange = {
      min: Math.round((netOperatingIncome / (capitalizationRate + 0.005)) / 1000) * 1000,
      max: Math.round((netOperatingIncome / (capitalizationRate - 0.005)) / 1000) * 1000
    }

    const yieldPercent = (netOperatingIncome / estimatedValue * 100).toFixed(2)

    const qualityChecks = this.buildIncomeQualityChecks({ vacancyRate, operatingExpenseRatio, capitalizationRate, monthlyRent })

    return {
      method: 'income-approach',
      estimatedValue,
      valueRange,
      confidence: 80,
      methodology: this.generateIncomeMethodology(monthlyRent, capitalizationRate, vacancyRate),
      calculations,
      reconciliation: `שווי הנכס נקבע בשיטת ההיוון המבוססת על הכנסה מהשכרה. תשואה צפויה של ${yieldPercent}% בשיעור היוון של ${(capitalizationRate * 100)}%. הכנסה תפעולית נטו שנתית של ₪${netOperatingIncome.toLocaleString()}.`,
      assumptions: this.generateAssumptions('income-approach'),
      limitations: this.generateLimitations('income-approach', 0),
      qualityChecks
    }
  }

  private static buildComparableQualityChecks(
    selectedComps: Comparable[],
    adjustedPrices: Array<{ comparable: Comparable; adjustments: { total: number }; adjustedPrice: number }>,
    stdDev: number,
    avgPrice: number
  ): ValuationQualityCheck[] {
    const checks: ValuationQualityCheck[] = []

    if (selectedComps.length < 3) {
      checks.push({
        severity: 'warning',
        code: 'low-sample',
        message: 'פחות מ-3 עסקאות נבחרות להשוואה; מומלץ להוסיף עסקאות או להשלים בשיטה נוספת'
      })
    }

    const coefficientOfVariation = (stdDev / avgPrice) * 100
    if (coefficientOfVariation > 20) {
      checks.push({
        severity: 'warning',
        code: 'high-variation',
        message: `סטיית תקן גבוהה ביחס לממוצע (CV=${coefficientOfVariation.toFixed(1)}%); טווח הערכים רחב`
      })
    }

    for (const item of adjustedPrices) {
      if (Math.abs(item.adjustments.total) > 0.3) {
        checks.push({
          severity: 'warning',
          code: 'large-adjustment',
          message: `לעסקה "${item.comparable.address}" בוצעה התאמה כוללת חריגה (${(item.adjustments.total * 100).toFixed(1)}%)`
        })
      }
    }

    // Simple outlier detection (z-score > 2)
    if (stdDev > 0) {
      const mean = avgPrice
      for (const item of adjustedPrices) {
        const z = Math.abs((item.adjustedPrice - mean) / stdDev)
        if (z > 2) {
          checks.push({
            severity: 'warning',
            code: 'outlier',
            message: `עסקה "${item.comparable.address}" היא חריגה ביחס לסט (z=${z.toFixed(2)})`
          })
        }
      }
    }

    return checks
  }

  private static buildCostQualityChecks(params: {
    landValue: number
    constructionCostPerSqm: number
    depreciationRate: number
  }): ValuationQualityCheck[] {
    const checks: ValuationQualityCheck[] = []

    if (!(params.landValue > 0)) {
      checks.push({ severity: 'error', code: 'missing-input', message: 'ערך קרקע חייב להיות גדול מ-0' })
    }
    if (!(params.constructionCostPerSqm > 0)) {
      checks.push({ severity: 'error', code: 'missing-input', message: 'עלות בנייה למ"ר חייבת להיות גדולה מ-0' })
    }
    if (params.constructionCostPerSqm < 3000 || params.constructionCostPerSqm > 20000) {
      checks.push({
        severity: 'warning',
        code: 'parameter-out-of-range',
        message: 'עלות בנייה למ"ר מחוץ לטווח שכיח (3,000–20,000) — מומלץ לוודא נתון'
      })
    }
    if (params.depreciationRate > 0.8) {
      checks.push({
        severity: 'warning',
        code: 'parameter-out-of-range',
        message: `שיעור פחת גבוה במיוחד (${(params.depreciationRate * 100).toFixed(1)}%) — בדוק שנת בנייה/מצב`
      })
    }

    return checks
  }

  private static buildIncomeQualityChecks(params: {
    vacancyRate: number
    operatingExpenseRatio: number
    capitalizationRate: number
    monthlyRent: number
  }): ValuationQualityCheck[] {
    const checks: ValuationQualityCheck[] = []

    if (!(params.monthlyRent > 0)) {
      checks.push({ severity: 'error', code: 'missing-input', message: 'שכירות חודשית חייבת להיות גדולה מ-0' })
    }

    if (params.vacancyRate < 0 || params.vacancyRate > 0.3) {
      checks.push({
        severity: 'warning',
        code: 'parameter-out-of-range',
        message: 'שיעור פינויים מחוץ לטווח שכיח (0%–30%) — מומלץ לוודא הנחה'
      })
    }
    if (params.operatingExpenseRatio < 0.1 || params.operatingExpenseRatio > 0.6) {
      checks.push({
        severity: 'warning',
        code: 'parameter-out-of-range',
        message: 'יחס הוצאות תפעול מחוץ לטווח שכיח (10%–60%) — מומלץ לוודא הנחה'
      })
    }
    if (params.capitalizationRate <= 0) {
      checks.push({ severity: 'error', code: 'missing-input', message: 'שיעור היוון חייב להיות גדול מ-0' })
    } else if (params.capitalizationRate < 0.03 || params.capitalizationRate > 0.12) {
      checks.push({
        severity: 'warning',
        code: 'parameter-out-of-range',
        message: 'שיעור היוון מחוץ לטווח שכיח (3%–12%) — מומלץ לוודא הנחה'
      })
    }

    return checks
  }

  private static buildDivergenceCheck(results: ValuationResult[]): ValuationQualityCheck | null {
    if (results.length < 2) return null

    const values = results.map(r => r.estimatedValue)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const mid = (min + max) / 2
    if (mid <= 0) return null

    const spreadPct = ((max - min) / mid) * 100
    if (spreadPct >= 20) {
      return {
        severity: 'warning',
        code: 'method-divergence',
        message: `פער משמעותי בין שיטות שומה (≈${spreadPct.toFixed(1)}%). מומלץ לבצע ניתוח והצדקה (Reconciliation).`
      }
    }
    return null
  }

  private static buildHybridReconciliation(results: ValuationResult[], estimatedValue: number): string {
    const parts = results
      .map(r => `${r.method}: ₪${r.estimatedValue.toLocaleString()} (ביטחון ${r.confidence}%)`)
      .join(' | ')
    return `בוצע שקלול בין שיטות השומה הבאות: ${parts}. השווי המסוכם נקבע על ₪${estimatedValue.toLocaleString()} בהתאם למשקולות ואיכות הנתונים.`
  }

  private static calculateAdjustments(property: Property, comparable: Comparable): AdjustmentFactors & { total: number } {
    const locationAdj = this.calculateLocationAdjustment(property, comparable)
    const sizeAdj = this.calculateSizeAdjustment(property.details.builtArea, comparable.builtArea)
    const conditionAdj = this.calculateConditionAdjustment(property.details.condition)
    const floorAdj = this.calculateFloorAdjustment(property.details.floor, comparable.floor)
    const ageAdj = this.calculateAgeAdjustment(property.details.buildYear, new Date().getFullYear() - 20)
    const featuresAdj = this.calculateFeaturesAdjustment(property)

    const total = locationAdj + sizeAdj + conditionAdj + floorAdj + ageAdj + featuresAdj

    return {
      location: locationAdj,
      size: sizeAdj,
      condition: conditionAdj,
      floor: floorAdj,
      age: ageAdj,
      features: featuresAdj,
      total
    }
  }

  private static calculateLocationAdjustment(property: Property, comparable: Comparable): number {
    for (const step of LOCATION_DISTANCE_ADJUSTMENTS) {
      if (comparable.distance < step.maxKm) return step.adjustment
    }
    return LOCATION_DEFAULT_ADJUSTMENT
  }

  private static calculateSizeAdjustment(subjectSize: number, compSize: number): number {
    const diff = (subjectSize - compSize) / compSize
    if (Math.abs(diff) < SIZE_ADJUSTMENT_NOOP_THRESHOLD) return 0
    return diff * SIZE_ADJUSTMENT_FACTOR
  }

  private static calculateConditionAdjustment(condition: PropertyCondition): number {
    const multiplier = CONDITION_MULTIPLIERS[condition]
    return multiplier - 1
  }

  private static calculateFloorAdjustment(subjectFloor: number, compFloor: number): number {
    const subjectAdj = FLOOR_ADJUSTMENTS[Math.min(subjectFloor, MAX_FLOOR_KEY)] || 0
    const compAdj = FLOOR_ADJUSTMENTS[Math.min(compFloor, MAX_FLOOR_KEY)] || 0
    return subjectAdj - compAdj
  }

  private static calculateAgeAdjustment(subjectYear: number, compYear: number): number {
    const ageDiff = Math.abs(subjectYear - compYear)
    for (const step of AGE_ADJUSTMENT_STEPS) {
      if (ageDiff < step.maxYearsDiff) return step.adjustment
    }
    return AGE_DEFAULT_ADJUSTMENT
  }

  private static calculateFeaturesAdjustment(property: Property): number {
    let adjustment = 0
    if (property.details.elevator) adjustment += FEATURE_VALUES.elevator
    if (property.details.parking > 0) adjustment += FEATURE_VALUES.parking * property.details.parking
    if (property.details.storage) adjustment += FEATURE_VALUES.storage
    if (property.details.balcony) adjustment += FEATURE_VALUES.balcony
    if (property.details.accessible) adjustment += FEATURE_VALUES.accessible
    return adjustment
  }

  private static calculateEffectiveAge(actualAge: number, condition: PropertyCondition): number {
    return Math.round(actualAge * EFFECTIVE_AGE_FACTORS[condition])
  }

  private static applyWeightedReconciliation(adjustedPrices: Array<{ comparable: Comparable; adjustedPrice: number }>): number {
    const totalWeight = adjustedPrices.reduce((sum, item) => sum + (item.comparable.similarityScore || 50), 0)
    const weightedSum = adjustedPrices.reduce((sum, item) => {
      const weight = item.comparable.similarityScore || 50
      return sum + (item.adjustedPrice * weight)
    }, 0)
    
    return weightedSum / totalWeight
  }

  private static calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
    return Math.sqrt(variance)
  }

  private static calculateConfidence(comparables: Comparable[], stdDev: number, avgPrice: number): number {
    const coefficientOfVariation = (stdDev / avgPrice) * 100
    let confidence = 90
    
    if (comparables.length < 3) confidence -= 15
    if (comparables.length < 5) confidence -= 10
    if (coefficientOfVariation > 20) confidence -= 15
    if (coefficientOfVariation > 30) confidence -= 10
    
    const avgSimilarity = comparables.reduce((sum, c) => sum + (c.similarityScore || 50), 0) / comparables.length
    if (avgSimilarity < 60) confidence -= 10
    if (avgSimilarity < 50) confidence -= 10
    
    return Math.max(confidence, 40)
  }

  private static generateComparableMethodology(compCount: number, property: Property): string {
    return `שיטת ההשוואה מתבססת על ניתוח ${compCount} עסקאות דומות באזור ${property.address.neighborhood}, ${property.address.city}. העסקאות נבחרו על בסיס דמיון במאפיינים: סוג נכס, גודל, מיקום, מצב ותקופת מכירה. לכל עסקה בוצעו התאמות במקדמים מקובלים בשוק הנדל"ן לצורך השוואה מדויקת לנכס הנשוא. הערך הסופי נקבע על בסיס שקלול העסקאות לפי רמת הדמיון והרלוונטיות.`
  }

  private static generateCostMethodology(property: Property, landValue: number, costPerSqm: number): string {
    return `שיטת העלות מתבססת על הערכת שווי הקרקע (₪${landValue.toLocaleString()}) בתוספת עלות בנייה חלופית (₪${costPerSqm.toLocaleString()} למ"ר) בניכוי פחת מצטבר. השיטה מתאימה במיוחד כאשר אין מספיק עסקאות דומות או כאשר הנכס הינו ייחודי. עלויות הבנייה מבוססות על נתוני שוק עדכניים באזור ${property.address.city}.`
  }

  private static generateIncomeMethodology(monthlyRent: number, capRate: number, vacancyRate: number): string {
    return `שיטת ההיוון מתבססת על הכנסה צפויה מהשכרה (₪${monthlyRent.toLocaleString()} לחודש) בניכוי פינויים צפויים (${(vacancyRate * 100)}%) והוצאות תפעול. שיעור ההיוון (${(capRate * 100)}%) נקבע על בסיס ניתוח שוק והשוואה לנכסים דומים באזור. השיטה מתאימה לנכסים מניבים ומשקפת את תפיסת המשקיעים בשוק.`
  }

  private static generateReconciliation(adjustedPrices: Array<{ comparable: Comparable; adjustedPrice: number }>, finalValue: number, confidence: number): string {
    const prices = adjustedPrices.map(p => p.adjustedPrice)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = ((maxPrice - minPrice) / finalValue * 100).toFixed(1)
    
    return `לאחר ניתוח ${adjustedPrices.length} עסקאות והתאמתן לנכס הנשוא, התקבל טווח ערכים של ₪${minPrice.toLocaleString()} עד ₪${maxPrice.toLocaleString()} (סטיית ${range}%). השווי הסופי נקבע על ₪${finalValue.toLocaleString()} בשקלול העסקאות הרלוונטיות ביותר. רמת הביטחון בשומה: ${confidence}%.`
  }

  private static generateAssumptions(method: string): string[] {
    const common = [
      'השומה מבוססת על מצב הנכס במועד הבדיקה',
      'השומה מניחה שימוש חוקי ותקין בנכס',
      'לא בוצע בדיקה מבנית מעמיקה',
      'הנתונים התקבלו מהמזמין והם נכונים למיטב ידיעתו'
    ]

    const specific: Record<string, string[]> = {
      'comparable-sales': [
        'העסקאות שנבחרו משקפות את תנאי השוק הרלוונטיים',
        'ההתאמות בוצעו על בסיס ניתוח שוק ונתונים היסטוריים'
      ],
      'cost-approach': [
        'עלויות הבנייה מבוססות על נתוני שוק עדכניים',
        'שיעור הפחת משקף את מצב הנכס ואורך החיים הכלכלי הצפוי'
      ],
      'income-approach': [
        'דמי השכירות משקפים שוק שכירות פעיל ותקין',
        'ההוצאות והפינויים מבוססים על ממוצעי שוק'
      ]
    }

    return [...common, ...(specific[method] || [])]
  }

  private static generateLimitations(method: string, compCount: number): string[] {
    const limitations = [
      'השומה תקפה למועד הקובע בלבד ואינה מתחשבת בשינויים עתידיים',
      'השומה מתייחסת לנכס כפי שהוא ואינה כוללת שיפורים עתידיים',
      'השווי עשוי להשתנות בהתאם לתנאי השוק ולמצב הכלכלי'
    ]

    if (method === 'comparable-sales' && compCount < 5) {
      limitations.push('מספר העסקאות הדומות מוגבל, מומלץ להשלים בשיטת שומה נוספת')
    }

    if (method === 'cost-approach') {
      limitations.push('שיטת העלות אינה משקפת בהכרח את המחיר בשוק החופשי')
    }

    if (method === 'income-approach') {
      limitations.push('התוצאה תלויה בהנחות לגבי הכנסות, הוצאות ושיעור היוון')
    }

    return limitations
  }
}
