import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  ListChecks, 
  CurrencyDollar, 
  Buildings, 
  TrendUp,
  TrendDown,
  CheckCircle,
  XCircle,
  Info,
  Flask
} from '@phosphor-icons/react'
import { 
  CalculatorValidationEngine, 
  CalculatorSourceRegistry 
} from '@/lib/calculators'
import type { ValidationResult } from '@/lib/calculators'
import { InteractiveAdjustmentCalculator } from '@/components/InteractiveAdjustmentCalculator'
import { InteractiveWeightedCalculator } from '@/components/InteractiveWeightedCalculator'
import { CostApproachCalculator } from '@/components/CostApproachCalculator'
import { IncomeCapitalizationCalculator } from '@/components/IncomeCapitalizationCalculator'
import { DepreciationCalculator } from '@/components/DepreciationCalculator'
import { BulkValuation } from '@/components/BulkValuation'
import { MultiUnitDistributionCalculator } from '@/components/MultiUnitDistributionCalculator'
import { DevelopmentRightsCalculator } from '@/components/DevelopmentRightsCalculator'
import { ValuationEngineTester } from '@/components/ValuationEngineTester'

interface ProfessionalCalculatorsProps {
  properties?: any[]
  onUpdateProperty?: (property: any) => void
}

export function ProfessionalCalculators({ properties = [], onUpdateProperty }: ProfessionalCalculatorsProps) {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [showValidation, setShowValidation] = useState(false)

  const runValidationTests = () => {
    const results = CalculatorValidationEngine.runAllTests()
    setValidationResults(results)
    setShowValidation(true)
  }

  const sources = CalculatorSourceRegistry.getAllSources()

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">מחשבונים מקצועיים</h1>
          <p className="text-muted-foreground mt-2">
            מערכת מחשבונים מקצועית עם אימות משפטי ובקרת איכות
          </p>
        </div>
        <Button 
          onClick={runValidationTests}
          variant="outline"
          className="gap-2"
        >
          <CheckCircle size={20} weight="duotone" />
          הרץ בדיקות תקינות
        </Button>
      </div>

      {showValidation && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={24} weight="duotone" className="text-primary" />
              תוצאות בדיקות תקינות
            </CardTitle>
            <CardDescription>
              בדיקות רגרסיה אוטומטיות למניעת טעויות חישוב
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="default" className="gap-2">
                  <CheckCircle size={16} />
                  עברו: {validationResults.filter(r => r.passed).length}
                </Badge>
                <Badge variant="destructive" className="gap-2">
                  <XCircle size={16} />
                  נכשלו: {validationResults.filter(r => !r.passed).length}
                </Badge>
              </div>

              <div className="space-y-2">
                {validationResults.map(result => (
                  <div 
                    key={result.testId}
                    className={`p-3 rounded-lg border ${
                      result.passed 
                        ? 'bg-success/10 border-success' 
                        : 'bg-destructive/10 border-destructive'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle size={20} className="text-success" weight="fill" />
                        ) : (
                          <XCircle size={20} className="text-destructive" weight="fill" />
                        )}
                        <span className="font-medium">{result.testId}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ערך צפוי: {result.expectedValue.toLocaleString('he-IL')} ₪
                      </span>
                    </div>
                    <p className="text-sm mt-1 mr-7">{result.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" dir="rtl" className="w-full">
        <div className="border-b border-border mb-4 overflow-x-auto">
          <TabsList className="inline-flex h-auto gap-1 bg-transparent w-full justify-start">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <Info size={18} weight="duotone" />
              <span className="hidden sm:inline">סקירה</span>
            </TabsTrigger>
            <TabsTrigger value="adjustment" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <ListChecks size={18} weight="duotone" />
              <span className="hidden sm:inline">התאמות</span>
            </TabsTrigger>
            <TabsTrigger value="weighted" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <Calculator size={18} weight="duotone" />
              <span className="hidden sm:inline">ממוצע משוקלל</span>
            </TabsTrigger>
            <TabsTrigger value="cost" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <CurrencyDollar size={18} weight="duotone" />
              <span className="hidden sm:inline">עלות</span>
            </TabsTrigger>
            <TabsTrigger value="depreciation" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <TrendDown size={18} weight="duotone" />
              <span className="hidden sm:inline">פחת</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <TrendUp size={18} weight="duotone" />
              <span className="hidden sm:inline">היוון</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <ListChecks size={18} weight="duotone" />
              <span className="hidden sm:inline">שומה מרובה</span>
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <Buildings size={18} weight="duotone" />
              <span className="hidden sm:inline">חלוקה</span>
            </TabsTrigger>
            <TabsTrigger value="development" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <TrendUp size={18} weight="duotone" />
              <span className="hidden sm:inline">זכויות</span>
            </TabsTrigger>
            <TabsTrigger value="tester" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3">
              <Flask size={18} weight="duotone" />
              <span className="hidden sm:inline">בדיקות</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>סקירת מחשבונים מקצועיים</CardTitle>
              <CardDescription>
                מערכת מחשבונים מבוססת תקנים מקצועיים עם שקיפות מוחלטת
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">עקרונות המערכת</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="font-medium mb-2">🛡️ שקיפות מוחלטת</h4>
                    <p className="text-sm text-muted-foreground">
                      כל נוסחה גלויה לשמאי, כולל הצבת ערכים ומקור משפטי
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <h4 className="font-medium mb-2">✅ בדיקות רגרסיה</h4>
                    <p className="text-sm text-muted-foreground">
                      כל מחשבון נבדק אוטומטית מול ערכים צפויים ידועים
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                    <h4 className="font-medium mb-2">📚 מקורות מקצועיים</h4>
                    <p className="text-sm text-muted-foreground">
                      כל נוסחה מתועדת עם מקור רשמי מתקן שמאי או פסיקה
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                    <h4 className="font-medium mb-2">🔧 גמישות שמאית</h4>
                    <p className="text-sm text-muted-foreground">
                      אפשרות לעקוף חישוב עם תיעוד והנמקה מקצועית
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">המחשבונים הזמינים</h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <ListChecks size={24} weight="duotone" className="text-primary" />
                      <div>
                        <h4 className="font-medium">מחשבון התאמות</h4>
                        <p className="text-sm text-muted-foreground">
                          התאמות מפורטות להשוואת עסקאות - קומה, מצב, תוספות
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Calculator size={24} weight="duotone" className="text-accent" />
                      <div>
                        <h4 className="font-medium">ממוצע משוקלל</h4>
                        <p className="text-sm text-muted-foreground">
                          שקלול עסקאות לפי קרבה, דמיון, אמינות ועדכניות
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <CurrencyDollar size={24} weight="duotone" className="text-success" />
                      <div>
                        <h4 className="font-medium">שיטת העלות</h4>
                        <p className="text-sm text-muted-foreground">
                          חישוב שווי לפי עלות בנייה ופחת עם לוחות זמנים
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <TrendDown size={24} weight="duotone" className="text-destructive" />
                      <div>
                        <h4 className="font-medium">מחשבון פחת מתקדם</h4>
                        <p className="text-sm text-muted-foreground">
                          3 שיטות פחת שונות עם לוחות זמנים מפורטים
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <TrendUp size={24} weight="duotone" className="text-warning" />
                      <div>
                        <h4 className="font-medium">שיטת ההיוון</h4>
                        <p className="text-sm text-muted-foreground">
                          היוון הכנסות לנכסים מניבים עם ניתוח תרחישים
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Buildings size={24} weight="duotone" className="text-primary" />
                      <div>
                        <h4 className="font-medium">חלוקת יחידות ושומה מרובה</h4>
                        <p className="text-sm text-muted-foreground">
                          חלוקת שווי בניין ליחידות + שומה מרובה לפורטפוליו
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <TrendUp size={24} weight="duotone" className="text-accent" />
                      <div>
                        <h4 className="font-medium">זכויות בנייה</h4>
                        <p className="text-sm text-muted-foreground">
                          חישוב זכויות בנייה ופוטנציאל פיתוח
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Flask size={24} weight="duotone" className="text-warning" />
                      <div>
                        <h4 className="font-medium">בדיקת מנוע שומה</h4>
                        <p className="text-sm text-muted-foreground">
                          בדיקות ותיקוף אלגוריתמי חישוב
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>מקורות משפטיים ומקצועיים</CardTitle>
              <CardDescription>
                כל מחשבון מבוסס על תקנים רשמיים ואסמכתאות מקצועיות
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sources.map(source => (
                  <div 
                    key={source.calculatorId}
                    className="p-4 rounded-lg border bg-muted/30"
                  >
                    <h4 className="font-semibold mb-2">{source.formulaName}</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">מקור משפטי:</span>{' '}
                        <span className="font-medium">{source.legalSource}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">תקן מקצועי:</span>{' '}
                        {source.professionalStandard}
                      </p>
                      <p>
                        <span className="text-muted-foreground">אסמכתא:</span>{' '}
                        {source.reference}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        אומת לאחרונה: {source.lastVerified.toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustment">
          <InteractiveAdjustmentCalculator />
        </TabsContent>

        <TabsContent value="weighted">
          <InteractiveWeightedCalculator />
        </TabsContent>

        <TabsContent value="cost">
          <CostApproachCalculator />
        </TabsContent>

        <TabsContent value="depreciation">
          <DepreciationCalculator />
        </TabsContent>

        <TabsContent value="income">
          <IncomeCapitalizationCalculator />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkValuation 
            properties={properties}
            onUpdateProperty={onUpdateProperty || (() => {})}
          />
        </TabsContent>

        <TabsContent value="distribution">
          <MultiUnitDistributionCalculator />
        </TabsContent>

        <TabsContent value="development">
          <DevelopmentRightsCalculator />
        </TabsContent>

        <TabsContent value="tester">
          <ValuationEngineTester />
        </TabsContent>
      </Tabs>
    </div>
  )
}
