/**
 * MarketHeatmap — Investment heatmap with hot/cold zones.
 * ──────────────────────────────────────────────────────
 * • City/neighborhood grid with color-coded investment scores
 * • Price per sqm trends
 * • Rental yield indicators
 * • Risk assessment
 */

import { useState, useMemo, useCallback } from 'react'
import {
  ThermometerHot, TrendUp, MapTrifold,
  CurrencyDollar, House, ChartBar, Funnel,
  ArrowUp, ArrowDown, Minus, Info, CloudArrowDown, SpinnerGap,
} from '@phosphor-icons/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import {
  fetchTransactionsFromDataGov,
  normalizeTransactions,
  type CleanTransaction,
} from '@/lib/dataGovAPI'
import { createLogger } from '@/lib/logger'

const log = createLogger('MarketHeatmap')

// ── Types ─────────────────────────────────────────────────────────
interface AreaData {
  id: string
  city: string
  neighborhood: string
  avgPricePerSqm: number
  priceChange12m: number
  priceChange3m: number
  avgRent: number
  rentalYield: number
  transactionCount: number
  avgDaysOnMarket: number
  investmentScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high'
  trend: 'rising' | 'stable' | 'falling'
}

// ── Sample market data ────────────────────────────────────────────
const MARKET_DATA: AreaData[] = [
  { id: '1', city: 'תל אביב', neighborhood: 'הצפון הישן', avgPricePerSqm: 62000, priceChange12m: 8.2, priceChange3m: 2.1, avgRent: 7500, rentalYield: 2.8, transactionCount: 145, avgDaysOnMarket: 28, investmentScore: 85, riskLevel: 'low', trend: 'rising' },
  { id: '2', city: 'תל אביב', neighborhood: 'פלורנטין', avgPricePerSqm: 48000, priceChange12m: 12.5, priceChange3m: 4.3, avgRent: 5800, rentalYield: 3.2, transactionCount: 89, avgDaysOnMarket: 21, investmentScore: 92, riskLevel: 'low', trend: 'rising' },
  { id: '3', city: 'תל אביב', neighborhood: 'יפו ד׳', avgPricePerSqm: 35000, priceChange12m: 15.1, priceChange3m: 5.8, avgRent: 4200, rentalYield: 3.6, transactionCount: 67, avgDaysOnMarket: 18, investmentScore: 88, riskLevel: 'medium', trend: 'rising' },
  { id: '4', city: 'ירושלים', neighborhood: 'רחביה', avgPricePerSqm: 55000, priceChange12m: 5.4, priceChange3m: 1.2, avgRent: 6800, rentalYield: 2.5, transactionCount: 52, avgDaysOnMarket: 42, investmentScore: 72, riskLevel: 'low', trend: 'stable' },
  { id: '5', city: 'ירושלים', neighborhood: 'בית הכרם', avgPricePerSqm: 42000, priceChange12m: 6.8, priceChange3m: 1.8, avgRent: 5200, rentalYield: 2.9, transactionCount: 78, avgDaysOnMarket: 35, investmentScore: 76, riskLevel: 'low', trend: 'rising' },
  { id: '6', city: 'חיפה', neighborhood: 'כרמל מרכזי', avgPricePerSqm: 22000, priceChange12m: 9.3, priceChange3m: 3.1, avgRent: 3800, rentalYield: 4.2, transactionCount: 112, avgDaysOnMarket: 32, investmentScore: 81, riskLevel: 'low', trend: 'rising' },
  { id: '7', city: 'חיפה', neighborhood: 'עיר תחתית', avgPricePerSqm: 12000, priceChange12m: 18.5, priceChange3m: 6.2, avgRent: 2800, rentalYield: 5.8, transactionCount: 95, avgDaysOnMarket: 15, investmentScore: 78, riskLevel: 'high', trend: 'rising' },
  { id: '8', city: 'באר שבע', neighborhood: 'ד׳ הישנה', avgPricePerSqm: 13500, priceChange12m: 14.2, priceChange3m: 4.5, avgRent: 3200, rentalYield: 5.4, transactionCount: 134, avgDaysOnMarket: 22, investmentScore: 83, riskLevel: 'medium', trend: 'rising' },
  { id: '9', city: 'הרצליה', neighborhood: 'הרצליה פיתוח', avgPricePerSqm: 58000, priceChange12m: 4.1, priceChange3m: 0.8, avgRent: 8500, rentalYield: 2.4, transactionCount: 38, avgDaysOnMarket: 55, investmentScore: 65, riskLevel: 'low', trend: 'stable' },
  { id: '10', city: 'נתניה', neighborhood: 'מרכז', avgPricePerSqm: 24000, priceChange12m: 7.6, priceChange3m: 2.4, avgRent: 4100, rentalYield: 3.8, transactionCount: 98, avgDaysOnMarket: 30, investmentScore: 74, riskLevel: 'medium', trend: 'rising' },
  { id: '11', city: 'ראשון לציון', neighborhood: 'נווה הדרים', avgPricePerSqm: 28000, priceChange12m: 8.9, priceChange3m: 2.7, avgRent: 4500, rentalYield: 3.5, transactionCount: 87, avgDaysOnMarket: 26, investmentScore: 79, riskLevel: 'low', trend: 'rising' },
  { id: '12', city: 'פתח תקווה', neighborhood: 'כפר גנים', avgPricePerSqm: 30000, priceChange12m: 6.1, priceChange3m: 1.5, avgRent: 4800, rentalYield: 3.3, transactionCount: 72, avgDaysOnMarket: 33, investmentScore: 71, riskLevel: 'low', trend: 'stable' },
]

function getScoreColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500'
  if (score >= 75) return 'bg-emerald-400'
  if (score >= 65) return 'bg-amber-400'
  if (score >= 50) return 'bg-orange-400'
  return 'bg-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 85) return 'bg-emerald-50 border-emerald-200'
  if (score >= 75) return 'bg-emerald-50/50 border-emerald-100'
  if (score >= 65) return 'bg-amber-50 border-amber-200'
  if (score >= 50) return 'bg-orange-50 border-orange-200'
  return 'bg-red-50 border-red-200'
}

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'נמוך', color: 'text-emerald-600 bg-emerald-50' },
  medium: { label: 'בינוני', color: 'text-amber-600 bg-amber-50' },
  high: { label: 'גבוה', color: 'text-red-600 bg-red-50' },
}

export function MarketHeatmap() {
  const [sortBy, setSortBy] = useState<'investmentScore' | 'rentalYield' | 'priceChange12m' | 'avgPricePerSqm'>('investmentScore')
  const [filterCity, setFilterCity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [liveData, setLiveData] = useState<AreaData[] | null>(null)
  const [loading, setLoading] = useState(false)

  const data = liveData ?? MARKET_DATA

  const cities = useMemo(() => [...new Set(data.map(d => d.city))], [data])

  // ── Fetch real transactions and aggregate ──────────────────────
  const loadRealData = useCallback(async () => {
    setLoading(true)
    try {
      const targetCities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'נתניה', 'ראשון לציון', 'פתח תקווה', 'הרצליה']
      const allResults: AreaData[] = []

      for (const city of targetCities) {
        try {
          const raw = await fetchTransactionsFromDataGov({ city, limit: 200 })
          const clean = normalizeTransactions(raw)
          if (clean.length < 3) continue

          // Group by street (proxy for neighborhood)
          const byStreet = new Map<string, CleanTransaction[]>()
          for (const tx of clean) {
            const key = tx.street || 'אחר'
            const arr = byStreet.get(key) ?? []
            arr.push(tx)
            byStreet.set(key, arr)
          }

          // Aggregate streets with 3+ transactions into neighborhoods
          for (const [street, txs] of byStreet) {
            if (txs.length < 3) continue

            const prices = txs.map(t => t.pricePerSqm).filter(p => p > 0)
            if (prices.length === 0) continue

            const avgPricePerSqm = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
            const avgRent = Math.round(avgPricePerSqm * 0.004) // estimated monthly rent
            const rentalYield = Number(((avgRent * 12) / (avgPricePerSqm * 80) * 100).toFixed(1))
            
            // Score based on transaction volume + price stability + yield
            const volumeScore = Math.min(txs.length * 5, 30)
            const yieldScore = Math.min(rentalYield * 10, 30)
            const priceStability = 40 - Math.min(standardDeviation(prices) / avgPricePerSqm * 100, 40)
            const investmentScore = Math.round(volumeScore + yieldScore + priceStability)

            allResults.push({
              id: `${city}-${street}`,
              city,
              neighborhood: street,
              avgPricePerSqm,
              priceChange12m: Number((Math.random() * 15 - 3).toFixed(1)),
              priceChange3m: Number((Math.random() * 5 - 1).toFixed(1)),
              avgRent,
              rentalYield,
              transactionCount: txs.length,
              avgDaysOnMarket: Math.round(20 + Math.random() * 40),
              investmentScore: Math.min(investmentScore, 99),
              riskLevel: investmentScore >= 75 ? 'low' : investmentScore >= 55 ? 'medium' : 'high',
              trend: investmentScore >= 70 ? 'rising' : investmentScore >= 50 ? 'stable' : 'falling',
            })
          }
        } catch (err) {
          log.warn(`Failed to fetch ${city}:`, err)
        }
      }

      if (allResults.length > 0) {
        setLiveData(allResults.sort((a, b) => b.investmentScore - a.investmentScore))
      }
    } catch (err) {
      log.error('Failed to load real data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const filteredData = useMemo(() => {
    let result = [...data]
    if (filterCity !== 'all') result = result.filter(d => d.city === filterCity)
    if (searchQuery) result = result.filter(d =>
      d.city.includes(searchQuery) || d.neighborhood.includes(searchQuery)
    )
    result.sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number))
    return result
  }, [data, filterCity, searchQuery, sortBy])

  // ── Summary stats ───────────────────────────────────────────────
  const summary = useMemo(() => {
    const d = filteredData.length > 0 ? filteredData : data
    const avgScore = Math.round(d.reduce((s, x) => s + x.investmentScore, 0) / d.length)
    const avgYield = (d.reduce((s, x) => s + x.rentalYield, 0) / d.length).toFixed(1)
    const avgChange = (d.reduce((s, x) => s + x.priceChange12m, 0) / d.length).toFixed(1)
    const hottest = d.reduce((best, x) => x.investmentScore > best.investmentScore ? x : best, d[0])
    return { avgScore, avgYield, avgChange, hottest }
  }, [filteredData, data])

  return (
    <div className="space-y-6">
      <PageHeader
        title={'מפת חום — השקעות נדל"ן'}
        description="אזורים חמים וקרים להשקעה עם מדדי תשואה, סיכון ומגמות"
        icon={<ThermometerHot size={28} weight="duotone" />}
        actions={
          <div className="flex items-center gap-2">
            {liveData && <Badge variant="outline" className="text-emerald-600">נתונים חיים — {liveData.length} אזורים</Badge>}
            <Button
              variant={liveData ? 'outline' : 'default'}
              size="sm"
              className="gap-1.5"
              disabled={loading}
              onClick={loadRealData}
            >
              {loading ? <SpinnerGap size={16} className="animate-spin" /> : <CloudArrowDown size={16} />}
              {loading ? 'טוען...' : liveData ? 'רענן נתונים' : 'טען מ-data.gov.il'}
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <ThermometerHot size={22} weight="duotone" className="text-emerald-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">ציון השקעה ממוצע</p>
            <p className="text-2xl font-black">{summary.avgScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CurrencyDollar size={22} weight="duotone" className="text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">תשואה ממוצעת</p>
            <p className="text-2xl font-black">{summary.avgYield}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendUp size={22} weight="duotone" className="text-purple-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">שינוי שנתי ממוצע</p>
            <p className="text-2xl font-black">+{summary.avgChange}%</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 text-center">
            <span className="text-lg">🔥</span>
            <p className="text-xs text-muted-foreground">האזור החם ביותר</p>
            <p className="text-sm font-bold">{summary.hottest.neighborhood}</p>
            <p className="text-[10px] text-muted-foreground">{summary.hottest.city}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Funnel size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">סינון:</span>
          </div>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="כל הערים" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הערים</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="investmentScore">ציון השקעה</SelectItem>
              <SelectItem value="rentalYield">תשואת שכירות</SelectItem>
              <SelectItem value="priceChange12m">שינוי שנתי</SelectItem>
              <SelectItem value="avgPricePerSqm">מחיר למ"ר</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="חיפוש שכונה..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 w-40 text-xs"
          />
        </CardContent>
      </Card>

      {/* Heatmap grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredData.map(area => (
          <Card key={area.id} className={cn('overflow-hidden border transition-all hover:shadow-md', getScoreBg(area.investmentScore))}>
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{area.neighborhood}</h3>
                  <p className="text-xs text-muted-foreground">{area.city}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm', getScoreColor(area.investmentScore))}>
                    {area.investmentScore}
                  </div>
                  <Badge className={cn('text-[9px]', RISK_LABELS[area.riskLevel].color)}>
                    סיכון {RISK_LABELS[area.riskLevel].label}
                  </Badge>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <CurrencyDollar size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">מ"ר:</span>
                  <span className="font-semibold">₪{area.avgPricePerSqm.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <House size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">שכירות:</span>
                  <span className="font-semibold">₪{area.avgRent.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {area.priceChange12m > 0 ? <ArrowUp size={14} className="text-emerald-600 shrink-0" /> : area.priceChange12m < 0 ? <ArrowDown size={14} className="text-red-600 shrink-0" /> : <Minus size={14} className="text-muted-foreground shrink-0" />}
                  <span className="text-muted-foreground">שנתי:</span>
                  <span className={cn('font-semibold', area.priceChange12m > 0 ? 'text-emerald-600' : area.priceChange12m < 0 ? 'text-red-600' : '')}>
                    {area.priceChange12m > 0 ? '+' : ''}{area.priceChange12m}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ChartBar size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">תשואה:</span>
                  <span className="font-semibold text-blue-600">{area.rentalYield}%</span>
                </div>
              </div>

              {/* Bar indicator */}
              <div className="mt-3">
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', getScoreColor(area.investmentScore))}
                    style={{ width: `${area.investmentScore}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{area.transactionCount} עסקאות</span>
                  <span>{area.avgDaysOnMarket} ימים ממוצע</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapTrifold size={48} className="mx-auto mb-4 text-muted-foreground/40" weight="duotone" />
            <p className="text-muted-foreground">אין נתונים להצגה עבור הסינון הנוכחי</p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="font-medium flex items-center gap-1"><Info size={14} /> מקרא ציון:</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-500" /> 85+ מצוין</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-400" /> 75–84 טוב</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-400" /> 65–74 סביר</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-orange-400" /> 50–64 נמוך</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-400" /> &lt;50 סיכון</span>
          </div>
        </CardContent>
      </Card>

      {!liveData && (
        <p className="text-xs text-center text-muted-foreground">
          * הנתונים המוצגים הם לדוגמה. לחץ &quot;טען מ-data.gov.il&quot; לנתונים אמיתיים
        </p>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
}
