import type { DigitalSignature, AuditLog, Report, Invoice } from './types'

export class SecurityEngine {
  
  static async generateDocumentHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  static async createDigitalSignature(
    documentId: string,
    documentType: 'report' | 'invoice' | 'contract',
    documentContent: string,
    signerInfo: {
      userId: string
      name: string
      license?: string
    }
  ): Promise<DigitalSignature> {
    const hash = await this.generateDocumentHash(documentContent)
    const timestamp = new Date().toISOString()
    
    const signaturePayload = {
      documentId,
      documentType,
      hash,
      timestamp,
      signer: signerInfo
    }
    
    const signatureData = await this.generateDocumentHash(JSON.stringify(signaturePayload))

    return {
      id: crypto.randomUUID(),
      documentId,
      documentType,
      signedBy: signerInfo.userId,
      signerName: signerInfo.name,
      signerLicense: signerInfo.license,
      signatureData,
      timestamp,
      ipAddress: 'CLIENT_IP',
      hash,
      verified: true
    }
  }

  static async verifySignature(
    signature: DigitalSignature,
    documentContent: string
  ): Promise<boolean> {
    const currentHash = await this.generateDocumentHash(documentContent)
    return currentHash === signature.hash
  }

  static createAuditLog(
    entityType: 'property' | 'report' | 'invoice' | 'client',
    entityId: string,
    action: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | 'signed',
    userInfo: { userId: string; userName: string },
    changes?: Record<string, { before: any; after: any }>,
    metadata?: Record<string, any>
  ): AuditLog {
    return {
      id: crypto.randomUUID(),
      entityType,
      entityId,
      action,
      userId: userInfo.userId,
      userName: userInfo.userName,
      timestamp: new Date().toISOString(),
      changes,
      metadata
    }
  }

  static filterAuditLogs(
    logs: AuditLog[],
    filters: {
      entityType?: AuditLog['entityType']
      entityId?: string
      action?: AuditLog['action']
      userId?: string
      dateFrom?: Date
      dateTo?: Date
    }
  ): AuditLog[] {
    return logs.filter(log => {
      if (filters.entityType && log.entityType !== filters.entityType) return false
      if (filters.entityId && log.entityId !== filters.entityId) return false
      if (filters.action && log.action !== filters.action) return false
      if (filters.userId && log.userId !== filters.userId) return false
      if (filters.dateFrom && new Date(log.timestamp) < filters.dateFrom) return false
      if (filters.dateTo && new Date(log.timestamp) > filters.dateTo) return false
      return true
    })
  }

  static generateSecurityReport(logs: AuditLog[]): {
    totalActions: number
    actionsByType: Record<string, number>
    activeUsers: number
    recentActivity: AuditLog[]
    suspiciousActivity: AuditLog[]
  } {
    const actionsByType: Record<string, number> = {}
    const uniqueUsers = new Set<string>()
    
    logs.forEach(log => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1
      uniqueUsers.add(log.userId)
    })

    const last24Hours = new Date()
    last24Hours.setHours(last24Hours.getHours() - 24)
    
    const recentActivity = logs
      .filter(log => new Date(log.timestamp) >= last24Hours)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50)

    const suspiciousActivity = this.detectSuspiciousActivity(logs)

    return {
      totalActions: logs.length,
      actionsByType,
      activeUsers: uniqueUsers.size,
      recentActivity,
      suspiciousActivity
    }
  }

  private static detectSuspiciousActivity(logs: AuditLog[]): AuditLog[] {
    const suspicious: AuditLog[] = []
    const userActions: Record<string, AuditLog[]> = {}

    logs.forEach(log => {
      if (!userActions[log.userId]) {
        userActions[log.userId] = []
      }
      userActions[log.userId].push(log)
    })

    Object.entries(userActions).forEach(([_userId, actions]) => {
      const last5Min = new Date()
      last5Min.setMinutes(last5Min.getMinutes() - 5)
      
      const recentActions = actions.filter(
        log => new Date(log.timestamp) >= last5Min
      )

      if (recentActions.length > 50) {
        suspicious.push(...recentActions.slice(0, 10))
      }

      const deletions = actions.filter(log => log.action === 'deleted')
      if (deletions.length > 10) {
        suspicious.push(...deletions)
      }
    })

    return suspicious
  }

  static lockDocument(document: Report | Invoice): Report | Invoice {
    return {
      ...document,
      status: document.status === 'draft' ? 'pending-review' : document.status
    } as Report | Invoice
  }

  static canEditDocument(document: Report | Invoice): boolean {
    return document.status === 'draft'
  }

  static generateWatermark(isDraft: boolean, _appraiserName: string): string {
    if (!isDraft) return ''
    
    return `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 120px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.08);
        pointer-events: none;
        z-index: 9999;
        user-select: none;
      ">
        טיוטה - לא לשימוש רשמי
      </div>
    `
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  static validateLicense(license: string): boolean {
    const licensePattern = /^\d{4,8}$/
    return licensePattern.test(license)
  }

  static generateSecurityToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) return '***'
    const masked = '*'.repeat(data.length - visibleChars)
    return masked + data.slice(-visibleChars)
  }
}
