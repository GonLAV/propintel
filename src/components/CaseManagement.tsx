import { useState, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Case, CaseStatus, Property, Client } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FolderOpen, Plus, Clock, CheckCircle, Eye, Trash, FileText, Pencil } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface CaseManagementProps {
  properties: Property[]
  clients: Client[]
}

const statusColors: Record<CaseStatus, string> = {
  'draft': 'bg-muted text-muted-foreground',
  'submitted': 'bg-primary/20 text-primary',
  'under-review': 'bg-warning/20 text-warning',
  'approved': 'bg-success/20 text-success',
  'closed': 'bg-accent/20 text-accent',
  'archived': 'bg-border text-muted-foreground'
}

const statusLabels: Record<CaseStatus, string> = {
  'draft': 'טיוטה',
  'submitted': 'הוגש',
  'under-review': 'בבדיקה',
  'approved': 'אושר',
  'closed': 'סגור',
  'archived': 'בארכיון'
}

const priorityColors = {
  'low': 'bg-muted text-muted-foreground',
  'normal': 'bg-primary/20 text-primary',
  'high': 'bg-warning/20 text-warning',
  'urgent': 'bg-destructive/20 text-destructive'
}

const priorityLabels = {
  'low': 'נמוך',
  'normal': 'רגיל',
  'high': 'גבוה',
  'urgent': 'דחוף'
}

export function CaseManagement({ properties, clients }: CaseManagementProps) {
  const [cases, setCases] = useKV<Case[]>('cases', [])
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [filterStatus, setFilterStatus] = useState<CaseStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCase, setNewCase] = useState<Partial<Case>>({
    status: 'draft',
    priority: 'normal',
    type: 'single-property'
  })

  // ── O(1) lookups instead of O(n) per case ──────────────────────
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients])
  const propertyMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties])

  const generateCaseNumber = () => {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const count = (cases?.length || 0) + 1
    return `CASE-${year}${month}-${String(count).padStart(4, '0')}`
  }

  const handleCreateCase = () => {
    if (!newCase.clientId || !newCase.propertyId) {
      toast.error('נא לבחור לקוח ונכס')
      return
    }

    const caseToCreate: Case = {
      id: crypto.randomUUID(),
      caseNumber: generateCaseNumber(),
      clientId: newCase.clientId,
      propertyId: newCase.propertyId,
      status: newCase.status as CaseStatus || 'draft',
      priority: newCase.priority as any || 'normal',
      type: newCase.type as any || 'single-property',
      assignedTo: [],
      reports: [],
      invoices: [],
      documents: [],
      timeline: [{
        id: crypto.randomUUID(),
        type: 'created',
        description: 'תיק נוצר',
        userId: 'current-user',
        userName: 'שמאי ראשי',
        timestamp: new Date().toISOString()
      }],
      tags: [],
      startedAt: new Date().toISOString(),
      notes: newCase.notes,
      internalNotes: newCase.internalNotes
    }

    setCases(current => [...(current || []), caseToCreate])
    setIsCreateDialogOpen(false)
    setNewCase({ status: 'draft', priority: 'normal', type: 'single-property' })
    toast.success('תיק נוצר בהצלחה')
  }

  const handleUpdateStatus = (caseId: string, newStatus: CaseStatus) => {
    setCases(current => 
      (current || []).map(c => {
        if (c.id === caseId) {
          const event = {
            id: crypto.randomUUID(),
            type: 'status-changed' as const,
            description: `סטטוס שונה ל-${statusLabels[newStatus]}`,
            userId: 'current-user',
            userName: 'שמאי ראשי',
            timestamp: new Date().toISOString(),
            metadata: { from: c.status, to: newStatus }
          }
          return {
            ...c,
            status: newStatus,
            timeline: [...c.timeline, event],
            completedAt: newStatus === 'closed' ? new Date().toISOString() : c.completedAt,
            archivedAt: newStatus === 'archived' ? new Date().toISOString() : c.archivedAt
          }
        }
        return c
      })
    )
    toast.success('סטטוס עודכן')
  }

  const handleDeleteCase = (caseId: string) => {
    setCases(current => (current || []).filter(c => c.id !== caseId))
    setSelectedCase(null)
    toast.success('תיק נמחק')
  }

  const filteredCases = (cases || []).filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus
    const matchesSearch = searchQuery === '' || 
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientMap.get(c.clientId)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propertyMap.get(c.propertyId)?.address.street.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getClientName = (clientId: string) => {
    return clientMap.get(clientId)?.name || 'לקוח לא ידוע'
  }

  const getPropertyAddress = (propertyId: string) => {
    const property = propertyMap.get(propertyId)
    return property ? `${property.address.street}, ${property.address.city}` : 'כתובת לא ידועה'
  }

  const stats = {
    total: cases?.length || 0,
    draft: (cases || []).filter(c => c.status === 'draft').length,
    inProgress: (cases || []).filter(c => c.status === 'submitted' || c.status === 'under-review').length,
    completed: (cases || []).filter(c => c.status === 'approved' || c.status === 'closed').length
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FolderOpen size={32} weight="duotone" className="text-primary" />
            ניהול תיקים ושומות
          </h2>
          <p className="text-muted-foreground mt-2">
            ניהול מרכזי של כל התיקים, השומות והדוחות במערכת
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="lg">
              <Plus size={20} weight="bold" />
              תיק חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>יצירת תיק חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>לקוח *</Label>
                  <Select value={newCase.clientId} onValueChange={v => setNewCase({ ...newCase, clientId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>נכס *</Label>
                  <Select value={newCase.propertyId} onValueChange={v => setNewCase({ ...newCase, propertyId: v })}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סוג תיק</Label>
                  <Select value={newCase.type} onValueChange={v => setNewCase({ ...newCase, type: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-property">נכס יחיד</SelectItem>
                      <SelectItem value="multi-unit">ריבוי יחידות</SelectItem>
                      <SelectItem value="portfolio">תיק נכסים</SelectItem>
                      <SelectItem value="land">קרקע</SelectItem>
                      <SelectItem value="commercial">מסחרי</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>עדיפות</Label>
                  <Select value={newCase.priority} onValueChange={v => setNewCase({ ...newCase, priority: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוך</SelectItem>
                      <SelectItem value="normal">רגיל</SelectItem>
                      <SelectItem value="high">גבוה</SelectItem>
                      <SelectItem value="urgent">דחוף</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>הערות</Label>
                <Textarea 
                  value={newCase.notes || ''} 
                  onChange={e => setNewCase({ ...newCase, notes: e.target.value })}
                  placeholder="הערות ללקוח..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>הערות פנימיות</Label>
                <Textarea 
                  value={newCase.internalNotes || ''} 
                  onChange={e => setNewCase({ ...newCase, internalNotes: e.target.value })}
                  placeholder="הערות פנימיות (לא יוצגו ללקוח)..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={handleCreateCase}>
                  יצירת תיק
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">סה"כ תיקים</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.total}</p>
            </div>
            <FolderOpen size={40} weight="duotone" className="text-primary" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">טיוטות</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.draft}</p>
            </div>
            <Pencil size={40} weight="duotone" className="text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">בתהליך</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.inProgress}</p>
            </div>
            <Clock size={40} weight="duotone" className="text-warning" />
          </div>
        </Card>
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">הושלמו</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.completed}</p>
            </div>
            <CheckCircle size={40} weight="duotone" className="text-success" />
          </div>
        </Card>
      </div>

      <Card className="glass-effect p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="חיפוש לפי מספר תיק, לקוח או נכס..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="draft">טיוטה</SelectItem>
              <SelectItem value="submitted">הוגש</SelectItem>
              <SelectItem value="under-review">בבדיקה</SelectItem>
              <SelectItem value="approved">אושר</SelectItem>
              <SelectItem value="closed">סגור</SelectItem>
              <SelectItem value="archived">בארכיון</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen size={48} weight="duotone" className="mx-auto mb-4 opacity-50" />
              <p>לא נמצאו תיקים</p>
            </div>
          ) : (
            filteredCases.map(caseItem => (
              <Card key={caseItem.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{caseItem.caseNumber}</h3>
                      <Badge className={statusColors[caseItem.status]}>
                        {statusLabels[caseItem.status]}
                      </Badge>
                      <Badge className={priorityColors[caseItem.priority]}>
                        {priorityLabels[caseItem.priority]}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>לקוח:</strong> {getClientName(caseItem.clientId)}</p>
                      <p><strong>נכס:</strong> {getPropertyAddress(caseItem.propertyId)}</p>
                      <p><strong>נוצר:</strong> {new Date(caseItem.startedAt).toLocaleDateString('he-IL')}</p>
                      {caseItem.notes && <p><strong>הערות:</strong> {caseItem.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={caseItem.status} onValueChange={v => handleUpdateStatus(caseItem.id, v as CaseStatus)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">טיוטה</SelectItem>
                        <SelectItem value="submitted">הוגש</SelectItem>
                        <SelectItem value="under-review">בבדיקה</SelectItem>
                        <SelectItem value="approved">אושר</SelectItem>
                        <SelectItem value="closed">סגור</SelectItem>
                        <SelectItem value="archived">בארכיון</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setSelectedCase(caseItem)}>
                      <Eye size={18} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDeleteCase(caseItem.id)}>
                      <Trash size={18} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {selectedCase && (
        <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
          <DialogContent className="max-w-4xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>פרטי תיק {selectedCase.caseNumber}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="details" dir="rtl">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">פרטים</TabsTrigger>
                <TabsTrigger value="timeline">ציר זמן</TabsTrigger>
                <TabsTrigger value="reports">דוחות</TabsTrigger>
                <TabsTrigger value="documents">מסמכים</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">מספר תיק</Label>
                    <p className="font-semibold">{selectedCase.caseNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">סטטוס</Label>
                    <p><Badge className={statusColors[selectedCase.status]}>{statusLabels[selectedCase.status]}</Badge></p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">לקוח</Label>
                    <p className="font-semibold">{getClientName(selectedCase.clientId)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">נכס</Label>
                    <p className="font-semibold">{getPropertyAddress(selectedCase.propertyId)}</p>
                  </div>
                </div>
                {selectedCase.notes && (
                  <div>
                    <Label className="text-muted-foreground">הערות</Label>
                    <p className="mt-1">{selectedCase.notes}</p>
                  </div>
                )}
                {selectedCase.internalNotes && (
                  <div>
                    <Label className="text-muted-foreground">הערות פנימיות</Label>
                    <p className="mt-1 text-warning">{selectedCase.internalNotes}</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="timeline">
                <div className="space-y-3">
                  {selectedCase.timeline.map(event => (
                    <Card key={event.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold">{event.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.userName} • {new Date(event.timestamp).toLocaleString('he-IL')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="reports">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText size={48} weight="duotone" className="mx-auto mb-4 opacity-50" />
                  <p>אין דוחות עדיין</p>
                </div>
              </TabsContent>
              <TabsContent value="documents">
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen size={48} weight="duotone" className="mx-auto mb-4 opacity-50" />
                  <p>אין מסמכים עדיין</p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
