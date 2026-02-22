import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import {
  applyAdjustments,
  searchTopComparables,
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

interface AdjustmentMultipliers {
  parking: number
  renovation: number
  floor: number
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

export function AIComparableReportStudio() {
  const [subject, setSubject] = useState<SubjectPropertyInput>(defaultSubject)
  const [topK, setTopK] = useState(10)
  const [hasSearched, setHasSearched] = useState(false)
  const [multipliers, setMultipliers] = useState<AdjustmentMultipliers>({
    parking: 1,
    renovation: 1,
    floor: 1,
  })

  const comparablesPool = useMemo(() => buildDemoPool(subject), [subject])

  const initialAdjusted = useMemo(() => {
    if (!hasSearched) return [] as ComparableWithAdjustment[]

    const ranked = searchTopComparables({
      subject,
      comparablesPool,
      topK,
    })

    return ranked.map((x) => applyAdjustments(subject, x))
  }, [subject, comparablesPool, topK, hasSearched])

  const adjustedComparables = useMemo(
    () => applyMultiplierOverrides(initialAdjusted, multipliers),
    [initialAdjusted, multipliers],
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

  const reportDraft = useMemo(
    () => (reportInput ? generateDeterministicReportDraft(reportInput) : null),
    [reportInput],
  )

  const promptBundle = useMemo(
    () => (reportInput ? buildGroundedPromptBundle(reportInput) : null),
    [reportInput],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Comparable + Report Studio"
        description="השוואות חכמות, התאמות אינטראקטיביות ועדכון שווי מיידי + טיוטת דוח מבוססת עובדות"
      />

      <Card>
        <CardHeader>
          <CardTitle>One-click Comparable Search</CardTitle>
          <CardDescription>שנה פרמטרים בסיסיים והפעל חיפוש עסקאות השוואה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Address</div>
              <Input
                value={subject.address}
                onChange={(e) => setSubject((p) => ({ ...p, address: e.target.value }))}
                aria-label="subject-address"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Size (sqm)</div>
              <Input
                type="number"
                value={subject.sizeSqm}
                onChange={(e) => setSubject((p) => ({ ...p, sizeSqm: Number(e.target.value || 0) }))}
                aria-label="subject-size"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Floor</div>
              <Input
                type="number"
                value={subject.floor}
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

          <Button onClick={() => setHasSearched(true)}>Search Comparables</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Adjustment Sliders</CardTitle>
          <CardDescription>שינוי משקל התאמות עם עדכון שווי מיידי</CardDescription>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valuation Range + Confidence</CardTitle>
          <CardDescription>מבוסס השוואות מתוקננות אחרי סינון חריגים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Low: ₪{valuation.range.low.toLocaleString('he-IL')}</Badge>
            <Badge variant="secondary">Mid: ₪{valuation.range.mid.toLocaleString('he-IL')}</Badge>
            <Badge variant="success">High: ₪{valuation.range.high.toLocaleString('he-IL')}</Badge>
            <Badge>Confidence: {valuation.confidenceScore}%</Badge>
            <Badge variant="outline">Comparables used: {valuation.comparablesUsed}</Badge>
          </div>

          {adjustedComparables.slice(0, 6).map((c) => (
            <div key={c.comparable.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{c.comparable.address}</div>
              <div className="text-muted-foreground">
                sim {(c.similarity * 100).toFixed(1)}% · dist {Math.round(c.distanceMeters)}m · adjusted ₪{c.adjustment.adjustedPrice.toLocaleString('he-IL')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {c.explanation.join(' • ')}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grounded Report Draft</CardTitle>
          <CardDescription>טיוטה מובנית לדוח שמאות (מבוסס נתונים בלבד)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reportDraft ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={reportDraft.readyForFinalApproval ? 'success' : 'destructive'}>
                  {reportDraft.readyForFinalApproval ? 'Ready for appraiser approval' : 'Validation required'}
                </Badge>
                <Badge variant="outline">Sections: {reportDraft.sections.length}</Badge>
                <Badge variant="outline">Validations: {reportDraft.validations.length}</Badge>
              </div>

              <div className="space-y-2">
                {reportDraft.sections.map((s) => (
                  <div key={s.sectionId} className="rounded-md border p-3">
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{s.markdown}</div>
                  </div>
                ))}
              </div>

              {promptBundle && (
                <div className="rounded-md border p-3 text-xs text-muted-foreground">
                  Prompt guardrails enabled. JSON schema + grounded fact table included.
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Run comparable search to generate a grounded report draft.</div>
          )}
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
