import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AdjustmentCalculator, type AdjustmentFactor } from '@/lib/calculators/adjustmentCalculator'
import { 
  Calculator, 
  TrendUp, 
  TrendDown, 
  ArrowRight, 
  ListChecks,
  ChartLine,
  FileText,
  Plus,
  Trash,
  Info,
  CheckCircle
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, uid } from '@/lib/utils'

interface CalculatorState {
  basePrice: number
  area: number
  adjustments: AdjustmentFactor[]
}

export function InteractiveAdjustmentCalculator() {
  const [state, setState] = useState<CalculatorState>({
    basePrice: 2000000,
    area: 100,
    adjustments: []
  })

  const [calculation, setCalculation] = useState(
    AdjustmentCalculator.calculateAdjustments(2000000, 100, [])
  )

  useEffect(() => {
    const result = AdjustmentCalculator.calculateAdjustments(
      state.basePrice,
      state.area,
      state.adjustments
    )
    setCalculation(result)
  }, [state])

  const addAdjustment = (preset?: Partial<AdjustmentFactor>) => {
    const newAdjustment: AdjustmentFactor = {
      id: uid('adj'),
      name: preset?.name || 'Custom Adjustment',
      nameHebrew: preset?.nameHebrew || 'התאמה מותאמת אישית',
      type: preset?.type || 'percentage',
      value: preset?.value || 0,
      applied: true,
      reasoning: preset?.reasoning || '',
      source: preset?.source || 'שיקול דעת מקצועי',
      category: preset?.category || 'physical'
    }

    setState(prev => ({
      ...prev,
      adjustments: [...prev.adjustments, newAdjustment]
    }))
  }

  const updateAdjustment = (id: string, updates: Partial<AdjustmentFactor>) => {
    setState(prev => ({
      ...prev,
      adjustments: prev.adjustments.map(adj =>
        adj.id === id ? { ...adj, ...updates } : adj
      )
    }))
  }

  const removeAdjustment = (id: string) => {
    setState(prev => ({
      ...prev,
      adjustments: prev.adjustments.filter(adj => adj.id !== id)
    }))
  }

  const addPresetAdjustment = (type: 'floor' | 'condition' | 'parking' | 'age' | 'direction') => {
    const presets = {
      floor: {
        nameHebrew: 'התאמת קומה',
        value: 3,
        reasoning: 'קומה גבוהה יותר',
        source: 'תקן שמאי 19 - סעיף 4.2',
        category: 'physical' as const
      },
      condition: {
        nameHebrew: 'התאמת מצב',
        value: 5,
        reasoning: 'מצב פיזי משופר',
        source: 'תקן שמאי 19 - סעיף 5.1',
        category: 'condition' as const
      },
      parking: {
        nameHebrew: 'חניה',
        value: 7,
        reasoning: 'חניה פרטית',
        source: 'תקן שמאי 19',
        category: 'amenities' as const
      },
      age: {
        nameHebrew: 'גיל הנכס',
        value: -5,
        reasoning: 'נכס ישן יותר',
        source: 'תקן שמאי 19 - סעיף 5.3',
        category: 'physical' as const
      },
      direction: {
        nameHebrew: 'כיוון וחשיפה',
        value: 5,
        reasoning: 'חשיפה דרומית',
        source: 'שיקול דעת מקצועי',
        category: 'location' as const
      }
    }

    addAdjustment(presets[type])
  }

  const totalAdjustmentPercent = state.adjustments
    .filter(a => a.applied)
    .reduce((sum, a) => sum + a.value, 0)

  const priceChange = calculation.adjustedPrice - calculation.basePrice
  const priceChangePercent = (priceChange / calculation.basePrice) * 100

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
                <CardTitle>מחשבון התאמות אינטראקטיבי</CardTitle>
                <CardDescription>התאם מחיר בסיס לפי פרמטרים שונים עם תצוגה חיה</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">מחיר בסיס (₪)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={state.basePrice}
                  onChange={e => setState(prev => ({ ...prev, basePrice: Number(e.target.value) }))}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">
                  {(state.basePrice / state.area).toLocaleString('he-IL')} ₪/מ"ר
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">שטח (מ"ר)</Label>
                <Input
                  id="area"
                  type="number"
                  value={state.area}
                  onChange={e => setState(prev => ({ ...prev, area: Number(e.target.value) }))}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">שטח עיקרי</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">התאמות</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addPresetAdjustment('floor')}
                  >
                    <Plus size={16} className="ml-1" />
                    קומה
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addPresetAdjustment('condition')}
                  >
                    <Plus size={16} className="ml-1" />
                    מצב
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addPresetAdjustment('parking')}
                  >
                    <Plus size={16} className="ml-1" />
                    חניה
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addAdjustment()}
                  >
                    <Plus size={16} className="ml-1" />
                    מותאם אישית
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <AnimatePresence>
                  {state.adjustments.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Info size={48} className="mx-auto mb-4 opacity-50" />
                      <p>לא הוגדרו התאמות</p>
                      <p className="text-sm">הוסף התאמה באמצעות הכפתורים למעלה</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      {state.adjustments.map((adj, index) => (
                        <motion.div
                          key={adj.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className={cn(
                            "border-2 transition-all",
                            adj.applied ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/30"
                          )}>
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={adj.applied}
                                      onCheckedChange={(applied) => updateAdjustment(adj.id, { applied })}
                                    />
                                    <Input
                                      value={adj.nameHebrew}
                                      onChange={(e) => updateAdjustment(adj.id, { nameHebrew: e.target.value })}
                                      className="font-semibold"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">אחוז התאמה (%)</Label>
                                      <div className="flex items-center gap-2">
                                        <Slider
                                          value={[adj.value]}
                                          onValueChange={([value]) => updateAdjustment(adj.id, { value })}
                                          min={-50}
                                          max={50}
                                          step={0.5}
                                          className="flex-1"
                                        />
                                        <Input
                                          type="number"
                                          value={adj.value}
                                          onChange={(e) => updateAdjustment(adj.id, { value: Number(e.target.value) })}
                                          className="w-20 text-center font-mono"
                                          step={0.5}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">ערך כספי משוער</Label>
                                      <div className={cn(
                                        "text-lg font-bold p-2 rounded-lg text-center",
                                        adj.value > 0 ? "bg-success/10 text-success" : 
                                        adj.value < 0 ? "bg-destructive/10 text-destructive" : 
                                        "bg-muted text-muted-foreground"
                                      )}>
                                        {adj.value > 0 ? '+' : ''}{((state.basePrice * adj.value) / 100).toLocaleString('he-IL')} ₪
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <Label className="text-xs">נימוק</Label>
                                    <Input
                                      value={adj.reasoning}
                                      onChange={(e) => updateAdjustment(adj.id, { reasoning: e.target.value })}
                                      placeholder="הסבר את הנימוק להתאמה..."
                                    />
                                  </div>

                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <FileText size={14} />
                                    <span>מקור: {adj.source}</span>
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAdjustment(adj.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash size={18} />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="glass-effect border-accent/30 sticky top-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <ChartLine className="text-accent" size={24} weight="duotone" />
              </div>
              <CardTitle>תצוגה חיה</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm text-muted-foreground">מחיר בסיס</p>
                <p className="text-2xl font-bold">
                  {calculation.basePrice.toLocaleString('he-IL')} ₪
                </p>
                <p className="text-sm text-muted-foreground">
                  {calculation.basePricePerSqm.toLocaleString('he-IL')} ₪/מ"ר
                </p>
              </div>

              <AnimatePresence>
                {totalAdjustmentPercent !== 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Alert className={cn(
                      "border-2",
                      totalAdjustmentPercent > 0 ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"
                    )}>
                      <div className="flex items-center gap-2">
                        {totalAdjustmentPercent > 0 ? (
                          <TrendUp className="text-success" size={20} weight="bold" />
                        ) : (
                          <TrendDown className="text-destructive" size={20} weight="bold" />
                        )}
                        <AlertDescription>
                          <span className="font-semibold">
                            {totalAdjustmentPercent > 0 ? '+' : ''}{totalAdjustmentPercent.toFixed(2)}%
                          </span>
                          {' '}סך כל ההתאמות
                        </AlertDescription>
                      </div>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-center py-2">
                <ArrowRight size={32} className="text-muted-foreground" weight="bold" />
              </div>

              <motion.div
                key={calculation.adjustedPrice}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className="p-6 rounded-lg bg-linear-to-br from-primary/20 to-accent/20 border-2 border-primary/30 space-y-2"
              >
                <p className="text-sm text-muted-foreground font-semibold">שווי מותאם</p>
                <p className="text-3xl font-bold text-primary">
                  {calculation.adjustedPrice.toLocaleString('he-IL')} ₪
                </p>
                <p className="text-sm text-muted-foreground">
                  {calculation.adjustedPricePerSqm.toLocaleString('he-IL')} ₪/מ"ר
                </p>
                <div className="pt-2 border-t border-primary/20">
                  <div className={cn(
                    "flex items-center gap-2 text-sm font-semibold",
                    priceChange > 0 ? "text-success" : priceChange < 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {priceChange > 0 ? <TrendUp size={16} /> : priceChange < 0 ? <TrendDown size={16} /> : null}
                    <span>
                      {priceChange > 0 ? '+' : ''}{priceChange.toLocaleString('he-IL')} ₪
                    </span>
                    <span className="text-muted-foreground">
                      ({priceChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            <Separator />

            <Tabs defaultValue="breakdown" dir="rtl">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="breakdown">
                  <ListChecks size={16} className="ml-1" />
                  פירוט שלבים
                </TabsTrigger>
                <TabsTrigger value="narrative">
                  <FileText size={16} className="ml-1" />
                  נרטיב
                </TabsTrigger>
              </TabsList>

              <TabsContent value="breakdown" className="space-y-2 mt-4">
                <ScrollArea className="h-[300px] pr-3">
                  {calculation.breakdown.map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="mb-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          step.step === 0 ? "bg-muted text-muted-foreground" :
                          step.value > 0 ? "bg-success/20 text-success" :
                          step.value < 0 ? "bg-destructive/20 text-destructive" :
                          "bg-muted/50 text-muted-foreground"
                        )}>
                          {step.step === 0 ? <CheckCircle size={16} weight="fill" /> : step.step}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-semibold">{step.description}</p>
                          <p className="text-xs text-muted-foreground font-mono">{step.calculation}</p>
                          <p className="text-sm font-bold text-primary">
                            ביניים: {step.runningTotal.toLocaleString('he-IL')} ₪
                          </p>
                        </div>
                      </div>
                      {index < calculation.breakdown.length - 1 && (
                        <Separator className="my-3" />
                      )}
                    </motion.div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="narrative" className="space-y-3 mt-4">
                <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-3">
                    <Alert className="border-primary/30 bg-primary/5">
                      <AlertDescription className="text-sm leading-relaxed whitespace-pre-line">
                        {calculation.narrativeHebrew}
                      </AlertDescription>
                    </Alert>

                    {calculation.formula && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-2 font-semibold">נוסחת חישוב:</p>
                        <p className="font-mono text-sm break-all">{calculation.formula}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
