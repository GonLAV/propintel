/**
 * Commercial Property Valuation Calculator
 * מחשבון שווי נכסי מסחר
 * 
 * Integrated with Nadlan.gov.il API for real market data
 */

export interface CommercialProperty {
  address: string
  city: string
  area: string
  
  totalArea: number
  floor?: number
  totalFloors?: number
  
  condition: 'new' | 'excellent' | 'good' | 'fair' | 'poor'
  buildYear?: number
  renovationYear?: number
  
  propertyType: 'retail' | 'restaurant' | 'warehouse' | 'showroom' | 'clinic' | 'studio' | 'mixed'
  
  frontage?: number
  storageArea?: number
  hasParkingSpots: boolean
  parkingSpaces?: number
  
  hasShopWindow: boolean
  cornerLocation: boolean
  pedestrianTraffic: 'high' | 'medium' | 'low'
  vehicularAccess: boolean
  
  hasKitchen: boolean
  hasRestroom: boolean
  hasAirConditioning: boolean
  hasSecuritySystem: boolean
  
  accessibility: {
    wheelchairAccessible: boolean
    publicTransport: boolean
    highway: boolean
  }
  
  zoning: 'retail' | 'mixed' | 'commercial' | 'industrial'
  currentUse: 'owner-occupied' | 'rented' | 'vacant'
  
  rentalIncome?: number
  occupancyRate?: number
  leaseTerms?: 'short' | 'medium' | 'long'
  
  gush?: string
  helka?: string
  
  lat?: number
  lng?: number
}

export interface CommercialComparable {
  id: string
  address: string
  salePrice: number
  pricePerSqm: number
  saleDate: string
  
  area: number
  floor?: number
  
  propertyType: string
  condition: string
  buildYear?: number
  
  frontage?: number
  cornerLocation: boolean
  parkingSpaces?: number
  
  distance: number
  
  adjustments: {
    location: number
    area: number
    type: number
    condition: number
    age: number
    frontage: number
    corner: number
    parking: number
    pedestrianTraffic: number
    time: number
    total: number
  }
  
  adjustedPrice: number
  weight: number
}

export interface CommercialValuationResult {
  method: 'comparable-sales' | 'income-approach' | 'cost-approach' | 'hybrid'
  baseValue: number
  adjustedValue: number
  valuePerSqm: number
  valueRange: {
    min: number
    max: number
  }
  confidence: number
  
  comparables?: CommercialComparable[]
  weightedAverage?: number
  
  incomeData?: {
    noi: number
    capRate: number
    grossIncome: number
    expenses: number
    vacancyRate: number
    estimatedRent?: number
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

export class CommercialValuationCalculator {
  
  /**
   * Calculate property value using comparable sales method
   */
  static calculateComparableSalesValue(
    property: CommercialProperty,
    comparables: Partial<CommercialComparable>[]
  ): CommercialValuationResult {
    
    if (comparables.length === 0) {
      throw new Error('נדרשות לפחות עסקה אחת להשוואה')
    }
    
    const adjustedComparables = comparables.map(comp => 
      this.calculateAdjustments(property, comp)
    )
    
    const weightedAverage = this.calculateWeightedAverage(adjustedComparables)
    const valuePerSqm = weightedAverage
    const baseValue = valuePerSqm * property.totalArea
    
    const stdDev = this.calculateStandardDeviation(
      adjustedComparables.map(c => c.adjustedPrice / c.area)
    )
    
    return {
      method: 'comparable-sales',
      baseValue,
      adjustedValue: baseValue,
      valuePerSqm,
      valueRange: {
        min: Math.round(baseValue * 0.85),
        max: Math.round(baseValue * 1.15)
      },
      confidence: this.calculateConfidence(adjustedComparables.length, stdDev),
      comparables: adjustedComparables,
      weightedAverage,
      adjustmentSummary: this.getAdjustmentSummary(property),
      recommendations: this.getRecommendations(property, adjustedComparables),
      marketAnalysis: this.getMarketAnalysis(property)
    }
  }
  
  /**
   * Calculate adjustments for a comparable property
   */
  private static calculateAdjustments(
    subject: CommercialProperty,
    comparable: Partial<CommercialComparable>
  ): CommercialComparable {
    
    const adjustments = {
      location: this.calculateLocationAdjustment(comparable.distance || 0),
      area: this.calculateAreaAdjustment(subject.totalArea, comparable.area || 100),
      type: this.calculateTypeAdjustment(subject.propertyType, comparable.propertyType),
      condition: this.calculateConditionAdjustment(subject.condition, comparable.condition),
      age: this.calculateAgeAdjustment(subject.buildYear, comparable.buildYear),
      frontage: this.calculateFrontageAdjustment(subject.frontage, comparable.frontage),
      corner: this.calculateCornerAdjustment(subject.cornerLocation, comparable.cornerLocation),
      parking: this.calculateParkingAdjustment(subject.parkingSpaces, comparable.parkingSpaces),
      pedestrianTraffic: this.calculateTrafficAdjustment(subject.pedestrianTraffic),
      time: this.calculateTimeAdjustment(comparable.saleDate || new Date().toISOString().split('T')[0]),
      total: 0
    }
    
    adjustments.total = Object.values(adjustments).reduce((sum, val) => sum + val, 0) - adjustments.total
    
    const basePrice = comparable.pricePerSqm || (comparable.salePrice || 0) / (comparable.area || 1)
    const adjustedPricePerSqm = basePrice * (1 + adjustments.total)
    const adjustedPrice = adjustedPricePerSqm * (comparable.area || 100)
    
    const weight = this.calculateComparableWeight(adjustments, comparable.distance || 0)
    
    return {
      id: comparable.id || String(Math.random()),
      address: comparable.address || '',
      salePrice: comparable.salePrice || 0,
      pricePerSqm: comparable.pricePerSqm || basePrice,
      saleDate: comparable.saleDate || new Date().toISOString().split('T')[0],
      area: comparable.area || 100,
      floor: comparable.floor,
      propertyType: comparable.propertyType || 'retail',
      condition: comparable.condition || 'good',
      buildYear: comparable.buildYear,
      frontage: comparable.frontage,
      cornerLocation: comparable.cornerLocation || false,
      parkingSpaces: comparable.parkingSpaces,
      distance: comparable.distance || 0,
      adjustments,
      adjustedPrice,
      weight
    }
  }
  
  private static calculateLocationAdjustment(distance: number): number {
    if (distance < 200) return 0
    if (distance < 500) return -0.05
    if (distance < 1000) return -0.10
    if (distance < 2000) return -0.15
    return -0.20
  }
  
  private static calculateAreaAdjustment(subjectArea: number, compArea: number): number {
    const diff = (compArea - subjectArea) / subjectArea
    return diff * -0.20
  }
  
  private static calculateTypeAdjustment(subjectType: string, compType?: string): number {
    if (!compType || subjectType === compType) return 0
    return -0.08
  }
  
  private static calculateConditionAdjustment(subjectCondition: string, compCondition?: string): number {
    const conditionValue: Record<string, number> = {
      'new': 5,
      'excellent': 4,
      'good': 3,
      'fair': 2,
      'poor': 1
    }
    
    const subjectValue = conditionValue[subjectCondition] || 3
    const compValue = conditionValue[compCondition || 'good'] || 3
    const diff = compValue - subjectValue
    
    return diff * -0.07
  }
  
  private static calculateAgeAdjustment(subjectYear?: number, compYear?: number): number {
    if (!subjectYear || !compYear) return 0
    const ageDiff = (new Date().getFullYear() - compYear) - (new Date().getFullYear() - subjectYear)
    return ageDiff * -0.015
  }
  
  private static calculateFrontageAdjustment(subjectFrontage?: number, compFrontage?: number): number {
    if (!subjectFrontage || !compFrontage) return 0
    const diff = (compFrontage - subjectFrontage) / subjectFrontage
    return diff * -0.10
  }
  
  private static calculateCornerAdjustment(subject: boolean, comp?: boolean): number {
    if (subject && !comp) return 0.08
    if (!subject && comp) return -0.08
    return 0
  }
  
  private static calculateParkingAdjustment(subject?: number, comp?: number): number {
    const subjectSpaces = subject || 0
    const compSpaces = comp || 0
    const diff = compSpaces - subjectSpaces
    return diff * -0.03
  }
  
  private static calculateTrafficAdjustment(traffic: string): number {
    if (traffic === 'high') return 0.05
    if (traffic === 'low') return -0.05
    return 0
  }
  
  private static calculateTimeAdjustment(saleDate: string): number {
    const saleTime = new Date(saleDate).getTime()
    const now = Date.now()
    const monthsAgo = (now - saleTime) / (1000 * 60 * 60 * 24 * 30)
    
    const annualAppreciation = 0.04
    return (monthsAgo / 12) * annualAppreciation
  }
  
  private static calculateComparableWeight(adjustments: any, distance: number): number {
    const totalAdjustment = Math.abs(adjustments.total)
    const distanceWeight = Math.max(0, 1 - (distance / 3000))
    const adjustmentWeight = Math.max(0, 1 - totalAdjustment)
    
    return (distanceWeight + adjustmentWeight) / 2
  }
  
  private static calculateWeightedAverage(comparables: CommercialComparable[]): number {
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
    if (stdDev < 2000) confidence += 0.15
    
    return Math.min(0.95, confidence)
  }
  
  private static getAdjustmentSummary(property: CommercialProperty) {
    const positive: string[] = []
    const negative: string[] = []
    
    if (property.cornerLocation) positive.push('פינת רחוב')
    if (property.hasShopWindow) positive.push('חלון ראווה')
    if (property.pedestrianTraffic === 'high') positive.push('תנועת הולכי רגל גבוהה')
    if (property.hasParkingSpots) positive.push('חניה')
    if (property.condition === 'excellent' || property.condition === 'new') positive.push('מצב מעולה')
    if (property.frontage && property.frontage > 8) positive.push('חזית רחבה')
    
    if (property.pedestrianTraffic === 'low') negative.push('תנועת הולכי רגל נמוכה')
    if (!property.hasParkingSpots) negative.push('אין חניה')
    if (property.condition === 'poor' || property.condition === 'fair') negative.push('מצב בינוני-ירוד')
    if (!property.vehicularAccess) negative.push('גישה מוגבלת לרכב')
    
    return { positiveFactors: positive, negativeFactors: negative }
  }
  
  private static getRecommendations(
    property: CommercialProperty,
    comparables: CommercialComparable[]
  ): string[] {
    const recommendations: string[] = []
    
    if (comparables.length < 5) {
      recommendations.push('מומלץ להוסיף עסקאות השוואה נוספות לשיפור דיוק השומה')
    }
    
    if (!property.hasShopWindow && property.propertyType === 'retail') {
      recommendations.push('הוספת חלון ראווה יכולה להעלות את שווי הנכס ב-5-8%')
    }
    
    if (!property.hasParkingSpots) {
      recommendations.push('הוספת חניה יכולה להעלות את שווי הנכס ב-10-15%')
    }
    
    if (property.condition === 'fair' || property.condition === 'poor') {
      recommendations.push('שיפוץ יכול להעלות את שווי הנכס ב-15-25%')
    }
    
    if (property.currentUse === 'vacant') {
      recommendations.push('השכרת הנכס יכולה לייצר תשואה שנתית של 5-7%')
    }
    
    return recommendations
  }
  
  private static getMarketAnalysis(property: CommercialProperty) {
    let demand: 'high' | 'medium' | 'low' = 'medium'
    let supply: 'high' | 'medium' | 'low' = 'medium'
    let trend: 'rising' | 'stable' | 'declining' = 'stable'
    
    if (property.pedestrianTraffic === 'high' && property.cornerLocation) {
      demand = 'high'
      trend = 'rising'
    }
    
    if (property.propertyType === 'retail' && property.city === 'תל אביב') {
      demand = 'high'
      supply = 'low'
      trend = 'rising'
    }
    
    return { demand, supply, trend }
  }
  
  /**
   * Calculate income approach valuation
   */
  static calculateIncomeApproach(property: CommercialProperty, monthlyRent?: number): CommercialValuationResult {
    const estimatedMonthlyRent = monthlyRent || this.estimateMonthlyRent(property)
    const annualGrossIncome = estimatedMonthlyRent * 12
    const vacancyRate = property.occupancyRate ? (100 - property.occupancyRate) / 100 : 0.08
    const effectiveGrossIncome = annualGrossIncome * (1 - vacancyRate)
    const operatingExpenses = effectiveGrossIncome * 0.25
    const noi = effectiveGrossIncome - operatingExpenses
    
    const capRate = this.estimateCapRate(property)
    const baseValue = noi / capRate
    
    return {
      method: 'income-approach',
      baseValue,
      adjustedValue: baseValue,
      valuePerSqm: baseValue / property.totalArea,
      valueRange: {
        min: Math.round(baseValue * 0.85),
        max: Math.round(baseValue * 1.15)
      },
      confidence: 0.80,
      incomeData: {
        noi,
        capRate,
        grossIncome: annualGrossIncome,
        expenses: operatingExpenses,
        vacancyRate,
        estimatedRent: estimatedMonthlyRent
      },
      adjustmentSummary: this.getAdjustmentSummary(property),
      recommendations: [],
      marketAnalysis: this.getMarketAnalysis(property)
    }
  }
  
  private static estimateMonthlyRent(property: CommercialProperty): number {
    const baseRentPerSqm: Record<string, number> = {
      'retail': 120,
      'restaurant': 100,
      'warehouse': 40,
      'showroom': 80,
      'clinic': 90,
      'studio': 70,
      'mixed': 85
    }
    
    let rentPerSqm = baseRentPerSqm[property.propertyType] || 80
    
    if (property.city === 'תל אביב') rentPerSqm *= 1.4
    else if (property.city === 'ירושלים') rentPerSqm *= 1.2
    else if (property.city === 'חיפה') rentPerSqm *= 0.9
    
    if (property.cornerLocation) rentPerSqm *= 1.15
    if (property.pedestrianTraffic === 'high') rentPerSqm *= 1.2
    if (property.pedestrianTraffic === 'low') rentPerSqm *= 0.85
    
    return Math.round(property.totalArea * rentPerSqm)
  }
  
  private static estimateCapRate(property: CommercialProperty): number {
    let capRate = 0.06
    
    if (property.city === 'תל אביב') capRate = 0.05
    else if (property.city === 'ירושלים') capRate = 0.055
    else if (property.city === 'חיפה') capRate = 0.065
    
    if (property.condition === 'excellent' || property.condition === 'new') {
      capRate -= 0.005
    }
    
    if (property.propertyType === 'retail' && property.cornerLocation) {
      capRate -= 0.005
    }
    
    return capRate
  }
}
