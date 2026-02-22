import { useState, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ChartLine, 
  CurrencyDollar, 
  ChartBar, 
  TrendUp,
  Download,
  CalendarBlank,
  Database,
  ArrowUp,
  ArrowDown,
  Warning
} from '@phosphor-icons/react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import { he } from 'date-fns/locale'
import { uid } from '@/lib/utils'

interface APIUsageRecord {
  id: string
  timestamp: number
  apiName: string
  endpoint: string
  requestCount: number
  responseTime: number
  status: 'success' | 'error' | 'timeout'
  cost: number
  dataReturned: number
}

const API_CONFIGS = {
  'iPlan': {
    name: 'iPlan - תכנון ובנייה',
    color: '#6366f1',
    baseRate: 0.05,
    description: 'מאגר תכניות בניין עיר ארצי'
  },
  'Mavat': {
    name: 'Mavat - היתרי בנייה',
    color: '#8b5cf6',
    baseRate: 0.03,
    description: 'מערכת מידע גאוגרפית לתכנון ובנייה'
  },
  'GovMap': {
    name: 'GovMap - מפות ממשלתיות',
    color: '#ec4899',
    baseRate: 0.02,
    description: 'שכבות מידע מרחבי ממשלתיות'
  },
  'Nadlan': {
    name: 'נתוני נדל"ן - עסקאות',
    color: '#10b981',
    baseRate: 0.08,
    description: 'מאגר עסקאות נדל"ן'
  },
  'Tabu': {
    name: 'טאבו - רישום מקרקעין',
    color: '#f59e0b',
    baseRate: 0.12,
    description: 'לשכת רישום המקרקעין'
  },
  'CBS': {
    name: 'CBS - הלשכה המרכזית לסטטיסטיקה',
    color: '#06b6d4',
    baseRate: 0.04,
    description: 'נתונים סטטיסטיים ומדדים'
  }
}

export function APIUsageAnalytics() {
  const [usageData, setUsageData] = useKV<APIUsageRecord[]>('api-usage-records', [])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [selectedAPI, setSelectedAPI] = useState<string>('all')

  const filteredData = useMemo(() => {
    let filtered = usageData || []
    
    if (timeRange !== 'all') {
      const days = parseInt(timeRange)
      const startDate = startOfDay(subDays(new Date(), days))
      const endDate = endOfDay(new Date())
      
      filtered = filtered.filter(record => 
        isWithinInterval(new Date(record.timestamp), { start: startDate, end: endDate })
      )
    }
    
    if (selectedAPI !== 'all') {
      filtered = filtered.filter(record => record.apiName === selectedAPI)
    }
    
    return filtered
  }, [usageData, timeRange, selectedAPI])

  const analytics = useMemo(() => {
    const totalRequests = filteredData.length
    const totalCost = filteredData.reduce((sum, r) => sum + r.cost, 0)
    const avgResponseTime = filteredData.length > 0 
      ? filteredData.reduce((sum, r) => sum + r.responseTime, 0) / filteredData.length 
      : 0
    const successRate = filteredData.length > 0
      ? (filteredData.filter(r => r.status === 'success').length / filteredData.length) * 100
      : 0

    const byAPI = Object.keys(API_CONFIGS).map(apiName => {
      const apiRecords = filteredData.filter(r => r.apiName === apiName)
      return {
        apiName,
        requests: apiRecords.length,
        cost: apiRecords.reduce((sum, r) => sum + r.cost, 0),
        avgResponseTime: apiRecords.length > 0
          ? apiRecords.reduce((sum, r) => sum + r.responseTime, 0) / apiRecords.length
          : 0,
        successRate: apiRecords.length > 0
          ? (apiRecords.filter(r => r.status === 'success').length / apiRecords.length) * 100
          : 0
      }
    }).filter(api => api.requests > 0)

    const dailyUsage = filteredData.reduce((acc, record) => {
      const day = format(new Date(record.timestamp), 'yyyy-MM-dd')
      if (!acc[day]) {
        acc[day] = { date: day, requests: 0, cost: 0 }
      }
      acc[day].requests += 1
      acc[day].cost += record.cost
      return acc
    }, {} as Record<string, { date: string; requests: number; cost: number }>)

    const dailyChart = Object.values(dailyUsage).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    ).map(d => ({
      ...d,
      displayDate: format(new Date(d.date), 'dd/MM', { locale: he })
    }))

    const prevPeriodStart = timeRange === '7d' ? subDays(new Date(), 14) : 
                           timeRange === '30d' ? subDays(new Date(), 60) :
                           timeRange === '90d' ? subDays(new Date(), 180) : null
    
    let prevPeriodData: APIUsageRecord[] = []
    if (prevPeriodStart && timeRange !== 'all') {
      const days = parseInt(timeRange)
      const prevStart = startOfDay(subDays(new Date(), days * 2))
      const prevEnd = endOfDay(subDays(new Date(), days))
      prevPeriodData = (usageData || []).filter(record => 
        isWithinInterval(new Date(record.timestamp), { start: prevStart, end: prevEnd })
      )
    }

    const prevRequests = prevPeriodData.length
    const prevCost = prevPeriodData.reduce((sum, r) => sum + r.cost, 0)

    const requestsTrend = prevRequests > 0 ? ((totalRequests - prevRequests) / prevRequests) * 100 : 0
    const costTrend = prevCost > 0 ? ((totalCost - prevCost) / prevCost) * 100 : 0

    return {
      totalRequests,
      totalCost,
      avgResponseTime,
      successRate,
      byAPI,
      dailyChart,
      requestsTrend,
      costTrend
    }
  }, [filteredData, usageData, timeRange])

  const handleExportData = () => {
    const csvContent = [
      ['תאריך', 'API', 'נקודת קצה', 'בקשות', 'זמן תגובה (ms)', 'סטטוס', 'עלות (₪)'],
      ...filteredData.map(record => [
        format(new Date(record.timestamp), 'dd/MM/yyyy HH:mm'),
        API_CONFIGS[record.apiName as keyof typeof API_CONFIGS]?.name || record.apiName,
        record.endpoint,
        record.requestCount.toString(),
        record.responseTime.toFixed(0),
        record.status === 'success' ? 'הצלחה' : record.status === 'error' ? 'שגיאה' : 'פג זמן',
        record.cost.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `api-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const handleGenerateTestData = () => {
    const testRecords: APIUsageRecord[] = []
    const apis = Object.keys(API_CONFIGS)
    const now = new Date()

    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 30)
      const apiName = apis[Math.floor(Math.random() * apis.length)]
      const config = API_CONFIGS[apiName as keyof typeof API_CONFIGS]
      
      testRecords.push({
        id: uid('test'),
        timestamp: subDays(now, daysAgo).getTime(),
        apiName,
        endpoint: `/api/v1/${apiName.toLowerCase()}/search`,
        requestCount: Math.floor(Math.random() * 10) + 1,
        responseTime: Math.random() * 2000 + 100,
        status: Math.random() > 0.1 ? 'success' : Math.random() > 0.5 ? 'error' : 'timeout',
        cost: config.baseRate * (Math.floor(Math.random() * 10) + 1),
        dataReturned: Math.floor(Math.random() * 1000)
      })
    }

    setUsageData(prev => [...(prev || []), ...testRecords])
  }

  const COLORS = Object.values(API_CONFIGS).map(c => c.color)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ניתוח שימוש ב-API</h1>
          <p className="text-muted-foreground mt-1">מעקב אחר בקשות ועלויות לממשקי נתונים ממשלתיים</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateTestData}>
            <Database className="ml-2" />
            יצירת נתוני דוגמה
          </Button>
          <Button onClick={handleExportData} disabled={filteredData.length === 0}>
            <Download className="ml-2" />
            ייצוא לקובץ CSV
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-[200px]">
            <CalendarBlank className="ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 ימים אחרונים</SelectItem>
            <SelectItem value="30d">30 ימים אחרונים</SelectItem>
            <SelectItem value="90d">90 ימים אחרונים</SelectItem>
            <SelectItem value="all">כל הזמן</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedAPI} onValueChange={setSelectedAPI}>
          <SelectTrigger className="w-[250px]">
            <Database className="ml-2" />
            <SelectValue placeholder="בחר API" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל ה-APIs</SelectItem>
            {Object.entries(API_CONFIGS).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ בקשות</CardTitle>
            <ChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRequests.toLocaleString('he-IL')}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics.requestsTrend !== 0 && (
                <>
                  {analytics.requestsTrend > 0 ? (
                    <ArrowUp className="text-success ml-1" size={14} />
                  ) : (
                    <ArrowDown className="text-destructive ml-1" size={14} />
                  )}
                  <span className={analytics.requestsTrend > 0 ? 'text-success' : 'text-destructive'}>
                    {Math.abs(analytics.requestsTrend).toFixed(1)}%
                  </span>
                  <span className="mr-1">מהתקופה הקודמת</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">עלות כללית</CardTitle>
            <CurrencyDollar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{analytics.totalCost.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics.costTrend !== 0 && (
                <>
                  {analytics.costTrend > 0 ? (
                    <ArrowUp className="text-warning ml-1" size={14} />
                  ) : (
                    <ArrowDown className="text-success ml-1" size={14} />
                  )}
                  <span className={analytics.costTrend > 0 ? 'text-warning' : 'text-success'}>
                    {Math.abs(analytics.costTrend).toFixed(1)}%
                  </span>
                  <span className="mr-1">מהתקופה הקודמת</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">זמן תגובה ממוצע</CardTitle>
            <ChartLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgResponseTime.toFixed(0)}ms</div>
            <Progress 
              value={Math.min((analytics.avgResponseTime / 2000) * 100, 100)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">אחוז הצלחה</CardTitle>
            <TrendUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
            <Progress 
              value={analytics.successRate} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="by-api">לפי API</TabsTrigger>
          <TabsTrigger value="trends">מגמות</TabsTrigger>
          <TabsTrigger value="details">פירוט מלא</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>התפלגות בקשות לפי API</CardTitle>
                <CardDescription>סה"כ {analytics.totalRequests} בקשות</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.byAPI}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ apiName, requests }) => 
                        `${API_CONFIGS[apiName as keyof typeof API_CONFIGS]?.name}: ${requests}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="requests"
                    >
                      {analytics.byAPI.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={API_CONFIGS[entry.apiName as keyof typeof API_CONFIGS]?.color || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>התפלגות עלויות לפי API</CardTitle>
                <CardDescription>סה"כ ₪{analytics.totalCost.toFixed(2)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.byAPI}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ apiName, cost }) => 
                        `${API_CONFIGS[apiName as keyof typeof API_CONFIGS]?.name}: ₪${cost.toFixed(2)}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                    >
                      {analytics.byAPI.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={API_CONFIGS[entry.apiName as keyof typeof API_CONFIGS]?.color || COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-api" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {analytics.byAPI.map(api => {
              const config = API_CONFIGS[api.apiName as keyof typeof API_CONFIGS]
              return (
                <Card key={api.apiName}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: config.color }}
                          />
                          {config.name}
                        </CardTitle>
                        <CardDescription>{config.description}</CardDescription>
                      </div>
                      <Badge variant="outline">תעריף בסיס: ₪{config.baseRate}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">בקשות</div>
                        <div className="text-2xl font-bold">{api.requests.toLocaleString('he-IL')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">עלות</div>
                        <div className="text-2xl font-bold">₪{api.cost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">זמן תגובה ממוצע</div>
                        <div className="text-2xl font-bold">{api.avgResponseTime.toFixed(0)}ms</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">אחוז הצלחה</div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                          {api.successRate.toFixed(1)}%
                          {api.successRate < 90 && <Warning className="text-warning" size={18} />}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>מגמת בקשות יומית</CardTitle>
              <CardDescription>מספר בקשות לאורך זמן</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="requests" stroke="#6366f1" name="בקשות" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>מגמת עלויות יומית</CardTitle>
              <CardDescription>עלויות מצטברות לאורך זמן</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cost" fill="#10b981" name="עלות (₪)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פירוט בקשות אחרונות</CardTitle>
              <CardDescription>
                {filteredData.length} בקשות מתוך {(usageData || []).length} סה"כ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredData.slice(0, 50).map(record => {
                  const config = API_CONFIGS[record.apiName as keyof typeof API_CONFIGS]
                  return (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: config?.color || '#999' }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{config?.name || record.apiName}</div>
                          <div className="text-sm text-muted-foreground">{record.endpoint}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{record.responseTime.toFixed(0)}ms</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(record.timestamp), 'dd/MM HH:mm')}
                          </div>
                        </div>
                        
                        <Badge 
                          variant={record.status === 'success' ? 'default' : 'destructive'}
                          className="w-20 justify-center"
                        >
                          {record.status === 'success' ? 'הצלחה' : 
                           record.status === 'error' ? 'שגיאה' : 'פג זמן'}
                        </Badge>
                        
                        <div className="text-right w-20">
                          <div className="font-bold">₪{record.cost.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
