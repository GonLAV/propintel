/**
 * VisitManager — Appointment scheduling + visit documentation.
 * ──────────────────────────────────────────────────────────────
 * • Calendar view of upcoming inspections
 * • Per-visit checklists & reminders
 * • Status tracking (scheduled → visited → documented → sent)
 */

import { useState, useCallback, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import {
  CalendarBlank, Clock, User, Plus, CheckCircle,
  CaretLeft, CaretRight, Eye,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { uid } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────
type VisitStatus = 'scheduled' | 'visited' | 'documented' | 'sent'

interface Visit {
  id: string
  propertyAddress: string
  clientName: string
  clientPhone: string
  date: string
  time: string
  propertyType: string
  status: VisitStatus
  notes: string
  reminders: string[]
  createdAt: string
}

const STATUS_MAP: Record<VisitStatus, { label: string; color: string }> = {
  scheduled: { label: 'מתוכנן', color: 'bg-blue-100 text-blue-700' },
  visited: { label: 'בוצע ביקור', color: 'bg-amber-100 text-amber-700' },
  documented: { label: 'תועד', color: 'bg-purple-100 text-purple-700' },
  sent: { label: 'נשלח', color: 'bg-emerald-100 text-emerald-700' },
}

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export function VisitManager() {
  const [visits, setVisits] = useKV<Visit[]>('visits', [])
  const [showForm, setShowForm] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safe = visits || []

  // ── Calendar data ───────────────────────────────────────────────
   
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: number; visits: Visit[] }[] = []

    // Empty slots for days before first
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: 0, visits: [] })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayVisits = safe.filter(v => v.date === dateStr)
      days.push({ date: d, visits: dayVisits })
    }
    return days
  }, [currentMonth, safe])

  const todayStr = new Date().toISOString().slice(0, 10)

  // ── Upcoming visits ─────────────────────────────────────────────
   
  const upcoming = useMemo(() =>
    safe.filter(v => v.date >= todayStr && v.status !== 'sent')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [safe, todayStr],
  )

  // ── CRUD ────────────────────────────────────────────────────────
  const saveVisit = useCallback((visit: Visit) => {
    setVisits(prev => {
      const arr = prev || []
      const idx = arr.findIndex(v => v.id === visit.id)
      if (idx >= 0) {
        const copy = [...arr]
        copy[idx] = visit
        return copy
      }
      return [...arr, visit]
    })
    setEditingVisit(null)
    setShowForm(false)
  }, [setVisits])

  const _deleteVisit = useCallback((id: string) => {
    setVisits(prev => (prev || []).filter(v => v.id !== id))
  }, [setVisits])

  const newVisit = useCallback(() => {
    setEditingVisit({
      id: uid('visit'),
      propertyAddress: '',
      clientName: '',
      clientPhone: '',
      date: todayStr,
      time: '10:00',
      propertyType: 'apartment',
      status: 'scheduled',
      notes: '',
      reminders: [],
      createdAt: new Date().toISOString(),
    })
    setShowForm(true)
  }, [todayStr])

  // ── Stats ───────────────────────────────────────────────────────
   
  const stats = useMemo(() => ({
    total: safe.length,
    scheduled: safe.filter(v => v.status === 'scheduled').length,
    visited: safe.filter(v => v.status === 'visited').length,
    documented: safe.filter(v => v.status === 'documented').length,
  }), [safe])

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניהול ביקורים"
        description="תיאום פגישות שטח, מעקב ותיעוד אוטומטי"
        icon={<CalendarBlank size={28} weight="duotone" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'סה"כ', value: stats.total, icon: CalendarBlank, color: 'text-blue-600' },
          { label: 'מתוכננים', value: stats.scheduled, icon: Clock, color: 'text-amber-600' },
          { label: 'בוצעו', value: stats.visited, icon: Eye, color: 'text-purple-600' },
          { label: 'תועדו', value: stats.documented, icon: CheckCircle, color: 'text-emerald-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon size={22} weight="duotone" className={s.color} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                >
                  <CaretRight size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  היום
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                >
                  <CaretLeft size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const isToday = day.date > 0 &&
                  `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}` === todayStr
                return (
                  <div
                    key={i}
                    className={cn(
                      'min-h-16 p-1 border rounded-lg text-xs',
                      day.date === 0 && 'border-transparent',
                      isToday && 'bg-primary/5 border-primary/30',
                    )}
                  >
                    {day.date > 0 && (
                      <>
                        <span className={cn('font-medium', isToday && 'text-primary')}>{day.date}</span>
                        {day.visits.map(v => (
                          <div
                            key={v.id}
                            className="mt-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                            title={`${v.time} — ${v.propertyAddress}`}
                            onClick={() => { setEditingVisit(v); setShowForm(true) }}
                          >
                            {v.time}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming + form */}
        <div className="space-y-4">
          <Button onClick={newVisit} className="w-full gap-2">
            <Plus size={16} weight="bold" /> ביקור חדש
          </Button>

          {showForm && editingVisit && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{editingVisit.createdAt === editingVisit.id ? 'ביקור חדש' : 'עריכת ביקור'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="כתובת הנכס"
                  value={editingVisit.propertyAddress}
                  onChange={e => setEditingVisit(prev => prev ? { ...prev, propertyAddress: e.target.value } : prev)}
                />
                <Input
                  placeholder="שם לקוח"
                  value={editingVisit.clientName}
                  onChange={e => setEditingVisit(prev => prev ? { ...prev, clientName: e.target.value } : prev)}
                />
                <Input
                  placeholder="טלפון"
                  type="tel"
                  value={editingVisit.clientPhone}
                  onChange={e => setEditingVisit(prev => prev ? { ...prev, clientPhone: e.target.value } : prev)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={editingVisit.date}
                    onChange={e => setEditingVisit(prev => prev ? { ...prev, date: e.target.value } : prev)}
                  />
                  <Input
                    type="time"
                    value={editingVisit.time}
                    onChange={e => setEditingVisit(prev => prev ? { ...prev, time: e.target.value } : prev)}
                  />
                </div>
                <Select
                  value={editingVisit.status}
                  onValueChange={v => setEditingVisit(prev => prev ? { ...prev, status: v as VisitStatus } : prev)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="הערות..."
                  rows={2}
                  value={editingVisit.notes}
                  onChange={e => setEditingVisit(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveVisit(editingVisit)} className="flex-1 gap-1">
                    <CheckCircle size={14} /> שמור
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingVisit(null) }}>
                    ביטול
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ביקורים קרובים</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">אין ביקורים מתוכננים</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(0, 8).map(v => (
                    <div
                      key={v.id}
                      className="flex items-start gap-3 p-2.5 rounded-xl border hover:bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => { setEditingVisit(v); setShowForm(true) }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && (setEditingVisit(v), setShowForm(true))}
                    >
                      <div className="text-center shrink-0">
                        <p className="text-lg font-bold leading-none">{v.date.slice(-2)}</p>
                        <p className="text-[10px] text-muted-foreground">{v.time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{v.propertyAddress || 'ללא כתובת'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User size={10} /> {v.clientName || 'ללא לקוח'}
                        </p>
                      </div>
                      <Badge className={cn('text-[10px] shrink-0', STATUS_MAP[v.status].color)}>
                        {STATUS_MAP[v.status].label}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
