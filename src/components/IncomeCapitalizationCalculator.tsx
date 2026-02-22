import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendUp, 
  Calculator as CalcIcon, 
  FileText,
  Info,
  Warning,
  Percent,
  CloudArrowDown,
  CheckCircle,
  Database
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { 
  IncomeCapitalizationCalculator as CapCalculator,
  type IncomeParams,
  type CapRateParams,
  type IncomeCapitalizationResult
} from '@/lib/calculators/incomeCapitalizationCalculator'
import { RentalMarketAPI, type RentalIncomeEstimate } from '@/lib/rentalMarketAPI'
import { RentalYieldAnalysis } from '@/components/RentalYieldAnalysis'

export function IncomeCapitalizationCalculator() {
  const [grossAnnualIncome, setGrossAnnualIncome] = useState('600000')
  const [vacancyRate, setVacancyRate] = useState('5')
  const [operatingExpenses, setOperatingExpenses] = useState('80000')
  const [propertyTax, setPropertyTax] = useState('30000')
  const [insurance, setInsurance] = useState('15000')
  const [maintenance, setMaintenance] = useState('25000')
  const [management, setManagement] = useState('20000')
  const [utilities, setUtilities] = useState('10000')
  const [otherExpenses, setOtherExpenses] = useState('0')
  
  const [marketCapRate, setMarketCapRate] = useState('6')
  const [riskAdjustment, setRiskAdjustment] = useState('0')
  const [locationAdjustment, setLocationAdjustment] = useState('0')
  const [conditionAdjustment, setConditionAdjustment] = useState('0')
  
  const [result, setResult] = useState<IncomeCapitalizationResult | null>(null)
  
  const [city, setCity] = useState('תל אביב')
  const [propertyType, setPropertyType] = useState<'apartment' | 'office' | 'commercial'>('apartment')
  const [area, setArea] = useState('90')
  const [rooms, setRooms] = useState('3')
  const [isLoadingRental, setIsLoadingRental] = useState(false)
  const [rentalEstimate, setRentalEstimate] = useState<RentalIncomeEstimate | null>(null)

  const handleCalculate = () => {
    const incomeParams: IncomeParams = {
      grossAnnualIncome: parseFloat(grossAnnualIncome) || 0,
      vacancyRate: parseFloat(vacancyRate) || 0,
      operatingExpenses: parseFloat(operatingExpenses) || 0,
      propertyTax: parseFloat(propertyTax) || 0,
      insurance: parseFloat(insurance) || 0,
      maintenance: parseFloat(maintenance) || 0,
      management: parseFloat(management) || 0,
      utilities: parseFloat(utilities) || 0,
      otherExpenses: parseFloat(otherExpenses) || 0
    }

    const baseCapRate = parseFloat(marketCapRate) || 6
    const adjustments = 
      parseFloat(riskAdjustment) +
      parseFloat(locationAdjustment) +
      parseFloat(conditionAdjustment)

    const capRateParams: CapRateParams = {
      marketCapRate: baseCapRate,
      riskAdjustment: parseFloat(riskAdjustment) || 0,
      locationAdjustment: parseFloat(locationAdjustment) || 0,
      conditionAdjustment: parseFloat(conditionAdjustment) || 0,
      finalCapRate: baseCapRate + adjustments
    }

    const calculationResult = CapCalculator.calculate(incomeParams, capRateParams)
    setResult(calculationResult)
  }

  const handleFetchRentalData = async () => {
    setIsLoadingRental(true)
    try {
      const estimate = await RentalMarketAPI.getRentalIncomeEstimate(
        city,
        propertyType,
        parseFloat(area) || 90,
        parseFloat(rooms) || undefined
      )
      
      setRentalEstimate(estimate)
      setGrossAnnualIncome(estimate.annualRent.toString())
      
      toast.success('נתוני שכירות נטענו מהשוק', {
        description: `${estimate.basedOnTransactions} עסקאות דומות נמצאו. רמת ביטחון: ${
          estimate.confidence === 'high' ? 'גבוהה' : 
          estimate.confidence === 'medium' ? 'בינונית' : 'נמוכה'
        }`
      })
    } catch (_error) {
      toast.error('שגיאה בטעינת נתוני שוק', {
        description: 'אנא הזן את הכנסות השכירות באופן ידני'
      })
    } finally {
      setIsLoadingRental(false)
    }
  }

  const totalExpenses = 
    (parseFloat(operatingExpenses) || 0) +
    (parseFloat(propertyTax) || 0) +
    (parseFloat(insurance) || 0) +
    (parseFloat(maintenance) || 0) +
    (parseFloat(management) || 0) +
    (parseFloat(utilities) || 0) +
    (parseFloat(otherExpenses) || 0)

  const grossIncome = parseFloat(grossAnnualIncome) || 0
  const vacancyLoss = (grossIncome * (parseFloat(vacancyRate) || 0)) / 100
  const effectiveIncome = grossIncome - vacancyLoss
  const noi = effectiveIncome - totalExpenses

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendUp size={32} weight="duotone" className="text-primary" />
            מחשבון שיטת ההיוון
          </h2>
          <p className="text-muted-foreground mt-1">
            חישוב שווי נכסים מניבים לפי הכנסה נטו מתפעול ושיעור היוון
          </p>
        </div>
        <Button onClick={handleCalculate} size="lg" className="gap-2">
          <CalcIcon size={20} weight="duotone" />
          חשב שווי
        </Button>
      </div>

      <Alert>
        <Info size={20} weight="duotone" />
        <AlertDescription>
          <strong>שיטת ההיוון</strong> מתאימה לנכסים מניבים (משרדים, מסחר, דיור להשכרה).
          הנוסחה: <code className="font-mono bg-muted px-2 py-0.5 rounded">שווי = NOI ÷ Cap Rate</code>
        </AlertDescription>
      </Alert>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database size={24} weight="duotone" className="text-primary" />
            נתוני שוק שכירות
          </CardTitle>
          <CardDescription>
            שלוף הכנסות שכירות מנתוני שוק אמיתיים (Nadlan.gov.il)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rental-city">עיר</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger id="rental-city">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="תל אביב">תל אביב</SelectItem>
                  <SelectItem value="ירושלים">ירושלים</SelectItem>
                  <SelectItem value="חיפה">חיפה</SelectItem>
                  <SelectItem value="באר שבע">באר שבע</SelectItem>
                  <SelectItem value="רעננה">רעננה</SelectItem>
                  <SelectItem value="נתניה">נתניה</SelectItem>
                  <SelectItem value="רמת גן">רמת גן</SelectItem>
                  <SelectItem value="פתח תקווה">פתח תקווה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rental-type">סוג נכס</Label>
              <Select value={propertyType} onValueChange={(v: any) => setPropertyType(v)}>
                <SelectTrigger id="rental-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">דירה</SelectItem>
                  <SelectItem value="office">משרד</SelectItem>
                  <SelectItem value="commercial">מסחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rental-area">שטח (מ"ר)</Label>
              <Input
                id="rental-area"
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="90"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rental-rooms">חדרים</Label>
              <Input
                id="rental-rooms"
                type="number"
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                placeholder="3"
                step="0.5"
              />
            </div>
          </div>

          <Button 
            onClick={handleFetchRentalData} 
            disabled={isLoadingRental}
            className="w-full gap-2"
            variant="outline"
          >
            <CloudArrowDown size={20} weight="duotone" />
            {isLoadingRental ? 'טוען נתוני שוק...' : 'שלוף נתוני שכירות מהשוק'}
          </Button>

          {rentalEstimate && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-background border">
                <div className="text-xs text-muted-foreground mb-1">שכירות חודשית משוערת</div>
                <div className="text-lg font-bold text-primary">
                  ₪{rentalEstimate.monthlyRent.toLocaleString('he-IL')}
                </div>
                <div className="text-xs text-muted-foreground">
                  ₪{rentalEstimate.rentPerSqm.toFixed(0)}/מ"ר
                </div>
              </div>

              <div className="p-3 rounded-lg bg-background border">
                <div className="text-xs text-muted-foreground mb-1">טווח שכירות</div>
                <div className="text-sm font-semibold">
                  ₪{rentalEstimate.lowEstimate.toLocaleString('he-IL')} - 
                  ₪{rentalEstimate.highEstimate.toLocaleString('he-IL')}
                </div>
                <Badge variant={
                  rentalEstimate.confidence === 'high' ? 'default' : 
                  rentalEstimate.confidence === 'medium' ? 'secondary' : 'outline'
                } className="mt-1">
                  <CheckCircle size={12} weight="fill" className="ml-1" />
                  {rentalEstimate.confidence === 'high' ? 'ביטחון גבוה' : 
                   rentalEstimate.confidence === 'medium' ? 'ביטחון בינוני' : 'ביטחון נמוך'}
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-background border">
                <div className="text-xs text-muted-foreground mb-1">מגמת שוק</div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    rentalEstimate.marketStats.marketTrend === 'rising' ? 'default' :
                    rentalEstimate.marketStats.marketTrend === 'falling' ? 'destructive' : 'secondary'
                  }>
                    {rentalEstimate.marketStats.marketTrend === 'rising' ? '↗ עולה' :
                     rentalEstimate.marketStats.marketTrend === 'falling' ? '↘ יורד' : '→ יציב'}
                  </Badge>
                  <span className="text-sm font-semibold">
                    {rentalEstimate.marketStats.trendPercentage > 0 ? '+' : ''}
                    {rentalEstimate.marketStats.trendPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  מבוסס על {rentalEstimate.basedOnTransactions} עסקאות
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendUp size={24} weight="duotone" />
              1. הכנסות
            </CardTitle>
            <CardDescription>
              הכנסות שנתיות מהנכס
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grossAnnualIncome">הכנסה ברוטו שנתית (₪)</Label>
              <Input
                id="grossAnnualIncome"
                type="number"
                value={grossAnnualIncome}
                onChange={(e) => setGrossAnnualIncome(e.target.value)}
                placeholder="600000"
              />
              <p className="text-xs text-muted-foreground">
                סך כל דמי השכירות המקסימליים בשנה (100% תפוסה)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vacancyRate">שיעור פינויים (%)</Label>
              <Input
                id="vacancyRate"
                type="number"
                value={vacancyRate}
                onChange={(e) => setVacancyRate(e.target.value)}
                placeholder="5"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                אחוז זמן ממוצע בו הנכס פנוי (בדרך כלל 3-7%)
              </p>
            </div>

            <Separator />

            <div className="p-3 rounded-lg bg-muted space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>הכנסה ברוטו</span>
                <span className="font-semibold">{grossIncome.toLocaleString('he-IL')} ₪</span>
              </div>
              <div className="flex items-center justify-between text-sm text-destructive">
                <span>הפסד פינויים ({vacancyRate}%)</span>
                <span>-{vacancyLoss.toLocaleString('he-IL')} ₪</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span>הכנסה אפקטיבית (EGI)</span>
                <span className="text-primary">{effectiveIncome.toLocaleString('he-IL')} ₪</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warning size={24} weight="duotone" />
              2. הוצאות תפעול
            </CardTitle>
            <CardDescription>
              הוצאות שנתיות לתחזוקה ותפעול הנכס
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="operatingExpenses">הוצאות תפעול (₪)</Label>
                <Input
                  id="operatingExpenses"
                  type="number"
                  value={operatingExpenses}
                  onChange={(e) => setOperatingExpenses(e.target.value)}
                  placeholder="80000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyTax">ארנונה (₪)</Label>
                <Input
                  id="propertyTax"
                  type="number"
                  value={propertyTax}
                  onChange={(e) => setPropertyTax(e.target.value)}
                  placeholder="30000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurance">ביטוח (₪)</Label>
                <Input
                  id="insurance"
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(e.target.value)}
                  placeholder="15000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance">תחזוקה (₪)</Label>
                <Input
                  id="maintenance"
                  type="number"
                  value={maintenance}
                  onChange={(e) => setMaintenance(e.target.value)}
                  placeholder="25000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="management">ניהול (₪)</Label>
                <Input
                  id="management"
                  type="number"
                  value={management}
                  onChange={(e) => setManagement(e.target.value)}
                  placeholder="20000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="utilities">שירותים (₪)</Label>
                <Input
                  id="utilities"
                  type="number"
                  value={utilities}
                  onChange={(e) => setUtilities(e.target.value)}
                  placeholder="10000"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="otherExpenses">הוצאות אחרות (₪)</Label>
                <Input
                  id="otherExpenses"
                  type="number"
                  value={otherExpenses}
                  onChange={(e) => setOtherExpenses(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <Separator />

            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center justify-between">
                <span className="text-sm">סה"כ הוצאות שנתיות</span>
                <span className="font-bold text-destructive">
                  {totalExpenses.toLocaleString('he-IL')} ₪
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Expense Ratio</span>
                  <span>{effectiveIncome > 0 ? ((totalExpenses / effectiveIncome) * 100).toFixed(1) : 0}%</span>
                </div>
                <Progress 
                  value={effectiveIncome > 0 ? Math.min((totalExpenses / effectiveIncome) * 100, 100) : 0} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent size={24} weight="duotone" />
              3. שיעור היוון (Cap Rate)
            </CardTitle>
            <CardDescription>
              קביעת שיעור תשואה מתאים בהתאם לשוק וסיכונים
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="marketCapRate">Cap Rate שוק בסיס (%)</Label>
                <Input
                  id="marketCapRate"
                  type="number"
                  value={marketCapRate}
                  onChange={(e) => setMarketCapRate(e.target.value)}
                  placeholder="6"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  שיעור שוק ממוצע לנכסים דומים
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="riskAdjustment">התאמת סיכון (%)</Label>
                <Input
                  id="riskAdjustment"
                  type="number"
                  value={riskAdjustment}
                  onChange={(e) => setRiskAdjustment(e.target.value)}
                  placeholder="0"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  + להגדלת סיכון, - להפחתה
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationAdjustment">התאמת מיקום (%)</Label>
                <Input
                  id="locationAdjustment"
                  type="number"
                  value={locationAdjustment}
                  onChange={(e) => setLocationAdjustment(e.target.value)}
                  placeholder="0"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  + מיקום חלש, - מיקום חזק
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditionAdjustment">התאמת מצב (%)</Label>
                <Input
                  id="conditionAdjustment"
                  type="number"
                  value={conditionAdjustment}
                  onChange={(e) => setConditionAdjustment(e.target.value)}
                  placeholder="0"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  + מצב ירוד, - מצב משופר
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">שיעור היוון סופי</span>
                <span className="text-2xl font-bold text-primary">
                  {(
                    parseFloat(marketCapRate) +
                    parseFloat(riskAdjustment || '0') +
                    parseFloat(locationAdjustment || '0') +
                    parseFloat(conditionAdjustment || '0')
                  ).toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Cap Rate בסיס ({marketCapRate}%) + התאמות ({
                  (parseFloat(riskAdjustment || '0') +
                  parseFloat(locationAdjustment || '0') +
                  parseFloat(conditionAdjustment || '0')).toFixed(2)
                }%)
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center justify-between">
                <span className="font-semibold">הכנסה נטו מתפעול (NOI)</span>
                <span className="text-2xl font-bold text-success">
                  {noi.toLocaleString('he-IL')} ₪
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                הכנסה אפקטיבית ({effectiveIncome.toLocaleString('he-IL')}) - הוצאות ({totalExpenses.toLocaleString('he-IL')})
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <>
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalcIcon size={24} weight="duotone" className="text-primary" />
                תוצאות חישוב
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="p-6 rounded-lg bg-linear-to-br from-primary/10 to-accent/10 border-2 border-primary">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">שווי הנכס המחושב</div>
                <div className="text-4xl font-bold text-primary mb-1">
                  {result.propertyValue.toLocaleString('he-IL')} ₪
                </div>
                <div className="text-xs text-muted-foreground">
                  NOI: {result.netOperatingIncome.toLocaleString('he-IL')} ÷ Cap Rate: {result.capRate}%
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground mb-1">הכנסה ברוטו</div>
                <div className="text-lg font-semibold">
                  {result.grossIncome.toLocaleString('he-IL')} ₪
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground mb-1">הכנסה אפקטיבית</div>
                <div className="text-lg font-semibold">
                  {result.effectiveGrossIncome.toLocaleString('he-IL')} ₪
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="text-xs text-muted-foreground mb-1">הוצאות</div>
                <div className="text-lg font-semibold text-destructive">
                  {result.totalExpenses.toLocaleString('he-IL')} ₪
                </div>
              </div>

              <div className="p-4 rounded-lg bg-success/10 border border-success">
                <div className="text-xs text-muted-foreground mb-1">NOI</div>
                <div className="text-lg font-semibold text-success">
                  {result.netOperatingIncome.toLocaleString('he-IL')} ₪
                </div>
              </div>
            </div>

            <Tabs defaultValue="formula" dir="rtl">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="formula">נוסחה</TabsTrigger>
                <TabsTrigger value="scenarios">תרחישים</TabsTrigger>
                <TabsTrigger value="sensitivity">רגישות</TabsTrigger>
                <TabsTrigger value="expenses">פירוט הוצאות</TabsTrigger>
              </TabsList>

              <TabsContent value="formula" className="space-y-4">
                <div className="p-4 rounded-lg bg-muted font-mono text-sm whitespace-pre-wrap">
                  {result.formula}
                </div>

                <Alert>
                  <Info size={20} weight="duotone" />
                  <AlertDescription className="text-xs">
                    <strong>מקור:</strong> שיטת ההיוון מבוססת על תקן שמאי 22 - שומת נכסים מניבים
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="scenarios" className="space-y-4">
                <div className="space-y-3">
                  {result.scenarios.map((scenario, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        scenario.name === 'Base' 
                          ? 'bg-primary/5 border-primary' 
                          : scenario.name === 'Optimistic'
                          ? 'bg-success/5 border-success/50'
                          : 'bg-warning/5 border-warning/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{scenario.nameHebrew}</h4>
                          <p className="text-xs text-muted-foreground">{scenario.description}</p>
                        </div>
                        <Badge 
                          variant={scenario.name === 'Base' ? 'default' : 'outline'}
                          className="text-lg px-4 py-1"
                        >
                          {scenario.value.toLocaleString('he-IL')} ₪
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">הכנסה</div>
                          <div className="font-medium">{scenario.grossIncome.toLocaleString('he-IL')}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">NOI</div>
                          <div className="font-medium">{scenario.noi.toLocaleString('he-IL')}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Cap Rate</div>
                          <div className="font-medium">{scenario.capRate}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">טווח שווי</span>
                    <span className="font-mono">
                      {Math.min(...result.scenarios.map(s => s.value)).toLocaleString('he-IL')} - {Math.max(...result.scenarios.map(s => s.value)).toLocaleString('he-IL')} ₪
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sensitivity" className="space-y-4">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">רגישות לשיעור היוון</h4>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-3 text-right">Cap Rate</th>
                            <th className="p-3 text-right">שווי מחושב</th>
                            <th className="p-3 text-right">שינוי %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.sensitivityAnalysis.capRateRange.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                              <td className="p-3">{item.rate.toFixed(2)}%</td>
                              <td className="p-3 font-semibold">{item.value.toLocaleString('he-IL')} ₪</td>
                              <td className="p-3">
                                <Badge variant={
                                  Math.abs(item.value - result.propertyValue) < 1000 ? 'default' : 'outline'
                                }>
                                  {((item.value - result.propertyValue) / result.propertyValue * 100).toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">רגישות להכנסה</h4>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-3 text-right">הכנסה שנתית</th>
                            <th className="p-3 text-right">שווי מחושב</th>
                            <th className="p-3 text-right">שינוי %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.sensitivityAnalysis.incomeRange.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                              <td className="p-3">{item.income.toLocaleString('he-IL')} ₪</td>
                              <td className="p-3 font-semibold">{item.value.toLocaleString('he-IL')} ₪</td>
                              <td className="p-3">
                                <Badge variant={
                                  Math.abs(item.value - result.propertyValue) < 1000 ? 'default' : 'outline'
                                }>
                                  {((item.value - result.propertyValue) / result.propertyValue * 100).toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-right">קטגוריה</th>
                        <th className="p-3 text-right">סכום</th>
                        <th className="p-3 text-right">% מהכנסה</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.expenseBreakdown.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="p-3">{item.categoryHebrew}</td>
                          <td className="p-3 font-semibold">{item.amount.toLocaleString('he-IL')} ₪</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Progress value={item.percentage} className="h-2 flex-1" />
                              <span className="text-xs w-12 text-left">{item.percentage.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted font-semibold">
                      <tr>
                        <td className="p-3">סה"כ</td>
                        <td className="p-3">{result.totalExpenses.toLocaleString('he-IL')} ₪</td>
                        <td className="p-3">
                          {((result.totalExpenses / result.effectiveGrossIncome) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
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

        <RentalYieldAnalysis
          propertyValue={result.propertyValue}
          monthlyRent={result.grossIncome / 12}
          annualRent={result.grossIncome}
          propertyType="residential"
          autoCalculate={true}
          showAdvancedSettings={true}
        />
        </>
      )}
    </div>
  )
}
