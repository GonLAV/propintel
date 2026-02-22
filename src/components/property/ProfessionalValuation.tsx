import { useState } from 'react'
import type { Property, Comparable } from '@/lib/types'
import { ValuationEngine, type ValuationResult } from '@/lib/valuationEngine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Calculator,
  Sparkle,
  TrendUp,
  CheckCircle,
  Info,
  Warning,
  FileText,
  CurrencyDollar
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface ProfessionalValuationProps {
  property: Property
  comparables: Comparable[]
  onSaveValuation: (result: ValuationResult) => void
}

export function ProfessionalValuation({ property, comparables, onSaveValuation }: ProfessionalValuationProps) {
  const [activeMethod, setActiveMethod] = useState<'comparable' | 'cost' | 'income'>('comparable')
  const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [proMode, setProMode] = useState(true)

  const [landValue, setLandValue] = useState(500000)
  const [constructionCost, setConstructionCost] = useState(6500)
  const [monthlyRent, setMonthlyRent] = useState(5000)
  const [capRate, setCapRate] = useState(5)
  const [vacancyRate, setVacancyRate] = useState(5)
  const [expenseRatio, setExpenseRatio] = useState(30)

  const handleCalculate = async () => {
    setCalculating(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      let result: ValuationResult

      switch (activeMethod) {
        case 'comparable':
          result = proMode
            ? ValuationEngine.calculateComparableSalesApproachProfessional(property, comparables)
            : ValuationEngine.calculateComparableSalesApproach(property, comparables)
          break
        case 'cost':
          result = ValuationEngine.calculateCostApproach(property, landValue, constructionCost)
          break
        case 'income':
          result = ValuationEngine.calculateIncomeApproach(
            property,
            monthlyRent,
            vacancyRate / 100,
            expenseRatio / 100,
            capRate / 100
          )
          break
      }

      setValuationResult(result)
      toast.success('החישוב הושלם בהצלחה')
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בחישוב השומה')
    } finally {
      setCalculating(false)
    }
  }

  const handleSave = () => {
    if (valuationResult) {
      onSaveValuation(valuationResult)
      toast.success('השומה נשמרה בהצלחה')
    }
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <Calculator size={28} weight="duotone" className="text-primary" />
                מחשבון שמאי מקצועי
              </CardTitle>
              <CardDescription className="mt-2">
                חישוב שווי נכס בשיטות מקובלות לפי התקן הישראלי
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as any)} dir="rtl">
        <TabsList className="glass-effect w-full grid grid-cols-3">
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

        <TabsContent value="comparable" className="space-y-4 mt-6">
          <Card className="glass-effect border-border">
            <CardHeader>
              <CardTitle className="text-lg">שיטת ההשוואה</CardTitle>
              <CardDescription>
                שומה מבוססת השוואה לעסקאות דומות באזור
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="text-sm">
                  <p className="font-semibold">מצב חישוב</p>
                  <p className="text-muted-foreground">סטנדרטי מול מקצועי (סינון קשיח + התאמות אבסולוטיות)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs">Standard</span>
                  <Switch checked={proMode} onCheckedChange={setProMode} />
                  <span className="text-xs">Professional</span>
                </div>
              </div>
              <div className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-primary mt-1" weight="duotone" />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">דרישות לחישוב:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>לפחות 3 עסקאות דומות שנבחרו</li>
                      <li>העסקאות מהשנתיים האחרונות</li>
                      <li>נכסים דומים במיקום, גודל וסוג</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>עסקאות נבחרות</Label>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold font-mono">
                    {comparables.filter(c => c.selected).length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    מתוך {comparables.length} עסקאות זמינות
                  </p>
                </div>
              </div>

              {comparables.filter(c => c.selected).length > 0 && (
                <div className="space-y-2">
                  <Label>טווח מחירים</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">מחיר מינימום</p>
                      <p className="text-lg font-mono">
                        ₪{Math.min(...comparables.filter(c => c.selected).map(c => c.salePrice)).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">מחיר מקסימום</p>
                      <p className="text-lg font-mono">
                        ₪{Math.max(...comparables.filter(c => c.selected).map(c => c.salePrice)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleCalculate}
                disabled={calculating || comparables.filter(c => c.selected).length < 3}
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                {calculating ? (
                  <>
                    <Sparkle size={20} weight="fill" className="animate-spin" />
                    מחשב...
                  </>
                ) : (
                  <>
                    <Calculator size={20} weight="duotone" />
                    חשב שווי בשיטת ההשוואה
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4 mt-6">
          <Card className="glass-effect border-border">
            <CardHeader>
              <CardTitle className="text-lg">שיטת העלות</CardTitle>
              <CardDescription>
                שומה מבוססת ערך קרקע + עלות בנייה - פחת
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-primary mt-1" weight="duotone" />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">מתאים במקרים הבאים:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>נכסים חדשים או ייחודיים</li>
                      <li>מחסור בעסקאות דומות</li>
                      <li>נכסי ביניים ורכישות קומבינציה</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>ערך קרקע משוער (₪)</Label>
                <Input
                  type="number"
                  value={landValue}
                  onChange={(e) => setLandValue(Number(e.target.value))}
                  className="bg-secondary/50 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  ערך הקרקע לפי מחירי שוק באזור
                </p>
              </div>

              <div className="space-y-2">
                <Label>עלות בנייה למ"ר (₪)</Label>
                <Input
                  type="number"
                  value={constructionCost}
                  onChange={(e) => setConstructionCost(Number(e.target.value))}
                  className="bg-secondary/50 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  עלות בנייה חלופית מקובלת: ₪5,500-₪8,000 למ"ר
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">שנת בנייה</p>
                    <p className="font-mono font-semibold">{property.details.buildYear}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">גיל הנכס</p>
                    <p className="font-mono font-semibold">
                      {new Date().getFullYear() - property.details.buildYear} שנים
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">שטח בנוי</p>
                    <p className="font-mono font-semibold">{property.details.builtArea} מ"ר</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">מצב</p>
                    <p className="font-semibold capitalize">{property.details.condition}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={calculating}
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                {calculating ? (
                  <>
                    <Sparkle size={20} weight="fill" className="animate-spin" />
                    מחשב...
                  </>
                ) : (
                  <>
                    <Calculator size={20} weight="duotone" />
                    חשב שווי בשיטת העלות
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-4 mt-6">
          <Card className="glass-effect border-border">
            <CardHeader>
              <CardTitle className="text-lg">שיטת ההיוון</CardTitle>
              <CardDescription>
                שומה מבוססת הכנסה מהשכרה והיוון תזרים מזומנים
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-primary mt-1" weight="duotone" />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold">מתאים עבור:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                      <li>נכסים מניבים (דירות להשכרה, מסחרי)</li>
                      <li>השקעות נדל"ן</li>
                      <li>נכסים המושכרים באופן קבוע</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>שכירות חודשית (₪)</Label>
                <Input
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(Number(e.target.value))}
                  className="bg-secondary/50 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  שכירות שוק מקובלת לנכס דומה
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שיעור היוון (%)</Label>
                  <Input
                    type="number"
                    value={capRate}
                    onChange={(e) => setCapRate(Number(e.target.value))}
                    className="bg-secondary/50 font-mono"
                    step="0.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    מקובל: 4%-6%
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>שיעור פינויים (%)</Label>
                  <Input
                    type="number"
                    value={vacancyRate}
                    onChange={(e) => setVacancyRate(Number(e.target.value))}
                    className="bg-secondary/50 font-mono"
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    מקובל: 3%-8%
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>יחס הוצאות תפעול (%)</Label>
                <Input
                  type="number"
                  value={expenseRatio}
                  onChange={(e) => setExpenseRatio(Number(e.target.value))}
                  className="bg-secondary/50 font-mono"
                  step="1"
                />
                <p className="text-xs text-muted-foreground">
                  כולל ועד בית, ארנונה, תחזוקה, ביטוח. מקובל: 25%-35%
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">הכנסה שנתית ברוטו</p>
                    <p className="font-mono font-semibold">₪{(monthlyRent * 12).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">הכנסה אפקטיבית</p>
                    <p className="font-mono font-semibold">
                      ₪{(monthlyRent * 12 * (1 - vacancyRate / 100)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={calculating}
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                {calculating ? (
                  <>
                    <Sparkle size={20} weight="fill" className="animate-spin" />
                    מחשב...
                  </>
                ) : (
                  <>
                    <Calculator size={20} weight="duotone" />
                    חשב שווי בשיטת ההיוון
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {valuationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-effect border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <CheckCircle size={28} weight="fill" className="text-success" />
                  תוצאות השומה
                </CardTitle>
                <Badge className="bg-success/10 text-success border-success/20 text-base px-4 py-2">
                  ביטחון: {valuationResult.confidence}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-6 bg-linear-to-br from-primary/10 to-accent/10 rounded-xl">
                <p className="text-sm text-muted-foreground mb-2">שווי משוער</p>
                <p className="text-5xl font-bold font-mono mb-3">
                  ₪{valuationResult.estimatedValue.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  טווח: ₪{valuationResult.valueRange.min.toLocaleString()} - ₪{valuationResult.valueRange.max.toLocaleString()}
                </p>
              </div>

              <Separator />

              {valuationResult.transactionDetails && valuationResult.transactionDetails.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">פירוט עסקאות והשפעת התאמות</h4>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-right p-2">כתובת</th>
                          <th className="text-right p-2">מחיר עסקה</th>
                          <th className="text-right p-2">שטח</th>
                          <th className="text-right p-2">קומה</th>
                          <th className="text-right p-2">מצב</th>
                          <th className="text-right p-2">מחיר מתוקן</th>
                          <th className="text-right p-2">משקל</th>
                        </tr>
                      </thead>
                      <tbody>
                        {valuationResult.transactionDetails.map((t) => (
                          <tr key={t.id} className="border-t border-border">
                            <td className="p-2">{t.address}</td>
                            <td className="p-2 font-mono">₪{t.basePrice.toLocaleString()}</td>
                            <td className="p-2 font-mono">₪{(t.adjustments.areaAdj || 0).toLocaleString()}</td>
                            <td className="p-2 font-mono">₪{(t.adjustments.floorAdj || 0).toLocaleString()}</td>
                            <td className="p-2 font-mono">₪{(t.adjustments.conditionAdj || 0).toLocaleString()}</td>
                            <td className="p-2 font-mono font-semibold">₪{t.adjustedPrice.toLocaleString()}</td>
                            <td className="p-2 font-mono">{t.weight.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText size={18} weight="duotone" />
                  מתודולוגיה
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {valuationResult.methodology}
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">שלבי החישוב</h4>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {valuationResult.calculations.map((calc, index) => (
                      <div key={index} className="p-4 bg-secondary/30 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold">{calc.step}</h5>
                          <Badge variant="outline" className="font-mono">
                            ₪{calc.result.toLocaleString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{calc.description}</p>
                        <div className="p-2 bg-muted/50 rounded font-mono text-xs">
                          {calc.formula}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(calc.inputs).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-mono">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">השלמת שווי</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {valuationResult.reconciliation}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Info size={18} weight="duotone" className="text-primary" />
                    הנחות יסוד
                  </h4>
                  <ul className="space-y-2">
                    {valuationResult.assumptions.map((assumption, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Warning size={18} weight="duotone" className="text-warning" />
                    מגבלות
                  </h4>
                  <ul className="space-y-2">
                    {valuationResult.limitations.map((limitation, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-warning mt-1">•</span>
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="lg"
                >
                  <CheckCircle size={20} weight="fill" />
                  שמור שומה
                </Button>
                <Button
                  onClick={() => setValuationResult(null)}
                  variant="outline"
                  size="lg"
                >
                  חשב מחדש
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
