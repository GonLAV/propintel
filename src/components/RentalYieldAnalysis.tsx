import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendUp,
  ChartLine,
  Calculator as CalcIcon,
  CheckCircle,
  Info,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { RentalYieldCalculator, type RentalYieldInputs, type RentalYieldResults } from '@/lib/rentalYieldCalculator'
import { cn } from '@/lib/utils'

interface RentalYieldAnalysisProps {
  propertyValue?: number
  monthlyRent?: number
  annualRent?: number
  onResultsUpdate?: (results: RentalYieldResults) => void
  autoCalculate?: boolean
  showAdvancedSettings?: boolean
  propertyType?: 'residential' | 'commercial' | 'office' | 'land'
  className?: string
}

export function RentalYieldAnalysis({
  propertyValue = 0,
  monthlyRent = 0,
  annualRent,
  onResultsUpdate,
  autoCalculate = true,
  showAdvancedSettings = true,
  propertyType: _propertyType = 'residential',
  className
}: RentalYieldAnalysisProps) {
  const [inputs, setInputs] = useState<RentalYieldInputs>({
    propertyValue,
    monthlyRent,
    annualRent,
    vacancyRate: 0.05,
    propertyTaxRate: 0.01,
    maintenanceRate: 0.015,
    managementFeeRate: 0.08
  })

  const [results, setResults] = useState<RentalYieldResults | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    setInputs(prev => ({
      ...prev,
      propertyValue,
      monthlyRent,
      annualRent
    }))
  }, [propertyValue, monthlyRent, annualRent])

   
  useEffect(() => {
    if (autoCalculate && inputs.propertyValue > 0 && inputs.monthlyRent > 0) {
      handleCalculate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, autoCalculate])

  const handleCalculate = () => {
    if (inputs.propertyValue <= 0 || inputs.monthlyRent <= 0) {
      return
    }

    const calculatedResults = RentalYieldCalculator.calculateYield(inputs)
    setResults(calculatedResults)
    
    if (onResultsUpdate) {
      onResultsUpdate(calculatedResults)
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-success'
      case 'good': return 'text-primary'
      case 'fair': return 'text-warning'
      case 'poor': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  const getQualityBadge = (quality: string) => {
    const colors = {
      excellent: 'bg-success/20 text-success border-success/30',
      good: 'bg-primary/20 text-primary border-primary/30',
      fair: 'bg-warning/20 text-warning border-warning/30',
      poor: 'bg-destructive/20 text-destructive border-destructive/30'
    }
    
    const labels = {
      excellent: 'מצוין',
      good: 'טוב',
      fair: 'בינוני',
      poor: 'חלש'
    }

    return (
      <Badge className={colors[quality as keyof typeof colors]}>
        {labels[quality as keyof typeof labels]}
      </Badge>
    )
  }

  return (
    <Card className={cn("border-accent/20 bg-accent/5", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartLine size={24} weight="duotone" className="text-accent" />
          ניתוח תשואת שכירות (Rental Yield)
        </CardTitle>
        <CardDescription>
          חישוב תשואה ברוטו ונטו מהשכרת הנכס לעומת שוויו
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info size={18} weight="duotone" />
          <AlertDescription>
            תשואת השכירות היא היחס בין הכנסות השכירות לערך הנכס. תשואה גבוהה מעידה על השקעה טובה יותר.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="yield-property-value">שווי נכס (₪)</Label>
            <Input
              id="yield-property-value"
              type="number"
              value={inputs.propertyValue || ''}
              onChange={(e) => setInputs({ ...inputs, propertyValue: parseFloat(e.target.value) || 0 })}
              placeholder="1,500,000"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yield-monthly-rent">שכירות חודשית (₪)</Label>
            <Input
              id="yield-monthly-rent"
              type="number"
              value={inputs.monthlyRent || ''}
              onChange={(e) => setInputs({ ...inputs, monthlyRent: parseFloat(e.target.value) || 0 })}
              placeholder="5,000"
              className="font-mono"
            />
          </div>
        </div>

        {showAdvancedSettings && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              <ArrowsClockwise size={16} className="ml-2" />
              {showAdvanced ? 'הסתר הגדרות מתקדמות' : 'הגדרות מתקדמות'}
            </Button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="yield-vacancy">שיעור פנויות (%)</Label>
                  <Input
                    id="yield-vacancy"
                    type="number"
                    value={(inputs.vacancyRate || 0.05) * 100}
                    onChange={(e) => setInputs({ ...inputs, vacancyRate: (parseFloat(e.target.value) || 5) / 100 })}
                    placeholder="5"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yield-property-tax">ארנונה ומסים (%)</Label>
                  <Input
                    id="yield-property-tax"
                    type="number"
                    value={(inputs.propertyTaxRate || 0.01) * 100}
                    onChange={(e) => setInputs({ ...inputs, propertyTaxRate: (parseFloat(e.target.value) || 1) / 100 })}
                    placeholder="1"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yield-maintenance">תחזוקה (%)</Label>
                  <Input
                    id="yield-maintenance"
                    type="number"
                    value={(inputs.maintenanceRate || 0.015) * 100}
                    onChange={(e) => setInputs({ ...inputs, maintenanceRate: (parseFloat(e.target.value) || 1.5) / 100 })}
                    placeholder="1.5"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yield-management">דמי ניהול (%)</Label>
                  <Input
                    id="yield-management"
                    type="number"
                    value={(inputs.managementFeeRate || 0.08) * 100}
                    onChange={(e) => setInputs({ ...inputs, managementFeeRate: (parseFloat(e.target.value) || 8) / 100 })}
                    placeholder="8"
                    className="font-mono"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {!autoCalculate && (
          <Button onClick={handleCalculate} className="w-full" size="lg">
            <CalcIcon size={20} className="ml-2" />
            חשב תשואה
          </Button>
        )}

        {results && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">תוצאות ניתוח</h4>
                {getQualityBadge(results.quality)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/30">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">תשואה ברוטו</p>
                      <p className={cn("text-3xl font-bold font-mono", getQualityColor(results.quality))}>
                        {RentalYieldCalculator.formatPercentage(results.grossYield)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        הכנסה שנתית / שווי נכס
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-linear-to-br from-accent/10 to-accent/5 border-accent/30">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">תשואה נטו (NOI)</p>
                      <p className={cn("text-3xl font-bold font-mono", getQualityColor(results.quality))}>
                        {RentalYieldCalculator.formatPercentage(results.netYield)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        הכנסה נטו / שווי נכס
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">הכנסה שנתית</p>
                  <p className="text-lg font-semibold font-mono">
                    {RentalYieldCalculator.formatCurrency(results.annualRent)}
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">הוצאות שנתיות</p>
                  <p className="text-lg font-semibold font-mono text-destructive">
                    -{RentalYieldCalculator.formatCurrency(results.annualExpenses)}
                  </p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">רווח נטו שנתי</p>
                  <p className="text-lg font-semibold font-mono text-success">
                    {RentalYieldCalculator.formatCurrency(results.netAnnualIncome)}
                  </p>
                </div>
              </div>

              <Card className="bg-muted/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">פירוט הוצאות שנתיות</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">פנויות ({((inputs.vacancyRate || 0.05) * 100).toFixed(1)}%)</span>
                    <span className="font-mono">{RentalYieldCalculator.formatCurrency(results.breakdownExpenses.vacancy)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ארנונה ומסים ({((inputs.propertyTaxRate || 0.01) * 100).toFixed(1)}%)</span>
                    <span className="font-mono">{RentalYieldCalculator.formatCurrency(results.breakdownExpenses.propertyTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">תחזוקה ({((inputs.maintenanceRate || 0.015) * 100).toFixed(1)}%)</span>
                    <span className="font-mono">{RentalYieldCalculator.formatCurrency(results.breakdownExpenses.maintenance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">דמי ניהול ({((inputs.managementFeeRate || 0.08) * 100).toFixed(1)}%)</span>
                    <span className="font-mono">{RentalYieldCalculator.formatCurrency(results.breakdownExpenses.managementFee)}</span>
                  </div>
                  {results.breakdownExpenses.other > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">אחר</span>
                      <span className="font-mono">{RentalYieldCalculator.formatCurrency(results.breakdownExpenses.other)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>סה"כ הוצאות</span>
                    <span className="font-mono">{RentalYieldCalculator.formatCurrency(results.breakdownExpenses.total)}</span>
                  </div>
                </CardContent>
              </Card>

              <Alert className={cn(
                results.benchmarks.aboveMarket ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'
              )}>
                <TrendUp size={18} weight="duotone" className={results.benchmarks.aboveMarket ? 'text-success' : 'text-warning'} />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {results.benchmarks.aboveMarket ? 'מעל ממוצע השוק' : 'מתחת לממוצע השוק'}
                    </p>
                    <p className="text-sm">
                      ממוצע שוק: {RentalYieldCalculator.formatPercentage(results.benchmarks.marketAverage)} | 
                      הפרש: {results.benchmarks.aboveMarket ? '+' : ''}{RentalYieldCalculator.formatPercentage(results.benchmarks.percentageDiff, 1)}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <Card className="bg-linear-to-br from-primary/5 to-accent/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle size={24} weight="duotone" className="text-primary shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold mb-2">המלצה מקצועית</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {results.recommendation}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/20 rounded">
                  <p className="text-muted-foreground mb-1">Cap Rate</p>
                  <p className="font-mono font-semibold">{RentalYieldCalculator.formatPercentage(results.capRate)}</p>
                </div>
                <div className="p-3 bg-muted/20 rounded">
                  <p className="text-muted-foreground mb-1">Cash-on-Cash</p>
                  <p className="font-mono font-semibold">{RentalYieldCalculator.formatPercentage(results.cashOnCashReturn)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
