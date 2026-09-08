import { z } from 'zod'
import { ProfessionalAVM, type AVMConfiguration, type AVMTransaction } from '@/lib/professionalAVM'
import { ValuationEngine } from '@/lib/valuationEngine'
import {
  EngineComparableSchema,
  EnginePropertySchema
} from '@/lib/valuationSchemas'
import type {
  Comparable,
  Property,
  ValuationQualityCheck,
  ValuationResult
} from '@/lib/types'

const PositiveNumber = z.number().finite().positive()
const NonNegativeNumber = z.number().finite().nonnegative()

export const AVMTransactionSchema = z.object({
  id: z.string().min(1),
  address: z.string().min(1),
  date: z.string().min(1),
  price: PositiveNumber,
  usableArea: PositiveNumber,
  pricePerSqm: NonNegativeNumber,
  floor: z.number().int().nonnegative(),
  totalFloors: z.number().int().nonnegative(),
  rooms: NonNegativeNumber,
  hasElevator: z.boolean(),
  hasParking: z.boolean(),
  hasBalcony: z.boolean(),
  buildingAge: NonNegativeNumber,
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  propertyType: z.enum(['apartment', 'garden-apartment', 'penthouse', 'duplex', 'studio']),
  source: z.enum(['nadlan-gov-il', 'tabu', 'tax-authority']),
  verified: z.boolean(),
  coordinates: z.object({ lat: z.number().finite(), lng: z.number().finite() }).optional(),
  distanceMeters: NonNegativeNumber.optional(),
  similarityScore: z.number().min(0).max(100).optional(),
  timeWeight: NonNegativeNumber.optional(),
  adjustedPrice: NonNegativeNumber.optional(),
  adjustments: z.object({
    location: z.number().finite(),
    size: z.number().finite(),
    condition: z.number().finite(),
    floor: z.number().finite(),
    age: z.number().finite(),
    features: z.number().finite(),
    total: z.number().finite()
  }).optional()
})

const StandardRequestSchema = z.object({
  property: z.unknown(),
  comparables: z.array(z.unknown()).optional(),
  landValue: NonNegativeNumber.optional(),
  constructionCostPerSqm: PositiveNumber.optional(),
  monthlyRent: PositiveNumber.optional(),
  vacancyRate: z.number().finite().min(0).max(1).optional(),
  expenseRatio: z.number().finite().min(0).max(1).optional(),
  capRate: PositiveNumber.optional()
})

export const ValuationServiceResultSchema = z.object({
  method: z.enum(['comparable-sales', 'cost-approach', 'income-approach', 'hybrid', 'professional-avm']),
  estimatedValue: NonNegativeNumber,
  valueRange: z.object({ min: NonNegativeNumber, max: NonNegativeNumber }),
  confidence: z.number().finite().min(0).max(100),
  estimate: z.object({
    value: NonNegativeNumber,
    range: z.object({ min: NonNegativeNumber, max: NonNegativeNumber })
  }),
  quality: z.object({
    score: z.number().finite().min(0).max(100),
    checks: z.array(z.object({
      severity: z.enum(['info', 'warning', 'error']),
      code: z.string(),
      message: z.string()
    }))
  }),
  warnings: z.array(z.string()),
  provenance: z.object({
    source: z.enum(['valuation-engine', 'professional-avm']),
    version: z.string().min(1),
    inputSummary: z.record(z.union([z.string(), z.number(), z.array(z.string())]))
  }),
  legacyResult: z.unknown()
})

export type ValuationServiceResult = z.infer<typeof ValuationServiceResultSchema>
export type ValuationServiceMethod = ValuationServiceResult['method']

type BaseRequest = { property: Property }
export type ValuationServiceRequest =
  | (BaseRequest & { method: 'comparable-sales'; comparables: Comparable[]; professional?: boolean })
  | (BaseRequest & { method: 'cost-approach'; landValue: number; constructionCostPerSqm: number })
  | (BaseRequest & {
      method: 'income-approach'
      monthlyRent: number
      vacancyRate?: number
      expenseRatio?: number
      capRate?: number
    })
  | (BaseRequest & { method: 'professional-avm'; transactions: AVMTransaction[]; config?: Partial<AVMConfiguration> })
  | { method: 'hybrid'; results: ValuationResult[]; weights?: Partial<Record<ValuationResult['method'], number>> }

const ENGINE_VERSION = 'valuation-engine-v1'
const AVM_VERSION = 'professional-avm-v1'

function qualityWarnings(checks: ValuationQualityCheck[]): string[] {
  return checks
    .filter(check => check.severity === 'warning' || check.severity === 'error')
    .map(check => check.message)
}

function normalizeEngineResult(result: ValuationResult, inputSummary: Record<string, string | number | string[]>): ValuationServiceResult {
  const checks = result.qualityChecks ?? []
  const normalized = {
    ...result,
    estimate: { value: result.estimatedValue, range: result.valueRange },
    quality: { score: result.confidence, checks },
    warnings: qualityWarnings(checks),
    provenance: {
      source: 'valuation-engine' as const,
      version: ENGINE_VERSION,
      inputSummary
    },
    legacyResult: result
  }
  return ValuationServiceResultSchema.parse(normalized)
}

function validateProperty(property: Property): void {
  EnginePropertySchema.parse(property)
}

function validateStandardRequest(request: ValuationServiceRequest): void {
  StandardRequestSchema.parse(request)
  validateProperty(request.property)
  if ('comparables' in request) {
    request.comparables.forEach(comparable => EngineComparableSchema.parse(comparable))
  }
}

export async function valuate(request: ValuationServiceRequest): Promise<ValuationServiceResult> {
  if (request.method === 'professional-avm') {
    validateProperty(request.property)
    const transactions = request.transactions.map(transaction => AVMTransactionSchema.parse(transaction))
    const avmResult = await new ProfessionalAVM(request.config).valuate(request.property, transactions)
    const checks: ValuationQualityCheck[] = [
      ...avmResult.warnings.map(message => ({ severity: 'warning' as const, code: 'avm-warning', message })),
      ...avmResult.lowConfidenceFlags.map(message => ({ severity: 'warning' as const, code: 'low-confidence', message }))
    ]
    const legacyResult: ValuationResult = {
      method: 'comparable-sales',
      estimatedValue: avmResult.estimatedValue,
      valueRange: { min: avmResult.valueRange.low, max: avmResult.valueRange.high },
      confidence: avmResult.confidenceScore,
      calculations: [],
      methodology: avmResult.methodology,
      assumptions: avmResult.assumptions,
      limitations: avmResult.limitations,
      qualityChecks: checks,
      calculatedAt: avmResult.calculationDate
    }
    return ValuationServiceResultSchema.parse({
      ...legacyResult,
      method: 'professional-avm',
      estimate: { value: avmResult.estimatedValue, range: { min: avmResult.valueRange.low, max: avmResult.valueRange.high } },
      quality: { score: avmResult.dataQuality, checks },
      warnings: [...avmResult.warnings, ...avmResult.lowConfidenceFlags],
      provenance: {
        source: 'professional-avm',
        version: AVM_VERSION,
        inputSummary: {
          propertyId: request.property.id,
          transactions: transactions.length,
          sources: Array.from(new Set(transactions.map(transaction => transaction.source)))
        }
      },
      legacyResult
    })
  }

  if (request.method === 'hybrid') {
    if (request.results.length === 0) throw new Error('אין תוצאות לשקלול')
    request.results.forEach(result => ValuationServiceResultSchema.partial().parse({
      ...result,
      estimate: { value: result.estimatedValue, range: result.valueRange },
      quality: { score: result.confidence, checks: result.qualityChecks ?? [] },
      warnings: [],
      provenance: { source: 'valuation-engine', version: ENGINE_VERSION, inputSummary: {} },
      legacyResult: result
    }))
    return normalizeEngineResult(
      ValuationEngine.reconcileValuations(request.results, request.weights),
      { methods: request.results.map(result => result.method) }
    )
  }

  validateStandardRequest(request)
  let result: ValuationResult
  switch (request.method) {
    case 'comparable-sales':
      result = request.professional
        ? ValuationEngine.calculateComparableSalesApproachProfessional(request.property, request.comparables)
        : ValuationEngine.calculateComparableSalesApproach(request.property, request.comparables)
      return normalizeEngineResult(result, {
        propertyId: request.property.id,
        comparables: request.comparables.length,
        selectedComparables: request.comparables.filter(comparable => comparable.selected).length,
        mode: request.professional ? 'professional' : 'standard'
      })
    case 'cost-approach':
      result = ValuationEngine.calculateCostApproach(request.property, request.landValue, request.constructionCostPerSqm)
      return normalizeEngineResult(result, { propertyId: request.property.id, landValue: request.landValue, constructionCostPerSqm: request.constructionCostPerSqm })
    case 'income-approach':
      result = ValuationEngine.calculateIncomeApproach(
        request.property,
        request.monthlyRent,
        request.vacancyRate,
        request.expenseRatio,
        request.capRate
      )
      return normalizeEngineResult(result, {
        propertyId: request.property.id,
        monthlyRent: request.monthlyRent,
        vacancyRate: request.vacancyRate ?? 0.05,
        expenseRatio: request.expenseRatio ?? 0.3,
        capRate: request.capRate ?? 0.05
      })
  }
}
