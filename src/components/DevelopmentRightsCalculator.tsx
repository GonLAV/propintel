import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, TrendUp, Buildings, Car, Square } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface DevelopmentCalculation {
  lotSize: number
  zoning: string
  far: number
  coverage: number
  heightLimit: number
  maxFloors: number
  setbacks: {
    front: number
    rear: number
    side: number
  }
  maxBuildableArea: number
  maxCoverageArea: number
  parkingRequired: number
  landValue: number
  developmentValue: number
  constructionCost: number
  utilizationPercent: number
}

export function DevelopmentRightsCalculator() {
  const [lotSize, setLotSize] = useState('500')
  const [zoning, setZoning] = useState('residential-b')
  const [currentUtilization, setCurrentUtilization] = useState('250')
  const [calculation, setCalculation] = useState<DevelopmentCalculation | null>(null)

  const zoningData: Record<string, { name: string; far: number; coverage: number; height: number; maxFloors: number }> = {
    'residential-a': { name: 'מגורים א', far: 1.0, coverage: 50, height: 12, maxFloors: 4 },
    'residential-b': { name: 'מגורים ב', far: 1.2, coverage: 55, height: 15, maxFloors: 5 },
    'residential-c': { name: 'מגורים ג', far: 1.5, coverage: 60, height: 18, maxFloors: 6 },
    'residential-d': { name: 'מגורים ד', far: 2.0, coverage: 65, height: 24, maxFloors: 8 },
    'commercial': { name: 'מסחרי', far: 2.5, coverage: 70, height: 30, maxFloors: 10 },
    'mixed': { name: 'מעורב', far: 2.2, coverage: 65, height: 27, maxFloors: 9 },
    'industrial': { name: 'תעשייה', far: 1.8, coverage: 75, height: 12, maxFloors: 3 }
  }

  const handleCalculate = () => {
    const lot = parseFloat(lotSize)
    const current = parseFloat(currentUtilization)

    if (!lot || lot <= 0) {
      toast.error('שגיאה', { description: 'נא להזין שטח מגרש תקין' })
      return
    }

    const zoningInfo = zoningData[zoning]
    const maxBuildable = lot * zoningInfo.far
    const maxCoverage = lot * (zoningInfo.coverage / 100)
    const parkingSpaces = Math.ceil(maxBuildable / 50)
    
    const constructionCostPerSqm = 7000
    const totalConstructionCost = maxBuildable * constructionCostPerSqm
    const avgSalePrice = 25000
    const totalDevelopmentValue = maxBuildable * avgSalePrice
    const landValueByResidual = totalDevelopmentValue - totalConstructionCost - (totalDevelopmentValue * 0.15)
    const utilizationPct = (current / maxBuildable) * 100

    setCalculation({
      lotSize: lot,
      zoning: zoningInfo.name,
      far: zoningInfo.far,
      coverage: zoningInfo.coverage,
      heightLimit: zoningInfo.height,
      maxFloors: zoningInfo.maxFloors,
      setbacks: {
        front: 3,
        rear: 3,
        side: 2
      },
      maxBuildableArea: maxBuildable,
      maxCoverageArea: maxCoverage,
      parkingRequired: parkingSpaces,
      landValue: landValueByResidual,
      developmentValue: totalDevelopmentValue,
      constructionCost: totalConstructionCost,
      utilizationPercent: Math.min(utilizationPct, 100)
    })

    toast.success('חישוב הושלם')
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="glass-effect border-border/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator size={28} weight="duotone" className="text-primary" />
          <div>
            <h2 className="text-2xl font-bold bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
              מחשבון זכויות בנייה
            </h2>
            <p className="text-sm text-muted-foreground">
              ניתוח פוטנציאל פיתוח וערך קרקע לפי זכויות תכנוניות
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="lot-size">שטח מגרש (מ"ר)</Label>
            <Input
              id="lot-size"
              type="number"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              placeholder="500"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoning">ייעוד/זונינג</Label>
            <Select value={zoning} onValueChange={setZoning}>
              <SelectTrigger id="zoning">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(zoningData).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name} (יחס בנייה {value.far})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-util">ניצול נוכחי (מ"ר)</Label>
            <Input
              id="current-util"
              type="number"
              value={currentUtilization}
              onChange={(e) => setCurrentUtilization(e.target.value)}
              placeholder="250"
              className="font-mono"
            />
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={handleCalculate} className="w-full gap-2" size="lg">
            <Calculator size={20} weight="duotone" />
            חשב זכויות בנייה
          </Button>
        </div>
      </Card>

      {calculation && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-effect border-primary/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Buildings size={20} weight="duotone" className="text-primary" />
                <h4 className="font-semibold text-sm">שטח בנייה מקסימלי</h4>
              </div>
              <div className="font-mono text-2xl font-bold text-primary mb-1">
                {calculation.maxBuildableArea.toLocaleString('he-IL')} מ"ר
              </div>
              <div className="text-xs text-muted-foreground">
                יחס בנייה: {calculation.far}
              </div>
            </Card>

            <Card className="glass-effect border-accent/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Square size={20} weight="duotone" className="text-accent" />
                <h4 className="font-semibold text-sm">שטח כיסוי מקסימלי</h4>
              </div>
              <div className="font-mono text-2xl font-bold text-accent mb-1">
                {calculation.maxCoverageArea.toLocaleString('he-IL')} מ"ר
              </div>
              <div className="text-xs text-muted-foreground">
                אחוז כיסוי: {calculation.coverage}%
              </div>
            </Card>

            <Card className="glass-effect border-success/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Buildings size={20} weight="duotone" className="text-success" />
                <h4 className="font-semibold text-sm">קומות/גובה</h4>
              </div>
              <div className="font-mono text-2xl font-bold text-success mb-1">
                {calculation.maxFloors} קומות
              </div>
              <div className="text-xs text-muted-foreground">
                גובה מקסימלי: {calculation.heightLimit}מ'
              </div>
            </Card>

            <Card className="glass-effect border-warning/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Car size={20} weight="duotone" className="text-warning" />
                <h4 className="font-semibold text-sm">חניות נדרשות</h4>
              </div>
              <div className="font-mono text-2xl font-bold text-warning mb-1">
                {calculation.parkingRequired}
              </div>
              <div className="text-xs text-muted-foreground">
                1 חניה לכל 50 מ"ר
              </div>
            </Card>
          </div>

          <Card className="glass-effect border-border/50 p-6">
            <h3 className="text-lg font-semibold mb-4">נתוני נסיגות</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">נסיגה קדמית</div>
                <div className="font-mono text-xl font-bold">{calculation.setbacks.front} מ'</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">נסיגה אחורית</div>
                <div className="font-mono text-xl font-bold">{calculation.setbacks.rear} מ'</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">נסיגה צדדית</div>
                <div className="font-mono text-xl font-bold">{calculation.setbacks.side} מ'</div>
              </div>
            </div>
          </Card>

          <Card className="glass-effect border-border/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendUp size={24} weight="duotone" className="text-primary" />
              <h3 className="text-lg font-semibold">ניתוח ערך קרקע - שיטת חילוץ</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 glass-effect rounded-lg">
                <span className="text-muted-foreground">שווי פרויקט מפותח</span>
                <span className="font-mono text-xl font-bold text-primary">
                  ₪{calculation.developmentValue.toLocaleString('he-IL')}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 glass-effect rounded-lg">
                <span className="text-muted-foreground">עלויות בנייה משוערות</span>
                <span className="font-mono text-xl font-bold text-warning">
                  -₪{calculation.constructionCost.toLocaleString('he-IL')}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 glass-effect rounded-lg">
                <span className="text-muted-foreground">רווח יזם (15%)</span>
                <span className="font-mono text-xl font-bold text-warning">
                  -₪{(calculation.developmentValue * 0.15).toLocaleString('he-IL')}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between items-center p-4 glass-effect rounded-lg border-2 border-success/30">
                <span className="text-lg font-semibold">ערך קרקע (שיטת חילוץ)</span>
                <span className="font-mono text-3xl font-bold text-success">
                  ₪{calculation.landValue.toLocaleString('he-IL')}
                </span>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">ניצול קיים</span>
                  <span className="font-mono font-bold">
                    {calculation.utilizationPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-l from-primary to-accent transition-all"
                    style={{ width: `${calculation.utilizationPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {calculation.utilizationPercent < 50
                    ? 'פוטנציאל פיתוח משמעותי'
                    : calculation.utilizationPercent < 80
                    ? 'ניצול בינוני - יש פוטנציאל'
                    : 'ניצול גבוה - פוטנציאל מוגבל'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="glass-effect border-border/50 p-6">
            <h3 className="text-lg font-semibold mb-4">סיכום והנחות</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Badge variant="outline">✓</Badge>
                <span>חישוב לפי ייעוד: {calculation.zoning}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">✓</Badge>
                <span>עלות בנייה משוערת: ₪7,000 למ"ר</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">✓</Badge>
                <span>מחיר מכירה משוער: ₪25,000 למ"ר</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">✓</Badge>
                <span>רווח יזם: 15% משווי פרויקט</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">⚠</Badge>
                <span className="text-warning">יש לאמת נתונים עם תכנית מפורטת</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">⚠</Badge>
                <span className="text-warning">לא כולל היטלי פיתוח והשבחה</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
