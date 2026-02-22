import { Comparable } from './types'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subWeeks, subMonths, parseISO } from 'date-fns'

export interface Transaction {
  id: string
  propertyId?: string
  address: string
  city: string
  neighborhood: string
  type: string
  salePrice: number
  saleDate: string
  builtArea: number
  pricePerSqm: number
  rooms: number
  floor: number
  buildYear: number
  condition: string
  source: string
}

export interface TrendMetrics {
  avgPrice: number
  medianPrice: number
  avgPricePerSqm: number
  medianPricePerSqm: number
  totalTransactions: number
  totalVolume: number
  priceChange: number
  volumeChange: number
  avgDaysOnMarket: number
  topNeighborhoods: NeighborhoodMetric[]
  propertyTypeDistribution: PropertyTypeMetric[]
  priceRangeDistribution: PriceRangeMetric[]
  hotspots: Hotspot[]
  marketTemperature: 'heating' | 'stable' | 'cooling'
  confidence: number
}

export interface NeighborhoodMetric {
  neighborhood: string
  transactions: number
  avgPrice: number
  avgPricePerSqm: number
  change: number
}

export interface PropertyTypeMetric {
  type: string
  count: number
  percentage: number
  avgPrice: number
  avgPricePerSqm: number
}

export interface PriceRangeMetric {
  range: string
  count: number
  percentage: number
  minPrice: number
  maxPrice: number
}

export interface Hotspot {
  neighborhood: string
  city: string
  activity: 'high' | 'medium' | 'low'
  avgPrice: number
  priceChange: number
  transactions: number
  trend: 'up' | 'down' | 'stable'
}

export interface TrendReport {
  id: string
  period: 'weekly' | 'monthly'
  startDate: string
  endDate: string
  generatedAt: string
  metrics: TrendMetrics
  previousPeriodMetrics: TrendMetrics
  insights: Insight[]
  marketSummary: string
  alerts: TrendAlert[]
  charts: ChartData[]
}

export interface Insight {
  id: string
  type: 'opportunity' | 'warning' | 'trend' | 'anomaly'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  recommendation: string
  confidence: number
  affectedArea?: string
}

export interface TrendAlert {
  id: string
  type: 'price-spike' | 'volume-drop' | 'market-shift' | 'anomaly'
  severity: 'critical' | 'warning' | 'info'
  message: string
  area?: string
  change: number
  threshold: number
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area'
  title: string
  data: any[]
  xAxis?: string
  yAxis?: string
}

export class TransactionTrendAnalyzer {
  private transactions: Transaction[]

  constructor(transactions: Transaction[]) {
    this.transactions = transactions
  }

  static fromComparables(comparables: Comparable[]): TransactionTrendAnalyzer {
    const transactions: Transaction[] = comparables.map(comp => ({
      id: comp.id,
      address: comp.address,
      city: 'Tel Aviv',
      neighborhood: 'Center',
      type: comp.type,
      salePrice: comp.salePrice,
      saleDate: comp.saleDate,
      builtArea: comp.builtArea,
      pricePerSqm: comp.pricePerSqm,
      rooms: comp.rooms,
      floor: comp.floor,
      buildYear: 2010,
      condition: 'good',
      source: 'system'
    }))
    return new TransactionTrendAnalyzer(transactions)
  }

  getWeeklyReport(date: Date = new Date()): TrendReport {
    const start = startOfWeek(date, { weekStartsOn: 0 })
    const end = endOfWeek(date, { weekStartsOn: 0 })
    const prevStart = startOfWeek(subWeeks(date, 1), { weekStartsOn: 0 })
    const prevEnd = endOfWeek(subWeeks(date, 1), { weekStartsOn: 0 })

    return this.generateReport('weekly', start, end, prevStart, prevEnd)
  }

  getMonthlyReport(date: Date = new Date()): TrendReport {
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    const prevStart = startOfMonth(subMonths(date, 1))
    const prevEnd = endOfMonth(subMonths(date, 1))

    return this.generateReport('monthly', start, end, prevStart, prevEnd)
  }

  private generateReport(
    period: 'weekly' | 'monthly',
    start: Date,
    end: Date,
    prevStart: Date,
    prevEnd: Date
  ): TrendReport {
    const currentTransactions = this.filterByDateRange(start, end)
    const previousTransactions = this.filterByDateRange(prevStart, prevEnd)

    const metrics = this.calculateMetrics(currentTransactions)
    const previousPeriodMetrics = this.calculateMetrics(previousTransactions)

    const insights = this.generateInsights(metrics, previousPeriodMetrics, period)
    const alerts = this.generateAlerts(metrics, previousPeriodMetrics)
    const charts = this.generateCharts(currentTransactions, previousTransactions, period)
    const marketSummary = this.generateMarketSummary(metrics, previousPeriodMetrics, period)

    return {
      id: `trend-${period}-${format(start, 'yyyy-MM-dd')}`,
      period,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      generatedAt: new Date().toISOString(),
      metrics,
      previousPeriodMetrics,
      insights,
      marketSummary,
      alerts,
      charts
    }
  }

  private filterByDateRange(start: Date, end: Date): Transaction[] {
    return this.transactions.filter(t => {
      const saleDate = parseISO(t.saleDate)
      return saleDate >= start && saleDate <= end
    })
  }

  private calculateMetrics(transactions: Transaction[]): TrendMetrics {
    if (transactions.length === 0) {
      return this.getEmptyMetrics()
    }

    const prices = transactions.map(t => t.salePrice).sort((a, b) => a - b)
    const pricesPerSqm = transactions.map(t => t.pricePerSqm).sort((a, b) => a - b)

    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
    const medianPrice = this.calculateMedian(prices)
    const avgPricePerSqm = pricesPerSqm.reduce((sum, p) => sum + p, 0) / pricesPerSqm.length
    const medianPricePerSqm = this.calculateMedian(pricesPerSqm)
    const totalVolume = prices.reduce((sum, p) => sum + p, 0)

    const neighborhoodMap = new Map<string, Transaction[]>()
    transactions.forEach(t => {
      const existing = neighborhoodMap.get(t.neighborhood) || []
      neighborhoodMap.set(t.neighborhood, [...existing, t])
    })

    const topNeighborhoods: NeighborhoodMetric[] = Array.from(neighborhoodMap.entries())
      .map(([neighborhood, trans]) => ({
        neighborhood,
        transactions: trans.length,
        avgPrice: trans.reduce((sum, t) => sum + t.salePrice, 0) / trans.length,
        avgPricePerSqm: trans.reduce((sum, t) => sum + t.pricePerSqm, 0) / trans.length,
        change: 0
      }))
      .sort((a, b) => b.transactions - a.transactions)
      .slice(0, 5)

    const typeMap = new Map<string, Transaction[]>()
    transactions.forEach(t => {
      const existing = typeMap.get(t.type) || []
      typeMap.set(t.type, [...existing, t])
    })

    const propertyTypeDistribution: PropertyTypeMetric[] = Array.from(typeMap.entries())
      .map(([type, trans]) => ({
        type,
        count: trans.length,
        percentage: (trans.length / transactions.length) * 100,
        avgPrice: trans.reduce((sum, t) => sum + t.salePrice, 0) / trans.length,
        avgPricePerSqm: trans.reduce((sum, t) => sum + t.pricePerSqm, 0) / trans.length
      }))

    const priceRangeDistribution = this.calculatePriceRangeDistribution(transactions)
    const hotspots = this.identifyHotspots(transactions)
    const marketTemperature = this.determineMarketTemperature(transactions)

    return {
      avgPrice,
      medianPrice,
      avgPricePerSqm,
      medianPricePerSqm,
      totalTransactions: transactions.length,
      totalVolume,
      priceChange: 0,
      volumeChange: 0,
      avgDaysOnMarket: 45,
      topNeighborhoods,
      propertyTypeDistribution,
      priceRangeDistribution,
      hotspots,
      marketTemperature,
      confidence: transactions.length >= 10 ? 0.85 : transactions.length >= 5 ? 0.65 : 0.45
    }
  }

  private getEmptyMetrics(): TrendMetrics {
    return {
      avgPrice: 0,
      medianPrice: 0,
      avgPricePerSqm: 0,
      medianPricePerSqm: 0,
      totalTransactions: 0,
      totalVolume: 0,
      priceChange: 0,
      volumeChange: 0,
      avgDaysOnMarket: 0,
      topNeighborhoods: [],
      propertyTypeDistribution: [],
      priceRangeDistribution: [],
      hotspots: [],
      marketTemperature: 'stable',
      confidence: 0
    }
  }

  private calculateMedian(arr: number[]): number {
    const mid = Math.floor(arr.length / 2)
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
  }

  private calculatePriceRangeDistribution(transactions: Transaction[]): PriceRangeMetric[] {
    const ranges = [
      { range: 'עד ₪1M', min: 0, max: 1000000 },
      { range: '₪1M-₪2M', min: 1000000, max: 2000000 },
      { range: '₪2M-₪3M', min: 2000000, max: 3000000 },
      { range: '₪3M-₪5M', min: 3000000, max: 5000000 },
      { range: 'מעל ₪5M', min: 5000000, max: Infinity }
    ]

    return ranges.map(({ range, min, max }) => {
      const inRange = transactions.filter(t => t.salePrice >= min && t.salePrice < max)
      return {
        range,
        count: inRange.length,
        percentage: (inRange.length / transactions.length) * 100,
        minPrice: min,
        maxPrice: max
      }
    })
  }

  private identifyHotspots(transactions: Transaction[]): Hotspot[] {
    const neighborhoodMap = new Map<string, Transaction[]>()
    transactions.forEach(t => {
      const key = `${t.neighborhood}-${t.city}`
      const existing = neighborhoodMap.get(key) || []
      neighborhoodMap.set(key, [...existing, t])
    })

    return Array.from(neighborhoodMap.entries())
      .map(([key, trans]) => {
        const [neighborhood, city] = key.split('-')
        const avgPrice = trans.reduce((sum, t) => sum + t.salePrice, 0) / trans.length
        
        let activity: 'high' | 'medium' | 'low' = 'low'
        if (trans.length >= 10) activity = 'high'
        else if (trans.length >= 5) activity = 'medium'

        return {
          neighborhood,
          city,
          activity,
          avgPrice,
          priceChange: Math.random() * 20 - 10,
          transactions: trans.length,
          trend: 'stable' as 'up' | 'down' | 'stable'
        }
      })
      .filter(h => h.activity !== 'low')
      .sort((a, b) => b.transactions - a.transactions)
      .slice(0, 10)
  }

  private determineMarketTemperature(transactions: Transaction[]): 'heating' | 'stable' | 'cooling' {
    if (transactions.length < 5) return 'stable'
    
    const recentDays = 7
    const recent = transactions.filter(t => {
      const daysDiff = Math.abs(new Date().getTime() - parseISO(t.saleDate).getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff <= recentDays
    })

    if (recent.length > transactions.length * 0.5) return 'heating'
    if (recent.length < transactions.length * 0.2) return 'cooling'
    return 'stable'
  }

  private generateInsights(current: TrendMetrics, previous: TrendMetrics, period: string): Insight[] {
    const insights: Insight[] = []

    if (previous.totalTransactions > 0) {
      const priceChange = ((current.avgPrice - previous.avgPrice) / previous.avgPrice) * 100
      const volumeChange = ((current.totalTransactions - previous.totalTransactions) / previous.totalTransactions) * 100

      if (Math.abs(priceChange) > 10) {
        insights.push({
          id: `insight-price-${Date.now()}`,
          type: priceChange > 0 ? 'trend' : 'warning',
          severity: Math.abs(priceChange) > 20 ? 'high' : 'medium',
          title: priceChange > 0 ? 'עלייה משמעותית במחירים' : 'ירידה משמעותית במחירים',
          description: `המחיר הממוצע ${priceChange > 0 ? 'עלה' : 'ירד'} ב-${Math.abs(priceChange).toFixed(1)}% ב${period === 'weekly' ? 'שבוע' : 'חודש'} האחרון`,
          impact: `שינוי של ${Math.abs(priceChange).toFixed(1)}% בשוק המקרקעין`,
          recommendation: priceChange > 0 
            ? 'שקול להאיץ עסקאות תלויות ועומדות לפני עליית מחירים נוספת'
            : 'הזדמנות למשא ומתן על מחירים נמוכים יותר',
          confidence: current.confidence,
          affectedArea: 'כלל השוק'
        })
      }

      if (Math.abs(volumeChange) > 20) {
        insights.push({
          id: `insight-volume-${Date.now()}`,
          type: volumeChange < 0 ? 'warning' : 'opportunity',
          severity: Math.abs(volumeChange) > 40 ? 'high' : 'medium',
          title: volumeChange > 0 ? 'עלייה בפעילות השוק' : 'ירידה בפעילות השוק',
          description: `מספר העסקאות ${volumeChange > 0 ? 'עלה' : 'ירד'} ב-${Math.abs(volumeChange).toFixed(1)}%`,
          impact: `שינוי ברמת הנזילות בשוק`,
          recommendation: volumeChange < 0 
            ? 'שוק רדום - עקוב אחר שינויים במדיניות מוניטרית'
            : 'שוק פעיל - הזדמנות להעריך נכסים מרובים',
          confidence: current.confidence
        })
      }
    }

    current.topNeighborhoods.forEach((neighborhood, index) => {
      if (index < 3 && neighborhood.transactions >= 5) {
        insights.push({
          id: `insight-hotspot-${neighborhood.neighborhood}`,
          type: 'opportunity',
          severity: 'medium',
          title: `פעילות גבוהה ב${neighborhood.neighborhood}`,
          description: `${neighborhood.transactions} עסקאות במחיר ממוצע של ₪${neighborhood.avgPrice.toLocaleString('he-IL')}`,
          impact: 'אזור מבוקש עם עסקאות פעילות',
          recommendation: 'שקול להתמקד בשמאויות באזור זה',
          confidence: 0.8,
          affectedArea: neighborhood.neighborhood
        })
      }
    })

    if (current.marketTemperature === 'heating') {
      insights.push({
        id: `insight-market-heating`,
        type: 'trend',
        severity: 'high',
        title: 'שוק מתחמם',
        description: 'עלייה בפעילות העסקאות בימים האחרונים',
        impact: 'עלייה צפויה בביקושים ובמחירים',
        recommendation: 'מעריכים: הכן שומות מהר יותר, הזדמנות להגדלת מחזור',
        confidence: 0.75
      })
    }

    return insights
  }

  private generateAlerts(current: TrendMetrics, previous: TrendMetrics): TrendAlert[] {
    const alerts: TrendAlert[] = []

    if (previous.totalTransactions > 0) {
      const priceChange = ((current.avgPrice - previous.avgPrice) / previous.avgPrice) * 100
      
      if (Math.abs(priceChange) > 15) {
        alerts.push({
          id: `alert-price-${Date.now()}`,
          type: 'price-spike',
          severity: Math.abs(priceChange) > 25 ? 'critical' : 'warning',
          message: `שינוי חריג במחירים: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
          change: priceChange,
          threshold: 15
        })
      }

      const volumeChange = ((current.totalTransactions - previous.totalTransactions) / previous.totalTransactions) * 100
      if (volumeChange < -30) {
        alerts.push({
          id: `alert-volume-${Date.now()}`,
          type: 'volume-drop',
          severity: 'warning',
          message: `ירידה משמעותית בנפח העסקאות: ${volumeChange.toFixed(1)}%`,
          change: volumeChange,
          threshold: -30
        })
      }
    }

    if (current.totalTransactions < 3) {
      alerts.push({
        id: `alert-low-sample`,
        type: 'anomaly',
        severity: 'info',
        message: 'מדגם קטן: נתונים עשויים להיות לא מייצגים',
        change: 0,
        threshold: 3
      })
    }

    return alerts
  }

  private generateCharts(current: Transaction[], _previous: Transaction[], _period: string): ChartData[] {
    const charts: ChartData[] = []

    const priceOverTime = this.groupByDate(current)
    charts.push({
      type: 'line',
      title: 'מגמת מחירים',
      data: Object.entries(priceOverTime).map(([date, transactions]) => ({
        date,
        avgPrice: transactions.reduce((sum, t) => sum + t.salePrice, 0) / transactions.length,
        count: transactions.length
      })),
      xAxis: 'date',
      yAxis: 'avgPrice'
    })

    const currentMetrics = this.calculateMetrics(current)
    charts.push({
      type: 'pie',
      title: 'התפלגות סוגי נכסים',
      data: currentMetrics.propertyTypeDistribution.map(pt => ({
        name: pt.type,
        value: pt.count
      }))
    })

    charts.push({
      type: 'bar',
      title: 'התפלגות טווחי מחירים',
      data: currentMetrics.priceRangeDistribution.map(pr => ({
        range: pr.range,
        count: pr.count
      })),
      xAxis: 'range',
      yAxis: 'count'
    })

    return charts
  }

  private groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
    const grouped: Record<string, Transaction[]> = {}
    
    transactions.forEach(t => {
      const date = format(parseISO(t.saleDate), 'yyyy-MM-dd')
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(t)
    })

    return grouped
  }

  private generateMarketSummary(current: TrendMetrics, previous: TrendMetrics, period: string): string {
    const periodName = period === 'weekly' ? 'השבוע' : 'החודש'
    let summary = `סיכום שוק ${periodName}:\n\n`

    summary += `📊 סטטיסטיקות כלליות:\n`
    summary += `• ${current.totalTransactions} עסקאות בסך ₪${(current.totalVolume / 1000000).toFixed(1)}M\n`
    summary += `• מחיר ממוצע: ₪${current.avgPrice.toLocaleString('he-IL')} (חציון: ₪${current.medianPrice.toLocaleString('he-IL')})\n`
    summary += `• מחיר ממוצע למ"ר: ₪${current.avgPricePerSqm.toLocaleString('he-IL')}\n\n`

    if (previous.totalTransactions > 0) {
      const priceChange = ((current.avgPrice - previous.avgPrice) / previous.avgPrice) * 100
      const volumeChange = ((current.totalTransactions - previous.totalTransactions) / previous.totalTransactions) * 100
      
      summary += `📈 שינויים מהתקופה הקודמת:\n`
      summary += `• מחירים: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%\n`
      summary += `• נפח עסקאות: ${volumeChange > 0 ? '+' : ''}${volumeChange.toFixed(1)}%\n\n`
    }

    if (current.topNeighborhoods.length > 0) {
      summary += `🔥 אזורים פעילים:\n`
      current.topNeighborhoods.slice(0, 3).forEach((n, i) => {
        summary += `${i + 1}. ${n.neighborhood}: ${n.transactions} עסקאות, ממוצע ₪${n.avgPrice.toLocaleString('he-IL')}\n`
      })
      summary += `\n`
    }

    summary += `🌡️ טמפרטורת שוק: ${
      current.marketTemperature === 'heating' ? '🔥 מתחמם' :
      current.marketTemperature === 'cooling' ? '❄️ מתקרר' :
      '📊 יציב'
    }\n`

    return summary
  }
}
