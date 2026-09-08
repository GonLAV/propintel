import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkle, Warning, CheckCircle, X, Eye, Robot, TrendUp, Target } from '@phosphor-icons/react'
import { toast } from 'sonner'

const typeLabels = {
  'comparable-suggestion': 'הצעת עסקאות דומות',
  'price-anomaly': 'חריגת מחיר',
  'internal-contradiction': 'סתירה פנימית',
  'market-trend': 'מגמת שוק',
  'risk-warning': 'אזהרת סיכון',
  'text-draft': 'טיוטת טקסט'
}

const severityColors = {
  'info': 'border-primary bg-primary/10',
  'warning': 'border-warning bg-warning/10',
  'critical': 'border-destructive bg-destructive/10'
}

const typeIcons = {
  'comparable-suggestion': Target,
  'price-anomaly': Warning,
  'internal-contradiction': Warning,
  'market-trend': TrendUp,
  'risk-warning': Warning,
  'text-draft': Sparkle
}

export function AIInsights() {
  const [insights, setInsights] = useKV('ai-insights', [])
  const [_selectedInsight, setSelectedInsight] = useState(null)

  const generateSampleInsights = () => {
    const samples = [
      {
        id: crypto.randomUUID(),
        type: 'comparable-suggestion',
        severity: 'info',
        title: 'נמצאו 3 עסקאות רלוונטיות נוספות',
        description: 'מערכת ה-AI זיהתה 3 עסקאות דומות שלא נכללו בניתוח: רחוב בן יהודה 15, רחוב ויצמן 8, ושדרות חן 22. כולן נמכרו ב-6 החודשים האחרונים באזור גיאוגרפי רלוונטי.',
        affectedEntity: {
          type: 'report',
          id: crypto.randomUUID(),
          name: 'דוח שומה - רחוב הרצל 10'
        },
        suggestions: [
          'להוסיף את העסקה ברחוב בן יהודה 15 (דומה מאוד בשטח וקומה)',
          'לבדוק את העסקה בשדרות חן 22 (מחיר גבוה יותר, אך דירה משופצת)',
          'לשקול להוסיף הערת שוק על מגמת עליית מחירים באזור'
        ],
        confidence: 0.89,
        dataSource: ['עסקאות ממשלתיות', 'מסד נתוני Madlan', 'ניתוח AI'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        type: 'price-anomaly',
        severity: 'warning',
        title: 'חריגת מחיר - שווי מוערך גבוה ב-18% מהממוצע',
        description: 'השווי המוערך של ₪1,850,000 גבוה ב-18% מהממוצע של עסקאות דומות באזור (₪1,570,000). המערכת זיהתה שהמחיר למ"ר (₪18,500) חורג משמעותית מטווח המחירים הרגיל באזור (₪14,500-16,500).',
        affectedEntity: {
          type: 'property',
          id: crypto.randomUUID(),
          name: 'נכס - רחוב הרצל 10'
        },
        suggestions: [
          'לבדוק שוב את ההתאמות שבוצעו (קומה, מצב, שיפוצים)',
          'לוודא שלא נעשתה טעות בשטח הנכס או בחישוב',
          'לשקול להוסיף הנמקה מפורטת למחיר הגבוה',
          'לבדוק אם יש מאפיינים ייחודיים שמצדיקים את המחיר'
        ],
        confidence: 0.92,
        dataSource: ['עסקאות דומות', 'סטטיסטיקת שוק', 'ניתוח AI'],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        type: 'internal-contradiction',
        severity: 'critical',
        title: 'סתירה פנימית בדוח - מצב פיזי לא תואם התאמות',
        description: 'הדוח מציין שמצב הנכס "דורש שיפוץ כולל" אך ההתאמה עבור מצב הנכס היא +5%. בדרך כלל, נכס הדורש שיפוץ כולל מקבל התאמה שלילית של 10%-20%.',
        affectedEntity: {
          type: 'report',
          id: crypto.randomUUID(),
          name: 'דוח שומה - שדרות רוטשילד 45'
        },
        suggestions: [
          'לתקן את המצב הפיזי או את ההתאמה להתאמה',
          'אם הנכס אכן דורש שיפוץ - לשנות התאמה ל--15%',
          'אם הנכס במצב טוב - לעדכן את התיאור הפיזי',
          'להוסיף הסבר אם יש מצב מיוחד'
        ],
        confidence: 0.95,
        dataSource: ['ניתוח עקביות פנימית', 'כללי שמאות', 'AI Logic Check'],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        type: 'market-trend',
        severity: 'info',
        title: 'עלייה משמעותית במחירים באזור - 12% ב-6 חודשים',
        description: 'ניתוח מגמות השוק מראה עלייה חדה של 12% במחירי הדירות באזור זה בששת החודשים האחרונים. זו עלייה משמעותית מעבר לממוצע הארצי (5%). כדאי לציין זאת בדוח כגורם שוק רלוונטי.',
        affectedEntity: {
          type: 'report',
          id: crypto.randomUUID(),
          name: 'דוח שומה - שכונת הדר'
        },
        suggestions: [
          'להוסיף סעיף "מגמות שוק" לדוח',
          'לציין את העלייה החדה במחירים כגורם תומך בשומה',
          'לשקול להגדיל את טווח השווי בהתחשב בדינמיות השוק',
          'לציין שהשומה עשויה להשתנות במהירות'
        ],
        confidence: 0.87,
        dataSource: ['מדד מחירי דירות', 'עסקאות אזוריות', 'ניתוח מגמות AI'],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        type: 'text-draft',
        severity: 'info',
        title: 'טיוטת סיכום מנהלים מוכנה',
        description: 'מערכת ה-AI הכינה טיוטת סיכום מנהלים לדוח על בסיס הנתונים שהוזנו. הטקסט כולל: זיהוי נכס, שיטת שומה, שווי מוערך, והנמקה מקצועית. ניתן לערוך ולהתאים אישית.',
        affectedEntity: {
          type: 'report',
          id: crypto.randomUUID(),
          name: 'דוח שומה - בניין מסחרי'
        },
        suggestions: [
          'לעיין בטיוטה ולערוך לפי הצורך',
          'להוסיף נקודות ספציפיות לנכס זה',
          'לוודא שהטון והסגנון מתאימים לסטנדרט המשרד'
        ],
        confidence: 0.78,
        dataSource: ['נתוני נכס', 'תבניות דוח', 'GPT-4 Text Generation'],
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      }
    ]

    setInsights(current => [...samples, ...(current || [])])
    toast.success(`${samples.length} תובנות AI נוספו`)
  }

  const handleDismiss = (insightId) => {
    setInsights(current =>
      (current || []).map(i =>
        i.id === insightId
          ? { ...i, dismissedAt: new Date().toISOString() }
          : i
      )
    )
    toast.success('תובנה נדחתה')
  }

  const handleAcknowledge = (insightId, action) => {
    setInsights(current =>
      (current || []).map(i =>
        i.id === insightId
          ? {
              ...i,
              acknowledgedAt: new Date().toISOString(),
              actionTaken: action || 'נצפה ונבדק'
            }
          : i
      )
    )
    toast.success('תובנה אושרה')
  }

  const activeInsights = (insights || []).filter(i => !i.dismissedAt && !i.acknowledgedAt)
  const acknowledgedInsights = (insights || []).filter(i => i.acknowledgedAt)
  const _dismissedInsights = (insights || []).filter(i => i.dismissedAt)

  const stats = {
    total: insights?.length || 0,
    active: activeInsights.length,
    critical: activeInsights.filter(i => i.severity === 'critical').length,
    acknowledged: acknowledgedInsights.length
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Robot size={32} weight="duotone" className="text-primary" />
            AI חכם - תובנות ואזהרות
          </h2>
          <p className="text-muted-foreground mt-2">
            בינה מלאכותית מסייעת - השמאי מחליט
          </p>
        </div>
        <Button className="gap-2" onClick={generateSampleInsights}>
          <Sparkle size={20} weight="fill" />
          ייצר תובנות לדוגמה
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">סה"כ תובנות</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <Robot size={40} weight="duotone" className="text-primary" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">פעילות</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.active}</p>
            </div>
            <Sparkle size={40} weight="duotone" className="text-accent" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">קריטיות</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.critical}</p>
            </div>
            <Warning size={40} weight="duotone" className="text-destructive" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">טופלו</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.acknowledged}</p>
            </div>
            <CheckCircle size={40} weight="duotone" className="text-success" />
          </div>
        </Card>
      </div>

      {activeInsights.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkle size={24} weight="fill" className="text-primary" />
            תובנות פעילות
          </h3>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {activeInsights.map(insight => {
                const Icon = typeIcons[insight.type]
                return (
                  <Alert key={insight.id} className={`${severityColors[insight.severity]} border-2`}>
                    <div className="flex items-start gap-4">
                      <Icon size={24} weight="duotone" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{typeLabels[insight.type]}</Badge>
                              <Badge
                                className={
                                  insight.severity === 'critical'
                                    ? 'bg-destructive text-destructive-foreground'
                                    : insight.severity === 'warning'
                                    ? 'bg-warning text-warning-foreground'
                                    : 'bg-primary text-primary-foreground'
                                }
                              >
                                {insight.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                דיוק: {Math.round(insight.confidence * 100)}%
                              </span>
                            </div>
                            <h4 className="font-semibold text-lg mb-2">{insight.title}</h4>
                          </div>
                        </div>
                        <AlertDescription>
                          <p className="mb-3">{insight.description}</p>
                          <div className="mb-3">
                            <p className="text-sm font-semibold mb-1">נכס/דוח:</p>
                            <p className="text-sm">{insight.affectedEntity.name}</p>
                          </div>
                          {insight.suggestions && insight.suggestions.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold mb-2">המלצות:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {insight.suggestions.map((suggestion, idx) => (
                                  <li key={idx}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground">
                              מקורות: {insight.dataSource.join(' • ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(insight.createdAt).toLocaleString('he-IL')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            <Button
                              size="sm"
                              onClick={() => handleAcknowledge(insight.id)}
                            >
                              <CheckCircle size={16} />
                              אישור - טיפלתי בזה
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedInsight(insight)}
                            >
                              <Eye size={16} />
                              פרטים
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDismiss(insight.id)}
                            >
                              <X size={16} />
                              דחה
                            </Button>
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {activeInsights.length === 0 && (
        <Card className="p-12 text-center glass-effect">
          <Robot size={64} weight="duotone" className="mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg text-muted-foreground">אין תובנות AI פעילות</p>
          <p className="text-sm text-muted-foreground mt-2">
            המערכת תייצר תובנות אוטומטית כשתעבוד על שומות
          </p>
          <Button className="mt-4 gap-2" onClick={generateSampleInsights}>
            <Sparkle size={18} weight="fill" />
            ייצר תובנות לדוגמה
          </Button>
        </Card>
      )}

      <Alert className="border-warning bg-warning/5">
        <Warning size={20} weight="fill" className="text-warning" />
        <AlertDescription>
          <strong>חשוב:</strong> ה-AI מספק המלצות והצעות בלבד. כל החלטה סופית היא באחריות השמאי המוסמך.
          אין להסתמך על AI לקביעת שווי סופי או חתימה על דוחות.
        </AlertDescription>
      </Alert>
    </div>
  )
}