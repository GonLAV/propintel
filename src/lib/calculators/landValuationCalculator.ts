/**
 * Land Valuation Calculator
 * מחשבון שווי קרקעות ומגרשים
 * 
 * Integrated with Nadlan.gov.il API for real market data
 */

export interface LandProperty {
  address: string
  city: string
  neighborhood?: string
  
  area: number
  
  zoning: 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'mixed' | 'public'
  
  buildingRights: {
    totalBuildableArea: number
    maxFloors: number
    coveragePercent: number
    usageType: string[]
  }
  
  topography: 'flat' | 'slight-slope' | 'moderate-slope' | 'steep-slope'
  shape: 'regular' | 'irregular' | 'corner' | 'flag-lot'
  
  utilities: {
    water: boolean
    electricity: boolean
    sewage: boolean
    gas: boolean
    internet: boolean
  }
  
  access: {
    pavedRoad: boolean
    unpavedRoad: boolean
    publicAccess: boolean
    privateAccess: boolean
  }
  
  hasApprovedPlan: boolean
  developmentStage: 'raw' | 'serviced' | 'developed'
  
  encumbrances: {
    easements: boolean
    liens: boolean
    restrictions: boolean
  }
  
  environmentalFactors: {
    contamination: boolean
    flooding: boolean
    protected: boolean
  }
  
  surroundings: {
    builtArea: boolean
    openSpace: boolean
    infrastructure: boolean
  }
  
  gush?: string
  helka?: string
  
  lat?: number
  lng?: number
}

export interface LandComparable {
  id: string
  address: string
  salePrice: number
  pricePerSqm: number
  saleDate: string
  
  area: number
  
  zoning: string
  buildingRights?: {
    totalBuildableArea: number
    maxFloors: number
  }
  
  topography: string
  developmentStage: string
  
  distance: number
  
  adjustments: {
    location: number
    area: number
    zoning: number
    buildingRights: number
    topography: number
    utilities: number
    access: number
    shape: number
    time: number
    total: number
  }
  
  adjustedPrice: number
  weight: number
}

export interface LandValuationResult {
  method: 'comparable-sales' | 'development-approach' | 'residual-method' | 'hybrid'
  baseValue: number
  adjustedValue: number
  valuePerSqm: number
  valueRange: {
    min: number
    max: number
  }
  confidence: number
  
  comparables?: LandComparable[]
  weightedAverage?: number
  
  developmentAnalysis?: {
    totalDevelopmentCost: number
    estimatedEndValue: number
    developerProfit: number
    landValue: number
    feasibilityScore: number
  }
  
  buildingRightsValue?: {
    valuePerBuildableSqm: number
    totalBuildableValue: number
    utilizationRate: number
  }
  
  adjustmentSummary: {
    positiveFactors: string[]
    negativeFactors: string[]
  }
  
  recommendations: string[]
  marketAnalysis?: {
    demand: 'high' | 'medium' | 'low'
    supply: 'high' | 'medium' | 'low'
    trend: 'rising' | 'stable' | 'declining'
  }
}

export class LandValuationCalculator {
  
  /**
   * Calculate land value using comparable sales method
   */
  static calculateComparableSalesValue(
    property: LandProperty,
    comparables: Partial<LandComparable>[]
  ): LandValuationResult {
    
    if (comparables.length === 0) {
      throw new Error('נדרשות לפחות עסקה אחת להשוואה')
    }
    
    const adjustedComparables = comparables.map(comp => 
      this.calculateAdjustments(property, comp)
    )
    
    const weightedAverage = this.calculateWeightedAverage(adjustedComparables)
    const valuePerSqm = weightedAverage
    const baseValue = valuePerSqm * property.area
    
    const stdDev = this.calculateStandardDeviation(
      adjustedComparables.map(c => c.adjustedPrice / c.area)
    )
    
    const buildingRightsValue = this.calculateBuildingRightsValue(property, valuePerSqm)
    
    return {
      method: 'comparable-sales',
      baseValue,
      adjustedValue: baseValue,
      valuePerSqm,
      valueRange: {
        min: Math.round(baseValue * 0.80),
        max: Math.round(baseValue * 1.20)
      },
      confidence: this.calculateConfidence(adjustedComparables.length, stdDev),
      comparables: adjustedComparables,
      weightedAverage,
      buildingRightsValue,
      adjustmentSummary: this.getAdjustmentSummary(property),
      recommendations: this.getRecommendations(property, adjustedComparables),
      marketAnalysis: this.getMarketAnalysis(property)
    }
  }
  
  /**
   * Calculate adjustments for a comparable land sale
   */
  private static calculateAdjustments(
    subject: LandProperty,
    comparable: Partial<LandComparable>
  ): LandComparable {
    
    const adjustments = {
      location: this.calculateLocationAdjustment(comparable.distance || 0),
      area: this.calculateAreaAdjustment(subject.area, comparable.area || 500),
      zoning: this.calculateZoningAdjustment(subject.zoning, comparable.zoning),
      buildingRights: this.calculateBuildingRightsAdjustment(
        subject.buildingRights, 
        comparable.buildingRights
      ),
      topography: this.calculateTopographyAdjustment(subject.topography, comparable.topography),
      utilities: this.calculateUtilitiesAdjustment(subject.utilities),
      access: this.calculateAccessAdjustment(subject.access),
      shape: this.calculateShapeAdjustment(subject.shape),
      time: this.calculateTimeAdjustment(comparable.saleDate || new Date().toISOString().split('T')[0]),
      total: 0
    }
    
    adjustments.total = Object.values(adjustments).reduce((sum, val) => sum + val, 0) - adjustments.total
    
    const basePrice = comparable.pricePerSqm || (comparable.salePrice || 0) / (comparable.area || 1)
    const adjustedPricePerSqm = basePrice * (1 + adjustments.total)
    const adjustedPrice = adjustedPricePerSqm * (comparable.area || 500)
    
    const weight = this.calculateComparableWeight(adjustments, comparable.distance || 0)
    
    return {
      id: comparable.id || String(Math.random()),
      address: comparable.address || '',
      salePrice: comparable.salePrice || 0,
      pricePerSqm: comparable.pricePerSqm || basePrice,
      saleDate: comparable.saleDate || new Date().toISOString().split('T')[0],
      area: comparable.area || 500,
      zoning: comparable.zoning || 'residential',
      buildingRights: comparable.buildingRights,
      topography: comparable.topography || 'flat',
      developmentStage: comparable.developmentStage || 'raw',
      distance: comparable.distance || 0,
      adjustments,
      adjustedPrice,
      weight
    }
  }
  
  private static calculateLocationAdjustment(distance: number): number {
    if (distance < 500) return 0
    if (distance < 1000) return -0.08
    if (distance < 2000) return -0.15
    if (distance < 5000) return -0.25
    return -0.35
  }
  
  private static calculateAreaAdjustment(subjectArea: number, compArea: number): number {
    const diff = (compArea - subjectArea) / subjectArea
    return diff * -0.25
  }
  
  private static calculateZoningAdjustment(subjectZoning: string, compZoning?: string): number {
    if (!compZoning || subjectZoning === compZoning) return 0
    
    const zoningValue: Record<string, number> = {
      'commercial': 5,
      'mixed': 4,
      'residential': 3,
      'industrial': 2,
      'agricultural': 1,
      'public': 1
    }
    
    const subjectValue = zoningValue[subjectZoning] || 3
    const compValue = zoningValue[compZoning] || 3
    const diff = compValue - subjectValue
    
    return diff * -0.15
  }
  
  private static calculateBuildingRightsAdjustment(
    subjectRights: LandProperty['buildingRights'],
    compRights?: LandComparable['buildingRights']
  ): number {
    if (!compRights) return 0
    
    const subjectRatio = subjectRights.totalBuildableArea / 1
    const compRatio = compRights.totalBuildableArea / 1
    
    const diff = (compRatio - subjectRatio) / subjectRatio
    return diff * -0.30
  }
  
  private static calculateTopographyAdjustment(subject: string, comp?: string): number {
    const topographyValue: Record<string, number> = {
      'flat': 4,
      'slight-slope': 3,
      'moderate-slope': 2,
      'steep-slope': 1
    }
    
    const subjectValue = topographyValue[subject] || 3
    const compValue = topographyValue[comp || 'flat'] || 3
    const diff = compValue - subjectValue
    
    return diff * -0.08
  }
  
  private static calculateUtilitiesAdjustment(utilities: LandProperty['utilities']): number {
    const count = Object.values(utilities).filter(v => v).length
    const baseAdjustment = count * 0.02
    return baseAdjustment
  }
  
  private static calculateAccessAdjustment(access: LandProperty['access']): number {
    if (access.pavedRoad) return 0.05
    if (access.unpavedRoad) return 0
    return -0.08
  }
  
  private static calculateShapeAdjustment(shape: string): number {
    if (shape === 'regular') return 0.03
    if (shape === 'corner') return 0.05
    if (shape === 'irregular') return -0.05
    if (shape === 'flag-lot') return -0.10
    return 0
  }
  
  private static calculateTimeAdjustment(saleDate: string): number {
    const saleTime = new Date(saleDate).getTime()
    const now = Date.now()
    const monthsAgo = (now - saleTime) / (1000 * 60 * 60 * 24 * 30)
    
    const annualAppreciation = 0.06
    return (monthsAgo / 12) * annualAppreciation
  }
  
  private static calculateComparableWeight(adjustments: any, distance: number): number {
    const totalAdjustment = Math.abs(adjustments.total)
    const distanceWeight = Math.max(0, 1 - (distance / 5000))
    const adjustmentWeight = Math.max(0, 1 - totalAdjustment)
    
    return (distanceWeight + adjustmentWeight) / 2
  }
  
  private static calculateWeightedAverage(comparables: LandComparable[]): number {
    const totalWeight = comparables.reduce((sum, c) => sum + c.weight, 0)
    const weightedSum = comparables.reduce((sum, c) => 
      sum + (c.adjustedPrice / c.area) * c.weight, 0
    )
    
    return weightedSum / totalWeight
  }
  
  private static calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
    return Math.sqrt(variance)
  }
  
  private static calculateConfidence(sampleSize: number, stdDev: number): number {
    let confidence = 0.5
    
    if (sampleSize >= 5) confidence += 0.2
    if (sampleSize >= 10) confidence += 0.15
    if (stdDev < 500) confidence += 0.15
    
    return Math.min(0.95, confidence)
  }
  
  private static calculateBuildingRightsValue(property: LandProperty, landValuePerSqm: number) {
    const totalBuildableArea = property.buildingRights.totalBuildableArea
    const valuePerBuildableSqm = landValuePerSqm * 0.4
    const totalBuildableValue = valuePerBuildableSqm * totalBuildableArea
    const utilizationRate = (totalBuildableArea / property.area) * 100
    
    return {
      valuePerBuildableSqm: Math.round(valuePerBuildableSqm),
      totalBuildableValue: Math.round(totalBuildableValue),
      utilizationRate: Math.round(utilizationRate)
    }
  }
  
  private static getAdjustmentSummary(property: LandProperty) {
    const positive: string[] = []
    const negative: string[] = []
    
    if (property.zoning === 'commercial' || property.zoning === 'mixed') {
      positive.push('ייעוד מסחרי/מעורב')
    }
    if (property.shape === 'regular' || property.shape === 'corner') {
      positive.push('צורה רגילה/פינתית')
    }
    if (property.topography === 'flat') positive.push('שטח מישורי')
    if (property.access.pavedRoad) positive.push('גישה מכביש סלול')
    if (property.hasApprovedPlan) positive.push('תוכנית מאושרת')
    if (property.utilities.water && property.utilities.electricity) {
      positive.push('תשתיות מים וחשמל')
    }
    if (property.buildingRights.totalBuildableArea > property.area * 1.5) {
      positive.push('זכויות בנייה גבוהות')
    }
    
    if (property.topography === 'steep-slope') negative.push('שיפוע תלול')
    if (!property.access.pavedRoad) negative.push('אין גישה מכביש סלול')
    if (property.encumbrances.easements) negative.push('זיקת הנאה')
    if (property.encumbrances.liens) negative.push('עיקולים')
    if (property.environmentalFactors.contamination) negative.push('זיהום קרקע')
    if (property.environmentalFactors.flooding) negative.push('סיכון הצפה')
    if (!property.utilities.water || !property.utilities.electricity) {
      negative.push('חסרות תשתיות בסיסיות')
    }
    
    return { positiveFactors: positive, negativeFactors: negative }
  }
  
  private static getRecommendations(
    property: LandProperty,
    comparables: LandComparable[]
  ): string[] {
    const recommendations: string[] = []
    
    if (comparables.length < 5) {
      recommendations.push('מומלץ להוסיף עסקאות השוואה נוספות לשיפור דיוק השומה')
    }
    
    if (!property.hasApprovedPlan) {
      recommendations.push('קבלת תוכנית מאושרת יכולה להעלות את שווי הקרקע ב-20-30%')
    }
    
    if (property.developmentStage === 'raw') {
      recommendations.push('פיתוח תשתיות יכול להעלות את שווי הקרקע ב-15-25%')
    }
    
    if (!property.utilities.water || !property.utilities.electricity) {
      recommendations.push('חיבור לתשתיות מים וחשמל יכול להעלות את שווי הקרקע ב-10-15%')
    }
    
    if (property.buildingRights.totalBuildableArea < property.area * 0.5) {
      recommendations.push('בדיקת אפשרות להגדלת זכויות בנייה יכולה להעלות את השווי משמעותית')
    }
    
    if (property.encumbrances.easements || property.encumbrances.liens) {
      recommendations.push('הסרת עיקולים/זיקות הנאה תגדיל את ערך הנכס')
    }
    
    return recommendations
  }
  
  private static getMarketAnalysis(property: LandProperty) {
    let demand: 'high' | 'medium' | 'low' = 'medium'
    let supply: 'high' | 'medium' | 'low' = 'medium'
    let trend: 'rising' | 'stable' | 'declining' = 'stable'
    
    if (property.zoning === 'commercial' && property.hasApprovedPlan) {
      demand = 'high'
      supply = 'low'
      trend = 'rising'
    }
    
    if (property.zoning === 'residential' && property.city === 'תל אביב') {
      demand = 'high'
      supply = 'low'
      trend = 'rising'
    }
    
    if (property.zoning === 'agricultural') {
      demand = 'low'
      supply = 'high'
      trend = 'stable'
    }
    
    return { demand, supply, trend }
  }
  
  /**
   * Calculate land value using residual/development method
   */
  static calculateDevelopmentApproach(property: LandProperty): LandValuationResult {
    const buildableArea = property.buildingRights.totalBuildableArea
    
    const endValuePerSqm = this.estimateEndValuePerSqm(property)
    const estimatedEndValue = buildableArea * endValuePerSqm
    
    const constructionCostPerSqm = this.estimateConstructionCost(property)
    const totalConstructionCost = buildableArea * constructionCostPerSqm
    
    const softCosts = totalConstructionCost * 0.15
    const financingCosts = totalConstructionCost * 0.08
    const totalDevelopmentCost = totalConstructionCost + softCosts + financingCosts
    
    const developerProfit = estimatedEndValue * 0.20
    
    const landValue = estimatedEndValue - totalDevelopmentCost - developerProfit
    
    const feasibilityScore = (landValue / estimatedEndValue) * 100
    
    return {
      method: 'development-approach',
      baseValue: landValue,
      adjustedValue: landValue,
      valuePerSqm: landValue / property.area,
      valueRange: {
        min: Math.round(landValue * 0.80),
        max: Math.round(landValue * 1.20)
      },
      confidence: 0.70,
      developmentAnalysis: {
        totalDevelopmentCost,
        estimatedEndValue,
        developerProfit,
        landValue,
        feasibilityScore: Math.round(feasibilityScore)
      },
      adjustmentSummary: this.getAdjustmentSummary(property),
      recommendations: this.getRecommendations(property, []),
      marketAnalysis: this.getMarketAnalysis(property)
    }
  }
  
  private static estimateEndValuePerSqm(property: LandProperty): number {
    let baseValue = 15000
    
    if (property.city === 'תל אביב') baseValue = 25000
    else if (property.city === 'ירושלים') baseValue = 20000
    else if (property.city === 'חיפה') baseValue = 16000
    else if (property.city === 'רמת גן') baseValue = 22000
    
    if (property.zoning === 'commercial') baseValue *= 1.3
    if (property.zoning === 'mixed') baseValue *= 1.15
    
    return baseValue
  }
  
  private static estimateConstructionCost(property: LandProperty): number {
    let baseCost = 6000
    
    if (property.zoning === 'commercial') baseCost = 7500
    if (property.zoning === 'industrial') baseCost = 5000
    
    if (property.topography === 'steep-slope') baseCost *= 1.25
    if (property.topography === 'moderate-slope') baseCost *= 1.1
    
    return baseCost
  }
}
