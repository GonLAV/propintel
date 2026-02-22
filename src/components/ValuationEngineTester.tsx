import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ValuationEngine, type ValuationResult } from '@/lib/valuationEngine'
import type { Property, Comparable, PropertyCondition } from '@/lib/types'
import { Calculator, TrendUp, CurrencyDollar, CheckCircle, WarningCircle, ArrowRight, FilePdf, Download } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { exportSingleValuationToPDF, exportMultipleValuationsToPDF } from '@/lib/pdfExport'
import { parseCSV } from '@/lib/csvImport'
import { ReportGenerator } from '@/lib/reportGenerator'
import type { ReportSection } from '@/lib/reportGenerator'

export function ValuationEngineTester() {
  const [testProperty, setTestProperty] = useState<Property>(createDefaultTestProperty())
  const [comparables, setComparables] = useState<Comparable[]>(createDefaultComparables())
  const [landValue, setLandValue] = useState(1500000)
  const [constructionCost, setConstructionCost] = useState(6500)
  const [monthlyRent, setMonthlyRent] = useState(5500)
  const [vacancyRate, setVacancyRate] = useState(0.05)
  const [operatingExpenseRatio, setOperatingExpenseRatio] = useState(0.30)
  const [capRate, setCapRate] = useState(0.05)
  
  const [comparableResult, setComparableResult] = useState<ValuationResult | null>(null)
  const [costResult, setCostResult] = useState<ValuationResult | null>(null)
  const [incomeResult, setIncomeResult] = useState<ValuationResult | null>(null)
  
  const [activeMethod, setActiveMethod] = useState<string>('comparable')
  const [csvInput, _setCsvInput] = useState('')
  const [_importedComparables, setImportedComparables] = useState<Comparable[]>([])
  const [_reportSections, setReportSections] = useState<ReportSection[]>([])
  const [_importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([])

  const _handleCSVImport = () => {
    if (!csvInput.trim()) {
      toast.error('קובץ CSV ריק', { description: 'הדבק קוד CSV או בחר בקובץ' })
      return
    }

    const result = parseCSV(csvInput)
    setImportedComparables(result.comparables)
    setImportErrors(result.errors)

    if (result.comparables.length > 0) {
      toast.success(`ייבוא הצליח`, {
        description: `${result.comparables.length} עסקאות ${result.errors.length > 0 ? `+ ${result.errors.length} שגיאות` : ''}`
      })
    } else if (result.errors.length > 0) {
      toast.error('ייבוא נכשל', { description: result.errors[0].message })
    }
  }

  const _handleGenerateReport = () => {
    if (!comparableResult) {
      toast.error('אין שומה', { description: 'הרץ שומה לפני יצירת דוח' })
      return
    }

    const selectedComps = comparables.filter(c => c.selected)
    const sections = ReportGenerator.generateStandardSections(
      testProperty,
      [comparableResult, costResult, incomeResult].filter(Boolean) as ValuationResult[],
      selectedComps
    )
    setReportSections(sections)
    toast.success('דוח נוצר', { description: `${sections.length} סעיפים` })
  }

  const runComparableTest = () => {
    try {
      const result = ValuationEngine.calculateComparableSalesApproach(testProperty, comparables)
      setComparableResult(result)
      toast.success('שיטת ההשוואה - החישוב הצליח', {
        description: `שווי מוערך: ₪${result.estimatedValue.toLocaleString()}`
      })
    } catch (error) {
      toast.error('שגיאה בחישוב', {
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      })
    }
  }

  const runCostTest = () => {
    try {
      const result = ValuationEngine.calculateCostApproach(testProperty, landValue, constructionCost)
      setCostResult(result)
      toast.success('שיטת העלות - החישוב הצליח', {
        description: `שווי מוערך: ₪${result.estimatedValue.toLocaleString()}`
      })
    } catch (error) {
      toast.error('שגיאה בחישוב', {
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      })
    }
  }

  const runIncomeTest = () => {
    try {
      const result = ValuationEngine.calculateIncomeApproach(
        testProperty,
        monthlyRent,
        vacancyRate,
        operatingExpenseRatio,
        capRate
      )
      setIncomeResult(result)
      toast.success('שיטת ההיוון - החישוב הצליח', {
        description: `שווי מוערך: ₪${result.estimatedValue.toLocaleString()}`
      })
    } catch (error) {
      toast.error('שגיאה בחישוב', {
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      })
    }
  }

  const runAllTests = () => {
    runComparableTest()
    runCostTest()
    runIncomeTest()
  }

  const exportToPDF = (result: ValuationResult) => {
    try {
      exportSingleValuationToPDF(result, testProperty, {
        includeCalculations: true,
        includeAssumptions: true,
        includeLimitations: true,
        includeMethodology: true,
        appraiserName: 'Professional Appraiser',
        reportDate: new Date().toLocaleDateString('en-US')
      })
      toast.success('PDF נוצר בהצלחה', {
        description: 'הדוח הורד למחשב שלך'
      })
    } catch (error) {
      toast.error('שגיאה ביצירת PDF', {
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      })
    }
  }

  const exportAllToPDF = () => {
    const results: Array<{ result: ValuationResult; property: Property }> = []
    if (comparableResult) results.push({ result: comparableResult, property: testProperty })
    if (costResult) results.push({ result: costResult, property: testProperty })
    if (incomeResult) results.push({ result: incomeResult, property: testProperty })

    if (results.length === 0) {
      toast.error('אין תוצאות לייצוא', {
        description: 'הרץ לפחות שיטת שמאות אחת לפני הייצוא'
      })
      return
    }

    try {
      exportMultipleValuationsToPDF(results, {
        includeCalculations: true,
        includeAssumptions: true,
        includeLimitations: true,
        includeMethodology: true,
        appraiserName: 'Professional Appraiser',
        reportDate: new Date().toLocaleDateString('en-US'),
        reportNumber: `VAL-${Date.now()}`
      })
      toast.success('דוח מקיף נוצר בהצלחה', {
        description: `${results.length} שיטות שמאות נכללו בדוח`
      })
    } catch (error) {
      toast.error('שגיאה ביצירת PDF', {
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      })
    }
  }

  const toggleComparable = (id: string) => {
    setComparables(prev => prev.map(c => 
      c.id === id ? { ...c, selected: !c.selected } : c
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">מנוע שמאות - מערכת בדיקה</h1>
          <p className="text-muted-foreground mt-2">בדיקת שלוש שיטות השמאות המקצועיות</p>
        </div>
        <div className="flex gap-3">
          {(comparableResult || costResult || incomeResult) && (
            <Button onClick={exportAllToPDF} size="lg" variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
              <Download size={20} weight="duotone" />
              ייצא דוח מקיף
            </Button>
          )}
          <Button onClick={runAllTests} size="lg" className="gap-2">
            <Calculator size={20} weight="duotone" />
            הפעל את כל השיטות
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 glass-effect border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <TrendUp size={24} weight="duotone" className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">שיטת ההשוואה</h3>
              <p className="text-sm text-muted-foreground">השוואת עסקאות דומות</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">סטטוס:</span>
              {comparableResult ? (
                <Badge variant="outline" className="gap-1 bg-success/10 border-success/30 text-success">
                  <CheckCircle size={14} weight="fill" />
                  הושלם
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <WarningCircle size={14} />
                  לא הורץ
                </Badge>
              )}
            </div>
            {comparableResult && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">שווי מוערך:</span>
                  <span className="font-mono font-semibold text-primary">₪{comparableResult.estimatedValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ביטחון:</span>
                  <span className="font-semibold">{comparableResult.confidence}%</span>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6 glass-effect border-accent/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/20 rounded-lg">
              <Calculator size={24} weight="duotone" className="text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">שיטת העלות</h3>
              <p className="text-sm text-muted-foreground">קרקע + בנייה - פחת</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">סטטוס:</span>
              {costResult ? (
                <Badge variant="outline" className="gap-1 bg-success/10 border-success/30 text-success">
                  <CheckCircle size={14} weight="fill" />
                  הושלם
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <WarningCircle size={14} />
                  לא הורץ
                </Badge>
              )}
            </div>
            {costResult && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">שווי מוערך:</span>
                  <span className="font-mono font-semibold text-accent">₪{costResult.estimatedValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ביטחון:</span>
                  <span className="font-semibold">{costResult.confidence}%</span>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-6 glass-effect border-success/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-success/20 rounded-lg">
              <CurrencyDollar size={24} weight="duotone" className="text-success" />
            </div>
            <div>
              <h3 className="font-semibold">שיטת ההיוון</h3>
              <p className="text-sm text-muted-foreground">NOI / שיעור היוון</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">סטטוס:</span>
              {incomeResult ? (
                <Badge variant="outline" className="gap-1 bg-success/10 border-success/30 text-success">
                  <CheckCircle size={14} weight="fill" />
                  הושלם
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <WarningCircle size={14} />
                  לא הורץ
                </Badge>
              )}
            </div>
            {incomeResult && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">שווי מוערך:</span>
                  <span className="font-mono font-semibold text-success">₪{incomeResult.estimatedValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ביטחון:</span>
                  <span className="font-semibold">{incomeResult.confidence}%</span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card className="glass-effect">
        <Tabs value={activeMethod} onValueChange={setActiveMethod}>
          <div className="border-b border-border/50 px-6 pt-6">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="comparable" className="gap-2">
                <TrendUp size={18} weight="duotone" />
                שיטת ההשוואה
              </TabsTrigger>
              <TabsTrigger value="cost" className="gap-2">
                <Calculator size={18} weight="duotone" />
                שיטת העלות
              </TabsTrigger>
              <TabsTrigger value="income" className="gap-2">
                <CurrencyDollar size={18} weight="duotone" />
                שיטת ההיוון
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="comparable" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  פרמטרים לבדיקה
                </h3>
                
                <PropertyInputs property={testProperty} onChange={setTestProperty} />
                
                <Button onClick={runComparableTest} className="w-full gap-2">
                  <Calculator size={20} weight="duotone" />
                  הפעל חישוב
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  עסקאות להשוואה ({comparables.filter(c => c.selected).length}/{comparables.length})
                </h3>
                
                <ScrollArea className="h-[400px] rounded-lg border border-border/50 p-4">
                  <div className="space-y-3">
                    {comparables.map((comp) => (
                      <div
                        key={comp.id}
                        onClick={() => toggleComparable(comp.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          comp.selected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border/50 hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium">{comp.address}</div>
                            <div className="text-sm text-muted-foreground">
                              {comp.rooms} חד׳ | {comp.builtArea} מ״ר | קומה {comp.floor}
                            </div>
                          </div>
                          {comp.selected && (
                            <CheckCircle size={20} weight="fill" className="text-primary shrink-0" />
                          )}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">מחיר: </span>
                            <span className="font-mono font-semibold">₪{comp.salePrice.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">מרחק: </span>
                            <span>{comp.distance} ק״מ</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {comparableResult && (
              <div className="mt-6">
                <ResultDisplay result={comparableResult} property={testProperty} onExportPDF={exportToPDF} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="cost" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-accent rounded-full" />
                  פרמטרים לבדיקה
                </h3>
                
                <PropertyInputs property={testProperty} onChange={setTestProperty} />

                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label htmlFor="landValue">שווי קרקע (₪)</Label>
                    <Input
                      id="landValue"
                      type="number"
                      value={landValue}
                      onChange={(e) => setLandValue(Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="constructionCost">עלות בנייה למ״ר (₪)</Label>
                    <Input
                      id="constructionCost"
                      type="number"
                      value={constructionCost}
                      onChange={(e) => setConstructionCost(Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                </div>

                <Button onClick={runCostTest} className="w-full gap-2">
                  <Calculator size={20} weight="duotone" />
                  הפעל חישוב
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-accent rounded-full" />
                  נוסחת חישוב
                </h3>
                
                <Card className="p-4 bg-accent/5 border-accent/20">
                  <div className="space-y-4 font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">שווי קרקע:</span>
                      <span className="font-semibold">₪{landValue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground">עלות בנייה:</span>
                      <span>{testProperty.details.builtArea} מ״ר × ₪{constructionCost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground">פחת:</span>
                      <span>לפי גיל ומצב</span>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">שווי סופי:</span>
                      <span className="font-bold text-accent">
                        קרקע + (בנייה - פחת)
                      </span>
                    </div>
                  </div>
                </Card>

                <Alert>
                  <AlertDescription>
                    שיטת העלות מתאימה במיוחד לנכסים חדשים, ייחודיים, או כאשר אין מספיק עסקאות דומות להשוואה.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {costResult && (
              <div className="mt-6">
                <ResultDisplay result={costResult} property={testProperty} onExportPDF={exportToPDF} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="income" className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-success rounded-full" />
                  פרמטרים לבדיקה
                </h3>
                
                <PropertyInputs property={testProperty} onChange={setTestProperty} />

                <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label htmlFor="monthlyRent">שכירות חודשית (₪)</Label>
                    <Input
                      id="monthlyRent"
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Number(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vacancyRate">שיעור פינויים (%)</Label>
                    <Input
                      id="vacancyRate"
                      type="number"
                      step="0.01"
                      value={vacancyRate * 100}
                      onChange={(e) => setVacancyRate(Number(e.target.value) / 100)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="operatingExpenseRatio">יחס הוצאות תפעול (%)</Label>
                    <Input
                      id="operatingExpenseRatio"
                      type="number"
                      step="0.01"
                      value={operatingExpenseRatio * 100}
                      onChange={(e) => setOperatingExpenseRatio(Number(e.target.value) / 100)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="capRate">שיעור היוון (%)</Label>
                    <Input
                      id="capRate"
                      type="number"
                      step="0.01"
                      value={capRate * 100}
                      onChange={(e) => setCapRate(Number(e.target.value) / 100)}
                      className="font-mono"
                    />
                  </div>
                </div>

                <Button onClick={runIncomeTest} className="w-full gap-2">
                  <Calculator size={20} weight="duotone" />
                  הפעל חישוב
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-1 h-6 bg-success rounded-full" />
                  נוסחת חישוב
                </h3>
                
                <Card className="p-4 bg-success/5 border-success/20">
                  <div className="space-y-4 font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">הכנסה שנתית:</span>
                      <span>₪{monthlyRent.toLocaleString()} × 12</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground">פינויים:</span>
                      <span>-{(vacancyRate * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground">הוצאות:</span>
                      <span>-{(operatingExpenseRatio * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground">NOI:</span>
                      <span className="font-semibold">
                        ₪{(monthlyRent * 12 * (1 - vacancyRate) * (1 - operatingExpenseRatio)).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">שווי:</span>
                      <span className="font-bold text-success">
                        NOI ÷ {(capRate * 100)}%
                      </span>
                    </div>
                  </div>
                </Card>

                <Alert>
                  <AlertDescription>
                    שיטת ההיוון מתאימה לנכסים מניבים ומבוססת על היכולת של הנכס לייצר הכנסה.
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {incomeResult && (
              <div className="mt-6">
                <ResultDisplay result={incomeResult} property={testProperty} onExportPDF={exportToPDF} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function PropertyInputs({ property, onChange }: { property: Property; onChange: (p: Property) => void }) {
  const _updateProperty = (updates: Partial<Property>) => {
    onChange({ ...property, ...updates })
  }

  const updateDetails = (updates: Partial<Property['details']>) => {
    onChange({ ...property, details: { ...property.details, ...updates } })
  }

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="builtArea">שטח בנוי (מ״ר)</Label>
          <Input
            id="builtArea"
            type="number"
            value={property.details.builtArea}
            onChange={(e) => updateDetails({ builtArea: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="rooms">חדרים</Label>
          <Input
            id="rooms"
            type="number"
            step="0.5"
            value={property.details.rooms}
            onChange={(e) => updateDetails({ rooms: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="floor">קומה</Label>
          <Input
            id="floor"
            type="number"
            value={property.details.floor}
            onChange={(e) => updateDetails({ floor: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="buildYear">שנת בנייה</Label>
          <Input
            id="buildYear"
            type="number"
            value={property.details.buildYear}
            onChange={(e) => updateDetails({ buildYear: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="condition">מצב הנכס</Label>
        <Select
          value={property.details.condition}
          onValueChange={(value: PropertyCondition) => updateDetails({ condition: value })}
        >
          <SelectTrigger id="condition">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">חדש</SelectItem>
            <SelectItem value="excellent">מצוין</SelectItem>
            <SelectItem value="good">טוב</SelectItem>
            <SelectItem value="fair">סביר</SelectItem>
            <SelectItem value="poor">גרוע</SelectItem>
            <SelectItem value="renovation-needed">דרוש שיפוץ</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ResultDisplay({ result, property: _property, onExportPDF }: { result: ValuationResult; property?: Property; onExportPDF?: (result: ValuationResult) => void }) {
  const getMethodName = (method: string) => {
    const names = {
      'comparable-sales': 'שיטת ההשוואה',
      'cost-approach': 'שיטת העלות',
      'income-approach': 'שיטת ההיוון'
    }
    return names[method as keyof typeof names] || method
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold">תוצאות החישוב</h3>
          <Badge variant="outline" className="text-base px-4 py-2">
            {getMethodName(result.method)}
          </Badge>
        </div>
        {onExportPDF && (
          <Button onClick={() => onExportPDF(result)} variant="outline" className="gap-2 border-accent/30 hover:bg-accent/10">
            <FilePdf size={20} weight="duotone" />
            ייצא ל-PDF
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-linear-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="text-sm text-muted-foreground mb-2">שווי מוערך</div>
          <div className="text-3xl font-bold font-mono text-primary">
            ₪{result.estimatedValue.toLocaleString()}
          </div>
        </Card>

        <Card className="p-6 bg-linear-to-br from-accent/10 to-accent/5 border-accent/20">
          <div className="text-sm text-muted-foreground mb-2">טווח ערכים</div>
          <div className="text-lg font-mono font-semibold">
            ₪{result.valueRange.min.toLocaleString()} - ₪{result.valueRange.max.toLocaleString()}
          </div>
        </Card>

        <Card className="p-6 bg-linear-to-br from-success/10 to-success/5 border-success/20">
          <div className="text-sm text-muted-foreground mb-2">רמת ביטחון</div>
          <div className="text-3xl font-bold font-mono text-success">
            {result.confidence}%
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h4 className="font-semibold mb-4">מתודולוגיה</h4>
        <p className="text-muted-foreground leading-relaxed">{result.methodology}</p>
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-4">שלבי החישוב</h4>
        <div className="space-y-4">
          {result.calculations.map((calc, index) => (
            <div key={index} className="border-r-2 border-primary/30 pr-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">{index + 1}</Badge>
                <h5 className="font-semibold">{calc.step}</h5>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{calc.description}</p>
              <div className="bg-muted/30 p-3 rounded-lg">
                <div className="font-mono text-sm mb-2">{calc.formula}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(calc.inputs).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">תוצאה:</span>
                  <span className="font-mono font-bold text-lg">₪{calc.result.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-4">מסקנות</h4>
        <p className="text-muted-foreground leading-relaxed">{result.reconciliation}</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h4 className="font-semibold mb-4">הנחות יסוד</h4>
          <ul className="space-y-2">
            {result.assumptions.map((assumption, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-success shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{assumption}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold mb-4">מגבלות</h4>
          <ul className="space-y-2">
            {result.limitations.map((limitation, index) => (
              <li key={index} className="flex gap-2 text-sm">
                <WarningCircle size={16} weight="fill" className="text-warning shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{limitation}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function createDefaultTestProperty(): Property {
  return {
    id: 'test-property-1',
    clientId: 'test-client-1',
    status: 'in-progress',
    address: {
      street: 'רחוב הרצל 15',
      city: 'תל אביב',
      neighborhood: 'פלורנטין',
      postalCode: '6801234'
    },
    type: 'apartment',
    details: {
      builtArea: 85,
      totalArea: 85,
      rooms: 3.5,
      bedrooms: 2,
      bathrooms: 1,
      floor: 3,
      totalFloors: 5,
      buildYear: 2010,
      condition: 'good',
      parking: 1,
      storage: true,
      balcony: true,
      elevator: true,
      accessible: false
    },
    features: ['elevator', 'parking', 'storage', 'balcony'],
    description: 'דירת 3.5 חדרים בפלורנטין',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

function createDefaultComparables(): Comparable[] {
  return [
    {
      id: 'comp-1',
      address: 'רחוב לוינסקי 22, תל אביב',
      type: 'apartment',
      salePrice: 2850000,
      saleDate: '2024-01-15',
      builtArea: 82,
      rooms: 3.5,
      floor: 2,
      distance: 0.3,
      adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
      adjustedPrice: 2850000,
      pricePerSqm: 34756,
      selected: true,
      similarityScore: 92
    },
    {
      id: 'comp-2',
      address: 'רחוב נחלת בנימין 8, תל אביב',
      type: 'apartment',
      salePrice: 3100000,
      saleDate: '2024-02-01',
      builtArea: 90,
      rooms: 4,
      floor: 4,
      distance: 0.5,
      adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
      adjustedPrice: 3100000,
      pricePerSqm: 34444,
      selected: true,
      similarityScore: 88
    },
    {
      id: 'comp-3',
      address: 'רחוב שנקין 45, תל אביב',
      type: 'apartment',
      salePrice: 2950000,
      saleDate: '2023-12-20',
      builtArea: 87,
      rooms: 3.5,
      floor: 1,
      distance: 0.8,
      adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
      adjustedPrice: 2950000,
      pricePerSqm: 33908,
      selected: true,
      similarityScore: 85
    },
    {
      id: 'comp-4',
      address: 'רחוב אלנבי 120, תל אביב',
      type: 'apartment',
      salePrice: 2650000,
      saleDate: '2024-01-08',
      builtArea: 75,
      rooms: 3,
      floor: 5,
      distance: 1.2,
      adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
      adjustedPrice: 2650000,
      pricePerSqm: 35333,
      selected: false,
      similarityScore: 75
    },
    {
      id: 'comp-5',
      address: 'רחוב בן יהודה 33, תל אביב',
      type: 'apartment',
      salePrice: 3350000,
      saleDate: '2023-11-15',
      builtArea: 95,
      rooms: 4,
      floor: 6,
      distance: 1.5,
      adjustments: { location: 0, size: 0, condition: 0, floor: 0, age: 0, features: 0, total: 0 },
      adjustedPrice: 3350000,
      pricePerSqm: 35263,
      selected: false,
      similarityScore: 70
    }
  ]
}
