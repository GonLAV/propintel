import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  CurrencyDollar, 
  Calculator, 
  TrendDown,
  ChartLine,
  FileText,
  Info
} from '@phosphor-icons/react'
import { 
  CostApproachCalculator as CostCalculator,
  type ConstructionCostParams,
  type DepreciationParams,
  type LandValue,
  type CostApproachResult
} from '@/lib/calculators/costApproachCalculator'

export function CostApproachCalculator() {
  const [buildingType, setBuildingType] = useState<ConstructionCostParams['buildingType']>('residential')
  const [quality, setQuality] = useState<ConstructionCostParams['quality']>('standard')
  const [area, setArea] = useState('100')
  const [floors, setFloors] = useState('1')
  const [finishLevel, setFinishLevel] = useState<ConstructionCostParams['finishLevel']>('standard')
  
  const [buildingAge, setBuildingAge] = useState('10')
  const [effectiveAge, setEffectiveAge] = useState('10')
  const [totalLifespan, setTotalLifespan] = useState('75')
  const [physicalDeteriorationPercent, setPhysicalDeteriorationPercent] = useState('0')
  const [functionalObsolescencePercent, setFunctionalObsolescencePercent] = useState('0')
  const [economicObsolescencePercent, setEconomicObsolescencePercent] = useState('0')
  
  const [landArea, setLandArea] = useState('250')
  const [landPricePerSqm, setLandPricePerSqm] = useState('5000')
  const [landSource, setLandSource] = useState('עסקאות השוואה')
  
  const [result, setResult] = useState<CostApproachResult | null>(null)
  const [_showFormula, _setShowFormula] = useState(true)

  const handleCalculate = () => {
    const constructionParams: ConstructionCostParams = {
      buildingType,
      quality,
      area: parseFloat(area) || 0,
      floors: parseInt(floors) || 1,
      finishLevel
    }

    const depreciationParams: DepreciationParams = {
      buildingAge: parseFloat(buildingAge) || 0,
      effectiveAge: parseFloat(effectiveAge) || 0,
      totalLifespan: parseFloat(totalLifespan) || 75,
      physicalDeteriorationPercent: parseFloat(physicalDeteriorationPercent) || 0,
      functionalObsolescencePercent: parseFloat(functionalObsolescencePercent) || 0,
      economicObsolescencePercent: parseFloat(economicObsolescencePercent) || 0
    }

    const landValue: LandValue = {
      landArea: parseFloat(landArea) || 0,
      pricePerSqm: parseFloat(landPricePerSqm) || 0,
      totalLandValue: (parseFloat(landArea) || 0) * (parseFloat(landPricePerSqm) || 0),
      source: landSource,
      valuationDate: new Date()
    }

    const calculationResult = CostCalculator.calculate(
      constructionParams,
      depreciationParams,
      landValue
    )

    setResult(calculationResult)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CurrencyDollar size={32} weight="duotone" className="text-primary" />
            מחשבון שיטת העלות
          </h2>
          <p className="text-muted-foreground mt-1">
            חישוב שווי לפי עלות בנייה בניכוי פחת ובתוספת ערך קרקע
          </p>
        </div>
        <Button onClick={handleCalculate} size="lg" className="gap-2">
          <Calculator size={20} weight="duotone" />
          חשב שווי
        </Button>
      </div>

      <Alert>
        <Info size={20} weight="duotone" />
        <AlertDescription>
          <strong>שיטת העלות</strong> מתאימה במיוחד לנכסים חדשים, נכסים מיוחדים, או כאשר אין מספיק עסקאות השוואה.
          הנוסחה: <code className="font-mono bg-muted px-2 py-0.5 rounded">שווי = ערך קרקע + (עלות בנייה - פחת)</code>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyDollar size={24} weight="duotone" />
              1. פרמטרי בנייה
            </CardTitle>
            <CardDescription>
              הגדרת מאפייני המבנה ועלויות בנייה
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buildingType">סוג מבנה</Label>
              <Select value={buildingType} onValueChange={(v) => setBuildingType(v as any)}>
                <SelectTrigger id="buildingType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">מגורים</SelectItem>
                  <SelectItem value="commercial">מסחרי</SelectItem>
                  <SelectItem value="industrial">תעשייה</SelectItem>
                  <SelectItem value="luxury">יוקרה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality">רמת איכות</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as any)}>
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">בסיסית</SelectItem>
                  <SelectItem value="standard">סטנדרטית</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="luxury">יוקרה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">שטח בנוי (מ"ר)</Label>
                <Input
                  id="area"
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="floors">קומות</Label>
                <Input
                  id="floors"
                  type="number"
                  value={floors}
                  onChange={(e) => setFloors(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finishLevel">רמת גימור</Label>
              <Select value={finishLevel} onValueChange={(v) => setFinishLevel(v as any)}>
                <SelectTrigger id="finishLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shell">גמר גס (קליפה)</SelectItem>
                  <SelectItem value="basic">גמר בסיסי</SelectItem>
                  <SelectItem value="standard">גמר סטנדרטי</SelectItem>
                  <SelectItem value="premium">גמר פרימיום</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendDown size={24} weight="duotone" />
              2. פרמטרי פחת
            </CardTitle>
            <CardDescription>
              חישוב ירידת ערך לאורך זמן
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buildingAge">גיל בניין (שנים)</Label>
                <Input
                  id="buildingAge"
                  type="number"
                  value={buildingAge}
                  onChange={(e) => {
                    setBuildingAge(e.target.value)
                    setEffectiveAge(e.target.value)
                  }}
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveAge">גיל אפקטיבי</Label>
                <Input
                  id="effectiveAge"
                  type="number"
                  value={effectiveAge}
                  onChange={(e) => setEffectiveAge(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalLifespan">תוחלת חיים כוללת (שנים)</Label>
              <Input
                id="totalLifespan"
                type="number"
                value={totalLifespan}
                onChange={(e) => setTotalLifespan(e.target.value)}
                placeholder="75"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="physicalDeteriorationPercent">
                פחת פיזי נוסף (%)
                <span className="text-xs text-muted-foreground mr-2">- אופציונלי</span>
              </Label>
              <Input
                id="physicalDeteriorationPercent"
                type="number"
                value={physicalDeteriorationPercent}
                onChange={(e) => setPhysicalDeteriorationPercent(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="functionalObsolescencePercent">
                התיישנות תפקודית (%)
                <span className="text-xs text-muted-foreground mr-2">- אופציונלי</span>
              </Label>
              <Input
                id="functionalObsolescencePercent"
                type="number"
                value={functionalObsolescencePercent}
                onChange={(e) => setFunctionalObsolescencePercent(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="economicObsolescencePercent">
                התיישנות כלכלית (%)
                <span className="text-xs text-muted-foreground mr-2">- אופציונלי</span>
              </Label>
              <Input
                id="economicObsolescencePercent"
                type="number"
                value={economicObsolescencePercent}
                onChange={(e) => setEconomicObsolescencePercent(e.target.value)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLine size={24} weight="duotone" />
              3. ערך קרקע
            </CardTitle>
            <CardDescription>
              שווי הקרקע נפרד מהבנייה
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="landArea">שטח קרקע (מ"ר)</Label>
                <Input
                  id="landArea"
                  type="number"
                  value={landArea}
                  onChange={(e) => setLandArea(e.target.value)}
                  placeholder="250"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landPricePerSqm">מחיר למ"ר (₪)</Label>
                <Input
                  id="landPricePerSqm"
                  type="number"
                  value={landPricePerSqm}
                  onChange={(e) => setLandPricePerSqm(e.target.value)}
                  placeholder="5000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="landSource">מקור שווי קרקע</Label>
                <Input
                  id="landSource"
                  value={landSource}
                  onChange={(e) => setLandSource(e.target.value)}
                  placeholder="עסקאות השוואה"
                />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ערך קרקע כולל:</span>
                <span className="text-lg font-bold">
                  {((parseFloat(landArea) || 0) * (parseFloat(landPricePerSqm) || 0)).toLocaleString('he-IL')} ₪
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator size={24} weight="duotone" className="text-primary" />
              תוצאות חישוב
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">שווי סופי</div>
                <div className="text-3xl font-bold text-primary">
                  {result.finalValue.toLocaleString('he-IL')} ₪
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">ערך קרקע</div>
                  <div className="text-lg font-semibold">
                    {result.landValue.toLocaleString('he-IL')} ₪
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">עלות בנייה</div>
                  <div className="text-lg font-semibold">
                    {result.reproductionCost.toLocaleString('he-IL')} ₪
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">פחת כולל</div>
                  <div className="text-lg font-semibold text-destructive">
                    -{result.totalDepreciation.toLocaleString('he-IL')} ₪
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">ערך לאחר פחת</div>
                  <div className="text-lg font-semibold">
                    {result.depreciatedValue.toLocaleString('he-IL')} ₪
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="formula" dir="rtl">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="formula">נוסחה</TabsTrigger>
                <TabsTrigger value="breakdown">פירוט</TabsTrigger>
                <TabsTrigger value="depreciation">לוח פחת</TabsTrigger>
              </TabsList>

              <TabsContent value="formula" className="space-y-4">
                <div className="p-4 rounded-lg bg-muted font-mono text-sm whitespace-pre-wrap">
                  {result.formula}
                </div>

                <Alert>
                  <Info size={20} weight="duotone" />
                  <AlertDescription className="text-xs">
                    <strong>מקור:</strong> שיטת העלות מבוססת על תקן שמאי 19 - שומת מקרקעין למטרות כלליות
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="breakdown" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span>ערך קרקע</span>
                    <Badge variant="outline">{result.breakdown.landValue.toLocaleString('he-IL')} ₪</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span>עלות בנייה</span>
                    <Badge variant="outline">{result.breakdown.buildingCost.toLocaleString('he-IL')} ₪</Badge>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <span>פחת פיזי</span>
                    <Badge variant="destructive">
                      -{result.breakdown.physicalDepreciation.toLocaleString('he-IL')} ₪
                    </Badge>
                  </div>

                  {result.breakdown.functionalObsolescence > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <span>התיישנות תפקודית</span>
                      <Badge variant="destructive">
                        -{result.breakdown.functionalObsolescence.toLocaleString('he-IL')} ₪
                      </Badge>
                    </div>
                  )}

                  {result.breakdown.economicObsolescence > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <span>התיישנות כלכלית</span>
                      <Badge variant="destructive">
                        -{result.breakdown.economicObsolescence.toLocaleString('he-IL')} ₪
                      </Badge>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary">
                    <span className="font-semibold">שווי סופי</span>
                    <Badge className="text-lg px-4 py-1">
                      {result.finalValue.toLocaleString('he-IL')} ₪
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="depreciation" className="space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-right">שנה</th>
                          <th className="p-3 text-right">גיל</th>
                          <th className="p-3 text-right">פחת שנתי</th>
                          <th className="p-3 text-right">פחת מצטבר</th>
                          <th className="p-3 text-right">ערך נותר</th>
                          <th className="p-3 text-right">% פחת</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.depreciationSchedule.map((item, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="p-3">{item.year}</td>
                            <td className="p-3">{item.age}</td>
                            <td className="p-3">{item.annualDepreciation.toLocaleString('he-IL')}</td>
                            <td className="p-3 text-destructive">
                              {item.cumulativeDepreciation.toLocaleString('he-IL')}
                            </td>
                            <td className="p-3 font-semibold">
                              {item.remainingValue.toLocaleString('he-IL')}
                            </td>
                            <td className="p-3">{item.depreciationPercent.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText size={20} weight="duotone" />
                נרטיב מקצועי
              </h4>
              <div className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                {result.narrativeHebrew}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
