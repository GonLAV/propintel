/**
 * API client for appraisal engine backend.
 * Can work with mock data or real API endpoints.
 */

import type { Comparable, ValuationResult } from './types'
import { createLogger } from '@/lib/logger'

const log = createLogger('APIClient')

export interface APIClientConfig {
  baseURL: string
  apiKey?: string
  timeout?: number
}

export interface ImportComparablesRequest {
  format: 'csv' | 'json'
  data: string
}

export interface CalculateValuationRequest {
  propertyId: string
  method: 'comparable-sales' | 'cost-approach' | 'income-approach' | 'all'
  inputs?: Record<string, number>
}

export interface GenerateReportRequest {
  propertyId: string
  template: 'standard' | 'detailed' | 'summary'
}

export interface V1ComparableSearchRequest {
  subject: unknown
  comparablesPool: unknown[]
  topK?: number
  requestedBy?: string
}

export interface V1ComparableSearchResponse {
  runId: string
  elapsedMs: number
  comparables: Array<{
    candidateId: string
    comparableId: string
    similarity: number
    distanceMeters: number
    adjustment: Record<string, number>
    adjustedPrice: number
    weight: number
    explanation: string[]
  }>
}

export interface V1AdjustmentOverrideRequest {
  candidateId: string
  appraiserId: string
  reason: string
  patch: Record<string, number>
}

export interface V1ValuationRequest {
  runId: string
  strategy: 'mean' | 'weighted-mean' | 'hedonic'
}

export interface V1ValuationResponse {
  runId: string
  strategy: 'mean' | 'weighted-mean' | 'hedonic'
  range: { low: number; mid: number; high: number }
  confidenceScore: number
  comparablesUsed: number
  rejectedOutliers: string[]
  rationale: string[]
}

export interface V1ReportGenerateRequest {
  subjectProperty: unknown
  runId: string
  templateId?: 'default-court-il' | 'bank-il' | 'private-client'
  language?: 'he' | 'en'
  documentFacts?: unknown[]
  imageEvidence?: unknown[]
}

export interface V1ReportGenerateResponse {
  reportId: string
  version: number
  templateId: string
  language: 'he' | 'en'
  createdAt: string
  runId: string
  sections: Array<{ sectionId: string; title: string; markdown: string; groundedFacts: string[] }>
  validations: Array<{ key: string; severity: 'error' | 'warning'; message: string }>
  readyForFinalApproval: boolean
}

export interface V1IngestionRecord {
  source: string
  sourceRecordId: string
  address: string
  city?: string
  transactionDate?: string
  listingDate?: string
  price: number
  area?: number
  floor?: number
  rooms?: number
  lat?: number
  lon?: number
  status?: string
}

export interface V1IngestionRunRequest {
  createdBy?: string
  transactions?: V1IngestionRecord[]
  listings?: V1IngestionRecord[]
}

export interface V1IngestionRunResponse {
  runId: string
  createdBy: string
  createdAt: string
  elapsedMs: number
  transactions: {
    kind: string
    total: number
    cleaned: Array<Record<string, unknown>>
    duplicates: Array<Record<string, unknown>>
    errors: Array<{ index: number; reason: string }>
    stats: { cleanCount: number; duplicateCount: number; errorCount: number; avgConfidence: number }
  }
  listings: {
    kind: string
    total: number
    cleaned: Array<Record<string, unknown>>
    duplicates: Array<Record<string, unknown>>
    errors: Array<{ index: number; reason: string }>
    stats: { cleanCount: number; duplicateCount: number; errorCount: number; avgConfidence: number }
  }
  summary: {
    input: number
    cleaned: number
    duplicates: number
    errors: number
    avgConfidence: number
  }
}

export class APIClient {
  private baseURL: string
  private apiKey?: string
  private timeout: number

  constructor(config: APIClientConfig) {
    this.baseURL = config.baseURL
    this.apiKey = config.apiKey
    this.timeout = config.timeout || 30000
  }

  private async fetch(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseURL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error) throw error
      throw new Error('Network error')
    }
  }

  async importComparables(req: ImportComparablesRequest): Promise<Comparable[]> {
    void req
    const result = (await this.fetch('POST', '/api/comparables/import', req)) as {
      comparables: Comparable[]
      errors: Array<{ row: number; message: string }>
    }

    if (result.errors && result.errors.length > 0) {
      log.warn(`Import warnings: ${result.errors.map(e => `Row ${e.row}: ${e.message}`).join('; ')}`)
    }

    return result.comparables
  }

  async calculateValuation(req: CalculateValuationRequest): Promise<ValuationResult | ValuationResult[]> {
    return (await this.fetch('POST', '/api/valuations', req)) as ValuationResult | ValuationResult[]
  }

  async getValuations(propertyId: string): Promise<ValuationResult[]> {
    return (await this.fetch('GET', `/api/valuations/${propertyId}`)) as ValuationResult[]
  }

  async generateReport(req: GenerateReportRequest): Promise<{ sections: unknown[]; html: string }> {
    return (await this.fetch('POST', '/api/reports', req)) as { sections: unknown[]; html: string }
  }

  async searchComparablesV1(req: V1ComparableSearchRequest): Promise<V1ComparableSearchResponse> {
    return (await this.fetch('POST', '/api/v1/comparables/search', req)) as V1ComparableSearchResponse
  }

  async overrideComparableAdjustmentV1(
    runId: string,
    req: V1AdjustmentOverrideRequest,
  ): Promise<{ runId: string; candidateId: string; adjustedPrice: number; updatedAdjustment: Record<string, number>; auditEventId: string }> {
    return (await this.fetch('POST', `/api/v1/comparables/${runId}/adjustments/override`, req)) as {
      runId: string
      candidateId: string
      adjustedPrice: number
      updatedAdjustment: Record<string, number>
      auditEventId: string
    }
  }

  async estimateValuationV1(req: V1ValuationRequest): Promise<V1ValuationResponse> {
    return (await this.fetch('POST', '/api/v1/valuations/estimate', req)) as V1ValuationResponse
  }

  async generateGroundedReportV1(req: V1ReportGenerateRequest): Promise<V1ReportGenerateResponse> {
    return (await this.fetch('POST', '/api/v1/reports/generate', req)) as V1ReportGenerateResponse
  }

  async validateReportV1(reportId: string): Promise<{ reportId: string; status: 'pass' | 'fail'; issues: Array<{ key: string; severity: 'error' | 'warning'; message: string }> }> {
    return (await this.fetch('POST', `/api/v1/reports/${reportId}/validate`)) as {
      reportId: string
      status: 'pass' | 'fail'
      issues: Array<{ key: string; severity: 'error' | 'warning'; message: string }>
    }
  }

  async finalizeReportV1(reportId: string, appraiserId: string, approvalComment: string): Promise<{ reportId: string; version: number; pdfUrl: string; signatureId: string }> {
    return (await this.fetch('POST', `/api/v1/reports/${reportId}/finalize`, {
      appraiserId,
      approvalComment,
    })) as { reportId: string; version: number; pdfUrl: string; signatureId: string }
  }

  async runIngestionV1(req: V1IngestionRunRequest): Promise<V1IngestionRunResponse> {
    return (await this.fetch('POST', '/api/v1/ingestion/run', req)) as V1IngestionRunResponse
  }

  async getIngestionRunV1(runId: string): Promise<V1IngestionRunResponse> {
    return (await this.fetch('GET', `/api/v1/ingestion/${runId}`)) as V1IngestionRunResponse
  }

  async listIngestionRunsV1(): Promise<{ count: number; runs: Array<{ runId: string; createdBy: string; createdAt: string; elapsedMs: number; summary: V1IngestionRunResponse['summary'] }> }> {
    return (await this.fetch('GET', '/api/v1/ingestion/runs')) as {
      count: number
      runs: Array<{ runId: string; createdBy: string; createdAt: string; elapsedMs: number; summary: V1IngestionRunResponse['summary'] }>
    }
  }

  async exportReport(reportId: string, format: 'html' | 'pdf' | 'docx'): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/api/reports/${reportId}/export?format=${format}`, {
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
    })

    if (!response.ok) throw new Error(`Export failed: HTTP ${response.status}`)
    return await response.blob()
  }

  async getBranding(): Promise<Record<string, unknown>> {
    return (await this.fetch('GET', '/api/branding')) as Record<string, unknown>
  }

  async updateBranding(settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    return (await this.fetch('PUT', '/api/branding', settings)) as Record<string, unknown>
  }
}

/**
 * Mock client for offline/testing.
 * Uses local calculation instead of API calls.
 */
export class MockAPIClient implements Omit<APIClient, 'fetch'> {
  async importComparables(req: ImportComparablesRequest): Promise<Comparable[]> {
    void req
    // Already handled by csvImport + comparablesImport
    throw new Error('Use parseCSV/importComparablesFromJson directly')
  }

  async calculateValuation(req: CalculateValuationRequest): Promise<ValuationResult | ValuationResult[]> {
    // Delegate to local ValuationEngine
    if (req.method === 'all') {
      // Return all three methods
      return []
    }

    // Return single method
    return {} as ValuationResult
  }

  async getValuations(_propertyId: string): Promise<ValuationResult[]> {
    void _propertyId
    return []
  }

  async generateReport(): Promise<{ sections: unknown[]; html: string }> {
    return { sections: [], html: '' }
  }

  async exportReport(): Promise<Blob> {
    return new Blob()
  }

  async getBranding(): Promise<Record<string, unknown>> {
    return {}
  }

  async updateBranding(): Promise<Record<string, unknown>> {
    return {}
  }

  async searchComparablesV1(_req: V1ComparableSearchRequest): Promise<V1ComparableSearchResponse> {
    void _req
    return { runId: 'mock-run', elapsedMs: 0, comparables: [] }
  }

  async overrideComparableAdjustmentV1(
    _runId: string,
    _req: V1AdjustmentOverrideRequest,
  ): Promise<{ runId: string; candidateId: string; adjustedPrice: number; updatedAdjustment: Record<string, number>; auditEventId: string }> {
    void _runId
    void _req
    return {
      runId: 'mock-run',
      candidateId: 'mock-candidate',
      adjustedPrice: 0,
      updatedAdjustment: {},
      auditEventId: 'mock-audit',
    }
  }

  async estimateValuationV1(_req: V1ValuationRequest): Promise<V1ValuationResponse> {
    void _req
    return {
      runId: 'mock-run',
      strategy: 'weighted-mean',
      range: { low: 0, mid: 0, high: 0 },
      confidenceScore: 0,
      comparablesUsed: 0,
      rejectedOutliers: [],
      rationale: [],
    }
  }

  async generateGroundedReportV1(_req: V1ReportGenerateRequest): Promise<V1ReportGenerateResponse> {
    void _req
    return {
      reportId: 'mock-report',
      version: 1,
      templateId: 'default-court-il',
      language: 'he',
      createdAt: new Date().toISOString(),
      runId: 'mock-run',
      sections: [],
      validations: [],
      readyForFinalApproval: false,
    }
  }

  async validateReportV1(_reportId: string): Promise<{ reportId: string; status: 'pass' | 'fail'; issues: Array<{ key: string; severity: 'error' | 'warning'; message: string }> }> {
    void _reportId
    return { reportId: 'mock-report', status: 'pass', issues: [] }
  }

  async finalizeReportV1(_reportId: string, _appraiserId: string, _approvalComment: string): Promise<{ reportId: string; version: number; pdfUrl: string; signatureId: string }> {
    void _reportId
    void _appraiserId
    void _approvalComment
    return { reportId: 'mock-report', version: 2, pdfUrl: '', signatureId: 'mock-signature' }
  }

  async runIngestionV1(_req: V1IngestionRunRequest): Promise<V1IngestionRunResponse> {
    void _req
    return {
      runId: 'mock-ingestion',
      createdBy: 'mock',
      createdAt: new Date().toISOString(),
      elapsedMs: 0,
      transactions: {
        kind: 'transaction',
        total: 0,
        cleaned: [],
        duplicates: [],
        errors: [],
        stats: { cleanCount: 0, duplicateCount: 0, errorCount: 0, avgConfidence: 0 },
      },
      listings: {
        kind: 'listing',
        total: 0,
        cleaned: [],
        duplicates: [],
        errors: [],
        stats: { cleanCount: 0, duplicateCount: 0, errorCount: 0, avgConfidence: 0 },
      },
      summary: { input: 0, cleaned: 0, duplicates: 0, errors: 0, avgConfidence: 0 },
    }
  }

  async getIngestionRunV1(_runId: string): Promise<V1IngestionRunResponse> {
    void _runId
    return this.runIngestionV1({})
  }

  async listIngestionRunsV1(): Promise<{ count: number; runs: Array<{ runId: string; createdBy: string; createdAt: string; elapsedMs: number; summary: V1IngestionRunResponse['summary'] }> }> {
    return { count: 0, runs: [] }
  }
}

/**
 * Factory to create appropriate client based on environment.
 */
export function createAPIClient(
  baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:3000',
  apiKey?: string
): APIClient {
  return new APIClient({ baseURL, apiKey })
}
