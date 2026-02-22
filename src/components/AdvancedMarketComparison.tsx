import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  MagnifyingGlass, 
  Sparkle, 
  MapPin, 
  
  CheckCircle,
  ArrowsOutCardinal,
  FunnelSimple,
  ChartBar,
  Calendar,
  Buildings
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Property } from '@/lib/types'
import type { AIComparable } from '@/services/aiService'
import { generateComparablesForProperty } from '@/services/aiService'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdvancedMarketComparison')

interface AdvancedMarketComparisonProps {
  property: Property
  onSelectComparables: (comparables: AIComparable[]) => void
}

export function AdvancedMarketComparison({ property, onSelectComparables }: AdvancedMarketComparisonProps) {
  const [searchRadius, setSearchRadius] = useState([1.5])
  const [maxResults, setMaxResults] = useState(10)
  const [propertyTypes, _setPropertyTypes] = useState<string[]>([property.type])
  const [saleTimeframe, setSaleTimeframe] = useState('12')
  const [minSize, setMinSize] = useState(Math.floor(property.details.builtArea * 0.7))
  const [maxSize, setMaxSize] = useState(Math.ceil(property.details.builtArea * 1.3))
  const [comparables, setComparables] = useState<AIComparable[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [sortBy, setSortBy] = useState<'similarity' | 'distance' | 'price' | 'date'>('similarity')
  const [_viewMode, _setViewMode] = useState<'grid' | 'map' | 'table'>('grid')

  const handleAISearch = async () => {
    setIsSearching(true)
    toast.loading('מחפש נכסים דומים באמצעות AI...')

    try {
      const _promptText = `אתה מומחה שמאות נדל"ן. צור רשימה של ${maxResults} נכסי השוואה ריאליסטיים עבור הנכס הבא:

כתובת: ${property.address.street}, ${property.address.neighborhood}, ${property.address.city}
סוג: ${property.type}
שטח בנוי: ${property.details.builtArea} מ"ר
חדרים: ${property.details.rooms}
קומה: ${property.details.floor}
שנת בנייה: ${property.details.buildYear}

קריטריונים לחיפוש:
- רדיוס חיפוש: ${searchRadius[0]} ק"מ מהנכס
- סוגי נכסים: ${propertyTypes.join(', ')}
- טווח שטח: ${minSize}-${maxSize} מ"ר
- מכירות ב-${saleTimeframe} חודשים אחרונים
- אין לך גישה למאגר כתובות. אל תיצור שמות רחובות ואל תטען שכתובת היא אמיתית.

החזר JSON עם מפתח "comparables" שמכיל מערך של נכסים. כל נכס חייב לכלול:
{
  "id": "comp-{מספר}",
  "address": "לא מאומת (AI)",
  "type": "${property.type}",
  "salePrice": מחיר_מכירה_ריאלי_בשקלים,
  "saleDate": "תאריך בפורמט YYYY-MM-DD (${saleTimeframe} חודשים אחרונים)",
  "builtArea": שטח_בין_${minSize}_ל_${maxSize},
  "rooms": מספר_חדרים_קרוב_ל_${property.details.rooms},
  "floor": מספר_קומה,
  "distance": מרחק_בקילומטרים_עד_${searchRadius[0]},
  "pricePerSqm": מחיר_למטר_ריאלי,
  "selected": false,
  "adjustments": {
    "location": התאמת_מיקום_פלוס_או_מינוס,
    "size": התאמת_שטח,
    "condition": התאמת_מצב,
    "floor": התאמת_קומה,
    "age": התאמת_גיל,
    "features": התאמת_תכונות,
    "total": סכום_כל_ההתאמות
  },
  "adjustedPrice": מחיר_אחרי_התאמות,
  "similarityScore": ציון_דמיון_בין_0_ל_100
}

התאמות צריכות להיות הגיוניות (בדרך כלל -200,000 עד +200,000 לכל קטגוריה).
מחירים צריכים להיות ריאליים לאזור ${property.address.city}.
אסור להמציא רחובות/כתובות. שדה address חייב להיות בדיוק "לא מאומת (AI)".`

      const comps = await generateComparablesForProperty(property, {
        radiusKm: searchRadius[0],
        maxResults,
        minSize,
        maxSize,
        saleTimeframeMonths: parseInt(saleTimeframe, 10),
        propertyTypes,
      })

      setComparables(comps)
      toast.success(`נמצאו ${comps.length} נכסים דומים`)
    } catch (error) {
      log.error('Error searching comparables:', error)
      toast.error('שגיאה בחיפוש נכסים')
    } finally {
      setIsSearching(false)
    }
  }

  const toggleComparable = (id: string) => {
    setComparables((current) =>
      current.map((comp) =>
        comp.id === id ? { ...comp, selected: !comp.selected } : comp
      )
    )
  }

  const sortComparables = (comps: AIComparable[]) => {
    const sorted = [...comps]
    switch (sortBy) {
      case 'similarity':
        return sorted.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
      case 'distance':
        return sorted.sort((a, b) => a.distance - b.distance)
      case 'price':
        return sorted.sort((a, b) => b.adjustedPrice - a.adjustedPrice)
      case 'date':
        return sorted.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      default:
        return sorted
    }
  }

  const selectedComparables = comparables.filter((c) => c.selected)
  const sortedComparables = sortComparables(comparables)
  const avgAdjustedPrice = selectedComparables.length > 0
    ? selectedComparables.reduce((sum, c) => sum + c.adjustedPrice, 0) / selectedComparables.length
    : 0

  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-right flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                onClick={handleAISearch} 
                disabled={isSearching}
                className="gap-2 bg-primary hover:bg-primary/90 glow-primary"
              >
                <Sparkle size={18} weight="fill" />
                {isSearching ? 'מחפש...' : 'חיפוש AI מתקדם'}
              </Button>
              {selectedComparables.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => onSelectComparables(selectedComparables)}
                  className="gap-2"
                >
                  <CheckCircle size={18} weight="fill" />
                  שמור {selectedComparables.length} נבחרים
                </Button>
              )}
            </div>
            <span>חיפוש נכסים דומים מתקדם</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <label className="text-sm font-medium text-right block">
                <ArrowsOutCardinal size={16} className="inline ml-2" />
                רדיוס חיפוש: {searchRadius[0]} ק״מ
              </label>
              <Slider
                value={searchRadius}
                onValueChange={setSearchRadius}
                min={0.5}
                max={10}
                step={0.5}
                className="w-full"
                dir="rtl"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-right block">
                <Calendar size={16} className="inline ml-2" />
                תקופת מכירות
              </label>
              <Select value={saleTimeframe} onValueChange={setSaleTimeframe}>
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 חודשים</SelectItem>
                  <SelectItem value="6">6 חודשים</SelectItem>
                  <SelectItem value="12">שנה</SelectItem>
                  <SelectItem value="24">שנתיים</SelectItem>
                  <SelectItem value="36">3 שנים</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-right block">
                <FunnelSimple size={16} className="inline ml-2" />
                מספר תוצאות מקסימלי
              </label>
              <Select value={maxResults.toString()} onValueChange={(v) => setMaxResults(parseInt(v))}>
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 נכסים</SelectItem>
                  <SelectItem value="10">10 נכסים</SelectItem>
                  <SelectItem value="15">15 נכסים</SelectItem>
                  <SelectItem value="20">20 נכסים</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <label className="text-sm font-medium text-right block">
                <Buildings size={16} className="inline ml-2" />
                טווח שטח: {minSize}-{maxSize} מ״ר
              </label>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={maxSize}
                  onChange={(e) => setMaxSize(parseInt(e.target.value))}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full text-center"
                  dir="rtl"
                  placeholder="שטח מקסימלי"
                  aria-label="שטח מקסימלי במ״ר"
                />
                <input
                  type="number"
                  value={minSize}
                  onChange={(e) => setMinSize(parseInt(e.target.value))}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full text-center"
                  dir="rtl"
                  placeholder="שטח מינימלי"
                  aria-label="שטח מינימלי במ״ר"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-right block">
                <ChartBar size={16} className="inline ml-2" />
                מיון לפי
              </label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'similarity' | 'distance' | 'price' | 'date')}>
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="similarity">דמיון</SelectItem>
                  <SelectItem value="distance">מרחק</SelectItem>
                  <SelectItem value="price">מחיר</SelectItem>
                  <SelectItem value="date">תאריך מכירה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {comparables.length > 0 && (
        <>
          <Card className="glass-effect">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">נבחרו</div>
                  <div className="text-3xl font-bold text-primary">
                    {selectedComparables.length}
                  </div>
                  <div className="text-xs text-muted-foreground">מתוך {comparables.length}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">ממוצע מותאם</div>
                  <div className="text-3xl font-bold font-mono text-accent">
                    {avgAdjustedPrice > 0 ? `₪${(avgAdjustedPrice / 1000000).toFixed(2)}M` : '-'}
                  </div>
                  {selectedComparables.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ₪{Math.round(avgAdjustedPrice / property.details.builtArea).toLocaleString()} למ״ר
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">טווח מחירים</div>
                  {selectedComparables.length > 0 ? (
                    <>
                      <div className="text-xl font-bold font-mono">
                        ₪{(Math.min(...selectedComparables.map(c => c.adjustedPrice)) / 1000000).toFixed(2)}M
                      </div>
                      <div className="text-xl font-bold font-mono">
                        ₪{(Math.max(...selectedComparables.map(c => c.adjustedPrice)) / 1000000).toFixed(2)}M
                      </div>
                    </>
                  ) : (
                    <div className="text-3xl font-bold">-</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">ממוצע דמיון</div>
                  {selectedComparables.length > 0 ? (
                    <>
                      <div className="text-3xl font-bold text-success">
                        {Math.round(
                          selectedComparables.reduce((sum, c) => sum + (c.similarityScore || 0), 0) /
                          selectedComparables.length
                        )}%
                      </div>
                      <Progress 
                        value={selectedComparables.reduce((sum, c) => sum + (c.similarityScore || 0), 0) / selectedComparables.length} 
                        className="h-2 mt-2"
                      />
                    </>
                  ) : (
                    <div className="text-3xl font-bold">-</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedComparables.map((comp, i) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${
                    comp.selected ? 'glass-effect glow-primary border-primary' : 'border-border'
                  }`}
                  onClick={() => toggleComparable(comp.id)}
                >
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2 items-start">
                        <Badge variant={comp.selected ? 'default' : 'outline'} className="shrink-0">
                          {comp.selected ? <CheckCircle size={12} weight="fill" className="ml-1" /> : null}
                          {comp.selected ? 'נבחר' : 'בחר'}
                        </Badge>
                        {comp.similarityScore && (
                          <Badge variant="secondary" className="shrink-0">
                            {comp.similarityScore}% דמיון
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin size={12} />
                        {comp.distance.toFixed(1)} ק״מ
                      </div>
                    </div>

                    <div className="text-right">
                      <h3 className="font-semibold text-lg mb-1">{comp.address}</h3>
                      <div className="text-sm text-muted-foreground mb-3">
                        {comp.rooms} חד׳ • {comp.builtArea} מ״ר • קומה {comp.floor}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-right">
                        <div className="text-muted-foreground text-xs mb-1">מחיר מכירה</div>
                        <div className="font-mono font-semibold">
                          ₪{(comp.salePrice / 1000000).toFixed(2)}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-xs mb-1">מחיר מותאם</div>
                        <div className="font-mono font-semibold text-primary">
                          ₪{(comp.adjustedPrice / 1000000).toFixed(2)}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-xs mb-1">התאמות</div>
                        <div className={`font-mono font-semibold ${
                          comp.adjustments.total >= 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {comp.adjustments.total >= 0 ? '+' : ''}
                          ₪{(comp.adjustments.total / 1000).toFixed(0)}K
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground text-xs mb-1">מחיר למ״ר</div>
                        <div className="font-mono font-semibold">
                          ₪{comp.pricePerSqm.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground text-right pt-2 border-t border-border/50">
                      נמכר ב-{new Date(comp.saleDate).toLocaleDateString('he-IL')}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-secondary/30 rounded">
                        <div className="text-muted-foreground mb-1">מיקום</div>
                        <div className={`font-mono ${comp.adjustments.location >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {comp.adjustments.location >= 0 ? '+' : ''}
                          {(comp.adjustments.location / 1000).toFixed(0)}K
                        </div>
                      </div>
                      <div className="text-center p-2 bg-secondary/30 rounded">
                        <div className="text-muted-foreground mb-1">שטח</div>
                        <div className={`font-mono ${comp.adjustments.size >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {comp.adjustments.size >= 0 ? '+' : ''}
                          {(comp.adjustments.size / 1000).toFixed(0)}K
                        </div>
                      </div>
                      <div className="text-center p-2 bg-secondary/30 rounded">
                        <div className="text-muted-foreground mb-1">מצב</div>
                        <div className={`font-mono ${comp.adjustments.condition >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {comp.adjustments.condition >= 0 ? '+' : ''}
                          {(comp.adjustments.condition / 1000).toFixed(0)}K
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {comparables.length === 0 && !isSearching && (
        <Card className="glass-effect">
          <CardContent className="py-16 text-center">
            <MagnifyingGlass size={64} className="mx-auto mb-4 text-muted-foreground" weight="duotone" />
            <h3 className="text-xl font-semibold mb-2">התחל חיפוש נכסים דומים</h3>
            <p className="text-muted-foreground mb-6">
              השתמש בחיפוש AI מתקדם כדי למצוא נכסים דומים לנכס שלך
            </p>
            <Button onClick={handleAISearch} className="gap-2 glow-primary">
              <Sparkle size={20} weight="fill" />
              חיפוש AI מתקדם
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
