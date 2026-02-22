import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { StandardizedReport, ReportTemplate, ReportStandard, RegulatoryWarning, ReportField, Property, Client } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Plus, Warning, CheckCircle, Lock, LockOpen, FilePdf, FileDoc, Sparkle, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface StandardizedReportsProps {
  properties: Property[]
  clients: Client[]
}

const templateLabels: Record<ReportTemplate, string> = {
  'bank': 'דוח שומה לבנק',
  'tax': 'דוח לצרכי מיסוי',
  'internal': 'דוח פנימי / בדיקת כדאיות',
  'multi-unit': 'דוח בית משותף / ריבוי יחידות',
  'court': 'דוח לבית משפט',
  'betterment-levy': 'שומת היטל השבחה',
  'rental': 'שומת שכירות'
}

const standardLabels: Record<ReportStandard, string> = {
  'standard-19': 'תקן 19',
  'standard-22': 'תקן 22',
  'custom': 'מותאם אישית'
}

const severityColors = {
  'critical': 'border-destructive bg-destructive/10 text-destructive',
  'warning': 'border-warning bg-warning/10 text-warning',
  'info': 'border-primary bg-primary/10 text-primary'
}

export function StandardizedReports({ properties, clients: _clients }: StandardizedReportsProps) {
  const [reports, setReports] = useKV<StandardizedReport[]>('standardized-reports', [])
  const [selectedReport, setSelectedReport] = useState<StandardizedReport | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newReport, setNewReport] = useState<Partial<StandardizedReport>>({
    template: 'bank',
    standard: 'standard-19',
    status: 'draft'
  })

  const generateReportFields = (template: ReportTemplate, standard: ReportStandard): ReportField[] => {
    const baseFields: ReportField[] = [
      { id: 'appraiser-name', name: 'appraiserName', label: 'שם השמאי', type: 'text', required: true, standard, section: 'מידע כללי' },
      { id: 'appraiser-license', name: 'appraiserLicense', label: 'מספר רישיון', type: 'text', required: true, standard, section: 'מידע כללי' },
      { id: 'valuation-date', name: 'valuationDate', label: 'תאריך השומה', type: 'date', required: true, standard, section: 'מידע כללי' },
      { id: 'property-type', name: 'propertyType', label: 'סוג הנכס', type: 'select', required: true, standard, section: 'זיהוי הנכס' },
      { id: 'property-address', name: 'propertyAddress', label: 'כתובת הנכס', type: 'text', required: true, standard, section: 'זיהוי הנכס' },
      { id: 'land-registry', name: 'landRegistry', label: 'פרטי רישום במקרקעין', type: 'text', required: true, standard, section: 'זיהוי הנכס' },
      { id: 'built-area', name: 'builtArea', label: 'שטח בנוי', type: 'number', required: true, standard, section: 'תיאור פיזי' },
      { id: 'condition', name: 'condition', label: 'מצב הנכס', type: 'select', required: true, standard, section: 'תיאור פיזי' },
      { id: 'valuation-method', name: 'valuationMethod', label: 'שיטת השומה', type: 'select', required: true, standard, section: 'שיטת השומה' },
      { id: 'estimated-value', name: 'estimatedValue', label: 'שווי מוערך', type: 'number', required: true, standard, section: 'מסקנות' },
      { id: 'assumptions', name: 'assumptions', label: 'הנחות יסוד', type: 'textarea', required: true, standard, section: 'הסתייגויות' },
      { id: 'limitations', name: 'limitations', label: 'מגבלות', type: 'textarea', required: true, standard, section: 'הסתייגויות' }
    ]

    if (template === 'bank') {
      baseFields.push(
        { id: 'loan-value-ratio', name: 'loanValueRatio', label: 'יחס שווי להלוואה', type: 'number', required: true, standard, section: 'פרטי בנק' },
        { id: 'market-liquidity', name: 'marketLiquidity', label: 'נזילות שוק', type: 'select', required: true, standard, section: 'פרטי בנק' }
      )
    }

    if (template === 'tax') {
      baseFields.push(
        { id: 'tax-purpose', name: 'taxPurpose', label: 'מטרת המיסוי', type: 'text', required: true, standard, section: 'פרטי מס' },
        { id: 'tax-date', name: 'taxDate', label: 'תאריך קובע למס', type: 'date', required: true, standard, section: 'פרטי מס' }
      )
    }

    if (template === 'multi-unit') {
      baseFields.push(
        { id: 'total-units', name: 'totalUnits', label: 'מספר יחידות', type: 'number', required: true, standard, section: 'פרטי בניין' },
        { id: 'common-areas', name: 'commonAreas', label: 'שטחים משותפים', type: 'text', required: false, standard, section: 'פרטי בניין' }
      )
    }

    return baseFields
  }

  const checkRegulatoryCompliance = (report: StandardizedReport): RegulatoryWarning[] => {
    const warnings: RegulatoryWarning[] = []

    if (report.missingFields.includes('appraiser-license')) {
      warnings.push({
        id: crypto.randomUUID(),
        severity: 'critical',
        standard: report.standard,
        section: 'מידע כללי',
        field: 'appraiser-license',
        message: 'חובה להזין מספר רישיון שמאי',
        regulation: report.standard === 'standard-19' ? 'תקן 19 סעיף 3.1' : 'תקן 22 סעיף 2.5'
      })
    }

    if (report.missingFields.includes('land-registry')) {
      warnings.push({
        id: crypto.randomUUID(),
        severity: 'critical',
        standard: report.standard,
        section: 'זיהוי הנכס',
        field: 'land-registry',
        message: 'חובה לציין פרטי רישום במקרקעין',
        regulation: 'חוק המקרקעין'
      })
    }

    if (report.missingFields.includes('assumptions')) {
      warnings.push({
        id: crypto.randomUUID(),
        severity: 'warning',
        standard: report.standard,
        section: 'הסתייגויות',
        field: 'assumptions',
        message: 'מומלץ לציין הנחות יסוד',
        regulation: report.standard === 'standard-19' ? 'תקן 19 סעיף 8.2' : 'תקן 22 סעיף 7.1'
      })
    }

    const completionRate = (report.completedFields.length / report.requiredFields.length) * 100
    if (completionRate < 50) {
      warnings.push({
        id: crypto.randomUUID(),
        severity: 'warning',
        standard: report.standard,
        section: 'כללי',
        message: `דוח מושלם רק ב-${Math.round(completionRate)}% - יש להשלים שדות חסרים`,
        regulation: 'דרישות מינימום'
      })
    }

    return warnings
  }

  const handleCreateReport = () => {
    if (!newReport.propertyId) {
      toast.error('נא לבחור נכס')
      return
    }

    const fields = generateReportFields(newReport.template as ReportTemplate, newReport.standard as ReportStandard)
    const requiredFields = fields.filter(f => f.required)

    const report: StandardizedReport = {
      id: crypto.randomUUID(),
      caseId: crypto.randomUUID(),
      propertyId: newReport.propertyId,
      template: newReport.template as ReportTemplate,
      standard: newReport.standard as ReportStandard,
      version: 1,
      status: 'draft',
      requiredFields: fields,
      completedFields: [],
      missingFields: requiredFields.map(f => f.id),
      regulatoryWarnings: [],
      sections: [],
      smartFill: {
        autoCompletedFields: [],
        suggestions: [],
        dataSource: 'property-data',
        confidence: 0
      },
      versionHistory: [{
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: 'current-user',
        createdByName: 'שמאי ראשי',
        changes: [],
        snapshot: {},
        isLocked: false
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    report.regulatoryWarnings = checkRegulatoryCompliance(report)

    setReports(current => [...(current || []), report])
    setIsCreateDialogOpen(false)
    setNewReport({ template: 'bank', standard: 'standard-19', status: 'draft' })
    toast.success('דוח נוצר בהצלחה')
  }

  const handleSmartFill = async (reportId: string) => {
    const report = reports?.find(r => r.id === reportId)
    if (!report) return

    const property = properties.find(p => p.id === report.propertyId)
    if (!property) return

    toast.info('מפעיל מילוי חכם...')

    setTimeout(() => {
      setReports(current =>
        (current || []).map(r => {
          if (r.id === reportId) {
            const autoFilled = ['property-address', 'property-type', 'built-area', 'condition']
            const completed = [...new Set([...r.completedFields, ...autoFilled])]
            const missing = r.requiredFields.filter(f => f.required && !completed.includes(f.id)).map(f => f.id)

            return {
              ...r,
              completedFields: completed,
              missingFields: missing,
              smartFill: {
                autoCompletedFields: autoFilled,
                suggestions: [
                  {
                    fieldId: 'valuation-method',
                    suggestedValue: 'comparable-sales',
                    confidence: 0.85,
                    source: 'AI Analysis',
                    reasoning: 'נכס מגורים קיים - שיטת השוואה מתאימה'
                  }
                ],
                dataSource: 'property-data',
                confidence: 0.92
              },
              updatedAt: new Date().toISOString(),
              regulatoryWarnings: checkRegulatoryCompliance({
                ...r,
                completedFields: completed,
                missingFields: missing
              })
            }
          }
          return r
        })
      )
      toast.success('מילוי חכם הושלם - 4 שדות הושלמו אוטומטית')
    }, 1500)
  }

  const handleLockReport = (reportId: string) => {
    setReports(current =>
      (current || []).map(r => {
        if (r.id === reportId) {
          return {
            ...r,
            lockedAt: new Date().toISOString(),
            lockedBy: 'current-user',
            status: 'approved'
          }
        }
        return r
      })
    )
    toast.success('דוח ננעל - לא ניתן לעריכה')
  }

  const handleUnlockReport = (reportId: string) => {
    setReports(current =>
      (current || []).map(r => {
        if (r.id === reportId) {
          return {
            ...r,
            lockedAt: undefined,
            lockedBy: undefined,
            status: 'draft'
          }
        }
        return r
      })
    )
    toast.success('נעילת הדוח בוטלה')
  }

  const handleExport = (reportId: string, format: 'word' | 'pdf') => {
    const report = reports?.find(r => r.id === reportId)
    if (!report) return

    if (report.missingFields.length > 0) {
      toast.error('לא ניתן לייצא דוח עם שדות חסרים')
      return
    }

    toast.success(`מייצא דוח ל-${format === 'word' ? 'Word' : 'PDF'}...`)
  }

  const getPropertyAddress = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    return property ? `${property.address.street}, ${property.address.city}` : 'לא ידוע'
  }

  const completionPercentage = (report: StandardizedReport) => {
    if (report.requiredFields.length === 0) return 0
    return Math.round((report.completedFields.length / report.requiredFields.length) * 100)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText size={32} weight="duotone" className="text-primary" />
            דוחות ורגולציה תקנית
          </h2>
          <p className="text-muted-foreground mt-2">
            תבניות דוח תקניות עם מילוי חכם ובדיקות רגולטוריות
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="lg">
              <Plus size={20} weight="bold" />
              דוח תקני חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>יצירת דוח תקני</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>תבנית דוח *</Label>
                <Select value={newReport.template} onValueChange={v => setNewReport({ ...newReport, template: v as ReportTemplate })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(templateLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>תקן *</Label>
                <Select value={newReport.standard} onValueChange={v => setNewReport({ ...newReport, standard: v as ReportStandard })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(standardLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>נכס *</Label>
                <Select value={newReport.propertyId} onValueChange={v => setNewReport({ ...newReport, propertyId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר נכס" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.address.street}, {property.address.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={handleCreateReport}>
                  יצירת דוח
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {(!reports || reports.length === 0) ? (
          <Card className="p-12 text-center glass-effect">
            <FileText size={64} weight="duotone" className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground">אין דוחות תקניים עדיין</p>
            <p className="text-sm text-muted-foreground mt-2">צור דוח ראשון כדי להתחיל</p>
          </Card>
        ) : (
          reports.map(report => {
            const completion = completionPercentage(report)
            const criticalWarnings = report.regulatoryWarnings.filter(w => w.severity === 'critical')

            return (
              <Card key={report.id} className="p-6 glass-effect">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{templateLabels[report.template]}</h3>
                      <Badge variant="outline">{standardLabels[report.standard]}</Badge>
                      {report.lockedAt && (
                        <Badge className="bg-destructive/20 text-destructive gap-1">
                          <Lock size={14} />
                          נעול
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      נכס: {getPropertyAddress(report.propertyId)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      נוצר: {new Date(report.createdAt).toLocaleDateString('he-IL')} • גרסה {report.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!report.lockedAt && (
                      <>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleSmartFill(report.id)}>
                          <Sparkle size={16} weight="fill" />
                          מילוי חכם
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setSelectedReport(report)}>
                          <Eye size={18} />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleLockReport(report.id)}>
                          <Lock size={18} />
                        </Button>
                      </>
                    )}
                    {report.lockedAt && (
                      <>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport(report.id, 'pdf')}>
                          <FilePdf size={16} />
                          PDF
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport(report.id, 'word')}>
                          <FileDoc size={16} />
                          Word
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleUnlockReport(report.id)}>
                          <LockOpen size={18} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        השלמה: {completion}% ({report.completedFields.length}/{report.requiredFields.length})
                      </span>
                      {completion === 100 && (
                        <CheckCircle size={20} weight="fill" className="text-success" />
                      )}
                    </div>
                    <Progress value={completion} className="h-2" />
                  </div>

                  {report.smartFill.autoCompletedFields.length > 0 && (
                    <Alert className="border-primary bg-primary/5">
                      <Sparkle size={16} weight="fill" className="text-primary" />
                      <AlertDescription>
                        <strong>מילוי חכם:</strong> {report.smartFill.autoCompletedFields.length} שדות הושלמו אוטומטית
                        (דיוק: {Math.round(report.smartFill.confidence * 100)}%)
                      </AlertDescription>
                    </Alert>
                  )}

                  {criticalWarnings.length > 0 && (
                    <Alert className={severityColors.critical}>
                      <Warning size={16} weight="fill" />
                      <AlertDescription>
                        <strong>{criticalWarnings.length} אזהרות קריטיות</strong> - יש להשלים שדות חובה לפני ייצוא
                      </AlertDescription>
                    </Alert>
                  )}

                  {report.regulatoryWarnings.filter(w => w.severity === 'warning').length > 0 && (
                    <Alert className={severityColors.warning}>
                      <Warning size={16} />
                      <AlertDescription>
                        {report.regulatoryWarnings.filter(w => w.severity === 'warning').length} אזהרות רגולטוריות
                      </AlertDescription>
                    </Alert>
                  )}

                  {report.missingFields.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <strong>שדות חסרים:</strong> {report.missingFields.slice(0, 3).join(', ')}
                      {report.missingFields.length > 3 && ` +${report.missingFields.length - 3} נוספים`}
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{templateLabels[selectedReport.template]} - גרסה {selectedReport.version}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="fields" dir="rtl">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fields">שדות</TabsTrigger>
                <TabsTrigger value="warnings">אזהרות ({selectedReport.regulatoryWarnings.length})</TabsTrigger>
                <TabsTrigger value="history">היסטוריה</TabsTrigger>
              </TabsList>
              <TabsContent value="fields" className="space-y-4">
                {selectedReport.requiredFields.map(field => {
                  const isCompleted = selectedReport.completedFields.includes(field.id)
                  const isSuggested = selectedReport.smartFill.suggestions.find(s => s.fieldId === field.id)

                  return (
                    <Card key={field.id} className={`p-4 ${isCompleted ? 'border-success' : 'border-border'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Label>{field.label}</Label>
                            {field.required && <Badge variant="destructive" className="text-xs">חובה</Badge>}
                            {isCompleted && <CheckCircle size={16} weight="fill" className="text-success" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{field.section}</p>
                          {isSuggested && (
                            <Alert className="mt-2 border-primary bg-primary/5">
                              <Sparkle size={14} className="text-primary" />
                              <AlertDescription className="text-xs">
                                <strong>הצעה:</strong> {isSuggested.reasoning}
                                <br />
                                <em>דיוק: {Math.round(isSuggested.confidence * 100)}%</em>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </TabsContent>
              <TabsContent value="warnings" className="space-y-3">
                {selectedReport.regulatoryWarnings.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle size={48} weight="duotone" className="mx-auto mb-4 text-success" />
                    <p className="text-muted-foreground">אין אזהרות רגולטוריות</p>
                  </div>
                ) : (
                  selectedReport.regulatoryWarnings.map(warning => (
                    <Alert key={warning.id} className={severityColors[warning.severity]}>
                      <Warning size={16} weight={warning.severity === 'critical' ? 'fill' : 'regular'} />
                      <AlertDescription>
                        <div className="flex items-start justify-between">
                          <div>
                            <strong>{warning.message}</strong>
                            <p className="text-xs mt-1">
                              {warning.regulation} • {warning.section}
                            </p>
                          </div>
                          <Badge variant="outline">{warning.severity}</Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </TabsContent>
              <TabsContent value="history" className="space-y-3">
                {selectedReport.versionHistory.map(version => (
                  <Card key={version.version} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">גרסה {version.version}</p>
                        <p className="text-sm text-muted-foreground">
                          {version.createdByName} • {new Date(version.createdAt).toLocaleString('he-IL')}
                        </p>
                        {version.comment && <p className="text-sm mt-1">{version.comment}</p>}
                      </div>
                      {version.isLocked && (
                        <Badge className="bg-destructive/20 text-destructive">
                          <Lock size={12} />
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
