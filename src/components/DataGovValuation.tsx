import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, TrendUp, CheckCircle, Warning, Info, Sparkle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { performCompleteValuation, generateAppraisalPrompt, type CleanTransaction, type DataGovValuationResult } from '@/lib/dataGovAPI'
import { createAppraisalRecord, addAIAnalysis, exportAppraisalToCSV, type AppraisalRecord } from '@/lib/appraisalSchema'
import { createLogger } from '@/lib/logger'

const log = createLogger('DataGovValuation')

interface DataGovValuationProps {
  propertyId: string
  initialCity?: string
  initialStreet?: string
  initialArea?: number
  onValuationComplete?: (record: AppraisalRecord) => void
}

export function DataGovValuation({
  propertyId,
  initialCity = '',
  initialStreet = '',
  initialArea = 0,
  onValuationComplete
}: DataGovValuationProps) {
  const [city, setCity] = useState(initialCity)
  const [street, setStreet] = useState(initialStreet)
  const [area, setArea] = useState(initialArea)
  const [rooms, setRooms] = useState<number>(0)
  const [floor, setFloor] = useState<number>(0)
  
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  
  const [transactions, setTransactions] = useState<CleanTransaction[]>([])
  const [valuation, setValuation] = useState<DataGovValuationResult | null>(null)
  const [appraisalRecord, setAppraisalRecord] = useState<AppraisalRecord | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string>('')
  
  const [activeTab, setActiveTab] = useState('input')

  const handleFetchAndCalculate = async () => {
    if (!city || !area || area <= 0) {
      toast.error('אנא מלא את כל השדות החובה')
      return
    }

    setIsLoading(true)
    setProgress(0)
    setCurrentStep('מתחבר ל-data.gov.il...')

    try {
      setProgress(20)
      setCurrentStep('שולף עסקאות מהממשלה...')
      
      const result = await performCompleteValuation({
        city,
        street: street || undefined,
        targetArea: area,
        propertyDetails: {
          rooms: rooms || undefined,
          floor: floor || undefined,
        }
      })

      setProgress(60)
      setCurrentStep('מנקה ומנרמל נתונים...')
      
      setTransactions(result.transactions)
      setValuation(result.valuation)

      setProgress(80)
      setCurrentStep('יוצר רשומת שמאות...')
      
      const record = createAppraisalRecord({
        propertyId,
        property: {
          city,
          street: street || '',
          area,
          rooms: rooms || undefined,
          floor: floor || undefined,
        },
        marketData: {
          source: 'data.gov.il',
          fetchedAt: new Date().toISOString(),
          sampleSize: result.transactions.length,
          avgPricePerSqm: Math.round(
            result.transactions.reduce((sum, t) => sum + t.pricePerSqm, 0) / result.transactions.length
          ),
          medianPricePerSqm: result.valuation.pricePerSqm,
          dataQuality: result.valuation.dataQuality,
          transactions: result.transactions
        },
        valuation: result.valuation,
        metadata: {
          appraiser: 'מערכת',
          purpose: 'הערכת שווי אוטומטית'
        }
      })

      setAppraisalRecord(record)
      setProgress(100)
      setCurrentStep('הושלם!')
      
      toast.success(`נמצאו ${result.transactions.length} עסקאות רלוונטיות מ-data.gov.il`)
      setActiveTab('results')

    } catch (error) {
      log.error('Valuation error:', error)
      toast.error(error instanceof Error ? error.message : 'שגיאה בשליפת נתונים')
    } finally {
      setIsLoading(false)
      setProgress(0)
      setCurrentStep('')
    }
  }

  const handleGenerateAIAnalysis = async () => {
    if (!valuation || !transactions.length || !appraisalRecord) {
      toast.error('קודם יש לבצע שמאות')
      return
    }

    setIsLoading(true)
    setCurrentStep('מפעיל ניתוח AI...')

    try {
      const prompt = generateAppraisalPrompt({
        propertyDetails: {
          city,
          street: street || '',
          area,
          rooms: rooms || undefined,
          floor: floor || undefined,
        },
        transactions,
        valuationResult: valuation
      })

      const raw = await window.spark.llm(prompt, 'gpt-4o', true)

      const parsed: unknown = (() => {
        if (raw && typeof raw === 'object') return raw as unknown
        if (typeof raw === 'string') return JSON.parse(raw) as unknown
        throw new Error('Invalid AI response type')
      })()

      const normalized = normalizeDataGovAIAnalysis(parsed, {
        estimatedValue: valuation.estimatedValue,
        pricePerSqm: valuation.pricePerSqm,
        confidence: valuation.confidence,
        maxComparables: Math.min(10, transactions.length)
      })

      setAiAnalysis(JSON.stringify(normalized, null, 2))
      
      const updatedRecord = addAIAnalysis(appraisalRecord, JSON.stringify(normalized), 'מערכת')
      setAppraisalRecord(updatedRecord)
      
      if (onValuationComplete) {
        onValuationComplete(updatedRecord)
      }

      toast.success('ניתוח AI הושלם בהצלחה')
      setActiveTab('ai-analysis')

    } catch (error) {
      log.error('AI analysis error:', error)
      toast.error('שגיאה ביצירת ניתוח AI')
    } finally {
      setIsLoading(false)
      setCurrentStep('')
    }
  }

  const normalizeDataGovAIAnalysis = (
    input: unknown,
    constraints: {
      estimatedValue: number
      pricePerSqm: number
      confidence: DataGovValuationResult['confidence']
      maxComparables: number
    }
  ) => {
    const forbidden = /(\bרחוב\b|שדרות|דרך|סמטת|שכונת)/
    const stringifyAll = JSON.stringify(input ?? {})
    if (forbidden.test(stringifyAll)) {
      toast.warning('ה-AI כלל כתובות/רחובות — הוסרו לשמירה על דיוק')
    }

    const asObj = (val: unknown) => (val && typeof val === 'object' ? (val as Record<string, unknown>) : {})
    const safeArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
    const clampInt = (n: unknown, min: number, max: number): number | null => {
      const v = typeof n === 'number' ? n : parseInt(String(n), 10)
      if (!Number.isFinite(v)) return null
      const i = Math.trunc(v)
      if (i < min || i > max) return null
      return i
    }

    const comparablesUsed = Array.from(
      new Set(
        safeArray(asObj(input).comparablesUsed)
          .map((x) => clampInt(x, 1, constraints.maxComparables))
          .filter((x): x is number => x !== null)
      )
    )

    return {
      estimatedValue: constraints.estimatedValue,
      pricePerSqm: constraints.pricePerSqm,
      confidence: constraints.confidence,
      comparablesUsed,
      adjustments: safeArray(asObj(input).adjustments).map((a) => {
        const rec = a as Record<string, unknown>
        return {
          type: String(rec?.type || ''),
          direction: String(rec?.direction || ''),
          reason: String(rec?.reason || '')
        }
      }),
      reasoning: safeArray(asObj(input).reasoning).map((x) => String(x)),
      limitations: safeArray(asObj(input).limitations).map((x) => String(x)),
      nextSteps: safeArray(asObj(input).nextSteps).map((x) => String(x))
    }
  }

  const handleExportCSV = () => {
    if (!appraisalRecord) return

    const csv = exportAppraisalToCSV(appraisalRecord)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `transactions_${city}_${Date.now()}.csv`
    link.click()

    toast.success('קובץ CSV הורד בהצלחה')
  }

  const getConfidenceBadge = (confidence: DataGovValuationResult['confidence']) => {
    const config = {
      high: { label: 'גבוהה', color: 'bg-success text-success-foreground' },
      medium: { label: 'בינונית', color: 'bg-warning text-warning-foreground' },
      low: { label: 'נמוכה', color: 'bg-destructive text-destructive-foreground' }
    }
    const c = config[confidence]
    return <Badge className={c.color}>{c.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="w-6 h-6 text-primary" weight="fill" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">שמאות עם data.gov.il</h2>
            <p className="text-sm text-muted-foreground">
              שליפת נתונים אמיתיים ממאגרי הממשלה + ניתוח AI מקצועי
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Info className="w-5 h-5 text-primary" />
          <p className="text-sm">
            המערכת משתמשת ב-API הרשמי של data.gov.il לשליפת עסקאות אמיתיות מרשם המקרקעין
          </p>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="input">פרטי נכס</TabsTrigger>
          <TabsTrigger value="results" disabled={!valuation}>תוצאות</TabsTrigger>
          <TabsTrigger value="transactions" disabled={!transactions.length}>עסקאות</TabsTrigger>
          <TabsTrigger value="ai-analysis" disabled={!aiAnalysis}>ניתוח AI</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">פרטי הנכס לשמאות</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">עיר *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="תל אביב-יפו"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">רחוב (אופציונלי)</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="רוטשילד"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">שטח (מ"ר) *</Label>
                <Input
                  id="area"
                  type="number"
                  value={area || ''}
                  onChange={(e) => setArea(parseFloat(e.target.value) || 0)}
                  placeholder="95"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rooms">חדרים</Label>
                <Input
                  id="rooms"
                  type="number"
                  value={rooms || ''}
                  onChange={(e) => setRooms(parseFloat(e.target.value) || 0)}
                  placeholder="3.5"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">קומה</Label>
                <Input
                  id="floor"
                  type="number"
                  value={floor || ''}
                  onChange={(e) => setFloor(parseInt(e.target.value) || 0)}
                  placeholder="2"
                  disabled={isLoading}
                />
              </div>
            </div>

            {isLoading && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{currentStep}</span>
                  <span className="font-mono text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleFetchAndCalculate}
                disabled={isLoading || !city || !area}
                className="flex-1"
              >
                <Database className="ml-2" />
                שלוף נתונים וחשב שומה
              </Button>
              
              {valuation && (
                <Button
                  onClick={handleGenerateAIAnalysis}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <Sparkle className="ml-2" />
                  צור ניתוח AI מקצועי
                </Button>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {valuation && appraisalRecord && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">הערכת שווי</div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    ₪{valuation.estimatedValue.toLocaleString('he-IL')}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">מחיר למ"ר</div>
                  <div className="text-2xl font-bold font-mono">
                    ₪{valuation.pricePerSqm.toLocaleString('he-IL')}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">רמת ודאות</div>
                  <div className="mt-2">{getConfidenceBadge(valuation.confidence)}</div>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendUp className="w-5 h-5 text-primary" />
                  פירוט תוצאות
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">טווח ערכים:</span>
                      <span className="font-mono">
                        ₪{valuation.valueRange.min.toLocaleString('he-IL')} - 
                        ₪{valuation.valueRange.max.toLocaleString('he-IL')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">גודל מדגם:</span>
                      <span className="font-semibold">{valuation.sampleSize} עסקאות</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">איכות נתונים:</span>
                      <span className="font-semibold">{valuation.dataQuality}%</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">שיטה:</span>
                      <span>השוואה</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">מקור נתונים:</span>
                      <Badge variant="outline">
                        <CheckCircle className="ml-1 w-3 h-3" weight="fill" />
                        data.gov.il
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">תאריך:</span>
                      <span className="text-sm">
                        {new Date(valuation.calculationDate).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button onClick={handleExportCSV} variant="outline" size="sm">
                    ייצא עסקאות ל-CSV
                  </Button>
                </div>
              </Card>

              {valuation.confidence === 'low' && (
                <Card className="p-4 border-warning bg-warning/5">
                  <div className="flex items-start gap-3">
                    <Warning className="w-5 h-5 text-warning mt-0.5" weight="fill" />
                    <div className="text-sm">
                      <div className="font-semibold mb-1">רמת ודאות נמוכה</div>
                      <p className="text-muted-foreground">
                        נמצאו מעט עסקאות דומות. מומלץ להרחיב את קריטריוני החיפוש או להוסיף עסקאות השוואה ידניות.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                עסקאות מ-data.gov.il ({transactions.length})
              </h3>
              <Badge variant="outline">ממשלתי מאומת</Badge>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <Card key={tx.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">
                          {index + 1}. {tx.street} {tx.houseNumber}, {tx.city}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 space-x-3 space-x-reverse">
                          <span>שטח: {tx.area} מ"ר</span>
                          {tx.rooms > 0 && <span>חדרים: {tx.rooms}</span>}
                          {tx.floor !== 0 && <span>קומה: {tx.floor}</span>}
                          <span>תאריך: {tx.date}</span>
                        </div>
                      </div>
                      <div className="text-left mr-4">
                        <div className="font-bold font-mono text-primary">
                          ₪{tx.price.toLocaleString('he-IL')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ₪{Math.round(tx.pricePerSqm).toLocaleString('he-IL')}/מ"ר
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="ai-analysis">
          {aiAnalysis && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkle className="w-5 h-5 text-primary" weight="fill" />
                </div>
                <h3 className="font-semibold">ניתוח AI מקצועי</h3>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {aiAnalysis}
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {appraisalRecord && (
        <Card className="p-4 bg-muted/30">
          <div className="text-xs text-muted-foreground">
            <div className="font-semibold mb-2">מסלול ביקורת (Audit Trail)</div>
            <div className="space-y-1">
              {appraisalRecord.auditTrail.map((entry, index) => (
                <div key={index} className="flex justify-between">
                  <span>{entry.action}</span>
                  <span>{new Date(entry.timestamp).toLocaleString('he-IL')}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
