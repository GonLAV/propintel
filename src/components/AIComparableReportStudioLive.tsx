import { useCallback, useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Separator } from '@/components/ui/separator'
import {
  applyAdjustments,
  type ComparableWithAdjustment,
  type PropertyFeaturePayload,
  type SubjectPropertyInput,
  valuateFromComparables,
} from '@/lib/aiComparableEngine'
import {
  buildGroundedPromptBundle,
  generateDeterministicReportDraft,
  type GroundedReportInput,
} from '@/lib/aiReportGenerator'
import { createAPIClient, type V1ReportGenerateResponse, type V1ValuationResponse } from '@/lib/apiClient'

interface AdjustmentMultipliers {
  parking: number
  renovation: number
  floor: number
}

interface PersistedRunArtifact {
  runId: string
  createdAt: string
  subjectAddress: string
  topK: number
  comparables: number
  confidenceScore?: number
}

interface PersistedReportArtifact {
  reportId: string
  runId: string
  createdAt: string
  readyForFinalApproval: boolean
  sections: number
  validations: number
}

interface SubjectPreset {
  id: string
  label: string
  payload: Partial<SubjectPropertyInput>
}

const defaultSubject: SubjectPropertyInput = {
  id: 'subject-rm-001',
  address: 'רחוב הארבעה 15',
  city: 'תל אביב-יפו',
  neighborhood: 'לב העיר',
  lat: 32.0716,
  lng: 34.7871,
  propertyType: 'apartment',
  sizeSqm: 102,
  floor: 6,
  totalFloors: 16,
  buildingAge: 18,
  conditionScore: 7,
  hasElevator: true,
  hasParking: true,
  hasBalcony: true,
  hasView: false,
  noiseLevel: 5,
  renovationState: 'renovated',
  planningPotentialScore: 4,
}

const subjectPresets: SubjectPreset[] = [
  {
    id: 'ta-classic',
    label: 'ת״א דירת 4 חד׳',
    payload: {
      address: 'רחוב הארבעה 15',
      city: 'תל אביב-יפו',
      sizeSqm: 102,
      floor: 6,
      buildingAge: 18,
      conditionScore: 7,
      renovationState: 'renovated',
    },
  },
  {
    id: 'lux-penthouse',
    label: 'פנטהאוז יוקרה',
    payload: {
      propertyType: 'penthouse',
      sizeSqm: 165,
      floor: 18,
      hasView: true,
      hasParking: true,
      conditionScore: 9,
      renovationState: 'new',
      planningPotentialScore: 6,
    },
  },
  {
    id: 'value-add',
    label: 'נכס השבחה',
    payload: {
      sizeSqm: 85,
      floor: 2,
      conditionScore: 5,
      renovationState: 'needs-renovation',
      hasView: false,
      planningPotentialScore: 8,
      noiseLevel: 6,
    },
  },
]

function buildDemoPool(subject: SubjectPropertyInput): PropertyFeaturePayload[] {
  return Array.from({ length: 28 }).map((_, i) => {
    const jitter = (seed: number, delta: number) => ((i * seed) % 11 - 5) * delta
    const salePrice = 2_650_000 + i * 45_000 + jitter(3, 18_000)

    return {
      id: `comp-${i + 1}`,
      address: `רחוב דוגמה ${i + 1}, תל אביב`,
      city: subject.city,
      neighborhood: i % 2 === 0 ? 'לב העיר' : 'הצפון הישן',
      lat: subject.lat + jitter(5, 0.0009),
      lng: subject.lng + jitter(7, 0.0009),
      propertyType: i % 6 === 0 ? 'duplex' : 'apartment',
      sizeSqm: Math.max(55, subject.sizeSqm + jitter(2, 3)),
      floor: Math.max(1, subject.floor + jitter(11, 1)),
      totalFloors: 16,
      buildingAge: Math.max(0, subject.buildingAge + jitter(13, 2)),
      conditionScore: Math.min(10, Math.max(1, subject.conditionScore + jitter(17, 0.5))),
      hasElevator: true,
      hasParking: i % 3 !== 0,
      hasBalcony: i % 4 !== 0,
      hasView: i % 5 === 0,
      noiseLevel: Math.min(10, Math.max(1, subject.noiseLevel + jitter(19, 0.8))),
      renovationState: i % 4 === 0 ? 'partial' : 'renovated',
      planningPotentialScore: Math.min(10, Math.max(0, subject.planningPotentialScore + jitter(23, 0.6))),
      saleDate: new Date(Date.now() - i * 35 * 24 * 60 * 60 * 1000).toISOString(),
      salePrice: Math.max(1_600_000, Math.round(salePrice)),
    }
  })
}

function applyMultiplierOverrides(
  comps: ComparableWithAdjustment[],
  multipliers: AdjustmentMultipliers,
): ComparableWithAdjustment[] {
  return comps.map((item) => {
    const next = {
      ...item.adjustment,
      parking: item.adjustment.parking * multipliers.parking,
      renovation: item.adjustment.renovation * multipliers.renovation,
      floor: item.adjustment.floor * multipliers.floor,
    }

    next.totalPercent =
      next.floor +
      next.elevator +
      next.renovation +
      next.balcony +
      next.parking +
      next.view +
      next.noise +
      next.size +
      next.planningPotential +
      next.mlResidual

    next.adjustedPrice = Math.round(item.comparable.salePrice * (1 + next.totalPercent))

    return {
      ...item,
      adjustment: next,
    }
  })
}

function toComparableWithAdjustment(
  apiResult: {
    comparableId: string
    similarity: number
    distanceMeters: number
    explanation: string[]
    adjustment: Record<string, number>
    adjustedPrice: number
    weight: number
  },
  poolById: Map<string, ReturnType<typeof buildDemoPool>[number]>,
): ComparableWithAdjustment | null {
  const comparable = poolById.get(apiResult.comparableId)
  if (!comparable) return null

  const floor = Number(apiResult.adjustment.floor ?? 0)
  const elevator = Number(apiResult.adjustment.elevator ?? 0)
  const renovation = Number(apiResult.adjustment.renovation ?? 0)
  const balcony = Number(apiResult.adjustment.balcony ?? 0)
  const parking = Number(apiResult.adjustment.parking ?? 0)
  const view = Number(apiResult.adjustment.view ?? 0)
  const noise = Number(apiResult.adjustment.noise ?? 0)
  const size = Number(apiResult.adjustment.size ?? 0)
  const planningPotential = Number(apiResult.adjustment.planningPotential ?? 0)
  const mlResidual = Number(apiResult.adjustment.mlResidual ?? 0)
  const totalPercent = Number(apiResult.adjustment.totalPercent ?? 0)

  return {
    comparable,
    similarity: apiResult.similarity,
    distanceMeters: apiResult.distanceMeters,
    explanation: apiResult.explanation,
    adjustment: {
      floor,
      elevator,
      renovation,
      balcony,
      parking,
      view,
      noise,
      size,
      planningPotential,
      mlResidual,
      totalPercent,
      adjustedPrice: Number(apiResult.adjustedPrice ?? Math.round(comparable.salePrice * (1 + totalPercent))),
    },
    weight: Number(apiResult.weight ?? 0),
  }
}

export function AIComparableReportStudioLive() {
  const [subject, setSubject] = useState<SubjectPropertyInput>(defaultSubject)
  const [topK, setTopK] = useState(10)
  const [isSearching, setIsSearching] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isPersistingOverrides, setIsPersistingOverrides] = useState(false)
  const [apiRunId, setApiRunId] = useState<string | null>(null)
  const [candidateMap, setCandidateMap] = useState<Record<string, string>>({})
  const [baseComparables, setBaseComparables] = useState<ComparableWithAdjustment[]>([])
  const [serverValuation, setServerValuation] = useState<V1ValuationResponse | null>(null)
  const [serverReport, setServerReport] = useState<V1ReportGenerateResponse | null>(null)
  const [approvalComment, setApprovalComment] = useState('מאושר לאחר בדיקה מקצועית')
  const [finalizeResult, setFinalizeResult] = useState<{ reportId: string; version: number; pdfUrl: string; signatureId: string } | null>(null)
  const [overridesPersistedCount, setOverridesPersistedCount] = useState(0)

  const [runHistory, setRunHistory] = useKV<PersistedRunArtifact[]>('ai-comp-run-history', [])
  const [reportHistory, setReportHistory] = useKV<PersistedReportArtifact[]>('ai-report-history', [])

  const apiBaseURL =
    (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ??
    'http://localhost:3001'

  const apiClient = useMemo(() => createAPIClient(apiBaseURL), [apiBaseURL])

  const comparablesPool = useMemo(() => buildDemoPool(subject), [subject])

  const multipliersDefault = useMemo(
    () => ({
      parking: 1,
      renovation: 1,
      floor: 1,
    }),
    [],
  )
  const [multipliers, setMultipliers] = useState<AdjustmentMultipliers>(multipliersDefault)

  const adjustedComparables = useMemo(
    () => applyMultiplierOverrides(baseComparables, multipliers),
    [baseComparables, multipliers],
  )

  const valuation = useMemo(
    () => valuateFromComparables(adjustedComparables, 'weighted-mean'),
    [adjustedComparables],
  )

  const reportInput: GroundedReportInput | null = useMemo(() => {
    if (adjustedComparables.length === 0) return null

    return {
      property: {
        id: subject.id,
        address: subject.address,
        city: subject.city,
        propertyType: subject.propertyType,
        areaSqm: subject.sizeSqm,
        floor: subject.floor,
      },
      comparables: adjustedComparables.slice(0, 10).map((c) => ({
        id: c.comparable.id,
        address: c.comparable.address,
        similarity: c.similarity,
        distanceMeters: c.distanceMeters,
        saleDate: c.comparable.saleDate,
        salePrice: c.comparable.salePrice,
        adjustedPrice: c.adjustment.adjustedPrice,
        adjustmentBreakdown: {
          floor: c.adjustment.floor,
          parking: c.adjustment.parking,
          renovation: c.adjustment.renovation,
          total: c.adjustment.totalPercent,
        },
        explanation: c.explanation,
      })),
      documentFacts: [
        {
          sourceDocumentId: 'doc-permit-1',
          sourceType: 'permit',
          factKey: 'building_permit_status',
          factValue: 'valid',
          confidence: 0.97,
        },
      ],
      imageEvidence: [
        {
          imageId: 'img-1',
          conditionScore: subject.conditionScore,
          renovationLevel: subject.renovationState === 'renovated' ? 'high' : 'medium',
          detectedIssues: ['minor cracks'],
          evidenceText: 'Wall cracks observed near living room window.',
        },
      ],
      valuationRange: valuation.range,
      confidenceScore: valuation.confidenceScore,
      template: {
        templateId: 'default-court-il',
        language: 'he',
        mandatorySections: ['subject', 'comparables-analysis', 'valuation-conclusion', 'legal-risks'],
        optionalSections: ['condition-evidence'],
        tone: 'formal',
      },
    }
  }, [adjustedComparables, subject, valuation])

  const localReportDraft = useMemo(
    () => (reportInput ? generateDeterministicReportDraft(reportInput) : null),
    [reportInput],
  )

  const promptBundle = useMemo(
    () => (reportInput ? buildGroundedPromptBundle(reportInput) : null),
    [reportInput],
  )

  const handleSearch = useCallback(async () => {
    setIsSearching(true)
    setServerReport(null)
    setFinalizeResult(null)

    try {
      const response = await apiClient.searchComparablesV1({
        subject,
        comparablesPool,
        topK,
        requestedBy: 'studio-user',
      })

      const poolById = new Map(comparablesPool.map((x) => [x.id, x]))
      const mapped = response.comparables
        .map((item) => toComparableWithAdjustment(item, poolById))
        .filter((x): x is ComparableWithAdjustment => x !== null)

      setBaseComparables(mapped)
      setApiRunId(response.runId)
      setMultipliers(multipliersDefault)
      setOverridesPersistedCount(0)
      setCandidateMap(
        Object.fromEntries(response.comparables.map((x) => [x.comparableId, x.candidateId])),
      )

      const valuationResponse = await apiClient.estimateValuationV1({
        runId: response.runId,
        strategy: 'weighted-mean',
      })
      setServerValuation(valuationResponse)

      setRunHistory((prev) => [
        {
          runId: response.runId,
          createdAt: new Date().toISOString(),
          subjectAddress: subject.address,
          topK,
          comparables: mapped.length,
          confidenceScore: valuationResponse.confidenceScore,
        },
        ...(prev ?? []),
      ].slice(0, 40))

      toast.success('Comparable run completed via backend API')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed'
      toast.error(`Backend search failed: ${message}`)

      // Fallback to local engine so workflow can continue
      const localMapped = comparablesPool
        .slice(0, topK)
        .map((comp) => {
          const sim = 1 - Math.min(1, Math.abs(comp.sizeSqm - subject.sizeSqm) / 120)
          return applyAdjustments(subject, {
            comparable: comp,
            similarity: sim,
            distanceMeters: 300,
            explanation: ['Local fallback result'],
          })
        })

      setBaseComparables(localMapped)
      setApiRunId(null)
      setServerValuation(null)
    } finally {
      setIsSearching(false)
    }
  }, [apiClient, comparablesPool, multipliersDefault, setRunHistory, subject, topK])

  const handlePersistOverrides = useCallback(async () => {
    if (!apiRunId) {
      toast.error('No backend runId available. Run backend search first.')
      return
    }

    setIsPersistingOverrides(true)
    try {
      const subset = adjustedComparables.slice(0, 5)
      const calls = subset
        .map((x) => {
          const candidateId = candidateMap[x.comparable.id]
          if (!candidateId) return null
          return apiClient.overrideComparableAdjustmentV1(apiRunId, {
            candidateId,
            appraiserId: 'appraiser-demo',
            reason: 'Interactive slider override from studio',
            patch: {
              floor: x.adjustment.floor,
              parking: x.adjustment.parking,
              renovation: x.adjustment.renovation,
            },
          })
        })
        .filter((x): x is ReturnType<typeof apiClient.overrideComparableAdjustmentV1> => x !== null)

      const results = await Promise.all(calls)
      setOverridesPersistedCount(results.length)
      toast.success(`Saved ${results.length} overrides with audit trail`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Override persistence failed')
    } finally {
      setIsPersistingOverrides(false)
    }
  }, [adjustedComparables, apiClient, apiRunId, candidateMap])

  const handleGenerateReport = useCallback(async () => {
    if (!apiRunId || !reportInput) {
      toast.error('Run backend comparable search first')
      return
    }

    setIsGeneratingReport(true)
    try {
      const generated = await apiClient.generateGroundedReportV1({
        subjectProperty: reportInput.property,
        runId: apiRunId,
        templateId: 'default-court-il',
        language: 'he',
        documentFacts: reportInput.documentFacts,
        imageEvidence: reportInput.imageEvidence,
      })

      setServerReport(generated)
      setReportHistory((prev) => [
        {
          reportId: generated.reportId,
          runId: generated.runId,
          createdAt: generated.createdAt,
          readyForFinalApproval: generated.readyForFinalApproval,
          sections: generated.sections.length,
          validations: generated.validations.length,
        },
        ...(prev ?? []),
      ].slice(0, 40))

      const validation = await apiClient.validateReportV1(generated.reportId)
      if (validation.status === 'pass') {
        toast.success('Report generated and validated')
      } else {
        toast.warning('Report generated. Validation issues require review')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Report generation failed')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [apiClient, apiRunId, reportInput, setReportHistory])

  const handleFinalizeReport = useCallback(async () => {
    if (!serverReport) {
      toast.error('Generate report first')
      return
    }

    try {
      const finalized = await apiClient.finalizeReportV1(serverReport.reportId, 'appraiser-demo', approvalComment)
      setFinalizeResult(finalized)
      toast.success('Report finalized with signature metadata')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Finalize failed')
    }
  }, [apiClient, approvalComment, serverReport])

  const reportSections = serverReport?.sections ?? localReportDraft?.sections ?? []
  const reportValidations = serverReport?.validations ?? localReportDraft?.validations ?? []
  const isReadyForApproval =
    serverReport?.readyForFinalApproval ?? localReportDraft?.readyForFinalApproval ?? false
  const hasValidationErrors = reportValidations.some((x) => x.severity === 'error')

  const workflowSteps = [
    {
      id: 'search',
      label: 'מציאת קומפרבלים',
      done: adjustedComparables.length > 0,
      hint: adjustedComparables.length > 0 ? `${adjustedComparables.length} נמצאו` : 'טרם בוצע חיפוש',
    },
    {
      id: 'adjust',
      label: 'התאמות שמאי',
      done: overridesPersistedCount > 0,
      hint: overridesPersistedCount > 0 ? `${overridesPersistedCount} נשמרו` : 'טרם נשמרו overrides',
    },
    {
      id: 'report',
      label: 'הפקת דוח',
      done: Boolean(reportSections.length),
      hint: reportSections.length ? `${reportSections.length} סעיפים` : 'טרם הופק דוח',
    },
    {
      id: 'finalize',
      label: 'חתימה וסגירה',
      done: Boolean(finalizeResult),
      hint: finalizeResult ? `גרסה ${finalizeResult.version}` : 'ממתין לאישור',
    },
  ]

  const recentRuns = (runHistory ?? []).slice(0, 3)
  const recentReports = (reportHistory ?? []).slice(0, 3)

  const applyPreset = useCallback((preset: SubjectPreset) => {
    setSubject((prev) => ({ ...prev, ...preset.payload }))
    toast.success(`Preset loaded: ${preset.label}`)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Comparable + Report Studio (Live)"
        description="Backend-connected comparable search, adjustment persistence, instant valuation updates, and grounded report generation"
      />

      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
          <CardDescription>מה השמאי כבר סיים ומה נשאר לפני דוח חתום</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {workflowSteps.map((step) => (
            <div key={step.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{step.label}</div>
                <Badge variant={step.done ? 'success' : 'outline'}>{step.done ? 'בוצע' : 'ממתין'}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{step.hint}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>API base URL: {apiBaseURL}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant={apiRunId ? 'success' : 'outline'}>
            {apiRunId ? `Live Run: ${apiRunId}` : 'No active backend run'}
          </Badge>
          <Badge variant="outline">Saved runs: {(runHistory ?? []).length}</Badge>
          <Badge variant="outline">Saved reports: {(reportHistory ?? []).length}</Badge>
          {serverValuation && <Badge variant="secondary">Server confidence: {serverValuation.confidenceScore}%</Badge>}
          {serverValuation && (
            <Badge variant="outline">פער אמצע: ₪{Math.abs(serverValuation.range.mid - valuation.range.mid).toLocaleString('he-IL')}</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>One-click Comparable Search</CardTitle>
          <CardDescription>Live backend API call + artifact persistence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {subjectPresets.map((preset) => (
              <Button key={preset.id} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset)}>
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Address</div>
              <Input
                value={subject.address}
                placeholder="למשל: ארלוזורוב 28"
                onChange={(e) => setSubject((p) => ({ ...p, address: e.target.value }))}
                aria-label="subject-address"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Size (sqm)</div>
              <Input
                type="number"
                value={subject.sizeSqm}
                min={20}
                onChange={(e) => setSubject((p) => ({ ...p, sizeSqm: Number(e.target.value || 0) }))}
                aria-label="subject-size"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Floor</div>
              <Input
                type="number"
                value={subject.floor}
                min={0}
                onChange={(e) => setSubject((p) => ({ ...p, floor: Number(e.target.value || 0) }))}
                aria-label="subject-floor"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Top-K</div>
              <Input
                type="number"
                value={topK}
                onChange={(e) => setTopK(Math.max(3, Math.min(25, Number(e.target.value || 10))))}
                aria-label="top-k"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search Comparables (Live API)'}
            </Button>
            <Button
              variant="outline"
              onClick={handlePersistOverrides}
              disabled={isPersistingOverrides || !apiRunId || adjustedComparables.length === 0}
            >
              {isPersistingOverrides ? 'Saving...' : 'Persist Top Overrides'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            טיפ: לאחר חיפוש, עדכן סליידרים ולחץ Persist כדי לשמור trace מלא של שיקול דעת השמאי.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Adjustment Sliders</CardTitle>
          <CardDescription>Instant recalculation on client + backend override persistence option</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SliderRow
            label={`Parking x${multipliers.parking.toFixed(2)}`}
            value={multipliers.parking}
            onChange={(v) => setMultipliers((m) => ({ ...m, parking: v }))}
          />
          <SliderRow
            label={`Renovation x${multipliers.renovation.toFixed(2)}`}
            value={multipliers.renovation}
            onChange={(v) => setMultipliers((m) => ({ ...m, renovation: v }))}
          />
          <SliderRow
            label={`Floor x${multipliers.floor.toFixed(2)}`}
            value={multipliers.floor}
            onChange={(v) => setMultipliers((m) => ({ ...m, floor: v }))}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMultipliers(multipliersDefault)}
            >
              Reset sliders
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valuation Range + Confidence</CardTitle>
          <CardDescription>Local instant range + server baseline confidence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Low: ₪{valuation.range.low.toLocaleString('he-IL')}</Badge>
            <Badge variant="secondary">Mid: ₪{valuation.range.mid.toLocaleString('he-IL')}</Badge>
            <Badge variant="success">High: ₪{valuation.range.high.toLocaleString('he-IL')}</Badge>
            <Badge>Confidence: {valuation.confidenceScore}%</Badge>
            <Badge variant="outline">Comparables used: {valuation.comparablesUsed}</Badge>
            {serverValuation && (
              <Badge variant="outline">Server baseline mid: ₪{serverValuation.range.mid.toLocaleString('he-IL')}</Badge>
            )}
          </div>

          {adjustedComparables.slice(0, 6).map((c) => (
            <div key={c.comparable.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{c.comparable.address}</div>
                <Badge variant={c.similarity >= 0.8 ? 'success' : c.similarity >= 0.65 ? 'secondary' : 'outline'}>
                  {(c.similarity * 100).toFixed(1)}% דמיון
                </Badge>
              </div>
              <div className="text-muted-foreground">
                sim {(c.similarity * 100).toFixed(1)}% · dist {Math.round(c.distanceMeters)}m · adjusted ₪{c.adjustment.adjustedPrice.toLocaleString('he-IL')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{c.explanation.join(' • ')}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grounded Report Draft</CardTitle>
          <CardDescription>Live API generation + validation + finalization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport || !apiRunId || !reportInput}>
              {isGeneratingReport ? 'Generating...' : 'Generate Report (Live API)'}
            </Button>
            <Button
              variant="outline"
              onClick={handleFinalizeReport}
              disabled={!serverReport || !isReadyForApproval}
            >
              Finalize & Sign
            </Button>
            {serverReport && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(serverReport.reportId)
                    toast.success('Report ID copied')
                  } catch {
                    toast.error('Could not copy report ID')
                  }
                }}
              >
                Copy Report ID
              </Button>
            )}
          </div>

          <div>
            <div className="mb-1 text-xs text-muted-foreground">Finalization comment</div>
            <Input value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} aria-label="finalization-comment" />
          </div>

          {reportSections.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={isReadyForApproval ? 'success' : 'destructive'}>
                  {isReadyForApproval ? 'Ready for appraiser approval' : 'Validation required'}
                </Badge>
                <Badge variant="outline">Sections: {reportSections.length}</Badge>
                <Badge variant="outline">Validations: {reportValidations.length}</Badge>
                <Badge variant="outline">Source: {serverReport ? 'Backend API' : 'Local deterministic fallback'}</Badge>
                {hasValidationErrors && <Badge variant="destructive">יש שגיאות שחוסמות חתימה</Badge>}
              </div>

              {reportValidations.length > 0 && (
                <div className="rounded-md border p-3">
                  <div className="mb-2 text-sm font-medium">Validation issues</div>
                  <div className="space-y-2">
                    {reportValidations.map((issue) => (
                      <div key={`${issue.key}-${issue.message}`} className="flex items-start justify-between gap-2 rounded-md border p-2">
                        <div>
                          <div className="text-xs font-medium">{issue.key}</div>
                          <div className="text-xs text-muted-foreground">{issue.message}</div>
                        </div>
                        <Badge variant={issue.severity === 'error' ? 'destructive' : 'outline'}>{issue.severity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                {reportSections.map((s) => (
                  <div key={s.sectionId} className="rounded-md border p-3">
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{s.markdown}</div>
                  </div>
                ))}
              </div>

              {finalizeResult && (
                <div className="rounded-md border p-3 text-xs text-muted-foreground">
                  Finalized report: {finalizeResult.reportId}, version {finalizeResult.version}, signature {finalizeResult.signatureId}
                  {finalizeResult.pdfUrl && (
                    <div className="mt-1">
                      <a className="text-primary underline-offset-4 hover:underline" href={finalizeResult.pdfUrl} target="_blank" rel="noreferrer">
                        Open finalized PDF
                      </a>
                    </div>
                  )}
                </div>
              )}

              {promptBundle && (
                <div className="rounded-md border p-3 text-xs text-muted-foreground">
                  Prompt guardrails enabled. JSON schema + grounded fact table included.
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Run backend search and generate report to view output.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>שקיפות מלאה לריצות וחומרי דוח אחרונים</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Runs</div>
            <div className="space-y-2 text-xs">
              {recentRuns.length === 0 ? (
                <div className="text-muted-foreground">אין ריצות שמורות עדיין</div>
              ) : (
                recentRuns.map((run) => (
                  <div key={run.runId} className="rounded-md border p-2">
                    <div className="font-medium">{run.subjectAddress}</div>
                    <div className="text-muted-foreground">{run.runId}</div>
                    <div className="text-muted-foreground">TopK {run.topK} · comps {run.comparables} · conf {run.confidenceScore ?? '—'}%</div>
                    <div className="text-muted-foreground">{new Date(run.createdAt).toLocaleString('he-IL')}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Reports</div>
            <div className="space-y-2 text-xs">
              {recentReports.length === 0 ? (
                <div className="text-muted-foreground">אין דוחות שמורים עדיין</div>
              ) : (
                recentReports.map((report) => (
                  <div key={report.reportId} className="rounded-md border p-2">
                    <div className="font-medium">{report.reportId}</div>
                    <div className="text-muted-foreground">run {report.runId}</div>
                    <div className="text-muted-foreground">sections {report.sections} · validations {report.validations}</div>
                    <div className="mt-1">
                      <Badge variant={report.readyForFinalApproval ? 'success' : 'outline'}>
                        {report.readyForFinalApproval ? 'ready' : 'needs review'}
                      </Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">{new Date(report.createdAt).toLocaleString('he-IL')}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{label}</div>
      <Slider
        value={[value]}
        min={0.5}
        max={1.5}
        step={0.01}
        onValueChange={(vals) => onChange(vals[0] ?? 1)}
        aria-label={label}
      />
    </div>
  )
}
