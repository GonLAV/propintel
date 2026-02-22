/**
 * SmartInspection — Full property inspection workflow.
 * ────────────────────────────────────────────────────
 * • Photo capture with room/area tagging
 * • Property-type specific checklists
 * • Issue detection & flagging
 * • Automatic measurement input
 * • GPS tagging per photo
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import {
  Camera, MapPin, Ruler, Warning, CheckCircle,
  Plus, Trash, CaretDown, CaretUp, Image,
  ListChecks, Tag,
  UploadSimple, Note,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { uid } from '@/lib/utils'
import type { PropertyType } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────
interface InspectionPhoto {
  id: string
  dataUrl: string
  room: string
  notes: string
  issues: string[]
  timestamp: string
  gps?: { lat: number; lng: number }
}

interface ChecklistItem {
  id: string
  label: string
  category: string
  checked: boolean
  severity?: 'ok' | 'minor' | 'major' | 'critical'
  notes: string
}

interface Measurement {
  id: string
  room: string
  width: number
  length: number
  height: number
  area: number
}

interface Inspection {
  id: string
  propertyAddress: string
  propertyType: PropertyType
  inspectorName: string
  date: string
  status: 'draft' | 'in-progress' | 'completed'
  photos: InspectionPhoto[]
  checklist: ChecklistItem[]
  measurements: Measurement[]
  generalNotes: string
  overallCondition: string
}

// ── Checklists per property type ──────────────────────────────────
const CHECKLIST_TEMPLATES: Record<string, { category: string; items: string[] }[]> = {
  apartment: [
    { category: 'מבנה', items: ['מצב קירות חיצוניים', 'מצב קירות פנימיים', 'מצב תקרה', 'מצב רצפה', 'סדקים במבנה', 'רטיבות'] },
    { category: 'אינסטלציה', items: ['מצב צנרת מים', 'מצב ניקוז', 'לחץ מים', 'דוד שמש/חשמלי', 'ברזים ואביזרים'] },
    { category: 'חשמל', items: ['לוח חשמל', 'שקעים ומתגים', 'תאורה', 'חיבור מזגן', 'גנרטור/UPS'] },
    { category: 'גימור', items: ['מצב חלונות', 'מצב דלתות', 'ארונות מטבח', 'ארונות אמבטיה', 'מרפסת/מעקה'] },
    { category: 'בטיחות', items: ['גלאי עשן', 'ברז כיבוי', 'מעלית', 'חניה', 'מחסן'] },
  ],
  house: [
    { category: 'חוץ', items: ['מצב גג', 'מרזבים', 'חצר/גינה', 'גדר', 'שער', 'חניה', 'בריכה'] },
    { category: 'מבנה', items: ['יסודות', 'קירות נושאים', 'סדקים', 'רטיבות', 'בידוד תרמי'] },
    { category: 'אינסטלציה', items: ['בור ספיגה/ביוב', 'צנרת ראשית', 'דוד שמש', 'מערכת השקיה'] },
    { category: 'חשמל', items: ['לוח ראשי', 'הארקה', 'תאורת חוץ', 'מערכת אזעקה', 'אינטרקום'] },
    { category: 'גימור', items: ['ריצוף', 'חיפוי קירות', 'חלונות', 'דלתות', 'מטבח', 'אמבטיות'] },
  ],
  commercial: [
    { category: 'מבנה', items: ['חזית', 'כניסה ראשית', 'מצב רצפה', 'תקרה אקוסטית', 'מחיצות'] },
    { category: 'מערכות', items: ['מיזוג מרכזי', 'מערכת כיבוי', 'גנרטור', 'מעלית משא', 'רמפה'] },
    { category: 'בטיחות', items: ['יציאות חירום', 'ספרינקלרים', 'גלאי עשן', 'שלטי חירום', 'מילוט נגיש'] },
    { category: 'נגישות', items: ['כניסה נגישה', 'שירותי נכים', 'חניית נכים', 'מעלית נגישה'] },
    { category: 'תשתיות', items: ['חשמל תלת-פאזי', 'אינטרנט/תקשורת', 'מים', 'גז', 'ביוב'] },
  ],
  land: [
    { category: 'קרקע', items: ['טופוגרפיה', 'ניקוז', 'צמחייה', 'סלעים/מכשולים', 'גישה לחלקה'] },
    { category: 'תשתיות', items: ['חיבור חשמל', 'חיבור מים', 'חיבור ביוב', 'כביש גישה', 'מדרכה'] },
    { category: 'תכנון', items: ['ייעוד קרקע', 'זכויות בנייה', 'קווי בניין', 'תב"ע תקפה', 'הפקעות'] },
    { category: 'סביבה', items: ['שכנים', 'מבני ציבור', 'תחבורה', 'מפגעים סביבתיים'] },
  ],
}

function getChecklist(type: PropertyType): ChecklistItem[] {
  const key = type === 'penthouse' || type === 'garden-apartment' || type === 'duplex' || type === 'studio'
    ? 'apartment'
    : type === 'commercial' ? 'commercial'
    : type === 'land' ? 'land'
    : type === 'house' ? 'house'
    : 'apartment'

  const template = CHECKLIST_TEMPLATES[key] || CHECKLIST_TEMPLATES.apartment
  return template.flatMap(cat =>
    cat.items.map(item => ({
      id: uid('chk'),
      label: item,
      category: cat.category,
      checked: false,
      notes: '',
    }))
  )
}

const ROOM_OPTIONS = [
  'סלון', 'מטבח', 'חדר שינה ראשי', 'חדר שינה', 'חדר ילדים',
  'אמבטיה', 'שירותים', 'מרפסת', 'מחסן', 'חניה',
  'חצר', 'גג', 'כניסה', 'מסדרון', 'ממ"ד', 'אחר',
]

const ISSUE_TAGS = [
  'רטיבות', 'סדק', 'עובש', 'צבע מתקלף', 'נזילה',
  'חשמל לקוי', 'ריצוף שבור', 'חלון שבור', 'דלת פגומה',
  'בעיית ניקוז', 'חוסר בידוד', 'רעש', 'ריח',
]

const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'מצוין', color: 'text-emerald-600' },
  { value: 'good', label: 'טוב', color: 'text-blue-600' },
  { value: 'fair', label: 'סביר', color: 'text-amber-600' },
  { value: 'poor', label: 'גרוע', color: 'text-orange-600' },
  { value: 'renovation-needed', label: 'דרוש שיפוץ', color: 'text-red-600' },
]

export function SmartInspection() {
  const [inspections, setInspections] = useKV<Inspection[]>('inspections', [])
  const [activeInspection, setActiveInspection] = useState<Inspection | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const safe = inspections || []

  // ── Create new inspection ───────────────────────────────────────
  const createInspection = useCallback(() => {
    const inspection: Inspection = {
      id: uid('insp'),
      propertyAddress: '',
      propertyType: 'apartment',
      inspectorName: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'draft',
      photos: [],
      checklist: getChecklist('apartment'),
      measurements: [],
      generalNotes: '',
      overallCondition: '',
    }
    setActiveInspection(inspection)
  }, [])

  // ── Save inspection ─────────────────────────────────────────────
  const saveInspection = useCallback(() => {
    if (!activeInspection) return
    setInspections(prev => {
      const arr = prev || []
      const idx = arr.findIndex(i => i.id === activeInspection.id)
      if (idx >= 0) {
        const copy = [...arr]
        copy[idx] = activeInspection
        return copy
      }
      return [...arr, activeInspection]
    })
  }, [activeInspection, setInspections])

  // ── Photo capture ───────────────────────────────────────────────
  const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !activeInspection) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const photo: InspectionPhoto = {
          id: uid('photo'),
          dataUrl: reader.result as string,
          room: 'סלון',
          notes: '',
          issues: [],
          timestamp: new Date().toISOString(),
        }
        // Try GPS
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
            photo.gps = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          }, () => {/* no-op */})
        }
        setActiveInspection(prev => prev ? { ...prev, photos: [...prev.photos, photo] } : prev)
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }, [activeInspection])

  // ── Update checklist item ───────────────────────────────────────
  const toggleCheckItem = useCallback((itemId: string) => {
    setActiveInspection(prev => {
      if (!prev) return prev
      return {
        ...prev,
        checklist: prev.checklist.map(c =>
          c.id === itemId ? { ...c, checked: !c.checked, severity: !c.checked ? 'ok' : undefined } : c
        ),
      }
    })
  }, [])

  const setSeverity = useCallback((itemId: string, severity: ChecklistItem['severity']) => {
    setActiveInspection(prev => {
      if (!prev) return prev
      return {
        ...prev,
        checklist: prev.checklist.map(c =>
          c.id === itemId ? { ...c, severity } : c
        ),
      }
    })
  }, [])

  // ── Add measurement ─────────────────────────────────────────────
  const addMeasurement = useCallback(() => {
    setActiveInspection(prev => {
      if (!prev) return prev
      const m: Measurement = { id: uid('msr'), room: 'סלון', width: 0, length: 0, height: 2.7, area: 0 }
      return { ...prev, measurements: [...prev.measurements, m] }
    })
  }, [])

  const updateMeasurement = useCallback((id: string, field: keyof Measurement, value: number | string) => {
    setActiveInspection(prev => {
      if (!prev) return prev
      return {
        ...prev,
        measurements: prev.measurements.map(m => {
          if (m.id !== id) return m
          const updated = { ...m, [field]: value }
          if (field === 'width' || field === 'length') {
            updated.area = Math.round(updated.width * updated.length * 100) / 100
          }
          return updated
        }),
      }
    })
  }, [])

  // ── Toggle category ─────────────────────────────────────────────
  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) { next.delete(cat) } else { next.add(cat) }
      return next
    })
  }, [])

  // ── Grouped checklist ───────────────────────────────────────────
  const groupedChecklist = useMemo(() => {
    if (!activeInspection) return []
    const map = new Map<string, ChecklistItem[]>()
    for (const item of activeInspection.checklist) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return Array.from(map.entries())
  }, [activeInspection])

  // ── Stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!activeInspection) return { total: 0, checked: 0, issues: 0, photos: 0 }
    const total = activeInspection.checklist.length
    const checked = activeInspection.checklist.filter(c => c.checked).length
    const issues = activeInspection.checklist.filter(c => c.severity === 'major' || c.severity === 'critical').length
    return { total, checked, issues, photos: activeInspection.photos.length }
  }, [activeInspection])

  const totalArea = useMemo(() => {
    if (!activeInspection) return 0
    return activeInspection.measurements.reduce((sum, m) => sum + m.area, 0)
  }, [activeInspection])

  // ── List view (no active inspection) ────────────────────────────
  if (!activeInspection) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="ביקור חכם בנכס"
          description="צילום, צ'ק ליסט, מדידות ותיעוד מלא — הכל במקום אחד"
          icon={<Camera size={28} weight="duotone" />}
        />

        <div className="flex justify-end">
          <Button onClick={createInspection} className="gap-2">
            <Plus size={16} weight="bold" />
            ביקור חדש
          </Button>
        </div>

        {safe.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Camera size={48} className="mx-auto mb-4 text-muted-foreground/40" weight="duotone" />
              <p className="text-muted-foreground">אין ביקורים עדיין. לחץ על "ביקור חדש" להתחיל.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {safe.map(insp => (
              <Card
                key={insp.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveInspection(insp)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setActiveInspection(insp)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={insp.status === 'completed' ? 'default' : 'secondary'}>
                      {insp.status === 'completed' ? 'הושלם' : insp.status === 'in-progress' ? 'בתהליך' : 'טיוטה'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{insp.date}</span>
                  </div>
                  <CardTitle className="text-base mt-2">{insp.propertyAddress || 'ללא כתובת'}</CardTitle>
                  <CardDescription>{insp.inspectorName || 'ללא שמאי'}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Image size={14} /> {insp.photos.length}</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle size={14} /> {insp.checklist.filter(c => c.checked).length}/{insp.checklist.length}
                    </span>
                    <span className="flex items-center gap-1"><Ruler size={14} /> {insp.measurements.length}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Active inspection form ──────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="ביקור חכם בנכס"
        description={activeInspection.propertyAddress || 'ביקור חדש'}
        icon={<Camera size={28} weight="duotone" />}
      />

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" onClick={() => { saveInspection(); setActiveInspection(null) }} className="gap-1.5">
          חזור לרשימה
        </Button>
        <Button onClick={saveInspection} className="gap-1.5">
          <CheckCircle size={16} /> שמור ביקור
        </Button>
        <Button
          variant="outline"
          onClick={() => setActiveInspection(prev => prev ? { ...prev, status: 'completed' } : prev)}
          className="gap-1.5"
        >
          סמן כהושלם
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'צילומים', value: stats.photos, icon: Camera, color: 'text-blue-600' },
          { label: 'צ\'ק ליסט', value: `${stats.checked}/${stats.total}`, icon: ListChecks, color: 'text-emerald-600' },
          { label: 'ליקויים', value: stats.issues, icon: Warning, color: 'text-red-600' },
          { label: 'שטח מדוד', value: `${totalArea.toFixed(1)} מ"ר`, icon: Ruler, color: 'text-purple-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon size={24} weight="duotone" className={s.color} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Note size={18} /> פרטי ביקור
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">כתובת הנכס</label>
            <div className="relative">
              <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9"
                placeholder="רחוב, עיר"
                value={activeInspection.propertyAddress}
                onChange={e => setActiveInspection(prev => prev ? { ...prev, propertyAddress: e.target.value } : prev)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">שם השמאי</label>
            <Input
              placeholder="שם מלא"
              value={activeInspection.inspectorName}
              onChange={e => setActiveInspection(prev => prev ? { ...prev, inspectorName: e.target.value } : prev)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">סוג נכס</label>
            <Select
              value={activeInspection.propertyType}
              onValueChange={v => {
                const type = v as PropertyType
                setActiveInspection(prev => prev ? { ...prev, propertyType: type, checklist: getChecklist(type) } : prev)
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">דירה</SelectItem>
                <SelectItem value="house">בית פרטי</SelectItem>
                <SelectItem value="penthouse">פנטהאוז</SelectItem>
                <SelectItem value="garden-apartment">גן</SelectItem>
                <SelectItem value="duplex">דופלקס</SelectItem>
                <SelectItem value="commercial">מסחרי</SelectItem>
                <SelectItem value="land">קרקע</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">מצב כללי</label>
            <Select
              value={activeInspection.overallCondition}
              onValueChange={v => setActiveInspection(prev => prev ? { ...prev, overallCondition: v } : prev)}
            >
              <SelectTrigger><SelectValue placeholder="בחר מצב" /></SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className={o.color}>{o.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Photo capture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera size={18} /> צילומים ({activeInspection.photos.length})
          </CardTitle>
          <CardDescription>צלם את הנכס — כל תמונה מתועדת עם חדר, GPS, וליקויים</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            title="העלאת תמונות לביקור"
            aria-label="העלאת תמונות לביקור"
            className="hidden"
            onChange={handlePhotoCapture}
          />
          <Button variant="outline" className="gap-2 mb-4" onClick={() => fileInputRef.current?.click()}>
            <UploadSimple size={16} />
            הוסף צילום
          </Button>

          {activeInspection.photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeInspection.photos.map(photo => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden border">
                  <img src={photo.dataUrl} alt={photo.room} className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                    <Select
                      value={photo.room}
                      onValueChange={v => {
                        setActiveInspection(prev => prev ? {
                          ...prev,
                          photos: prev.photos.map(p => p.id === photo.id ? { ...p, room: v } : p),
                        } : prev)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs bg-white/90 text-black">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setActiveInspection(prev => prev ? {
                        ...prev,
                        photos: prev.photos.filter(p => p.id !== photo.id),
                      } : prev)}
                    >
                      <Trash size={12} /> הסר
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 flex items-center gap-1">
                    <Tag size={10} /> {photo.room}
                    {photo.issues.length > 0 && (
                      <Badge variant="destructive" className="h-4 text-[9px] mr-auto">{photo.issues.length} ליקויים</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Issue tagging for last photo */}
          {activeInspection.photos.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">תיוג ליקויים (צילום אחרון):</p>
              <div className="flex flex-wrap gap-1.5">
                {ISSUE_TAGS.map(tag => {
                  const lastPhoto = activeInspection.photos[activeInspection.photos.length - 1]
                  const isSelected = lastPhoto.issues.includes(tag)
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? 'destructive' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setActiveInspection(prev => {
                          if (!prev) return prev
                          const photos = [...prev.photos]
                          const last = { ...photos[photos.length - 1] }
                          last.issues = isSelected
                            ? last.issues.filter(i => i !== tag)
                            : [...last.issues, tag]
                          photos[photos.length - 1] = last
                          return { ...prev, photos }
                        })
                      }}
                    >
                      {tag}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks size={18} /> צ'ק ליסט — {activeInspection.propertyType === 'apartment' ? 'דירה' : activeInspection.propertyType === 'house' ? 'בית' : activeInspection.propertyType === 'commercial' ? 'מסחרי' : 'קרקע'}
          </CardTitle>
          <CardDescription>
            {stats.checked}/{stats.total} סעיפים נבדקו
            {stats.issues > 0 && <span className="text-red-500 mr-2">• {stats.issues} ליקויים</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {groupedChecklist.map(([category, items]) => {
                const isExpanded = expandedCategories.has(category)
                const catChecked = items.filter(i => i.checked).length
                return (
                  <div key={category} className="border rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      <span className="font-medium text-sm">{category}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{catChecked}/{items.length}</Badge>
                        {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t divide-y">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-3 text-sm">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggleCheckItem(item.id)}
                              title={`סימון סעיף: ${item.label}`}
                              aria-label={`סימון סעיף: ${item.label}`}
                              className="h-4 w-4 rounded accent-primary"
                            />
                            <span className={cn('flex-1', item.checked && 'line-through text-muted-foreground')}>
                              {item.label}
                            </span>
                            {item.checked && (
                              <Select
                                value={item.severity || 'ok'}
                                onValueChange={v => setSeverity(item.id, v as ChecklistItem['severity'])}
                              >
                                <SelectTrigger className="h-7 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ok">תקין</SelectItem>
                                  <SelectItem value="minor">קל</SelectItem>
                                  <SelectItem value="major">בינוני</SelectItem>
                                  <SelectItem value="critical">חמור</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Measurements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler size={18} /> מדידות ({activeInspection.measurements.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addMeasurement} className="gap-1.5">
              <Plus size={14} /> חדר
            </Button>
          </div>
          {totalArea > 0 && (
            <CardDescription>שטח כולל מדוד: <strong>{totalArea.toFixed(1)} מ"ר</strong></CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {activeInspection.measurements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">הוסף חדרים למדידה</p>
          ) : (
            <div className="space-y-3">
              {activeInspection.measurements.map(m => (
                <div key={m.id} className="flex items-end gap-2 flex-wrap border rounded-xl p-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">חדר</label>
                    <Select value={m.room} onValueChange={v => updateMeasurement(m.id, 'room', v)}>
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROOM_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">אורך (מ')</label>
                    <Input type="number" className="h-8 w-20 text-xs" value={m.length || ''} onChange={e => updateMeasurement(m.id, 'length', +e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">רוחב (מ')</label>
                    <Input type="number" className="h-8 w-20 text-xs" value={m.width || ''} onChange={e => updateMeasurement(m.id, 'width', +e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">גובה (מ')</label>
                    <Input type="number" className="h-8 w-20 text-xs" value={m.height || ''} onChange={e => updateMeasurement(m.id, 'height', +e.target.value)} />
                  </div>
                  <div className="bg-secondary/50 rounded-lg px-3 py-1.5 text-sm font-semibold">
                    {m.area.toFixed(1)} מ"ר
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setActiveInspection(prev => prev ? { ...prev, measurements: prev.measurements.filter(x => x.id !== m.id) } : prev)}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* General notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Note size={18} /> הערות כלליות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="הערות, תצפיות, המלצות..."
            rows={4}
            value={activeInspection.generalNotes}
            onChange={e => setActiveInspection(prev => prev ? { ...prev, generalNotes: e.target.value } : prev)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
