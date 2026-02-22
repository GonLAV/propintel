import { useMemo } from 'react'
import type { Property, Client } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/labels'
import { formatILSCompact } from '@/lib/format'
import { bus } from '@/core/eventBus'
import type { ViewId } from '@/lib/viewRegistry'
import { Progress } from '@/components/ui/progress'
import {
  House, Clock, CheckCircle, TrendUp, Plus, FolderOpen,
  Calculator, Camera, Sparkle, MapTrifold, Microphone,
  Lightning, ArrowRight, ChartBar, Users, FileText,
  CalendarBlank,
} from '@phosphor-icons/react'

// ── Time-contextual helpers ─────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'בוקר טוב'
  if (h >= 12 && h < 17) return 'צהריים טובים'
  if (h >= 17 && h < 21) return 'ערב טוב'
  return 'לילה טוב'
}

function getDateString(): string {
  return new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function getRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דקות`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `לפני ${hrs} שעות`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `לפני ${days} ימים`
  return date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })
}

interface DashboardProps {
  properties: Property[]
  clients: Client[]
  onSelectProperty: (property: Property) => void
  onCreateNew: () => void
}

export function Dashboard({ properties, clients, onSelectProperty, onCreateNew }: DashboardProps) {
  const stats = useMemo(() => ({
    total: properties.length,
    inProgress: properties.filter(p => p.status === 'in-progress').length,
    completed: properties.filter(p => p.status === 'completed').length,
    sent: properties.filter(p => p.status === 'sent').length,
    totalValue: properties.reduce((sum, p) => sum + (p.valuationData?.estimatedValue || 0), 0),
    avgValue: properties.length > 0
      ? properties.reduce((sum, p) => sum + (p.valuationData?.estimatedValue || 0), 0) / properties.filter(p => p.valuationData?.estimatedValue).length || 0
      : 0,
  }), [properties])

  const recentProperties = useMemo(() =>
    [...properties]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6),
    [properties],
  )

  // Completion rate
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const goTo = (view: ViewId) => bus.emit('nav:navigate', view)

  return (
    <div className="space-y-7">
      {/* ── Greeting ──────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap animate-fade-in">
            <div>
              <p className="mb-2.5 inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary border border-primary/15">
                סביבת עבודה מקצועית
              </p>
              <h1 className="text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.25rem]">
                {getGreeting()} 👋
              </h1>
              <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <CalendarBlank size={14} weight="duotone" />
                {getDateString()}
                <span className="text-border">·</span>
                {stats.total} נכסים פעילים
              </p>
            </div>
            <Button onClick={onCreateNew} size="lg" className="gap-2 shadow-md hover:shadow-lg transition-shadow">
              <Plus size={18} weight="bold" />
              שומה חדשה
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Onboarding (when no properties) ───────────────────── */}
      {stats.total === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="py-14 px-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/8 text-primary">
              <Sparkle size={40} weight="duotone" />
            </div>
            <h2 className="text-[1.5rem] font-semibold text-foreground mb-2">ברוכים הבאים לפלטפורמת השמאות</h2>
            <p className="text-[15px] text-muted-foreground max-w-md mx-auto mb-8">
              הכלי המקצועי לשמאי מקרקעין — חשב שווי, שלוף עסקאות ממשלתיות, וצור דוחות מקצועיים.
            </p>
            <div className="grid gap-4 sm:grid-cols-3 max-w-xl mx-auto text-right">
              <button onClick={() => goTo('residential-calculator')} className="group p-5 rounded-xl bg-muted/30 hover:bg-primary/5 border border-border/60 hover:border-primary/30 transition-all text-right">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <Calculator size={20} weight="duotone" />
                </div>
                <div className="text-[14px] font-semibold text-foreground mb-1">חשב שווי דירה</div>
                <div className="text-[12px] text-muted-foreground leading-relaxed">הזן מאפייני נכס וקבל הערכת שווי מקצועית</div>
              </button>
              <button onClick={() => goTo('data-gov-valuation')} className="group p-5 rounded-xl bg-muted/30 hover:bg-primary/5 border border-border/60 hover:border-primary/30 transition-all text-right">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-3">
                  <Lightning size={20} weight="duotone" />
                </div>
                <div className="text-[14px] font-semibold text-foreground mb-1">שמאות ממשלתית</div>
                <div className="text-[12px] text-muted-foreground leading-relaxed">שלוף עסקאות אמיתיות מהמאגר הממשלתי</div>
              </button>
              <button onClick={onCreateNew} className="group p-5 rounded-xl bg-muted/30 hover:bg-primary/5 border border-border/60 hover:border-primary/30 transition-all text-right">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 mb-3">
                  <Plus size={20} weight="bold" />
                </div>
                <div className="text-[14px] font-semibold text-foreground mb-1">צור שומה חדשה</div>
                <div className="text-[12px] text-muted-foreground leading-relaxed">הוסף נכס חדש והתחל תהליך שמאות</div>
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<House size={24} weight="duotone" />}
          title="סך נכסים"
          value={stats.total}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={<Clock size={24} weight="duotone" />}
          title="בעבודה"
          value={stats.inProgress}
          color="bg-amber-500/10 text-amber-700"
        />
        <StatCard
          icon={<CheckCircle size={24} weight="duotone" />}
          title="הושלמו"
          value={stats.completed}
          subtitle={`${completionRate}% השלמה`}
          color="bg-emerald-500/10 text-emerald-700"
        />
        <StatCard
          icon={<FileText size={24} weight="duotone" />}
          title="נשלחו"
          value={stats.sent}
          color="bg-cyan-500/10 text-cyan-700"
        />
        <StatCard
          icon={<TrendUp size={24} weight="duotone" />}
          title="סך שווי"
          value={formatILSCompact(stats.totalValue)}
          subtitle={stats.avgValue > 0 ? `ממוצע: ${formatILSCompact(stats.avgValue)}` : undefined}
          color="bg-violet-500/10 text-violet-700"
        />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">פעולות מהירות</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <QuickAction icon={<Calculator size={20} weight="duotone" />} label="שמאות ממשלתית" onClick={() => goTo('data-gov-valuation')} />
            <QuickAction icon={<Sparkle size={20} weight="duotone" />} label="עוזר שמאות AI" onClick={() => goTo('valuation-assistant')} />
            <QuickAction icon={<Lightning size={20} weight="duotone" />} label="שומה מהירה" onClick={() => goTo('quicker')} />
            <QuickAction icon={<Camera size={20} weight="duotone" />} label="ביקור חכם" onClick={() => goTo('smart-inspection')} />
            <QuickAction icon={<MapTrifold size={20} weight="duotone" />} label="מפת עסקאות" onClick={() => goTo('transactions-map')} />
            <QuickAction icon={<Microphone size={20} weight="duotone" />} label="דוח קולי" onClick={() => goTo('voice-report')} />
          </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Recent Properties ───────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card className="">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => goTo('properties')}>
                  הצג הכל <ArrowRight size={14} />
                </Button>
                <CardTitle className="text-right text-base font-semibold text-foreground">נכסים אחרונים</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {recentProperties.length === 0 ? (
                <EmptyState
                  icon={<FolderOpen size={28} weight="duotone" />}
                  title="אין נכסים עדיין"
                  description="צור שומה חדשה כדי להתחיל"
                  action={
                    <Button onClick={onCreateNew} variant="outline" className="gap-2">
                      <Plus size={16} weight="bold" />
                      שומה חדשה
                    </Button>
                  }
                  className="py-10"
                />
              ) : (
                <div className="space-y-2">
                  {recentProperties.map((property) => {
                    const client = clients.find(c => c.id === property.clientId)
                    return (
                      <PropertyRow
                        key={property.id}
                        property={property}
                        client={client}
                        onClick={() => onSelectProperty(property)}
                      />
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar: clients + status breakdown ─────────────── */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <Card className="">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ChartBar size={18} weight="duotone" />
                סטטוס שומות
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.total === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">אין נתונים</p>
              ) : (
                <div className="space-y-2">
                  <StatusBar label="בעבודה" count={stats.inProgress} total={stats.total} color="bg-amber-500" />
                  <StatusBar label="הושלמו" count={stats.completed} total={stats.total} color="bg-green-500" />
                  <StatusBar label="נשלחו" count={stats.sent} total={stats.total} color="bg-cyan-500" />
                  <StatusBar label="אחר" count={stats.total - stats.inProgress - stats.completed - stats.sent} total={stats.total} color="bg-gray-400" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active clients */}
          <Card className="">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => goTo('clients')}>
                  הצג הכל <ArrowRight size={14} />
                </Button>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users size={18} weight="duotone" />
                  לקוחות פעילים
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <EmptyState
                  title="אין לקוחות"
                  description="לקוחות יופיעו כאן לאחר הוספה"
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {clients.slice(0, 6).map((client) => (
                    <div 
                      key={client.id} 
                      className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/40 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          {client.properties.length}
                        </div>
                        <div className="text-[11px] text-muted-foreground">נכסים</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">{client.name}</div>
                        {client.company && (
                          <div className="text-xs text-muted-foreground">{client.company}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon, title, value, subtitle, color }: {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle?: string
  color: string
}) {
  return (
    <Card className="animate-slide-up">
      <CardContent className="p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <div className={`${color} rounded-lg p-2.5`}>
            {icon}
          </div>
        </div>
        <p className="font-mono text-[1.75rem] font-semibold tracking-tight text-foreground tabular-nums leading-none">{value}</p>
        {subtitle && <p className="mt-2 text-[12px] text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

function PropertyRow({ property, client, onClick }: {
  property: Property
  client?: Client
  onClick: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="group flex items-center justify-between rounded-xl bg-muted/30 p-3.5 hover:bg-muted/60 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-center gap-3">
        <Badge className={`${STATUS_COLORS[property.status]} border px-2.5 py-0.5 text-xs font-medium`}>
          {STATUS_LABELS[property.status]}
        </Badge>
        {property.valuationData && (
          <div className="text-sm font-mono font-semibold text-primary tabular-nums">
            {formatILSCompact(property.valuationData.estimatedValue)}
          </div>
        )}
        <div className="hidden text-xs text-muted-foreground/75 sm:block">{getRelativeTime(new Date(property.updatedAt))}</div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{property.address.street}</div>
        <div className="text-sm text-muted-foreground">
          {property.address.city} • <span className="text-foreground/80">{client?.name || 'ללא לקוח'}</span>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2.5 rounded-xl bg-card border border-border/60 p-4 text-center transition-all duration-200 hover:shadow-[0_4px_20px_oklch(0_0_0/0.10)] hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-[0_1px_3px_oklch(0_0_0/0.05)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/14">
        {icon}
      </div>
      <span className="text-[12px] font-medium text-foreground">{label}</span>
    </button>
  )
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono">{count} ({pct}%)</span>
        <span className="font-medium text-foreground/90">{label}</span>
      </div>
      <Progress value={pct} className="h-2 bg-muted/70" indicatorClassName={color} />
    </div>
  )
}
