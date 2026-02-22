import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EnvelopeSimple,
  Plus,
  Trash,
  PencilSimple,
  Copy,
  Briefcase,
  User,
  Scales,
  Buildings,
  ShieldCheck,
  Sparkle,
  CheckCircle,
  Lightning,
  Info
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn, uid } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export type RecipientType = 'client' | 'bank' | 'lawyer' | 'insurance' | 'government' | 'partner' | 'urgent' | 'followup' | 'custom'

export interface EmailTemplate {
  id: string
  name: string
  recipientType: RecipientType
  subject: string
  message: string
  isDefault: boolean
  createdAt: Date
  lastUsed?: Date
  useCount: number
}

interface EmailTemplateManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate?: (template: EmailTemplate) => void
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'client-standard',
    name: 'ללקוח - סטנדרטי',
    recipientType: 'client',
    subject: 'דוח השמאות שלך מוכן - {property}',
    message: `שלום רב,

דוח השמאות עבור הנכס בכתובת {property} מוכן ומצורף להודעה זו.

הדוח כולל:
✓ שווי שוק מעודכן של הנכס
✓ ניתוח מקיף של שוק הנדל"ן באזור
✓ השוואה לנכסים דומים שנמכרו לאחרונה
✓ המלצות והערות מקצועיות

אנו זמינים לכל שאלה או הבהרה נוספת.

בברכה,
צוות השמאות`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  },
  {
    id: 'bank-mortgage',
    name: 'לבנק - משכנתא',
    recipientType: 'bank',
    subject: 'דוח שמאות נדל"ן למשכנתא - {property}',
    message: `לכבוד,
מחלקת משכנתאות

הנדון: דוח שמאות עבור {property}
מספר תיק: {reference}

מצ"ב דוח שמאות מקצועי שנערך בהתאם לדרישות ותקני הבנק.

פרטי הדוח:
• סוג נכס: {propertyType}
• מטרת השומה: בדיקת בטוחות למשכנתא
• מועד קובע: {valuationDate}
• שווי מוערך: {estimatedValue}

הדוח עומד בכל הדרישות הרגולטוריות ונערך על ידי שמאי מקרקעין מוסמך.

נשמח לעמוד לרשותכם לכל פרט נוסף.

בכבוד רב,
שמאי מקרקעין מוסמך`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  },
  {
    id: 'lawyer-legal',
    name: 'לעורך דין - הליך משפטי',
    recipientType: 'lawyer',
    subject: 'חוות דעת שמאית - {property}',
    message: `לכבוד,
עו"ד {recipientName}

הנדון: חוות דעת שמאית מקצועית עבור {property}
תיק בית משפט: {caseNumber}

מצ"ב חוות הדעת השמאית המבוקשת לצורכי ההליך המשפטי.

החוות דעת כוללת:
• שומה מקצועית של הנכס נשוא התיק
• ניתוח משפטי-שמאי של זכויות הבעלות
• התייחסות לתכניות בניין עיר רלוונטיות
• אסמכתאות ונספחים מלאים

השומה נערכה בהתאם לתקנים המקצועיים ותקנות השמאים, ומתאימה להגשה בבית משפט.

אנו עומדים לרשותכם לכל שאלה או הבהרה.

בכבוד רב,
שמאי מקרקעין מוסמך`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  },
  {
    id: 'insurance-claim',
    name: 'לחברת ביטוח - תביעה',
    recipientType: 'insurance',
    subject: 'שומת נזקים - תביעה {claimNumber}',
    message: `לכבוד,
מחלקת תביעות

הנדון: שומת נזקים לנכס {property}
מספר תביעה: {claimNumber}
תאריך אירוע: {incidentDate}

מצ"ב דוח שמאות מפורט המתעד את הנזקים שנגרמו לנכס.

הדוח כולל:
• תיאור מפורט של הנזקים שנגרמו
• הערכת עלות השיקום והתיקונים
• תיעוד צילומי מקיף
• השוואת ערך לפני ואחרי האירוע

השומה נערכה בהתאם לכללי המקצוע ועל בסיס ביקור בנכס ובדיקה יסודית.

לכל שאלה או הבהרה, אנו לרשותכם.

בברכה,
שמאי נזקים מוסמך`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  },
  {
    id: 'government-tax',
    name: 'לרשות המיסים - היטל השבחה',
    recipientType: 'government',
    subject: 'שומה להיטל השבחה - {property}',
    message: `לכבוד,
רשות המסים - מחלקת היטל השבחה

הנדון: שומת מקרקעין להיטל השבחה
מספר חלקה: {parcelNumber}
גוש: {block}

מצ"ב דוח שמאות מקצועי שנערך לצורך חישוב היטל השבחה.

פרטי השומה:
• מצב קודם: {beforeStatus}
• מצב לאחר אישור התכנית: {afterStatus}
• בסיס להיטל: {bettermentBase}
• תכנית רלוונטית: {planNumber}

הדוח נערך בהתאם להוראות חוק התכנון והבנייה ותקנות היטל השבחה.

כל המסמכים והאסמכתאות מצורפים.

בכבוד רב,
שמאי מקרקעין מוסמך`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  },
  {
    id: 'partner-collaboration',
    name: 'לשותף עסקי - שיתוף פעולה',
    recipientType: 'partner',
    subject: 'דוח שמאות משותף - {property}',
    message: `שלום {recipientName},

מצ"ב דוח השמאות המשותף עבור הפרויקט ב{property}.

עיקרי הממצאים:
• שווי שוק נוכחי: {currentValue}
• פוטנציאל פיתוח: {developmentPotential}
• המלצות להמשך: {recommendations}

הדוח מבוסס על ניתוח מעמיק של השוק והפוטנציאל העסקי.

בוא נתאם שיחה לדיון בממצאים ובצעדים הבאים.

בברכה,`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  },
  {
    id: 'urgent-immediate',
    name: 'דחוף - טיפול מיידי',
    recipientType: 'urgent',
    subject: '⚡ דוח שמאות דחוף - {property}',
    message: `שלום,

בצרוף מצ"ב דוח השמאות הדחוף שביקשת עבור {property}.

הדוח עבר בדיקת איכות מהירה ומלאה ומוכן לשימוש מיידי.

עיקרי הממצאים:
• שווי מוערך: {estimatedValue}
• רמת דחיפות: גבוהה
• תוקף: {validityPeriod}

במידה ויש צורך בהבהרות או תוספות, אנא עדכן בהקדם.

זמינים בכל עת לשאלות.

בברכה,`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  },
  {
    id: 'followup-reminder',
    name: 'מעקב - תזכורת',
    recipientType: 'followup',
    subject: 'תזכורת: דוח שמאות - {property}',
    message: `שלום רב,

זו תזכורת ידידותית לגבי דוח השמאות עבור {property} ששלחנו ב-{sentDate}.

האם קיבלת את הדוח?
האם יש צורך בהבהרות או מידע נוסף?

אנו כאן לעזור ולענות על כל שאלה.

מצ"ב שוב הדוח לנוחיותך.

בברכה,
צוות השמאות`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  },
  {
    id: 'client-premium',
    name: 'ללקוח - פרימיום',
    recipientType: 'client',
    subject: '✨ דוח השמאות המקצועי שלך - {property}',
    message: `{recipientName} שלום,

שמחים לשתף אותך בדוח השמאות המקצועי והמקיף עבור הנכס המיוחד שלך בכתובת {property}.

🎯 מה תמצא בדוח:
• ניתוח שווי מעמיק ומקצועי
• השוואה לעסקאות אחרונות באזור
• מפות ותרשימים אינטראקטיביים
• תובנות שוק ייחודיות
• המלצות אסטרטגיות להמשך

הדוח נערך על ידי השמאים המנוסים שלנו תוך שימוש בטכנולוגיות מתקדמות וניתוח מעמיק של השוק.

💡 רוצה להבין יותר על התוצאות?
אנו זמינים לשיחת ייעוץ אישית ללא עלות.

בהצלחה בהחלטות שלך!

בברכה,
{yourName}
צוות השמאות המקצועי`,
    isDefault: true,
    createdAt: new Date(),
    useCount: 0
  }
]

const RECIPIENT_TYPE_CONFIG: Record<RecipientType, {
  label: string
  icon: any
  color: string
  description: string
}> = {
  client: {
    label: 'לקוח',
    icon: User,
    color: 'text-primary',
    description: 'תבניות לשליחה ללקוחות פרטיים'
  },
  bank: {
    label: 'בנק',
    icon: Buildings,
    color: 'text-blue-500',
    description: 'תבניות למוסדות פיננסיים ובנקים'
  },
  lawyer: {
    label: 'עורך דין',
    icon: Scales,
    color: 'text-purple-500',
    description: 'תבניות להליכים משפטיים ועורכי דין'
  },
  insurance: {
    label: 'ביטוח',
    icon: ShieldCheck,
    color: 'text-green-500',
    description: 'תבניות לחברות ביטוח ותביעות'
  },
  government: {
    label: 'גופים ממשלתיים',
    icon: Briefcase,
    color: 'text-orange-500',
    description: 'תבניות לרשויות ומשרדי ממשלה'
  },
  partner: {
    label: 'שותפים עסקיים',
    icon: Briefcase,
    color: 'text-teal-500',
    description: 'תבניות לשותפים ועמיתים'
  },
  urgent: {
    label: 'דחוף',
    icon: Lightning,
    color: 'text-destructive',
    description: 'תבניות לשליחות דחופות'
  },
  followup: {
    label: 'מעקב',
    icon: CheckCircle,
    color: 'text-accent',
    description: 'תבניות למעקבים ותזכורות'
  },
  custom: {
    label: 'מותאם אישית',
    icon: Sparkle,
    color: 'text-muted-foreground',
    description: 'תבניות מותאמות אישית'
  }
}

export function EmailTemplateManager({
  open,
  onOpenChange,
  onSelectTemplate
}: EmailTemplateManagerProps) {
  const [templates, setTemplates] = useKV<EmailTemplate[]>('email-templates', DEFAULT_TEMPLATES)
  const [selectedType, setSelectedType] = useState<RecipientType | 'all'>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<RecipientType>('custom')
  const [formSubject, setFormSubject] = useState('')
  const [formMessage, setFormMessage] = useState('')

  const filteredTemplates = templates?.filter(t => 
    selectedType === 'all' || t.recipientType === selectedType
  ) || []

  const resetForm = () => {
    setFormName('')
    setFormType('custom')
    setFormSubject('')
    setFormMessage('')
    setIsCreating(false)
    setEditingTemplate(null)
  }

  const handleCreate = () => {
    if (!formName.trim() || !formSubject.trim()) {
      toast.error('נא למלא את כל השדות החובה')
      return
    }

    const newTemplate: EmailTemplate = {
      id: uid('template'),
      name: formName,
      recipientType: formType,
      subject: formSubject,
      message: formMessage,
      isDefault: false,
      createdAt: new Date(),
      useCount: 0
    }

    setTemplates((current) => [...(current || []), newTemplate])
    toast.success('התבנית נוצרה בהצלחה!')
    resetForm()
  }

  const handleUpdate = () => {
    if (!editingTemplate || !formName.trim() || !formSubject.trim()) {
      toast.error('נא למלא את כל השדות החובה')
      return
    }

    setTemplates((current) =>
      (current || []).map(t =>
        t.id === editingTemplate.id
          ? {
              ...t,
              name: formName,
              recipientType: formType,
              subject: formSubject,
              message: formMessage
            }
          : t
      )
    )
    toast.success('התבנית עודכנה בהצלחה!')
    resetForm()
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormName(template.name)
    setFormType(template.recipientType)
    setFormSubject(template.subject)
    setFormMessage(template.message)
    setIsCreating(true)
  }

  const handleDuplicate = (template: EmailTemplate) => {
    const duplicated: EmailTemplate = {
      ...template,
      id: uid('template'),
      name: `${template.name} (עותק)`,
      isDefault: false,
      createdAt: new Date(),
      useCount: 0
    }

    setTemplates((current) => [...(current || []), duplicated])
    toast.success('התבנית שוכפלה בהצלחה!')
  }

  const handleDelete = (templateId: string) => {
    setTemplates((current) => (current || []).filter(t => t.id !== templateId))
    toast.success('התבנית נמחקה')
  }

  const handleUseTemplate = (template: EmailTemplate) => {
    setTemplates((current) =>
      (current || []).map(t =>
        t.id === template.id
          ? { ...t, useCount: t.useCount + 1, lastUsed: new Date() }
          : t
      )
    )
    
    if (onSelectTemplate) {
      onSelectTemplate(template)
    }
    
    toast.success(`תבנית "${template.name}" הוחלה`)
    onOpenChange(false)
  }

  const VARIABLE_HINTS = [
    '{property} - כתובת הנכס',
    '{recipientName} - שם הנמען',
    '{yourName} - שמך',
    '{estimatedValue} - שווי מוערך',
    '{valuationDate} - תאריך השומה',
    '{propertyType} - סוג נכס',
    '{reference} - מספר אישור',
    '{caseNumber} - מספר תיק',
    '{claimNumber} - מספר תביעה',
    '{sentDate} - תאריך שליחה'
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EnvelopeSimple size={24} weight="duotone" className="text-primary" />
            ניהול תבניות אימייל
          </DialogTitle>
          <DialogDescription>
            צור וערוך תבניות אימייל מותאמות אישית לסוגי נמענים שונים
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as RecipientType | 'all')}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="סנן לפי סוג" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התבניות</SelectItem>
                  {Object.entries(RECIPIENT_TYPE_CONFIG).map(([type, config]) => {
                    const Icon = config.icon
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={config.color} />
                          {config.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <Button
                onClick={() => setIsCreating(!isCreating)}
                variant={isCreating ? "outline" : "default"}
                className="gap-2"
              >
                {isCreating ? (
                  <>ביטול</>
                ) : (
                  <>
                    <Plus size={18} />
                    תבנית חדשה
                  </>
                )}
              </Button>
            </div>

            <AnimatePresence>
              {isCreating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="glass-effect border-primary/30">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {editingTemplate ? 'עריכת תבנית' : 'תבנית חדשה'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="template-name">שם התבנית *</Label>
                          <Input
                            id="template-name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="לדוגמה: ללקוח VIP"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="template-type">סוג נמען *</Label>
                          <Select value={formType} onValueChange={(v) => setFormType(v as RecipientType)}>
                            <SelectTrigger id="template-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(RECIPIENT_TYPE_CONFIG).map(([type, config]) => {
                                const Icon = config.icon
                                return (
                                  <SelectItem key={type} value={type}>
                                    <div className="flex items-center gap-2">
                                      <Icon size={16} className={config.color} />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-subject">נושא האימייל *</Label>
                        <Input
                          id="template-subject"
                          value={formSubject}
                          onChange={(e) => setFormSubject(e.target.value)}
                          placeholder="השתמש ב-{property} להחלפה אוטומטית"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-message">תוכן ההודעה</Label>
                        <Textarea
                          id="template-message"
                          value={formMessage}
                          onChange={(e) => setFormMessage(e.target.value)}
                          placeholder="כתוב את תוכן ההודעה כאן..."
                          rows={8}
                          className="resize-none font-mono text-sm"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={resetForm}>
                          ביטול
                        </Button>
                        <Button onClick={editingTemplate ? handleUpdate : handleCreate}>
                          {editingTemplate ? 'עדכן' : 'צור תבנית'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <ScrollArea className="h-[450px]">
              <div className="space-y-3 pr-4">
                {filteredTemplates.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <EnvelopeSimple size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
                      <p className="text-muted-foreground">
                        {selectedType === 'all' 
                          ? 'לא נמצאו תבניות. צור תבנית חדשה כדי להתחיל.'
                          : 'לא נמצאו תבניות לסוג זה.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredTemplates.map((template) => {
                    const config = RECIPIENT_TYPE_CONFIG[template.recipientType]
                    const Icon = config.icon

                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "transition-all hover:border-primary/50 cursor-pointer",
                          template.isDefault && "border-primary/20 bg-primary/5"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={cn("p-2 rounded-lg bg-muted/50", config.color)}>
                                  <Icon size={20} weight="duotone" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold truncate">{template.name}</h4>
                                    {template.isDefault && (
                                      <Badge variant="outline" className="text-xs">ברירת מחדל</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {config.label}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleUseTemplate(template)}
                                >
                                  <CheckCircle size={18} weight="duotone" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDuplicate(template)}
                                >
                                  <Copy size={18} />
                                </Button>
                                {!template.isDefault && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEdit(template)}
                                    >
                                      <PencilSimple size={18} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                                      onClick={() => handleDelete(template.id)}
                                    >
                                      <Trash size={18} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">נושא:</Label>
                                <p className="text-sm font-medium mt-1">{template.subject}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">הודעה:</Label>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                                  {template.message || 'אין תוכן הודעה'}
                                </p>
                              </div>
                            </div>

                            {template.useCount > 0 && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                <span>נעשה שימוש {template.useCount} פעמים</span>
                                {template.lastUsed && (
                                  <span>שימוש אחרון: {new Date(template.lastUsed).toLocaleDateString('he-IL')}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="col-span-1 space-y-4">
            <Card className="glass-effect bg-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info size={20} weight="duotone" className="text-accent" />
                  משתנים זמינים
                </CardTitle>
                <CardDescription className="text-xs">
                  השתמש במשתנים אלה בנושא ובתוכן ההודעה
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-3">
                    {VARIABLE_HINTS.map((hint, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <code className="text-xs font-mono text-primary">
                          {hint.split(' - ')[0]}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hint.split(' - ')[1]}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">סוגי נמענים</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-3">
                    {Object.entries(RECIPIENT_TYPE_CONFIG).map(([type, config]) => {
                      const Icon = config.icon
                      return (
                        <div
                          key={type}
                          className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={16} className={config.color} weight="duotone" />
                            <span className="text-sm font-semibold">{config.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
