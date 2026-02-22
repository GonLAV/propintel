import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FilePdf, Download } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { parseCSV } from '@/lib/csvImport'
import { ReportGenerator } from '@/lib/reportGenerator'
import type { Comparable, Property, ValuationResult } from '@/lib/types'
import type { ReportSection } from '@/lib/reportGenerator'

export interface ValuationToolsPanelProps {
  property: Property
  comparables: Comparable[]
  valuationResults: (ValuationResult | null)[]
  onImportComparables: (comps: Comparable[]) => void
}

export function ValuationToolsPanel({
  property,
  comparables,
  valuationResults,
  onImportComparables
}: ValuationToolsPanelProps) {
  const [csvInput, setCsvInput] = useState('')
  const [importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([])
  const [reportSections, setReportSections] = useState<ReportSection[]>([])
  const [showReportPreview, setShowReportPreview] = useState(false)

  const handleCSVImport = () => {
    if (!csvInput.trim()) {
      toast.error('קובץ CSV ריק', { description: 'הדבק קוד CSV או בחר בקובץ' })
      return
    }

    const result = parseCSV(csvInput)
    setImportErrors(result.errors)

    if (result.comparables.length > 0) {
      onImportComparables(result.comparables)
      setCsvInput('')
      toast.success(`ייבוא הצליח`, {
        description: `${result.comparables.length} עסקאות ${result.errors.length > 0 ? `+ ${result.errors.length} שגיאות` : ''}`
      })
    } else if (result.errors.length > 0) {
      toast.error('ייבוא נכשל', { description: result.errors[0].message })
    }
  }

  const handleGenerateReport = () => {
    const valResults = valuationResults.filter(Boolean) as ValuationResult[]
    if (valResults.length === 0) {
      toast.error('אין שומה', { description: 'הרץ שומה לפני יצירת דוח' })
      return
    }

    const selectedComps = comparables.filter(c => c.selected)
    const sections = ReportGenerator.generateStandardSections(property, valResults, selectedComps)
    setReportSections(sections)
    setShowReportPreview(true)
    toast.success('דוח נוצר', { description: `${sections.length} סעיפים` })
  }

  return (
    <div className="space-y-4">
      {/* CSV Import Panel */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">ייבוא עסקאות מ-CSV</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="csv-input">קובץ CSV (כותרות + שורות)</Label>
            <textarea
              id="csv-input"
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder={`address,type,salePrice,saleDate,builtArea,rooms,floor\nרחוב לוינסקי 22,apartment,2850000,2024-01-15,82,3.5,2`}
              className="w-full h-24 p-3 border rounded-lg font-mono text-xs mt-2 bg-muted/50"
            />
          </div>
          <Button onClick={handleCSVImport} className="w-full gap-2">
            <Download size={16} /> ייבא עסקאות
          </Button>

          {importErrors.length > 0 && (
            <Alert className="bg-destructive/10 border-destructive/30">
              <AlertDescription className="text-xs">
                {importErrors.slice(0, 3).map((err) => (
                  <div key={`${err.row}`}>שורה {err.row}: {err.message}</div>
                ))}
                {importErrors.length > 3 && <div>... ועוד {importErrors.length - 3} שגיאות</div>}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Report Generation Panel */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">יצירת דוח שומה</h3>
        <Button onClick={handleGenerateReport} className="w-full gap-2 mb-4">
          <FilePdf size={16} /> צור דוח
        </Button>

        {showReportPreview && reportSections.length > 0 && (
          <div className="space-y-3 mt-4 p-4 bg-muted/30 rounded-lg border border-muted">
            <p className="text-sm font-semibold">{reportSections.length} סעיפים:</p>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {reportSections.map((section) => (
                  <div key={section.id} className="text-xs p-2 bg-background rounded border-l-2 border-primary">
                    <p className="font-semibold text-foreground">{section.title}</p>
                    <p className="text-muted-foreground mt-1 line-clamp-1">{section.content.substring(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </Card>
    </div>
  )
}
