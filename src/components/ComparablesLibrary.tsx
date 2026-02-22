import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Comparable, PropertyType, ChangeLog, UserRole } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Trash, PencilSimple, Database, Tag, MapPin } from '@phosphor-icons/react'
import { uid } from '@/lib/utils'

type ComparableSource = 'manual' | 'ai-unverified' | 'data.gov.il'

interface ComparableLibraryItem {
  id: string
  createdAt: string
  updatedAt: string
  source: ComparableSource
  area: {
    city: string
    neighborhood?: string
  }
  tags: string[]
  notes?: string
  comparable: Comparable
}

const propertyTypeLabels: Record<PropertyType, string> = {
  apartment: 'דירה',
  house: 'בית פרטי',
  penthouse: 'פנטהאוז',
  'garden-apartment': 'דירת גן',
  duplex: 'דופלקס',
  studio: 'סטודיו',
  commercial: 'מסחרי',
  land: 'קרקע'
}

const sourceLabels: Record<ComparableSource, string> = {
  manual: 'ידני',
  'ai-unverified': 'AI (לא מאומת)',
  'data.gov.il': 'data.gov.il'
}

function splitTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    )
  )
}

function toComparableId(): string {
  return uid('comp')
}

function createChangeLog(params: {
  entityType: 'comparable'
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

export function ComparablesLibrary() {
  const [items, setItems] = useKV<ComparableLibraryItem[]>('comparables-library', [])
  const [_changeLogs, setChangeLogs] = useKV<ChangeLog[]>('change-logs', [])

  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [draft, setDraft] = useState<{
    source: ComparableSource
    city: string
    neighborhood: string
    tags: string
    notes: string
    address: string
    type: PropertyType
    salePrice: number
    saleDate: string
    builtArea: number
    rooms: number
    floor: number
    distance: number
  }>(() => ({
    source: 'manual',
    city: '',
    neighborhood: '',
    tags: '',
    notes: '',
    address: '',
    type: 'apartment',
    salePrice: 0,
    saleDate: new Date().toISOString().slice(0, 10),
    builtArea: 0,
    rooms: 0,
    floor: 0,
    distance: 0
  }))

  const resetDraft = () => {
    setDraft({
      source: 'manual',
      city: '',
      neighborhood: '',
      tags: '',
      notes: '',
      address: '',
      type: 'apartment',
      salePrice: 0,
      saleDate: new Date().toISOString().slice(0, 10),
      builtArea: 0,
      rooms: 0,
      floor: 0,
      distance: 0
    })
    setEditingId(null)
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return items || []

    return (items || []).filter((it) => {
      const haystack = [
        it.area.city,
        it.area.neighborhood || '',
        it.notes || '',
        it.comparable.address,
        it.comparable.type,
        ...it.tags
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [items, searchQuery])

  const openCreate = () => {
    resetDraft()
    setIsDialogOpen(true)
  }

  const openEdit = (item: ComparableLibraryItem) => {
    setEditingId(item.id)
    setDraft({
      source: item.source,
      city: item.area.city,
      neighborhood: item.area.neighborhood || '',
      tags: item.tags.join(', '),
      notes: item.notes || '',
      address: item.comparable.address,
      type: item.comparable.type,
      salePrice: item.comparable.salePrice,
      saleDate: item.comparable.saleDate,
      builtArea: item.comparable.builtArea,
      rooms: item.comparable.rooms,
      floor: item.comparable.floor,
      distance: item.comparable.distance
    })
    setIsDialogOpen(true)
  }

  const validateDraft = () => {
    if (!draft.city.trim()) return 'עיר היא שדה חובה'
    if (!draft.saleDate) return 'תאריך עסקה הוא שדה חובה'
    if (!Number.isFinite(draft.salePrice) || draft.salePrice <= 0) return 'מחיר עסקה חייב להיות גדול מ-0'
    if (!Number.isFinite(draft.builtArea) || draft.builtArea <= 0) return 'שטח בנוי חייב להיות גדול מ-0'

    if (draft.source === 'ai-unverified' && draft.address.trim() !== 'לא מאומת (AI)') {
      return 'מקור AI מחייב כתובת: לא מאומת (AI)'
    }

    return null
  }

  const upsertItem = () => {
    const error = validateDraft()
    if (error) {
      toast.error(error)
      return
    }

    const now = new Date().toISOString()
    const tags = splitTags(draft.tags)

    const comparable: Comparable = {
      id: toComparableId(),
      address: draft.source === 'ai-unverified' ? 'לא מאומת (AI)' : (draft.address || 'לא ידוע'),
      type: draft.type,
      salePrice: Math.round(draft.salePrice),
      saleDate: draft.saleDate,
      builtArea: Math.round(draft.builtArea),
      rooms: Math.round(draft.rooms),
      floor: Math.round(draft.floor),
      distance: Math.max(0, Number(draft.distance) || 0),
      adjustments: {
        location: 0,
        size: 0,
        condition: 0,
        floor: 0,
        age: 0,
        features: 0,
        total: 0
      },
      adjustedPrice: Math.round(draft.salePrice),
      pricePerSqm: draft.builtArea > 0 ? Math.round(draft.salePrice / draft.builtArea) : 0,
      selected: false
    }

    if (!editingId) {
      const item: ComparableLibraryItem = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        source: draft.source,
        area: {
          city: draft.city.trim(),
          neighborhood: draft.neighborhood.trim() || undefined
        },
        tags,
        notes: draft.notes.trim() || undefined,
        comparable
      }

      setItems((current) => [item, ...(current || [])])
      setChangeLogs((current) => [
        createChangeLog({
          entityType: 'comparable',
          entityId: item.id,
          entityName: `${item.area.city} • ${propertyTypeLabels[item.comparable.type]}`,
          action: 'created',
          changes: [
            {
              field: 'created',
              fieldLabel: 'נוסף למאגר',
              before: null,
              after: {
                city: item.area.city,
                type: item.comparable.type,
                salePrice: item.comparable.salePrice,
                saleDate: item.comparable.saleDate,
                source: item.source
              },
              timestamp: now
            }
          ]
        }),
        ...(current || [])
      ])

      toast.success('נכס השוואה נוסף למאגר')
    } else {
      const existing = (items || []).find((x) => x.id === editingId)
      if (!existing) {
        toast.error('לא נמצא פריט לעריכה')
        return
      }

      const updated: ComparableLibraryItem = {
        ...existing,
        updatedAt: now,
        source: draft.source,
        area: {
          city: draft.city.trim(),
          neighborhood: draft.neighborhood.trim() || undefined
        },
        tags,
        notes: draft.notes.trim() || undefined,
        comparable: {
          ...comparable,
          id: existing.comparable.id
        }
      }

      setItems((current) => (current || []).map((x) => (x.id === editingId ? updated : x)))
      setChangeLogs((current) => [
        createChangeLog({
          entityType: 'comparable',
          entityId: updated.id,
          entityName: `${updated.area.city} • ${propertyTypeLabels[updated.comparable.type]}`,
          action: 'updated',
          changes: [
            {
              field: 'updated',
              fieldLabel: 'עודכן במאגר',
              before: {
                city: existing.area.city,
                type: existing.comparable.type,
                salePrice: existing.comparable.salePrice,
                saleDate: existing.comparable.saleDate,
                source: existing.source
              },
              after: {
                city: updated.area.city,
                type: updated.comparable.type,
                salePrice: updated.comparable.salePrice,
                saleDate: updated.comparable.saleDate,
                source: updated.source
              },
              timestamp: now
            }
          ]
        }),
        ...(current || [])
      ])

      toast.success('נכס השוואה עודכן')
    }

    setIsDialogOpen(false)
    resetDraft()
  }

  const deleteItem = (id: string) => {
    const existing = (items || []).find((x) => x.id === id)
    if (!existing) return

    const now = new Date().toISOString()
    setItems((current) => (current || []).filter((x) => x.id !== id))
    setChangeLogs((current) => [
      createChangeLog({
        entityType: 'comparable',
        entityId: existing.id,
        entityName: `${existing.area.city} • ${propertyTypeLabels[existing.comparable.type]}`,
        action: 'deleted',
        changes: [
          {
            field: 'deleted',
            fieldLabel: 'נמחק מהמאגר',
            before: {
              city: existing.area.city,
              type: existing.comparable.type,
              salePrice: existing.comparable.salePrice,
              saleDate: existing.comparable.saleDate,
              source: existing.source
            },
            after: null,
            timestamp: now
          }
        ]
      }),
      ...(current || [])
    ])
    toast.success('נכס השוואה נמחק')
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Database size={32} weight="duotone" className="text-primary" />
            מאגר נכסי השוואה
          </h2>
          <p className="text-muted-foreground mt-2">
            אחסון וניהול נכסי השוואה עם תגיות ואזורי שוק
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetDraft()
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="lg" onClick={openCreate}>
              <Plus size={20} weight="bold" />
              הוספת נכס
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'עריכת נכס השוואה' : 'הוספת נכס השוואה'}</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="details" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">פרטי עסקה</TabsTrigger>
                <TabsTrigger value="tags">אזור ותגיות</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>מקור *</Label>
                    <Select value={draft.source} onValueChange={(v) => {
                      const next = v as ComparableSource
                      setDraft((d) => ({
                        ...d,
                        source: next,
                        address: next === 'ai-unverified' ? 'לא מאומת (AI)' : d.address
                      }))
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(sourceLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>סוג נכס *</Label>
                    <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v as PropertyType }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(propertyTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>כתובת/תיאור</Label>
                  <Input
                    value={draft.address}
                    onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                    disabled={draft.source === 'ai-unverified'}
                    placeholder={draft.source === 'ai-unverified' ? 'לא מאומת (AI)' : 'תיאור חופשי / כתובת אם ידועה'}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>מחיר עסקה (₪) *</Label>
                    <Input type="number" value={draft.salePrice} onChange={(e) => setDraft((d) => ({ ...d, salePrice: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>תאריך עסקה *</Label>
                    <Input type="date" value={draft.saleDate} onChange={(e) => setDraft((d) => ({ ...d, saleDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>שטח בנוי (מ"ר) *</Label>
                    <Input type="number" value={draft.builtArea} onChange={(e) => setDraft((d) => ({ ...d, builtArea: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>חדרים</Label>
                    <Input type="number" value={draft.rooms} onChange={(e) => setDraft((d) => ({ ...d, rooms: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>קומה</Label>
                    <Input type="number" value={draft.floor} onChange={(e) => setDraft((d) => ({ ...d, floor: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>מרחק (ק"מ)</Label>
                    <Input type="number" value={draft.distance} onChange={(e) => setDraft((d) => ({ ...d, distance: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsDialogOpen(false)
                    resetDraft()
                  }}>ביטול</Button>
                  <Button onClick={upsertItem}>{editingId ? 'שמירת שינויים' : 'הוספה'}</Button>
                </div>
              </TabsContent>

              <TabsContent value="tags" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>עיר *</Label>
                    <div className="relative">
                      <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pr-9" value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="תל אביב" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>שכונה</Label>
                    <Input value={draft.neighborhood} onChange={(e) => setDraft((d) => ({ ...d, neighborhood: e.target.value }))} placeholder="אופציונלי" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>תגיות (מופרדות בפסיקים)</Label>
                  <div className="relative">
                    <Tag size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pr-9" value={draft.tags} onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} placeholder="לדוגמה: מרכז, חזית, משופצת" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>הערות</Label>
                  <Input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="אופציונלי" />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsDialogOpen(false)
                    resetDraft()
                  }}>ביטול</Button>
                  <Button onClick={upsertItem}>{editingId ? 'שמירת שינויים' : 'הוספה'}</Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-effect p-6">
        <div className="flex items-center gap-3">
          <Input
            placeholder="חיפוש לפי עיר / שכונה / תגיות / כתובת..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Badge variant="outline">{filtered.length} רשומות</Badge>
        </div>
      </Card>

      <Card className="glass-effect p-6">
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            אין נכסי השוואה במאגר
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>אזור</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>מחיר</TableHead>
                <TableHead>תאריך</TableHead>
                <TableHead>שטח</TableHead>
                <TableHead>מקור</TableHead>
                <TableHead>תגיות</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <div className="font-medium">{it.area.city}</div>
                    {it.area.neighborhood && (
                      <div className="text-xs text-muted-foreground">{it.area.neighborhood}</div>
                    )}
                  </TableCell>
                  <TableCell>{propertyTypeLabels[it.comparable.type]}</TableCell>
                  <TableCell>₪{it.comparable.salePrice.toLocaleString('he-IL')}</TableCell>
                  <TableCell>{it.comparable.saleDate}</TableCell>
                  <TableCell>{it.comparable.builtArea} מ"ר</TableCell>
                  <TableCell>
                    <Badge variant="outline">{sourceLabels[it.source]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {it.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary">{t}</Badge>
                      ))}
                      {it.tags.length > 3 && (
                        <Badge variant="outline">+{it.tags.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(it)}>
                        <PencilSimple size={18} />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => deleteItem(it.id)}>
                        <Trash size={18} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="text-xs text-muted-foreground">
        הערה: פריטים שמקורם ב-AI מסומנים כ"לא מאומת (AI)" ואינם כוללים כתובת אמיתית.
      </div>
    </div>
  )
}
