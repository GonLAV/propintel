import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { RentalTransaction, RentalAnalysis } from '@/lib/rentalTypes'
import { calculateRentalComparables } from '@/lib/rentalEngine'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Calculator,
  TrendUp,
  TrendDown,
  Minus,
  MapPin,
  House,
  Ruler,
  CheckCircle,
  WarningCircle,
  ChartBar
} from '@phosphor-icons/react'
import { toast } from 'sonner'

export function RentalAnalyzer() {
  const [rentalData] = useKV<RentalTransaction[]>('rental-transactions', [])
  const [analysis, setAnalysis] = useState<RentalAnalysis | null>(null)

  const [subjectProperty, setSubjectProperty] = useState({
    address: '',
    city: '',
    neighborhood: '',
    area: 0,
    propertyType: 'apartment',
    rooms: 0,
    floor: 0,
    condition: 'good',
    hasElevator: false,
    hasParking: false,
    builtYear: new Date().getFullYear()
  })

  const handleAnalyze = () => {
    if (!rentalData || rentalData.length === 0) {
      toast.error('אין נתוני שכירות במערכת')
      return
    }

    if (!subjectProperty.address || !subjectProperty.city || subjectProperty.area === 0) {
      toast.error('אנא מלא את כל השדות הנדרשים')
      return
    }

    const result = calculateRentalComparables(subjectProperty, rentalData)
    setAnalysis(result)
    toast.success('ניתוח הושלם בהצלחה')
  }

  const uniqueCities = Array.from(new Set((rentalData || []).map(t => t.city))).sort()

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">ניתוח שכירות משוערת</h1>
        <p className="text-muted-foreground mt-1">
          חישוב שכר דירה משוער על בסיס עסקאות דומות
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי הנכס לשומה</CardTitle>
          <CardDescription>הזן את פרטי הנכס לניתוח</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>כתובת מלאה *</Label>
              <Input
                placeholder="רחוב, מספר בית, דירה"
                value={subjectProperty.address}
                onChange={(e) => setSubjectProperty(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>עיר *</Label>
              <Select 
                value={subjectProperty.city} 
                onValueChange={(value) => setSubjectProperty(prev => ({ ...prev, city: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר עיר" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCities.length > 0 ? (
                    uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="תל אביב">תל אביב</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>שכונה *</Label>
              <Input
                placeholder="שם השכונה"
                value={subjectProperty.neighborhood}
                onChange={(e) => setSubjectProperty(prev => ({ ...prev, neighborhood: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>שטח (מ"ר) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={subjectProperty.area || ''}
                onChange={(e) => setSubjectProperty(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>חדרים</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="0"
                value={subjectProperty.rooms || ''}
                onChange={(e) => setSubjectProperty(prev => ({ ...prev, rooms: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>קומה</Label>
              <Input
                type="number"
                placeholder="0"
                value={subjectProperty.floor || ''}
                onChange={(e) => setSubjectProperty(prev => ({ ...prev, floor: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>סוג נכס</Label>
              <Select 
                value={subjectProperty.propertyType} 
                onValueChange={(value) => setSubjectProperty(prev => ({ ...prev, propertyType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">דירה</SelectItem>
                  <SelectItem value="house">בית פרטי</SelectItem>
                  <SelectItem value="commercial">מסחרי</SelectItem>
                  <SelectItem value="office">משרד</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>מצב</Label>
              <Select 
                value={subjectProperty.condition} 
                onValueChange={(value) => setSubjectProperty(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">חדש</SelectItem>
                  <SelectItem value="renovated">משופץ</SelectItem>
                  <SelectItem value="good">טוב</SelectItem>
                  <SelectItem value="fair">בינוני</SelectItem>
                  <SelectItem value="poor">זקוק לשיפוץ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>שנת בנייה</Label>
              <Input
                type="number"
                placeholder="2020"
                value={subjectProperty.builtYear || ''}
                onChange={(e) => setSubjectProperty(prev => ({ ...prev, builtYear: parseInt(e.target.value) || new Date().getFullYear() }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subjectProperty.hasElevator}
                  onChange={(e) => setSubjectProperty(prev => ({ ...prev, hasElevator: e.target.checked }))}
                  className="rounded"
                />
                יש מעלית
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subjectProperty.hasParking}
                  onChange={(e) => setSubjectProperty(prev => ({ ...prev, hasParking: e.target.checked }))}
                  className="rounded"
                />
                יש חניה
              </Label>
            </div>
          </div>

          <Button onClick={handleAnalyze} className="w-full" size="lg">
            <Calculator className="ml-2" />
            חשב שכירות משוערת
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-6">
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-2xl">תוצאות ניתוח</CardTitle>
              <CardDescription>שכירות משוערת על בסיס {analysis.comparables.length} עסקאות דומות</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted">
                  <CardHeader className="pb-3">
                    <CardDescription>טווח שכירות נמוך</CardDescription>
                    <CardTitle className="text-3xl">₪{analysis.recommendedRent.low.toLocaleString('he-IL')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">לחודש</p>
                  </CardContent>
                </Card>

                <Card className="bg-primary text-primary-foreground">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-primary-foreground/80">שכירות מומלצת</CardDescription>
                    <CardTitle className="text-4xl">₪{analysis.recommendedRent.mid.toLocaleString('he-IL')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {analysis.recommendedRent.confidence === 'high' && (
                        <Badge variant="secondary" className="bg-success">
                          <CheckCircle size={14} className="ml-1" />
                          ביטחון גבוה
                        </Badge>
                      )}
                      {analysis.recommendedRent.confidence === 'medium' && (
                        <Badge variant="secondary" className="bg-warning text-warning-foreground">
                          <WarningCircle size={14} className="ml-1" />
                          ביטחון בינוני
                        </Badge>
                      )}
                      {analysis.recommendedRent.confidence === 'low' && (
                        <Badge variant="secondary" className="bg-destructive">
                          <WarningCircle size={14} className="ml-1" />
                          ביטחון נמוך
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted">
                  <CardHeader className="pb-3">
                    <CardDescription>טווח שכירות גבוה</CardDescription>
                    <CardTitle className="text-3xl">₪{analysis.recommendedRent.high.toLocaleString('he-IL')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">לחודש</p>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  <strong>הנמקה:</strong> {analysis.recommendedRent.reasoning}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ChartBar />
                  סטטיסטיקות שוק
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ממוצע</p>
                    <p className="text-xl font-bold">₪{Math.round(analysis.statistics.averageRent).toLocaleString('he-IL')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">חציון</p>
                    <p className="text-xl font-bold">₪{Math.round(analysis.statistics.medianRent).toLocaleString('he-IL')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">מינימום</p>
                    <p className="text-xl font-bold">₪{Math.round(analysis.statistics.minRent).toLocaleString('he-IL')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">מקסימום</p>
                    <p className="text-xl font-bold">₪{Math.round(analysis.statistics.maxRent).toLocaleString('he-IL')}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {analysis.marketTrend.direction === 'increasing' && <TrendUp className="text-success" />}
                  {analysis.marketTrend.direction === 'decreasing' && <TrendDown className="text-destructive" />}
                  {analysis.marketTrend.direction === 'stable' && <Minus className="text-muted-foreground" />}
                  מגמת שוק ({analysis.marketTrend.period})
                </h3>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {analysis.marketTrend.direction === 'increasing' && 'מחירים עולים'}
                      {analysis.marketTrend.direction === 'decreasing' && 'מחירים יורדים'}
                      {analysis.marketTrend.direction === 'stable' && 'שוק יציב'}
                    </span>
                    <Badge variant={
                      analysis.marketTrend.direction === 'increasing' ? 'default' :
                      analysis.marketTrend.direction === 'decreasing' ? 'destructive' :
                      'secondary'
                    }>
                      {analysis.marketTrend.changePercent > 0 ? '+' : ''}{analysis.marketTrend.changePercent}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>עסקאות השוואה</CardTitle>
              <CardDescription>עסקאות דומות שנמצאו במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>כתובת</TableHead>
                      <TableHead>שכונה</TableHead>
                      <TableHead>שטח</TableHead>
                      <TableHead>חדרים</TableHead>
                      <TableHead>שכירות מקורית</TableHead>
                      <TableHead>התאמות</TableHead>
                      <TableHead>שכירות מותאמת</TableHead>
                      <TableHead>₪/מ"ר</TableHead>
                      <TableHead>דמיון</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.comparables.map((comp, _idx) => (
                      <TableRow key={comp.transaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-muted-foreground" />
                            {comp.transaction.address}
                          </div>
                        </TableCell>
                        <TableCell>{comp.transaction.neighborhood}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Ruler size={14} className="text-muted-foreground" />
                            {comp.transaction.area} מ"ר
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <House size={14} className="text-muted-foreground" />
                            {comp.transaction.rooms || '-'}
                          </div>
                        </TableCell>
                        <TableCell>₪{comp.transaction.monthlyRent.toLocaleString('he-IL')}</TableCell>
                        <TableCell>
                          <Badge variant={comp.adjustments.total > 0 ? 'default' : comp.adjustments.total < 0 ? 'destructive' : 'secondary'}>
                            {comp.adjustments.total > 0 ? '+' : ''}{comp.adjustments.total.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">
                          ₪{Math.round(comp.adjustedRent).toLocaleString('he-IL')}
                        </TableCell>
                        <TableCell>
                          ₪{Math.round(comp.adjustedRentPerSqm).toLocaleString('he-IL')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${comp.similarity}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{Math.round(comp.similarity)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>פירוט התאמות</CardTitle>
              <CardDescription>התאמות שבוצעו לכל עסקה</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {analysis.comparables.slice(0, 5).map((comp, _idx) => (
                    <div key={comp.transaction.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{comp.transaction.address}</h4>
                        <Badge>דמיון: {Math.round(comp.similarity)}%</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">התאמת שטח</p>
                          <p className="font-medium">{comp.adjustments.area > 0 ? '+' : ''}{comp.adjustments.area.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">התאמת קומה</p>
                          <p className="font-medium">{comp.adjustments.floor > 0 ? '+' : ''}{comp.adjustments.floor.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">התאמת גיל</p>
                          <p className="font-medium">{comp.adjustments.age > 0 ? '+' : ''}{comp.adjustments.age.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">התאמת מצב</p>
                          <p className="font-medium">{comp.adjustments.condition > 0 ? '+' : ''}{comp.adjustments.condition.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">התאמת מאפיינים</p>
                          <p className="font-medium">{comp.adjustments.features > 0 ? '+' : ''}{comp.adjustments.features.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">התאמת מיקום</p>
                          <p className="font-medium">{comp.adjustments.location > 0 ? '+' : ''}{comp.adjustments.location.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">התאמת זמן</p>
                          <p className="font-medium">{comp.adjustments.time > 0 ? '+' : ''}{comp.adjustments.time.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground font-semibold">סה"כ</p>
                          <p className="font-bold text-primary">{comp.adjustments.total > 0 ? '+' : ''}{comp.adjustments.total.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
