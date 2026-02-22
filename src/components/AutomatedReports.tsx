import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar, Clock, Envelope, ChartLine, Lightning, Play, Pause, Plus, Trash, Eye, PaperPlaneTilt } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { TransactionTrendAnalyzer, TrendReport } from '@/lib/transactionTrends'
import { TrendReportPreview } from '@/components/TrendReportPreview'
import { createLogger } from '@/lib/logger'
import { uid } from '@/lib/utils'
// Comparable type not used here

const log = createLogger('AutomatedReports')

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly'
export type ReportDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface AutomatedReport {
  id: string
  name: string
  description: string
  frequency: ReportFrequency
  dayOfWeek?: ReportDay
  dayOfMonth?: number
  time: string
  recipients: string[]
  isActive: boolean
  includeInsights: boolean
  includeCharts: boolean
  includeAlerts: boolean
  customMessage?: string
  lastSent?: string
  nextScheduled?: string
  createdAt: string
  updatedAt: string
}

export interface SentReport {
  id: string
  automatedReportId: string
  reportName: string
  sentAt: string
  recipients: string[]
  reportData: TrendReport
  status: 'sent' | 'failed'
  errorMessage?: string
}

export function AutomatedReports() {
  const [reports, setReports] = useKV<AutomatedReport[]>('automated-reports', [])
  const [sentReports, setSentReports] = useKV<SentReport[]>('sent-trend-reports', [])
  const [isCreating, setIsCreating] = useState(false)
  const [editingReport, setEditingReport] = useState<AutomatedReport | null>(null)
  const [previewReport, setPreviewReport] = useState<TrendReport | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)

  const [formData, setFormData] = useState<Partial<AutomatedReport>>({
    name: '',
    description: '',
    frequency: 'weekly',
    dayOfWeek: 'monday',
    dayOfMonth: 1,
    time: '09:00',
    recipients: [],
    isActive: true,
    includeInsights: true,
    includeCharts: true,
    includeAlerts: true,
    customMessage: ''
  })

  const [recipientInput, setRecipientInput] = useState('')

   
  useEffect(() => {
    checkScheduledReports()
    const interval = setInterval(checkScheduledReports, 60000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports])

  const checkScheduledReports = () => {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const currentDayOfMonth = now.getDate()

    reports?.forEach(report => {
      if (!report.isActive) return

      let shouldSend = false

      if (report.frequency === 'daily' && report.time === currentTime) {
        shouldSend = true
      } else if (report.frequency === 'weekly' && report.dayOfWeek === currentDay && report.time === currentTime) {
        shouldSend = true
      } else if (report.frequency === 'monthly' && report.dayOfMonth === currentDayOfMonth && report.time === currentTime) {
        shouldSend = true
      }

      if (shouldSend && (!report.lastSent || new Date(report.lastSent).toDateString() !== now.toDateString())) {
        sendScheduledReport(report)
      }
    })
  }

  const sendScheduledReport = async (report: AutomatedReport) => {
    try {
      const analyzer = new TransactionTrendAnalyzer([])
      const trendReport = report.frequency === 'monthly' 
        ? analyzer.getMonthlyReport()
        : analyzer.getWeeklyReport()

      const sentReport: SentReport = {
        id: uid('sent'),
        automatedReportId: report.id,
        reportName: report.name,
        sentAt: new Date().toISOString(),
        recipients: report.recipients,
        reportData: trendReport,
        status: 'sent'
      }

      setSentReports(current => [sentReport, ...(current || [])])

      setReports(current => 
        (current || []).map(r => 
          r.id === report.id 
            ? { ...r, lastSent: new Date().toISOString() }
            : r
        )
      )

      toast.success(`דוח "${report.name}" נשלח ל-${report.recipients.length} נמענים`)
    } catch (error) {
      log.error('Failed to send report:', error)
      
      const failedReport: SentReport = {
        id: uid('sent'),
        automatedReportId: report.id,
        reportName: report.name,
        sentAt: new Date().toISOString(),
        recipients: report.recipients,
        reportData: {} as TrendReport,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }

      setSentReports(current => [failedReport, ...(current || [])])
      toast.error('שגיאה בשליחת הדוח')
    }
  }

  const handleCreateReport = () => {
    if (!formData.name || !formData.recipients || formData.recipients.length === 0) {
      toast.error('נא למלא את כל השדות הנדרשים')
      return
    }

    const newReport: AutomatedReport = {
      id: uid('report'),
      name: formData.name!,
      description: formData.description || '',
      frequency: formData.frequency!,
      dayOfWeek: formData.dayOfWeek,
      dayOfMonth: formData.dayOfMonth,
      time: formData.time!,
      recipients: formData.recipients!,
      isActive: formData.isActive!,
      includeInsights: formData.includeInsights!,
      includeCharts: formData.includeCharts!,
      includeAlerts: formData.includeAlerts!,
      customMessage: formData.customMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setReports(current => [...(current || []), newReport])
    setIsCreating(false)
    resetForm()
    toast.success('דוח אוטומטי נוצר בהצלחה')
  }

  const handleUpdateReport = () => {
    if (!editingReport) return

    setReports(current => 
      (current || []).map(r => 
        r.id === editingReport.id 
          ? { ...formData as AutomatedReport, id: r.id, updatedAt: new Date().toISOString() }
          : r
      )
    )

    setEditingReport(null)
    resetForm()
    toast.success('הדוח עודכן בהצלחה')
  }

  const handleDeleteReport = (id: string) => {
    setReports(current => (current || []).filter(r => r.id !== id))
    toast.success('הדוח נמחק')
  }

  const handleToggleActive = (id: string) => {
    setReports(current => 
      (current || []).map(r => 
        r.id === id 
          ? { ...r, isActive: !r.isActive, updatedAt: new Date().toISOString() }
          : r
      )
    )
  }

  const handleSendNow = async (report: AutomatedReport) => {
    await sendScheduledReport(report)
  }

  const handlePreview = (report: AutomatedReport) => {
    const analyzer = new TransactionTrendAnalyzer([])
    const trendReport = report.frequency === 'monthly' 
      ? analyzer.getMonthlyReport()
      : analyzer.getWeeklyReport()
    
    setPreviewReport(trendReport)
    setPreviewDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'weekly',
      dayOfWeek: 'monday',
      dayOfMonth: 1,
      time: '09:00',
      recipients: [],
      isActive: true,
      includeInsights: true,
      includeCharts: true,
      includeAlerts: true,
      customMessage: ''
    })
    setRecipientInput('')
  }

  const handleAddRecipient = () => {
    if (!recipientInput.trim()) return
    
    const emails = recipientInput.split(',').map(e => e.trim()).filter(e => e)
    const validEmails = emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    
    if (validEmails.length === 0) {
      toast.error('כתובת אימייל לא תקינה')
      return
    }

    setFormData(prev => ({
      ...prev,
      recipients: [...(prev.recipients || []), ...validEmails]
    }))
    setRecipientInput('')
  }

  const handleRemoveRecipient = (email: string) => {
    setFormData(prev => ({
      ...prev,
      recipients: (prev.recipients || []).filter(e => e !== email)
    }))
  }

  const startEdit = (report: AutomatedReport) => {
    setEditingReport(report)
    setFormData(report)
    setIsCreating(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">דוחות מגמות אוטומטיים</h2>
          <p className="text-muted-foreground mt-1">
            הגדר דוחות שבועיים/חודשיים עם ניתוח מגמות שוק ושלח אוטומטית למנויים
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="gap-2"
        >
          <Plus size={20} weight="bold" />
          דוח חדש
        </Button>
      </div>

      <Tabs defaultValue="active" dir="rtl">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="active" className="gap-2">
            <Lightning size={18} weight="duotone" />
            דוחות פעילים
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock size={18} weight="duotone" />
            היסטוריה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6">
          {!reports || reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ChartLine size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
                <h3 className="text-lg font-semibold mb-2">אין דוחות אוטומטיים</h3>
                <p className="text-muted-foreground mb-4">צור דוח אוטומטי ראשון לקבלת מגמות שוק באופן קבוע</p>
                <Button onClick={() => setIsCreating(true)} className="gap-2">
                  <Plus size={18} />
                  צור דוח ראשון
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map(report => (
                <Card key={report.id} className="glass-effect">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle>{report.name}</CardTitle>
                          <Badge variant={report.isActive ? 'default' : 'secondary'}>
                            {report.isActive ? 'פעיל' : 'מושהה'}
                          </Badge>
                          <Badge variant="outline">
                            {report.frequency === 'daily' && 'יומי'}
                            {report.frequency === 'weekly' && 'שבועי'}
                            {report.frequency === 'monthly' && 'חודשי'}
                            {report.frequency === 'quarterly' && 'רבעוני'}
                          </Badge>
                        </div>
                        <CardDescription>{report.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(report)}
                        >
                          <Eye size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSendNow(report)}
                        >
                          <PaperPlaneTilt size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(report.id)}
                        >
                          {report.isActive ? <Pause size={18} /> : <Play size={18} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(report)}
                        >
                          <Plus size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Trash size={18} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-muted-foreground" />
                        <span>
                          {report.frequency === 'weekly' && `כל יום ${translateDay(report.dayOfWeek!)}`}
                          {report.frequency === 'monthly' && `כל ${report.dayOfMonth} לחודש`}
                          {report.frequency === 'daily' && 'כל יום'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-muted-foreground" />
                        <span>{report.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Envelope size={16} className="text-muted-foreground" />
                        <span>{report.recipients.length} נמענים</span>
                      </div>
                    </div>
                    {report.lastSent && (
                      <div className="mt-4 text-xs text-muted-foreground">
                        נשלח לאחרונה: {new Date(report.lastSent).toLocaleString('he-IL')}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {report.recipients.map(email => (
                        <Badge key={email} variant="secondary" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          {!sentReports || sentReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
                <h3 className="text-lg font-semibold mb-2">אין היסטוריית שליחה</h3>
                <p className="text-muted-foreground">דוחות שנשלחו יופיעו כאן</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sentReports.map(sent => (
                <Card key={sent.id} className={sent.status === 'failed' ? 'border-destructive' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold">{sent.reportName}</h4>
                          <Badge variant={sent.status === 'sent' ? 'default' : 'destructive'}>
                            {sent.status === 'sent' ? 'נשלח' : 'נכשל'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sent.sentAt).toLocaleString('he-IL')} • {sent.recipients.length} נמענים
                        </p>
                        {sent.errorMessage && (
                          <p className="text-sm text-destructive mt-2">{sent.errorMessage}</p>
                        )}
                      </div>
                      {sent.status === 'sent' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPreviewReport(sent.reportData)
                            setPreviewDialogOpen(true)
                          }}
                        >
                          <Eye size={16} className="ml-2" />
                          הצג דוח
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? 'עריכת דוח אוטומטי' : 'יצירת דוח אוטומטי חדש'}
            </DialogTitle>
            <DialogDescription>
              הגדר דוח מגמות שוק שיישלח אוטומטית בתדירות קבועה
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם הדוח *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="דוח מגמות שבועי"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="תיאור קצר של הדוח"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>תדירות *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={value => setFormData(prev => ({ ...prev, frequency: value as ReportFrequency }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">יומי</SelectItem>
                    <SelectItem value="weekly">שבועי</SelectItem>
                    <SelectItem value="monthly">חודשי</SelectItem>
                    <SelectItem value="quarterly">רבעוני</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>יום בשבוע</Label>
                  <Select
                    value={formData.dayOfWeek}
                    onValueChange={value => setFormData(prev => ({ ...prev, dayOfWeek: value as ReportDay }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">ראשון</SelectItem>
                      <SelectItem value="monday">שני</SelectItem>
                      <SelectItem value="tuesday">שלישי</SelectItem>
                      <SelectItem value="wednesday">רביעי</SelectItem>
                      <SelectItem value="thursday">חמישי</SelectItem>
                      <SelectItem value="friday">שישי</SelectItem>
                      <SelectItem value="saturday">שבת</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>יום בחודש</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.dayOfMonth}
                    onChange={e => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="time">שעה *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>נמענים *</Label>
              <div className="flex gap-2">
                <Input
                  value={recipientInput}
                  onChange={e => setRecipientInput(e.target.value)}
                  placeholder="email@example.com (ניתן להפריד במפסיקים)"
                  onKeyPress={e => e.key === 'Enter' && handleAddRecipient()}
                />
                <Button type="button" onClick={handleAddRecipient}>
                  הוסף
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.recipients?.map(email => (
                  <Badge key={email} variant="secondary" className="gap-2">
                    {email}
                    <button
                      onClick={() => handleRemoveRecipient(email)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>תוכן הדוח</Label>
              <div className="flex items-center gap-3">
                <Switch
                  id="insights"
                  checked={formData.includeInsights}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, includeInsights: checked }))}
                />
                <Label htmlFor="insights" className="cursor-pointer">כלול תובנות AI</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="charts"
                  checked={formData.includeCharts}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, includeCharts: checked }))}
                />
                <Label htmlFor="charts" className="cursor-pointer">כלול גרפים</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="alerts"
                  checked={formData.includeAlerts}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, includeAlerts: checked }))}
                />
                <Label htmlFor="alerts" className="cursor-pointer">כלול התראות</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customMessage">הודעה מותאמת אישית (אופציונלי)</Label>
              <Textarea
                id="customMessage"
                value={formData.customMessage}
                onChange={e => setFormData(prev => ({ ...prev, customMessage: e.target.value }))}
                placeholder="הודעה שתתווסף לתחילת הדוח"
                rows={4}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="active" className="cursor-pointer">דוח פעיל</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false)
                setEditingReport(null)
                resetForm()
              }}
            >
              ביטול
            </Button>
            <Button onClick={editingReport ? handleUpdateReport : handleCreateReport}>
              {editingReport ? 'עדכן' : 'צור דוח'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>תצוגה מקדימה של דוח מגמות</DialogTitle>
            <DialogDescription>
              כך ייראה הדוח שיישלח לנמענים
            </DialogDescription>
          </DialogHeader>
          {previewReport && <TrendReportPreview report={previewReport} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function translateDay(day: ReportDay): string {
  const days: Record<ReportDay, string> = {
    sunday: 'ראשון',
    monday: 'שני',
    tuesday: 'שלישי',
    wednesday: 'רביעי',
    thursday: 'חמישי',
    friday: 'שישי',
    saturday: 'שבת'
  }
  return days[day]
}
