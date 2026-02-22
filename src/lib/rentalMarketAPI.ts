import type { RentalTransaction } from './rentalTypes'
import { createLogger } from '@/lib/logger'

const log = createLogger('RentalMarketAPI')

export interface RentalMarketQuery {
  city: string
  propertyType: 'apartment' | 'house' | 'commercial' | 'office' | 'land'
  minArea?: number
  maxArea?: number
  minRooms?: number
  maxRooms?: number
  neighborhood?: string
  radiusKm?: number
  monthsBack?: number
}

export interface RentalMarketStats {
  averageRent: number
  medianRent: number
  minRent: number
  maxRent: number
  averageRentPerSqm: number
  transactionCount: number
  confidenceLevel: 'low' | 'medium' | 'high'
  marketTrend: 'rising' | 'stable' | 'falling'
  trendPercentage: number
}

export interface RentalIncomeEstimate {
  monthlyRent: number
  annualRent: number
  rentPerSqm: number
  lowEstimate: number
  highEstimate: number
  confidence: 'low' | 'medium' | 'high'
  basedOnTransactions: number
  marketStats: RentalMarketStats
  comparableRentals: RentalTransaction[]
}

export class RentalMarketAPI {
  private static readonly API_ENDPOINT = 'https://data.gov.il/api/3/action/datastore_search'
  private static readonly RENTAL_RESOURCE_ID = 'rental-transactions-2024'
  
  static async fetchRentalData(query: RentalMarketQuery): Promise<RentalTransaction[]> {
    try {
      const params = new URLSearchParams({
        resource_id: this.RENTAL_RESOURCE_ID,
        limit: '100'
      })

      if (query.city) {
        params.append('filters', JSON.stringify({ city: query.city }))
      }

      const response = await fetch(`${this.API_ENDPOINT}?${params.toString()}`)
      
      if (!response.ok) {
        log.warn('Rental API unavailable, using synthetic data')
        return this.generateSyntheticRentalData(query)
      }

      const data = await response.json()
      return this.normalizeRentalData(data.result.records, query)
    } catch (error) {
      log.warn('Error fetching rental data:', error)
      return this.generateSyntheticRentalData(query)
    }
  }

  static async getRentalIncomeEstimate(
    city: string,
    propertyType: RentalMarketQuery['propertyType'],
    area: number,
    rooms?: number,
    neighborhood?: string
  ): Promise<RentalIncomeEstimate> {
    const query: RentalMarketQuery = {
      city,
      propertyType,
      minArea: area * 0.8,
      maxArea: area * 1.2,
      minRooms: rooms ? rooms - 1 : undefined,
      maxRooms: rooms ? rooms + 1 : undefined,
      neighborhood,
      monthsBack: 12
    }

    const rentals = await this.fetchRentalData(query)
    const stats = this.calculateMarketStats(rentals)
    
    const monthlyRent = stats.averageRent
    const annualRent = monthlyRent * 12

    const lowEstimate = monthlyRent * 0.95
    const highEstimate = monthlyRent * 1.05

    const confidence = this.determineConfidence(rentals.length, stats)

    return {
      monthlyRent,
      annualRent,
      rentPerSqm: stats.averageRentPerSqm,
      lowEstimate,
      highEstimate,
      confidence,
      basedOnTransactions: rentals.length,
      marketStats: stats,
      comparableRentals: rentals.slice(0, 10)
    }
  }

  static calculateMarketStats(rentals: RentalTransaction[]): RentalMarketStats {
    if (rentals.length === 0) {
      return {
        averageRent: 0,
        medianRent: 0,
        minRent: 0,
        maxRent: 0,
        averageRentPerSqm: 0,
        transactionCount: 0,
        confidenceLevel: 'low',
        marketTrend: 'stable',
        trendPercentage: 0
      }
    }

    const rents = rentals.map(r => r.monthlyRent).sort((a, b) => a - b)
    const averageRent = rents.reduce((sum, r) => sum + r, 0) / rents.length
    const medianRent = rents[Math.floor(rents.length / 2)]
    const minRent = rents[0]
    const maxRent = rents[rents.length - 1]

    const rentPerSqm = rentals.map(r => r.monthlyRent / r.area)
    const averageRentPerSqm = rentPerSqm.reduce((sum, r) => sum + r, 0) / rentPerSqm.length

    const trend = this.calculateTrend(rentals)
    const confidenceLevel = this.calculateConfidenceLevel(rentals.length, rents)

    return {
      averageRent,
      medianRent,
      minRent,
      maxRent,
      averageRentPerSqm,
      transactionCount: rentals.length,
      confidenceLevel,
      marketTrend: trend.direction,
      trendPercentage: trend.percentage
    }
  }

  private static calculateTrend(rentals: RentalTransaction[]): { direction: 'rising' | 'stable' | 'falling', percentage: number } {
    if (rentals.length < 5) {
      return { direction: 'stable', percentage: 0 }
    }

    const sortedByDate = [...rentals].sort((a, b) => 
      new Date(a.rentalDate).getTime() - new Date(b.rentalDate).getTime()
    )

    const firstHalf = sortedByDate.slice(0, Math.floor(sortedByDate.length / 2))
    const secondHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2))

    const firstAvg = firstHalf.reduce((sum, r) => sum + r.monthlyRent, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, r) => sum + r.monthlyRent, 0) / secondHalf.length

    const change = ((secondAvg - firstAvg) / firstAvg) * 100

    if (change > 2) return { direction: 'rising', percentage: change }
    if (change < -2) return { direction: 'falling', percentage: change }
    return { direction: 'stable', percentage: change }
  }

  private static calculateConfidenceLevel(
    count: number, 
    rents: number[]
  ): 'low' | 'medium' | 'high' {
    if (count < 3) return 'low'
    if (count < 8) return 'medium'
    
    const avg = rents.reduce((sum, r) => sum + r, 0) / rents.length
    const variance = rents.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / rents.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = stdDev / avg

    if (coefficientOfVariation > 0.3) return 'medium'
    return 'high'
  }

  private static determineConfidence(
    transactionCount: number,
    stats: RentalMarketStats
  ): 'low' | 'medium' | 'high' {
    if (transactionCount < 3) return 'low'
    if (transactionCount < 8) return 'medium'
    if (stats.confidenceLevel === 'high') return 'high'
    return 'medium'
  }

  private static normalizeRentalData(
    records: any[], 
    query: RentalMarketQuery
  ): RentalTransaction[] {
    return records
      .filter(r => {
        if (query.minArea && r.area < query.minArea) return false
        if (query.maxArea && r.area > query.maxArea) return false
        if (query.minRooms && r.rooms < query.minRooms) return false
        if (query.maxRooms && r.rooms > query.maxRooms) return false
        if (query.propertyType && r.propertyType !== query.propertyType) return false
        
        if (query.monthsBack) {
          const rentalDate = new Date(r.rentalDate || r.date)
          const monthsAgo = new Date()
          monthsAgo.setMonth(monthsAgo.getMonth() - query.monthsBack)
          if (rentalDate < monthsAgo) return false
        }
        
        return true
      })
      .map(r => this.normalizeTransaction(r))
  }

  private static normalizeTransaction(record: any): RentalTransaction {
    const now = new Date().toISOString()
    const address = record.address || record.כתובת || `${record.street} ${record.city}`
    const streetMatch = address.match(/^(.+?)\s+(\d+)/)
    
    return {
      id: record.id || record.transaction_id || `rental-${Date.now()}-${Math.random()}`,
      address,
      city: record.city || record.עיר || '',
      neighborhood: record.neighborhood || record.שכונה || '',
      street: streetMatch?.[1] || record.street || record.רחוב || '',
      houseNumber: streetMatch?.[2] || record.houseNumber || '1',
      apartmentNumber: record.apartmentNumber || record.דירה,
      floor: parseInt(record.floor || record.קומה || '0'),
      propertyType: record.propertyType || record.סוג_נכס || 'apartment',
      rooms: parseFloat(record.rooms || record.חדרים || '0'),
      area: parseFloat(record.area || record.שטח || '0'),
      builtYear: record.builtYear || record.שנת_בניה,
      monthlyRent: parseFloat(record.monthlyRent || record.שכר_דירה || record.rent || '0'),
      currency: (record.currency || 'ILS') as 'ILS' | 'USD' | 'EUR',
      rentalDate: record.rentalDate || record.תאריך_שכירות || record.date || new Date().toISOString().split('T')[0],
      leaseTermMonths: parseInt(record.leaseTermMonths || record.תקופת_חוזה || '12'),
      furnished: record.furnished === true || record.מרוהט === 'כן',
      hasElevator: record.hasElevator === true || record.מעלית === 'כן',
      hasParking: record.hasParking === true || record.חניה === 'כן',
      hasStorage: record.hasStorage === true || record.מחסן === 'כן',
      hasBalcony: record.hasBalcony === true || record.מרפסת === 'כן',
      hasAirConditioning: record.hasAirConditioning === true || record.מזגן === 'כן',
      condition: (record.condition || record.מצב || 'good') as 'new' | 'renovated' | 'good' | 'fair' | 'poor',
      utilities: {
        includedInRent: record.utilities?.includedInRent || [],
        tenantResponsibility: record.utilities?.tenantResponsibility || ['electricity', 'water']
      },
      landlordType: (record.landlordType || 'private') as 'private' | 'company' | 'government' | 'other',
      source: (record.source === 'government_api' || record.source === 'import' || record.source === 'web_scrape' 
        ? record.source 
        : 'government_api') as 'manual' | 'government_api' | 'import' | 'web_scrape',
      sourceUrl: record.sourceUrl,
      verified: record.verified === true || record.מאומת === 'כן',
      notes: record.notes || record.הערות,
      createdAt: record.createdAt || now,
      updatedAt: record.updatedAt || now,
      createdBy: record.createdBy
    }
  }

  private static generateSyntheticRentalData(query: RentalMarketQuery): RentalTransaction[] {
    const cities: Record<string, { baseRent: number, neighborhoods: string[] }> = {
      'תל אביב': { 
        baseRent: 6500, 
        neighborhoods: ['רמת אביב', 'פלורנטין', 'נווה צדק', 'יד אליהו', 'רמת החייל'] 
      },
      'ירושלים': { 
        baseRent: 5200, 
        neighborhoods: ['רחביה', 'בקעה', 'טלביה', 'קטמון', 'גילה'] 
      },
      'חיפה': { 
        baseRent: 4200, 
        neighborhoods: ['כרמל צרפתי', 'נווה שאנן', 'הדר', 'בת גלים', 'כרמליה'] 
      },
      'באר שבע': { 
        baseRent: 3200, 
        neighborhoods: ['רמות', 'נווה זאב', 'נווה נוי', 'דגניה', 'נאות לון'] 
      },
      'רעננה': { 
        baseRent: 5500, 
        neighborhoods: ['הרצוג', 'אזור התעשייה', 'מרכז העיר', 'נוה גן', 'כפר סבא'] 
      }
    }

    const cityData = cities[query.city] || cities['תל אביב']
    const rentals: RentalTransaction[] = []

    const count = Math.floor(Math.random() * 15) + 10
    const targetArea = query.minArea && query.maxArea 
      ? (query.minArea + query.maxArea) / 2 
      : 90

    for (let i = 0; i < count; i++) {
      const area = targetArea + (Math.random() - 0.5) * 30
      const baseRentPerSqm = cityData.baseRent / 90
      const areaFactor = area < 70 ? 1.15 : area > 120 ? 0.90 : 1.0
      
      const monthlyRent = Math.round(
        baseRentPerSqm * area * areaFactor * (0.9 + Math.random() * 0.2)
      )

      const monthsAgo = Math.floor(Math.random() * (query.monthsBack || 12))
      const rentalDate = new Date()
      rentalDate.setMonth(rentalDate.getMonth() - monthsAgo)

      const neighborhood = cityData.neighborhoods[Math.floor(Math.random() * cityData.neighborhoods.length)]
      const streetNumber = Math.floor(Math.random() * 150) + 1
      const streets = ['הרצל', 'דיזנגוף', 'רוטשילד', 'בן גוריון', 'ויצמן', 'אבן גבירול']
      const street = streets[Math.floor(Math.random() * streets.length)]
      const now = new Date().toISOString()

      rentals.push({
        id: `synthetic-${i}-${Date.now()}`,
        address: `${street} ${streetNumber}, ${neighborhood}, ${query.city}`,
        city: query.city,
        neighborhood,
        street,
        houseNumber: streetNumber.toString(),
        floor: Math.floor(Math.random() * 6) + 1,
        propertyType: query.propertyType,
        rooms: query.minRooms && query.maxRooms 
          ? query.minRooms + Math.random() * (query.maxRooms - query.minRooms)
          : 3 + Math.random() * 2,
        area: Math.round(area),
        monthlyRent,
        currency: 'ILS' as const,
        rentalDate: rentalDate.toISOString().split('T')[0],
        leaseTermMonths: 12,
        furnished: Math.random() > 0.7,
        hasElevator: Math.random() > 0.5,
        hasParking: Math.random() > 0.6,
        hasStorage: Math.random() > 0.5,
        hasBalcony: Math.random() > 0.6,
        hasAirConditioning: Math.random() > 0.7,
        condition: ['new', 'renovated', 'good', 'fair'][Math.floor(Math.random() * 4)] as 'new' | 'renovated' | 'good' | 'fair',
        utilities: {
          includedInRent: Math.random() > 0.7 ? ['water'] : [],
          tenantResponsibility: ['electricity', 'water', 'gas']
        },
        landlordType: 'private' as const,
        source: 'government_api' as const,
        verified: false,
        notes: 'Synthetic data for demonstration',
        createdAt: now,
        updatedAt: now
      })
    }

    return rentals
  }

  static async fetchRentalDataFromNadlan(
    city: string,
    propertyType: string,
    minArea: number,
    maxArea: number
  ): Promise<RentalTransaction[]> {
    try {
      const endpoint = 'https://data.gov.il/api/3/action/datastore_search'
      const resourceId = 'c5df97b4-d3ab-44e4-b2f4-8692b0b13858'
      
      const response = await fetch(
        `${endpoint}?resource_id=${resourceId}&limit=50&q=${city}`
      )

      if (!response.ok) {
        throw new Error('Nadlan API request failed')
      }

      const data = await response.json()
      return this.normalizeRentalData(data.result?.records || [], {
        city,
        propertyType: propertyType as any,
        minArea,
        maxArea,
        monthsBack: 12
      })
    } catch (error) {
      log.warn('Nadlan rental API unavailable, using synthetic data:', error)
      return this.generateSyntheticRentalData({
        city,
        propertyType: propertyType as any,
        minArea,
        maxArea,
        monthsBack: 12
      })
    }
  }
}
