import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calculator, Info, FloppyDisk, TrendUp, TrendDown, Equals } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

interface QuickerScenario {
  id: string
  name: string
  area: number
  pricePerSqm: number
  valuation: number
  timestamp: Date
}

export function QuickerCalculator() {
  const [area, setArea] = useState<string>('')
  const [pricePerSqm, setPricePerSqm] = useState<string>('')
  const [scenarios, setScenarios] = useKV<QuickerScenario[]>('quicker-scenarios', [])

  const valuation = area && pricePerSqm 
    ? parseFloat(area) * parseFloat(pricePerSqm) 
    : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('he-IL').format(value)
  }

  const saveScenario = (type: 'conservative' | 'market' | 'optimistic') => {
    if (!area || !pricePerSqm) {
      toast.error('יש למלא שטח ומחיר למ"ר')
      return
    }

    const multipliers = {
      conservative: 0.85,
      market: 1.0,
      optimistic: 1.15
    }

    const labels = {
      conservative: 'שמרני',
      market: 'שוק',
      optimistic: 'אופטימי'
    }

    const adjustedPrice = parseFloat(pricePerSqm) * multipliers[type]
    const adjustedValuation = parseFloat(area) * adjustedPrice

    const newScenario: QuickerScenario = {
      id: Date.now().toString(),
      name: `${labels[type]} - ${new Date().toLocaleDateString('he-IL')}`,
      area: parseFloat(area),
      pricePerSqm: adjustedPrice,
      valuation: adjustedValuation,
      timestamp: new Date()
    }

    setScenarios((current) => [...(current || []), newScenario])
    toast.success(`תרחיש ${labels[type]} נשמר בהצלחה`)
  }

  const deleteScenario = (id: string) => {
    setScenarios((current) => (current || []).filter(s => s.id !== id))
    toast.success('תרחיש נמחק')
  }

  const calculateRange = () => {
    if (!valuation) return null

    return {
      conservative: valuation * 0.85,
      market: valuation,
      optimistic: valuation * 1.15
    }
  }

  const range = calculateRange()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Calculator className="w-6 h-6 text-primary" weight="duotone" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
              QUICKER - שומה מהירה
            </h1>
            <p className="text-muted-foreground">חישוב שווי נכס בשיטה הפשוטה והמהירה</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-info/10 border-2 border-info/30 bg-primary/5 border-primary/30">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" weight="duotone" />
          <div className="space-y-2 text-sm">
            <h3 className="font-bold text-foreground">💡 מהו QUICKER ומתי להשתמש בו?</h3>
            <p className="text-muted-foreground">
              <strong className="text-primary">QUICKER</strong> הוא מחשבון פשוט ומהיר שמבוסס על הנוסחה: 
              <strong className="font-mono text-foreground"> שווי = שטח × מחיר למ"ר</strong>
            </p>
            <div className="bg-background/60 p-3 rounded-lg space-y-2">
              <p className="font-semibold text-foreground">✅ מתאים ל:</p>
              <ul className="text-xs text-muted-foreground space-y-1 mr-6 list-disc list-inside">
                <li>הערכת שווי ראשונית מהירה</li>
                <li>בדיקה לפני קנייה/מכירה</li>
                <li>השוואה בין כמה נכסים</li>
                <li>סינון עסקאות</li>
              </ul>
              <p className="font-semibold text-foreground mt-3">❌ לא מתאים ל:</p>
              <ul className="text-xs text-muted-foreground space-y-1 mr-6 list-disc list-inside">
                <li>שומה רשמית לבנק או בית משפט</li>
                <li>היטל השבחה או הליכים משפטיים</li>
                <li>תכנון פיננסי מורכב</li>
              </ul>
            </div>
            <p className="text-xs text-warning bg-warning/10 p-2 rounded border border-warning/30">
              ⚠️ <strong>חשוב:</strong> זוהי שומה מהירה בלבד. לצרכים מקצועיים נדרשת שומה מלאה של שמאי מוסמך.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Card */}
        <Card className="glass-effect p-6 lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" weight="duotone" />
              הנוסחה הבסיסית
            </h2>
            
            {/* Info Alert */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" weight="duotone" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">שווי נכס = שטח × מחיר למ״ר</p>
                  <p className="text-muted-foreground">
                    זה הכול. שיטה מהירה להערכת שווי ראשונית, סינון עסקאות ובדיקה מהירה לפני קנייה/מכירה.
                  </p>
                  <p className="text-xs text-warning">
                    ⚠️ שים לב: זוהי שומה מהירה בלבד ואינה מהווה תחליף לשומה מקצועית מלאה לצרכי בנק או בית משפט
                  </p>
                </div>
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="area" className="text-sm font-medium">
                  שטח הנכס (מ״ר)
                </Label>
                <div className="relative">
                  <Input
                    id="area"
                    type="number"
                    min="0"
                    step="0.1"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="לדוגמה: 90"
                    className="text-lg font-mono pr-12"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    מ״ר
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-per-sqm" className="text-sm font-medium">
                  מחיר למ״ר (₪)
                </Label>
                <div className="relative">
                  <Input
                    id="price-per-sqm"
                    type="number"
                    min="0"
                    step="100"
                    value={pricePerSqm}
                    onChange={(e) => setPricePerSqm(e.target.value)}
                    placeholder="לדוגמה: 20000"
                    className="text-lg font-mono pr-12"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    ₪
                  </span>
                </div>
              </div>
            </div>

            {/* Calculation Display */}
            {valuation > 0 && (
              <div className="mt-6 p-6 rounded-xl bg-linear-to-bl from-primary/10 to-accent/10 border border-primary/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="font-mono">{formatNumber(parseFloat(area))} מ״ר</span>
                    <Equals className="w-4 h-4" />
                    <span className="font-mono">{formatNumber(parseFloat(pricePerSqm))} ₪/מ״ר</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">שווי משוער</p>
                    <p className="text-4xl font-bold font-mono bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
                      {formatCurrency(valuation)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scenario Buttons */}
            {valuation > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-3">שמור תרחיש:</p>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => saveScenario('conservative')}
                    className="flex items-center gap-2"
                  >
                    <TrendDown className="w-4 h-4 text-destructive" />
                    שמרני (-15%)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => saveScenario('market')}
                    className="flex items-center gap-2"
                  >
                    <Equals className="w-4 h-4 text-primary" />
                    שוק (מדויק)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => saveScenario('optimistic')}
                    className="flex items-center gap-2"
                  >
                    <TrendUp className="w-4 h-4 text-success" />
                    אופטימי (+15%)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Value Range Card */}
        {range && (
          <Card className="glass-effect p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-4">טווח שווי</h3>
            
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">שמרני</span>
                  <TrendDown className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-xl font-bold font-mono text-destructive">
                  {formatCurrency(range.conservative)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">85% מערך השוק</p>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">שוק</span>
                  <Equals className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-bold font-mono text-primary">
                  {formatCurrency(range.market)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">100% ערך שוק</p>
              </div>

              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">אופטימי</span>
                  <TrendUp className="w-4 h-4 text-success" />
                </div>
                <p className="text-xl font-bold font-mono text-success">
                  {formatCurrency(range.optimistic)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">115% מערך השוק</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                הטווח מבוסס על תנודתיות שוק סטנדרטית של ±15%
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* How to Determine Price per SQM */}
      <Card className="glass-effect p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-accent" weight="duotone" />
          איך קובעים מחיר למ״ר ב-QUICKER?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-card border">
            <div className="text-2xl mb-2">1️⃣</div>
            <h4 className="font-semibold mb-2">עסקאות אחרונות</h4>
            <p className="text-sm text-muted-foreground">
              בדוק 2-3 עסקאות דומות בבניין או ברחוב (אותו טיפוס, אותו אזור)
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card border">
            <div className="text-2xl mb-2">2️⃣</div>
            <h4 className="font-semibold mb-2">חישוב פשוט</h4>
            <p className="text-sm text-muted-foreground">
              מחיר עסקה ÷ שטח = מחיר למ״ר
            </p>
            <p className="text-xs text-primary mt-2 font-mono">
              1,800,000 ₪ ÷ 90 מ״ר = 20,000 ₪/מ״ר
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card border">
            <div className="text-2xl mb-2">3️⃣</div>
            <h4 className="font-semibold mb-2">ממוצע גס</h4>
            <p className="text-sm text-muted-foreground">
              עשה ממוצע של 2-3 עסקאות לקבלת מחיר אמין יותר
            </p>
          </div>
        </div>
      </Card>

      {/* When is QUICKER Legitimate */}
      <Card className="glass-effect p-6">
        <h3 className="text-lg font-semibold mb-4">מתי QUICKER נחשב לגיטימי?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-success">
              <span className="text-xl">✔️</span>
              מתאים ל:
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>הערכת שווי כללית</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>בדיקה מהירה לפני מכירה / קנייה</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>סינון עסקאות</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>מחשבון ראשוני לשמאים</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>השוואה מהירה בין נכסים</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-destructive">
              <span className="text-xl">❌</span>
              לא מתאים ל:
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>שומה מלאה לבנק</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>דוח שמאי לבית משפט</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>השבחה / היטל השבחה</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>הליכים משפטיים</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>תכנון פיננסי מורכב</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Saved Scenarios */}
      {scenarios && scenarios.length > 0 && (
        <Card className="glass-effect p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FloppyDisk className="w-5 h-5 text-primary" weight="duotone" />
              תרחישים שמורים
            </h3>
            <Badge variant="secondary">{scenarios.length} תרחישים</Badge>
          </div>

          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="p-4 rounded-lg bg-card border flex items-center justify-between hover:border-primary/50 transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-semibold">{scenario.name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-mono">{formatNumber(scenario.area)} מ״ר</span>
                    <span>×</span>
                    <span className="font-mono">{formatNumber(scenario.pricePerSqm)} ₪/מ״ר</span>
                    <span>=</span>
                    <span className="font-mono font-semibold text-primary">
                      {formatCurrency(scenario.valuation)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteScenario(scenario.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  מחק
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Example */}
      <Card className="glass-effect p-6 bg-linear-to-bl from-accent/5 to-primary/5">
        <h3 className="text-lg font-semibold mb-4">דוגמה מספרית</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-card/50 border">
              <p className="text-sm text-muted-foreground mb-1">שטח הדירה</p>
              <p className="text-2xl font-bold font-mono">90 מ״ר</p>
            </div>
            <div className="p-4 rounded-lg bg-card/50 border">
              <p className="text-sm text-muted-foreground mb-1">מחיר שוק ממוצע למ״ר</p>
              <p className="text-2xl font-bold font-mono">20,000 ₪</p>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-linear-to-l from-primary/10 to-accent/10 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-2">חישוב:</p>
            <p className="text-xl font-mono mb-2">90 × 20,000 =</p>
            <p className="text-4xl font-bold font-mono bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
              1,800,000 ₪
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
