import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { ChangeLog } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClockCounterClockwise, MagnifyingGlass, Lock, Download, Eye, GitBranch, X } from '@phosphor-icons/react'
import { toast } from 'sonner'

const actionLabels = {
  'created': 'נוצר',
  'updated': 'עודכן',
  'deleted': 'נמחק',
  'locked': 'ננעל',
  'unlocked': 'נעילה בוטלה',
  'signed': 'נחתם',
  'exported': 'יוצא',
  'shared': 'שותף'
}

const actionColors = {
  'created': 'bg-success/20 text-success',
  'updated': 'bg-primary/20 text-primary',
  'deleted': 'bg-destructive/20 text-destructive',
  'locked': 'bg-warning/20 text-warning',
  'unlocked': 'bg-accent/20 text-accent',
  'signed': 'bg-primary/20 text-primary',
  'exported': 'bg-accent/20 text-accent',
  'shared': 'bg-primary/20 text-primary'
}

const entityTypeLabels = {
  'case': 'תיק',
  'property': 'נכס',
  'report': 'דוח',
  'client': 'לקוח',
  'invoice': 'חשבונית'
}

export function AuditTrail() {
  const [changeLogs, setChangeLogs] = useKV<ChangeLog[]>('change-logs', [])
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedLog, setSelectedLog] = useState<ChangeLog | null>(null)
  const [compareVersions, setCompareVersions] = useState<{ before: any; after: any } | null>(null)

  const addSampleLog = () => {
    const sampleLog: ChangeLog = {
      id: crypto.randomUUID(),
      entityType: 'report',
      entityId: crypto.randomUUID(),
      entityName: 'דוח שומה - רחוב הרצל 10',
      action: 'updated',
      userId: 'user-1',
      userName: 'דוד כהן',
      userRole: 'senior-appraiser',
      changes: [
        {
          field: 'estimatedValue',
          fieldLabel: 'שווי מוערך',
          before: 1500000,
          after: 1580000,
          timestamp: new Date().toISOString()
        },
        {
          field: 'valuationMethod',
          fieldLabel: 'שיטת שומה',
          before: 'cost-approach',
          after: 'comparable-sales',
          timestamp: new Date().toISOString()
        }
      ],
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      comment: 'עדכון לאחר בדיקה נוספת של עסקאות דומות',
      isReversible: true
    }

    setChangeLogs(current => [sampleLog, ...(current || [])])
    toast.success('רשומת דוגמה נוספה')
  }

  const handleViewChanges = (log: ChangeLog) => {
    setSelectedLog(log)
  }

  const handleCompareVersions = (log: ChangeLog) => {
    if (log.changes.length === 0) {
      toast.error('אין שינויים להשוואה')
      return
    }

    const before: any = {}
    const after: any = {}

    log.changes.forEach(change => {
      before[change.fieldLabel] = change.before
      after[change.fieldLabel] = change.after
    })

    setCompareVersions({ before, after })
  }

  const handleExportAuditTrail = () => {
    toast.success('מייצא Audit Trail...')
  }

  const filteredLogs = (changeLogs || []).filter(log => {
    const matchesEntity = filterEntity === 'all' || log.entityType === filterEntity
    const matchesAction = filterAction === 'all' || log.action === filterAction
    const matchesSearch = searchQuery === '' ||
      log.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase())
    
    const logDate = new Date(log.timestamp)
    const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom)
    const matchesDateTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59')
    
    return matchesEntity && matchesAction && matchesSearch && matchesDateFrom && matchesDateTo
  })

  const stats = {
    total: changeLogs?.length || 0,
    today: (changeLogs || []).filter(log =>
      new Date(log.timestamp).toDateString() === new Date().toDateString()
    ).length,
    locked: (changeLogs || []).filter(log => log.action === 'locked').length,
    critical: (changeLogs || []).filter(log => log.action === 'deleted' || log.action === 'locked').length
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ClockCounterClockwise size={32} weight="duotone" className="text-primary" />
            לוג שינויים והגנה משפטית
          </h2>
          <p className="text-muted-foreground mt-2">
            מעקב מלא אחר כל שינוי במערכת להגנה משפטית מלאה
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={addSampleLog}>
            <MagnifyingGlass size={18} />
            דוגמה
          </Button>
          <Button className="gap-2" onClick={handleExportAuditTrail}>
            <Download size={18} />
            ייצוא Audit Trail
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">סה"כ שינויים</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <ClockCounterClockwise size={40} weight="duotone" className="text-primary" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">היום</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.today}</p>
            </div>
            <MagnifyingGlass size={40} weight="duotone" className="text-accent" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">נעילות</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.locked}</p>
            </div>
            <Lock size={40} weight="duotone" className="text-warning" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">קריטיים</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.critical}</p>
            </div>
            <Lock size={40} weight="duotone" className="text-destructive" />
          </div>
        </Card>
      </div>

      <Card className="glass-effect p-6">
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="חיפוש לפי שם ישות, משתמש..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הישויות</SelectItem>
                <SelectItem value="case">תיקים</SelectItem>
                <SelectItem value="property">נכסים</SelectItem>
                <SelectItem value="report">דוחות</SelectItem>
                <SelectItem value="client">לקוחות</SelectItem>
                <SelectItem value="invoice">חשבוניות</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הפעולות</SelectItem>
                <SelectItem value="created">נוצר</SelectItem>
                <SelectItem value="updated">עודכן</SelectItem>
                <SelectItem value="deleted">נמחק</SelectItem>
                <SelectItem value="locked">ננעל</SelectItem>
                <SelectItem value="unlocked">נעילה בוטלה</SelectItem>
                <SelectItem value="signed">נחתם</SelectItem>
                <SelectItem value="exported">יוצא</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">מתאריך</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">עד תאריך</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>
            {(dateFrom || dateTo || searchQuery || filterEntity !== 'all' || filterAction !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchQuery('')
                  setDateFrom('')
                  setDateTo('')
                  setFilterEntity('all')
                  setFilterAction('all')
                }}
              >
                <X className="ml-2" />
                נקה סננים
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClockCounterClockwise size={48} weight="duotone" className="mx-auto mb-4 opacity-50" />
                <p>אין רשומות שינויים</p>
                <p className="text-sm mt-2">השתמש בכפתור "דוגמה" כדי להוסיף רשומה לדוגמה</p>
              </div>
            ) : (
              filteredLogs.map(log => (
                <Card key={log.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={actionColors[log.action]}>
                          {actionLabels[log.action]}
                        </Badge>
                        <Badge variant="outline">
                          {entityTypeLabels[log.entityType]}
                        </Badge>
                        <h4 className="font-semibold">{log.entityName}</h4>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <strong>משתמש:</strong> {log.userName} ({log.userRole})
                        </p>
                        <p>
                          <strong>זמן:</strong> {new Date(log.timestamp).toLocaleString('he-IL')}
                        </p>
                        {log.ipAddress && (
                          <p>
                            <strong>IP:</strong> {log.ipAddress}
                          </p>
                        )}
                        {log.comment && (
                          <p className="mt-2">
                            <strong>הערה:</strong> {log.comment}
                          </p>
                        )}
                        {log.changes.length > 0 && (
                          <p className="mt-2 text-primary">
                            {log.changes.length} שינויים
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.changes.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleCompareVersions(log)}
                        >
                          <GitBranch size={16} />
                          השוואה
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewChanges(log)}
                      >
                        <Eye size={18} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>פרטי שינוי - {selectedLog.entityName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">פעולה</p>
                  <Badge className={actionColors[selectedLog.action]}>
                    {actionLabels[selectedLog.action]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">סוג ישות</p>
                  <Badge variant="outline">{entityTypeLabels[selectedLog.entityType]}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">משתמש</p>
                  <p className="font-semibold">{selectedLog.userName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">תפקיד</p>
                  <p className="font-semibold">{selectedLog.userRole}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">זמן</p>
                  <p className="font-semibold">{new Date(selectedLog.timestamp).toLocaleString('he-IL')}</p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground">כתובת IP</p>
                    <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                  </div>
                )}
              </div>

              {selectedLog.changes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">שינויים ({selectedLog.changes.length})</h4>
                  <div className="space-y-2">
                    {selectedLog.changes.map((change, idx) => (
                      <Card key={idx} className="p-3">
                        <p className="font-semibold mb-2">{change.fieldLabel}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">לפני:</p>
                            <p className="font-mono bg-destructive/10 p-2 rounded">
                              {JSON.stringify(change.before, null, 2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">אחרי:</p>
                            <p className="font-mono bg-success/10 p-2 rounded">
                              {JSON.stringify(change.after, null, 2)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.comment && (
                <div>
                  <h4 className="font-semibold mb-2">הערה</h4>
                  <Card className="p-3 bg-muted/50">
                    <p>{selectedLog.comment}</p>
                  </Card>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Badge variant={selectedLog.isReversible ? 'default' : 'destructive'}>
                  {selectedLog.isReversible ? 'ניתן לשחזור' : 'לא ניתן לשחזור'}
                </Badge>
                {selectedLog.isReversible && (
                  <Button variant="outline" disabled>
                    שחזר שינוי זה
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {compareVersions && (
        <Dialog open={!!compareVersions} onOpenChange={() => setCompareVersions(null)}>
          <DialogContent className="max-w-4xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>השוואת גרסאות</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-destructive">לפני השינוי</h4>
                <Card className="p-4 bg-destructive/5 border-destructive/20">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(compareVersions.before, null, 2)}
                  </pre>
                </Card>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-success">אחרי השינוי</h4>
                <Card className="p-4 bg-success/5 border-success/20">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(compareVersions.after, null, 2)}
                  </pre>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
