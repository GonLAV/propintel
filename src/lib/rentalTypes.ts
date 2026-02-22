export interface RentalTransaction {
  id: string
  propertyId?: string
  address: string
  city: string
  neighborhood: string
  street: string
  houseNumber: string
  apartmentNumber?: string
  floor?: number
  
  propertyType: 'apartment' | 'house' | 'commercial' | 'office' | 'warehouse' | 'land' | 'other'
  rooms?: number
  area: number
  builtYear?: number
  
  monthlyRent: number
  currency: 'ILS' | 'USD' | 'EUR'
  rentalDate: string
  leaseTermMonths: number
  
  furnished: boolean
  hasElevator?: boolean
  hasParking?: boolean
  hasStorage?: boolean
  hasBalcony?: boolean
  hasAirConditioning?: boolean
  
  condition: 'new' | 'renovated' | 'good' | 'fair' | 'poor'
  
  utilities: {
    includedInRent: string[]
    tenantResponsibility: string[]
  }
  
  landlordType: 'private' | 'company' | 'government' | 'other'
  
  source: 'manual' | 'government_api' | 'import' | 'web_scrape'
  sourceUrl?: string
  verified: boolean
  
  notes?: string
  
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface RentalComparable {
  transaction: RentalTransaction
  similarity: number
  adjustments: {
    area: number
    floor: number
    age: number
    condition: number
    features: number
    location: number
    time: number
    total: number
  }
  adjustedRent: number
  adjustedRentPerSqm: number
}

export interface RentalAnalysis {
  subjectProperty: {
    address: string
    area: number
    propertyType: string
    rooms?: number
    floor?: number
  }
  comparables: RentalComparable[]
  statistics: {
    averageRent: number
    medianRent: number
    minRent: number
    maxRent: number
    averageRentPerSqm: number
    medianRentPerSqm: number
    minRentPerSqm: number
    maxRentPerSqm: number
    stdDeviation: number
    confidenceLevel: number
  }
  recommendedRent: {
    low: number
    mid: number
    high: number
    confidence: 'low' | 'medium' | 'high'
    reasoning: string
  }
  marketTrend: {
    direction: 'increasing' | 'stable' | 'decreasing'
    changePercent: number
    period: string
  }
}

export interface RentalMarketReport {
  id: string
  city: string
  neighborhood?: string
  propertyType: string
  period: {
    from: string
    to: string
  }
  totalTransactions: number
  averageRent: number
  medianRent: number
  averageRentPerSqm: number
  priceChange: number
  priceChangePercent: number
  supplyDemandRatio: number
  vacancyRate: number
  averageDaysToRent: number
  createdAt: string
}

export interface RentalDataSource {
  id: string
  name: string
  type: 'government_api' | 'web_portal' | 'manual_import' | 'partner_feed'
  url?: string
  apiKey?: string
  enabled: boolean
  lastSync?: string
  totalRecords: number
  config: Record<string, any>
}
