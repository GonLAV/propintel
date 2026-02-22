import { useState } from 'react'
import type { Property, Comparable } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { 
  Sparkle, 
  MapPin, 
  TrendUp, 
  CheckCircle,
  Lightning,
  ChartBar,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { createLogger } from '@/lib/logger'

const log = createLogger('AIValuation')

interface AIValuationProps {
  property: Property
  onUpdateValuation: (valuationData: Property['valuationData']) => void
}

export function AIValuation({ property, onUpdateValuation }: AIValuationProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [comparables, setComparables] = useState<Comparable[]>([])
  const [searchRadius, setSearchRadius] = useState(1.0)
  const [minSimilarity, setMinSimilarity] = useState(70)
  const [showAdjustments, setShowAdjustments] = useState(false)

  const handleAIValuation = async () => {
    setIsAnalyzing(true)
    try {
      const prompt = `You are a professional real estate appraiser. Generate realistic comparable properties for this property:

Address: ${property.address.street}, ${property.address.neighborhood}, ${property.address.city}
Type: ${property.type}
Built Area: ${property.details.builtArea} sqm
Rooms: ${property.details.rooms}
Floor: ${property.details.floor}/${property.details.totalFloors}
Build Year: ${property.details.buildYear}
Condition: ${property.details.condition}

Generate exactly 5 comparable properties sold within the last 6 months in the same area. For each comparable:
1. DO NOT invent street names or claim any address is real. Use the placeholder "לא מאומת (AI)" for the address field.
2. Set a sale price that makes sense for the area
3. Calculate appropriate adjustments for location, size, condition, floor, age, and features
4. Calculate adjusted price and price per sqm
5. Determine distance from subject property (0.2-2.0 km)

Return ONLY valid JSON with this exact structure, no additional text:
{
  "comparables": [
    {
      "id": "comp-{unique_id}",
          "address": "לא מאומת (AI)",
      "type": "${property.type}",
      "salePrice": 0,
      "saleDate": "2024-MM-DD",
      "builtArea": 0,
      "rooms": 0,
      "floor": 0,
      "distance": 0.0,
      "adjustments": {
        "location": 0,
        "size": 0,
        "condition": 0,
        "floor": 0,
        "age": 0,
        "features": 0,
        "total": 0
      },
      "adjustedPrice": 0,
      "pricePerSqm": 0,
      "selected": true
    }
  ]
}`

      const response = await window.spark.llm(prompt, 'gpt-4o', true)
      const data = JSON.parse(response)
      
      if (!data.comparables || !Array.isArray(data.comparables)) {
        throw new Error('Invalid response format')
      }

      const compsWithSelection = data.comparables.map((comp: Comparable) => ({
        ...comp,
        selected: true
      }))

      setComparables(compsWithSelection)
      
      await calculateValuation(compsWithSelection)
      
      toast.success('ניתוח AI הושלם בהצלחה')
    } catch (error) {
      log.error('AI Valuation error:', error)
      toast.error('שגיאה בניתוח AI')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const calculateValuation = async (comps: Comparable[]) => {
    const selectedComps = comps.filter(c => c.selected)
    
    if (selectedComps.length === 0) {
      toast.error('יש לבחור לפחות נכס אחד להשוואה')
      return
    }

    const avgAdjustedPrice = selectedComps.reduce((sum, c) => sum + c.adjustedPrice, 0) / selectedComps.length
    const pricesPerSqm = selectedComps.map(c => c.pricePerSqm)
    const avgPricePerSqm = pricesPerSqm.reduce((sum, p) => sum + p, 0) / pricesPerSqm.length
    
    const stdDev = Math.sqrt(
      pricesPerSqm.reduce((sum, p) => sum + Math.pow(p - avgPricePerSqm, 2), 0) / pricesPerSqm.length
    )
    
    const estimatedValue = Math.round(avgAdjustedPrice)
    const margin = stdDev * property.details.builtArea * 1.5
    
    const confidence = Math.min(95, Math.max(70, 95 - (stdDev / avgPricePerSqm * 100)))

    const valuationData = {
      estimatedValue,
      valueRange: {
        min: Math.round(estimatedValue - margin),
        max: Math.round(estimatedValue + margin)
      },
      confidence: Math.round(confidence),
      method: 'comparable-sales' as const,
      comparables: selectedComps.map(c => c.id),
      notes: `ניתוח מבוסס על ${selectedComps.length} נכסים דומים. סטיית תקן: ${Math.round(stdDev)} ₪/מ"ר`
    }

    onUpdateValuation(valuationData)
  }

  const toggleComparable = (id: string) => {
    const updated = comparables.map(c => 
      c.id === id ? { ...c, selected: !c.selected } : c
    )
    setComparables(updated)
  }

  const recalculate = () => {
    calculateValuation(comparables)
    toast.success('השומה עודכנה')
  }

  const handleRefineWithAI = async () => {
    if (comparables.length === 0) return
    
    setIsAnalyzing(true)
    try {
      const selectedComps = comparables.filter(c => c.selected)
      
      const prompt = `As a professional appraiser, analyze these comparable properties and provide insights:

Subject Property:
- Address: ${property.address.street}, ${property.address.city}
- Type: ${property.type}
- Size: ${property.details.builtArea} sqm
- Rooms: ${property.details.rooms}
- Condition: ${property.details.condition}

Selected Comparables:
${selectedComps.map((c, i) => `${i + 1}. ${c.address} - ${c.salePrice.toLocaleString()} ILS (${c.builtArea} sqm, ${c.rooms} rooms)`).join('\n')}

Estimated Value: ${property.valuationData?.estimatedValue.toLocaleString()} ILS
Confidence: ${property.valuationData?.confidence}%

Provide a brief professional analysis (2-3 sentences in Hebrew) covering:
1. Market positioning of this property
2. Key factors affecting the valuation
3. Any recommendations or considerations

Return ONLY the Hebrew text, no JSON, no formatting.`

      const insights = await window.spark.llm(prompt, 'gpt-4o')
      
      if (property.valuationData) {
        onUpdateValuation({
          ...property.valuationData,
          notes: insights.trim()
        })
      }
      
      toast.success('ניתוח AI עודכן')
    } catch (error) {
      log.error('AI Refinement error:', error)
      toast.error('שגיאה בעידון הניתוח')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {comparables.length > 0 && (
                <>
                  <Button
                    onClick={recalculate}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <ArrowsClockwise size={16} />
                    חשב מחדש
                  </Button>
                  <Button
                    onClick={handleRefineWithAI}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isAnalyzing}
                  >
                    <Sparkle size={16} weight="fill" />
                    עדכן ניתוח AI
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-right">שומה מבוססת AI</CardTitle>
              <div className="w-10 h-10 bg-linear-to-br from-primary to-accent rounded-xl flex items-center justify-center glow-primary">
                <Sparkle className="text-primary-foreground" size={20} weight="fill" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2" dir="rtl">
                <Label className="text-sm flex items-center gap-2">
                  <MapPin size={16} />
                  רדיוס חיפוש (ק"מ)
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    step="0.1"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    className="font-mono w-24 text-right"
                  />
                  <Slider
                    value={[searchRadius]}
                    onValueChange={(v) => setSearchRadius(v[0])}
                    min={0.5}
                    max={5}
                    step={0.1}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2" dir="rtl">
                <Label className="text-sm flex items-center gap-2">
                  <ChartBar size={16} />
                  דמיון מינימלי (%)
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={minSimilarity}
                    onChange={(e) => setMinSimilarity(Number(e.target.value))}
                    className="font-mono w-24 text-right"
                  />
                  <Slider
                    value={[minSimilarity]}
                    onValueChange={(v) => setMinSimilarity(v[0])}
                    min={50}
                    max={95}
                    step={5}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleAIValuation}
              disabled={isAnalyzing}
              className="w-full gap-2 bg-linear-to-r from-primary to-accent hover:opacity-90 glow-primary"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <ArrowsClockwise size={20} className="animate-spin" />
                  מנתח נכסים דומים...
                </>
              ) : (
                <>
                  <Lightning size={20} weight="fill" />
                  הפעל ניתוח AI מתקדם
                </>
              )}
            </Button>
          </div>

          {property.valuationData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 md:grid-cols-3 pt-6 border-t border-border/50"
            >
              <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/30">
                <CardHeader>
                  <CardTitle className="text-sm text-right text-muted-foreground">שווי משוער</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-mono font-bold text-primary text-right">
                    ₪{(property.valuationData.estimatedValue / 1000000).toFixed(2)}M
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-right">
                    {Math.round(property.valuationData.estimatedValue / property.details.builtArea).toLocaleString()} ₪/מ״ר
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-linear-to-br from-accent/10 to-accent/5 border-accent/30">
                <CardHeader>
                  <CardTitle className="text-sm text-right text-muted-foreground">טווח שווי</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-mono text-accent flex items-center justify-end gap-2">
                      <span>₪{(property.valuationData.valueRange.max / 1000000).toFixed(2)}M</span>
                      <TrendUp size={14} />
                    </div>
                    <Progress 
                      value={50} 
                      className="h-1.5 bg-accent/20"
                    />
                    <div className="text-sm font-mono text-accent flex items-center justify-end gap-2">
                      <span>₪{(property.valuationData.valueRange.min / 1000000).toFixed(2)}M</span>
                      <TrendUp size={14} className="rotate-180" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-linear-to-br from-success/10 to-success/5 border-success/30">
                <CardHeader>
                  <CardTitle className="text-sm text-right text-muted-foreground">רמת ביטחון</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 justify-end">
                    <div className="text-3xl font-bold text-success">
                      {property.valuationData.confidence}%
                    </div>
                    <CheckCircle size={32} className="text-success" weight="fill" />
                  </div>
                  <Progress 
                    value={property.valuationData.confidence} 
                    className="mt-3 h-2 bg-success/20"
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {property.valuationData?.notes && (
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-sm text-right">ניתוח מקצועי</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-right">{property.valuationData.notes}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {comparables.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdjustments(!showAdjustments)}
                className="gap-2"
              >
                <ChartBar size={16} />
                {showAdjustments ? 'הסתר התאמות' : 'הצג התאמות מפורטות'}
              </Button>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  {comparables.filter(c => c.selected).length} / {comparables.length} נבחרו
                </Badge>
                <CardTitle className="text-right">נכסים דומים</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {comparables.map((comp, index) => (
                  <motion.div
                    key={comp.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ComparableCard
                      comparable={comp}
                      onToggle={toggleComparable}
                      showAdjustments={showAdjustments}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ComparableCard({ 
  comparable, 
  onToggle, 
  showAdjustments 
}: { 
  comparable: Comparable
  onToggle: (id: string) => void
  showAdjustments: boolean
}) {
  return (
    <div 
      className={`rounded-xl p-4 transition-all cursor-pointer border ${
        comparable.selected 
          ? 'bg-primary/5 border-primary/30 hover:border-primary/50' 
          : 'bg-muted/20 border-border/30 hover:border-border/50'
      }`}
      onClick={() => onToggle(comparable.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-3 items-start">
          <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            comparable.selected 
              ? 'bg-primary border-primary' 
              : 'bg-transparent border-border'
          }`}>
            {comparable.selected && (
              <CheckCircle size={16} weight="fill" className="text-primary-foreground" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex gap-2 items-center">
              <Badge variant={comparable.selected ? 'default' : 'outline'} className="text-xs">
                {comparable.selected ? 'נבחר' : 'לא נבחר'}
              </Badge>
              <div className="flex gap-2 items-center text-xs text-muted-foreground">
                <span>{comparable.distance.toFixed(1)} ק״מ</span>
                <MapPin size={12} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-semibold text-base mb-1">{comparable.address}</div>
          <div className="text-sm text-muted-foreground">
            {comparable.rooms} חד׳ • {comparable.builtArea} מ״ר • קומה {comparable.floor}
          </div>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-xs text-muted-foreground mb-1">מחיר מכירה</div>
          <div className="font-mono font-semibold text-sm">
            ₪{(comparable.salePrice / 1000000).toFixed(2)}M
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">התאמות</div>
          <div className={`font-mono font-semibold text-sm ${
            comparable.adjustments.total >= 0 ? 'text-success' : 'text-destructive'
          }`}>
            {comparable.adjustments.total >= 0 ? '+' : ''}₪{(comparable.adjustments.total / 1000).toFixed(0)}K
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">מחיר מותאם</div>
          <div className="font-mono font-semibold text-sm text-primary">
            ₪{(comparable.adjustedPrice / 1000000).toFixed(2)}M
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">מחיר למ״ר</div>
          <div className="font-mono font-semibold text-sm">
            ₪{comparable.pricePerSqm.toLocaleString()}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAdjustments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <AdjustmentItem label="מיקום" value={comparable.adjustments.location} />
                <AdjustmentItem label="גודל" value={comparable.adjustments.size} />
                <AdjustmentItem label="מצב" value={comparable.adjustments.condition} />
                <AdjustmentItem label="קומה" value={comparable.adjustments.floor} />
                <AdjustmentItem label="גיל" value={comparable.adjustments.age} />
                <AdjustmentItem label="תכונות" value={comparable.adjustments.features} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 text-xs text-muted-foreground text-right">
        נמכר ב-{new Date(comparable.saleDate).toLocaleDateString('he-IL')}
      </div>
    </div>
  )
}

function AdjustmentItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-muted/30">
      <div className={`font-mono font-semibold ${
        value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground'
      }`}>
        {value > 0 ? '+' : ''}₪{(value / 1000).toFixed(0)}K
      </div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  )
}
