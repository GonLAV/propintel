export interface ComparableProperty {
  id: string
  address: string
  price: number
  pricePerSqm: number
  area: number
  distance: number
  similarity: number
  reliability: number
  transactionDate: Date
  adjustedPrice?: number
  adjustedPricePerSqm?: number
}

export interface WeightingFactor {
  proximity: number
  similarity: number
  reliability: number
  recency: number
}

export interface WeightedComparable extends ComparableProperty {
  weight: number
  weightedPrice: number
  weightedPricePerSqm: number
  weightBreakdown: {
    proximityScore: number
    similarityScore: number
    reliabilityScore: number
    recencyScore: number
    totalWeight: number
  }
}

export interface WeightedAverageResult {
  weightedAverage: number
  weightedAveragePerSqm: number
  median: number
  medianPerSqm: number
  min: number
  max: number
  range: number
  standardDeviation: number
  confidenceLevel: 'high' | 'medium' | 'low'
  comparables: WeightedComparable[]
  formula: string
  narrativeHebrew: string
  rangeExplanation: string
}

export class WeightedAverageCalculator {
  private static DEFAULT_WEIGHTS: WeightingFactor = {
    proximity: 0.30,
    similarity: 0.35,
    reliability: 0.20,
    recency: 0.15
  }

  static calculate(
    comparables: ComparableProperty[],
    customWeights?: Partial<WeightingFactor>
  ): WeightedAverageResult {
    const weights = { ...this.DEFAULT_WEIGHTS, ...customWeights }
    
    const weightedComparables = comparables.map(comp => 
      this.calculateWeight(comp, weights)
    )

    const totalWeight = weightedComparables.reduce((sum, c) => sum + c.weight, 0)
    
    const weightedAverage = weightedComparables.reduce(
      (sum, c) => sum + c.weightedPrice,
      0
    ) / totalWeight

    const weightedAveragePerSqm = weightedComparables.reduce(
      (sum, c) => sum + c.weightedPricePerSqm,
      0
    ) / totalWeight

    const prices = comparables.map(c => c.adjustedPrice || c.price)
    const pricesPerSqm = comparables.map(c => c.adjustedPricePerSqm || c.pricePerSqm)

    const median = this.calculateMedian(prices)
    const medianPerSqm = this.calculateMedian(pricesPerSqm)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min
    const standardDeviation = this.calculateStandardDeviation(prices)

    const confidenceLevel = this.determineConfidenceLevel(
      standardDeviation,
      weightedAverage,
      comparables.length
    )

    const formula = this.generateFormula(weightedComparables, totalWeight)
    const narrativeHebrew = this.generateNarrative(
      weightedAverage,
      median,
      min,
      max,
      confidenceLevel,
      comparables.length
    )
    const rangeExplanation = this.generateRangeExplanation(min, max, weightedAverage)

    return {
      weightedAverage,
      weightedAveragePerSqm,
      median,
      medianPerSqm,
      min,
      max,
      range,
      standardDeviation,
      confidenceLevel,
      comparables: weightedComparables,
      formula,
      narrativeHebrew,
      rangeExplanation
    }
  }

  private static calculateWeight(
    comparable: ComparableProperty,
    weights: WeightingFactor
  ): WeightedComparable {
    const proximityScore = this.calculateProximityScore(comparable.distance)
    const similarityScore = comparable.similarity / 100
    const reliabilityScore = comparable.reliability / 100
    const recencyScore = this.calculateRecencyScore(comparable.transactionDate)

    const totalWeight = 
      (proximityScore * weights.proximity) +
      (similarityScore * weights.similarity) +
      (reliabilityScore * weights.reliability) +
      (recencyScore * weights.recency)

    const price = comparable.adjustedPrice || comparable.price
    const pricePerSqm = comparable.adjustedPricePerSqm || comparable.pricePerSqm

    return {
      ...comparable,
      weight: totalWeight,
      weightedPrice: price * totalWeight,
      weightedPricePerSqm: pricePerSqm * totalWeight,
      weightBreakdown: {
        proximityScore,
        similarityScore,
        reliabilityScore,
        recencyScore,
        totalWeight
      }
    }
  }

  private static calculateProximityScore(distance: number): number {
    if (distance <= 100) return 1.0
    if (distance <= 300) return 0.9
    if (distance <= 500) return 0.7
    if (distance <= 1000) return 0.5
    if (distance <= 2000) return 0.3
    return 0.1
  }

  private static calculateRecencyScore(transactionDate: Date): number {
    const now = new Date()
    const monthsAgo = Math.floor(
      (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )

    if (monthsAgo <= 3) return 1.0
    if (monthsAgo <= 6) return 0.9
    if (monthsAgo <= 12) return 0.7
    if (monthsAgo <= 24) return 0.5
    return 0.3
  }

  private static calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }
    return sorted[mid]
  }

  private static calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
    return Math.sqrt(variance)
  }

  private static determineConfidenceLevel(
    standardDeviation: number,
    average: number,
    sampleSize: number
  ): 'high' | 'medium' | 'low' {
    const coefficientOfVariation = (standardDeviation / average) * 100

    if (sampleSize >= 5 && coefficientOfVariation < 10) return 'high'
    if (sampleSize >= 3 && coefficientOfVariation < 20) return 'medium'
    return 'low'
  }

  private static generateFormula(
    comparables: WeightedComparable[],
    totalWeight: number
  ): string {
    const terms = comparables.map(c => 
      `(${c.price.toLocaleString('he-IL')} × ${c.weight.toFixed(3)})`
    )
    
    return `ממוצע משוקלל = (${terms.join(' + ')}) / ${totalWeight.toFixed(3)}`
  }

  private static generateNarrative(
    weightedAverage: number,
    median: number,
    min: number,
    max: number,
    confidenceLevel: 'high' | 'medium' | 'low',
    sampleSize: number
  ): string {
    const lines: string[] = []

    lines.push(`בוצע ניתוח של ${sampleSize} עסקאות השוואה רלוונטיות.`)
    lines.push('')
    lines.push(`הממוצע המשוקלל עומד על ${weightedAverage.toLocaleString('he-IL')} ₪.`)
    lines.push(`החציון (Median) עומד על ${median.toLocaleString('he-IL')} ₪.`)
    lines.push(`טווח הערכים: ${min.toLocaleString('he-IL')} - ${max.toLocaleString('he-IL')} ₪.`)
    lines.push('')

    const confidenceText = {
      high: 'גבוהה - העסקאות הומוגניות והמדגם מייצג',
      medium: 'בינונית - קיים פיזור מתון בערכים',
      low: 'נמוכה - קיים פיזור משמעותי או מדגם קטן'
    }

    lines.push(`רמת ביטחון: ${confidenceText[confidenceLevel]}.`)
    lines.push('')
    lines.push('השקלול בוצע על פי הפרמטרים הבאים:')
    lines.push('• קרבה גיאוגרפית (30%)')
    lines.push('• דמיון לנכס הנישום (35%)')
    lines.push('• רמת אמינות העסקה (20%)')
    lines.push('• עדכניות העסקה (15%)')

    return lines.join('\n')
  }

  private static generateRangeExplanation(
    min: number,
    max: number,
    weightedAverage: number
  ): string {
    const lowerBound = min
    const upperBound = max
    const midPoint = weightedAverage

    return (
      `טווח השווי נקבע בהתבסס על ניתוח עסקאות ההשוואה:\n\n` +
      `• גבול תחתון: ${lowerBound.toLocaleString('he-IL')} ₪ - מבוסס על העסקה הנמוכה ביותר לאחר התאמות\n` +
      `• ערך מרכזי: ${midPoint.toLocaleString('he-IL')} ₪ - ממוצע משוקלל של כלל העסקאות\n` +
      `• גבול עליון: ${upperBound.toLocaleString('he-IL')} ₪ - מבוסס על העסקה הגבוהה ביותר לאחר התאמות\n\n` +
      `השווי הסופי נקבע בשיקול דעת מקצועי בתוך טווח זה.`
    )
  }

  static createDetailedBreakdown(result: WeightedAverageResult): string {
    const lines: string[] = []
    
    lines.push('פירוט עסקאות השוואה משוקללות:')
    lines.push('=' .repeat(80))
    lines.push('')

    result.comparables.forEach((comp, index) => {
      lines.push(`עסקה ${index + 1}: ${comp.address}`)
      lines.push(`  מחיר: ${comp.price.toLocaleString('he-IL')} ₪`)
      lines.push(`  שטח: ${comp.area} מ"ר`)
      lines.push(`  מחיר למ"ר: ${comp.pricePerSqm.toLocaleString('he-IL')} ₪`)
      lines.push(`  מרחק: ${comp.distance}מ'`)
      lines.push(`  דמיון: ${comp.similarity}%`)
      lines.push(`  אמינות: ${comp.reliability}%`)
      lines.push('')
      lines.push('  פירוט שקלול:')
      lines.push(`    • ציון קרבה: ${comp.weightBreakdown.proximityScore.toFixed(2)}`)
      lines.push(`    • ציון דמיון: ${comp.weightBreakdown.similarityScore.toFixed(2)}`)
      lines.push(`    • ציון אמינות: ${comp.weightBreakdown.reliabilityScore.toFixed(2)}`)
      lines.push(`    • ציון עדכניות: ${comp.weightBreakdown.recencyScore.toFixed(2)}`)
      lines.push(`    • משקל כולל: ${comp.weight.toFixed(3)}`)
      lines.push(`    • תרומה למחיר: ${comp.weightedPrice.toLocaleString('he-IL')} ₪`)
      lines.push('')
      lines.push('-'.repeat(80))
      lines.push('')
    })

    return lines.join('\n')
  }
}
