export interface OfficeProperty {
  address: string
  city: string
  area: string
  
  totalArea: number
  floor: number
  totalFloors: number
  
  condition: 'new' | 'excellent' | 'good' | 'fair' | 'poor'
  buildYear: number
  
  hasElevator: boolean
  parkingSpaces: number
  
  officeClass: 'A' | 'B' | 'C'
  buildingType: 'tower' | 'mid-rise' | 'low-rise' | 'mixed-use'
  
  accessibility: {
    publicTransport: boolean
    highway: boolean
    metro: boolean
  }
  
  amenities: {
    lobby: boolean
    security24: boolean
    conferenceRooms: boolean
    kitchenette: boolean
    airConditioning: boolean
    raisedFloor: boolean
    dataInfrastructure: boolean
  }
  
  layout: 'open-plan' | 'cellular' | 'mixed'
  ceilingHeight?: number
  windows: 'perimeter' | 'interior' | 'no-windows'
  
  currentUse: 'owner-occupied' | 'rented' | 'vacant'
  rentalIncome?: number
  occupancyRate?: number
}

export interface OfficeComparable {
  id: string
  address: string
  salePrice: number
  pricePerSqm: number
  saleDate: string
  area: number
  floor: number
  condition: string
  officeClass: 'A' | 'B' | 'C'
  parkingSpaces: number
  buildYear: number
  distance: number
  
  adjustments: {
    location: number
    area: number
    floor: number
    condition: number
    class: number
    parking: number
    amenities: number
    age: number
    time: number
    total: number
  }
  
  adjustedPrice: number
  weight: number
}

export interface OfficeValuationResult {
  method: 'comparable-sales' | 'income-approach' | 'cost-approach' | 'hybrid'
  baseValue: number
  adjustedValue: number
  valuePerSqm: number
  valueRange: {
    min: number
    max: number
  }
  confidence: number
  
  comparables?: OfficeComparable[]
  weightedAverage?: number
  
  incomeData?: {
    noi: number
    capRate: number
    grossIncome: number
    expenses: number
    vacancyRate: number
  }
  
  costData?: {
    landValue: number
    constructionCost: number
    depreciation: number
    replacementCost: number
  }
  
  adjustmentSummary: {
    category: string
    adjustment: number
    reasoning: string
  }[]
  
  marketAnalysis: {
    avgPricePerSqm: number
    marketTrend: 'increasing' | 'stable' | 'decreasing'
    supplyDemand: 'high-demand' | 'balanced' | 'oversupply'
    comparableCount: number
  }
  
  recommendations: string[]
  disclaimers: string[]
  
  calculationDetails: {
    formula: string
    steps: string[]
    sources: string[]
  }
}

export class OfficeValuationCalculator {
  private static readonly OFFICE_CLASS_MULTIPLIERS = {
    'A': 1.25,
    'B': 1.0,
    'C': 0.75
  }
  
  private static readonly FLOOR_ADJUSTMENTS = {
    'ground': 0.90,
    'low': 0.95,
    'mid': 1.0,
    'high': 1.05,
    'penthouse': 1.10
  }
  
  private static readonly CONDITION_MULTIPLIERS = {
    'new': 1.15,
    'excellent': 1.08,
    'good': 1.0,
    'fair': 0.92,
    'poor': 0.80
  }
  
  private static readonly BASE_CAP_RATES = {
    'A': 0.055,
    'B': 0.065,
    'C': 0.075
  }
  
  static calculateComparableSalesValue(
    property: OfficeProperty,
    comparables: Partial<OfficeComparable>[]
  ): OfficeValuationResult {
    const adjustedComparables = comparables.map(comp => 
      this.adjustComparable(property, comp)
    )
    
    const validComparables = adjustedComparables.filter(
      comp => comp.adjustments.total >= -30 && comp.adjustments.total <= 30
    )
    
    if (validComparables.length === 0) {
      throw new Error('אין עסקאות השוואה מתאימות - סטיות גדולות מדי')
    }
    
    const weightedAverage = this.calculateWeightedAverage(validComparables)
    const valuePerSqm = weightedAverage
    const baseValue = valuePerSqm * property.totalArea
    
    const classMultiplier = this.OFFICE_CLASS_MULTIPLIERS[property.officeClass]
    const conditionMultiplier = this.CONDITION_MULTIPLIERS[property.condition]
    const floorAdjustment = this.getFloorAdjustment(property.floor, property.totalFloors)
    
    const adjustedValue = baseValue * classMultiplier * conditionMultiplier * floorAdjustment
    
    const confidence = this.calculateConfidence(validComparables, property)
    
    const valueRange = {
      min: adjustedValue * 0.90,
      max: adjustedValue * 1.10
    }
    
    const adjustmentSummary = [
      {
        category: 'דירוג משרד (Class)',
        adjustment: (classMultiplier - 1) * 100,
        reasoning: `משרד בדירוג ${property.officeClass}`
      },
      {
        category: 'מצב פיזי',
        adjustment: (conditionMultiplier - 1) * 100,
        reasoning: `מצב ${this.getConditionHebrew(property.condition)}`
      },
      {
        category: 'קומה',
        adjustment: (floorAdjustment - 1) * 100,
        reasoning: `קומה ${property.floor} מתוך ${property.totalFloors}`
      }
    ]
    
    const marketAnalysis = this.analyzeMarket(validComparables)
    
    return {
      method: 'comparable-sales',
      baseValue,
      adjustedValue,
      valuePerSqm,
      valueRange,
      confidence,
      comparables: validComparables,
      weightedAverage,
      adjustmentSummary,
      marketAnalysis,
      recommendations: this.generateRecommendations(property, adjustedValue, marketAnalysis),
      disclaimers: this.getDisclaimers(),
      calculationDetails: {
        formula: 'שווי = (ממוצע משוקלל × שטח) × מקדם דירוג × מקדם מצב × מקדם קומה',
        steps: [
          `שלב 1: חישוב ממוצע משוקלל מעסקאות השוואה: ${valuePerSqm.toLocaleString('he-IL')} ₪/מ"ר`,
          `שלב 2: כפל בשטח (${property.totalArea} מ"ר): ${baseValue.toLocaleString('he-IL')} ₪`,
          `שלב 3: התאמה לדירוג משרד (${property.officeClass}): ×${classMultiplier}`,
          `שלב 4: התאמה למצב (${property.condition}): ×${conditionMultiplier}`,
          `שלב 5: התאמה לקומה: ×${floorAdjustment.toFixed(2)}`,
          `שווי סופי: ${adjustedValue.toLocaleString('he-IL')} ₪`
        ],
        sources: [
          'תקן 19 - שומת נכסי מקרקעין',
          'עסקאות השוואה ממאגרי נדל"ן',
          'מחקרי שוק משרדים CBRE/Colliers'
        ]
      }
    }
  }
  
  static calculateIncomeApproach(property: OfficeProperty): OfficeValuationResult {
    if (!property.rentalIncome) {
      throw new Error('נדרש מידע על הכנסה משכירות לחישוב בשיטת היוון')
    }
    
    const occupancyRate = property.occupancyRate || 0.95
    const grossIncome = property.rentalIncome * 12
    const effectiveGrossIncome = grossIncome * occupancyRate
    
    const operatingExpenseRatio = 0.25
    const expenses = effectiveGrossIncome * operatingExpenseRatio
    
    const noi = effectiveGrossIncome - expenses
    
    const baseCapRate = this.BASE_CAP_RATES[property.officeClass]
    const locationAdjustment = property.accessibility.metro ? -0.005 : 0
    const conditionAdjustment = property.condition === 'new' ? -0.005 : 
                                property.condition === 'poor' ? 0.01 : 0
    
    const capRate = baseCapRate + locationAdjustment + conditionAdjustment
    
    const adjustedValue = noi / capRate
    const valuePerSqm = adjustedValue / property.totalArea
    
    const valueRange = {
      min: noi / (capRate + 0.01),
      max: noi / (capRate - 0.01)
    }
    
    return {
      method: 'income-approach',
      baseValue: adjustedValue,
      adjustedValue,
      valuePerSqm,
      valueRange,
      confidence: 0.85,
      incomeData: {
        noi,
        capRate,
        grossIncome,
        expenses,
        vacancyRate: 1 - occupancyRate
      },
      adjustmentSummary: [
        {
          category: 'הכנסה ברוטו',
          adjustment: 0,
          reasoning: `${grossIncome.toLocaleString('he-IL')} ₪ לשנה`
        },
        {
          category: 'תפוסה',
          adjustment: (occupancyRate - 1) * 100,
          reasoning: `שיעור תפוסה ${(occupancyRate * 100).toFixed(0)}%`
        },
        {
          category: 'NOI',
          adjustment: 0,
          reasoning: `${noi.toLocaleString('he-IL')} ₪ לשנה`
        },
        {
          category: 'שיעור היוון',
          adjustment: 0,
          reasoning: `${(capRate * 100).toFixed(2)}%`
        }
      ],
      marketAnalysis: {
        avgPricePerSqm: valuePerSqm,
        marketTrend: 'stable',
        supplyDemand: 'balanced',
        comparableCount: 0
      },
      recommendations: [
        `שיעור התשואה (Cap Rate) של ${(capRate * 100).toFixed(2)}% תואם למשרדים בדירוג ${property.officeClass}`,
        `NOI שנתי: ${noi.toLocaleString('he-IL')} ₪`,
        property.occupancyRate && property.occupancyRate < 0.9 ? 
          'שיעור תפוסה נמוך - יש פוטנציאל להגדלת הכנסות' : 
          'שיעור תפוסה טוב'
      ],
      disclaimers: this.getDisclaimers(),
      calculationDetails: {
        formula: 'שווי = NOI / Cap Rate',
        steps: [
          `הכנסה ברוטו שנתית: ${grossIncome.toLocaleString('he-IL')} ₪`,
          `תפוסה (${(occupancyRate * 100).toFixed(0)}%): ${effectiveGrossIncome.toLocaleString('he-IL')} ₪`,
          `הוצאות תפעול (${(operatingExpenseRatio * 100).toFixed(0)}%): ${expenses.toLocaleString('he-IL')} ₪`,
          `NOI: ${noi.toLocaleString('he-IL')} ₪`,
          `Cap Rate: ${(capRate * 100).toFixed(2)}%`,
          `שווי: ${adjustedValue.toLocaleString('he-IL')} ₪`
        ],
        sources: [
          'תקן 22 - שומת נכסים מניבים',
          'מחקרי תשואות CBRE Israel',
          'דוחות שוק משרדים רבעוניים'
        ]
      }
    }
  }
  
  static calculateCostApproach(property: OfficeProperty): OfficeValuationResult {
    const landValuePerSqm = this.estimateLandValue(property.city, property.area)
    const landValue = landValuePerSqm * property.totalArea * 0.15
    
    const constructionCostPerSqm = this.getConstructionCost(property.officeClass, property.buildYear)
    const constructionCost = constructionCostPerSqm * property.totalArea
    
    const age = new Date().getFullYear() - property.buildYear
    const effectiveAge = this.getEffectiveAge(age, property.condition)
    const economicLife = 50
    
    const depreciationRate = Math.min(effectiveAge / economicLife, 0.8)
    const depreciation = constructionCost * depreciationRate
    
    const adjustedValue = landValue + (constructionCost - depreciation)
    const valuePerSqm = adjustedValue / property.totalArea
    
    return {
      method: 'cost-approach',
      baseValue: constructionCost + landValue,
      adjustedValue,
      valuePerSqm,
      valueRange: {
        min: adjustedValue * 0.85,
        max: adjustedValue * 1.15
      },
      confidence: 0.75,
      costData: {
        landValue,
        constructionCost,
        depreciation,
        replacementCost: constructionCost
      },
      adjustmentSummary: [
        {
          category: 'ערך קרקע',
          adjustment: 0,
          reasoning: `${landValue.toLocaleString('he-IL')} ₪`
        },
        {
          category: 'עלות בנייה',
          adjustment: 0,
          reasoning: `${constructionCostPerSqm.toLocaleString('he-IL')} ₪/מ"ר`
        },
        {
          category: 'פחת',
          adjustment: -(depreciationRate * 100),
          reasoning: `גיל אפקטיבי ${effectiveAge} שנים`
        }
      ],
      marketAnalysis: {
        avgPricePerSqm: valuePerSqm,
        marketTrend: 'stable',
        supplyDemand: 'balanced',
        comparableCount: 0
      },
      recommendations: [
        age > 30 ? 'בניין ישן - שקול שיפוץ מקיף' : 'מצב בניין טוב',
        `פחת מצטבר: ${(depreciationRate * 100).toFixed(0)}%`,
        'שיטת העלות מתאימה במיוחד למשרדים חדשים או ייחודיים'
      ],
      disclaimers: this.getDisclaimers(),
      calculationDetails: {
        formula: 'שווי = ערך קרקע + (עלות בנייה - פחת)',
        steps: [
          `ערך קרקע: ${landValue.toLocaleString('he-IL')} ₪`,
          `עלות בנייה: ${constructionCost.toLocaleString('he-IL')} ₪`,
          `פחת (${(depreciationRate * 100).toFixed(0)}%): ${depreciation.toLocaleString('he-IL')} ₪`,
          `שווי סופי: ${adjustedValue.toLocaleString('he-IL')} ₪`
        ],
        sources: [
          'מחירוני בנייה דקל',
          'מחקרי ערך קרקע לפי אזורים',
          'טבלאות פחת סטנדרטיות'
        ]
      }
    }
  }
  
  private static adjustComparable(
    property: OfficeProperty,
    comparable: Partial<OfficeComparable>
  ): OfficeComparable {
    const adjustments = {
      location: 0,
      area: 0,
      floor: 0,
      condition: 0,
      class: 0,
      parking: 0,
      amenities: 0,
      age: 0,
      time: 0,
      total: 0
    }
    
    if (comparable.distance) {
      if (comparable.distance > 2000) adjustments.location = -10
      else if (comparable.distance > 1000) adjustments.location = -5
      else if (comparable.distance < 200) adjustments.location = 2
    }
    
    if (comparable.area && property.totalArea) {
      const sizeDiff = (comparable.area - property.totalArea) / property.totalArea
      if (Math.abs(sizeDiff) > 0.5) adjustments.area = sizeDiff > 0 ? -8 : 8
      else if (Math.abs(sizeDiff) > 0.3) adjustments.area = sizeDiff > 0 ? -5 : 5
      else if (Math.abs(sizeDiff) > 0.15) adjustments.area = sizeDiff > 0 ? -3 : 3
    }
    
    if (comparable.floor !== undefined && property.floor !== undefined) {
      const floorDiff = Math.abs(comparable.floor - property.floor)
      adjustments.floor = floorDiff * -1.5
    }
    
    if (comparable.officeClass && property.officeClass) {
      const classOrder = { 'A': 3, 'B': 2, 'C': 1 }
      const classDiff = classOrder[comparable.officeClass] - classOrder[property.officeClass]
      adjustments.class = classDiff * -8
    }
    
    if (comparable.parkingSpaces !== undefined && property.parkingSpaces !== undefined) {
      const parkingDiff = comparable.parkingSpaces - property.parkingSpaces
      adjustments.parking = parkingDiff * -2
    }
    
    if (comparable.buildYear && property.buildYear) {
      const ageDiff = Math.abs(comparable.buildYear - property.buildYear)
      if (ageDiff > 10) adjustments.age = -5
      else if (ageDiff > 5) adjustments.age = -3
    }
    
    if (comparable.saleDate) {
      const monthsDiff = this.getMonthsDifference(comparable.saleDate, new Date().toISOString())
      if (monthsDiff > 12) adjustments.time = monthsDiff * 0.3
      else if (monthsDiff > 6) adjustments.time = monthsDiff * 0.2
    }
    
    adjustments.total = Object.values(adjustments).reduce((sum, val) => sum + val, 0)
    
    const adjustmentMultiplier = 1 + (adjustments.total / 100)
    const adjustedPrice = (comparable.pricePerSqm || 0) * adjustmentMultiplier
    
    const weight = this.calculateComparableWeight(adjustments.total, comparable.distance || 0)
    
    return {
      id: comparable.id || Math.random().toString(),
      address: comparable.address || '',
      salePrice: comparable.salePrice || 0,
      pricePerSqm: comparable.pricePerSqm || 0,
      saleDate: comparable.saleDate || '',
      area: comparable.area || 0,
      floor: comparable.floor || 0,
      condition: comparable.condition || 'good',
      officeClass: comparable.officeClass || 'B',
      parkingSpaces: comparable.parkingSpaces || 0,
      buildYear: comparable.buildYear || 2000,
      distance: comparable.distance || 0,
      adjustments,
      adjustedPrice,
      weight
    }
  }
  
  private static calculateWeightedAverage(comparables: OfficeComparable[]): number {
    const totalWeight = comparables.reduce((sum, comp) => sum + comp.weight, 0)
    const weightedSum = comparables.reduce(
      (sum, comp) => sum + (comp.adjustedPrice * comp.weight),
      0
    )
    return weightedSum / totalWeight
  }
  
  private static calculateComparableWeight(totalAdjustment: number, distance: number): number {
    let weight = 1.0
    
    const absAdjustment = Math.abs(totalAdjustment)
    if (absAdjustment > 20) weight *= 0.5
    else if (absAdjustment > 15) weight *= 0.7
    else if (absAdjustment > 10) weight *= 0.85
    
    if (distance > 2000) weight *= 0.6
    else if (distance > 1000) weight *= 0.8
    else if (distance < 500) weight *= 1.2
    
    return weight
  }
  
  private static getFloorAdjustment(floor: number, totalFloors: number): number {
    if (floor === 0) return this.FLOOR_ADJUSTMENTS.ground
    if (floor === totalFloors) return this.FLOOR_ADJUSTMENTS.penthouse
    
    const ratio = floor / totalFloors
    if (ratio < 0.3) return this.FLOOR_ADJUSTMENTS.low
    if (ratio > 0.7) return this.FLOOR_ADJUSTMENTS.high
    return this.FLOOR_ADJUSTMENTS.mid
  }
  
  private static calculateConfidence(comparables: OfficeComparable[], _property: OfficeProperty): number {
    let confidence = 0.8
    
    if (comparables.length >= 5) confidence += 0.1
    else if (comparables.length < 3) confidence -= 0.15
    
    const avgAdjustment = comparables.reduce(
      (sum, comp) => sum + Math.abs(comp.adjustments.total), 
      0
    ) / comparables.length
    
    if (avgAdjustment < 10) confidence += 0.1
    else if (avgAdjustment > 20) confidence -= 0.15
    
    const avgDistance = comparables.reduce((sum, comp) => sum + comp.distance, 0) / comparables.length
    if (avgDistance < 500) confidence += 0.05
    else if (avgDistance > 2000) confidence -= 0.1
    
    return Math.max(0.5, Math.min(0.95, confidence))
  }
  
  private static analyzeMarket(comparables: OfficeComparable[]) {
    const avgPricePerSqm = comparables.reduce(
      (sum, comp) => sum + comp.pricePerSqm, 
      0
    ) / comparables.length
    
    const recentComps = comparables.filter(comp => {
      const monthsAgo = this.getMonthsDifference(comp.saleDate, new Date().toISOString())
      return monthsAgo <= 6
    })
    
    const olderComps = comparables.filter(comp => {
      const monthsAgo = this.getMonthsDifference(comp.saleDate, new Date().toISOString())
      return monthsAgo > 6 && monthsAgo <= 12
    })
    
    let marketTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
    if (recentComps.length > 0 && olderComps.length > 0) {
      const recentAvg = recentComps.reduce((s, c) => s + c.pricePerSqm, 0) / recentComps.length
      const olderAvg = olderComps.reduce((s, c) => s + c.pricePerSqm, 0) / olderComps.length
      const change = (recentAvg - olderAvg) / olderAvg
      
      if (change > 0.05) marketTrend = 'increasing'
      else if (change < -0.05) marketTrend = 'decreasing'
    }
    
    return {
      avgPricePerSqm,
      marketTrend,
      supplyDemand: 'balanced' as const,
      comparableCount: comparables.length
    }
  }
  
  private static generateRecommendations(
    property: OfficeProperty,
    value: number,
    market: any
  ): string[] {
    const recommendations: string[] = []
    
    if (market.marketTrend === 'increasing') {
      recommendations.push('מגמת שוק עולה - שווי צפוי לעלות בטווח הקצר')
    } else if (market.marketTrend === 'decreasing') {
      recommendations.push('מגמת שוק יורדת - מומלץ להמתין לפני מכירה')
    }
    
    if (property.officeClass === 'A') {
      recommendations.push('משרד בדירוג A - ביקוש גבוה ונזילות טובה')
    }
    
    if (!property.amenities.airConditioning) {
      recommendations.push('התקנת מיזוג תגדיל את השווי ב-5-8%')
    }
    
    if (!property.amenities.dataInfrastructure) {
      recommendations.push('שדרוג תשתית תקשורת ישפר את האטרקטיביות')
    }
    
    if (property.parkingSpaces < 1) {
      recommendations.push('הוספת חניה תגדיל משמעותית את השווי')
    }
    
    if (property.accessibility.metro) {
      recommendations.push('קרבה לרכבת קלה - יתרון משמעותי')
    }
    
    return recommendations
  }
  
  private static getDisclaimers(): string[] {
    return [
      'השומה מבוססת על נתונים ציבוריים וניתוח מקצועי נכון למועד החישוב',
      'החישוב מהווה כלי עזר בלבד ואינו תחליף לשומה מקצועית מלאה',
      'השווי הסופי כפוף לשיקול דעת שמאי מקרקעין מוסמך',
      'מומלץ לעדכן את השומה כל 6-12 חודשים',
      'שינויים בשוק, בתכנון או במצב הנכס עשויים להשפיע על השווי'
    ]
  }
  
  private static getConditionHebrew(condition: string): string {
    const map: Record<string, string> = {
      'new': 'חדש',
      'excellent': 'מצוין',
      'good': 'טוב',
      'fair': 'בינוני',
      'poor': 'דורש שיפוץ'
    }
    return map[condition] || condition
  }
  
  private static getMonthsDifference(date1: string, date2: string): number {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30))
  }
  
  private static estimateLandValue(city: string, _area: string): number {
    const cityValues: Record<string, number> = {
      'תל אביב': 150000,
      'תל אביב-יפו': 150000,
      'רמת גן': 120000,
      'גבעתיים': 110000,
      'הרצליה': 130000,
      'ירושלים': 80000,
      'חיפה': 60000,
      'באר שבע': 40000,
      'פתח תקווה': 70000,
      'ראשון לציון': 65000,
      'נתניה': 55000,
      'רמלה': 45000,
      'לוד': 43000,
      'רחובות': 55000,
      'אשדוד': 48000,
      'אשקלון': 42000
    }
    
    return cityValues[city] || 50000
  }
  
  private static getConstructionCost(officeClass: 'A' | 'B' | 'C', buildYear: number): number {
    const baseCosts = {
      'A': 12000,
      'B': 9000,
      'C': 7000
    }
    
    const age = new Date().getFullYear() - buildYear
    const inflationFactor = Math.pow(1.025, age)
    
    return baseCosts[officeClass] / inflationFactor
  }
  
  private static getEffectiveAge(actualAge: number, condition: string): number {
    const conditionFactors = {
      'new': 0.5,
      'excellent': 0.7,
      'good': 1.0,
      'fair': 1.3,
      'poor': 1.6
    }
    
    return actualAge * (conditionFactors[condition as keyof typeof conditionFactors] || 1.0)
  }
}
