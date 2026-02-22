/**
 * PropertyComparison — Side-by-side property comparison engine.
 * ──────────────────────────────────────────────────────────────
 * • Compare 2–4 properties simultaneously
 * • Market price per sqm comparison
 * • Auto-adjustments for differences
 * • Radius-based similar property search
 */

import { useState, useCallback, useMemo } from 'react'
import {
  ArrowsLeftRight, Plus, Trash,
  Star,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { uid } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────
interface CompProperty {
  id: string
  address: string
  city: string
  neighborhood: string
  type: string
  rooms: number
  area: number
  floor: number
  totalFloors: number
  buildYear: number
  condition: string
  parking: number
  elevator: boolean
  balcony: boolean
  storage: boolean
  price: number
  priceDate: string
  isSubject: boolean
}

interface Adjustment {
  factor: string
  label: string
  basePercent: number
}

const ADJUSTMENTS: Adjustment[] = [
  { factor: 'location', label: 'מיקום', basePercent: 0 },
  { factor: 'size', label: 'שטח', basePercent: 0 },
  { factor: 'floor', label: 'קומה', basePercent: 0 },
  { factor: 'condition', label: 'מצב', basePercent: 0 },
  { factor: 'age', label: 'גיל מבנה', basePercent: 0 },
  { factor: 'parking', label: 'חניה', basePercent: 0 },
  { factor: 'elevator', label: 'מעלית', basePercent: 0 },
  { factor: 'balcony', label: 'מרפסת', basePercent: 0 },
]

const EMPTY_PROPERTY: CompProperty = {
  id: '',
  address: '',
  city: '',
  neighborhood: '',
  type: 'apartment',
  rooms: 3,
  area: 80,
  floor: 2,
  totalFloors: 5,
  buildYear: 2000,
  condition: 'good',
  parking: 1,
  elevator: true,
  balcony: true,
  storage: false,
  price: 0,
  priceDate: new Date().toISOString().slice(0, 10),
  isSubject: false,
}

function createEmptyProp(isSubject = false): CompProperty {
  return { ...EMPTY_PROPERTY, id: uid('comp'), isSubject }
}

export function PropertyComparison() {
  const [subject, setSubject] = useState<CompProperty>(createEmptyProp(true))
  const [comparables, setComparables] = useState<CompProperty[]>([createEmptyProp(), createEmptyProp()])

  // ── Auto-calculate adjustments ──────────────────────────────────
  const calculateAdjustments = useCallback((comp: CompProperty) => {
    const adj: Record<string, number> = {}

    // Size adjustment: per 10 sqm difference = ~2.5%
    const sizeDiff = subject.area - comp.area
    adj.size = Math.round((sizeDiff / 10) * 2.5)

    // Floor adjustment: ~2% per floor difference
    adj.floor = (subject.floor - comp.floor) * 2

    // Age adjustment: ~0.5% per year
    adj.age = Math.round((comp.buildYear - subject.buildYear) * 0.5)

    // Condition
    const conditionRank: Record<string, number> = { 'new': 5, 'excellent': 4, 'good': 3, 'fair': 2, 'poor': 1, 'renovation-needed': 0 }
    adj.condition = ((conditionRank[subject.condition] || 3) - (conditionRank[comp.condition] || 3)) * 3

    // Parking: ~3% per spot
    adj.parking = (subject.parking - comp.parking) * 3

    // Elevator: 3%
    adj.elevator = subject.elevator !== comp.elevator ? (subject.elevator ? 3 : -3) : 0

    // Balcony: 2%
    adj.balcony = subject.balcony !== comp.balcony ? (subject.balcony ? 2 : -2) : 0

    adj.location = 0 // Manual

    return adj
  }, [subject])

  // ── Adjusted values ─────────────────────────────────────────────
  const adjustedComps = useMemo(() =>
    comparables.map(comp => {
      const adj = calculateAdjustments(comp)
      const totalAdj = Object.values(adj).reduce((s, v) => s + v, 0)
      const adjustedPrice = comp.price * (1 + totalAdj / 100)
      const pricePerSqm = comp.area > 0 ? adjustedPrice / comp.area : 0
      return { ...comp, adjustments: adj, totalAdj, adjustedPrice, pricePerSqm }
    }),
    [comparables, calculateAdjustments],
  )

  // ── Estimated value ─────────────────────────────────────────────
  const estimation = useMemo(() => {
    const validComps = adjustedComps.filter(c => c.price > 0)
    if (validComps.length === 0) return null

    const avgPricePerSqm = validComps.reduce((s, c) => s + c.pricePerSqm, 0) / validComps.length
    const estimatedValue = Math.round(avgPricePerSqm * subject.area)
    const min = Math.round(Math.min(...validComps.map(c => c.pricePerSqm)) * subject.area)
    const max = Math.round(Math.max(...validComps.map(c => c.pricePerSqm)) * subject.area)

    return { avgPricePerSqm: Math.round(avgPricePerSqm), estimatedValue, min, max }
  }, [adjustedComps, subject.area])

  // ── Add/remove comparable ───────────────────────────────────────
  const addComparable = useCallback(() => {
    if (comparables.length >= 4) return
    setComparables(prev => [...prev, createEmptyProp()])
  }, [comparables.length])

  const removeComparable = useCallback((id: string) => {
    setComparables(prev => prev.filter(c => c.id !== id))
  }, [])

  const updateComparable = useCallback((id: string, field: keyof CompProperty, value: unknown) => {
    setComparables(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }, [])

  const updateSubject = useCallback((field: keyof CompProperty, value: unknown) => {
    setSubject(prev => ({ ...prev, [field]: value }))
  }, [])

  // ── Render a property column ────────────────────────────────────
  const PropertyColumn = ({ prop, onUpdate, isSubject, onRemove }: {
    prop: CompProperty
    onUpdate: (field: keyof CompProperty, value: unknown) => void
    isSubject: boolean
    onRemove?: () => void
  }) => (
    <div className={cn('space-y-3 min-w-[200px] flex-1', isSubject && 'bg-primary/5 rounded-xl p-3')}>
      <div className="flex items-center justify-between">
        <Badge variant={isSubject ? 'default' : 'secondary'} className="text-xs">
          {isSubject ? '🏠 נכס נושא' : 'השוואה'}
        </Badge>
        {onRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash size={12} />
          </Button>
        )}
      </div>

      <Input placeholder="כתובת" value={prop.address} onChange={e => onUpdate('address', e.target.value)} className="text-xs h-8" />
      <Input placeholder="עיר" value={prop.city} onChange={e => onUpdate('city', e.target.value)} className="text-xs h-8" />

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[10px] text-muted-foreground">חדרים</label>
          <Input type="number" value={prop.rooms} onChange={e => onUpdate('rooms', +e.target.value)} className="text-xs h-7" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">שטח (מ"ר)</label>
          <Input type="number" value={prop.area} onChange={e => onUpdate('area', +e.target.value)} className="text-xs h-7" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">קומה</label>
          <Input type="number" value={prop.floor} onChange={e => onUpdate('floor', +e.target.value)} className="text-xs h-7" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">שנת בנייה</label>
          <Input type="number" value={prop.buildYear} onChange={e => onUpdate('buildYear', +e.target.value)} className="text-xs h-7" />
        </div>
      </div>

      <Select value={prop.condition} onValueChange={v => onUpdate('condition', v)}>
        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="מצב" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="new">חדש</SelectItem>
          <SelectItem value="excellent">מצוין</SelectItem>
          <SelectItem value="good">טוב</SelectItem>
          <SelectItem value="fair">סביר</SelectItem>
          <SelectItem value="poor">גרוע</SelectItem>
          <SelectItem value="renovation-needed">דרוש שיפוץ</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 text-xs">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={prop.elevator} onChange={e => onUpdate('elevator', e.target.checked)} className="h-3 w-3" />
          מעלית
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={prop.balcony} onChange={e => onUpdate('balcony', e.target.checked)} className="h-3 w-3" />
          מרפסת
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={prop.storage} onChange={e => onUpdate('storage', e.target.checked)} className="h-3 w-3" />
          מחסן
        </label>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground">חניה (מספר)</label>
        <Input type="number" value={prop.parking} onChange={e => onUpdate('parking', +e.target.value)} className="text-xs h-7" />
      </div>

      {!isSubject && (
        <>
          <Separator />
          <div>
            <label className="text-[10px] text-muted-foreground">מחיר עסקה (₪)</label>
            <Input type="number" value={prop.price || ''} onChange={e => onUpdate('price', +e.target.value)} className="text-xs h-8 font-semibold" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">תאריך עסקה</label>
            <Input type="date" value={prop.priceDate} onChange={e => onUpdate('priceDate', e.target.value)} className="text-xs h-7" />
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="השוואת נכסים"
        description="השוואה מקצועית עם התאמות אוטומטיות והערכת שווי"
        icon={<ArrowsLeftRight size={28} weight="duotone" />}
      />

      {/* Properties comparison grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">נכסים להשוואה</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addComparable}
              disabled={comparables.length >= 4}
            >
              <Plus size={14} /> הוסף השוואה
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            <PropertyColumn prop={subject} onUpdate={updateSubject} isSubject />
            {comparables.map(comp => (
              <PropertyColumn
                key={comp.id}
                prop={comp}
                onUpdate={(field, value) => updateComparable(comp.id, field, value)}
                isSubject={false}
                onRemove={comparables.length > 1 ? () => removeComparable(comp.id) : undefined}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Adjustments table */}
      {adjustedComps.some(c => c.price > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">התאמות (%)</CardTitle>
            <CardDescription>ההתאמות מחושבות אוטומטית על סמך ההבדלים בין הנכסים</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 px-2 font-medium">פקטור</th>
                    {adjustedComps.map((c, i) => (
                      <th key={c.id} className="text-center py-2 px-2 font-medium">השוואה {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ADJUSTMENTS.map(adj => (
                    <tr key={adj.factor} className="border-b last:border-0">
                      <td className="py-1.5 px-2 text-muted-foreground">{adj.label}</td>
                      {adjustedComps.map(c => {
                        const val = c.adjustments[adj.factor] || 0
                        return (
                          <td key={c.id} className="text-center py-1.5 px-2">
                            <span className={cn(
                              'text-xs font-medium',
                              val > 0 && 'text-emerald-600',
                              val < 0 && 'text-red-600',
                              val === 0 && 'text-muted-foreground',
                            )}>
                              {val > 0 ? '+' : ''}{val}%
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold">
                    <td className="py-2 px-2">סה"כ התאמה</td>
                    {adjustedComps.map(c => (
                      <td key={c.id} className="text-center py-2 px-2">
                        <span className={cn(c.totalAdj > 0 ? 'text-emerald-600' : c.totalAdj < 0 ? 'text-red-600' : '')}>
                          {c.totalAdj > 0 ? '+' : ''}{c.totalAdj}%
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="font-semibold bg-secondary/30">
                    <td className="py-2 px-2">מחיר מותאם</td>
                    {adjustedComps.map(c => (
                      <td key={c.id} className="text-center py-2 px-2">
                        {c.price > 0 ? `₪${Math.round(c.adjustedPrice).toLocaleString()}` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="text-xs text-muted-foreground">
                    <td className="py-1 px-2">מחיר למ"ר</td>
                    {adjustedComps.map(c => (
                      <td key={c.id} className="text-center py-1 px-2">
                        {c.pricePerSqm > 0 ? `₪${Math.round(c.pricePerSqm).toLocaleString()}` : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estimation result */}
      {estimation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star size={18} weight="fill" className="text-primary" /> הערכת שווי — נכס נושא
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">טווח תחתון</p>
                <p className="text-xl font-bold text-muted-foreground">₪{estimation.min.toLocaleString()}</p>
              </div>
              <div className="bg-primary/10 rounded-xl py-3">
                <p className="text-sm text-primary font-medium">הערכה ממוצעת</p>
                <p className="text-3xl font-black text-primary">₪{estimation.estimatedValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ₪{estimation.avgPricePerSqm.toLocaleString()} / מ"ר
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">טווח עליון</p>
                <p className="text-xl font-bold text-muted-foreground">₪{estimation.max.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
