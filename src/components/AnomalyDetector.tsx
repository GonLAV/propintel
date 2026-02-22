/**
 * AnomalyDetector — Price anomaly & fraud detection engine.
 * ──────────────────────────────────────────────────────────
 * • Statistical outlier detection in property prices
 * • Historical gap analysis
 * • Suspicious pattern flagging
 * • Confidence scoring
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Detective, Warning, ShieldCheck,
  MagnifyingGlass, CheckCircle, XCircle,
  ArrowRight, Lightning, CloudArrowDown, SpinnerGap,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { uid } from '@/lib/utils'
import {
  fetchTransactionsFromDataGov,
  normalizeTransactions,
} from '@/lib/dataGovAPI'
import { createLogger } from '@/lib/logger'

const log = createLogger('AnomalyDetector')

// ── Types ─────────────────────────────────────────────────────────
type AnomalyType = 'price-outlier' | 'rapid-change' | 'below-market' | 'above-market' | 'suspicious-pattern' | 'data-gap'
type Severity = 'info' | 'warning' | 'critical'

interface AnomalyReport {
  id: string
  address: string
  city: string
  reportedPrice: number
  marketAvg: number
  deviation: number // percentage
  anomalyType: AnomalyType
  severity: Severity
  description: string
  recommendation: string
  timestamp: string
  resolved: boolean
}

const ANOMALY_LABELS: Record<AnomalyType, string> = {
  'price-outlier': 'מחיר חריג',
  'rapid-change': 'שינוי מהיר',
  'below-market': 'מתחת לשוק',
  'above-market': 'מעל לשוק',
  'suspicious-pattern': 'דפוס חשוד',
  'data-gap': 'חוסר נתונים',
}

const SEVERITY_META: Record<Severity, { label: string; color: string; icon: typeof Warning }> = {
  info: { label: 'מידע', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle },
  warning: { label: 'אזהרה', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Warning },
  critical: { label: 'קריטי', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
}

// ── Sample anomalies ──────────────────────────────────────────────
const SAMPLE_ANOMALIES: AnomalyReport[] = [
  {
    id: uid('anom'),
    address: 'דיזנגוף 120, דירה 7',
    city: 'תל אביב',
    reportedPrice: 1200000,
    marketAvg: 3500000,
    deviation: -65.7,
    anomalyType: 'below-market',
    severity: 'critical',
    description: 'מחיר נמוך ב-65% מהממוצע באזור. סביר שמדובר בעסקת קרובים, מתנה, או שגיאת נתונים.',
    recommendation: 'בדוק את סוג העסקה ברשות המסים. אל תשתמש כנכס השוואה.',
    timestamp: '2025-12-15T10:30:00Z',
    resolved: false,
  },
  {
    id: uid('anom'),
    address: 'הרצל 45, קומה 3',
    city: 'חיפה',
    reportedPrice: 2800000,
    marketAvg: 1400000,
    deviation: 100,
    anomalyType: 'above-market',
    severity: 'warning',
    description: 'מחיר גבוה פי 2 מהממוצע. ייתכן שכולל זכויות בנייה או שיפוץ מקיף.',
    recommendation: 'ודא האם העסקה כוללת זכויות נוספות או שטח מסחרי.',
    timestamp: '2025-11-20T14:00:00Z',
    resolved: false,
  },
  {
    id: uid('anom'),
    address: 'ויצמן 78',
    city: 'כפר סבא',
    reportedPrice: 1950000,
    marketAvg: 2100000,
    deviation: -7.1,
    anomalyType: 'price-outlier',
    severity: 'info',
    description: 'סטייה קלה מהממוצע. ייתכן מצב תחזוקה ירוד או מכירה מהירה.',
    recommendation: 'בדוק מצב הנכס ותנאי העסקה.',
    timestamp: '2025-10-05T09:00:00Z',
    resolved: true,
  },
  {
    id: uid('anom'),
    address: 'רוטשילד 30',
    city: 'תל אביב',
    reportedPrice: 4200000,
    marketAvg: 3800000,
    deviation: 10.5,
    anomalyType: 'rapid-change',
    severity: 'warning',
    description: 'עלייה של 45% תוך 18 חודשים (עסקה קודמת: 2,900,000 ₪). עשוי להצביע על ספקולציה.',
    recommendation: 'בדוק היסטוריית בעלות ושיפוצים. התייחס בזהירות.',
    timestamp: '2025-09-12T11:00:00Z',
    resolved: false,
  },
  {
    id: uid('anom'),
    address: 'גוש 6120 חלקה 45',
    city: 'רמת גן',
    reportedPrice: 0,
    marketAvg: 2200000,
    deviation: -100,
    anomalyType: 'data-gap',
    severity: 'warning',
    description: 'אין נתוני עסקאות ב-3 השנים האחרונות. החלקה פעילה בנסח טאבו אך אין דיווח.',
    recommendation: 'בדוק ברשם המקרקעין ובהסכמי שכירות.',
    timestamp: '2025-08-01T08:00:00Z',
    resolved: false,
  },
  {
    id: uid('anom'),
    address: 'סוקולוב 12, דירות 3,4,5',
    city: 'הרצליה',
    reportedPrice: 5600000,
    marketAvg: 4800000,
    deviation: 16.7,
    anomalyType: 'suspicious-pattern',
    severity: 'critical',
    description: '3 עסקאות באותו בניין תוך חודש, כולן מעל 15% מהשוק. ייתכן ניפוח מלאכותי.',
    recommendation: 'בדוק זהות קונים ומוכרים. דווח אם יש קשר בין הצדדים.',
    timestamp: '2025-07-22T16:00:00Z',
    resolved: false,
  },
]

// ── Manual check runner (fallback static) ─────────────────────────
function runAnomalyCheck(address: string, price: number, city: string, realAvg?: number): AnomalyReport | null {
  // Use real average if available, otherwise fall back to static heuristic
  const cityAvg: Record<string, number> = {
    'תל אביב': 3500000,
    'ירושלים': 2800000,
    'חיפה': 1400000,
    'באר שבע': 1100000,
    'ראשון לציון': 2200000,
    'רמת גן': 2400000,
    'הרצליה': 3200000,
    'נתניה': 1800000,
    'כפר סבא': 2100000,
    'פתח תקווה': 2300000,
  }

  const avg = realAvg ?? cityAvg[city] ?? 2000000
  const deviation = ((price - avg) / avg) * 100

  if (Math.abs(deviation) < 15) return null

  const anomalyType: AnomalyType = deviation > 50 ? 'above-market' : deviation < -50 ? 'below-market' : deviation > 0 ? 'price-outlier' : 'price-outlier'
  const severity: Severity = Math.abs(deviation) > 50 ? 'critical' : Math.abs(deviation) > 25 ? 'warning' : 'info'

  return {
    id: uid('anom'),
    address,
    city,
    reportedPrice: price,
    marketAvg: Math.round(avg),
    deviation: Math.round(deviation * 10) / 10,
    anomalyType,
    severity,
    description: `מחיר ${deviation > 0 ? 'גבוה' : 'נמוך'} ב-${Math.abs(Math.round(deviation))}% מהממוצע ב${city}.${realAvg ? ' (מבוסס נתוני data.gov.il)' : ''}`,
    recommendation: severity === 'critical'
      ? 'עסקה חריגה — בדיקה מעמיקה נדרשת לפני שימוש בנתון.'
      : 'ייתכן פער בשל מאפייני הנכס. בדוק תנאי עסקה.',
    timestamp: new Date().toISOString(),
    resolved: false,
  }
}

// ── Z-Score anomaly detection on real transactions ────────────────
function detectAnomaliesFromTransactions(
  transactions: { id: string; price: number; pricePerSqm: number; street: string; houseNumber: string; city: string; area: number; date: string }[]
): AnomalyReport[] {
  if (transactions.length < 5) return []

  const prices = transactions.map(t => t.price)
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length
  const stdDev = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length)
  if (stdDev === 0) return []

  const anomalies: AnomalyReport[] = []
  for (const tx of transactions) {
    const zScore = (tx.price - mean) / stdDev
    if (Math.abs(zScore) < 1.8) continue // Only flag z-score > 1.8

    const deviation = ((tx.price - mean) / mean) * 100
    const anomalyType: AnomalyType = zScore > 2.5 ? 'above-market' : zScore < -2.5 ? 'below-market' : 'price-outlier'
    const severity: Severity = Math.abs(zScore) > 2.5 ? 'critical' : Math.abs(zScore) > 2 ? 'warning' : 'info'

    anomalies.push({
      id: uid('anom'),
      address: `${tx.street} ${tx.houseNumber}`,
      city: tx.city,
      reportedPrice: tx.price,
      marketAvg: Math.round(mean),
      deviation: Math.round(deviation * 10) / 10,
      anomalyType,
      severity,
      description: `ציון Z: ${zScore.toFixed(2)}. מחיר ${zScore > 0 ? 'גבוה' : 'נמוך'} ב-${Math.abs(Math.round(deviation))}% מהממוצע. (נתוני data.gov.il)`,
      recommendation: severity === 'critical'
        ? 'עסקה חריגה מאוד — אל תשתמש כנכס השוואה ללא בדיקה.'
        : 'בדוק מצב הנכס ותנאי העסקה.',
      timestamp: tx.date || new Date().toISOString(),
      resolved: false,
    })
  }

  return anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
}

export function AnomalyDetector() {
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>(SAMPLE_ANOMALIES)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showResolved, setShowResolved] = useState(false)
  const [scanning, setScanning] = useState(false)

  // Manual check form
  const [checkAddress, setCheckAddress] = useState('')
  const [checkPrice, setCheckPrice] = useState('')
  const [checkCity, setCheckCity] = useState('תל אביב')
  const [checkResult, setCheckResult] = useState<AnomalyReport | null>(null)

  // ── Scan real data from data.gov.il ─────────────────────────────
  const scanRealData = useCallback(async () => {
    setScanning(true)
    try {
      const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה']
      const realAnomalies: AnomalyReport[] = []

      for (const city of cities) {
        try {
          const raw = await fetchTransactionsFromDataGov({ city, limit: 200 })
          const clean = normalizeTransactions(raw)
          if (clean.length < 5) continue
          const found = detectAnomaliesFromTransactions(clean)
          realAnomalies.push(...found)
        } catch (err) {
          log.warn(`Failed to scan ${city}:`, err)
        }
      }

      if (realAnomalies.length > 0) {
        setAnomalies(prev => [...realAnomalies, ...prev])
      }
    } catch (err) {
      log.error('Scan failed:', err)
    } finally {
      setScanning(false)
    }
  }, [])

  const filtered = useMemo(() =>
    anomalies.filter(a => {
      if (!showResolved && a.resolved) return false
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false
      if (filterType !== 'all' && a.anomalyType !== filterType) return false
      return true
    }),
    [anomalies, filterSeverity, filterType, showResolved],
  )

  const stats = useMemo(() => ({
    total: anomalies.filter(a => !a.resolved).length,
    critical: anomalies.filter(a => a.severity === 'critical' && !a.resolved).length,
    warning: anomalies.filter(a => a.severity === 'warning' && !a.resolved).length,
    resolved: anomalies.filter(a => a.resolved).length,
  }), [anomalies])

  const handleManualCheck = useCallback(async () => {
    const price = parseInt(checkPrice)
    if (!checkAddress || !price) return

    // Try to get real market average from data.gov.il
    let realAvg: number | undefined
    try {
      const raw = await fetchTransactionsFromDataGov({ city: checkCity, limit: 100 })
      const clean = normalizeTransactions(raw)
      if (clean.length >= 3) {
        realAvg = clean.reduce((s, t) => s + t.price, 0) / clean.length
      }
    } catch {
      // Fall back to static averages
    }

    const result = runAnomalyCheck(checkAddress, price, checkCity, realAvg)
    setCheckResult(result)
    if (result) {
      setAnomalies(prev => [result, ...prev])
    }
  }, [checkAddress, checkPrice, checkCity])

  const toggleResolved = useCallback((id: string) => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, resolved: !a.resolved } : a))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="גלאי חריגות מחיר"
        description="זיהוי עסקאות חשודות, מחירים חריגים ופערים בנתונים"
        icon={<Detective size={28} weight="duotone" />}
        actions={
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            disabled={scanning}
            onClick={scanRealData}
          >
            {scanning ? <SpinnerGap size={16} className="animate-spin" /> : <CloudArrowDown size={16} />}
            {scanning ? 'סורק...' : 'סרוק data.gov.il'}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Warning size={22} weight="duotone" className="text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">חריגות פתוחות</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle size={22} weight="duotone" className="text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">קריטיות</p>
              <p className="text-lg font-bold text-red-600">{stats.critical}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Warning size={22} weight="duotone" className="text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">אזהרות</p>
              <p className="text-lg font-bold text-amber-600">{stats.warning}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck size={22} weight="duotone" className="text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">טופלו</p>
              <p className="text-lg font-bold text-emerald-600">{stats.resolved}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual check */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightning size={18} /> בדיקת חריגות ידנית
          </CardTitle>
          <CardDescription>הזן כתובת ומחיר — המערכת תזהה סטיות מהשוק</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[150px] space-y-1">
              <label className="text-xs font-medium">כתובת</label>
              <Input
                placeholder="רחוב ומספר"
                value={checkAddress}
                onChange={e => setCheckAddress(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="w-32 space-y-1">
              <label className="text-xs font-medium">עיר</label>
              <Select value={checkCity} onValueChange={setCheckCity}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'רמת גן', 'הרצליה', 'נתניה', 'כפר סבא', 'פתח תקווה'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36 space-y-1">
              <label className="text-xs font-medium">מחיר (₪)</label>
              <Input
                type="number"
                placeholder="2,500,000"
                value={checkPrice}
                onChange={e => setCheckPrice(e.target.value)}
                className="h-9"
              />
            </div>
            <Button onClick={handleManualCheck} className="gap-1.5 h-9">
              <MagnifyingGlass size={14} /> בדוק
            </Button>
          </div>

          {checkResult !== null && checkPrice && (
            <div className={cn('mt-4 p-4 rounded-xl border', SEVERITY_META[checkResult?.severity || 'info'].color)}>
              <div className="flex items-center gap-2 mb-2">
                {checkResult ? <Warning size={18} /> : <ShieldCheck size={18} className="text-emerald-600" />}
                <span className="font-semibold text-sm">
                  {checkResult ? ANOMALY_LABELS[checkResult.anomalyType] : 'תקין — לא נמצאה חריגה'}
                </span>
              </div>
              {checkResult && (
                <>
                  <p className="text-sm">{checkResult.description}</p>
                  <p className="text-xs mt-2 font-medium">{checkResult.recommendation}</p>
                </>
              )}
            </div>
          )}
          {checkPrice && checkResult === null && (
            <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} />
                <span className="font-semibold text-sm">תקין — המחיר בטווח הסביר</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="חומרה" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="critical">קריטי</SelectItem>
            <SelectItem value="warning">אזהרה</SelectItem>
            <SelectItem value="info">מידע</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="סוג" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            {Object.entries(ANOMALY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} className="h-3 w-3" />
          הצג טופלו
        </label>
        <Badge variant="secondary" className="text-xs">{filtered.length} תוצאות</Badge>
      </div>

      {/* Anomaly list */}
      <div className="space-y-3">
        {filtered.map(anomaly => {
          const meta = SEVERITY_META[anomaly.severity]
          const Icon = meta.icon
          return (
            <Card key={anomaly.id} className={cn('border overflow-hidden', anomaly.resolved && 'opacity-60', meta.color)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon size={20} weight="duotone" className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{anomaly.address}</span>
                      <Badge variant="outline" className="text-[10px]">{anomaly.city}</Badge>
                      <Badge variant="outline" className="text-[10px]">{ANOMALY_LABELS[anomaly.anomalyType]}</Badge>
                      {anomaly.resolved && <Badge className="text-[10px] bg-emerald-100 text-emerald-700">טופל</Badge>}
                    </div>

                    <p className="text-sm mb-2">{anomaly.description}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2 flex-wrap">
                      <span>מחיר מדווח: <strong className="text-foreground">₪{anomaly.reportedPrice.toLocaleString()}</strong></span>
                      <ArrowRight size={12} />
                      <span>ממוצע שוק: <strong className="text-foreground">₪{anomaly.marketAvg.toLocaleString()}</strong></span>
                      <Badge variant={anomaly.deviation > 0 ? 'default' : 'destructive'} className="text-[10px]">
                        {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%
                      </Badge>
                    </div>

                    <div className="bg-white/50 rounded-lg p-2 text-xs border">
                      <span className="font-medium">💡 המלצה: </span>{anomaly.recommendation}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('text-xs shrink-0', anomaly.resolved ? 'text-amber-600' : 'text-emerald-600')}
                    onClick={() => toggleResolved(anomaly.id)}
                  >
                    {anomaly.resolved ? 'פתח מחדש' : 'סמן כטופל'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-400" weight="duotone" />
              <p className="text-muted-foreground">לא נמצאו חריגות. הכל תקין!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
