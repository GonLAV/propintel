import { z } from 'zod'

export interface ComparableReportItem {
  id: string
  address: string
  similarity: number
  distanceMeters: number
  saleDate: string
  salePrice: number
  adjustedPrice: number
  adjustmentBreakdown: Record<string, number>
  explanation: string[]
}

export interface ParsedDocumentFact {
  sourceDocumentId: string
  sourceType: 'ownership-extract' | 'permit' | 'contract' | 'tabu' | 'planning'
  factKey: string
  factValue: string | number | boolean
  confidence: number
  page?: number
  conflictWith?: string[]
}

export interface ImageEvidence {
  imageId: string
  conditionScore: number
  renovationLevel: 'high' | 'medium' | 'low'
  detectedIssues: string[]
  evidenceText: string
}

export interface StructuredPropertyForReport {
  id: string
  address: string
  city: string
  parcel?: string
  block?: string
  lot?: string
  propertyType: string
  areaSqm: number
  floor: number
  rooms?: number
  ownershipType?: string
}

export interface ReportTemplateConfig {
  templateId: 'default-court-il' | 'bank-il' | 'private-client'
  language: 'he' | 'en'
  mandatorySections: string[]
  optionalSections: string[]
  tone: 'formal' | 'banking' | 'technical'
}

export interface GroundedReportInput {
  property: StructuredPropertyForReport
  comparables: ComparableReportItem[]
  documentFacts: ParsedDocumentFact[]
  imageEvidence: ImageEvidence[]
  valuationRange: { low: number; mid: number; high: number }
  confidenceScore: number
  template: ReportTemplateConfig
}

export interface GroundedPromptBundle {
  systemPrompt: string
  userPrompt: string
  jsonSchema: unknown
}

export interface GeneratedReportSection {
  sectionId: string
  title: string
  markdown: string
  groundedFacts: string[]
}

export interface GeneratedAppraisalReport {
  reportId: string
  version: number
  createdAt: string
  sections: GeneratedReportSection[]
  validations: ValidationResult[]
  readyForFinalApproval: boolean
}

export interface ValidationResult {
  key: string
  severity: 'error' | 'warning'
  message: string
}

export const groundedReportInputSchema = z.object({
  property: z.object({
    id: z.string(),
    address: z.string(),
    city: z.string(),
    parcel: z.string().optional(),
    block: z.string().optional(),
    lot: z.string().optional(),
    propertyType: z.string(),
    areaSqm: z.number().positive(),
    floor: z.number(),
    rooms: z.number().optional(),
    ownershipType: z.string().optional(),
  }),
  comparables: z.array(
    z.object({
      id: z.string(),
      address: z.string(),
      similarity: z.number().min(0).max(1),
      distanceMeters: z.number().nonnegative(),
      saleDate: z.string(),
      salePrice: z.number().positive(),
      adjustedPrice: z.number().positive(),
      adjustmentBreakdown: z.record(z.number()),
      explanation: z.array(z.string()),
    }),
  ),
  documentFacts: z.array(
    z.object({
      sourceDocumentId: z.string(),
      sourceType: z.enum(['ownership-extract', 'permit', 'contract', 'tabu', 'planning']),
      factKey: z.string(),
      factValue: z.union([z.string(), z.number(), z.boolean()]),
      confidence: z.number().min(0).max(1),
      page: z.number().optional(),
      conflictWith: z.array(z.string()).optional(),
    }),
  ),
  imageEvidence: z.array(
    z.object({
      imageId: z.string(),
      conditionScore: z.number().min(1).max(10),
      renovationLevel: z.enum(['high', 'medium', 'low']),
      detectedIssues: z.array(z.string()),
      evidenceText: z.string(),
    }),
  ),
  valuationRange: z.object({
    low: z.number().nonnegative(),
    mid: z.number().nonnegative(),
    high: z.number().nonnegative(),
  }),
  confidenceScore: z.number().min(0).max(100),
  template: z.object({
    templateId: z.enum(['default-court-il', 'bank-il', 'private-client']),
    language: z.enum(['he', 'en']),
    mandatorySections: z.array(z.string()),
    optionalSections: z.array(z.string()),
    tone: z.enum(['formal', 'banking', 'technical']),
  }),
})

const reportJsonSchema = {
  type: 'object',
  required: ['sections', 'summary', 'assumptions', 'limitations'],
  properties: {
    summary: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sectionId', 'title', 'markdown', 'groundedFacts'],
        properties: {
          sectionId: { type: 'string' },
          title: { type: 'string' },
          markdown: { type: 'string' },
          groundedFacts: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const

export function buildGroundedPromptBundle(input: GroundedReportInput): GroundedPromptBundle {
  groundedReportInputSchema.parse(input)

  const strictGuardrails = [
    'Use grounded data only. Never invent addresses, comparables, legal facts, or measurements.',
    'If data is missing, explicitly state: "חסר מידע מאומת" (missing verified data).',
    'Cite source facts by sourceDocumentId or comparable id in each section.',
    'Output strict JSON only according to schema.',
    'Professional appraisal tone suitable for court and bank review.',
  ].join('\n')

  const facts = buildFactTable(input)

  return {
    systemPrompt: `You are a certified appraisal report writing assistant for Israel.\n${strictGuardrails}`,
    userPrompt: [
      `Template: ${input.template.templateId} (${input.template.language})`,
      `Mandatory sections: ${input.template.mandatorySections.join(', ')}`,
      `Optional sections: ${input.template.optionalSections.join(', ')}`,
      `Valuation range (NIS): low=${input.valuationRange.low}, mid=${input.valuationRange.mid}, high=${input.valuationRange.high}`,
      `Confidence: ${input.confidenceScore}`,
      'Grounded facts dataset:',
      facts,
    ].join('\n\n'),
    jsonSchema: reportJsonSchema,
  }
}

export function generateDeterministicReportDraft(input: GroundedReportInput): GeneratedAppraisalReport {
  groundedReportInputSchema.parse(input)

  const valuationSection: GeneratedReportSection = {
    sectionId: 'valuation-conclusion',
    title: input.template.language === 'he' ? 'מסקנת שווי' : 'Valuation Conclusion',
    markdown:
      input.template.language === 'he'
        ? `טווח השווי המוערך: ${formatNis(input.valuationRange.low)} - ${formatNis(input.valuationRange.high)}.\nשווי אמצעי: ${formatNis(input.valuationRange.mid)}.\nרמת ביטחון: ${input.confidenceScore}%.`
        : `Estimated value range: ${formatNis(input.valuationRange.low)} - ${formatNis(input.valuationRange.high)}. Mid: ${formatNis(input.valuationRange.mid)}. Confidence: ${input.confidenceScore}%.`,
    groundedFacts: [
      `property:${input.property.id}`,
      ...input.comparables.slice(0, 5).map((c) => `comparable:${c.id}`),
    ],
  }

  const comparablesSection: GeneratedReportSection = {
    sectionId: 'comparables-analysis',
    title: input.template.language === 'he' ? 'ניתוח עסקאות השוואה' : 'Comparable Analysis',
    markdown: input.comparables
      .slice(0, 10)
      .map((c, i) => `${i + 1}. ${c.address} | similarity=${(c.similarity * 100).toFixed(1)}% | adjusted=${formatNis(c.adjustedPrice)}`)
      .join('\n'),
    groundedFacts: input.comparables.slice(0, 10).map((c) => `comparable:${c.id}`),
  }

  const legalRiskSection: GeneratedReportSection = {
    sectionId: 'legal-risks',
    title: input.template.language === 'he' ? 'סיכונים משפטיים' : 'Legal Risks',
    markdown: detectLegalRiskLines(input.documentFacts, input.template.language).join('\n'),
    groundedFacts: input.documentFacts.map((f) => `${f.sourceDocumentId}:${f.factKey}`),
  }

  const imageSection: GeneratedReportSection = {
    sectionId: 'condition-evidence',
    title: input.template.language === 'he' ? 'מצב פיזי וראיות חזותיות' : 'Condition & Visual Evidence',
    markdown: input.imageEvidence
      .slice(0, 8)
      .map((x) => `- [${x.imageId}] score=${x.conditionScore}/10, renovation=${x.renovationLevel}, issues=${x.detectedIssues.join(', ') || 'none'}`)
      .join('\n'),
    groundedFacts: input.imageEvidence.map((x) => `image:${x.imageId}`),
  }

  const validations = validateReportConsistency(input)

  return {
    reportId: `report-${input.property.id}-${Date.now()}`,
    version: 1,
    createdAt: new Date().toISOString(),
    sections: [valuationSection, comparablesSection, legalRiskSection, imageSection],
    validations,
    readyForFinalApproval: validations.every((x) => x.severity !== 'error'),
  }
}

export function validateReportConsistency(input: GroundedReportInput): ValidationResult[] {
  const results: ValidationResult[] = []

  if (!(input.valuationRange.low <= input.valuationRange.mid && input.valuationRange.mid <= input.valuationRange.high)) {
    results.push({
      key: 'valuation.range.order',
      severity: 'error',
      message: 'Valuation range ordering is invalid (low <= mid <= high must hold).',
    })
  }

  if (input.comparables.length < 3) {
    results.push({
      key: 'comparables.minimum',
      severity: 'warning',
      message: 'Fewer than 3 comparables were used. Confidence should be treated as limited.',
    })
  }

  const avgAdjusted = average(input.comparables.map((x) => x.adjustedPrice))
  if (avgAdjusted > 0) {
    const spread = Math.abs(input.valuationRange.mid - avgAdjusted) / avgAdjusted
    if (spread > 0.2) {
      results.push({
        key: 'valuation.vs-adjusted.spread',
        severity: 'warning',
        message: 'Mid valuation differs by more than 20% from mean adjusted comparable value.',
      })
    }
  }

  const highConflictFacts = input.documentFacts.filter((f) => (f.conflictWith?.length ?? 0) > 0)
  if (highConflictFacts.length > 0) {
    results.push({
      key: 'docs.conflicts',
      severity: 'error',
      message: `Detected ${highConflictFacts.length} conflicting legal/document facts. Manual review required.`,
    })
  }

  if (input.confidenceScore < 55) {
    results.push({
      key: 'valuation.low-confidence',
      severity: 'warning',
      message: 'Confidence score is below 55. Report should include an explicit reliability caveat.',
    })
  }

  return results
}

function buildFactTable(input: GroundedReportInput): string {
  const propertyLine = `PROPERTY|${input.property.id}|${input.property.address}|area=${input.property.areaSqm}|floor=${input.property.floor}`
  const comparableLines = input.comparables
    .slice(0, 20)
    .map((c) => `COMP|${c.id}|${c.address}|sim=${c.similarity}|sale=${c.salePrice}|adj=${c.adjustedPrice}|dist=${c.distanceMeters}`)

  const docLines = input.documentFacts
    .slice(0, 100)
    .map((f) => `DOC|${f.sourceDocumentId}|${f.sourceType}|${f.factKey}=${String(f.factValue)}|conf=${f.confidence}`)

  const imageLines = input.imageEvidence
    .slice(0, 30)
    .map((x) => `IMG|${x.imageId}|condition=${x.conditionScore}|renovation=${x.renovationLevel}|issues=${x.detectedIssues.join(';')}`)

  return [propertyLine, ...comparableLines, ...docLines, ...imageLines].join('\n')
}

function detectLegalRiskLines(facts: ParsedDocumentFact[], language: 'he' | 'en'): string[] {
  const conflicts = facts.filter((x) => (x.conflictWith?.length ?? 0) > 0)

  if (conflicts.length === 0) {
    return [language === 'he' ? '- לא זוהו סתירות משפטיות מהותיות במסמכים שסופקו.' : '- No material legal inconsistencies were detected in provided documents.']
  }

  return conflicts.map((f) =>
    language === 'he'
      ? `- התגלתה סתירה בעובדה ${f.factKey} (מקור: ${f.sourceDocumentId}). נדרשת בדיקה אנושית.`
      : `- Conflict detected for fact ${f.factKey} (source: ${f.sourceDocumentId}). Manual review required.`,
  )
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function formatNis(value: number): string {
  return `₪${Math.round(value).toLocaleString('he-IL')}`
}
