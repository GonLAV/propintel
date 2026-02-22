/**
 * Unified Government Data Integration
 * אינטגרציה מאוחדת למקורות נתונים ממשלתיים
 * 
 * This module combines iPlan and Mavat APIs to provide comprehensive
 * building rights and permit data for Israeli properties.
 */

import { iPlanAPI, type IPlanParcelData, type IPlanBuildingRights } from './iPlanAPI'
import { mavatAPI, type MavatBuildingPermit, type MavatViolation } from './mavatAPI'
import { createLogger } from '@/lib/logger'

const log = createLogger('UnifiedGovAPI')

export interface UnifiedBuildingRights {
  // זיהוי
  gush: string
  helka: string
  address?: string
  
  // מקורות נתונים
  iPlanData: IPlanParcelData | null
  mavatData: {
    permits: MavatBuildingPermit[]
    violations: MavatViolation[]
  }
  
  // זכויות בנייה מאוחדות
  currentRights: {
    buildingPercentage?: number
    maxFloors?: number
    maxHeight?: number
    allowedUses: string[]
    mainUse: string
    landUseZone?: string
  }
  
  // סטטוס משפטי
  legalStatus: {
    hasViolations: boolean
    violationCount: number
    hasActivePermits: boolean
    permitCount: number
    conservation: boolean
    expropriation: boolean
  }
  
  // מטא-נתונים
  dataQuality: 'high' | 'medium' | 'low'
  lastUpdate: string
  sources: string[]
}

export class UnifiedGovDataAPI {
  /**
   * שליפה מאוחדת של נתוני זכויות בנייה מכל המקורות
   */
  async fetchBuildingRights(
    gush: string,
    helka: string,
    address?: string
  ): Promise<UnifiedBuildingRights> {
    log.info(`Fetching building rights for Gush ${gush}, Helka ${helka}`)
    
    // שליפה מקבילה מכל המקורות
    const [iPlanData, mavatPermits, mavatViolations] = await Promise.all([
      this.fetchFromIPlan(gush, helka),
      this.fetchMavatPermits(gush, helka, address),
      this.fetchMavatViolations(gush, helka, address)
    ])
    
    // איחוד הנתונים
    const unified = this.unifyData(gush, helka, iPlanData, mavatPermits, mavatViolations, address)
    
    return unified
  }

  /**
   * שליפה לפי מספר תכנית
   */
  async fetchByPlanNumber(planNumber: string): Promise<{
    plan: IPlanBuildingRights | null
    relatedPermits: MavatBuildingPermit[]
  }> {
    log.info(`Fetching plan: ${planNumber}`)
    
    const plan = await iPlanAPI.fetchPlanByNumber(planNumber)
    
    // ניסיון למצוא היתרים קשורים (אם יש מידע על מיקום)
    const relatedPermits: MavatBuildingPermit[] = []
    
    return {
      plan,
      relatedPermits
    }
  }

  /**
   * שליפה מ-iPlan
   */
  private async fetchFromIPlan(gush: string, helka: string): Promise<IPlanParcelData | null> {
    try {
      return await iPlanAPI.fetchParcelData(gush, helka)
    } catch (error) {
      log.error('iPlan fetch failed:', error)
      return null
    }
  }

  /**
   * שליפת היתרים ממבא"ת
   */
  private async fetchMavatPermits(
    gush: string,
    helka: string,
    address?: string
  ): Promise<MavatBuildingPermit[]> {
    try {
      // ניסיון ראשון: לפי גוש וחלקה
      let permits = await mavatAPI.searchPermitsByAddress({ gush, helka })
      
      // אם לא נמצא ויש כתובת, נסה לפי כתובת
      if (permits.length === 0 && address) {
        const addressParts = this.parseAddress(address)
        permits = await mavatAPI.searchPermitsByAddress(addressParts)
      }
      
      return permits
    } catch (error) {
      log.error('Mavat permits fetch failed:', error)
      return []
    }
  }

  /**
   * שליפת עבירות ממבא"ת
   */
  private async fetchMavatViolations(
    gush: string,
    helka: string,
    address?: string
  ): Promise<MavatViolation[]> {
    try {
      // ניסיון ראשון: לפי גוש וחלקה
      let violations = await mavatAPI.searchViolations({ gush, helka })
      
      // אם לא נמצא ויש כתובת, נסה לפי כתובת
      if (violations.length === 0 && address) {
        const addressParts = this.parseAddress(address)
        violations = await mavatAPI.searchViolations(addressParts)
      }
      
      return violations
    } catch (error) {
      log.error('Mavat violations fetch failed:', error)
      return []
    }
  }

  /**
   * איחוד נתונים מכל המקורות
   */
  private unifyData(
    gush: string,
    helka: string,
    iPlanData: IPlanParcelData | null,
    mavatPermits: MavatBuildingPermit[],
    mavatViolations: MavatViolation[],
    address?: string
  ): UnifiedBuildingRights {
    // שליפת זכויות בנייה עדכניות מ-iPlan
    const currentPlan = iPlanData?.applicablePlans?.[0]
    
    // חישוב איכות נתונים
    const dataQuality = this.assessDataQuality(iPlanData, mavatPermits)
    
    // רשימת מקורות
    const sources: string[] = []
    if (iPlanData) sources.push('iPlan')
    if (mavatPermits.length > 0) sources.push('Mavat-Permits')
    if (mavatViolations.length > 0) sources.push('Mavat-Violations')
    
    return {
      gush,
      helka,
      address,
      
      iPlanData,
      mavatData: {
        permits: mavatPermits,
        violations: mavatViolations
      },
      
      currentRights: {
        buildingPercentage: currentPlan?.buildingPercentage,
        maxFloors: currentPlan?.maxFloors,
        maxHeight: currentPlan?.maxHeight,
        allowedUses: currentPlan?.allowedUses || [],
        mainUse: currentPlan?.mainUse || 'לא ידוע',
        landUseZone: currentPlan?.landUseZone
      },
      
      legalStatus: {
        hasViolations: mavatViolations.length > 0,
        violationCount: mavatViolations.length,
        hasActivePermits: mavatPermits.some(p => p.status === 'אושר'),
        permitCount: mavatPermits.length,
        conservation: currentPlan?.conservation || false,
        expropriation: currentPlan?.expropriation || false
      },
      
      dataQuality,
      lastUpdate: new Date().toISOString(),
      sources
    }
  }

  /**
   * הערכת איכות נתונים
   */
  private assessDataQuality(
    iPlanData: IPlanParcelData | null,
    mavatPermits: MavatBuildingPermit[]
  ): 'high' | 'medium' | 'low' {
    let score = 0
    
    // יש נתוני iPlan
    if (iPlanData) score += 40
    
    // יש תכניות חלות
    if (iPlanData?.applicablePlans && iPlanData.applicablePlans.length > 0) score += 30
    
    // יש זכויות בנייה מפורטות
    if (iPlanData?.applicablePlans?.[0]?.buildingPercentage) score += 20
    
    // יש נתוני מבא"ת
    if (mavatPermits.length > 0) score += 10
    
    if (score >= 80) return 'high'
    if (score >= 50) return 'medium'
    return 'low'
  }

  /**
   * פירוק כתובת למרכיבים
   */
  private parseAddress(address: string): {
    city?: string
    street?: string
    houseNumber?: string
  } {
    // ניסיון פשוט לפירוק כתובת ישראלית
    // פורמט: "רחוב 123, עיר"
    
    const parts = address.split(',').map(p => p.trim())
    
    if (parts.length >= 2) {
      const streetPart = parts[0]
      const city = parts[parts.length - 1]
      
      // ניסיון לחלץ מספר בית
      const numberMatch = streetPart.match(/(\d+)/)
      const houseNumber = numberMatch ? numberMatch[1] : undefined
      
      // הסרת מספר בית מהרחוב
      const street = streetPart.replace(/\d+/g, '').trim()
      
      return { city, street, houseNumber }
    }
    
    return { city: address }
  }

  /**
   * בדיקת זמינות כל השירותים
   */
  async testAllConnections(): Promise<{
    iPlan: boolean
    mavat: boolean
    overall: boolean
  }> {
    const [iPlanOk, mavatOk] = await Promise.all([
      iPlanAPI.testConnection(),
      mavatAPI.testConnection()
    ])
    
    return {
      iPlan: iPlanOk,
      mavat: mavatOk,
      overall: iPlanOk || mavatOk // לפחות אחד עובד
    }
  }

  /**
   * קבלת דוח מפורט על זכויות בנייה
   */
  async generateBuildingRightsReport(gush: string, helka: string, address?: string): Promise<string> {
    const data = await this.fetchBuildingRights(gush, helka, address)
    
    let report = `דוח זכויות בנייה\n`
    report += `===============\n\n`
    report += `גוש: ${gush}, חלקה: ${helka}\n`
    if (address) report += `כתובת: ${address}\n`
    report += `\n`
    
    // מקורות נתונים
    report += `מקורות נתונים: ${data.sources.join(', ') || 'אין'}\n`
    report += `איכות נתונים: ${data.dataQuality}\n`
    report += `\n`
    
    // זכויות בנייה נוכחיות
    report += `זכויות בנייה נוכחיות:\n`
    report += `------------------------\n`
    if (data.currentRights.buildingPercentage) {
      report += `אחוזי בנייה: ${data.currentRights.buildingPercentage}%\n`
    }
    if (data.currentRights.maxFloors) {
      report += `קומות מקסימליות: ${data.currentRights.maxFloors}\n`
    }
    if (data.currentRights.maxHeight) {
      report += `גובה מקסימלי: ${data.currentRights.maxHeight} מ'\n`
    }
    report += `שימוש עיקרי: ${data.currentRights.mainUse}\n`
    if (data.currentRights.allowedUses.length > 0) {
      report += `שימושים מותרים: ${data.currentRights.allowedUses.join(', ')}\n`
    }
    if (data.currentRights.landUseZone) {
      report += `אזור שימוש: ${data.currentRights.landUseZone}\n`
    }
    report += `\n`
    
    // תכניות חלות
    if (data.iPlanData?.applicablePlans && data.iPlanData.applicablePlans.length > 0) {
      report += `תכניות חלות:\n`
      report += `-------------\n`
      data.iPlanData.applicablePlans.forEach((plan, i) => {
        report += `${i + 1}. ${plan.planNumber} - ${plan.planName}\n`
        report += `   סטטוס: ${plan.planStatus}\n`
        if (plan.approvalDate) report += `   תאריך אישור: ${plan.approvalDate}\n`
      })
      report += `\n`
    }
    
    // היתרי בנייה
    if (data.mavatData.permits.length > 0) {
      report += `היתרי בנייה:\n`
      report += `-------------\n`
      data.mavatData.permits.forEach((permit, i) => {
        report += `${i + 1}. היתר ${permit.permitNumber}\n`
        report += `   סוג: ${permit.permitType}\n`
        report += `   סטטוס: ${permit.status}\n`
        if (permit.plannedArea) report += `   שטח מתוכנן: ${permit.plannedArea} מ"ר\n`
      })
      report += `\n`
    }
    
    // עבירות בנייה
    if (data.mavatData.violations.length > 0) {
      report += `⚠️ עבירות בנייה:\n`
      report += `-----------------\n`
      data.mavatData.violations.forEach((violation, i) => {
        report += `${i + 1}. ${violation.type}\n`
        report += `   סטטוס: ${violation.status}\n`
        report += `   חומרה: ${violation.severity}\n`
      })
      report += `\n`
    }
    
    // סטטוס משפטי
    report += `סטטוס משפטי:\n`
    report += `-------------\n`
    report += `עבירות בנייה: ${data.legalStatus.hasViolations ? 'כן (' + data.legalStatus.violationCount + ')' : 'לא'}\n`
    report += `היתרים פעילים: ${data.legalStatus.hasActivePermits ? 'כן (' + data.legalStatus.permitCount + ')' : 'לא'}\n`
    report += `שימור: ${data.legalStatus.conservation ? 'כן' : 'לא'}\n`
    report += `הפקעה: ${data.legalStatus.expropriation ? 'כן' : 'לא'}\n`
    
    return report
  }
}

// Singleton instance
export const unifiedGovAPI = new UnifiedGovDataAPI()

// Export types
export type { IPlanBuildingRights, IPlanParcelData } from './iPlanAPI'
export type { MavatBuildingPermit, MavatViolation } from './mavatAPI'
