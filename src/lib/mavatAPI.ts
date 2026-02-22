/**
 * Mavat Real API Integration
 * מערכת מבא"ת - מאגר מידע ארצי תכנוני
 * 
 * API Documentation: https://mavat.moin.gov.il/
 * 
 * This module provides real integration with the Israeli National Building and Planning Database (Mavat)
 * to fetch building permits, violations, and municipal planning data.
 */

import { createLogger } from '@/lib/logger'

const log = createLogger('MavatAPI')

export interface MavatBuildingPermit {
  permitNumber: string
  permitType: string
  status: string
  submissionDate?: string
  approvalDate?: string
  
  // פרטי הבקשה
  requestType: string // בקשה להיתר / שינוי / תוספת
  description: string
  
  // פרטי בנייה
  plannedArea?: number // שטח מתוכנן
  existingArea?: number // שטח קיים
  addedArea?: number // שטח נוסף
  floors?: number
  units?: number // יחידות דיור
  
  // כתובת
  address: {
    city: string
    street: string
    houseNumber?: string
    gush?: string
    helka?: string
  }
  
  // סטטוס משפטי
  violations?: MavatViolation[]
  legalStatus?: string
}

export interface MavatViolation {
  violationId: string
  type: string
  description: string
  status: string
  openDate: string
  closeDate?: string
  severity: 'high' | 'medium' | 'low'
}

export interface MavatSearchParams {
  city?: string
  street?: string
  houseNumber?: string
  gush?: string
  helka?: string
  permitNumber?: string
}

export class MavatRealAPI {
  private baseURL = 'https://mavat.moin.gov.il/MavatPS/OpenData'
  private timeout = 15000
  
  // Mavat אינו דורש API key לנתונים ציבוריים, אבל יש rate limiting
  private rateLimitDelay = 1000 // 1 שנייה בין קריאות
  private lastRequestTime = 0

  /**
   * חיפוש היתרי בנייה לפי כתובת
   */
  async searchPermitsByAddress(params: MavatSearchParams): Promise<MavatBuildingPermit[]> {
    try {
      await this.respectRateLimit()
      
      log.info('[Mavat] Searching permits:', params)
      
      // Mavat OpenData API endpoint
      const url = `${this.baseURL}/Permit`
      
      const queryParams = new URLSearchParams()
      
      if (params.city) queryParams.append('yishuv', params.city)
      if (params.street) queryParams.append('rechov', params.street)
      if (params.houseNumber) queryParams.append('bayit', params.houseNumber)
      if (params.gush) queryParams.append('gush', params.gush)
      if (params.helka) queryParams.append('helka', params.helka)
      
      const response = await fetch(`${url}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.timeout)
      })
      
      if (!response.ok) {
        throw new Error(`Mavat API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      return this.transformMavatPermits(data)
      
    } catch (error) {
      log.error('[Mavat] Error searching permits:', error)
      return []
    }
  }

  /**
   * חיפוש לפי מספר היתר
   */
  async getPermitByNumber(permitNumber: string): Promise<MavatBuildingPermit | null> {
    try {
      await this.respectRateLimit()
      
      log.info('[Mavat] Fetching permit:', permitNumber)
      
      const url = `${this.baseURL}/Permit/${permitNumber}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(this.timeout)
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Mavat API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      const permits = this.transformMavatPermits([data])
      return permits.length > 0 ? permits[0] : null
      
    } catch (error) {
      log.error('[Mavat] Error fetching permit:', error)
      return null
    }
  }

  /**
   * שליפת עבירות בנייה
   */
  async searchViolations(params: MavatSearchParams): Promise<MavatViolation[]> {
    try {
      await this.respectRateLimit()
      
      log.info('[Mavat] Searching violations:', params)
      
      const url = `${this.baseURL}/Violation`
      
      const queryParams = new URLSearchParams()
      
      if (params.city) queryParams.append('yishuv', params.city)
      if (params.street) queryParams.append('rechov', params.street)
      if (params.houseNumber) queryParams.append('bayit', params.houseNumber)
      if (params.gush) queryParams.append('gush', params.gush)
      if (params.helka) queryParams.append('helka', params.helka)
      
      const response = await fetch(`${url}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(this.timeout)
      })
      
      if (!response.ok) {
        throw new Error(`Mavat violations API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      return this.transformMavatViolations(data)
      
    } catch (error) {
      log.error('[Mavat] Error searching violations:', error)
      return []
    }
  }

  /**
   * המרת תגובת Mavat לפורמט פנימי
   */
  private transformMavatPermits(data: any[]): MavatBuildingPermit[] {
    if (!Array.isArray(data)) {
      data = [data]
    }
    
    return data.map(item => ({
      permitNumber: item.mispar_heter || item.permit_number || 'לא ידוע',
      permitType: this.normalizePermitType(item.sug_bakasha || item.request_type),
      status: this.normalizePermitStatus(item.status || item.status_bakasha),
      submissionDate: item.taarich_hgasha || item.submission_date,
      approvalDate: item.taarich_ishur || item.approval_date,
      
      requestType: item.sug_bakasha || item.request_type || 'היתר בנייה',
      description: item.teur || item.description || '',
      
      plannedArea: this.parseNumber(item.shatach_mutocan || item.planned_area),
      existingArea: this.parseNumber(item.shatach_kayam || item.existing_area),
      addedArea: this.parseNumber(item.shatach_nosaf || item.added_area),
      floors: this.parseNumber(item.komot || item.floors),
      units: this.parseNumber(item.dirot || item.units),
      
      address: {
        city: item.yishuv || item.city || '',
        street: item.rechov || item.street || '',
        houseNumber: item.bayit || item.house_number,
        gush: item.gush,
        helka: item.helka
      },
      
      violations: [],
      legalStatus: item.status_mishpati || item.legal_status
    }))
  }

  /**
   * המרת עבירות בנייה
   */
  private transformMavatViolations(data: any[]): MavatViolation[] {
    if (!Array.isArray(data)) {
      data = [data]
    }
    
    return data.map(item => ({
      violationId: item.mispar_avera || item.violation_id || '',
      type: item.sug_avera || item.violation_type || 'עבירת בנייה',
      description: item.teur || item.description || '',
      status: this.normalizeViolationStatus(item.status),
      openDate: item.taarich_ptich || item.open_date || '',
      closeDate: item.taarich_sgir || item.close_date,
      severity: this.assessViolationSeverity(item)
    }))
  }

  /**
   * נורמליזציה של סוג בקשה
   */
  private normalizePermitType(type?: string): string {
    if (!type) return 'היתר בנייה'
    
    const typeLower = type.toLowerCase()
    
    if (typeLower.includes('חדש') || typeLower.includes('new')) {
      return 'בנייה חדשה'
    } else if (typeLower.includes('תוספ') || typeLower.includes('addition')) {
      return 'תוספת בנייה'
    } else if (typeLower.includes('שינוי') || typeLower.includes('change')) {
      return 'שינוי ייעוד'
    } else if (typeLower.includes('הרחב')) {
      return 'הרחבה'
    } else if (typeLower.includes('שיפוץ') || typeLower.includes('renov')) {
      return 'שיפוץ'
    }
    
    return type
  }

  /**
   * נורמליזציה של סטטוס היתר
   */
  private normalizePermitStatus(status?: string): string {
    if (!status) return 'לא ידוע'
    
    const statusLower = status.toLowerCase()
    
    if (statusLower.includes('אושר') || statusLower.includes('approved')) {
      return 'אושר'
    } else if (statusLower.includes('בתוק') || statusLower.includes('pending')) {
      return 'בטיפול'
    } else if (statusLower.includes('נדח') || statusLower.includes('reject')) {
      return 'נדחה'
    } else if (statusLower.includes('בוטל') || statusLower.includes('cancel')) {
      return 'בוטל'
    } else if (statusLower.includes('פג')) {
      return 'פג תוקף'
    }
    
    return status
  }

  /**
   * נורמליזציה של סטטוס עבירה
   */
  private normalizeViolationStatus(status?: string): string {
    if (!status) return 'לא ידוע'
    
    const statusLower = status.toLowerCase()
    
    if (statusLower.includes('פתוח') || statusLower.includes('open')) {
      return 'פתוחה'
    } else if (statusLower.includes('סגור') || statusLower.includes('close')) {
      return 'סגורה'
    } else if (statusLower.includes('טיפול')) {
      return 'בטיפול'
    }
    
    return status
  }

  /**
   * הערכת חומרת עבירה
   */
  private assessViolationSeverity(violation: any): 'high' | 'medium' | 'low' {
    const type = (violation.sug_avera || violation.violation_type || '').toLowerCase()
    
    // עבירות חמורות
    if (type.includes('הריס') || type.includes('מבנה לא חוק') || type.includes('illegal')) {
      return 'high'
    }
    
    // עבירות בינוניות
    if (type.includes('תוספת') || type.includes('שינוי') || type.includes('addition')) {
      return 'medium'
    }
    
    // עבירות קלות
    return 'low'
  }

  /**
   * המרת מחרוזת למספר
   */
  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const num = parseFloat(value)
      return isNaN(num) ? undefined : num
    }
    return undefined
  }

  /**
   * כיבוד rate limiting
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * בדיקת זמינות השירות
   */
  async testConnection(): Promise<boolean> {
    try {
      // ניסיון קריאה פשוטה לבדיקת זמינות
      const response = await fetch(`${this.baseURL}/Permit?gush=1&helka=1`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      // גם 404 נחשב כהצלחה (השרת עובד, פשוט לא מצא נתונים)
      return response.ok || response.status === 404
      
    } catch (error) {
      log.error('[Mavat] Connection test failed:', error)
      return false
    }
  }

  /**
   * קבלת סטטיסטיקות על היתרים באזור
   */
  async getAreaStatistics(city: string): Promise<{
    totalPermits: number
    approvedPermits: number
    pendingPermits: number
    violations: number
  }> {
    try {
      const permits = await this.searchPermitsByAddress({ city })
      const violations = await this.searchViolations({ city })
      
      return {
        totalPermits: permits.length,
        approvedPermits: permits.filter(p => p.status === 'אושר').length,
        pendingPermits: permits.filter(p => p.status === 'בטיפול').length,
        violations: violations.length
      }
      
    } catch (error) {
      log.error('[Mavat] Error getting area statistics:', error)
      return {
        totalPermits: 0,
        approvedPermits: 0,
        pendingPermits: 0,
        violations: 0
      }
    }
  }
}

// Singleton instance
export const mavatAPI = new MavatRealAPI()
