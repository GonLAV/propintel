import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  EnvelopeSimple,
  Plus,
  Trash,
  PencilSimple,
  Copy,
  Play,
  Pause,
  Stop,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Lightning,
  Users,
  ChartLine,
  Sparkle,
  Eye,
  Flask,
  Percent,
  TrendUp,
  SplitVertical
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

export type SequenceTrigger = 'manual' | 'report-sent' | 'invoice-sent' | 'no-response' | 'payment-overdue' | 'appointment-scheduled'
export type SequenceStatus = 'active' | 'paused' | 'completed' | 'archived'
export type EmailStepStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'skipped'

export interface ABTestVariant {
  id: string
  label: string
  subject: string
  message: string
  weight: number
  stats: {
    sent: number
    opened: number
    clicked: number
    replied: number
    openRate: number
    clickRate: number
    replyRate: number
  }
}

export interface EmailSequenceStep {
  id: string
  order: number
  delayDays: number
  delayHours: number
  subject: string
  message: string
  attachReport: boolean
  attachInvoice: boolean
  waitForResponse: boolean
  enabled: boolean
  abTestEnabled: boolean
  abTestVariants: ABTestVariant[]
}

export interface EmailSequence {
  id: string
  name: string
  description: string
  trigger: SequenceTrigger
  status: SequenceStatus
  steps: EmailSequenceStep[]
  createdAt: string
  updatedAt: string
  lastUsed?: string
  useCount: number
  isDefault: boolean
  tags: string[]
}

export interface SequenceExecution {
  id: string
  sequenceId: string
  sequenceName: string
  recipientEmail: string
  recipientName: string
  propertyId?: string
  propertyAddress?: string
  status: SequenceStatus
  currentStepIndex: number
  startedAt: string
  completedAt?: string
  pausedAt?: string
  steps: ExecutionStep[]
  metadata?: Record<string, any>
}

export interface ExecutionStep {
  stepId: string
  stepOrder: number
  status: EmailStepStatus
  scheduledFor: string
  sentAt?: string
  failedAt?: string
  errorMessage?: string
  opened?: boolean
  clicked?: boolean
  abTestVariantId?: string
  abTestVariantLabel?: string
}

const DEFAULT_SEQUENCES: EmailSequence[] = [
  {
    id: 'client-followup',
    name: 'מעקב אחר לקוח - סטנדרטי',
    description: 'רצף מעקב אוטומטי אחר לקוח לאחר משלוח דוח שמאות',
    trigger: 'report-sent',
    status: 'active',
    steps: [
      {
        id: 'step-1',
        order: 1,
        delayDays: 1,
        delayHours: 0,
        subject: 'האם קיבלת את הדוח? נשמח לעזור',
        message: `שלום {name},

רציתי לוודא שקיבלת את דוח השמאות עבור הנכס ב{address}.

האם יש לך שאלות או נקודות שדורשות הבהרה?
אני כאן כדי לעזור ולספק כל מידע נוסף שתצטרך.

בברכה,
{appraiser}`,
        attachReport: false,
        attachInvoice: false,
        waitForResponse: true,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      },
      {
        id: 'step-2',
        order: 2,
        delayDays: 3,
        delayHours: 0,
        subject: 'תזכורת: דוח השמאות שלך - יש שאלות?',
        message: `שלום {name},

רק רציתי לוודא שהכל ברור לגבי דוח השמאות.

נקודות חשובות שכדאי לשים לב אליהן:
• שווי השוק המעודכן: {value}
• השוואה לנכסים דומים באזור
• המלצות והערות מקצועיות

אני זמין לכל שאלה או הבהרה נוספת.

בברכה,
{appraiser}`,
        attachReport: true,
        attachInvoice: false,
        waitForResponse: true,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      },
      {
        id: 'step-3',
        order: 3,
        delayDays: 7,
        delayHours: 0,
        subject: 'האם אתה מרוצה מהשירות? נשמח למשob',
        message: `שלום {name},

עבר שבוע מאז שלחתי לך את הדוח.

אשמח לשמוע את חוות דעתך על השירות:
• האם הדוח היה מקיף ומובן?
• האם קיבלת את כל המידע שחיפשת?
• האם תמליץ על השירות שלנו?

המשוב שלך חשוב מאוד לנו ועוזר לנו להשתפר.

בברכה,
{appraiser}`,
        attachReport: false,
        attachInvoice: false,
        waitForResponse: false,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    useCount: 0,
    isDefault: true,
    tags: ['לקוחות', 'מעקב', 'שביעות רצון']
  },
  {
    id: 'payment-reminder',
    name: 'תזכורת תשלום',
    description: 'רצף תזכורות אוטומטי לתשלום חשבונית באיחור',
    trigger: 'payment-overdue',
    status: 'active',
    steps: [
      {
        id: 'step-1',
        order: 1,
        delayDays: 1,
        delayHours: 0,
        subject: 'תזכורת ידידותית - חשבונית לתשלום',
        message: `שלום {name},

רצינו להזכיר בעדינות שחשבונית מספר {invoice} בסכום {amount} ממתינה לתשלום.

מועד התשלום: {dueDate}

אנו מבינים שלפעמים דברים יכולים להחמיץ, אז זו רק תזכורת ידידותית.

ניתן לשלם בדרכים הבאות:
• העברה בנקאית
• כרטיס אשראי
• המחאה

תודה רבה,
{appraiser}`,
        attachReport: false,
        attachInvoice: true,
        waitForResponse: true,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      },
      {
        id: 'step-2',
        order: 2,
        delayDays: 3,
        delayHours: 0,
        subject: 'תזכורת שנייה - חשבונית לתשלום',
        message: `שלום {name},

זו תזכורת נוספת לגבי חשבונית מספר {invoice} בסכום {amount}.

החשבונית באיחור של {daysOverdue} ימים.

אם כבר ביצעת את התשלום, אנא התעלם מהודעה זו.
אם יש בעיה כלשהי, אשמח לדבר ולמצוא פתרון.

ניתן ליצור קשר בטלפון או באימייל.

בברכה,
{appraiser}`,
        attachReport: false,
        attachInvoice: true,
        waitForResponse: true,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      },
      {
        id: 'step-3',
        order: 3,
        delayDays: 5,
        delayHours: 0,
        subject: 'דחוף - חשבונית באיחור משמעותי',
        message: `שלום {name},

החשבונית מספר {invoice} בסכום {amount} באיחור משמעותי.

איחור: {daysOverdue} ימים

אנא צור קשר בהקדם כדי לסגור את הנושא.
אני זמין לשיחה כדי למצוא פתרון מתאים.

תודה,
{appraiser}`,
        attachReport: false,
        attachInvoice: true,
        waitForResponse: false,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    useCount: 0,
    isDefault: true,
    tags: ['תשלום', 'חשבונית', 'תזכורת']
  },
  {
    id: 'nurture-campaign',
    name: 'טיפוח לקוחות פוטנציאליים',
    description: 'רצף טיפוח ללקוחות שביקשו מידע אך טרם הזמינו שירות',
    trigger: 'manual',
    status: 'active',
    steps: [
      {
        id: 'step-1',
        order: 1,
        delayDays: 0,
        delayHours: 2,
        subject: 'תודה על הפנייה - מידע על שירותי השמאות שלנו',
        message: `שלום {name},

תודה שפנית אלינו!

אנו מתמחים בשמאות נדל"ן מקצועית עם למעלה מ{experience} שנות ניסיון.

השירותים שלנו כוללים:
✓ שמאות דירות ובתים פרטיים
✓ שמאות נכסים מניבים
✓ שמאות קרקעות
✓ ייעוץ נדל"ן והשקעות

הדוחות שלנו מוכרים על ידי כל הבנקים ובתי המשפט.

האם תרצה לקבוע שיחת ייעוץ ללא עלות?

בברכה,
{appraiser}`,
        attachReport: false,
        attachInvoice: false,
        waitForResponse: true,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      },
      {
        id: 'step-2',
        order: 2,
        delayDays: 3,
        delayHours: 0,
        subject: 'איך עובד תהליך השמאות? מדריך מהיר',
        message: `שלום {name},

רציתי לשתף אותך במדריך קצר על תהליך השמאות:

שלב 1️⃣ - יצירת קשר ותיאום ביקור
שלב 2️⃣ - סיור בנכס וצילום
שלב 3️⃣ - ניתוח שוק והשוואת נכסים דומים
שלב 4️⃣ - הכנת הדוח המקצועי
שלב 5️⃣ - משלוח הדוח + הסבר והבהרות

⏱️ זמן ביצוע: 3-5 ימי עסקים
📄 דוח מקיף ומפורט
💰 מחיר שקוף וללא עלויות נסתרות

מעוניין לקבל הצעת מחיר ללא התחייבות?

בברכה,
{appraiser}`,
        attachReport: false,
        attachInvoice: false,
        waitForResponse: true,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      },
      {
        id: 'step-3',
        order: 3,
        delayDays: 7,
        delayHours: 0,
        subject: 'מקרה לדוגמה - כך עזרנו ללקוח דומה',
        message: `שלום {name},

רציתי לשתף אותך בסיפור הצלחה מלקוח שלנו:

🏡 הלקוח: בעל דירה בתל אביב
🎯 המטרה: רפיננס משכנתא
📊 התוצאה: חיסכון של 150,000 ₪ בריבית

"השמאות המקצועית של {company} עזרה לי לקבל אישור לרפיננס 
עם תנאים משמעותית יותר טובים. הדוח היה מפורט ומקצועי 
והבנק אישר אותו מיד." - דוד כהן

האם גם אתה מעוניין בשמאות מקצועית שתעזור לך להשיג את המטרות שלך?

בברכה,
{appraiser}`,
        attachReport: false,
        attachInvoice: false,
        waitForResponse: true,
        enabled: true,
        abTestEnabled: false,
        abTestVariants: []
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    useCount: 0,
    isDefault: true,
    tags: ['טיפוח', 'לידים', 'מכירות']
  }
]

interface ABTestResultsProps {
  sequences: EmailSequence[]
}

function ABTestResults({ sequences }: ABTestResultsProps) {
  const sequencesWithABTests = sequences.filter(seq => 
    seq.steps.some(step => step.abTestEnabled && step.abTestVariants.length > 0)
  )

  if (sequencesWithABTests.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flask size={20} className="text-primary" />
              מה זה בדיקת A/B?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              בדיקת A/B מאפשרת לך לבדוק גרסאות שונות של נושא ותוכן אימייל כדי לגלות מה עובד הכי טוב עם הלקוחות שלך.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <SplitVertical size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">חלוקה אוטומטית</p>
                  <p className="text-xs text-muted-foreground">המערכת מחלקת את הנמענים לפי המשקל שהגדרת</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ChartLine size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">מעקב מדויק</p>
                  <p className="text-xs text-muted-foreground">עוקב אחר פתיחות, קליקים ותגובות לכל גרסה</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendUp size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">זיהוי מנצחים</p>
                  <p className="text-xs text-muted-foreground">המערכת מזהה את הגרסה המצליחה ביותר</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-12 text-center">
            <Flask size={48} weight="duotone" className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">אין בדיקות A/B פעילות</p>
            <p className="text-sm text-muted-foreground">
              הפעל בדיקת A/B בעריכת רצף כדי לבדוק גרסאות שונות של אימיילים
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sequencesWithABTests.map(sequence => (
        <Card key={sequence.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {sequence.name}
                  <Badge variant="secondary" className="gap-1">
                    <Flask size={12} />
                    A/B מופעל
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">{sequence.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {sequence.steps
              .filter(step => step.abTestEnabled && step.abTestVariants.length > 0)
              .map((step, stepIndex) => (
                <div key={step.id} className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                      {stepIndex + 1}
                    </div>
                    <div>
                      <p className="font-medium">{step.subject || 'שלב ללא כותרת'}</p>
                      <p className="text-sm text-muted-foreground">
                        {step.abTestVariants.length} גרסאות בבדיקה
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {step.abTestVariants.map(variant => {
                      const hasStats = variant.stats.sent > 0
                      const bestOpenRate = Math.max(...step.abTestVariants.map(v => v.stats.openRate))
                      const bestClickRate = Math.max(...step.abTestVariants.map(v => v.stats.clickRate))
                      const isWinningOpen = hasStats && variant.stats.openRate === bestOpenRate && bestOpenRate > 0
                      const isWinningClick = hasStats && variant.stats.clickRate === bestClickRate && bestClickRate > 0

                      return (
                        <Card key={variant.id} className={cn(
                          "relative",
                          (isWinningOpen || isWinningClick) && "border-2 border-success"
                        )}>
                          {(isWinningOpen || isWinningClick) && (
                            <div className="absolute -top-3 right-4">
                              <Badge className="bg-success text-success-foreground gap-1">
                                <TrendUp size={12} />
                                מנצח
                              </Badge>
                            </div>
                          )}
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{variant.label}</Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Percent size={12} />
                                {variant.weight}%
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">נושא</p>
                              <p className="text-sm font-medium line-clamp-2">
                                {variant.subject || <span className="text-muted-foreground italic">לא הוגדר</span>}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">תוכן</p>
                              <p className="text-xs text-muted-foreground line-clamp-3">
                                {variant.message || <span className="italic">לא הוגדר</span>}
                              </p>
                            </div>

                            <Separator />

                            {hasStats ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">נשלחו</span>
                                  <span className="font-semibold">{variant.stats.sent}</span>
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <Eye size={12} />
                                      נפתחו
                                    </span>
                                    <span className="font-semibold text-primary">
                                      {variant.stats.openRate.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div 
                                      className="h-full bg-primary"
                                      style={{ width: `${variant.stats.openRate}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {variant.stats.opened} מתוך {variant.stats.sent}
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <TrendUp size={12} />
                                      לחצו
                                    </span>
                                    <span className="font-semibold text-accent">
                                      {variant.stats.clickRate.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                                    <div 
                                      className="h-full bg-accent"
                                      style={{ width: `${variant.stats.clickRate}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {variant.stats.clicked} מתוך {variant.stats.sent}
                                  </p>
                                </div>

                                {variant.stats.replied > 0 && (
                                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                                    <span className="text-muted-foreground">השיבו</span>
                                    <span className="font-semibold text-success">
                                      {variant.stats.replyRate.toFixed(1)}% ({variant.stats.replied})
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground">אין נתונים עדיין</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  הנתונים יופיעו לאחר שליחת אימיילים
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  {step.abTestVariants.some(v => v.stats.sent > 0) && (
                    <Card className="bg-muted/30">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                          <ChartLine size={20} className="text-primary" />
                          <h4 className="font-semibold">סיכום השוואתי</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">סה"כ נשלחו</p>
                            <p className="text-2xl font-bold">
                              {step.abTestVariants.reduce((sum, v) => sum + v.stats.sent, 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">ממוצע פתיחה</p>
                            <p className="text-2xl font-bold text-primary">
                              {(step.abTestVariants.reduce((sum, v) => sum + v.stats.openRate, 0) / step.abTestVariants.length).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">ממוצע קליקים</p>
                            <p className="text-2xl font-bold text-accent">
                              {(step.abTestVariants.reduce((sum, v) => sum + v.stats.clickRate, 0) / step.abTestVariants.length).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">הגרסה המנצחת</p>
                            <p className="text-lg font-bold text-success">
                              {step.abTestVariants.find(v => 
                                v.stats.openRate === Math.max(...step.abTestVariants.map(vv => vv.stats.openRate))
                              )?.label || '-'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function EmailSequences() {
  const [sequences, setSequences] = useKV<EmailSequence[]>('email-sequences', DEFAULT_SEQUENCES)
  const [executions, setExecutions] = useKV<SequenceExecution[]>('sequence-executions', [])
  
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('sequences')

  const handleCreateSequence = () => {
    const newSequence: EmailSequence = {
      id: `seq-${Date.now()}`,
      name: 'רצף חדש',
      description: '',
      trigger: 'manual',
      status: 'active',
      steps: [
        {
          id: `step-${Date.now()}`,
          order: 1,
          delayDays: 1,
          delayHours: 0,
          subject: '',
          message: '',
          attachReport: false,
          attachInvoice: false,
          waitForResponse: false,
          enabled: true,
          abTestEnabled: false,
          abTestVariants: []
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: 0,
      isDefault: false,
      tags: []
    }
    setSequences((current) => [...(current || []), newSequence])
    setSelectedSequence(newSequence)
    setIsCreateDialogOpen(true)
    toast.success('רצף חדש נוצר')
  }

  const handleDuplicateSequence = (sequence: EmailSequence) => {
    const duplicated: EmailSequence = {
      ...sequence,
      id: `seq-${Date.now()}`,
      name: `${sequence.name} (עותק)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useCount: 0
    }
    setSequences((current) => [...(current || []), duplicated])
    toast.success('הרצף שוכפל בהצלחה')
  }

  const handleDeleteSequence = (id: string) => {
    if (confirm('האם למחוק את הרצף?')) {
      setSequences((current) => (current || []).filter(s => s.id !== id))
      toast.success('הרצף נמחק')
    }
  }

  const handleToggleSequenceStatus = (id: string) => {
    setSequences((current) =>
      (current || []).map(seq =>
        seq.id === id
          ? { ...seq, status: seq.status === 'active' ? 'paused' : 'active' as SequenceStatus }
          : seq
      )
    )
  }

  const handleStartExecution = (sequence: EmailSequence, recipient: string, recipientName: string, metadata?: Record<string, any>) => {
    const execution: SequenceExecution = {
      id: `exec-${Date.now()}`,
      sequenceId: sequence.id,
      sequenceName: sequence.name,
      recipientEmail: recipient,
      recipientName,
      status: 'active',
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      steps: sequence.steps.filter(s => s.enabled).map((step, _index) => ({
        stepId: step.id,
        stepOrder: step.order,
        status: 'pending' as EmailStepStatus,
        scheduledFor: new Date(
          Date.now() + (step.delayDays * 24 * 60 * 60 * 1000) + (step.delayHours * 60 * 60 * 1000)
        ).toISOString()
      })),
      metadata
    }

    setExecutions((current) => [...(current || []), execution])
    setSequences((current) =>
      (current || []).map(seq =>
        seq.id === sequence.id
          ? { ...seq, useCount: seq.useCount + 1, lastUsed: new Date().toISOString() }
          : seq
      )
    )

    toast.success(`הרצף התחיל עבור ${recipientName}`)
  }

  const activeSequences = sequences?.filter(s => s.status === 'active') || []
  const pausedSequences = sequences?.filter(s => s.status === 'paused') || []
  const activeExecutions = executions?.filter(e => e.status === 'active') || []
  const completedExecutions = executions?.filter(e => e.status === 'completed') || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Lightning size={32} weight="duotone" className="text-primary" />
            רצפי מעקב אוטומטיים
          </h2>
          <p className="text-muted-foreground mt-2">
            נהל וצור רצפי אימייל אוטומטיים למעקב אחר לקוחות, תשלומים ושיווק
          </p>
        </div>
        <Button onClick={handleCreateSequence} className="gap-2">
          <Plus size={20} />
          רצף חדש
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Lightning size={24} weight="duotone" className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSequences.length}</p>
                <p className="text-sm text-muted-foreground">רצפים פעילים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <Play size={24} weight="duotone" className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeExecutions.length}</p>
                <p className="text-sm text-muted-foreground">ביצועים פעילים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <CheckCircle size={24} weight="duotone" className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedExecutions.length}</p>
                <p className="text-sm text-muted-foreground">הושלמו</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-warning/10">
                <ChartLine size={24} weight="duotone" className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {sequences?.reduce((sum, s) => sum + s.useCount, 0) || 0}
                </p>
                <p className="text-sm text-muted-foreground">סה"כ שימושים</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sequences" className="gap-2">
            <Lightning size={18} />
            רצפים
          </TabsTrigger>
          <TabsTrigger value="executions" className="gap-2">
            <Users size={18} />
            ביצועים פעילים
          </TabsTrigger>
          <TabsTrigger value="ab-tests" className="gap-2">
            <Flask size={18} />
            תוצאות A/B
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="space-y-4 mt-6">
          {activeSequences.length === 0 && pausedSequences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lightning size={48} weight="duotone" className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">אין רצפים. צור רצף ראשון</p>
                <Button onClick={handleCreateSequence}>
                  <Plus size={20} className="ml-2" />
                  צור רצף
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeSequences.map((sequence) => (
                <SequenceCard
                  key={sequence.id}
                  sequence={sequence}
                  onEdit={(seq) => {
                    setSelectedSequence(seq)
                    setIsCreateDialogOpen(true)
                  }}
                  onDuplicate={handleDuplicateSequence}
                  onDelete={handleDeleteSequence}
                  onToggleStatus={handleToggleSequenceStatus}
                  onExecute={(seq) => {
                    setSelectedSequence(seq)
                    setIsExecuteDialogOpen(true)
                  }}
                />
              ))}
              
              {pausedSequences.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <h3 className="text-lg font-semibold text-muted-foreground">רצפים מושהים</h3>
                  {pausedSequences.map((sequence) => (
                    <SequenceCard
                      key={sequence.id}
                      sequence={sequence}
                      onEdit={(seq) => {
                        setSelectedSequence(seq)
                        setIsCreateDialogOpen(true)
                      }}
                      onDuplicate={handleDuplicateSequence}
                      onDelete={handleDeleteSequence}
                      onToggleStatus={handleToggleSequenceStatus}
                      onExecute={(seq) => {
                        setSelectedSequence(seq)
                        setIsExecuteDialogOpen(true)
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-4 mt-6">
          {activeExecutions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users size={48} weight="duotone" className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">אין ביצועים פעילים כרגע</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeExecutions.map((execution) => (
                <ExecutionCard
                  key={execution.id}
                  execution={execution}
                  onPause={(id) => {
                    setExecutions((current) =>
                      (current || []).map(e =>
                        e.id === id
                          ? { ...e, status: 'paused' as SequenceStatus, pausedAt: new Date().toISOString() }
                          : e
                      )
                    )
                    toast.success('הביצוע הושהה')
                  }}
                  onResume={(id) => {
                    setExecutions((current) =>
                      (current || []).map(e =>
                        e.id === id
                          ? { ...e, status: 'active' as SequenceStatus, pausedAt: undefined }
                          : e
                      )
                    )
                    toast.success('הביצוע חודש')
                  }}
                  onStop={(id) => {
                    if (confirm('האם לעצור את הביצוע?')) {
                      setExecutions((current) =>
                        (current || []).map(e =>
                          e.id === id
                            ? { ...e, status: 'completed' as SequenceStatus, completedAt: new Date().toISOString() }
                            : e
                        )
                      )
                      toast.success('הביצוע נעצר')
                    }
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ab-tests" className="space-y-4 mt-6">
          <ABTestResults sequences={sequences || []} />
        </TabsContent>
      </Tabs>

      <SequenceEditorDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        sequence={selectedSequence}
        onSave={(updated) => {
          setSequences((current) =>
            (current || []).map(seq => seq.id === updated.id ? updated : seq)
          )
          toast.success('הרצף נשמר')
          setIsCreateDialogOpen(false)
        }}
      />

      <ExecuteSequenceDialog
        open={isExecuteDialogOpen}
        onOpenChange={setIsExecuteDialogOpen}
        sequence={selectedSequence}
        onExecute={(recipient, recipientName, metadata) => {
          if (selectedSequence) {
            handleStartExecution(selectedSequence, recipient, recipientName, metadata)
          }
          setIsExecuteDialogOpen(false)
        }}
      />
    </div>
  )
}

interface SequenceCardProps {
  sequence: EmailSequence
  onEdit: (sequence: EmailSequence) => void
  onDuplicate: (sequence: EmailSequence) => void
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
  onExecute: (sequence: EmailSequence) => void
}

function SequenceCard({ sequence, onEdit, onDuplicate, onDelete, onToggleStatus, onExecute }: SequenceCardProps) {
  const getTriggerIcon = (trigger: SequenceTrigger) => {
    switch (trigger) {
      case 'report-sent':
        return <EnvelopeSimple size={16} />
      case 'payment-overdue':
        return <Clock size={16} />
      default:
        return <Sparkle size={16} />
    }
  }

  const getTriggerText = (trigger: SequenceTrigger) => {
    switch (trigger) {
      case 'manual':
        return 'ידני'
      case 'report-sent':
        return 'לאחר שליחת דוח'
      case 'invoice-sent':
        return 'לאחר שליחת חשבונית'
      case 'no-response':
        return 'אין תגובה'
      case 'payment-overdue':
        return 'תשלום באיחור'
      case 'appointment-scheduled':
        return 'לאחר תיאום פגישה'
      default:
        return trigger
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className={cn(
        "border-2 transition-all",
        sequence.status === 'active' ? "border-primary/20 hover:border-primary/40" : "border-border opacity-60"
      )}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-xl">{sequence.name}</CardTitle>
                {sequence.isDefault && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkle size={12} />
                    ברירת מחדל
                  </Badge>
                )}
                <Badge variant={sequence.status === 'active' ? 'default' : 'outline'} className="gap-1">
                  {sequence.status === 'active' ? (
                    <>
                      <CheckCircle size={12} weight="fill" />
                      פעיל
                    </>
                  ) : (
                    <>
                      <Pause size={12} />
                      מושהה
                    </>
                  )}
                </Badge>
              </div>
              <CardDescription>{sequence.description}</CardDescription>
              
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className="gap-1">
                  {getTriggerIcon(sequence.trigger)}
                  {getTriggerText(sequence.trigger)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {sequence.steps.filter(s => s.enabled).length} שלבים
                </span>
                <span className="text-sm text-muted-foreground">
                  {sequence.useCount} שימושים
                </span>
              </div>

              {sequence.tags.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {sequence.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(sequence)}
              >
                <PencilSimple size={16} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDuplicate(sequence)}
              >
                <Copy size={16} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleStatus(sequence.id)}
              >
                {sequence.status === 'active' ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}
              </Button>
              {!sequence.isDefault && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(sequence.id)}
                >
                  <Trash size={16} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {sequence.steps.filter(s => s.enabled).map((step, index) => (
              <div
                key={step.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{step.subject}</p>
                    {step.abTestEnabled && step.abTestVariants.length > 0 && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Flask size={10} />
                        A/B
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {step.delayDays > 0 && `${step.delayDays} ימים`}
                    {step.delayDays > 0 && step.delayHours > 0 && ' + '}
                    {step.delayHours > 0 && `${step.delayHours} שעות`}
                    {step.delayDays === 0 && step.delayHours === 0 && 'מיידי'}
                    {step.abTestEnabled && ` • ${step.abTestVariants.length} גרסאות`}
                  </p>
                </div>
                <ArrowRight size={16} className="text-muted-foreground" />
              </div>
            ))}
          </div>

          <Button
            className="w-full mt-4 gap-2"
            onClick={() => onExecute(sequence)}
          >
            <Play size={18} weight="fill" />
            הפעל רצף
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface ExecutionCardProps {
  execution: SequenceExecution
  onPause: (id: string) => void
  onResume: (id: string) => void
  onStop: (id: string) => void
}

function ExecutionCard({ execution, onPause, onResume, onStop }: ExecutionCardProps) {
  const _currentStep = execution.steps[execution.currentStepIndex]
  const completedSteps = execution.steps.filter(s => s.status === 'sent').length
  const progress = (completedSteps / execution.steps.length) * 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {execution.recipientName}
              <Badge variant="outline" className="font-normal">
                {execution.recipientEmail}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {execution.sequenceName}
              {execution.propertyAddress && ` • ${execution.propertyAddress}`}
            </CardDescription>
            
            <div className="flex items-center gap-4 mt-3">
              <span className="text-sm text-muted-foreground">
                התחיל {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true, locale: he })}
              </span>
              <span className="text-sm font-medium">
                {completedSteps} / {execution.steps.length} הושלמו
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {execution.status === 'active' ? (
              <Button size="sm" variant="outline" onClick={() => onPause(execution.id)}>
                <Pause size={16} />
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => onResume(execution.id)}>
                <Play size={16} />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onStop(execution.id)}>
              <Stop size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">התקדמות</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {execution.steps.map((step, index) => (
            <div
              key={step.stepId}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border",
                step.status === 'sent' && "bg-success/5 border-success/20",
                step.status === 'scheduled' && "bg-warning/5 border-warning/20",
                step.status === 'failed' && "bg-destructive/5 border-destructive/20",
                step.status === 'pending' && "bg-muted/30 border-border"
              )}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border-2">
                {step.status === 'sent' ? (
                  <CheckCircle size={14} weight="fill" className="text-success" />
                ) : step.status === 'failed' ? (
                  <XCircle size={14} weight="fill" className="text-destructive" />
                ) : step.status === 'scheduled' ? (
                  <Clock size={14} className="text-warning" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium">שלב {index + 1}</p>
                <p className="text-xs text-muted-foreground">
                  {step.status === 'sent' && step.sentAt && `נשלח ${formatDistanceToNow(new Date(step.sentAt), { addSuffix: true, locale: he })}`}
                  {step.status === 'scheduled' && `מתוכנן ל${formatDistanceToNow(new Date(step.scheduledFor), { addSuffix: true, locale: he })}`}
                  {step.status === 'pending' && 'ממתין'}
                  {step.status === 'failed' && 'נכשל'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface SequenceEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sequence: EmailSequence | null
  onSave: (sequence: EmailSequence) => void
}

function SequenceEditorDialog({ open, onOpenChange, sequence, onSave }: SequenceEditorDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState<SequenceTrigger>('manual')
  const [steps, setSteps] = useState<EmailSequenceStep[]>([])

  useEffect(() => {
    if (sequence) {
      setName(sequence.name)
      setDescription(sequence.description)
      setTrigger(sequence.trigger)
      setSteps(sequence.steps)
    }
  }, [sequence])

  const handleAddStep = () => {
    const newStep: EmailSequenceStep = {
      id: `step-${Date.now()}`,
      order: steps.length + 1,
      delayDays: 1,
      delayHours: 0,
      subject: '',
      message: '',
      attachReport: false,
      attachInvoice: false,
      waitForResponse: false,
      enabled: true,
      abTestEnabled: false,
      abTestVariants: []
    }
    setSteps([...steps, newStep])
  }

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id))
  }

  const handleSave = () => {
    if (!sequence) return
    
    const updated: EmailSequence = {
      ...sequence,
      name,
      description,
      trigger,
      steps: steps.map((step, index) => ({ ...step, order: index + 1 })),
      updatedAt: new Date().toISOString()
    }
    
    onSave(updated)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>עריכת רצף אימייל</DialogTitle>
          <DialogDescription>
            הגדר שלבים אוטומטיים לשליחת אימיילים
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            <div className="space-y-4">
              <div>
                <Label>שם הרצף</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="לדוגמה: מעקב אחר לקוח"
                />
              </div>

              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תאר את מטרת הרצף..."
                  rows={2}
                />
              </div>

              <div>
                <Label>טריגר</Label>
                <Select value={trigger} onValueChange={(v) => setTrigger(v as SequenceTrigger)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">ידני</SelectItem>
                    <SelectItem value="report-sent">לאחר שליחת דוח</SelectItem>
                    <SelectItem value="invoice-sent">לאחר שליחת חשבונית</SelectItem>
                    <SelectItem value="no-response">אין תגובה</SelectItem>
                    <SelectItem value="payment-overdue">תשלום באיחור</SelectItem>
                    <SelectItem value="appointment-scheduled">לאחר תיאום פגישה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">שלבי הרצף</Label>
                <Button size="sm" variant="outline" onClick={handleAddStep}>
                  <Plus size={16} className="ml-1" />
                  הוסף שלב
                </Button>
              </div>

              {steps.map((step, index) => (
                <Card key={step.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        שלב {index + 1}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveStep(step.id)}
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">עיכוב (ימים)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={step.delayDays}
                          onChange={(e) => {
                            const updated = [...steps]
                            updated[index].delayDays = parseInt(e.target.value) || 0
                            setSteps(updated)
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">עיכוב (שעות)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={step.delayHours}
                          onChange={(e) => {
                            const updated = [...steps]
                            updated[index].delayHours = parseInt(e.target.value) || 0
                            setSteps(updated)
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">נושא</Label>
                      <Input
                        value={step.subject}
                        onChange={(e) => {
                          const updated = [...steps]
                          updated[index].subject = e.target.value
                          setSteps(updated)
                        }}
                        placeholder="נושא האימייל"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">תוכן ההודעה</Label>
                      <Textarea
                        value={step.message}
                        onChange={(e) => {
                          const updated = [...steps]
                          updated[index].message = e.target.value
                          setSteps(updated)
                        }}
                        placeholder="כתוב את תוכן האימייל..."
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        משתנים: {'{name}'}, {'{address}'}, {'{value}'}, {'{appraiser}'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={step.attachReport}
                          onCheckedChange={(checked) => {
                            const updated = [...steps]
                            updated[index].attachReport = checked
                            setSteps(updated)
                          }}
                        />
                        <Label className="text-xs">צרף דוח</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={step.attachInvoice}
                          onCheckedChange={(checked) => {
                            const updated = [...steps]
                            updated[index].attachInvoice = checked
                            setSteps(updated)
                          }}
                        />
                        <Label className="text-xs">צרף חשבונית</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={step.waitForResponse}
                          onCheckedChange={(checked) => {
                            const updated = [...steps]
                            updated[index].waitForResponse = checked
                            setSteps(updated)
                          }}
                        />
                        <Label className="text-xs">המתן לתגובה</Label>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={step.abTestEnabled}
                            onCheckedChange={(checked) => {
                              const updated = [...steps]
                              updated[index].abTestEnabled = checked
                              if (checked && updated[index].abTestVariants.length === 0) {
                                updated[index].abTestVariants = [
                                  {
                                    id: `variant-a-${Date.now()}`,
                                    label: 'גרסה A',
                                    subject: step.subject,
                                    message: step.message,
                                    weight: 50,
                                    stats: { sent: 0, opened: 0, clicked: 0, replied: 0, openRate: 0, clickRate: 0, replyRate: 0 }
                                  },
                                  {
                                    id: `variant-b-${Date.now()}`,
                                    label: 'גרסה B',
                                    subject: '',
                                    message: '',
                                    weight: 50,
                                    stats: { sent: 0, opened: 0, clicked: 0, replied: 0, openRate: 0, clickRate: 0, replyRate: 0 }
                                  }
                                ]
                              }
                              setSteps(updated)
                            }}
                          />
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Flask size={16} className="text-primary" />
                            בדיקת A/B
                          </Label>
                        </div>
                        {step.abTestEnabled && step.abTestVariants.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updated = [...steps]
                              const newVariantId = String.fromCharCode(65 + updated[index].abTestVariants.length)
                              updated[index].abTestVariants.push({
                                id: `variant-${Date.now()}`,
                                label: `גרסה ${newVariantId}`,
                                subject: '',
                                message: '',
                                weight: Math.floor(100 / (updated[index].abTestVariants.length + 1)),
                                stats: { sent: 0, opened: 0, clicked: 0, replied: 0, openRate: 0, clickRate: 0, replyRate: 0 }
                              })
                              const totalWeight = updated[index].abTestVariants.reduce((sum, v) => sum + v.weight, 0)
                              if (totalWeight > 100) {
                                updated[index].abTestVariants.forEach((v, _i) => {
                                  v.weight = Math.floor(100 / updated[index].abTestVariants.length)
                                })
                              }
                              setSteps(updated)
                            }}
                          >
                            <Plus size={14} className="ml-1" />
                            הוסף גרסה
                          </Button>
                        )}
                      </div>

                      {step.abTestEnabled && (
                        <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <SplitVertical size={16} />
                            <span>הגדר גרסאות שונות לבדיקה. המערכת תחלק את הנמענים באופן אוטומטי.</span>
                          </div>

                          {step.abTestVariants.map((variant, variantIndex) => (
                            <Card key={variant.id} className="border-l-4 border-l-primary/40">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="secondary">{variant.label}</Badge>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Percent size={14} />
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={variant.weight}
                                        onChange={(e) => {
                                          const updated = [...steps]
                                          const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                          updated[index].abTestVariants[variantIndex].weight = value
                                          setSteps(updated)
                                        }}
                                        className="w-16 h-7 text-xs"
                                      />
                                      <span className="text-xs">משקל</span>
                                    </div>
                                  </div>
                                  {step.abTestVariants.length > 2 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const updated = [...steps]
                                        updated[index].abTestVariants = updated[index].abTestVariants.filter((_, i) => i !== variantIndex)
                                        setSteps(updated)
                                      }}
                                    >
                                      <Trash size={14} />
                                    </Button>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <Label className="text-xs">נושא האימייל</Label>
                                  <Input
                                    value={variant.subject}
                                    onChange={(e) => {
                                      const updated = [...steps]
                                      updated[index].abTestVariants[variantIndex].subject = e.target.value
                                      setSteps(updated)
                                    }}
                                    placeholder="נושא לגרסה זו..."
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">תוכן ההודעה</Label>
                                  <Textarea
                                    value={variant.message}
                                    onChange={(e) => {
                                      const updated = [...steps]
                                      updated[index].abTestVariants[variantIndex].message = e.target.value
                                      setSteps(updated)
                                    }}
                                    placeholder="תוכן האימייל לגרסה זו..."
                                    rows={3}
                                    className="mt-1"
                                  />
                                </div>

                                {variant.stats.sent > 0 && (
                                  <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                                    <div className="text-center">
                                      <p className="text-xs text-muted-foreground">נשלחו</p>
                                      <p className="text-lg font-semibold">{variant.stats.sent}</p>
                                    </div>
                                    <div className="text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <Eye size={12} className="text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">נפתחו</p>
                                      </div>
                                      <p className="text-lg font-semibold text-primary">
                                        {variant.stats.openRate.toFixed(1)}%
                                      </p>
                                      <p className="text-xs text-muted-foreground">{variant.stats.opened}/{variant.stats.sent}</p>
                                    </div>
                                    <div className="text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <TrendUp size={12} className="text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">לחצו</p>
                                      </div>
                                      <p className="text-lg font-semibold text-accent">
                                        {variant.stats.clickRate.toFixed(1)}%
                                      </p>
                                      <p className="text-xs text-muted-foreground">{variant.stats.clicked}/{variant.stats.sent}</p>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}

                          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
                            <ChartLine size={16} className="text-primary" />
                            <span>סה"כ משקל: {step.abTestVariants.reduce((sum, v) => sum + v.weight, 0)}% (צריך להיות 100%)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleSave}>
            שמור רצף
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ExecuteSequenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sequence: EmailSequence | null
  onExecute: (recipientEmail: string, recipientName: string, metadata?: Record<string, any>) => void
}

function ExecuteSequenceDialog({ open, onOpenChange, sequence, onExecute }: ExecuteSequenceDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')

  const handleExecute = () => {
    if (!recipientEmail || !recipientName) {
      toast.error('נא למלא את כל השדות')
      return
    }

    onExecute(recipientEmail, recipientName, {
      propertyAddress: propertyAddress || undefined
    })

    setRecipientEmail('')
    setRecipientName('')
    setPropertyAddress('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הפעל רצף אימייל</DialogTitle>
          <DialogDescription>
            {sequence?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>שם הנמען</Label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="לדוגמה: יוסי כהן"
            />
          </div>

          <div>
            <Label>אימייל</Label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>

          <div>
            <Label>כתובת הנכס (אופציונלי)</Label>
            <Input
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="רחוב 123, תל אביב"
            />
          </div>

          {sequence && (
            <div className="rounded-lg bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium">תצוגה מקדימה של הרצף:</p>
              <div className="space-y-1">
                {sequence.steps.filter(s => s.enabled).map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                      {index + 1}
                    </div>
                    <span>
                      {step.delayDays > 0 && `${step.delayDays}d `}
                      {step.delayHours > 0 && `${step.delayHours}h `}
                      - {step.subject}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleExecute} className="gap-2">
            <Play size={18} weight="fill" />
            התחל רצף
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
