/**
 * iPlan Real API Integration
 * מערכת iPlan - מינהל התכנון
 * 
 * API Documentation: https://www.iplan.gov.il/opendata
 * 
 * This module provides real integration with the Israeli Planning Administration (iPlan)
 * to fetch actual building rights, zoning information, and planning data.
 */

import { createLogger } from '@/lib/logger'

const log = createLogger('iPlanAPI')

export interface IPlanBuildingRights {
  planNumber: string
  planName: string
  planStatus: string
  approvalDate?: string
  effectiveDate?: string
  
  // זכויות בנייה
  buildingPercentage?: number // אחוזי בנייה
  floorAreaRatio?: number // יחס קומות
  maxFloors?: number // מקס' קומות
  maxHeight?: number // גובה מקסימלי במטרים
  
  // שימושים
  allowedUses: string[]
  mainUse: string
  
  // מגבלות
  buildingLines?: {
    front?: number
    rear?: number
    side?: number
  }
  
  // פרטים נוספים
  landUseZone?: string // אזור שימוש
  conservation?: boolean // שימור
  demolition?: boolean // הריסה
  expropriation?: boolean // הפקעה
  
  // גיאומטריה
  geometry?: any // GeoJSON של גבולות התכנית
}

export interface IPlanParcelData {
  gush: string
  helka: string
  subHelka?: string
  
  // תכניות חלות
  applicablePlans: IPlanBuildingRights[]
  
  // תכניות בתהליך
  pendingPlans?: IPlanBuildingRights[]
  
  // סטטוס
  status: 'active' | 'pending' | 'cancelled'
  lastUpdate: string
}

export class IPlanRealAPI {
  private baseURL = 'https://ags.iplan.gov.il/arcgis/rest/services'
  private timeout = 15000
  
  // iPlan ArcGIS REST Services
  private endpoints = {
    // שכבת גושים וחלקות
    parcels: `${this.baseURL}/PlanningPublic/Cadastre/MapServer`,
    
    // שכבת תכניות
    plans: `${this.baseURL}/PlanningPublic/Plans/MapServer`,
    
    // שכבת זכויות בנייה
    buildingRights: `${this.baseURL}/PlanningPublic/BuildingRights/MapServer`,
    
    // שרת שאילתות
    query: '/query'
  }

  /**
   * שליפת נתוני חלקה מ-iPlan
   */
  async fetchParcelData(gush: string, helka: string): Promise<IPlanParcelData | null> {
    try {
      log.info(`[iPlan] Fetching data for Gush ${gush}, Helka ${helka}`)
      
      // שלב 1: חיפוש חלקה
      const parcelGeometry = await this.findParcel(gush, helka)
      
      if (!parcelGeometry) {
        log.warn(`[iPlan] Parcel not found: ${gush}/${helka}`)
        return null
      }
      
      // שלב 2: שליפת תכניות חלות על החלקה
      const applicablePlans = await this.findApplicablePlans(parcelGeometry)
      
      // שלב 3: שליפת זכויות בנייה לכל תכנית
      const plansWithRights = await Promise.all(
        applicablePlans.map(plan => this.enrichPlanWithBuildingRights(plan))
      )
      
      return {
        gush,
        helka,
        applicablePlans: plansWithRights,
        status: 'active',
        lastUpdate: new Date().toISOString()
      }
      
    } catch (error) {
      log.error('[iPlan] Error fetching parcel data:', error)
      return null
    }
  }

  /**
   * חיפוש חלקה במערכת iPlan
   */
  private async findParcel(gush: string, helka: string): Promise<any> {
    const url = `${this.endpoints.parcels}${this.endpoints.query}`
    
    const params = new URLSearchParams({
      where: `GUSH=${gush} AND HELKA=${helka}`,
      outFields: '*',
      returnGeometry: 'true',
      f: 'json'
    })
    
    const response = await fetch(`${url}?${params.toString()}`, {
      signal: AbortSignal.timeout(this.timeout)
    })
    
    if (!response.ok) {
      throw new Error(`iPlan API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      return data.features[0].geometry
    }
    
    return null
  }

  /**
   * מציאת תכניות החלות על חלקה
   */
  private async findApplicablePlans(geometry: any): Promise<IPlanBuildingRights[]> {
    const url = `${this.endpoints.plans}${this.endpoints.query}`
    
    const params = new URLSearchParams({
      geometry: JSON.stringify(geometry),
      geometryType: 'esriGeometryPolygon',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      f: 'json'
    })
    
    const response = await fetch(`${url}?${params.toString()}`, {
      signal: AbortSignal.timeout(this.timeout)
    })
    
    if (!response.ok) {
      throw new Error(`iPlan plans query error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.features) {
      return []
    }
    
    return data.features.map((feature: any) => this.transformPlanFeature(feature))
  }

  /**
   * העשרת תכנית בזכויות בנייה
   */
  private async enrichPlanWithBuildingRights(plan: IPlanBuildingRights): Promise<IPlanBuildingRights> {
    try {
      const url = `${this.endpoints.buildingRights}${this.endpoints.query}`
      
      const params = new URLSearchParams({
        where: `PLAN_NUMBER='${plan.planNumber}'`,
        outFields: '*',
        f: 'json'
      })
      
      const response = await fetch(`${url}?${params.toString()}`, {
        signal: AbortSignal.timeout(this.timeout)
      })
      
      if (!response.ok) {
        return plan
      }
      
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const rights = data.features[0].attributes
        
        return {
          ...plan,
          buildingPercentage: rights.BUILDING_PERCENTAGE || rights.AHUZEI_BNIYA,
          floorAreaRatio: rights.FAR || rights.RAHES_KOMOT,
          maxFloors: rights.MAX_FLOORS || rights.KOMOT_MAX,
          maxHeight: rights.MAX_HEIGHT || rights.GOVA_MAX,
          allowedUses: this.parseAllowedUses(rights.ALLOWED_USES || rights.SHIMUSHIM),
          mainUse: rights.MAIN_USE || rights.SHIMUSH_IKARI || 'מגורים',
          landUseZone: rights.ZONE || rights.EZOR_SHIMUSH
        }
      }
      
      return plan
      
    } catch (error) {
      log.error('[iPlan] Error enriching plan with building rights:', error)
      return plan
    }
  }

  /**
   * המרת feature של תכנית לפורמט פנימי
   */
  private transformPlanFeature(feature: any): IPlanBuildingRights {
    const attrs = feature.attributes
    
    return {
      planNumber: attrs.PLAN_NUMBER || attrs.PLAN_ID || attrs.TOKHNIT_ID || 'לא ידוע',
      planName: attrs.PLAN_NAME || attrs.TOKHNIT_SHEM || '',
      planStatus: this.normalizePlanStatus(attrs.STATUS || attrs.STATUS_TOKHNIT),
      approvalDate: attrs.APPROVAL_DATE || attrs.TARICH_ISHUR,
      effectiveDate: attrs.EFFECTIVE_DATE || attrs.TARICH_KNISA_LKOACH,
      allowedUses: [],
      mainUse: attrs.MAIN_USE || 'מגורים',
      geometry: feature.geometry
    }
  }

  /**
   * נורמליזציה של סטטוס תכנית
   */
  private normalizePlanStatus(status: string): string {
    if (!status) return 'לא ידוע'
    
    const statusLower = status.toLowerCase()
    
    if (statusLower.includes('תקפ') || statusLower.includes('אושר')) {
      return 'תקפה'
    } else if (statusLower.includes('בתוק') || statusLower.includes('בהליך')) {
      return 'בהליך'
    } else if (statusLower.includes('בוטל') || statusLower.includes('לא תקפ')) {
      return 'בוטלה'
    }
    
    return status
  }

  /**
   * פירוק שימושים מותרים
   */
  private parseAllowedUses(usesString?: string): string[] {
    if (!usesString) {
      return ['מגורים']
    }
    
    // אם זה JSON או array
    try {
      const parsed = JSON.parse(usesString)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // לא JSON, נמשיך לפירוק טקסט
    }
    
    // פירוק לפי פסיקים או נקודה-פסיק
    return usesString
      .split(/[,;]/)
      .map(u => u.trim())
      .filter(u => u.length > 0)
  }

  /**
   * חיפוש לפי מספר תכנית
   */
  async fetchPlanByNumber(planNumber: string): Promise<IPlanBuildingRights | null> {
    try {
      log.info(`[iPlan] Fetching plan: ${planNumber}`)
      
      const url = `${this.endpoints.plans}${this.endpoints.query}`
      
      const params = new URLSearchParams({
        where: `PLAN_NUMBER='${planNumber}' OR PLAN_ID='${planNumber}' OR TOKHNIT_ID='${planNumber}'`,
        outFields: '*',
        returnGeometry: 'true',
        f: 'json'
      })
      
      const response = await fetch(`${url}?${params.toString()}`, {
        signal: AbortSignal.timeout(this.timeout)
      })
      
      if (!response.ok) {
        throw new Error(`iPlan plan query error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const plan = this.transformPlanFeature(data.features[0])
        return await this.enrichPlanWithBuildingRights(plan)
      }
      
      return null
      
    } catch (error) {
      log.error('[iPlan] Error fetching plan by number:', error)
      return null
    }
  }

  /**
   * בדיקת זמינות השירות
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.endpoints.parcels}?f=json`
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000)
      })
      
      return response.ok
      
    } catch (error) {
      log.error('[iPlan] Connection test failed:', error)
      return false
    }
  }
}

// Singleton instance
export const iPlanAPI = new IPlanRealAPI()
