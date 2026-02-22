import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  TrendDown, 
  Calculator, 
  ChartLineDown,
  Table,
  Info,
  Warning
} from '@phosphor-icons/react'

interface DepreciationScheduleItem {
  year: number
  beginningValue: number
  depreciation: number
  accumulatedDepreciation: number
  endingValue: number
  depreciationRate: number
}

export function DepreciationCalculator() {
  const [method, setMethod] = useState<'straight-line' | 'declining-balance' | 'sum-of-years'>('straight-line')
  const [initialCost, setInitialCost] = useState('2000000')
  const [salvageValue, setSalvageValue] = useState('200000')
  const [usefulLife, setUsefulLife] = useState('50')
  const [currentAge, setCurrentAge] = useState('10')
  
  const [schedule, setSchedule] = useState<DepreciationScheduleItem[]>([])
  const [showSchedule, setShowSchedule] = useState(false)

  const calculateStraightLine = () => {
    const cost = parseFloat(initialCost) || 0
    const salvage = parseFloat(salvageValue) || 0
    const life = parseFloat(usefulLife) || 1
    const age = Math.min(parseFloat(currentAge) || 0, life)
    
    const annualDepreciation = (cost - salvage) / life
    const schedule: DepreciationScheduleItem[] = []
    
    for (let year = 0; year <= age; year++) {
      const accumulatedDepreciation = annualDepreciation * year
      const endingValue = cost - accumulatedDepreciation
      
      schedule.push({
        year,
        beginningValue: year === 0 ? cost : cost - (annualDepreciation * (year - 1)),
        depreciation: year === 0 ? 0 : annualDepreciation,
        accumulatedDepreciation,
        endingValue,
        depreciationRate: (annualDepreciation / cost) * 100
      })
    }
    
    return schedule
  }

  const calculateDecliningBalance = () => {
    const cost = parseFloat(initialCost) || 0
    const salvage = parseFloat(salvageValue) || 0
    const life = parseFloat(usefulLife) || 1
    const age = Math.min(parseFloat(currentAge) || 0, life)
    
    const rate = 2 / life
    const schedule: DepreciationScheduleItem[] = []
    let bookValue = cost
    let accumulatedDep = 0
    
    for (let year = 0; year <= age; year++) {
      const beginningValue = bookValue
      const depreciation = year === 0 ? 0 : Math.max(bookValue * rate, bookValue - salvage)
      
      if (year > 0) {
        bookValue = Math.max(bookValue - depreciation, salvage)
        accumulatedDep += depreciation
      }
      
      schedule.push({
        year,
        beginningValue,
        depreciation,
        accumulatedDepreciation: accumulatedDep,
        endingValue: bookValue,
        depreciationRate: year === 0 ? 0 : (depreciation / beginningValue) * 100
      })
    }
    
    return schedule
  }

  const calculateSumOfYears = () => {
    const cost = parseFloat(initialCost) || 0
    const salvage = parseFloat(salvageValue) || 0
    const life = parseFloat(usefulLife) || 1
    const age = Math.min(parseFloat(currentAge) || 0, life)
    
    const depreciableAmount = cost - salvage
    const sumOfYears = (life * (life + 1)) / 2
    const schedule: DepreciationScheduleItem[] = []
    let accumulatedDep = 0
    
    for (let year = 0; year <= age; year++) {
      const remainingLife = life - year + 1
      const depreciation = year === 0 ? 0 : (depreciableAmount * remainingLife) / sumOfYears
      
      if (year > 0) {
        accumulatedDep += depreciation
      }
      
      const endingValue = cost - accumulatedDep
      
      schedule.push({
        year,
        beginningValue: year === 0 ? cost : cost - (accumulatedDep - depreciation),
        depreciation,
        accumulatedDepreciation: accumulatedDep,
        endingValue,
        depreciationRate: year === 0 ? 0 : (depreciation / cost) * 100
      })
    }
    
    return schedule
  }

  const handleCalculate = () => {
    let result: DepreciationScheduleItem[] = []
    
    switch (method) {
      case 'straight-line':
        result = calculateStraightLine()
        break
      case 'declining-balance':
        result = calculateDecliningBalance()
        break
      case 'sum-of-years':
        result = calculateSumOfYears()
        break
    }
    
    setSchedule(result)
    setShowSchedule(true)
  }

  const getCurrentValue = () => {
    if (schedule.length === 0) return 0
    return schedule[schedule.length - 1].endingValue
  }

  const getTotalDepreciation = () => {
    if (schedule.length === 0) return 0
    return schedule[schedule.length - 1].accumulatedDepreciation
  }

  const methodNames = {
    'straight-line': 'פחת קווי (Straight-Line)',
    'declining-balance': 'פחת מואץ (Declining Balance)',
    'sum-of-years': 'סכום שנות השימוש (Sum of Years)'
  }

  const methodDescriptions = {
    'straight-line': 'פחת שווה בכל שנה - השיטה הנפוצה ביותר בישראל',
    'declining-balance': 'פחת גבוה יותר בשנים הראשונות - מתאים לציוד שמתיישן מהר',
    'sum-of-years': 'פחת מואץ אך מתון יותר - מתאים לנכסים עם ירידת ערך מהירה בתחילה'
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendDown size={32} weight="duotone" className="text-primary" />
            מחשבון פחת מתקדם
          </h2>
          <p className="text-muted-foreground mt-1">
            חישוב פחת לפי שיטות שונות עם לוח זמנים מפורט
          </p>
        </div>
        <Button onClick={handleCalculate} size="lg" className="gap-2">
          <Calculator size={20} weight="duotone" />
          חשב פחת
        </Button>
      </div>

      <Alert>
        <Info size={20} weight="duotone" />
        <AlertDescription>
          <strong>פחת</strong> מייצג את ירידת הערך של נכס לאורך זמן עקב שחיקה פיזית, התיישנות תפקודית או כלכלית.
          הנוסחה הבסיסית: <code className="font-mono bg-muted px-2 py-0.5 rounded">פחת = (עלות - ערך שייר) ÷ תוחלת חיים</code>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLineDown size={24} weight="duotone" />
              שיטת חישוב
            </CardTitle>
            <CardDescription>
              בחירת שיטת פחת מתאימה
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="method">שיטת פחת</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight-line">פחת קווי (Straight-Line)</SelectItem>
                  <SelectItem value="declining-balance">פחת מואץ (Declining Balance)</SelectItem>
                  <SelectItem value="sum-of-years">סכום שנות שימוש (Sum of Years)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {methodDescriptions[method]}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm">הסבר השיטה:</h4>
              {method === 'straight-line' && (
                <div className="text-xs space-y-1">
                  <p>• פחת זהה בכל שנה</p>
                  <p>• נוסחה: (עלות - ערך שייר) ÷ שנות חיים</p>
                  <p>• מומלץ למבנים ונדל"ן</p>
                </div>
              )}
              {method === 'declining-balance' && (
                <div className="text-xs space-y-1">
                  <p>• פחת גבוה בשנים הראשונות</p>
                  <p>• נוסחה: ערך פנקסני × (2 ÷ שנות חיים)</p>
                  <p>• מומלץ לציוד טכנולוגי</p>
                </div>
              )}
              {method === 'sum-of-years' && (
                <div className="text-xs space-y-1">
                  <p>• פחת יורד הדרגתי</p>
                  <p>• נוסחה: (עלות - שייר) × (שנים נותרות ÷ סכום שנים)</p>
                  <p>• איזון בין קווי למואץ</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table size={24} weight="duotone" />
              פרמטרי חישוב
            </CardTitle>
            <CardDescription>
              נתונים בסיסיים לחישוב הפחת
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initialCost">עלות התחלתית (₪)</Label>
              <Input
                id="initialCost"
                type="number"
                value={initialCost}
                onChange={(e) => setInitialCost(e.target.value)}
                placeholder="2000000"
              />
              <p className="text-xs text-muted-foreground">
                עלות רכישה או בנייה מקורית של הנכס
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salvageValue">ערך שייר (₪)</Label>
              <Input
                id="salvageValue"
                type="number"
                value={salvageValue}
                onChange={(e) => setSalvageValue(e.target.value)}
                placeholder="200000"
              />
              <p className="text-xs text-muted-foreground">
                ערך צפוי בסוף תוחלת החיים (בדרך כלל 10-20% מהעלות)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usefulLife">תוחלת חיים (שנים)</Label>
                <Input
                  id="usefulLife"
                  type="number"
                  value={usefulLife}
                  onChange={(e) => setUsefulLife(e.target.value)}
                  placeholder="50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentAge">גיל נוכחי (שנים)</Label>
                <Input
                  id="currentAge"
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between text-sm">
                <span>סכום ניתן לפחת</span>
                <span className="font-bold">
                  {((parseFloat(initialCost) || 0) - (parseFloat(salvageValue) || 0)).toLocaleString('he-IL')} ₪
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showSchedule && schedule.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator size={24} weight="duotone" className="text-primary" />
              תוצאות חישוב - {methodNames[method]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm text-muted-foreground mb-1">ערך נוכחי</div>
                <div className="text-2xl font-bold text-primary">
                  {getCurrentValue().toLocaleString('he-IL')} ₪
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  לאחר {currentAge} שנים
                </div>
              </div>

              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="text-sm text-muted-foreground mb-1">פחת מצטבר</div>
                <div className="text-2xl font-bold text-destructive">
                  {getTotalDepreciation().toLocaleString('he-IL')} ₪
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {((getTotalDepreciation() / (parseFloat(initialCost) || 1)) * 100).toFixed(1)}% מהעלות
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground mb-1">פחת שנתי ממוצע</div>
                <div className="text-2xl font-bold">
                  {(getTotalDepreciation() / (parseFloat(currentAge) || 1)).toLocaleString('he-IL')} ₪
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  לשנה
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">התקדמות פחת</span>
                <span className="text-muted-foreground">
                  {((getTotalDepreciation() / ((parseFloat(initialCost) || 0) - (parseFloat(salvageValue) || 0))) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(getTotalDepreciation() / ((parseFloat(initialCost) || 0) - (parseFloat(salvageValue) || 0))) * 100}
                className="h-3"
              />
            </div>

            <Tabs defaultValue="table" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="table">לוח פחת</TabsTrigger>
                <TabsTrigger value="summary">סיכום</TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-3 text-right">שנה</th>
                          <th className="p-3 text-right">ערך תחילת שנה</th>
                          <th className="p-3 text-right">פחת שנתי</th>
                          <th className="p-3 text-right">פחת מצטבר</th>
                          <th className="p-3 text-right">ערך סוף שנה</th>
                          <th className="p-3 text-right">שיעור פחת</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className={`${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} ${
                              idx === schedule.length - 1 ? 'font-semibold bg-primary/5' : ''
                            }`}
                          >
                            <td className="p-3">{item.year}</td>
                            <td className="p-3">{item.beginningValue.toLocaleString('he-IL')}</td>
                            <td className="p-3 text-destructive">
                              {item.depreciation.toLocaleString('he-IL')}
                            </td>
                            <td className="p-3 text-destructive">
                              {item.accumulatedDepreciation.toLocaleString('he-IL')}
                            </td>
                            <td className="p-3 font-semibold">
                              {item.endingValue.toLocaleString('he-IL')}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{item.depreciationRate.toFixed(2)}%</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Alert>
                  <Info size={20} weight="duotone" />
                  <AlertDescription className="text-xs">
                    <strong>הערה:</strong> הטבלה מציגה את לוח הפחת עד לגיל הנוכחי של הנכס.
                    ניתן להגדיל את הגיל הנוכחי כדי לראות תחזית לשנים הבאות.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid gap-4">
                  <div className="p-4 rounded-lg border space-y-2">
                    <h4 className="font-semibold">פרטי חישוב</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">שיטת פחת</div>
                        <div className="font-medium">{methodNames[method]}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">עלות התחלתית</div>
                        <div className="font-medium">{parseFloat(initialCost).toLocaleString('he-IL')} ₪</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">ערך שייר</div>
                        <div className="font-medium">{parseFloat(salvageValue).toLocaleString('he-IL')} ₪</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">סכום ניתן לפחת</div>
                        <div className="font-medium">
                          {((parseFloat(initialCost) || 0) - (parseFloat(salvageValue) || 0)).toLocaleString('he-IL')} ₪
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">תוחלת חיים</div>
                        <div className="font-medium">{usefulLife} שנים</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">גיל נוכחי</div>
                        <div className="font-medium">{currentAge} שנים</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-3">נוסחת חישוב</h4>
                    <div className="font-mono text-sm space-y-1">
                      {method === 'straight-line' && (
                        <>
                          <div>פחת שנתי = (עלות - ערך שייר) ÷ תוחלת חיים</div>
                          <div className="text-muted-foreground">
                            = ({parseFloat(initialCost).toLocaleString('he-IL')} - {parseFloat(salvageValue).toLocaleString('he-IL')}) ÷ {usefulLife}
                          </div>
                          <div className="text-primary font-semibold">
                            = {(((parseFloat(initialCost) || 0) - (parseFloat(salvageValue) || 0)) / (parseFloat(usefulLife) || 1)).toLocaleString('he-IL')} ₪ לשנה
                          </div>
                        </>
                      )}
                      {method === 'declining-balance' && (
                        <>
                          <div>שיעור פחת = 2 ÷ תוחלת חיים</div>
                          <div>פחת = ערך פנקסני × שיעור פחת</div>
                          <div className="text-muted-foreground">
                            שיעור = 2 ÷ {usefulLife} = {(2 / (parseFloat(usefulLife) || 1) * 100).toFixed(2)}%
                          </div>
                        </>
                      )}
                      {method === 'sum-of-years' && (
                        <>
                          <div>סכום שנים = n(n+1) ÷ 2</div>
                          <div>פחת = (עלות - שייר) × (שנים נותרות ÷ סכום שנים)</div>
                          <div className="text-muted-foreground">
                            סכום שנים = {usefulLife}×{parseInt(usefulLife)+1} ÷ 2 = {(parseFloat(usefulLife) * (parseFloat(usefulLife) + 1)) / 2}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Alert>
                    <Warning size={20} weight="duotone" />
                    <AlertDescription className="text-xs">
                      <strong>מקור משפטי:</strong> חישובי הפחת מבוססים על תקן שמאי 19 ועל עקרונות חשבונאות מקובלים (GAAP).
                      יש להתאים את שיטת הפחת לסוג הנכס ולמטרת השומה.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
