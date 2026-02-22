import { describe, expect, it } from 'vitest'
import {
  buildGroundedPromptBundle,
  generateDeterministicReportDraft,
  validateReportConsistency,
  type GroundedReportInput,
} from '@/lib/aiReportGenerator'

const input: GroundedReportInput = {
  property: {
    id: 'p-1',
    address: 'דרך השלום 10',
    city: 'תל אביב-יפו',
    propertyType: 'apartment',
    areaSqm: 100,
    floor: 7,
  },
  comparables: [
    {
      id: 'c-1',
      address: 'השוואה 1',
      similarity: 0.92,
      distanceMeters: 280,
      saleDate: new Date().toISOString(),
      salePrice: 2_800_000,
      adjustedPrice: 2_760_000,
      adjustmentBreakdown: { floor: 0.01, parking: 0.02 },
      explanation: ['close', 'same type'],
    },
    {
      id: 'c-2',
      address: 'השוואה 2',
      similarity: 0.88,
      distanceMeters: 540,
      saleDate: new Date().toISOString(),
      salePrice: 2_720_000,
      adjustedPrice: 2_740_000,
      adjustmentBreakdown: { floor: -0.01, parking: 0 },
      explanation: ['similar area'],
    },
    {
      id: 'c-3',
      address: 'השוואה 3',
      similarity: 0.86,
      distanceMeters: 620,
      saleDate: new Date().toISOString(),
      salePrice: 2_680_000,
      adjustedPrice: 2_700_000,
      adjustmentBreakdown: { floor: 0.01, parking: 0.01 },
      explanation: ['recent'],
    },
  ],
  documentFacts: [
    {
      sourceDocumentId: 'doc-1',
      sourceType: 'permit',
      factKey: 'permit_status',
      factValue: 'valid',
      confidence: 0.99,
    },
  ],
  imageEvidence: [
    {
      imageId: 'img-1',
      conditionScore: 7,
      renovationLevel: 'medium',
      detectedIssues: ['paint'],
      evidenceText: 'Paint wear on interior wall.',
    },
  ],
  valuationRange: { low: 2_650_000, mid: 2_730_000, high: 2_810_000 },
  confidenceScore: 82,
  template: {
    templateId: 'default-court-il',
    language: 'he',
    mandatorySections: ['subject', 'comparables-analysis', 'valuation-conclusion'],
    optionalSections: ['condition-evidence'],
    tone: 'formal',
  },
}

describe('aiReportGenerator', () => {
  it('builds grounded prompt bundle with schema', () => {
    const bundle = buildGroundedPromptBundle(input)

    expect(bundle.systemPrompt).toContain('grounded data only')
    expect(bundle.userPrompt).toContain('Grounded facts dataset')
    expect(bundle.jsonSchema).toBeDefined()
  })

  it('creates deterministic report draft and passes validation', () => {
    const draft = generateDeterministicReportDraft(input)

    expect(draft.sections.length).toBeGreaterThan(0)
    expect(draft.validations.filter((v) => v.severity === 'error')).toHaveLength(0)

    const checks = validateReportConsistency(input)
    expect(checks.filter((v) => v.severity === 'error')).toHaveLength(0)
  })
})
