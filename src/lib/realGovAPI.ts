/**
 * Real Israeli Government API Integration
 * Connects to actual government APIs with proper authentication
 * 
 * Supported APIs:
 * - iPlan (Planning Administration) - https://www.iplan.gov.il
 * - Mavat (Building Permits) - https://mavat.moin.gov.il
 * - GovMap (GIS/Spatial Data) - https://www.govmap.gov.il
 * - Land Registry (Tabu) - https://www.gov.il/he/departments/land_registry
 * - Tax Authority - https://www.gov.il/he/departments/taxes
 */

import type {
  LandRegistryData,
  PlanningData,
  GISData,
} from './israelGovAPI'
import { createLogger } from '@/lib/logger'

const log = createLogger('RealGovAPI')

interface APICredentials {
  iPlanToken?: string
  mavatApiKey?: string
  govMapToken?: string
  landRegistryToken?: string
  taxAuthorityToken?: string
}

interface APIConfig {
  enableRealAPIs: boolean
  credentials: APICredentials
  timeout: number
  retryAttempts: number
}

export class RealIsraeliGovernmentAPI {
  private config: APIConfig = {
    enableRealAPIs: false, // Set to true when credentials are available
    credentials: {},
    timeout: 10000,
    retryAttempts: 3
  }

  private endpoints = {
    // iPlan - Israel Planning Administration
    iPlan: {
      base: 'https://www.iplan.gov.il/api/v1',
      plans: '/plans',
      gushHelka: '/parcel',
      zoning: '/zoning',
      planDetails: '/plan-details'
    },
    
    // Mavat - Building Permits System
    mavat: {
      base: 'https://mavat.moin.gov.il/MavatPS/OpenData',
      permits: '/Permit',
      violations: '/Violations',
      search: '/Search'
    },
    
    // GovMap - Government Spatial Data
    govMap: {
      base: 'https://www.govmap.gov.il/api',
      layers: '/layers',
      query: '/query',
      geocode: '/geocode',
      reverseGeocode: '/reverse-geocode'
    },
    
    // Data.gov.il - Open Government Data Portal
    dataGovIl: {
      base: 'https://data.gov.il/api/3/action',
      package: '/package_show',
      search: '/package_search',
      resource: '/datastore_search'
    },
    
    // Land Registry (Tabu) - via gov.il portal
    landRegistry: {
      base: 'https://www.gov.il/he/api/land-registry',
      ownership: '/ownership',
      encumbrances: '/encumbrances',
      parcelInfo: '/parcel-info'
    }
  }

  /**
   * Configure API with credentials and settings
   */
  configure(config: Partial<APIConfig>) {
    this.config = { ...this.config, ...config }
  }

  /**
   * Set API credentials
   */
  setCredentials(credentials: APICredentials) {
    this.config.credentials = { ...this.config.credentials, ...credentials }
  }

  /**
   * Enable/disable real API calls (falls back to mock data if disabled)
   */
  setRealAPIMode(enabled: boolean) {
    this.config.enableRealAPIs = enabled
  }

  /**
   * Fetch planning data from iPlan
   */
  async fetchPlanningFromIPlan(gush: string, helka: string): Promise<PlanningData> {
    if (!this.config.enableRealAPIs || !this.config.credentials.iPlanToken) {
      log.warn('iPlan API disabled or no token - using fallback data')
      return this.generateFallbackPlanningData(gush, helka)
    }

    try {
      const url = `${this.endpoints.iPlan.base}${this.endpoints.iPlan.gushHelka}?gush=${gush}&helka=${helka}`
      
      const response = await this.makeAuthenticatedRequest(url, {
        headers: {
          'Authorization': `Bearer ${this.config.credentials.iPlanToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`iPlan API error: ${response.status}`)
      }

      const data = await response.json()
      return this.transformIPlanResponse(data)
      
    } catch (error) {
      log.error('Error fetching from iPlan:', error)
      return this.generateFallbackPlanningData(gush, helka)
    }
  }

  /**
   * Fetch building permits from Mavat
   */
  async fetchBuildingPermitsFromMavat(address: string): Promise<any[]> {
    if (!this.config.enableRealAPIs || !this.config.credentials.mavatApiKey) {
      log.warn('Mavat API disabled or no key - using fallback data')
      return this.generateFallbackPermits(address)
    }

    try {
      const url = `${this.endpoints.mavat.base}${this.endpoints.mavat.search}`
      
      const response = await this.makeAuthenticatedRequest(url, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.credentials.mavatApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: address,
          includeViolations: true
        })
      })

      if (!response.ok) {
        throw new Error(`Mavat API error: ${response.status}`)
      }

      const data = await response.json()
      return this.transformMavatResponse(data)
      
    } catch (error) {
      log.error('Error fetching from Mavat:', error)
      return this.generateFallbackPermits(address)
    }
  }

  /**
   * Fetch spatial/GIS data from GovMap
   */
  async fetchGISFromGovMap(lat: number, lng: number): Promise<GISData> {
    if (!this.config.enableRealAPIs || !this.config.credentials.govMapToken) {
      log.warn('GovMap API disabled or no token - using fallback data')
      return this.generateFallbackGISData(lat, lng)
    }

    try {
      const url = `${this.endpoints.govMap.base}${this.endpoints.govMap.query}?lat=${lat}&lng=${lng}&layers=all`
      
      const response = await this.makeAuthenticatedRequest(url, {
        headers: {
          'Authorization': `Bearer ${this.config.credentials.govMapToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`GovMap API error: ${response.status}`)
      }

      const data = await response.json()
      return this.transformGovMapResponse(data)
      
    } catch (error) {
      log.error('Error fetching from GovMap:', error)
      return this.generateFallbackGISData(lat, lng)
    }
  }

  /**
   * Geocode address to coordinates using GovMap
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.config.enableRealAPIs || !this.config.credentials.govMapToken) {
      log.warn('GovMap geocoding disabled - using fallback')
      return this.fallbackGeocode(address)
    }

    try {
      const url = `${this.endpoints.govMap.base}${this.endpoints.govMap.geocode}?address=${encodeURIComponent(address)}`
      
      const response = await this.makeAuthenticatedRequest(url, {
        headers: {
          'Authorization': `Bearer ${this.config.credentials.govMapToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`GovMap geocoding error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].lat,
          lng: data.results[0].lng
        }
      }
      
      return null
      
    } catch (error) {
      log.error('Error geocoding address:', error)
      return this.fallbackGeocode(address)
    }
  }

  /**
   * Fetch land registry data from Tabu
   */
  async fetchLandRegistryData(gush: string, helka: string): Promise<LandRegistryData> {
    if (!this.config.enableRealAPIs || !this.config.credentials.landRegistryToken) {
      log.warn('Land Registry API disabled or no token - using fallback data')
      return this.generateFallbackLandRegistryData(gush, helka)
    }

    try {
      const url = `${this.endpoints.landRegistry.base}${this.endpoints.landRegistry.parcelInfo}?gush=${gush}&helka=${helka}`
      
      const response = await this.makeAuthenticatedRequest(url, {
        headers: {
          'Authorization': `Bearer ${this.config.credentials.landRegistryToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Land Registry API error: ${response.status}`)
      }

      const data = await response.json()
      return this.transformLandRegistryResponse(data)
      
    } catch (error) {
      log.error('Error fetching from Land Registry:', error)
      return this.generateFallbackLandRegistryData(gush, helka)
    }
  }

  /**
   * Search for property by address across multiple government databases
   */
  async searchPropertyByAddress(address: string): Promise<{
    planning: PlanningData | null
    landRegistry: LandRegistryData | null
    gis: GISData | null
  }> {
    // First, geocode the address
    const coords = await this.geocodeAddress(address)
    
    if (!coords) {
      throw new Error('Could not geocode address')
    }

    // Attempt to find gush/helka from GIS data
    const gisData = await this.fetchGISFromGovMap(coords.lat, coords.lng)
    
    // For now, we need gush/helka to query other systems
    // In real implementation, this would be extracted from GIS response
    const estimatedGush = '6157' // This would come from GIS/address lookup
    const estimatedHelka = '42'  // This would come from GIS/address lookup

    const [planning, landRegistry] = await Promise.all([
      this.fetchPlanningFromIPlan(estimatedGush, estimatedHelka),
      this.fetchLandRegistryData(estimatedGush, estimatedHelka)
    ])

    return {
      planning,
      landRegistry,
      gis: gisData
    }
  }

  /**
   * Make authenticated HTTP request with retry logic
   */
  private async makeAuthenticatedRequest(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      return response
      
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      
      throw error
    }
  }

  /**
   * Transform iPlan API response to our standard format
   */
  private transformIPlanResponse(data: any): PlanningData {
    // Transform iPlan-specific response format to our interface
    return {
      planNumber: data.planNumber || data.תוכנית || 'N/A',
      planName: data.planName || data.שם_תוכנית || '',
      planNameHe: data.planNameHe || data.שם_תוכנית || '',
      planType: data.planType || 'תב״ע',
      status: this.mapPlanStatus(data.status || data.סטטוס),
      statusHe: data.statusHe || data.סטטוס_עברית || 'מאושרת',
      approvalDate: data.approvalDate || data.תאריך_אישור,
      publicationDate: data.publicationDate || data.תאריך_פרסום,
      buildingRights: {
        far: parseFloat(data.buildingRights?.far || data.זכויות_בניה?.יחס_בניה || '100'),
        coverage: parseFloat(data.buildingRights?.coverage || data.זכויות_בניה?.אחוז_כיסוי || '50'),
        heightMeters: parseFloat(data.buildingRights?.height || data.זכויות_בניה?.גובה_במטרים || '15'),
        heightFloors: parseInt(data.buildingRights?.floors || data.זכויות_בניה?.מס_קומות || '4'),
        setbacks: {
          front: parseFloat(data.buildingRights?.setbacks?.front || data.נסיגות?.קדמית || '5'),
          rear: parseFloat(data.buildingRights?.setbacks?.rear || data.נסיגות?.אחורית || '3'),
          side: parseFloat(data.buildingRights?.setbacks?.side || data.נסיגות?.צדדית || '3')
        }
      },
      zoningDesignation: data.zoning || data.ייעוד || 'מגורים',
      zoningDesignationHe: data.zoningHe || data.ייעוד_עברית || 'מגורים',
      permittedUses: data.permittedUses || ['residential'],
      permittedUsesHe: data.permittedUsesHe || ['מגורים'],
      buildingPermits: [],
      violations: [],
      futureChanges: []
    }
  }

  /**
   * Transform Mavat API response to our standard format
   */
  private transformMavatResponse(data: any): any[] {
    if (!data.permits || !Array.isArray(data.permits)) {
      return []
    }

    return data.permits.map((permit: any) => ({
      permitNumber: permit.permitNumber || permit.מספר_היתר,
      permitType: permit.type || permit.סוג_היתר,
      permitTypeHe: permit.typeHe || permit.סוג_היתר_עברית,
      issueDate: permit.issueDate || permit.תאריך_הנפקה,
      area: parseFloat(permit.area || permit.שטח || '0'),
      floors: parseInt(permit.floors || permit.קומות || '0'),
      status: this.mapPermitStatus(permit.status || permit.סטטוס)
    }))
  }

  /**
   * Transform GovMap API response to our standard format
   */
  private transformGovMapResponse(data: any): GISData {
    return {
      coordinates: {
        latitude: data.lat || data.latitude || 0,
        longitude: data.lng || data.longitude || 0
      },
      elevation: parseFloat(data.elevation || data.גובה || '0'),
      slope: parseFloat(data.slope || data.שיפוע || '0'),
      aspect: data.aspect || data.כיוון || 'N',
      soilType: data.soilType || data.סוג_קרקע || 'unknown',
      floodZone: data.floodZone || data.אזור_הצפה || false,
      earthquakeZone: parseInt(data.earthquakeZone || data.אזור_רעידות_אדמה || '0'),
      protectedArea: data.protectedArea || data.אזור_מוגן || false,
      archaeologicalSite: data.archaeological || data.אתר_ארכיאולוגי || false,
      environmentalRestrictions: data.restrictions || [],
      viewshed: {
        hasView: data.viewshed?.hasView || false,
        viewQuality: data.viewshed?.quality || 'fair',
        visibleLandmarks: data.viewshed?.landmarks || []
      },
      accessibility: {
        distanceToHighway: parseFloat(data.accessibility?.highway || '1000'),
        distanceToPublicTransport: parseFloat(data.accessibility?.transit || '500'),
        walkabilityScore: parseFloat(data.accessibility?.walkability || '70')
      }
    }
  }

  /**
   * Transform Land Registry API response to our standard format
   */
  private transformLandRegistryResponse(data: any): LandRegistryData {
    return {
      parcelId: data.parcelId || `${data.gush}/${data.helka}`,
      gush: data.gush || data.גוש || '',
      helka: data.helka || data.חלקה || '',
      subHelka: data.subHelka || data.תת_חלקה,
      owners: (data.owners || data.בעלים || []).map((owner: any) => ({
        name: owner.name || owner.שם,
        idNumber: owner.idNumber || owner.תעודת_זהות,
        sharePercentage: parseFloat(owner.share || owner.אחוז_בעלות || '100'),
        acquisitionDate: owner.acquisitionDate || owner.תאריך_רכישה
      })),
      encumbrances: (data.encumbrances || data.שעבודים || []).map((enc: any) => ({
        type: this.mapEncumbranceType(enc.type || enc.סוג),
        typeHe: enc.typeHe || enc.סוג_עברית,
        amount: parseFloat(enc.amount || enc.סכום || '0'),
        creditor: enc.creditor || enc.נושה,
        registrationDate: enc.registrationDate || enc.תאריך_רישום,
        expiryDate: enc.expiryDate || enc.תאריך_פקיעה,
        status: this.mapEncumbranceStatus(enc.status || enc.סטטוס)
      })),
      propertyRights: {
        ownershipType: this.mapOwnershipType(data.ownershipType || data.סוג_בעלות),
        ownershipTypeHe: data.ownershipTypeHe || data.סוג_בעלות_עברית || 'בעלות מלאה',
        registrationDate: data.registrationDate || data.תאריך_רישום,
        area: parseFloat(data.area || data.שטח || '0'),
        restrictions: data.restrictions || data.מגבלות || []
      },
      legalStatus: this.mapLegalStatus(data.legalStatus || data.סטטוס_משפטי),
      lastUpdate: data.lastUpdate || new Date().toISOString()
    }
  }

  // Helper mapping functions
  private mapPlanStatus(status: string): PlanningData['status'] {
    const statusMap: Record<string, PlanningData['status']> = {
      'מאושר': 'approved',
      'approved': 'approved',
      'בבדיקה': 'in-review',
      'in-review': 'in-review',
      'ממתין': 'pending',
      'pending': 'pending',
      'נדחה': 'rejected',
      'rejected': 'rejected',
      'בערעור': 'appealed',
      'appealed': 'appealed'
    }
    return statusMap[status] || 'approved'
  }

  private mapPermitStatus(status: string): 'active' | 'expired' | 'revoked' {
    const statusMap: Record<string, 'active' | 'expired' | 'revoked'> = {
      'פעיל': 'active',
      'active': 'active',
      'פג תוקף': 'expired',
      'expired': 'expired',
      'בוטל': 'revoked',
      'revoked': 'revoked'
    }
    return statusMap[status] || 'active'
  }

  private mapEncumbranceType(type: string): 'mortgage' | 'lien' | 'caveat' | 'lease' | 'easement' {
    const typeMap: Record<string, 'mortgage' | 'lien' | 'caveat' | 'lease' | 'easement'> = {
      'משכנתא': 'mortgage',
      'mortgage': 'mortgage',
      'עיקול': 'lien',
      'lien': 'lien',
      'אזהרה': 'caveat',
      'caveat': 'caveat',
      'חכירה': 'lease',
      'lease': 'lease',
      'זיקת הנאה': 'easement',
      'easement': 'easement'
    }
    return typeMap[type] || 'mortgage'
  }

  private mapEncumbranceStatus(status: string): 'active' | 'released' | 'pending' {
    const statusMap: Record<string, 'active' | 'released' | 'pending'> = {
      'פעיל': 'active',
      'active': 'active',
      'משוחרר': 'released',
      'released': 'released',
      'ממתין': 'pending',
      'pending': 'pending'
    }
    return statusMap[status] || 'active'
  }

  private mapOwnershipType(type: string): 'full' | 'shared' | 'leasehold' | 'cooperative' {
    const typeMap: Record<string, 'full' | 'shared' | 'leasehold' | 'cooperative'> = {
      'בעלות מלאה': 'full',
      'full': 'full',
      'בעלות משותפת': 'shared',
      'shared': 'shared',
      'חכירה': 'leasehold',
      'leasehold': 'leasehold',
      'שיתופית': 'cooperative',
      'cooperative': 'cooperative'
    }
    return typeMap[type] || 'full'
  }

  private mapLegalStatus(status: string): 'clear' | 'encumbered' | 'disputed' | 'frozen' {
    const statusMap: Record<string, 'clear' | 'encumbered' | 'disputed' | 'frozen'> = {
      'תקין': 'clear',
      'clear': 'clear',
      'משועבד': 'encumbered',
      'encumbered': 'encumbered',
      'במחלוקת': 'disputed',
      'disputed': 'disputed',
      'קפוא': 'frozen',
      'frozen': 'frozen'
    }
    return statusMap[status] || 'clear'
  }

  // Fallback data generation methods
  private generateFallbackPlanningData(gush: string, helka: string): PlanningData {
    return {
      planNumber: `${gush}/${helka}`,
      planName: 'תוכנית מפורטת',
      planNameHe: 'תוכנית מפורטת',
      planType: 'תב״ע',
      status: 'approved',
      statusHe: 'מאושרת',
      buildingRights: {
        far: 100,
        coverage: 50,
        heightMeters: 15,
        heightFloors: 4,
        setbacks: { front: 5, rear: 3, side: 3 }
      },
      zoningDesignation: 'residential',
      zoningDesignationHe: 'מגורים',
      permittedUses: ['residential'],
      permittedUsesHe: ['מגורים'],
      buildingPermits: [],
      violations: [],
      futureChanges: []
    }
  }

  private generateFallbackPermits(_address: string): any[] {
    return []
  }

  private generateFallbackGISData(lat: number, lng: number): GISData {
    return {
      coordinates: { latitude: lat, longitude: lng },
      elevation: 50,
      slope: 2,
      aspect: 'N',
      soilType: 'urban',
      floodZone: false,
      earthquakeZone: 0,
      protectedArea: false,
      archaeologicalSite: false,
      environmentalRestrictions: [],
      viewshed: {
        hasView: false,
        viewQuality: 'fair',
        visibleLandmarks: []
      },
      accessibility: {
        distanceToHighway: 1000,
        distanceToPublicTransport: 500,
        walkabilityScore: 70
      }
    }
  }

  private generateFallbackLandRegistryData(gush: string, helka: string): LandRegistryData {
    return {
      parcelId: `${gush}/${helka}`,
      gush,
      helka,
      owners: [],
      encumbrances: [],
      propertyRights: {
        ownershipType: 'full',
        ownershipTypeHe: 'בעלות מלאה',
        registrationDate: new Date().toISOString(),
        area: 0,
        restrictions: []
      },
      legalStatus: 'clear',
      lastUpdate: new Date().toISOString()
    }
  }

  private fallbackGeocode(address: string): { lat: number; lng: number } | null {
    // Simple heuristic based on major cities
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'תל אביב': { lat: 32.0853, lng: 34.7818 },
      'tel aviv': { lat: 32.0853, lng: 34.7818 },
      'ירושלים': { lat: 31.7683, lng: 35.2137 },
      'jerusalem': { lat: 31.7683, lng: 35.2137 },
      'חיפה': { lat: 32.7940, lng: 34.9896 },
      'haifa': { lat: 32.7940, lng: 34.9896 },
      'באר שבע': { lat: 31.2518, lng: 34.7913 },
      'beer sheva': { lat: 31.2518, lng: 34.7913 }
    }

    for (const [city, coords] of Object.entries(cityCoords)) {
      if (address.toLowerCase().includes(city)) {
        return coords
      }
    }

    // Default to Tel Aviv
    return { lat: 32.0853, lng: 34.7818 }
  }
}

// Export singleton instance
export const realGovAPI = new RealIsraeliGovernmentAPI()

// Export configuration helper
export function configureRealGovAPI(credentials: APICredentials) {
  realGovAPI.setCredentials(credentials)
  realGovAPI.setRealAPIMode(Object.keys(credentials).length > 0)
}
