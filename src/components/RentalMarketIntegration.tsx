import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CloudArrowDown, 
  CheckCircle,
  Database,
  Info,
  TrendUp,
  TrendDown,
  ArrowRight
} from '@phosphor-icons/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { RentalMarketAPI, type RentalIncomeEstimate } from '@/lib/rentalMarketAPI'

interface RentalMarketIntegrationProps {
  onIncomeUpdate?: (annualIncome: number, monthlyIncome: number) => void
  defaultCity?: string
  defaultPropertyType?: 'apartment' | 'house' | 'commercial' | 'office' | 'land'
  defaultArea?: number
  defaultRooms?: number
  showDetailedStats?: boolean
}

export function RentalMarketIntegration({
  onIncomeUpdate,
  defaultCity = 'תל אביב',
  defaultPropertyType = 'apartment',
  defaultArea = 90,
  defaultRooms = 3,
  showDetailedStats = true
}: RentalMarketIntegrationProps) {
  const [city, setCity] = useState(defaultCity)
  const [propertyType, setPropertyType] = useState<'apartment' | 'house' | 'commercial' | 'office' | 'land'>(defaultPropertyType)
  const [area, setArea] = useState(defaultArea.toString())
  const [rooms, setRooms] = useState(defaultRooms?.toString() || '')
  const [neighborhood, setNeighborhood] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rentalEstimate, setRentalEstimate] = useState<RentalIncomeEstimate | null>(null)

  const handleFetchRentalData = async () => {
    setIsLoading(true)
    try {
      const estimate = await RentalMarketAPI.getRentalIncomeEstimate(
        city,
        propertyType,
        parseFloat(area) || 90,
        rooms ? parseFloat(rooms) : undefined,
        neighborhood || undefined
      )
      
      setRentalEstimate(estimate)
      
      if (onIncomeUpdate) {
        onIncomeUpdate(estimate.annualRent, estimate.monthlyRent)
      }
      
      toast.success('נתוני שכירות נטענו מהשוק', {
        description: `${estimate.basedOnTransactions} עסקאות דומות נמצאו. רמת ביטחון: ${
          estimate.confidence === 'high' ? 'גבוהה' : 
          estimate.confidence === 'medium' ? 'בינונית' : 'נמוכה'
        }`
      })
    } catch (_error) {
      toast.error('שגיאה בטעינת נתוני שוק', {
        description: 'לא נמצאו נתונים מתאימים, אנא הזן ידנית'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database size={24} weight="duotone" className="text-primary" />
          אינטגרציה לנתוני שוק שכירות
        </CardTitle>
        <CardDescription>
          שלוף הכנסות שכירות מנתוני שוק אמיתיים (Nadlan.gov.il + מקורות נוספים)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info size={18} weight="duotone" />
          <AlertDescription>
            המערכת משתמשת בנתונים ממאגרי ממשלה ישראליים + נתונים סינטטיים ריאליסטיים לחישוב הכנסות שכירות משוערות
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rental-city">עיר</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger id="rental-city">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="תל אביב">תל אביב</SelectItem>
                <SelectItem value="ירושלים">ירושלים</SelectItem>
                <SelectItem value="חיפה">חיפה</SelectItem>
                <SelectItem value="באר שבע">באר שבע</SelectItem>
                <SelectItem value="רעננה">רעננה</SelectItem>
                <SelectItem value="נתניה">נתניה</SelectItem>
                <SelectItem value="רמת גן">רמת גן</SelectItem>
                <SelectItem value="פתח תקווה">פתח תקווה</SelectItem>
                <SelectItem value="הרצליה">הרצליה</SelectItem>
                <SelectItem value="רחובות">רחובות</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental-type">סוג נכס</Label>
            <Select value={propertyType} onValueChange={(v: any) => setPropertyType(v)}>
              <SelectTrigger id="rental-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">דירה</SelectItem>
                <SelectItem value="house">בית</SelectItem>
                <SelectItem value="office">משרד</SelectItem>
                <SelectItem value="commercial">מסחר</SelectItem>
                <SelectItem value="land">קרקע</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental-area">שטח (מ"ר)</Label>
            <Input
              id="rental-area"
              type="number"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="90"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental-rooms">חדרים</Label>
            <Input
              id="rental-rooms"
              type="number"
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
              placeholder="3"
              step="0.5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental-neighborhood">שכונה (אופציונלי)</Label>
            <Input
              id="rental-neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="רמת אביב"
            />
          </div>
        </div>

        <Button 
          onClick={handleFetchRentalData} 
          disabled={isLoading}
          className="w-full gap-2"
          size="lg"
        >
          <CloudArrowDown size={20} weight="duotone" />
          {isLoading ? 'טוען נתוני שוק...' : 'שלוף נתוני שכירות מהשוק'}
        </Button>

        {rentalEstimate && (
          <div className="space-y-4 mt-6">
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-background border-2 border-primary/30">
                <div className="text-xs text-muted-foreground mb-1">שכירות חודשית משוערת</div>
                <div className="text-2xl font-bold text-primary">
                  ₪{rentalEstimate.monthlyRent.toLocaleString('he-IL')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ₪{rentalEstimate.rentPerSqm.toFixed(0)}/מ"ר · 
                  ₪{rentalEstimate.annualRent.toLocaleString('he-IL')}/שנה
                </div>
              </div>

              <div className="p-4 rounded-lg bg-background border">
                <div className="text-xs text-muted-foreground mb-1">טווח שכירות חודשי</div>
                <div className="text-sm font-semibold flex items-center gap-1">
                  <span>₪{rentalEstimate.lowEstimate.toLocaleString('he-IL')}</span>
                  <ArrowRight size={14} />
                  <span>₪{rentalEstimate.highEstimate.toLocaleString('he-IL')}</span>
                </div>
                <Badge variant={
                  rentalEstimate.confidence === 'high' ? 'default' : 
                  rentalEstimate.confidence === 'medium' ? 'secondary' : 'outline'
                } className="mt-2">
                  <CheckCircle size={12} weight="fill" className="ml-1" />
                  {rentalEstimate.confidence === 'high' ? 'ביטחון גבוה' : 
                   rentalEstimate.confidence === 'medium' ? 'ביטחון בינוני' : 'ביטחון נמוך'}
                </Badge>
              </div>

              <div className="p-4 rounded-lg bg-background border">
                <div className="text-xs text-muted-foreground mb-1">מגמת שוק</div>
                <div className="flex items-center gap-2 mb-2">
                  {rentalEstimate.marketStats.marketTrend === 'rising' && (
                    <TrendUp size={20} weight="duotone" className="text-green-500" />
                  )}
                  {rentalEstimate.marketStats.marketTrend === 'falling' && (
                    <TrendDown size={20} weight="duotone" className="text-red-500" />
                  )}
                  {rentalEstimate.marketStats.marketTrend === 'stable' && (
                    <ArrowRight size={20} weight="duotone" className="text-yellow-500" />
                  )}
                  <Badge variant={
                    rentalEstimate.marketStats.marketTrend === 'rising' ? 'default' :
                    rentalEstimate.marketStats.marketTrend === 'falling' ? 'destructive' : 'secondary'
                  }>
                    {rentalEstimate.marketStats.marketTrend === 'rising' ? 'עולה' :
                     rentalEstimate.marketStats.marketTrend === 'falling' ? 'יורד' : 'יציב'}
                  </Badge>
                </div>
                <div className="text-sm font-semibold">
                  {rentalEstimate.marketStats.trendPercentage > 0 ? '+' : ''}
                  {rentalEstimate.marketStats.trendPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  מבוסס על {rentalEstimate.basedOnTransactions} עסקאות
                </div>
              </div>
            </div>

            {showDetailedStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground">ממוצע שוק</div>
                  <div className="text-sm font-semibold">
                    ₪{rentalEstimate.marketStats.averageRent.toLocaleString('he-IL')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground">חציון</div>
                  <div className="text-sm font-semibold">
                    ₪{rentalEstimate.marketStats.medianRent.toLocaleString('he-IL')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground">מינימום</div>
                  <div className="text-sm font-semibold">
                    ₪{rentalEstimate.marketStats.minRent.toLocaleString('he-IL')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground">מקסימום</div>
                  <div className="text-sm font-semibold">
                    ₪{rentalEstimate.marketStats.maxRent.toLocaleString('he-IL')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
