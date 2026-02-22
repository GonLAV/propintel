import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendUp, 
  TrendDown,
  ChartLine,
  CurrencyDollar,
  Calculator,
  Sparkle,
  Calendar,
  Target
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface InvestmentAnalysisProps {
  propertyValue: number
  neighborhood: string
  propertyType: string
}

export function InvestmentAnalysis({ propertyValue, neighborhood, propertyType }: InvestmentAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1y' | '3y' | '5y' | '10y'>('5y')

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    
    try {
      const promptText = `You are a real estate investment analyst. Analyze this property investment:
      - Current Value: ₪${propertyValue.toLocaleString()}
      - Neighborhood: ${neighborhood}
      - Property Type: ${propertyType}
      - Timeframe: ${selectedTimeframe}
      
      Generate a detailed investment analysis with realistic Israeli market data. Return JSON with:
      {
        "projectedValue": number (projected value after timeframe),
        "expectedReturn": number (percentage),
        "appreciationRate": number (yearly percentage),
        "rentalYield": number (percentage),
        "riskScore": number (1-100, where 100 is highest risk),
        "liquidityScore": number (1-100, where 100 is most liquid),
        "marketTrend": "bullish" | "neutral" | "bearish",
        "investmentGrade": "A+" | "A" | "B+" | "B" | "C+" | "C",
        "strengths": string[] (3-4 key strengths),
        "risks": string[] (2-3 key risks),
        "recommendation": string (detailed recommendation in Hebrew)
      }`

      const response = await window.spark.llm(promptText, 'gpt-4o', true)
      const data = JSON.parse(response)
      setAnalysis(data)
      toast.success('ניתוח הושלם בהצלחה')
    } catch (_error) {
      toast.error('שגיאה בניתוח ההשקעה')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const timeframes = [
    { value: '1y' as const, label: 'שנה' },
    { value: '3y' as const, label: '3 שנים' },
    { value: '5y' as const, label: '5 שנים' },
    { value: '10y' as const, label: '10 שנים' },
  ]

  const gradeColors: Record<string, string> = {
    'A+': 'bg-success text-success-foreground',
    'A': 'bg-success/80 text-success-foreground',
    'B+': 'bg-accent text-accent-foreground',
    'B': 'bg-accent/80 text-accent-foreground',
    'C+': 'bg-warning text-warning-foreground',
    'C': 'bg-warning/80 text-warning-foreground',
  }

  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ChartLine size={24} weight="duotone" className="text-primary" />
            ניתוח השקעה מתקדם
          </CardTitle>
          <div className="flex gap-2">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={selectedTimeframe === tf.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeframe(tf.value)}
                className={selectedTimeframe === tf.value ? 'bg-primary' : ''}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!analysis ? (
          <div className="py-12 text-center space-y-4">
            <Calculator size={64} className="mx-auto text-muted-foreground/50" weight="duotone" />
            <div>
              <h3 className="text-xl font-semibold mb-2">נתח את פוטנציאל ההשקעה</h3>
              <p className="text-muted-foreground mb-6">
                קבל תובנות AI על ערך עתידי, תשואה צפויה, ורמת סיכון
              </p>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-2 bg-linear-to-r from-primary to-accent hover:opacity-90 glow-primary"
              >
                {isAnalyzing ? (
                  <>מנתח...</>
                ) : (
                  <>
                    <Sparkle size={20} weight="fill" />
                    הפעל ניתוח AI
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="glass-effect p-4 rounded-lg border border-primary/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">ערך חזוי</span>
                </div>
                <div className="text-2xl font-mono font-bold text-primary">
                  ₪{(analysis.projectedValue / 1000000).toFixed(2)}M
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  תוך {selectedTimeframe}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-effect p-4 rounded-lg border border-accent/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendUp size={18} className="text-accent" />
                  <span className="text-sm text-muted-foreground">תשואה צפויה</span>
                </div>
                <div className="text-2xl font-mono font-bold text-accent">
                  +{analysis.expectedReturn.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {analysis.appreciationRate.toFixed(1)}% בשנה
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-effect p-4 rounded-lg border border-success/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CurrencyDollar size={18} className="text-success" />
                  <span className="text-sm text-muted-foreground">תשואת שכירות</span>
                </div>
                <div className="text-2xl font-mono font-bold text-success">
                  {analysis.rentalYield.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  תשואה שנתית
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="glass-effect p-4 rounded-lg border border-border/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ChartLine size={18} className="text-foreground" />
                  <span className="text-sm text-muted-foreground">דירוג השקעה</span>
                </div>
                <Badge className={`text-lg font-bold ${gradeColors[analysis.investmentGrade] || 'bg-muted'}`}>
                  {analysis.investmentGrade}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  מעולה
                </div>
              </motion.div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-effect border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendUp size={18} className="text-primary" />
                    מגמת שוק
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge 
                      className={
                        analysis.marketTrend === 'bullish' 
                          ? 'bg-success text-success-foreground' 
                          : analysis.marketTrend === 'bearish'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {analysis.marketTrend === 'bullish' ? 'עולה' : analysis.marketTrend === 'bearish' ? 'יורד' : 'יציב'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">סטטוס נוכחי</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator size={18} className="text-accent" />
                    פרמטרי סיכון
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{analysis.riskScore}%</span>
                      <span className="text-muted-foreground">רמת סיכון</span>
                    </div>
                    <Progress value={analysis.riskScore} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{analysis.liquidityScore}%</span>
                      <span className="text-muted-foreground">נזילות</span>
                    </div>
                    <Progress value={analysis.liquidityScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-effect border-success/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-success">
                    <TrendUp size={18} />
                    יתרונות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {analysis.strengths.map((strength: string, i: number) => (
                      <li key={i}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex items-start gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                          <span>{strength}</span>
                        </motion.div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass-effect border-warning/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-warning">
                    <TrendDown size={18} />
                    סיכונים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {analysis.risks.map((risk: string, i: number) => (
                      <li key={i}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + i * 0.1 }}
                          className="flex items-start gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                          <span>{risk}</span>
                        </motion.div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-effect border-primary/20 bg-linear-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkle size={18} className="text-primary" weight="fill" />
                  המלצת AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-right">
                  {analysis.recommendation}
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                variant="outline"
                className="gap-2"
              >
                <Sparkle size={16} />
                נתח מחדש
              </Button>
              <Button className="flex-1 gap-2 bg-linear-to-r from-primary to-accent hover:opacity-90">
                <Calendar size={18} />
                שמור ניתוח
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
