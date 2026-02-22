import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Calculator, 
  MapPin, 
  Calendar, 
  ChartBar,
  Plus,
  Trash,
  TrendUp,
  TrendDown,
  ListNumbers
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Comparable {
  id: string
  address: string
  price: number
  area: number
  pricePerSqm: number
  distanceKm: number
  similarity: number
  reliability: number
  monthsOld: number
  weight: number
  enabled: boolean
}

interface WeightedCalculation {
  comparables: Comparable[]
  weightedAverage: number
  median: number
  min: number
  max: number
  standardDeviation: number
  coefficientOfVariation: number
  recommendedRange: { min: number; max: number }
}

export function InteractiveWeightedCalculator() {
  const [comparables, setComparables] = useState<Comparable[]>([
    {
      id: '1',
      address: 'רחוב הרצל 45',
      price: 2100000,
      area: 105,
      pricePerSqm: 20000,
      distanceKm: 0.2,
      similarity: 0.95,
      reliability: 0.9,
      monthsOld: 2,
      weight: 0,
      enabled: true
    },
    {
      id: '2',
      address: 'שדרות ירושלים 12',
      price: 1950000,
      area: 98,
      pricePerSqm: 19898,
      distanceKm: 0.5,
      similarity: 0.85,
      reliability: 0.95,
      monthsOld: 4,
      weight: 0,
      enabled: true
    },
    {
      id: '3',
      address: 'רחוב ויצמן 23',
      price: 2250000,
      area: 110,
      pricePerSqm: 20455,
      distanceKm: 0.8,
      similarity: 0.8,
      reliability: 0.85,
      monthsOld: 6,
      weight: 0,
      enabled: true
    }
  ])

  const [calculation, setCalculation] = useState<WeightedCalculation | null>(null)

   
  useEffect(() => {
    calculateWeightedAverage()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparables])

  const calculateWeightedAverage = () => {
    const enabled = comparables.filter(c => c.enabled)
    if (enabled.length === 0) {
      setCalculation(null)
      return
    }

    const updatedComparables = enabled.map(comp => {
      const distanceWeight = Math.max(0, 1 - comp.distanceKm / 5)
      const similarityWeight = comp.similarity
      const reliabilityWeight = comp.reliability
      const recencyWeight = Math.max(0, 1 - comp.monthsOld / 12)
      
      const rawWeight = (
        distanceWeight * 0.3 +
        similarityWeight * 0.3 +
        reliabilityWeight * 0.2 +
        recencyWeight * 0.2
      )

      return { ...comp, weight: rawWeight }
    })

    const totalWeight = updatedComparables.reduce((sum, c) => sum + c.weight, 0)
    const normalizedComparables = updatedComparables.map(c => ({
      ...c,
      weight: c.weight / totalWeight
    }))

    const weightedAverage = normalizedComparables.reduce(
      (sum, c) => sum + c.pricePerSqm * c.weight,
      0
    )

    const prices = normalizedComparables.map(c => c.pricePerSqm).sort((a, b) => a - b)
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)]

    const min = Math.min(...prices)
    const max = Math.max(...prices)

    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    const standardDeviation = Math.sqrt(variance)
    const coefficientOfVariation = (standardDeviation / mean) * 100

    setCalculation({
      comparables: normalizedComparables,
      weightedAverage: Math.round(weightedAverage),
      median: Math.round(median),
      min: Math.round(min),
      max: Math.round(max),
      standardDeviation: Math.round(standardDeviation),
      coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
      recommendedRange: {
        min: Math.round(weightedAverage * 0.95),
        max: Math.round(weightedAverage * 1.05)
      }
    })

    setComparables(prev => prev.map(c => {
      const updated = normalizedComparables.find(nc => nc.id === c.id)
      return updated || c
    }))
  }

  const addComparable = () => {
    const newComp: Comparable = {
      id: Date.now().toString(),
      address: '',
      price: 2000000,
      area: 100,
      pricePerSqm: 20000,
      distanceKm: 0.5,
      similarity: 0.8,
      reliability: 0.85,
      monthsOld: 3,
      weight: 0,
      enabled: true
    }
    setComparables(prev => [...prev, newComp])
  }

  const updateComparable = (id: string, updates: Partial<Comparable>) => {
    setComparables(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates }
        if ('price' in updates || 'area' in updates) {
          updated.pricePerSqm = updated.price / updated.area
        }
        return updated
      }
      return c
    }))
  }

  const removeComparable = (id: string) => {
    setComparables(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="glass-effect border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="text-primary" size={24} weight="duotone" />
              </div>
              <div>
                <CardTitle>מחשבון ממוצע משוקלל</CardTitle>
                <CardDescription>שקלול אוטומטי של עסקאות לפי קרבה, דמיון, אמינות ועדכניות</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">עסקאות דומות ({comparables.filter(c => c.enabled).length} פעילות)</h3>
              <Button onClick={addComparable} size="sm">
                <Plus size={16} className="ml-1" />
                הוסף עסקה
              </Button>
            </div>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                <AnimatePresence>
                  {comparables.map((comp, index) => (
                    <motion.div
                      key={comp.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={cn(
                        "border-2 transition-all",
                        comp.enabled ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/30 opacity-60"
                      )}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={comp.enabled}
                                  onChange={(e) => updateComparable(comp.id, { enabled: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <Input
                                  value={comp.address}
                                  onChange={(e) => updateComparable(comp.id, { address: e.target.value })}
                                  placeholder="כתובת הנכס..."
                                  className="font-semibold"
                                />
                                {comp.weight > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    משקל: {(comp.weight * 100).toFixed(1)}%
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">מחיר (₪)</Label>
                                  <Input
                                    type="number"
                                    value={comp.price}
                                    onChange={(e) => updateComparable(comp.id, { price: Number(e.target.value) })}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">שטח (מ"ר)</Label>
                                  <Input
                                    type="number"
                                    value={comp.area}
                                    onChange={(e) => updateComparable(comp.id, { area: Number(e.target.value) })}
                                  />
                                </div>
                              </div>

                              <div className="p-2 rounded bg-accent/10 text-center">
                                <p className="text-sm text-muted-foreground">מחיר למ"ר</p>
                                <p className="text-xl font-bold text-accent">
                                  {comp.pricePerSqm.toLocaleString('he-IL')} ₪
                                </p>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs flex items-center gap-1">
                                      <MapPin size={14} />
                                      מרחק (ק"מ)
                                    </Label>
                                    <span className="text-xs font-mono">{comp.distanceKm}</span>
                                  </div>
                                  <Slider
                                    value={[comp.distanceKm]}
                                    onValueChange={([value]) => updateComparable(comp.id, { distanceKm: value })}
                                    min={0}
                                    max={5}
                                    step={0.1}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs flex items-center gap-1">
                                      <ChartBar size={14} />
                                      דמיון (%)
                                    </Label>
                                    <span className="text-xs font-mono">{(comp.similarity * 100).toFixed(0)}%</span>
                                  </div>
                                  <Slider
                                    value={[comp.similarity * 100]}
                                    onValueChange={([value]) => updateComparable(comp.id, { similarity: value / 100 })}
                                    min={0}
                                    max={100}
                                    step={5}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">אמינות (%)</Label>
                                    <span className="text-xs font-mono">{(comp.reliability * 100).toFixed(0)}%</span>
                                  </div>
                                  <Slider
                                    value={[comp.reliability * 100]}
                                    onValueChange={([value]) => updateComparable(comp.id, { reliability: value / 100 })}
                                    min={0}
                                    max={100}
                                    step={5}
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs flex items-center gap-1">
                                      <Calendar size={14} />
                                      גיל (חודשים)
                                    </Label>
                                    <span className="text-xs font-mono">{comp.monthsOld}</span>
                                  </div>
                                  <Slider
                                    value={[comp.monthsOld]}
                                    onValueChange={([value]) => updateComparable(comp.id, { monthsOld: value })}
                                    min={0}
                                    max={12}
                                    step={1}
                                  />
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeComparable(comp.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash size={18} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="glass-effect border-accent/30 sticky top-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <ListNumbers className="text-accent" size={24} weight="duotone" />
              </div>
              <CardTitle>תוצאות חישוב</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {calculation ? (
              <>
                <div className="space-y-4">
                  <motion.div
                    key={calculation.weightedAverage}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className="p-6 rounded-lg bg-linear-to-br from-primary/20 to-accent/20 border-2 border-primary/30 space-y-2"
                  >
                    <p className="text-sm text-muted-foreground font-semibold">ממוצע משוקלל</p>
                    <p className="text-3xl font-bold text-primary">
                      {calculation.weightedAverage.toLocaleString('he-IL')} ₪/מ"ר
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                      <p className="text-xs text-muted-foreground">חציון</p>
                      <p className="text-lg font-bold">
                        {calculation.median.toLocaleString('he-IL')} ₪
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                      <p className="text-xs text-muted-foreground">סטיית תקן</p>
                      <p className="text-lg font-bold">
                        ±{calculation.standardDeviation.toLocaleString('he-IL')} ₪
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-success/10 border border-success/30 space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendDown size={12} />
                        <span>מינימום</span>
                      </div>
                      <p className="text-lg font-bold text-success">
                        {calculation.min.toLocaleString('he-IL')} ₪
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendUp size={12} />
                        <span>מקסימום</span>
                      </div>
                      <p className="text-lg font-bold text-destructive">
                        {calculation.max.toLocaleString('he-IL')} ₪
                      </p>
                    </div>
                  </div>

                  <Alert className="border-primary/30 bg-primary/5">
                    <AlertDescription>
                      <p className="font-semibold mb-2">טווח מומלץ (±5%)</p>
                      <p className="text-sm">
                        {calculation.recommendedRange.min.toLocaleString('he-IL')} ₪/מ"ר
                        {' - '}
                        {calculation.recommendedRange.max.toLocaleString('he-IL')} ₪/מ"ר
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold">מקדם שונות (CV)</p>
                    <p className="text-lg font-mono">
                      {calculation.coefficientOfVariation}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculation.coefficientOfVariation < 10 ? '✅ עקביות גבוהה' :
                       calculation.coefficientOfVariation < 20 ? '⚠️ עקביות בינונית' :
                       '❌ שונות גבוהה - בדוק עסקאות'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">משקלים מנורמלים</h4>
                  <div className="space-y-2">
                    {calculation.comparables.map(comp => (
                      <div key={comp.id} className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${comp.weight * 100}%` }}
                            className="h-full bg-primary"
                          />
                        </div>
                        <span className="text-xs font-mono w-12 text-left">
                          {(comp.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator size={48} className="mx-auto mb-4 opacity-50" />
                <p>אין עסקאות פעילות</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
