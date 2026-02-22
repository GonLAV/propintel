/**
 * ValuationAssistant — AI-guided valuation wizard.
 * ─────────────────────────────────────────────────
 * Step 1: Input property details
 * Step 2: Auto-search comparable transactions from data.gov.il
 * Step 3: Auto-calculate adjustments (size, floor, age, condition)
 * Step 4: Generate valuation with confidence score
 * Step 5: AI narrative summary + export
 */

import { useState, useCallback } from 'react'
import {
  Sparkle, MagnifyingGlass, Scales,
  CheckCircle, ArrowRight, ArrowLeft, House,
  Elevator,
  Car, SunHorizon, Warning, FileText, Copy,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import {
  fetchTransactionsFromDataGov,
  normalizeTransactions,
  type CleanTransaction,
} from '@/lib/dataGovAPI'
import { createLogger } from '@/lib/logger'

const log = createLogger('ValuationAssistant')

// ── Types ──────────────────────────────────────────────────────────
interface PropertyInput {
  city: string
  street: string
  area: number
  rooms: number
  floor: number
  totalFloors: number
  yearBuilt: number
  condition: 'new' | 'excellent' | 'good' | 'fair' | 'poor' | 'needs_renovation'
  hasParking: boolean
  hasElevator: boolean
  hasBalcony: boolean
  propertyType: 'apartment' | 'house' | 'penthouse' | 'garden_apt'
}

interface Adjustment {
  factor: string
  description: string
  percentage: number
  amount: number
}

interface ComparableResult {
  transaction: CleanTransaction
  adjustments: Adjustment[]
  adjustedPrice: number
  similarity: number // 0-1
}

interface ValuationOutput {
  estimatedValue: number
  pricePerSqm: number
  valueRange: { min: number; max: number }
  confidence: number
  comparablesUsed: number
  comparables: ComparableResult[]
  method: string
  narrative: string
}

type WizardStep = 'input' | 'searching' | 'comparables' | 'result'

const CONDITION_OPTIONS = [
  { value: 'new', label: 'חדש מהקבלן' },
  { value: 'excellent', label: 'מצוין' },
  { value: 'good', label: 'טוב' },
  { value: 'fair', label: 'סביר' },
  { value: 'poor', label: 'ישן/בלוי' },
  { value: 'needs_renovation', label: 'דורש שיפוץ' },
] as const

const CONDITION_FACTOR: Record<string, number> = {
  new: 1.10,
  excellent: 1.05,
  good: 1.00,
  fair: 0.95,
  poor: 0.88,
  needs_renovation: 0.82,
}

// ── Component ──────────────────────────────────────────────────────
export function ValuationAssistant() {
  const [step, setStep] = useState<WizardStep>('input')
  const [property, setProperty] = useState<PropertyInput>({
    city: '',
    street: '',
    area: 0,
    rooms: 0,
    floor: 0,
    totalFloors: 4,
    yearBuilt: 2000,
    condition: 'good',
    hasParking: false,
    hasElevator: false,
    hasBalcony: false,
    propertyType: 'apartment',
  })
  const [transactions, setTransactions] = useState<CleanTransaction[]>([])
  const [valuation, setValuation] = useState<ValuationOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [_loading, setLoading] = useState(false)

  const updateField = useCallback(<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) => {
    setProperty(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── Step 2: Search comparables ──────────────────────────────────
  const searchComparables = useCallback(async () => {
    if (!property.city || !property.area) {
      setError('יש להזין עיר ושטח')
      return
    }

    setStep('searching')
    setError(null)
    setLoading(true)

    try {
      const raw = await fetchTransactionsFromDataGov({
        city: property.city,
        street: property.street || undefined,
        limit: 200,
      })

      const clean = normalizeTransactions(raw)

      if (clean.length === 0) {
        // Try without street
        const rawBroad = await fetchTransactionsFromDataGov({
          city: property.city,
          limit: 300,
        })
        const cleanBroad = normalizeTransactions(rawBroad)
        setTransactions(cleanBroad)
      } else {
        setTransactions(clean)
      }

      setStep('comparables')
    } catch (err) {
      log.error('Search failed:', err)
      setError(err instanceof Error ? err.message : 'שגיאה בחיפוש עסקאות')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }, [property])

  // ── Step 3: Calculate valuation ─────────────────────────────────
  const calculateValuation = useCallback(() => {
    if (transactions.length === 0) {
      setError('אין עסקאות להשוואה')
      return
    }

    // Score each transaction by similarity
    const scored: ComparableResult[] = transactions.map(tx => {
      const adjustments: Adjustment[] = []

      // Size adjustment: ±2% per 10 sqm difference
      const sizeDiff = property.area - tx.area
      const sizeAdj = (sizeDiff / 10) * -0.02 * tx.price
      if (Math.abs(sizeAdj) > 0) {
        adjustments.push({
          factor: 'שטח',
          description: `${sizeDiff > 0 ? '+' : ''}${sizeDiff.toFixed(0)} מ"ר`,
          percentage: (sizeDiff / 10) * -2,
          amount: Math.round(sizeAdj),
        })
      }

      // Floor adjustment: ±2% per floor difference
      const floorDiff = property.floor - tx.floor
      const floorAdj = floorDiff * 0.02 * tx.price
      if (floorDiff !== 0) {
        adjustments.push({
          factor: 'קומה',
          description: `${floorDiff > 0 ? '+' : ''}${floorDiff} קומות`,
          percentage: floorDiff * 2,
          amount: Math.round(floorAdj),
        })
      }

      // Age adjustment: ±0.5% per year
      const txYear = tx.date ? parseInt(tx.date.substring(0, 4)) : 2024
      const currentYear = new Date().getFullYear()
      const ageDiff = (currentYear - property.yearBuilt) - (currentYear - txYear)
      const ageAdj = ageDiff * -0.005 * tx.price
      if (Math.abs(ageDiff) > 1) {
        adjustments.push({
          factor: 'גיל מבנה',
          description: `${Math.abs(ageDiff)} שנים ${ageDiff > 0 ? 'ישן יותר' : 'חדש יותר'}`,
          percentage: ageDiff * -0.5,
          amount: Math.round(ageAdj),
        })
      }

      // Condition adjustment
      const condFactor = CONDITION_FACTOR[property.condition] - 1.0
      const condAdj = condFactor * tx.price
      if (Math.abs(condFactor) > 0.01) {
        adjustments.push({
          factor: 'מצב',
          description: CONDITION_OPTIONS.find(o => o.value === property.condition)?.label || '',
          percentage: condFactor * 100,
          amount: Math.round(condAdj),
        })
      }

      // Parking adjustment: +3%
      if (property.hasParking) {
        adjustments.push({
          factor: 'חנייה',
          description: 'חנייה צמודה',
          percentage: 3,
          amount: Math.round(tx.price * 0.03),
        })
      }

      // Elevator adjustment: +3%
      if (property.hasElevator && property.floor > 2) {
        adjustments.push({
          factor: 'מעלית',
          description: 'מעלית בבניין',
          percentage: 3,
          amount: Math.round(tx.price * 0.03),
        })
      }

      // Balcony adjustment: +2%
      if (property.hasBalcony) {
        adjustments.push({
          factor: 'מרפסת',
          description: 'מרפסת שמש',
          percentage: 2,
          amount: Math.round(tx.price * 0.02),
        })
      }

      const totalAdj = adjustments.reduce((s, a) => s + a.amount, 0)
      const adjustedPrice = tx.price + totalAdj

      // Similarity score based on how close the comparable is
      const areaSimilarity = 1 - Math.min(Math.abs(tx.area - property.area) / property.area, 1)
      const roomSimilarity = tx.rooms ? (1 - Math.abs(tx.rooms - property.rooms) / Math.max(property.rooms, 1)) : 0.5
      const floorSimilarity = 1 - Math.min(Math.abs(tx.floor - property.floor) / 10, 1)
      const similarity = (areaSimilarity * 0.4 + roomSimilarity * 0.3 + floorSimilarity * 0.3)

      return { transaction: tx, adjustments, adjustedPrice, similarity: Math.max(0, similarity) }
    })

    // Take top 5 most similar
    scored.sort((a, b) => b.similarity - a.similarity)
    const top = scored.slice(0, 5).filter(c => c.similarity > 0.3)

    if (top.length === 0) {
      setError('לא נמצאו עסקאות דומות מספיק')
      return
    }

    // Weighted average by similarity
    const totalWeight = top.reduce((s, c) => s + c.similarity, 0)
    const weightedValue = top.reduce((s, c) => s + c.adjustedPrice * (c.similarity / totalWeight), 0)
    const estimatedValue = Math.round(weightedValue)
    const pricePerSqm = Math.round(estimatedValue / property.area)

    // Value range (±1 std dev)
    const prices = top.map(c => c.adjustedPrice)
    const mean = prices.reduce((s, p) => s + p, 0) / prices.length
    const stdDev = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length)

    // Confidence based on sample size + similarity
    const avgSimilarity = top.reduce((s, c) => s + c.similarity, 0) / top.length
    const sizeBonus = Math.min(transactions.length / 50, 1) * 0.3
    const confidence = Math.min(avgSimilarity * 0.7 + sizeBonus, 0.99)

    const narrative = generateNarrative(property, estimatedValue, pricePerSqm, top, confidence, transactions.length)

    setValuation({
      estimatedValue,
      pricePerSqm,
      valueRange: {
        min: Math.round(estimatedValue - stdDev),
        max: Math.round(estimatedValue + stdDev),
      },
      confidence,
      comparablesUsed: top.length,
      comparables: top,
      method: 'גישת ההשוואה',
      narrative,
    })
    setStep('result')
  }, [transactions, property])

  // ── UI ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="עוזר שמאות AI"
        description="הזן פרטי נכס → AI ימצא עסקאות דומות → יחשב התאמות → יפיק שומה עם רמת ביטחון"
        icon={<Sparkle size={28} weight="duotone" className="text-purple-600" />}
      />

      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        {(['input', 'searching', 'comparables', 'result'] as const).map((s, i) => {
          const labels = ['פרטי נכס', 'חיפוש', 'השוואות', 'שומה']
          const current = (['input', 'searching', 'comparables', 'result'] as const).indexOf(step)
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                i <= current
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}>
                {i < current ? <CheckCircle size={16} weight="bold" /> : i + 1}
              </div>
              <span className={cn(
                'text-xs hidden sm:inline',
                i <= current ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}>
                {labels[i]}
              </span>
              {i < 3 && <ArrowLeft size={14} className="text-muted-foreground mx-1" />}
            </div>
          )
        })}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2 text-red-700">
            <Warning size={18} />
            <span className="text-sm">{error}</span>
            <Button size="sm" variant="ghost" className="mr-auto" onClick={() => setError(null)}>✕</Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Input */}
      {step === 'input' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <House size={20} weight="duotone" />
              פרטי הנכס
            </CardTitle>
            <CardDescription>הזן את פרטי הנכס לשומה</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">עיר *</label>
                <Input
                  placeholder="תל אביב"
                  value={property.city}
                  onChange={e => updateField('city', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">רחוב</label>
                <Input
                  placeholder="דיזנגוף"
                  value={property.street}
                  onChange={e => updateField('street', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">סוג נכס</label>
                <Select value={property.propertyType} onValueChange={v => updateField('propertyType', v as PropertyInput['propertyType'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">דירה</SelectItem>
                    <SelectItem value="house">בית פרטי</SelectItem>
                    <SelectItem value="penthouse">פנטהאוז</SelectItem>
                    <SelectItem value="garden_apt">דירת גן</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">שטח (מ"ר) *</label>
                <Input
                  type="number"
                  placeholder="85"
                  value={property.area || ''}
                  onChange={e => updateField('area', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">חדרים</label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="3.5"
                  value={property.rooms || ''}
                  onChange={e => updateField('rooms', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">קומה</label>
                <Input
                  type="number"
                  placeholder="3"
                  value={property.floor || ''}
                  onChange={e => updateField('floor', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">שנת בנייה</label>
                <Input
                  type="number"
                  placeholder="2000"
                  value={property.yearBuilt || ''}
                  onChange={e => updateField('yearBuilt', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">מצב</label>
                <Select value={property.condition} onValueChange={v => updateField('condition', v as PropertyInput['condition'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={property.hasParking} onChange={e => updateField('hasParking', e.target.checked)} className="rounded" />
                <Car size={16} /> חנייה
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={property.hasElevator} onChange={e => updateField('hasElevator', e.target.checked)} className="rounded" />
                <Elevator size={16} /> מעלית
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={property.hasBalcony} onChange={e => updateField('hasBalcony', e.target.checked)} className="rounded" />
                <SunHorizon size={16} /> מרפסת
              </label>
            </div>

            <div className="flex justify-start">
              <Button size="lg" className="gap-2" onClick={searchComparables} disabled={!property.city || !property.area}>
                <MagnifyingGlass size={18} weight="bold" />
                חפש עסקאות דומות
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Searching */}
      {step === 'searching' && (
        <Card>
          <CardContent className="p-12 text-center">
            <MagnifyingGlass size={48} weight="duotone" className="text-primary animate-pulse mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">מחפש עסקאות ב-{property.city}...</h3>
            <p className="text-sm text-muted-foreground">
              מתחבר ל-data.gov.il ומנתח נתוני שוק
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Comparables */}
      {step === 'comparables' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Scales size={20} weight="duotone" />
                    עסקאות להשוואה
                  </CardTitle>
                  <CardDescription>
                    נמצאו {transactions.length} עסקאות ב-{property.city}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('input')}>
                    <ArrowRight size={16} className="ml-1" />
                    חזרה
                  </Button>
                  <Button className="gap-2" onClick={calculateValuation}>
                    <Sparkle size={16} weight="fill" />
                    חשב שומה
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {transactions.slice(0, 20).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors text-sm">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="font-mono">
                        ₪{tx.pricePerSqm.toLocaleString()}/מ"ר
                      </Badge>
                      <span className="text-muted-foreground">{tx.area} מ"ר</span>
                      <span className="text-muted-foreground">קומה {tx.floor}</span>
                      <span className="text-muted-foreground">{tx.rooms} חד'</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{tx.street} {tx.houseNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        ₪{tx.price.toLocaleString()} • {tx.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && valuation && (
        <div className="space-y-4">
          {/* Value card */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">שווי מוערך</p>
                  <p className="text-4xl font-bold text-primary font-mono">
                    ₪{valuation.estimatedValue.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ₪{valuation.pricePerSqm.toLocaleString()} למ"ר •{' '}
                    טווח: ₪{valuation.valueRange.min.toLocaleString()} – ₪{valuation.valueRange.max.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <div className={cn(
                    'text-3xl font-bold',
                    valuation.confidence >= 0.8 ? 'text-emerald-600' :
                    valuation.confidence >= 0.6 ? 'text-amber-600' : 'text-red-600',
                  )}>
                    {Math.round(valuation.confidence * 100)}%
                  </div>
                  <p className="text-xs text-muted-foreground">רמת ביטחון</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{valuation.method}</Badge>
                  <Badge variant="outline">{valuation.comparablesUsed} השוואות</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparables breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ניתוח השוואות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {valuation.comparables.map((comp, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary">#{i + 1}</Badge>
                      <span className="font-medium text-sm">
                        {comp.transaction.street} {comp.transaction.houseNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {comp.transaction.area} מ"ר • קומה {comp.transaction.floor} • {comp.transaction.date}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">₪{comp.transaction.price.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        דמיון: {Math.round(comp.similarity * 100)}%
                      </div>
                    </div>
                  </div>
                  {comp.adjustments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {comp.adjustments.map((adj, j) => (
                        <Badge
                          key={j}
                          variant="outline"
                          className={cn(
                            'text-xs',
                            adj.percentage > 0 ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200',
                          )}
                        >
                          {adj.factor}: {adj.percentage > 0 ? '+' : ''}{adj.percentage.toFixed(1)}%
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-sm text-right">
                    <span className="text-muted-foreground">מחיר מתואם: </span>
                    <span className="font-semibold font-mono">₪{comp.adjustedPrice.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Narrative */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={18} weight="duotone" />
                חוות דעת
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {valuation.narrative}
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(valuation.narrative)
                  }}
                >
                  <Copy size={14} />
                  העתק
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setStep('input'); setValuation(null) }}>
                  שומה חדשה
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Narrative Generator ────────────────────────────────────────────
function generateNarrative(
  property: PropertyInput,
  value: number,
  ppsqm: number,
  comparables: ComparableResult[],
  confidence: number,
  totalTx: number,
): string {
  const condLabel = CONDITION_OPTIONS.find(o => o.value === property.condition)?.label ?? property.condition
  const features: string[] = []
  if (property.hasParking) features.push('חנייה צמודה')
  if (property.hasElevator) features.push('מעלית')
  if (property.hasBalcony) features.push('מרפסת שמש')

  return `חוות דעת שמאית — ${property.city}, ${property.street || 'ללא רחוב'}

הנכס הנישום: ${property.propertyType === 'apartment' ? 'דירת מגורים' : property.propertyType === 'house' ? 'בית פרטי' : property.propertyType === 'penthouse' ? 'פנטהאוז' : 'דירת גן'} בשטח ${property.area} מ"ר, ${property.rooms} חדרים, קומה ${property.floor}, שנת בנייה ${property.yearBuilt}.
מצב הנכס: ${condLabel}.${features.length > 0 ? ` תכונות נוספות: ${features.join(', ')}.` : ''}

שיטת הערכה: גישת ההשוואה (Market Comparison Approach).
נבדקו ${totalTx} עסקאות מ-data.gov.il, מתוכן נבחרו ${comparables.length} עסקאות דומות ביותר.

ההתאמות שבוצעו כוללות: שטח, קומה, גיל מבנה, מצב הנכס${features.length > 0 ? ', ' + features.join(', ') : ''}.

שווי מוערך: ₪${value.toLocaleString()} (₪${ppsqm.toLocaleString()} למ"ר).
רמת ביטחון: ${Math.round(confidence * 100)}%.

הערה: חוות דעת זו הופקה באמצעות מערכת AI ומבוססת על נתוני עסקאות ממאגר data.gov.il. אין לראות בה חוות דעת שמאית רשמית ללא חתימת שמאי מקרקעין מוסמך.`
}
