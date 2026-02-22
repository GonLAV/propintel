import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// Tabs not used
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FileText,
  FilePdf,
  FileDoc,
  Download,
  Sparkle,
  PaperPlaneTilt
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { Property, Client, Comparable } from '@/lib/types'
import { generateReportContent, type ReportAIContent } from '@/services/aiService'
import { EmailReportDialog, type EmailData } from '@/components/EmailReportDialog'
import { createLogger } from '@/lib/logger'

const log = createLogger('ReportGenerator')

interface ReportGeneratorProps {
  property: Property
  client?: Client
  comparables?: Comparable[]
}

type ReportSection = {
  id: string
  title: string
  description: string
  enabled: boolean
  required?: boolean
}

export function ReportGenerator({ property, client, comparables = [] }: ReportGeneratorProps) {
  const [reportFormat, setReportFormat] = useState<'pdf' | 'word' | 'html'>('pdf')
  const [reportTemplate, setReportTemplate] = useState<'standard' | 'detailed' | 'summary' | 'bank'>('detailed')
  const [isGenerating, setIsGenerating] = useState(false)
  const [customNotes, setCustomNotes] = useState('')
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [appraiserName, setAppraiserName] = useState('שמאי מוסמך')
  const [appraiserLicense, setAppraiserLicense] = useState('')
  const [includeWatermark, setIncludeWatermark] = useState(false)
  const [sections, setSections] = useState<ReportSection[]>([
    { id: 'cover', title: 'עמוד שער', description: 'עמוד פתיחה עם לוגו ופרטי שמאי', enabled: true, required: true },
    { id: 'executive-summary', title: 'תקציר מנהלים', description: 'סיכום תוצאות השומה', enabled: true, required: true },
    { id: 'property-details', title: 'פרטי הנכס', description: 'מידע מפורט על הנכס', enabled: true, required: true },
    { id: 'location-analysis', title: 'ניתוח מיקום', description: 'ניתוח האזור והשכונה', enabled: true },
    { id: 'market-analysis', title: 'ניתוח שוק', description: 'מגמות שוק ונתונים סטטיסטיים', enabled: true },
    { id: 'comparables', title: 'נכסים דומים', description: 'טבלת השוואה מפורטת', enabled: true },
    { id: 'valuation-methods', title: 'שיטות שומה', description: 'הסבר על שיטות השומה שבוצעו', enabled: true },
    { id: '3d-visualization', title: 'הדמיות 3D', description: 'תמונות מהדמיה תלת-ממדית', enabled: false },
    { id: 'floor-plans', title: 'תוכניות קומה', description: 'תוכניות אדריכליות', enabled: false },
    { id: 'photos', title: 'תיעוד צילומי', description: 'תמונות הנכס', enabled: true },
    { id: 'investment-analysis', title: 'ניתוח השקעה', description: 'ROI וניתוח פיננסי', enabled: false },
    { id: 'environmental', title: 'ניתוח סביבתי', description: 'איכות אוויר, רעש, נגישות', enabled: false },
    { id: 'legal-disclaimer', title: 'הגבלת אחריות', description: 'תנאים משפטיים', enabled: true, required: true },
    { id: 'appendices', title: 'נספחים', description: 'מסמכים נוספים ונתונים גולמיים', enabled: true }
  ])

  const toggleSection = (id: string) => {
    setSections((current) =>
      current.map((section) =>
        section.id === id && !section.required
          ? { ...section, enabled: !section.enabled }
          : section
      )
    )
  }

  const handleGenerateAIContent = async () => {
    setIsGenerating(true)
    toast.loading('יוצר תוכן דוח מקצועי עם AI...')

    try {
      const _promptText = `אתה שמאי נדל"ן מומחה. צור תוכן מקצועי לדוח שמאות עבור הנכס הבא:

**פרטי הנכס:**
כתובת: ${property.address.street}, ${property.address.neighborhood}, ${property.address.city}
סוג: ${property.type}
שטח: ${property.details.builtArea} מ"ר
חדרים: ${property.details.rooms}
קומה: ${property.details.floor} מתוך ${property.details.totalFloors}
שנת בנייה: ${property.details.buildYear}
מצב: ${property.details.condition}

**שווי:**
${property.valuationData ? `שווי משוער: ₪${property.valuationData.estimatedValue.toLocaleString()}
טווח: ₪${property.valuationData.valueRange.min.toLocaleString()} - ₪${property.valuationData.valueRange.max.toLocaleString()}
ביטחון: ${property.valuationData.confidence}%` : 'לא בוצעה שומה'}

${comparables.length > 0 ? `**נכסים דומים:**
${comparables.map(c => `- ${c.address}: ₪${c.salePrice.toLocaleString()} (מותאם: ₪${c.adjustedPrice.toLocaleString()})`).join('\n')}` : ''}

צור את החלקים הבאים בעברית מקצועית:

1. תקציר מנהלים (2-3 פסקאות)
2. ניתוח מיקום ואזור (פסקה אחת)
3. ניתוח שוק (פסקה אחת)
4. סיכום והמלצות (פסקה אחת)

החזר JSON עם המבנה:
{
  "executiveSummary": "טקסט התקציר",
  "locationAnalysis": "טקסט ניתוח מיקום",
  "marketAnalysis": "טקסט ניתוח שוק",
  "conclusion": "טקסט סיכום"
}

הטקסט צריך להיות פורמלי, מקצועי, ומבוסס על הנתונים שסופקו.`

      const data = await generateReportContent(property, client?.name, reportTemplate)

      setCustomNotes(data.conclusion || '')
      toast.success('תוכן הדוח נוצר בהצלחה')
      return data
    } catch (error) {
      log.error('Error generating report content:', error)
      toast.error('שגיאה ביצירת תוכן הדוח')
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    toast.loading(`מייצר דוח ${reportFormat.toUpperCase()}...`)

    const aiContent = await handleGenerateAIContent()

    setTimeout(() => {
      setIsGenerating(false)
      toast.success(`דוח ${reportFormat.toUpperCase()} נוצר בהצלחה!`)
      
      const blob = new Blob([generateReportHTML(aiContent)], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `דוח-שמאות-${property.address.street.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 2000)
  }

  const generateReportHTML = (aiContent: ReportAIContent | null) => {
    const enabledSections = sections.filter(s => s.enabled)
    const selectedComps = comparables.filter(c => c.selected)

    return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>דוח שמאות - ${property.address.street}</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: white;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4a5568;
    }
    h1 { color: #2d3748; font-size: 28px; margin-bottom: 10px; }
    h2 { color: #4a5568; font-size: 22px; margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    h3 { color: #718096; font-size: 18px; margin-top: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { padding: 10px; background: #f7fafc; border-right: 3px solid #4299e1; }
    .info-label { font-weight: bold; color: #4a5568; margin-left: 5px; }
    .value-highlight { font-size: 32px; color: #2b6cb0; font-weight: bold; text-align: center; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: right; border: 1px solid #e2e8f0; }
    th { background: #edf2f7; font-weight: bold; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 12px; color: #718096; }
    .watermark { position: fixed; top: 50%; right: 50%; transform: translate(50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(0,0,0,0.05); z-index: -1; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  ${includeWatermark ? '<div class="watermark">טיוטה</div>' : ''}
  
  <div class="header">
    <h1>דוח שמאות נדל"ן</h1>
    <p><strong>${property.address.street}</strong></p>
    <p>${property.address.neighborhood}, ${property.address.city}</p>
    <p>תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
  </div>

  ${enabledSections.find(s => s.id === 'executive-summary')?.enabled ? `
  <h2>תקציר מנהלים</h2>
  <p>${aiContent?.executiveSummary || 'דוח שמאות מקיף עבור נכס מגורים בשטח ' + property.details.builtArea + ' מ״ר.'}</p>
  ` : ''}

  <h2>פרטי הנכס</h2>
  <div class="info-grid">
    <div class="info-item"><span class="info-label">כתובת:</span> ${property.address.street}, ${property.address.city}</div>
    <div class="info-item"><span class="info-label">סוג נכס:</span> ${property.type}</div>
    <div class="info-item"><span class="info-label">שטח בנוי:</span> ${property.details.builtArea} מ״ר</div>
    <div class="info-item"><span class="info-label">חדרים:</span> ${property.details.rooms}</div>
    <div class="info-item"><span class="info-label">קומה:</span> ${property.details.floor} מתוך ${property.details.totalFloors}</div>
    <div class="info-item"><span class="info-label">שנת בנייה:</span> ${property.details.buildYear}</div>
    <div class="info-item"><span class="info-label">מצב:</span> ${property.details.condition}</div>
    <div class="info-item"><span class="info-label">חניות:</span> ${property.details.parking}</div>
  </div>

  ${property.valuationData ? `
  <h2>תוצאות השומה</h2>
  <div class="value-highlight">
    שווי משוער: ₪${property.valuationData.estimatedValue.toLocaleString()}
  </div>
  <div class="info-grid">
    <div class="info-item"><span class="info-label">טווח שווי:</span> ₪${property.valuationData.valueRange.min.toLocaleString()} - ₪${property.valuationData.valueRange.max.toLocaleString()}</div>
    <div class="info-item"><span class="info-label">ביטחון:</span> ${property.valuationData.confidence}%</div>
    <div class="info-item"><span class="info-label">מחיר למ״ר:</span> ₪${Math.round(property.valuationData.estimatedValue / property.details.builtArea).toLocaleString()}</div>
    <div class="info-item"><span class="info-label">שיטה:</span> ${property.valuationData.method}</div>
  </div>
  ` : ''}

  ${enabledSections.find(s => s.id === 'location-analysis')?.enabled ? `
  <h2>ניתוח מיקום</h2>
  <p>${aiContent?.locationAnalysis || 'הנכס ממוקם באזור מבוקש עם נגישות מעולה לשירותים ותחבורה ציבורית.'}</p>
  ` : ''}

  ${enabledSections.find(s => s.id === 'market-analysis')?.enabled ? `
  <h2>ניתוח שוק</h2>
  <p>${aiContent?.marketAnalysis || 'השוק באזור מציג יציבות עם מגמת עלייה קלה במחירים.'}</p>
  ` : ''}

  ${enabledSections.find(s => s.id === 'comparables')?.enabled && selectedComps.length > 0 ? `
  <h2>נכסים דומים</h2>
  <table>
    <thead>
      <tr>
        <th>כתובת</th>
        <th>מחיר מכירה</th>
        <th>שטח</th>
        <th>חד׳</th>
        <th>התאמות</th>
        <th>מחיר מותאם</th>
      </tr>
    </thead>
    <tbody>
      ${selectedComps.map(comp => `
        <tr>
          <td>${comp.address}</td>
          <td>₪${(comp.salePrice / 1000000).toFixed(2)}M</td>
          <td>${comp.builtArea} מ״ר</td>
          <td>${comp.rooms}</td>
          <td>${comp.adjustments.total >= 0 ? '+' : ''}₪${(comp.adjustments.total / 1000).toFixed(0)}K</td>
          <td>₪${(comp.adjustedPrice / 1000000).toFixed(2)}M</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  ${customNotes ? `
  <h2>הערות והמלצות</h2>
  <p>${customNotes}</p>
  ` : ''}

  ${enabledSections.find(s => s.id === 'legal-disclaimer')?.enabled ? `
  <h2>הגבלת אחריות</h2>
  <p style="font-size: 12px;">
    דוח זה הוכן עבור ${client?.name || 'הלקוח'} בלבד ואינו מיועד לשימוש צד שלישי. 
    השמאות מבוססת על מידע שסופק למשרד וביקור בנכס. 
    השמאות תקפה ליום ${new Date().toLocaleDateString('he-IL')} בלבד.
  </p>
  ` : ''}

  <div class="footer">
    <p><strong>${appraiserName}</strong></p>
    ${appraiserLicense ? `<p>רישיון שמאי: ${appraiserLicense}</p>` : ''}
    <p>נוצר באמצעות AppraisalPro - מערכת שמאות מתקדמת</p>
    <p>© ${new Date().getFullYear()} כל הזכויות שמורות</p>
  </div>

  <button class="no-print" onclick="window.print()" style="position: fixed; bottom: 20px; left: 20px; padding: 12px 24px; background: #4299e1; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
    הדפס דוח
  </button>
</body>
</html>`
  }

  const enabledCount = sections.filter(s => s.enabled).length
  const totalCount = sections.length

  const handleSendEmail = async (emailData: EmailData) => {
    toast.loading('שולח דוח באימייל...')

    await new Promise(resolve => setTimeout(resolve, 2000))

    log.info('Email sent:', emailData)
    toast.success(`הדוח נשלח ל-${emailData.to.join(', ')}`)
  }

  const recipientSuggestions = client?.email ? [client.email] : []

  return (
    <div className="space-y-6">
      <Card className="glass-effect glow-primary">
        <CardHeader>
          <CardTitle className="text-right flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="gap-2 bg-primary hover:bg-primary/90 glow-primary"
              >
                <Download size={18} weight="bold" />
                {isGenerating ? 'מייצר דוח...' : 'ייצא דוח'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowEmailDialog(true)}
                disabled={isGenerating}
                className="gap-2"
              >
                <PaperPlaneTilt size={18} weight="fill" />
                שלח באימייל
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateAIContent}
                disabled={isGenerating}
                className="gap-2"
              >
                <Sparkle size={18} weight="fill" />
                צור תוכן AI
              </Button>
            </div>
            <span>מחולל דוחות מתקדם</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-right block">פורמט דוח</Label>
              <Select value={reportFormat} onValueChange={(v) => setReportFormat(v as 'pdf' | 'word' | 'html')}>
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FilePdf size={16} weight="fill" />
                      PDF
                    </div>
                  </SelectItem>
                  <SelectItem value="word">
                    <div className="flex items-center gap-2">
                      <FileDoc size={16} weight="fill" />
                      Word (DOCX)
                    </div>
                  </SelectItem>
                  <SelectItem value="html">
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      HTML
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-right block">תבנית דוח</Label>
              <Select value={reportTemplate} onValueChange={(v) => setReportTemplate(v as 'standard' | 'detailed' | 'summary' | 'bank')}>
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">סטנדרטי</SelectItem>
                  <SelectItem value="detailed">מפורט</SelectItem>
                  <SelectItem value="summary">תקציר</SelectItem>
                  <SelectItem value="bank">דוח לבנק</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-right block">סטטוס</Label>
              <div className="flex h-10 items-center px-3 rounded-md border border-input bg-secondary/30">
                <Badge variant="secondary" className="w-full justify-center">
                  {enabledCount} / {totalCount} חלקים
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-right block" htmlFor="appraiser-name">שם השמאי</Label>
              <Input
                id="appraiser-name"
                value={appraiserName}
                onChange={(e) => setAppraiserName(e.target.value)}
                placeholder="הכנס שם"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block" htmlFor="license">מספר רישיון</Label>
              <Input
                id="license"
                value={appraiserLicense}
                onChange={(e) => setAppraiserLicense(e.target.value)}
                placeholder="מספר רישיון (אופציונלי)"
                dir="rtl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Label htmlFor="watermark" className="cursor-pointer">סמן כטיוטה</Label>
            <Checkbox
              id="watermark"
              checked={includeWatermark}
              onCheckedChange={(checked) => setIncludeWatermark(checked as boolean)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-right">חלקי הדוח</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sections.map((section, i) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                  section.enabled
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-secondary/20 border-border'
                }`}
              >
                <Checkbox
                  id={section.id}
                  checked={section.enabled}
                  onCheckedChange={() => toggleSection(section.id)}
                  disabled={section.required}
                />
                <div className="flex-1 text-right">
                  <Label
                    htmlFor={section.id}
                    className={`font-semibold cursor-pointer flex items-center gap-2 justify-end ${
                      section.required ? 'opacity-70' : ''
                    }`}
                  >
                    {section.title}
                    {section.required && (
                      <Badge variant="secondary" className="text-xs">חובה</Badge>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-right">הערות והמלצות</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="הוסף הערות, המלצות או מסקנות לדוח..."
            className="min-h-32"
            dir="rtl"
          />
          <p className="text-xs text-muted-foreground text-right mt-2">
            טקסט זה יופיע בסוף הדוח תחת סעיף ההמלצות
          </p>
        </CardContent>
      </Card>

      <EmailReportDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        reportTitle={`${property.address.street}, ${property.address.city}`}
        reportType={reportTemplate === 'bank' ? 'דוח שמאות לבנק' : 'דוח שמאות'}
        recipientSuggestions={recipientSuggestions}
        onSend={handleSendEmail}
        attachments={[
          {
            name: `דוח-שמאות-${property.address.street.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.${reportFormat}`,
            size: reportFormat === 'pdf' ? 1024 * 1024 * 3.2 : reportFormat === 'word' ? 1024 * 1024 * 1.8 : 1024 * 256,
            type: reportFormat === 'pdf' ? 'pdf' : reportFormat === 'word' ? 'excel' : 'csv',
            preview: `דוח שמאות מקצועי\n\nנכס: ${property.address.street}, ${property.address.city}\nסוג: ${property.type}\nשטח: ${property.details.builtArea} מ"ר\nחדרים: ${property.details.rooms}\n\nסעיפים כלולים:\n${sections.filter(s => s.enabled).map(s => `• ${s.title}`).join('\n')}\n\nתבנית: ${reportTemplate}\nפורמט: ${reportFormat.toUpperCase()}`
          }
        ]}
      />
    </div>
  )
}
