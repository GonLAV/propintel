import type { CleanTransaction, DataGovValuationResult } from './dataGovAPI'
import { uid } from '@/lib/utils'

export interface AppraisalRecord {
  id: string
  propertyId: string
  createdAt: string
  updatedAt: string
  status: 'draft' | 'in-progress' | 'completed' | 'reviewed'
  
  property: {
    city: string
    street: string
    houseNumber?: string
    area: number
    rooms?: number
    floor?: number
    assetType?: string
    buildYear?: number
    condition?: string
  }
  
  marketData: {
    source: 'data.gov.il' | 'manual'
    fetchedAt: string
    sampleSize: number
    avgPricePerSqm: number
    medianPricePerSqm: number
    dataQuality: number
    transactions: CleanTransaction[]
  }
  
  valuation: DataGovValuationResult & {
    aiAnalysis?: string
    appraiserNotes?: string
    adjustments?: Array<{
      factor: string
      description: string
      impact: number
      reason: string
    }>
  }
  
  metadata: {
    appraiser?: string
    reviewer?: string
    client?: string
    purpose?: string
    orderNumber?: string
  }
  
  auditTrail: Array<{
    timestamp: string
    action: string
    user: string
    details?: string
  }>
}

export function createAppraisalRecord(params: {
  propertyId: string
  property: AppraisalRecord['property']
  marketData: AppraisalRecord['marketData']
  valuation: DataGovValuationResult
  metadata?: Partial<AppraisalRecord['metadata']>
}): AppraisalRecord {
  const now = new Date().toISOString()
  const id = uid('appraisal')

  return {
    id,
    propertyId: params.propertyId,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    property: params.property,
    marketData: params.marketData,
    valuation: {
      ...params.valuation,
      aiAnalysis: undefined,
      appraiserNotes: undefined,
      adjustments: []
    },
    metadata: params.metadata || {},
    auditTrail: [{
      timestamp: now,
      action: 'created',
      user: params.metadata?.appraiser || 'system',
      details: 'Appraisal record created with data.gov.il market data'
    }]
  }
}

export function addAuditEntry(
  record: AppraisalRecord,
  action: string,
  user: string,
  details?: string
): AppraisalRecord {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    auditTrail: [
      ...record.auditTrail,
      {
        timestamp: new Date().toISOString(),
        action,
        user,
        details
      }
    ]
  }
}

export function updateAppraisalStatus(
  record: AppraisalRecord,
  status: AppraisalRecord['status'],
  user: string
): AppraisalRecord {
  return addAuditEntry(
    {
      ...record,
      status,
      updatedAt: new Date().toISOString()
    },
    `status_changed_to_${status}`,
    user,
    `Status updated to: ${status}`
  )
}

export function addAIAnalysis(
  record: AppraisalRecord,
  analysis: string,
  user: string
): AppraisalRecord {
  return addAuditEntry(
    {
      ...record,
      valuation: {
        ...record.valuation,
        aiAnalysis: analysis
      },
      updatedAt: new Date().toISOString()
    },
    'ai_analysis_added',
    user,
    'AI analysis generated and added to valuation'
  )
}

export function addAppraisalAdjustment(
  record: AppraisalRecord,
  adjustment: {
    factor: string
    description: string
    impact: number
    reason: string
  },
  user: string
): AppraisalRecord {
  const adjustments = record.valuation.adjustments || []
  
  return addAuditEntry(
    {
      ...record,
      valuation: {
        ...record.valuation,
        adjustments: [...adjustments, adjustment]
      },
      updatedAt: new Date().toISOString()
    },
    'adjustment_added',
    user,
    `Added adjustment: ${adjustment.factor} (${adjustment.impact > 0 ? '+' : ''}${adjustment.impact}%)`
  )
}

export function calculateAdjustedValue(record: AppraisalRecord): number {
  const baseValue = record.valuation.estimatedValue
  const adjustments = record.valuation.adjustments || []
  
  const totalImpact = adjustments.reduce((sum, adj) => sum + adj.impact, 0)
  const adjustedValue = baseValue * (1 + totalImpact / 100)
  
  return Math.round(adjustedValue)
}

export function generateAppraisalSummary(record: AppraisalRecord): string {
  const adjustedValue = calculateAdjustedValue(record)
  const hasAdjustments = (record.valuation.adjustments?.length || 0) > 0
  
  return `
דוח שמאות מספר: ${record.id}
תאריך: ${new Date(record.createdAt).toLocaleDateString('he-IL')}
סטטוס: ${getStatusLabel(record.status)}

## פרטי הנכס
כתובת: ${record.property.street}, ${record.property.city}
שטח: ${record.property.area} מ"ר
${record.property.rooms ? `חדרים: ${record.property.rooms}` : ''}
${record.property.floor ? `קומה: ${record.property.floor}` : ''}
${record.property.assetType ? `סוג: ${record.property.assetType}` : ''}

## נתוני שוק
מקור: ${record.marketData.source === 'data.gov.il' ? 'data.gov.il - משרד המשפטים' : 'ידני'}
גודל מדגם: ${record.marketData.sampleSize} עסקאות
מחיר ממוצע למ"ר: ₪${record.marketData.avgPricePerSqm.toLocaleString('he-IL')}
מחיר חציון למ"ר: ₪${record.marketData.medianPricePerSqm.toLocaleString('he-IL')}
איכות נתונים: ${record.marketData.dataQuality}%

## הערכת שווי
שיטה: ${getMethodLabel(record.valuation.method)}
הערכה ראשונית: ₪${record.valuation.estimatedValue.toLocaleString('he-IL')}
מחיר למ"ר: ₪${record.valuation.pricePerSqm.toLocaleString('he-IL')}
טווח ערכים: ₪${record.valuation.valueRange.min.toLocaleString('he-IL')} - ₪${record.valuation.valueRange.max.toLocaleString('he-IL')}
רמת ודאות: ${getConfidenceLabel(record.valuation.confidence)}

${hasAdjustments ? `
## התאמות
${record.valuation.adjustments?.map(adj => 
  `- ${adj.factor}: ${adj.impact > 0 ? '+' : ''}${adj.impact}% - ${adj.description}`
).join('\n')}

הערכת שווי מותאמת: ₪${adjustedValue.toLocaleString('he-IL')}
` : ''}

${record.valuation.aiAnalysis ? `
## ניתוח AI
${record.valuation.aiAnalysis}
` : ''}

${record.valuation.appraiserNotes ? `
## הערות שמאי
${record.valuation.appraiserNotes}
` : ''}

---
נוצר ב: ${new Date(record.createdAt).toLocaleString('he-IL')}
עודכן ב: ${new Date(record.updatedAt).toLocaleString('he-IL')}
${record.metadata.appraiser ? `שמאי: ${record.metadata.appraiser}` : ''}
${record.metadata.client ? `לקוח: ${record.metadata.client}` : ''}
`.trim()
}

function getStatusLabel(status: AppraisalRecord['status']): string {
  const labels: Record<AppraisalRecord['status'], string> = {
    'draft': 'טיוטה',
    'in-progress': 'בעבודה',
    'completed': 'הושלם',
    'reviewed': 'נבדק'
  }
  return labels[status]
}

function getMethodLabel(method: DataGovValuationResult['method']): string {
  const labels: Record<DataGovValuationResult['method'], string> = {
    'comparative': 'השוואה',
    'income': 'היוון הכנסות',
    'cost': 'עלות מתואמת'
  }
  return labels[method]
}

function getConfidenceLabel(confidence: DataGovValuationResult['confidence']): string {
  const labels: Record<DataGovValuationResult['confidence'], string> = {
    'low': 'נמוכה',
    'medium': 'בינונית',
    'high': 'גבוהה'
  }
  return labels[confidence]
}

export function exportAppraisalToJSON(record: AppraisalRecord): string {
  return JSON.stringify(record, null, 2)
}

export function exportAppraisalToCSV(record: AppraisalRecord): string {
  const transactions = record.marketData.transactions
  
  const headers = [
    'מספר',
    'כתובת',
    'עיר',
    'מחיר',
    'מחיר למ"ר',
    'שטח',
    'חדרים',
    'קומה',
    'תאריך',
    'סוג',
    'מקור'
  ].join(',')
  
  const rows = transactions.map((t, i) => [
    i + 1,
    `"${t.street} ${t.houseNumber}"`,
    t.city,
    t.price,
    Math.round(t.pricePerSqm),
    t.area,
    t.rooms,
    t.floor,
    t.date,
    t.assetType,
    t.dataSource
  ].join(','))
  
  return [headers, ...rows].join('\n')
}
