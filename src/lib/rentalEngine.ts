import type { RentalTransaction, RentalComparable, RentalAnalysis } from './rentalTypes'
import { createLogger } from '@/lib/logger'

const log = createLogger('RentalEngine')

export function calculateRentalComparables(
  subjectProperty: {
    address: string
    area: number
    propertyType: string
    rooms?: number
    floor?: number
    city: string
    neighborhood: string
    condition: string
    hasElevator?: boolean
    hasParking?: boolean
    builtYear?: number
  },
  transactions: RentalTransaction[]
): RentalAnalysis {
  const filtered = filterRelevantTransactions(subjectProperty, transactions)
  
  const comparables: RentalComparable[] = filtered.map(transaction => {
    const adjustments = calculateAdjustments(subjectProperty, transaction)
    const adjustedRent = transaction.monthlyRent * (1 + adjustments.total / 100)
    const adjustedRentPerSqm = adjustedRent / transaction.area
    
    return {
      transaction,
      similarity: calculateSimilarity(subjectProperty, transaction),
      adjustments,
      adjustedRent,
      adjustedRentPerSqm
    }
  })
  
  comparables.sort((a, b) => b.similarity - a.similarity)
  
  const topComparables = comparables.slice(0, Math.min(10, comparables.length))
  
  const statistics = calculateStatistics(topComparables)
  const recommendedRent = calculateRecommendedRent(topComparables, statistics, subjectProperty.area)
  const marketTrend = calculateMarketTrend(transactions)
  
  return {
    subjectProperty,
    comparables: topComparables,
    statistics,
    recommendedRent,
    marketTrend
  }
}

function filterRelevantTransactions(
  subject: any,
  transactions: RentalTransaction[]
): RentalTransaction[] {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  return transactions.filter(t => {
    if (t.propertyType !== subject.propertyType) return false
    if (t.city !== subject.city) return false
    
    const transactionDate = new Date(t.rentalDate)
    if (transactionDate < sixMonthsAgo) return false
    
    const areaDiff = Math.abs(t.area - subject.area) / subject.area
    if (areaDiff > 0.4) return false
    
    if (subject.rooms && t.rooms) {
      const roomDiff = Math.abs(t.rooms - subject.rooms)
      if (roomDiff > 1) return false
    }
    
    return true
  })
}

function calculateAdjustments(
  subject: any,
  transaction: RentalTransaction
): RentalComparable['adjustments'] {
  const adjustments = {
    area: 0,
    floor: 0,
    age: 0,
    condition: 0,
    features: 0,
    location: 0,
    time: 0,
    total: 0
  }
  
  const areaDiff = transaction.area - subject.area
  if (areaDiff !== 0) {
    adjustments.area = (areaDiff / subject.area) * -10
  }
  
  if (subject.floor !== undefined && transaction.floor !== undefined) {
    const floorDiff = subject.floor - transaction.floor
    adjustments.floor = floorDiff * 1.5
  }
  
  if (subject.builtYear && transaction.builtYear) {
    const ageDiff = (transaction.builtYear - subject.builtYear)
    adjustments.age = ageDiff * 0.3
  }
  
  const conditionValue: Record<string, number> = {
    new: 5,
    renovated: 4,
    good: 3,
    fair: 2,
    poor: 1
  }
  
  const subjectConditionValue = conditionValue[subject.condition] || 3
  const transactionConditionValue = conditionValue[transaction.condition] || 3
  adjustments.condition = (subjectConditionValue - transactionConditionValue) * 3
  
  let featureScore = 0
  if (subject.hasParking && !transaction.hasParking) featureScore += 5
  if (!subject.hasParking && transaction.hasParking) featureScore -= 5
  if (subject.hasElevator && !transaction.hasElevator) featureScore += 3
  if (!subject.hasElevator && transaction.hasElevator) featureScore -= 3
  adjustments.features = featureScore
  
  if (subject.neighborhood !== transaction.neighborhood) {
    adjustments.location = -5
  }
  
  const monthsAgo = (Date.now() - new Date(transaction.rentalDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  adjustments.time = monthsAgo * 0.5
  
  adjustments.total = Object.values(adjustments).reduce((sum, val) => {
    if (typeof val === 'number' && val !== adjustments.total) {
      return sum + val
    }
    return sum
  }, 0)
  
  return adjustments
}

function calculateSimilarity(subject: any, transaction: RentalTransaction): number {
  let score = 100
  
  const areaDiff = Math.abs(transaction.area - subject.area) / subject.area
  score -= areaDiff * 20
  
  if (subject.neighborhood === transaction.neighborhood) {
    score += 10
  } else {
    score -= 15
  }
  
  if (subject.rooms && transaction.rooms) {
    const roomDiff = Math.abs(transaction.rooms - subject.rooms)
    score -= roomDiff * 5
  }
  
  if (subject.floor !== undefined && transaction.floor !== undefined) {
    const floorDiff = Math.abs(subject.floor - transaction.floor)
    score -= floorDiff * 2
  }
  
  const monthsAgo = (Date.now() - new Date(transaction.rentalDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  score -= monthsAgo * 1.5
  
  if (subject.hasParking === transaction.hasParking) score += 3
  if (subject.hasElevator === transaction.hasElevator) score += 2
  
  return Math.max(0, Math.min(100, score))
}

function calculateStatistics(comparables: RentalComparable[]) {
  if (comparables.length === 0) {
    return {
      averageRent: 0,
      medianRent: 0,
      minRent: 0,
      maxRent: 0,
      averageRentPerSqm: 0,
      medianRentPerSqm: 0,
      minRentPerSqm: 0,
      maxRentPerSqm: 0,
      stdDeviation: 0,
      confidenceLevel: 0
    }
  }
  
  const rents = comparables.map(c => c.adjustedRent)
  const rentsPerSqm = comparables.map(c => c.adjustedRentPerSqm)
  
  const averageRent = rents.reduce((a, b) => a + b, 0) / rents.length
  const averageRentPerSqm = rentsPerSqm.reduce((a, b) => a + b, 0) / rentsPerSqm.length
  
  const sortedRents = [...rents].sort((a, b) => a - b)
  const sortedRentsPerSqm = [...rentsPerSqm].sort((a, b) => a - b)
  
  const medianRent = sortedRents[Math.floor(sortedRents.length / 2)]
  const medianRentPerSqm = sortedRentsPerSqm[Math.floor(sortedRentsPerSqm.length / 2)]
  
  const minRent = Math.min(...rents)
  const maxRent = Math.max(...rents)
  const minRentPerSqm = Math.min(...rentsPerSqm)
  const maxRentPerSqm = Math.max(...rentsPerSqm)
  
  const variance = rents.reduce((sum, rent) => sum + Math.pow(rent - averageRent, 2), 0) / rents.length
  const stdDeviation = Math.sqrt(variance)
  
  const avgSimilarity = comparables.reduce((sum, c) => sum + c.similarity, 0) / comparables.length
  const confidenceLevel = Math.min(100, avgSimilarity * (comparables.length / 5))
  
  return {
    averageRent,
    medianRent,
    minRent,
    maxRent,
    averageRentPerSqm,
    medianRentPerSqm,
    minRentPerSqm,
    maxRentPerSqm,
    stdDeviation,
    confidenceLevel
  }
}

function calculateRecommendedRent(
  comparables: RentalComparable[],
  _statistics: any,
  _subjectArea: number
): RentalAnalysis['recommendedRent'] {
  if (comparables.length === 0) {
    return {
      low: 0,
      mid: 0,
      high: 0,
      confidence: 'low',
      reasoning: 'אין נתוני השוואה זמינים'
    }
  }
  
  const topComparables = comparables.slice(0, Math.min(5, comparables.length))
  const weightedRents = topComparables.map(c => ({
    rent: c.adjustedRent,
    weight: c.similarity / 100
  }))
  
  const totalWeight = weightedRents.reduce((sum, wr) => sum + wr.weight, 0)
  const weightedAverage = weightedRents.reduce((sum, wr) => sum + (wr.rent * wr.weight), 0) / totalWeight
  
  const mid = Math.round(weightedAverage / 100) * 100
  const low = Math.round((mid * 0.95) / 100) * 100
  const high = Math.round((mid * 1.05) / 100) * 100
  
  const avgSimilarity = topComparables.reduce((sum, c) => sum + c.similarity, 0) / topComparables.length
  
  let confidence: 'low' | 'medium' | 'high'
  if (avgSimilarity >= 80 && comparables.length >= 5) {
    confidence = 'high'
  } else if (avgSimilarity >= 60 && comparables.length >= 3) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }
  
  const reasoning = `מבוסס על ${topComparables.length} עסקאות דומות עם רמת דמיון ממוצעת של ${Math.round(avgSimilarity)}%`
  
  return {
    low,
    mid,
    high,
    confidence,
    reasoning
  }
}

function calculateMarketTrend(transactions: RentalTransaction[]): RentalAnalysis['marketTrend'] {
  if (transactions.length < 5) {
    return {
      direction: 'stable',
      changePercent: 0,
      period: '6 חודשים אחרונים'
    }
  }
  
  const sorted = [...transactions].sort((a, b) => 
    new Date(a.rentalDate).getTime() - new Date(b.rentalDate).getTime()
  )
  
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  const recent = sorted.filter(t => new Date(t.rentalDate) >= threeMonthsAgo)
  const older = sorted.filter(t => new Date(t.rentalDate) < threeMonthsAgo)
  
  if (recent.length === 0 || older.length === 0) {
    return {
      direction: 'stable',
      changePercent: 0,
      period: '6 חודשים אחרונים'
    }
  }
  
  const recentAvg = recent.reduce((sum, t) => sum + (t.monthlyRent / t.area), 0) / recent.length
  const olderAvg = older.reduce((sum, t) => sum + (t.monthlyRent / t.area), 0) / older.length
  
  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100
  
  let direction: 'increasing' | 'stable' | 'decreasing'
  if (changePercent > 2) {
    direction = 'increasing'
  } else if (changePercent < -2) {
    direction = 'decreasing'
  } else {
    direction = 'stable'
  }
  
  return {
    direction,
    changePercent: Math.round(changePercent * 10) / 10,
    period: '6 חודשים אחרונים'
  }
}

export function parseCSVRentalData(csvContent: string): RentalTransaction[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim())
  const transactions: RentalTransaction[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    try {
      const transaction: RentalTransaction = {
        id: `rental-${Date.now()}-${i}`,
        address: row['כתובת'] || row['address'] || '',
        city: row['עיר'] || row['city'] || '',
        neighborhood: row['שכונה'] || row['neighborhood'] || '',
        street: row['רחוב'] || row['street'] || '',
        houseNumber: row['מספר בית'] || row['houseNumber'] || '',
        apartmentNumber: row['מספר דירה'] || row['apartmentNumber'],
        floor: row['קומה'] || row['floor'] ? parseInt(row['קומה'] || row['floor']) : undefined,
        propertyType: (row['סוג נכס'] || row['propertyType'] || 'apartment') as any,
        rooms: row['חדרים'] || row['rooms'] ? parseFloat(row['חדרים'] || row['rooms']) : undefined,
        area: parseFloat(row['שטח'] || row['area'] || '0'),
        builtYear: row['שנת בנייה'] || row['builtYear'] ? parseInt(row['שנת בנייה'] || row['builtYear']) : undefined,
        monthlyRent: parseFloat(row['שכר דירה'] || row['monthlyRent'] || row['rent'] || '0'),
        currency: 'ILS',
        rentalDate: row['תאריך שכירות'] || row['rentalDate'] || row['date'] || new Date().toISOString(),
        leaseTermMonths: row['תקופת שכירות'] || row['leaseTermMonths'] ? parseInt(row['תקופת שכירות'] || row['leaseTermMonths']) : 12,
        furnished: (row['מרוהט'] || row['furnished'] || 'false').toLowerCase() === 'true' || row['מרוהט'] === 'כן',
        hasElevator: (row['מעלית'] || row['hasElevator'] || 'false').toLowerCase() === 'true' || row['מעלית'] === 'כן',
        hasParking: (row['חניה'] || row['hasParking'] || 'false').toLowerCase() === 'true' || row['חניה'] === 'כן',
        hasStorage: (row['מחסן'] || row['hasStorage'] || 'false').toLowerCase() === 'true' || row['מחסן'] === 'כן',
        hasBalcony: (row['מרפסת'] || row['hasBalcony'] || 'false').toLowerCase() === 'true' || row['מרפסת'] === 'כן',
        hasAirConditioning: (row['מזגן'] || row['hasAirConditioning'] || 'false').toLowerCase() === 'true' || row['מזגן'] === 'כן',
        condition: (row['מצב'] || row['condition'] || 'good') as any,
        utilities: {
          includedInRent: [],
          tenantResponsibility: []
        },
        landlordType: 'private',
        source: 'import',
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      if (transaction.area > 0 && transaction.monthlyRent > 0) {
        transactions.push(transaction)
      }
    } catch (error) {
      log.error('Error parsing row:', i, error)
    }
  }
  
  return transactions
}

export function generateMockRentalData(): RentalTransaction[] {
  const cities = ['תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'רעננה', 'הרצליה']
  const neighborhoods = ['מרכז', 'צפון', 'דרום', 'מזרח', 'מערב']
  const streets = ['הרצל', 'רוטשילד', 'דיזנגוף', 'בן יהודה', 'ביאליק', 'אלנבי', 'שינקין']
  const conditions: Array<'new' | 'renovated' | 'good' | 'fair' | 'poor'> = ['new', 'renovated', 'good', 'fair', 'poor']
  
  const transactions: RentalTransaction[] = []
  
  for (let i = 0; i < 100; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)]
    const neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)]
    const street = streets[Math.floor(Math.random() * streets.length)]
    const rooms = Math.floor(Math.random() * 5) + 1
    const area = 50 + Math.floor(Math.random() * 100)
    const floor = Math.floor(Math.random() * 10)
    const condition = conditions[Math.floor(Math.random() * conditions.length)]
    
    const baseRent = city === 'תל אביב' ? 40 : city === 'ירושלים' ? 35 : 30
    const monthlyRent = (baseRent * area) + (Math.random() * 1000 - 500)
    
    const daysAgo = Math.floor(Math.random() * 180)
    const rentalDate = new Date()
    rentalDate.setDate(rentalDate.getDate() - daysAgo)
    
    transactions.push({
      id: `rental-mock-${i}`,
      address: `${street} ${Math.floor(Math.random() * 100) + 1}, ${city}`,
      city,
      neighborhood,
      street,
      houseNumber: String(Math.floor(Math.random() * 100) + 1),
      apartmentNumber: String(Math.floor(Math.random() * 20) + 1),
      floor,
      propertyType: 'apartment',
      rooms,
      area,
      builtYear: 1980 + Math.floor(Math.random() * 40),
      monthlyRent: Math.round(monthlyRent),
      currency: 'ILS',
      rentalDate: rentalDate.toISOString(),
      leaseTermMonths: 12,
      furnished: Math.random() > 0.7,
      hasElevator: floor > 2 ? Math.random() > 0.3 : false,
      hasParking: Math.random() > 0.5,
      hasStorage: Math.random() > 0.6,
      hasBalcony: Math.random() > 0.4,
      hasAirConditioning: Math.random() > 0.3,
      condition,
      utilities: {
        includedInRent: [],
        tenantResponsibility: ['חשמל', 'מים', 'ארנונה']
      },
      landlordType: 'private',
      source: 'manual',
      verified: Math.random() > 0.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  
  return transactions
}
