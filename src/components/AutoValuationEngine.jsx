import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Sparkle,
  Database,
  TrendUp,
  CheckCircle,
  Warning,
  ChartBar,
  Buildings,
  Gavel,
  Coins,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { enrichPropertyWithGovData } from '@/lib/israelGovAPI'

export function AutoValuationEngine({ property, onValuationComplete }) {
  const [isValuating, setIsValuating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [result, setResult] = useState(null)
  const [govData, setGovData] = useState(null)

  const runAutoValuation = async () => {
    setIsValuating(true)
    setProgress(0)
    setCurrentStep('מתחבר למקורות נתונים ממשלתיים...')

    try {
      setProgress(10)
      setCurrentStep('שולף נתוני טאבו...')
      await new Promise(resolve => setTimeout(resolve, 500))

      setProgress(25)
      setCurrentStep('שולף תכניות בנין עיר...')
      await new Promise(resolve => setTimeout(resolve, 500))

      setProgress(40)
      setCurrentStep('שולף נתוני מיסוי...')
      const enrichedData = await enrichPropertyWithGovData(
        property.id,
        `${property.address.street}, ${property.address.city}`
      )
      setGovData(enrichedData)
      await new Promise(resolve => setTimeout(resolve, 500))

      setProgress(55)
      setCurrentStep('מנתח עסקאות בשוק...')
      await new Promise(resolve => setTimeout(resolve, 800))

      setProgress(70)
      setCurrentStep('מחשב התאמות תכנוניות...')
      await new Promise(resolve => setTimeout(resolve, 600))

      setProgress(85)
      setCurrentStep('מפעיל מנוע שמאות AI...')
      
      const valuationResult = calculateAutoValuation(property, enrichedData)
      setResult(valuationResult)
      
      setProgress(100)
      setCurrentStep('השמאות הושלמה!')
      
      toast.success('שמאות אוטומטית הושלמה בהצלחה')
      
      if (onValuationComplete) {
        onValuationComplete(valuationResult)
      }
    } catch (error) {
      toast.error('שגיאה בשמאות אוטומטית')
      console.error(error)
    } finally {
      setTimeout(() => setIsValuating(false), 500)
    }
  }

  const calculateAutoValuation = (prop, data) => {
    const baseValuePerSqm = data.taxData.taxAssessedValue / prop.details.builtArea
    const marketMultiplier = 1.15
    const baseValue = baseValuePerSqm * prop.details.builtArea * marketMultiplier

    const locationScore = data.gis.accessibility.walkabilityScore / 100
    const locationAdjustment = baseValue * (locationScore - 0.5) * 0.3

    const conditionMultipliers = {
      'new': 0.15,
      'excellent': 0.10,
      'good': 0.05,
      'fair': 0,
      'poor': -0.10,
      'renovation-needed': -0.20
    }
    const conditionAdjustment = baseValue * (conditionMultipliers[prop.details.condition] || 0)

    const planningAdjustment = data.planning.buildingRights.far > 100 ? baseValue * 0.08 : 0

    const avgTransactionPrice = data.transactions.reduce((sum, t) => sum + t.pricePerSqm, 0) / data.transactions.length
    const marketTrendAdjustment = ((avgTransactionPrice - baseValuePerSqm) / baseValuePerSqm) * baseValue

    const estimatedValue = Math.round(
      baseValue + locationAdjustment + conditionAdjustment + planningAdjustment + marketTrendAdjustment
    )

    const variance = 0.12
    const valueRange = {
      min: Math.round(estimatedValue * (1 - variance)),
      max: Math.round(estimatedValue * (1 + variance))
    }

    const dataQuality = calculateDataQuality(data)
    const confidenceScore = Math.min(95, 60 + (dataQuality * 0.35))

    const factors = [
      {
        name: 'Location Quality',
        nameHe: 'איכות מיקום',
        impact: (locationAdjustment / estimatedValue) * 100,
        source: 'GIS + Municipal Data',
        description: `ציון הליכות ${data.gis.accessibility.walkabilityScore}, מרחק לתחבורה ציבורית ${data.gis.accessibility.distanceToPublicTransport}מ'`
      },
      {
        name: 'Market Trend',
        nameHe: 'מגמת שוק',
        impact: (marketTrendAdjustment / estimatedValue) * 100,
        source: 'Land Registry Transactions',
        description: `${data.transactions.length} עסקאות ב-12 חודשים אחרונים, מחיר ממוצע ₪${avgTransactionPrice.toLocaleString('he-IL')}/מ"ר`
      },
      {
        name: 'Building Rights',
        nameHe: 'זכויות בנייה',
        impact: (planningAdjustment / estimatedValue) * 100,
        source: 'Planning Administration',
        description: `תכנית ${data.planning.planNumber}, אחוזי בנייה ${data.planning.buildingRights.far}%, ${data.planning.buildingRights.heightFloors} קומות`
      },
      {
        name: 'Property Condition',
        nameHe: 'מצב הנכס',
        impact: (conditionAdjustment / estimatedValue) * 100,
        source: 'Inspector Assessment',
        description: `מצב: ${prop.details.condition}, שנת בנייה ${prop.details.buildYear}`
      }
    ]

    const warnings = []
    const recommendations = []

    if (data.landRegistry.encumbrances.length > 0) {
      warnings.push(`קיימים ${data.landRegistry.encumbrances.length} שעבודים על הנכס`)
    }

    if (data.planning.violations.length > 0) {
      warnings.push(`קיימות ${data.planning.violations.length} הפרות בנייה`)
    }

    if (data.gis.floodZone) {
      warnings.push('הנכס נמצא באזור הצפה')
    }

    if (data.planning.futureChanges.length > 0) {
      recommendations.push(`${data.planning.futureChanges.length} תכניות עתידיות עשויות להשפיע על השווי`)
    }

    if (dataQuality > 80) {
      recommendations.push('איכות נתונים גבוהה - שמאות מהימנה')
    } else if (dataQuality < 60) {
      recommendations.push('מומלץ לבצע בדיקות נוספות לשיפור דיוק השמאות')
    }

    if (data.municipal.developmentPlans.length > 0) {
      recommendations.push(`${data.municipal.developmentPlans.length} תכניות פיתוח עירוניות בסביבה`)
    }

    return {
      estimatedValue,
      valueRange,
      confidenceScore: Math.round(confidenceScore),
      dataQuality: Math.round(dataQuality),
      sources: {
        landRegistry: !!data.landRegistry,
        planning: !!data.planning,
        taxAuthority: !!data.taxData,
        municipal: !!data.municipal,
        marketData: data.transactions.length > 0,
        gis: !!data.gis
      },
      breakdown: {
        baseValue: Math.round(baseValue),
        locationAdjustment: Math.round(locationAdjustment),
        conditionAdjustment: Math.round(conditionAdjustment),
        planningAdjustment: Math.round(planningAdjustment),
        marketTrendAdjustment: Math.round(marketTrendAdjustment)
      },
      factors,
      warnings,
      recommendations
    }
  }

  const calculateDataQuality = (data) => {
    let score = 0
    const weights = {
      landRegistry: 20,
      planning: 20,
      taxData: 15,
      municipal: 15,
      gis: 15,
      transactions: 15
    }

    if (data.landRegistry) score += weights.landRegistry
    if (data.planning) score += weights.planning
    if (data.taxData) score += weights.taxData
    if (data.municipal) score += weights.municipal
    if (data.gis) score += weights.gis
    if (data.transactions && data.transactions.length >= 5) score += weights.transactions

    return score
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="glass-effect border-primary/30 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkle size={28} weight="duotone" className="text-primary" />
              <h2 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
                מנוע שמאות אוטומטי
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              שמאות מדויקת המבוססת על נתונים ממשלתיים אמיתיים בזמן אמת
            </p>
          </div>
          <Button
            onClick={runAutoValuation}
            disabled={isValuating}
            size="lg"
            className="gap-2 glow-primary"
          >
            {isValuating ? (
              <>
                <ArrowsClockwise size={20} weight="bold" className="animate-spin" />
                מעריך...
              </>
            ) : (
              <>
                <Sparkle size={20} weight="bold" />
                הפעל שמאות אוטומטית
              </>
            )}
          </Button>
        </div>

        {isValuating && (
          <Card className="glass-effect border-accent/30 p-4 mb-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{currentStep}</span>
                <span className="font-mono font-bold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </Card>
        )}

        {result && (
          <Tabs defaultValue="summary" dir="rtl">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="summary">סיכום</TabsTrigger>
              <TabsTrigger value="breakdown">פירוט</TabsTrigger>
              <TabsTrigger value="factors">גורמים</TabsTrigger>
              <TabsTrigger value="data">נתונים</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-6">
              <Card className="glass-effect border-success/30 p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle size={32} weight="fill" className="text-success" />
                    <h3 className="text-xl font-semibold">שווי משוער</h3>
                  </div>
                  <div className="font-mono text-5xl font-bold text-primary">
                    ₪{result.estimatedValue.toLocaleString('he-IL')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    טווח: ₪{result.valueRange.min.toLocaleString('he-IL')} - ₪{result.valueRange.max.toLocaleString('he-IL')}
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">ציון ביטחון</div>
                      <div className="flex items-center gap-2">
                        <Progress value={result.confidenceScore} className="h-2 flex-1" />
                        <span className="font-mono font-bold text-lg">{result.confidenceScore}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">איכות נתונים</div>
                      <div className="flex items-center gap-2">
                        <Progress value={result.dataQuality} className="h-2 flex-1" />
                        <span className="font-mono font-bold text-lg">{result.dataQuality}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass-effect border-border/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Database size={20} weight="duotone" className="text-primary" />
                    <h4 className="font-semibold">מקורות נתונים</h4>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(result.sources).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {key === 'landRegistry' && 'רשם המקרקעין'}
                          {key === 'planning' && 'מינהל התכנון'}
                          {key === 'taxAuthority' && 'רשות המיסים'}
                          {key === 'municipal' && 'עירייה'}
                          {key === 'marketData' && 'נתוני שוק'}
                          {key === 'gis' && 'GIS'}
                        </span>
                        {value ? (
                          <CheckCircle size={16} weight="fill" className="text-success" />
                        ) : (
                          <Warning size={16} weight="fill" className="text-warning" />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="glass-effect border-border/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendUp size={20} weight="duotone" className="text-accent" />
                    <h4 className="font-semibold">מחיר למ"ר</h4>
                  </div>
                  <div className="font-mono text-3xl font-bold text-accent">
                    ₪{Math.round(result.estimatedValue / property.details.builtArea).toLocaleString('he-IL')}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    ל-{property.details.builtArea} מ"ר
                  </div>
                </Card>
              </div>

              {result.warnings.length > 0 && (
                <Card className="glass-effect border-warning/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Warning size={20} weight="fill" className="text-warning" />
                    <h4 className="font-semibold">אזהרות</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-warning flex items-start gap-2">
                        <span className="mt-1">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {result.recommendations.length > 0 && (
                <Card className="glass-effect border-primary/30 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkle size={20} weight="fill" className="text-primary" />
                    <h4 className="font-semibold">המלצות</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle size={16} weight="fill" className="text-success mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4">
              <Card className="glass-effect border-border/50 p-4">
                <h4 className="font-semibold mb-4">פירוט חישוב שווי</h4>
                <div className="space-y-3">
                  {Object.entries(result.breakdown).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {key === 'baseValue' && 'שווי בסיס'}
                        {key === 'locationAdjustment' && 'התאמת מיקום'}
                        {key === 'conditionAdjustment' && 'התאמת מצב'}
                        {key === 'planningAdjustment' && 'התאמת תכנון'}
                        {key === 'marketTrendAdjustment' && 'התאמת מגמת שוק'}
                      </span>
                      <span className={`font-mono font-bold ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {value >= 0 ? '+' : ''}₪{value.toLocaleString('he-IL')}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between font-bold">
                    <span>סה"כ שווי משוער</span>
                    <span className="font-mono text-xl text-primary">
                      ₪{result.estimatedValue.toLocaleString('he-IL')}
                    </span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="factors" className="space-y-4">
              {result.factors.map((factor, i) => (
                <Card key={i} className="glass-effect border-border/50 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{factor.nameHe}</h4>
                      <p className="text-xs text-muted-foreground">{factor.name}</p>
                    </div>
                    <Badge className={factor.impact >= 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}>
                      {factor.impact >= 0 ? '+' : ''}{factor.impact.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{factor.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database size={12} />
                    <span>{factor.source}</span>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              {govData && (
                <>
                  <Card className="glass-effect border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Gavel size={20} weight="duotone" className="text-primary" />
                      <h4 className="font-semibold">נתוני טאבו</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">גוש/חלקה</span>
                        <span className="font-mono">{govData.landRegistry.parcelId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">סוג בעלות</span>
                        <span>{govData.landRegistry.propertyRights.ownershipTypeHe}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">שעבודים</span>
                        <Badge variant={govData.landRegistry.encumbrances.length > 0 ? 'destructive' : 'outline'}>
                          {govData.landRegistry.encumbrances.length}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  <Card className="glass-effect border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Buildings size={20} weight="duotone" className="text-accent" />
                      <h4 className="font-semibold">תכנית בנין עיר</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">מספר תכנית</span>
                        <span className="font-mono">{govData.planning.planNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">אחוזי בנייה</span>
                        <span className="font-mono">{govData.planning.buildingRights.far}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">גובה מותר</span>
                        <span className="font-mono">{govData.planning.buildingRights.heightFloors} קומות</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="glass-effect border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins size={20} weight="duotone" className="text-warning" />
                      <h4 className="font-semibold">נתוני מיסוי</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">שווי מאזן</span>
                        <span className="font-mono">₪{govData.taxData.taxAssessedValue.toLocaleString('he-IL')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ארנונה שנתית</span>
                        <span className="font-mono">₪{govData.taxData.arnona.annualAmount.toLocaleString('he-IL')}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="glass-effect border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ChartBar size={20} weight="duotone" className="text-success" />
                      <h4 className="font-semibold">עסקאות שוק ({govData.transactions.length})</h4>
                    </div>
                    <div className="space-y-2">
                      {govData.transactions.slice(0, 5).map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 glass-effect rounded">
                          <div className="flex-1">
                            <div className="font-medium">{t.address}</div>
                            <div className="text-muted-foreground">{t.transactionDate}</div>
                          </div>
                          <div className="text-left">
                            <div className="font-mono font-bold">₪{t.price.toLocaleString('he-IL')}</div>
                            <div className="text-muted-foreground">₪{t.pricePerSqm.toLocaleString('he-IL')}/מ"ר</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  )
}