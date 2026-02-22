/**
 * Residential Property Valuation Calculator
 * מחשבון שווי נכסי מגורים
 * 
 * Integrated with Nadlan.gov.il API for real market data
 */

export interface ResidentialProperty {
  address: string
  city: string
  neighborhood?: string
  
  area: number
  rooms: number
  floor?: number
  totalFloors?: number
  
  condition: 'new' | 'excellent' | 'good' | 'fair' | 'poor'
  buildYear?: number
  renovationYear?: number
  
  hasElevator: boolean
  hasParkingSpot: boolean
  hasBalcony: boolean
  hasStorage: boolean
  hasPenthouse: boolean
  hasGarden: boolean
  
  propertyType: 'apartment' | 'penthouse' | 'garden-apartment' | 'duplex' | 'townhouse' | 'cottage' | 'villa'
  
  sunExposure?: 'north' | 'south' | 'east' | 'west' | 'dual' | 'triple'
  view?: 'open' | 'partial' | 'buildings' | 'park' | 'sea' | 'city'
  
  airDirection?: 'single' | 'dual' | 'triple' | 'quadruple'
  
  gush?: string
  helka?: string
  
  lat?: number
  lng?: number
}

export interface ResidentialComparable {
  id: string
  address: string
  salePrice: number
  pricePerSqm: number
  saleDate: string
  
  area: number
  rooms: number
  floor?: number
  
  condition: string
  buildYear?: number
  
  hasElevator: boolean
  hasParkingSpot: boolean
  hasBalcony: boolean
  
  distance: number
  
  adjustments: {
    location: number
    area: number
    floor: number
    condition: number
    age: number
    elevator: number
    parking: number
    balcony: number
    time: number
    total: number
  }
  
  adjustedPrice: number
  weight: number
}

export interface ResidentialValuationResult {
  method: 'comparable-sales' | 'income-approach' | 'cost-approach' | 'hybrid'
  baseValue: number
  adjustedValue: number
  valuePerSqm: number
  valueRange: {
    min: number
    max: number
  }
  confidence: number
  
  comparables?: ResidentialComparable[]
  weightedAverage?: number
  
  incomeData?: {
    monthlyRent: number
    annualRent: number
    grossYield: number
    netYield: number
    capRate: number
  }
  
  adjustmentSummary: {
    positiveFactors: string[]
    negativeFactors: string[]
  }
  
  recommendations: string[]
}

export class ResidentialValuationCalculator {
  
  /**
   * Calculate property value using comparable sales method
   */
  static calculateComparableSalesValue(
    property: ResidentialProperty,
    comparables: Partial<ResidentialComparable>[]
  ): ResidentialValuationResult {
    
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
      adjustedComparables.map(c => c.adjustedPrice / (c.area || 1))
    )
    
    return {
      method: 'comparable-sales',
      baseValue,
      adjustedValue: baseValue,
      valuePerSqm,
      valueRange: {
        min: Math.round(baseValue * 0.9),
        max: Math.round(baseValue * 1.1)
      },
      confidence: this.calculateConfidence(adjustedComparables.length, stdDev),
      comparables: adjustedComparables,
      weightedAverage,
      adjustmentSummary: this.getAdjustmentSummary(property),
      recommendations: this.getRecommendations(property, adjustedComparables)
    }
  }
  
  /**
   * Calculate adjustments for a comparable property
   */
  private static calculateAdjustments(
    subject: ResidentialProperty,
    comparable: Partial<ResidentialComparable>
  ): ResidentialComparable {
    
    const adjustments = {
      location: this.calculateLocationAdjustment(comparable.distance || 0),
      area: this.calculateAreaAdjustment(subject.area, comparable.area || 100),
      floor: this.calculateFloorAdjustment(subject.floor, comparable.floor),
      condition: this.calculateConditionAdjustment(subject.condition, comparable.condition),
      age: this.calculateAgeAdjustment(subject.buildYear, comparable.buildYear),
      elevator: this.calculateElevatorAdjustment(subject.hasElevator, comparable.hasElevator),
      parking: this.calculateParkingAdjustment(subject.hasParkingSpot, comparable.hasParkingSpot),
      balcony: this.calculateBalconyAdjustment(subject.hasBalcony, comparable.hasBalcony),
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
      rooms: comparable.rooms || 3,
      floor: comparable.floor,
      condition: comparable.condition || 'good',
      buildYear: comparable.buildYear,
      hasElevator: comparable.hasElevator || false,
      hasParkingSpot: comparable.hasParkingSpot || false,
      hasBalcony: comparable.hasBalcony || false,
      distance: comparable.distance || 0,
      adjustments,
      adjustedPrice,
      weight
    }
  }
  
  private static calculateLocationAdjustment(distance: number): number {
    if (distance < 100) return 0
    if (distance < 300) return -0.02
    if (distance < 500) return -0.04
    if (distance < 1000) return -0.06
    return -0.08
  }
  
  private static calculateAreaAdjustment(subjectArea: number, compArea: number): number {
    const diff = (compArea - subjectArea) / subjectArea
    return diff * -0.15
  }
  
  private static calculateFloorAdjustment(subjectFloor?: number, compFloor?: number): number {
    if (!subjectFloor || !compFloor) return 0
    const diff = compFloor - subjectFloor
    return diff * -0.015
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
    
    return diff * -0.05
  }
  
  private static calculateAgeAdjustment(subjectYear?: number, compYear?: number): number {
    if (!subjectYear || !compYear) return 0
    const ageDiff = (new Date().getFullYear() - compYear) - (new Date().getFullYear() - subjectYear)
    return ageDiff * -0.01
  }
  
  private static calculateElevatorAdjustment(subject: boolean, comp?: boolean): number {
    if (subject && !comp) return 0.03
    if (!subject && comp) return -0.03
    return 0
  }
  
  private static calculateParkingAdjustment(subject: boolean, comp?: boolean): number {
    if (subject && !comp) return 0.05
    if (!subject && comp) return -0.05
    return 0
  }
  
  private static calculateBalconyAdjustment(subject: boolean, comp?: boolean): number {
    if (subject && !comp) return 0.02
    if (!subject && comp) return -0.02
    return 0
  }
  
  private static calculateTimeAdjustment(saleDate: string): number {
    const saleTime = new Date(saleDate).getTime()
    const now = Date.now()
    const monthsAgo = (now - saleTime) / (1000 * 60 * 60 * 24 * 30)
    
    const annualAppreciation = 0.05
    return (monthsAgo / 12) * annualAppreciation
  }
  
  private static calculateComparableWeight(adjustments: any, distance: number): number {
    const totalAdjustment = Math.abs(adjustments.total)
    const distanceWeight = Math.max(0, 1 - (distance / 2000))
    const adjustmentWeight = Math.max(0, 1 - totalAdjustment)
    
    return (distanceWeight + adjustmentWeight) / 2
  }
  
  private static calculateWeightedAverage(comparables: ResidentialComparable[]): number {
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
    if (stdDev < 1000) confidence += 0.15
    
    return Math.min(0.95, confidence)
  }
  
  private static getAdjustmentSummary(property: ResidentialProperty) {
    const positive: string[] = []
    const negative: string[] = []
    
    if (property.hasElevator) positive.push('מעלית')
    if (property.hasParkingSpot) positive.push('חניה')
    if (property.hasBalcony) positive.push('מרפסת')
    if (property.hasStorage) positive.push('מחסן')
    if (property.condition === 'excellent' || property.condition === 'new') positive.push('מצב מעולה')
    
    if (!property.hasElevator && property.floor && property.floor > 2) negative.push('אין מעלית')
    if (!property.hasParkingSpot) negative.push('אין חניה')
    if (property.condition === 'poor' || property.condition === 'fair') negative.push('מצב בינוני-ירוד')
    
    return { positiveFactors: positive, negativeFactors: negative }
  }
  
  private static getRecommendations(
    property: ResidentialProperty,
    comparables: ResidentialComparable[]
  ): string[] {
    const recommendations: string[] = []
    
    if (comparables.length < 5) {
      recommendations.push('מומלץ להוסיף עסקאות השוואה נוספות לשיפור דיוק השומה')
    }
    
    if (!property.hasElevator && property.floor && property.floor > 2) {
      recommendations.push('הוספת מעלית יכולה להעלות את שווי הנכס ב-5-8%')
    }
    
    if (!property.hasParkingSpot) {
      recommendations.push('הוספת חניה יכולה להעלות את שווי הנכס ב-7-10%')
    }
    
    if (property.condition === 'fair' || property.condition === 'poor') {
      recommendations.push('שיפוץ יכול להעלות את שווי הנכס ב-10-15%')
    }
    
    return recommendations
  }
  
  /**
   * Calculate income approach valuation
   */
  static calculateIncomeApproach(property: ResidentialProperty, monthlyRent: number): ResidentialValuationResult {
    const annualRent = monthlyRent * 12
    const grossYield = 0.04
    const netYield = 0.03
    const baseValue = annualRent / netYield
    
    return {
      method: 'income-approach',
      baseValue,
      adjustedValue: baseValue,
      valuePerSqm: baseValue / property.area,
      valueRange: {
        min: Math.round(baseValue * 0.9),
        max: Math.round(baseValue * 1.1)
      },
      confidence: 0.75,
      incomeData: {
        monthlyRent,
        annualRent,
        grossYield,
        netYield,
        capRate: netYield
      },
      adjustmentSummary: this.getAdjustmentSummary(property),
      recommendations: []
    }
  }
}
