import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TrendReport, Insight } from '@/lib/transactionTrends'
import { TrendUp, TrendDown, Warning, Info, CheckCircle, XCircle, ChartLine, MapPin, Buildings } from '@phosphor-icons/react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrendReportPreviewProps {
  report: TrendReport
}

const COLORS = ['#8b5cf6', '#22c55e', '#eab308', '#ef4444', '#3b82f6', '#f97316', '#ec4899', '#06b6d4']

export function TrendReportPreview({ report }: TrendReportPreviewProps) {
  const { metrics, previousPeriodMetrics, insights, alerts, marketSummary, period } = report

  const priceChange = previousPeriodMetrics.avgPrice > 0
    ? ((metrics.avgPrice - previousPeriodMetrics.avgPrice) / previousPeriodMetrics.avgPrice) * 100
    : 0

  const volumeChange = previousPeriodMetrics.totalTransactions > 0
    ? ((metrics.totalTransactions - previousPeriodMetrics.totalTransactions) / previousPeriodMetrics.totalTransactions) * 100
    : 0

  return (
    <div className="space-y-6 p-6 bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-linear-to-l from-primary via-accent to-primary bg-clip-text text-transparent">
          דוח מגמות שוק {period === 'weekly' ? 'שבועי' : 'חודשי'}
        </h1>
        <p className="text-muted-foreground">
          {new Date(report.startDate).toLocaleDateString('he-IL')} - {new Date(report.endDate).toLocaleDateString('he-IL')}
        </p>
        <Badge variant={
          metrics.marketTemperature === 'heating' ? 'default' :
          metrics.marketTemperature === 'cooling' ? 'destructive' :
          'secondary'
        } className="text-sm px-4 py-1">
          {metrics.marketTemperature === 'heating' && '🔥 שוק מתחמם'}
          {metrics.marketTemperature === 'cooling' && '❄️ שוק מתקרר'}
          {metrics.marketTemperature === 'stable' && '📊 שוק יציב'}
        </Badge>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Warning size={20} weight="duotone" className="text-warning" />
            התראות חשובות
          </h3>
          {alerts.map(alert => (
            <Alert
              key={alert.id}
              variant={alert.severity === 'critical' ? 'destructive' : 'default'}
              className="glass-effect"
            >
              <div className="flex items-start gap-3">
                {alert.severity === 'critical' && <XCircle size={20} className="mt-0.5" />}
                {alert.severity === 'warning' && <Warning size={20} className="mt-0.5" />}
                {alert.severity === 'info' && <Info size={20} className="mt-0.5" />}
                <div className="flex-1">
                  <AlertTitle className="mb-1">{alert.message}</AlertTitle>
                  {alert.area && (
                    <AlertDescription className="text-xs">
                      אזור: {alert.area}
                    </AlertDescription>
                  )}
                </div>
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {alert.change > 0 ? '+' : ''}{alert.change.toFixed(1)}%
                </Badge>
              </div>
            </Alert>
          ))}
        </div>
      )}

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>סיכום תקופה</CardTitle>
          <CardDescription>סטטיסטיקות ראשיות ושינויים מהתקופה הקודמת</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{marketSummary}</pre>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardDescription>מחיר ממוצע</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              ₪{metrics.avgPrice.toLocaleString('he-IL')}
            </div>
            <div className="flex items-center gap-2">
              {priceChange !== 0 && (
                <>
                  {priceChange > 0 ? (
                    <TrendUp size={16} className="text-success" weight="bold" />
                  ) : (
                    <TrendDown size={16} className="text-destructive" weight="bold" />
                  )}
                  <span className={priceChange > 0 ? 'text-success' : 'text-destructive'}>
                    {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              חציון: ₪{metrics.medianPrice.toLocaleString('he-IL')}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardDescription>מחיר למ"ר</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              ₪{metrics.avgPricePerSqm.toLocaleString('he-IL')}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              חציון: ₪{metrics.medianPricePerSqm.toLocaleString('he-IL')}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardDescription>נפח עסקאות</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {metrics.totalTransactions}
            </div>
            <div className="flex items-center gap-2">
              {volumeChange !== 0 && (
                <>
                  {volumeChange > 0 ? (
                    <TrendUp size={16} className="text-success" weight="bold" />
                  ) : (
                    <TrendDown size={16} className="text-destructive" weight="bold" />
                  )}
                  <span className={volumeChange > 0 ? 'text-success' : 'text-destructive'}>
                    {volumeChange > 0 ? '+' : ''}{volumeChange.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              סה"כ ₪{(metrics.totalVolume / 1000000).toFixed(1)}M
            </div>
          </CardContent>
        </Card>
      </div>

      {metrics.topNeighborhoods.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin size={20} weight="duotone" />
              אזורים פעילים
            </CardTitle>
            <CardDescription>שכונות עם מספר העסקאות הגבוה ביותר</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topNeighborhoods.map((neighborhood, index) => (
                <div key={neighborhood.neighborhood} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{neighborhood.neighborhood}</div>
                        <div className="text-xs text-muted-foreground">
                          {neighborhood.transactions} עסקאות
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">₪{neighborhood.avgPrice.toLocaleString('he-IL')}</div>
                      <div className="text-xs text-muted-foreground">
                        ₪{neighborhood.avgPricePerSqm.toLocaleString('he-IL')}/מ"ר
                      </div>
                    </div>
                  </div>
                  {index < metrics.topNeighborhoods.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.propertyTypeDistribution.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Buildings size={20} weight="duotone" />
              התפלגות סוגי נכסים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.propertyTypeDistribution}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ type, percentage }) => `${type} (${percentage.toFixed(0)}%)`}
                >
                  {metrics.propertyTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <div className="font-semibold mb-1">{data.type}</div>
                        <div className="text-sm space-y-1">
                          <div>עסקאות: {data.count}</div>
                          <div>מחיר ממוצע: ₪{data.avgPrice.toLocaleString('he-IL')}</div>
                          <div>מחיר למ"ר: ₪{data.avgPricePerSqm.toLocaleString('he-IL')}</div>
                        </div>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {metrics.propertyTypeDistribution.map(pt => (
                <div key={pt.type} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[metrics.propertyTypeDistribution.indexOf(pt) % COLORS.length] }} />
                  <span>{pt.type}: {pt.count} ({pt.percentage.toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {metrics.priceRangeDistribution.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartLine size={20} weight="duotone" />
              התפלגות טווחי מחירים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.priceRangeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.24 0.025 265 / 0.3)" />
                <XAxis dataKey="range" stroke="oklch(0.55 0.01 265)" />
                <YAxis stroke="oklch(0.55 0.01 265)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.14 0.02 265)',
                    border: '1px solid oklch(0.24 0.025 265)',
                    borderRadius: '0.5rem'
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {insights.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={20} weight="duotone" className="text-success" />
              תובנות AI
            </CardTitle>
            <CardDescription>ניתוח חכם של מגמות השוק והמלצות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </CardContent>
        </Card>
      )}

      {metrics.hotspots.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>נקודות חמות בשוק</CardTitle>
            <CardDescription>אזורים עם פעילות מוגברת</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.hotspots.map(hotspot => (
                <div key={`${hotspot.neighborhood}-${hotspot.city}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      hotspot.activity === 'high' ? 'default' :
                      hotspot.activity === 'medium' ? 'secondary' :
                      'outline'
                    }>
                      {hotspot.activity === 'high' && '🔥 גבוה'}
                      {hotspot.activity === 'medium' && '📊 בינוני'}
                      {hotspot.activity === 'low' && '❄️ נמוך'}
                    </Badge>
                    <div>
                      <div className="font-semibold">{hotspot.neighborhood}, {hotspot.city}</div>
                      <div className="text-xs text-muted-foreground">{hotspot.transactions} עסקאות</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">₪{hotspot.avgPrice.toLocaleString('he-IL')}</div>
                    <div className={`text-xs ${hotspot.priceChange > 0 ? 'text-success' : 'text-destructive'}`}>
                      {hotspot.priceChange > 0 ? '+' : ''}{hotspot.priceChange.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-effect">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">רמת ביטחון בנתונים</div>
              <div className="text-2xl font-bold mt-1">{(metrics.confidence * 100).toFixed(0)}%</div>
            </div>
            <Progress value={metrics.confidence * 100} className="w-1/2" />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            דוח זה נוצר אוטומטית ב-{new Date(report.generatedAt).toLocaleString('he-IL')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`p-4 rounded-lg border ${
      insight.type === 'opportunity' ? 'border-success/50 bg-success/5' :
      insight.type === 'warning' ? 'border-warning/50 bg-warning/5' :
      insight.type === 'trend' ? 'border-primary/50 bg-primary/5' :
      'border-border bg-muted/50'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${
          insight.type === 'opportunity' ? 'text-success' :
          insight.type === 'warning' ? 'text-warning' :
          insight.type === 'trend' ? 'text-primary' :
          'text-muted-foreground'
        }`}>
          {insight.type === 'opportunity' && <TrendUp size={20} weight="duotone" />}
          {insight.type === 'warning' && <Warning size={20} weight="duotone" />}
          {insight.type === 'trend' && <ChartLine size={20} weight="duotone" />}
          {insight.type === 'anomaly' && <Info size={20} weight="duotone" />}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold">{insight.title}</h4>
            <div className="flex items-center gap-2">
              <Badge variant={
                insight.severity === 'high' ? 'destructive' :
                insight.severity === 'medium' ? 'default' :
                'secondary'
              } className="text-xs">
                {insight.severity === 'high' && 'חשיבות גבוהה'}
                {insight.severity === 'medium' && 'חשיבות בינונית'}
                {insight.severity === 'low' && 'חשיבות נמוכה'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {(insight.confidence * 100).toFixed(0)}% ביטחון
              </Badge>
            </div>
          </div>
          <p className="text-sm">{insight.description}</p>
          <div className="text-sm text-muted-foreground">
            <strong>השפעה:</strong> {insight.impact}
          </div>
          <div className="text-sm bg-background/50 p-3 rounded-lg border">
            <strong>המלצה:</strong> {insight.recommendation}
          </div>
          {insight.affectedArea && (
            <div className="text-xs text-muted-foreground">
              אזור מושפע: {insight.affectedArea}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
