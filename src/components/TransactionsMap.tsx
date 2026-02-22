import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { MagnifyingGlass, MapPin, Funnel, X, Buildings, ChartBar, MapTrifold } from '@phosphor-icons/react'
import { NadlanGovAPI, NadlanTransaction, NadlanSearchParams } from '@/lib/nadlanGovAPI'
import * as d3 from 'd3'

const ISRAEL_CITIES = [
  'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 
  'אשדוד', 'נתניה', 'בני ברק', 'חולון', 'רמת גן', 'אשקלון', 'רחובות',
  'בת ים', 'כפר סבא', 'הרצליה', 'חדרה', 'מודיעין', 'נצרת', 'רעננה',
  'לוד', 'רמלה', 'קריית אתא', 'נהריה', 'גבעתיים', 'קריית גת', 'כרמיאל',
  'יבנה', 'אור יהודה', 'טבריה', 'עכו', 'אילת', 'קריית ים', 'קריית ביאליק',
  'קריית מוצקין', 'קריית שמונה', 'מעלה אדומים', 'אריאל', 'בית שמש',
  'רמת השרון', 'הוד השרון', 'גדרה', 'יקנעם', 'מגדל העמק', 'שדרות',
  'דימונה', 'עפולה', 'אופקים', 'צפת', 'בית שאן'
]

const PROPERTY_TYPES = [
  { value: 'all', label: 'כל סוגי הנכסים' },
  { value: 'apartment', label: 'דירה' },
  { value: 'house', label: 'בית פרטי' },
  { value: 'penthouse', label: 'פנטהאוז' },
  { value: 'garden', label: 'דירת גן' },
  { value: 'duplex', label: 'דופלקס' },
  { value: 'office', label: 'משרד' },
  { value: 'commercial', label: 'מסחרי' },
  { value: 'land', label: 'קרקע' }
]

interface IsraelMapPoint {
  city: string
  lat: number
  lng: number
  x?: number
  y?: number
}

const ISRAEL_MAP_POINTS: IsraelMapPoint[] = [
  { city: 'תל אביב', lat: 32.0853, lng: 34.7818 },
  { city: 'ירושלים', lat: 31.7683, lng: 35.2137 },
  { city: 'חיפה', lat: 32.7940, lng: 34.9896 },
  { city: 'באר שבע', lat: 31.2530, lng: 34.7915 },
  { city: 'ראשון לציון', lat: 31.9730, lng: 34.7925 },
  { city: 'פתח תקווה', lat: 32.0871, lng: 34.8875 },
  { city: 'אשדוד', lat: 31.8044, lng: 34.6553 },
  { city: 'נתניה', lat: 32.3215, lng: 34.8532 },
  { city: 'בני ברק', lat: 32.0809, lng: 34.8338 },
  { city: 'חולון', lat: 32.0114, lng: 34.7742 },
  { city: 'רמת גן', lat: 32.0719, lng: 34.8237 },
  { city: 'אשקלון', lat: 31.6688, lng: 34.5742 },
  { city: 'רחובות', lat: 31.8914, lng: 34.8078 },
  { city: 'בת ים', lat: 32.0192, lng: 34.7506 },
  { city: 'הרצליה', lat: 32.1624, lng: 34.8443 },
  { city: 'כפר סבא', lat: 32.1742, lng: 34.9076 },
  { city: 'חדרה', lat: 32.4344, lng: 34.9181 },
  { city: 'מודיעין', lat: 31.8970, lng: 35.0105 },
  { city: 'נצרת', lat: 32.7046, lng: 35.2978 },
  { city: 'רעננה', lat: 32.1847, lng: 34.8706 },
  { city: 'לוד', lat: 31.9522, lng: 34.8885 },
  { city: 'רמלה', lat: 31.9294, lng: 34.8667 },
  { city: 'עכו', lat: 32.9275, lng: 35.0832 },
  { city: 'נהריה', lat: 33.0079, lng: 35.0943 },
  { city: 'טבריה', lat: 32.7922, lng: 35.5308 },
  { city: 'אילת', lat: 29.5577, lng: 34.9519 },
  { city: 'צפת', lat: 32.9658, lng: 35.4983 },
  { city: 'בית שמש', lat: 31.7525, lng: 34.9885 },
  { city: 'קריית גת', lat: 31.6100, lng: 34.7642 },
  { city: 'קריית שמונה', lat: 33.2074, lng: 35.5697 },
  { city: 'עפולה', lat: 32.6078, lng: 35.2897 },
  { city: 'דימונה', lat: 31.0689, lng: 35.0322 },
  { city: 'אריאל', lat: 32.1056, lng: 35.1819 }
]

export function TransactionsMap() {
  const [transactions, setTransactions] = useState<NadlanTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [propertyType, setPropertyType] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minArea, setMinArea] = useState('')
  const [maxArea, setMaxArea] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<NadlanTransaction | null>(null)
  const [timeRange, setTimeRange] = useState(12)
  const [clusterTransactions, setClusterTransactions] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const nadlanAPI = useMemo(() => new NadlanGovAPI(), [])

  const searchTransactions = async () => {
    setLoading(true)
    try {
      const params: NadlanSearchParams = {}
      
      if (selectedCity && selectedCity !== 'all') params.city = selectedCity
      if (propertyType !== 'all') params.propertyType = propertyType
      if (minPrice) params.minPrice = parseInt(minPrice)
      if (maxPrice) params.maxPrice = parseInt(maxPrice)
      if (minArea) params.minArea = parseInt(minArea)
      if (maxArea) params.maxArea = parseInt(maxArea)
      
      const toDate = new Date()
      const fromDate = new Date()
      fromDate.setMonth(fromDate.getMonth() - timeRange)
      params.fromDate = fromDate.toISOString().split('T')[0]
      params.toDate = toDate.toISOString().split('T')[0]

      const results = await nadlanAPI.searchTransactions(params)
      setTransactions(results)
      
      toast.success(`נמצאו ${results.length} עסקאות מכל רחבי הארץ`, {
        description: selectedCity ? `עיר: ${selectedCity}` : 'כל הערים'
      })
    } catch (_error) {
      toast.error('שגיאה בטעינת נתונים', {
        description: 'אנא נסה שוב מאוחר יותר'
      })
    } finally {
      setLoading(false)
    }
  }

   
  useEffect(() => {
    searchTransactions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return
    
    const container = containerRef.current
    const width = container.clientWidth
    const height = 600

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    svg.attr('width', width).attr('height', height)

    const projection = d3.geoMercator()
      .center([35.2, 31.5])
      .scale(width * 25)
      .translate([width / 2, height / 2])

    const mapPoints = ISRAEL_MAP_POINTS.map(point => ({
      ...point,
      x: projection([point.lng, point.lat])?.[0] || 0,
      y: projection([point.lng, point.lat])?.[1] || 0
    }))

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString())
      })

    svg.call(zoom as any)

    const gradientBg = g.append('defs')
      .append('linearGradient')
      .attr('id', 'israel-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')

    gradientBg.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'oklch(0.20 0.03 265)')
      .attr('stop-opacity', 0.3)

    gradientBg.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'oklch(0.14 0.02 265)')
      .attr('stop-opacity', 0.5)

    const outline = [
      [35.0, 33.3],
      [34.2, 31.5],
      [34.3, 29.5],
      [35.5, 29.5],
      [35.9, 33.3],
      [35.0, 33.3]
    ]

    const pathGenerator = d3.line<[number, number]>()
      .x(d => projection(d)?.[0] || 0)
      .y(d => projection(d)?.[1] || 0)
      .curve(d3.curveBasis)

    g.append('path')
      .datum(outline)
      .attr('d', pathGenerator)
      .attr('fill', 'url(#israel-gradient)')
      .attr('stroke', 'oklch(0.65 0.25 265)')
      .attr('stroke-width', 2)
      .attr('opacity', 0.4)

    mapPoints.forEach(point => {
      g.append('circle')
        .attr('cx', point.x)
        .attr('cy', point.y)
        .attr('r', 2)
        .attr('fill', 'oklch(0.55 0.01 265)')
        .attr('opacity', 0.5)

      g.append('text')
        .attr('x', point.x)
        .attr('y', point.y - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', 'oklch(0.75 0.01 265)')
        .attr('font-size', '9px')
        .attr('opacity', 0.6)
        .text(point.city)
    })

    const transactionsWithCoords = transactions.filter(t => t.lat && t.lng)
    
    if (clusterTransactions && transactionsWithCoords.length > 0) {
      const cityGroups = d3.group(transactionsWithCoords, d => d.city)
      
      cityGroups.forEach((cityTransactions, city) => {
        const avgLat = d3.mean(cityTransactions, d => d.lat!) || 0
        const avgLng = d3.mean(cityTransactions, d => d.lng!) || 0
        const coords = projection([avgLng, avgLat])
        
        if (!coords) return

        const [x, y] = coords
        const count = cityTransactions.length
        const _avgPrice = d3.mean(cityTransactions, d => d.dealAmount) || 0
        const radius = Math.min(Math.sqrt(count) * 3 + 8, 40)

        const cluster = g.append('g')
          .attr('class', 'transaction-cluster')
          .style('cursor', 'pointer')

        cluster.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', radius)
          .attr('fill', 'oklch(0.65 0.25 265)')
          .attr('opacity', 0.15)
          .attr('stroke', 'oklch(0.65 0.25 265)')
          .attr('stroke-width', 2)

        cluster.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', radius * 0.7)
          .attr('fill', 'oklch(0.72 0.20 85)')
          .attr('opacity', 0.8)

        cluster.append('text')
          .attr('x', x)
          .attr('y', y - 2)
          .attr('text-anchor', 'middle')
          .attr('fill', 'oklch(0.12 0.015 265)')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .text(count)

        cluster.append('text')
          .attr('x', x)
          .attr('y', y + 8)
          .attr('text-anchor', 'middle')
          .attr('fill', 'oklch(0.12 0.015 265)')
          .attr('font-size', '8px')
          .text('עסקאות')

        cluster.on('click', () => {
          setSelectedTransaction(cityTransactions[0])
          setSelectedCity(city)
        })

        cluster.on('mouseenter', function() {
          d3.select(this).select('circle:nth-child(2)')
            .transition()
            .duration(200)
            .attr('r', radius * 0.8)
            .attr('opacity', 1)
        })

        cluster.on('mouseleave', function() {
          d3.select(this).select('circle:nth-child(2)')
            .transition()
            .duration(200)
            .attr('r', radius * 0.7)
            .attr('opacity', 0.8)
        })
      })
    } else {
      transactionsWithCoords.forEach((transaction) => {
        const coords = projection([transaction.lng!, transaction.lat!])
        if (!coords) return

        const [x, y] = coords

        const marker = g.append('g')
          .attr('class', 'transaction-marker')
          .style('cursor', 'pointer')

        marker.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', 6)
          .attr('fill', 'oklch(0.65 0.25 265)')
          .attr('stroke', 'oklch(0.96 0.005 265)')
          .attr('stroke-width', 2)
          .attr('opacity', 0.8)

        marker.on('click', () => {
          setSelectedTransaction(transaction)
        })

        marker.on('mouseenter', function() {
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', 8)
            .attr('opacity', 1)
        })

        marker.on('mouseleave', function() {
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', 6)
            .attr('opacity', 0.8)
        })
      })
    }

  }, [transactions, clusterTransactions])

  const transactionStats = useMemo(() => {
    if (transactions.length === 0) return null

    const totalDeals = transactions.length
    const avgPrice = d3.mean(transactions, t => t.dealAmount) || 0
    const avgPricePerMeter = d3.mean(transactions, t => t.pricePerMeter) || 0
    const cities = new Set(transactions.map(t => t.city)).size

    return {
      totalDeals,
      avgPrice,
      avgPricePerMeter,
      cities
    }
  }, [transactions])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MapTrifold className="text-primary" size={36} weight="duotone" />
            מפת עסקאות ארצית
          </h1>
          <p className="text-muted-foreground mt-2">
            עסקאות מקרקעין בזמן אמת מכל רחבי ישראל - נתונים מנדל״ן ממשלתי
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Funnel size={16} />
          {showFilters ? 'הסתר פילטרים' : 'הצג פילטרים'}
        </Button>
      </div>

      {transactionStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>סה״כ עסקאות</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{transactionStats.totalDeals.toLocaleString('he-IL')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>מחיר ממוצע</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                ₪{(transactionStats.avgPrice / 1000000).toFixed(2)}M
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>מחיר למ״ר</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                ₪{transactionStats.avgPricePerMeter.toLocaleString('he-IL')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>ערים מכוסות</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{transactionStats.cities}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {showFilters && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Funnel size={20} />
                סינון עסקאות
              </CardTitle>
              <CardDescription>חפש עסקאות לפי פרמטרים</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>עיר</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="כל הערים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הערים</SelectItem>
                    {ISRAEL_CITIES.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>סוג נכס</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>טווח זמן: {timeRange} חודשים אחרונים</Label>
                <Slider
                  value={[timeRange]}
                  onValueChange={([value]) => setTimeRange(value)}
                  min={1}
                  max={36}
                  step={1}
                  className="mt-2"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>מחיר (₪)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="מינימום"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    type="number"
                  />
                  <Input
                    placeholder="מקסימום"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    type="number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>שטח (מ״ר)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="מינימום"
                    value={minArea}
                    onChange={(e) => setMinArea(e.target.value)}
                    type="number"
                  />
                  <Input
                    placeholder="מקסימום"
                    value={maxArea}
                    onChange={(e) => setMaxArea(e.target.value)}
                    type="number"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="cluster-mode">קיבוץ לפי ערים</Label>
                <Switch
                  id="cluster-mode"
                  checked={clusterTransactions}
                  onCheckedChange={setClusterTransactions}
                />
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={searchTransactions} 
                  disabled={loading}
                  className="flex-1"
                >
                  <MagnifyingGlass size={16} />
                  {loading ? 'מחפש...' : 'חפש'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCity('')
                    setPropertyType('all')
                    setMinPrice('')
                    setMaxPrice('')
                    setMinArea('')
                    setMaxArea('')
                    setTimeRange(12)
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={showFilters ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin size={20} />
              מפת ישראל - {transactions.length} עסקאות
            </CardTitle>
            <CardDescription>
              לחץ על העיגולים למידע נוסף • גלגל עכבר לזום
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              ref={containerRef}
              className="relative bg-card border border-border rounded-lg overflow-hidden"
              style={{ height: '600px' }}
            >
              <svg ref={svgRef} className="w-full h-full" />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">טוען עסקאות מכל הארץ...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedTransaction && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Buildings size={20} />
                  פרטי עסקה - {selectedTransaction.city}
                </CardTitle>
                <CardDescription className="mt-1">
                  {selectedTransaction.street} {selectedTransaction.houseNumber || ''}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">מחיר עסקה</div>
                <div className="text-2xl font-bold text-primary">
                  ₪{(selectedTransaction.dealAmount / 1000000).toFixed(2)}M
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">מחיר למ״ר</div>
                <div className="text-2xl font-bold text-accent">
                  ₪{selectedTransaction.pricePerMeter.toLocaleString('he-IL')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">שטח</div>
                <div className="text-xl font-bold">{selectedTransaction.area} מ״ר</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">חדרים</div>
                <div className="text-xl font-bold">{selectedTransaction.rooms}</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={selectedTransaction.floor ? 'default' : 'secondary'}>
                  קומה: {selectedTransaction.floor || 'לא צוין'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedTransaction.buildYear ? 'default' : 'secondary'}>
                  שנת בניה: {selectedTransaction.buildYear || 'לא צוין'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedTransaction.parking ? 'default' : 'secondary'}>
                  {selectedTransaction.parking ? '✓ חניה' : '✗ חניה'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedTransaction.elevator ? 'default' : 'secondary'}>
                  {selectedTransaction.elevator ? '✓ מעלית' : '✗ מעלית'}
                </Badge>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">תאריך עסקה:</span>
                <span className="font-medium">
                  {new Date(selectedTransaction.dealDate).toLocaleDateString('he-IL')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">סוג עסקה:</span>
                <Badge>{selectedTransaction.dealType === 'sale' ? 'מכירה' : 'השכרה'}</Badge>
              </div>
              {selectedTransaction.verified && (
                <Badge variant="default" className="bg-success text-success-foreground">
                  ✓ מאומת ממשלתית
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBar size={20} />
              רשימת עסקאות ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {transactions.map((transaction, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                          <MapPin size={16} className="text-primary" />
                          {transaction.city} - {transaction.street}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {transaction.propertyType} • {transaction.area} מ״ר • {transaction.rooms} חדרים
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-primary">
                          ₪{(transaction.dealAmount / 1000000).toFixed(2)}M
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ₪{transaction.pricePerMeter.toLocaleString('he-IL')}/מ״ר
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
