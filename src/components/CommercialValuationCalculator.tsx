import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { 
  Storefront, 
  Calculator as CalcIcon, 
  Info,
  CloudArrowDown,
  TrendUp
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { 
  CommercialProperty, 
  CommercialComparable, 
  CommercialValuationResult,
  CommercialValuationCalculator as ValuationEngine
} from '@/lib/calculators/commercialValuationCalculator'
import { realIsraeliGovDataAPI, type NationalTransactionData } from '@/lib/realIsraeliGovDataAPI'
import { RentalYieldAnalysis } from '@/components/RentalYieldAnalysis'
import { uid } from '@/lib/utils'

export function CommercialValuationCalculator() {
  const [property, setProperty] = useState<Partial<CommercialProperty>>({
    address: '',
    city: 'תל אביב',
    area: 'מרכז',
    totalArea: 80,
    floor: 1,
    condition: 'good',
    buildYear: 2015,
    propertyType: 'retail',
    hasParkingSpots: false,
    hasShopWindow: true,
    cornerLocation: false,
    pedestrianTraffic: 'medium',
    vehicularAccess: true,
    hasKitchen: false,
    hasRestroom: true,
    hasAirConditioning: true,
    hasSecuritySystem: false,
    zoning: 'retail',
    currentUse: 'rented'
  })

  const [comparables, setComparables] = useState<Partial<CommercialComparable>[]>([])
  const [result, setResult] = useState<CommercialValuationResult | null>(null)
  const [isLoadingNadlan, setIsLoadingNadlan] = useState(false)
  const [nadlanTransactions, setNadlanTransactions] = useState<NationalTransactionData[]>([])
  const [showNadlanResults, setShowNadlanResults] = useState(false)
  const [selectedDistrict, _setSelectedDistrict] = useState<string>('all')

  const handleFetchNadlanTransactions = async () => {
    setIsLoadingNadlan(true)
    try {
      const cities = property.city ? [property.city] : undefined
      const districts = selectedDistrict && selectedDistrict !== 'all' ? [selectedDistrict] : undefined
      
      const searchParams = {
        cities,
        districts,
        propertyTypes: ['חנות', 'משרד', 'מסחרי'],
        minArea: property.totalArea ? property.totalArea * 0.7 : 40,
        maxArea: property.totalArea ? property.totalArea * 1.3 : 150,
        fromDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        verifiedOnly: true,
        limit: 50
      }

      const transactions = await realIsraeliGovDataAPI.searchNationalTransactions(searchParams)
      const statistics = realIsraeliGovDataAPI.calculateNationalStatistics(transactions)
      
      if (transactions.length === 0) {
        toast.warning('לא נמצאו עסקאות')
      } else {
        setNadlanTransactions(transactions)
        setShowNadlanResults(true)
        toast.success(`נמצאו ${transactions.length} עסקאות מסחריות מכל רחבי ישראל! 🇮🇱`, {
          description: `מחיר ממוצע: ₪${statistics.avgPricePerSqm.toLocaleString()}/מ"ר`,
          duration: 6000
        })
      }
    } catch (_error) {
      toast.error('שגיאה בשליפת נתונים')
    } finally {
      setIsLoadingNadlan(false)
    }
  }

  const handleAddNadlanTransaction = (transaction: NationalTransactionData) => {
    const newComparable: Partial<CommercialComparable> = {
      id: transaction.dealId,
      address: `${transaction.street} ${transaction.houseNumber || ''}, ${transaction.city}, ${transaction.districtHe}`.trim(),
      salePrice: transaction.dealAmount,
      pricePerSqm: transaction.pricePerMeter,
      saleDate: transaction.dealDate,
      area: transaction.area,
      floor: transaction.floor,
      propertyType: 'retail',
      condition: transaction.renovated ? 'excellent' : transaction.conditionHe === 'חדש' ? 'excellent' : 'good',
      buildYear: transaction.buildYear,
      parkingSpaces: transaction.parking ? 1 : 0,
      cornerLocation: false,
      distance: 0
    }

    setComparables(prev => [...prev, newComparable])
    toast.success(`עסקה נוספה מ${transaction.city}`)
  }

  const handleCalculate = () => {
    try {
      if (comparables.length === 0) {
        toast.error('נדרשות לפחות עסקה אחת להשוואה')
        return
      }

      const calculationResult = ValuationEngine.calculateComparableSalesValue(
        property as CommercialProperty,
        comparables
      )

      setResult(calculationResult)
      toast.success('החישוב הושלם בהצלחה')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בחישוב')
    }
  }

  const addComparable = () => {
    setComparables([...comparables, {
      id: uid('comm-val'),
      address: '',
      salePrice: 0,
      pricePerSqm: 0,
      saleDate: new Date().toISOString().split('T')[0],
      area: 80,
      propertyType: 'retail',
      condition: 'good',
      cornerLocation: false,
      distance: 0
    }])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <Storefront className="w-8 h-8 text-primary" weight="duotone" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">מחשבון שווי נכסי מסחר</h1>
          <p className="text-muted-foreground">חישוב שווי מקצועי לנכסי מסחר</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-accent/10 border-2 border-accent/30">
        <div className="flex gap-3">
          <Info className="w-6 h-6 text-accent shrink-0 mt-0.5" weight="duotone" />
          <div>
            <h3 className="font-bold text-accent text-lg">שליפה ממקור ממשלתי לפי דרישה</h3>
            <p className="text-sm mt-1">
              מוצגות רק עסקאות שהתקבלו בפועל ממקור מוגדר. במקרה כשל לא נוצרים נתוני דמה וניתן להזין עסקאות ידנית.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="property" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="property">פרטי הנכס</TabsTrigger>
          <TabsTrigger value="comparables">עסקאות השוואה</TabsTrigger>
          <TabsTrigger value="results">תוצאות</TabsTrigger>
        </TabsList>

        <TabsContent value="property" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>פרטים בסיסיים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>עיר</Label>
                  <Input value={property.city || ''} onChange={(e) => setProperty({ ...property, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>רחוב</Label>
                  <Input value={property.address || ''} onChange={(e) => setProperty({ ...property, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>שטח (מ״ר)</Label>
                  <Input type="number" value={property.totalArea || ''} onChange={(e) => setProperty({ ...property, totalArea: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>סוג נכס</Label>
                  <Select value={property.propertyType || 'retail'} onValueChange={(value) => setProperty({ ...property, propertyType: value as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">חנות</SelectItem>
                      <SelectItem value="restaurant">מסעדה</SelectItem>
                      <SelectItem value="warehouse">מחסן</SelectItem>
                      <SelectItem value="clinic">מרפאה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <Label>פינת רחוב</Label>
                  <Switch checked={property.cornerLocation} onCheckedChange={(checked) => setProperty({ ...property, cornerLocation: checked })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>חלון ראווה</Label>
                  <Switch checked={property.hasShopWindow} onCheckedChange={(checked) => setProperty({ ...property, hasShopWindow: checked })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparables" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>עסקאות השוואה</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleFetchNadlanTransactions} disabled={isLoadingNadlan} className="gap-2">
                    <CloudArrowDown size={20} weight="duotone" />
                    {isLoadingNadlan ? 'שולף...' : 'שלוף מנדל"ן'}
                  </Button>
                  <Button onClick={addComparable} variant="outline">הוסף ידנית</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showNadlanResults && nadlanTransactions.length > 0 && (
                <div className="space-y-2 p-4 bg-accent/5 rounded-lg border mb-4">
                  <h4 className="font-semibold">נמצאו {nadlanTransactions.length} עסקאות מנדל"ן</h4>
                  {nadlanTransactions.slice(0, 5).map(transaction => (
                    <div key={transaction.dealId} className="flex items-center justify-between p-3 bg-background rounded border">
                      <div>
                        <div className="font-medium">{transaction.street}, {transaction.city}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.area} מ״ר • {transaction.pricePerMeter.toLocaleString()} ₪/מ״ר
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleAddNadlanTransaction(transaction)}>הוסף</Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {comparables.length} עסקאות השוואה
              </p>
            </CardContent>
          </Card>
          <Button onClick={handleCalculate} size="lg" className="w-full" disabled={comparables.length === 0}>
            <CalcIcon size={24} weight="duotone" />
            חשב שווי
          </Button>
        </TabsContent>

        <TabsContent value="results">
          {result ? (
            <>
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendUp className="text-primary" size={28} weight="duotone" />
                    שווי משוער
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-primary">₪{result.adjustedValue.toLocaleString()}</div>
                    <div className="text-xl text-muted-foreground mt-2">₪{result.valuePerSqm.toLocaleString()} למ״ר</div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">טווח שווי</div>
                      <div className="font-semibold">₪{result.valueRange.min.toLocaleString()} - ₪{result.valueRange.max.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">רמת ביטחון</div>
                      <Badge>{Math.round(result.confidence * 100)}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <RentalYieldAnalysis
                propertyValue={result.adjustedValue}
                propertyType="commercial"
                autoCalculate={false}
                showAdvancedSettings={true}
                className="mt-6"
              />
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <p>לא בוצע חישוב</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
