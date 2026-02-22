import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { ChangeLog, Property, UserRole } from '@/lib/types'
import type { AppraisalRecord } from '@/lib/appraisalSchema'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DataGovValuation } from '@/components/DataGovValuation'
import { generateAppraisalSummary } from '@/lib/appraisalSchema'
import { toast } from 'sonner'
import { Compass, FileText, CheckCircle } from '@phosphor-icons/react'

function createChangeLog(params: {
  entityType: 'appraisal'
  entityId: string
  entityName: string
  action: ChangeLog['action']
  changes: ChangeLog['changes']
  userRole?: UserRole
  comment?: string
}): ChangeLog {
  return {
    id: crypto.randomUUID(),
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    action: params.action,
    userId: 'current-user',
    userName: 'משתמש נוכחי',
    userRole: params.userRole || 'senior-appraiser',
    changes: params.changes,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    comment: params.comment,
    isReversible: true
  }
}

export function GuidedAppraisalFlow() {
  const [properties] = useKV<Property[]>('properties', [])
  const [records, setRecords] = useKV<AppraisalRecord[]>('appraisal-records', [])
  const [_changeLogs, setChangeLogs] = useKV<ChangeLog[]>('change-logs', [])

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [selectedRecord, setSelectedRecord] = useState<AppraisalRecord | null>(null)

  const selectedProperty = useMemo(() => {
    return (properties || []).find((p) => p.id === selectedPropertyId) || null
  }, [properties, selectedPropertyId])

  const handleComplete = (record: AppraisalRecord) => {
    setRecords((current) => {
      const arr = current || []
      const index = arr.findIndex((r) => r.id === record.id)
      if (index >= 0) {
        const updated = [...arr]
        updated[index] = record
        return updated
      }
      return [record, ...arr]
    })

    const now = new Date().toISOString()
    setChangeLogs((current) => [
      createChangeLog({
        entityType: 'appraisal',
        entityId: record.id,
        entityName: `שומה: ${record.property.street}, ${record.property.city}`,
        action: 'created',
        changes: [
          {
            field: 'created',
            fieldLabel: 'נוצרה שומה',
            before: null,
            after: {
              city: record.property.city,
              street: record.property.street,
              area: record.property.area,
              estimatedValue: record.valuation.estimatedValue,
              source: record.marketData.source,
              sampleSize: record.marketData.sampleSize
            },
            timestamp: now
          }
        ]
      }),
      ...(current || [])
    ])

    toast.success('השומה נשמרה ונרשמה ב-Audit Trail')
  }

  const sortedRecords = useMemo(() => {
    return [...(records || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [records])

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Compass size={32} weight="duotone" className="text-primary" />
          אשף שומה (מינימלי)
        </h2>
        <p className="text-muted-foreground mt-2">
          זרימה מודרכת לביצוע שמאות מבוססת data.gov.il ושמירה עם Audit Trail
        </p>
      </div>

      <Card className="glass-effect p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2 min-w-[260px]">
            <Label>בחר נכס (אופציונלי)</Label>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="בחר נכס כדי למלא פרטים אוטומטית" />
              </SelectTrigger>
              <SelectContent>
                {(properties || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.address.street}, {p.address.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{sortedRecords.length} שומות שמורות</Badge>
          </div>
        </div>
      </Card>

      <DataGovValuation
        propertyId={selectedProperty?.id || 'guided-appraisal'}
        initialCity={selectedProperty?.address.city || ''}
        initialStreet={selectedProperty?.address.street || ''}
        initialArea={selectedProperty?.details.builtArea || 0}
        onValuationComplete={handleComplete}
      />

      <Card className="glass-effect p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText size={20} />
            שומות שנשמרו
          </h3>
          <div className="text-sm text-muted-foreground">
            צפייה בסיכום השומה (כולל auditTrail פנימי)
          </div>
        </div>

        {sortedRecords.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            אין שומות שמורות עדיין
          </div>
        ) : (
          <div className="space-y-2">
            {sortedRecords.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.property.street}, {r.property.city}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    ₪{r.valuation.estimatedValue.toLocaleString('he-IL')} • {r.marketData.sampleSize} עסקאות • {new Date(r.createdAt).toLocaleDateString('he-IL')}
                  </div>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => setSelectedRecord(r)}>
                  <CheckCircle size={16} weight="fill" />
                  סיכום
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>סיכום שומה</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <ScrollArea className="h-[70vh]">
              <pre className="whitespace-pre-wrap text-sm leading-6">
                {generateAppraisalSummary(selectedRecord)}
              </pre>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
