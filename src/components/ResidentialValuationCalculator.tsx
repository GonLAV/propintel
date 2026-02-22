import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Buildings,
  Calculator as CalcIcon,
  CloudArrowDown,
  CheckCircle,
  X,
  TrendUp,
  Warning,
  MapPin,
  Ruler,
  Wrench,
  Elevator,
  Car,
  Sun,
  Package,
  ArrowRight,
  Sparkle,
  MagnifyingGlass,
  Plus,
  Lightning,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  ResidentialProperty,
  ResidentialComparable,
  ResidentialValuationResult,
  ResidentialValuationCalculator as ValuationEngine
} from '@/lib/calculators/residentialValuationCalculator'
import { realIsraeliGovDataAPI, type NationalTransactionData } from '@/lib/realIsraeliGovDataAPI'
import { RentalYieldAnalysis } from '@/components/RentalYieldAnalysis'
import { createLogger } from '@/lib/logger'

const log = createLogger('ResidentialValuationCalculator')

/* ── Helper: join class names ────────────────────────────────────── */
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

/* ── Workflow step indicator ─────────────────────────────────────── */
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'פרטי נכס', desc: 'מיקום ומאפיינים' },
    { num: 2, label: 'עסקאות', desc: 'נתונים להשוואה' },
    { num: 3, label: 'תוצאות', desc: 'שווי משוער' },
  ]

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-300',
                currentStep === step.num
                  ? 'bg-primary text-white shadow-[0_2px_8px_oklch(0.52_0.21_258/0.35)]'
                  : currentStep > step.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > step.num ? <CheckCircle size={16} weight="bold" /> : step.num}
            </div>
            <div className="hidden sm:block">
              <div className={cn(
                'text-[13px] font-medium transition-colors',
                currentStep === step.num ? 'text-foreground' : 'text-muted-foreground'
              )}>{step.label}</div>
              <div className="text-[11px] text-muted-foreground/60">{step.desc}</div>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'h-px w-8 sm:w-16 transition-colors duration-300',
              currentStep > step.num ? 'bg-emerald-400' : 'bg-border'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Helper text under fields ────────────────────────────────────── */
function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{children}</p>
}

/* ── Section card wrapper ────────────────────────────────────────── */
function SectionCard({ title, description, icon, children, className }: {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary shrink-0">
              {icon}
            </div>
          )}
          <div>
            <CardTitle className="text-[16px] font-semibold text-foreground">{title}</CardTitle>
            {description && (
              <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/* ── Amenity toggle with helper hint ─────────────────────────────── */
function AmenityToggle({ label, hint, checked, onChange, icon }: {
  label: string
  hint: string
  checked?: boolean
  onChange: (checked: boolean) => void
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <Switch checked={checked} onCheckedChange={onChange} />
      <div className="flex items-center gap-3 flex-1 mr-3 text-right">
        <div>
          <div className="text-[14px] font-medium text-foreground">{label}</div>
          <div className="text-[12px] text-muted-foreground">{hint}</div>
        </div>
        <div className="text-muted-foreground/40">{icon}</div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════════════════ */
export function ResidentialValuationCalculator() {
  const [activeStep, setActiveStep] = useState(1)
  const [property, setProperty] = useState<Partial<ResidentialProperty>>({
    address: '',
    city: 'תל אביב',
    area: 90,
    rooms: 3,
    floor: 3,
    totalFloors: 5,
    condition: 'good',
    buildYear: 2010,
    hasElevator: true,
    hasParkingSpot: false,
    hasBalcony: true,
    hasStorage: false,
    hasPenthouse: false,
    hasGarden: false,
    propertyType: 'apartment'
  })

  const [comparables, setComparables] = useState<Partial<ResidentialComparable>[]>([])
  const [result, setResult] = useState<ResidentialValuationResult | null>(null)
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
        propertyTypes: ['דירה', 'דירת גן', 'פנטהאוז'],
        minArea: property.area ? property.area * 0.8 : 60,
        maxArea: property.area ? property.area * 1.2 : 120,
        fromDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        verifiedOnly: false,
        limit: 50
      }

      log.info('[ResidentialValuation] 🇮🇱 Fetching transactions from all over Israel:', searchParams)
      const transactions = await realIsraeliGovDataAPI.searchNationalTransactions(searchParams)
      
      const statistics = realIsraeliGovDataAPI.calculateNationalStatistics(transactions)
      
      if (transactions.length === 0) {
        toast.warning('לא נמצאו עסקאות', {
          description: 'נסה להרחיב את קריטריוני החיפוש — שנה עיר או הגדל טווח שטח'
        })
      } else {
        setNadlanTransactions(transactions)
        setShowNadlanResults(true)
        
        const citiesFound = Object.keys(statistics.byCity).length
        const districtsFound = Object.keys(statistics.byDistrict).length
        
        toast.success(`נמצאו ${transactions.length} עסקאות דירות מכל רחבי ישראל! 🇮🇱`, {
          description: `${citiesFound} ערים | ${districtsFound} מחוזות | מחיר ממוצע: ₪${statistics.avgPricePerSqm.toLocaleString()}/מ"ר`,
          duration: 6000
        })
      }
    } catch (error) {
      log.error('Failed to fetch transactions:', error)
      toast.error('שגיאה בשליפת נתונים')
    } finally {
      setIsLoadingNadlan(false)
    }
  }

  const handleAddNadlanTransaction = (transaction: NationalTransactionData) => {
    const newComparable: Partial<ResidentialComparable> = {
      id: transaction.dealId,
      address: `${transaction.street} ${transaction.houseNumber || ''}, ${transaction.city}, ${transaction.districtHe}`.trim(),
      salePrice: transaction.dealAmount,
      pricePerSqm: transaction.pricePerMeter,
      saleDate: transaction.dealDate,
      area: transaction.area,
      rooms: transaction.rooms,
      floor: transaction.floor,
      condition: transaction.renovated ? 'excellent' : transaction.conditionHe === 'חדש' ? 'excellent' : 'good',
      buildYear: transaction.buildYear,
      hasElevator: transaction.elevator || false,
      hasParkingSpot: transaction.parking || false,
      hasBalcony: transaction.balcony || false,
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
        property as ResidentialProperty,
        comparables
      )

      setResult(calculationResult)
      setActiveStep(3)
      toast.success('החישוב הושלם בהצלחה')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בחישוב')
    }
  }

  const addComparable = () => {
    setComparables([
      ...comparables,
      {
        id: Date.now().toString(),
        address: '',
        salePrice: 0,
        pricePerSqm: 0,
        saleDate: new Date().toISOString().split('T')[0],
        area: 90,
        rooms: 3,
        floor: 3,
        condition: 'good',
        buildYear: 2010,
        hasElevator: true,
        hasParkingSpot: false,
        hasBalcony: true,
        distance: 0
      }
    ])
  }

  const removeComparable = (id: string) => {
    setComparables(comparables.filter(c => c.id !== id))
  }

  const updateComparable = (id: string, field: string, value: any) => {
    setComparables(comparables.map(c => {
      if (c.id === id) {
        const updated = { ...c, [field]: value }
        if (field === 'salePrice' && updated.area && updated.salePrice) {
          updated.pricePerSqm = updated.salePrice / updated.area
        }
        if (field === 'area' && updated.salePrice && updated.area) {
          updated.pricePerSqm = updated.salePrice / updated.area
        }
        return updated
      }
      return c
    }))
  }

  /* ── Completion check for step 1 ── */
  const isStep1Valid = !!(property.city && property.area && property.rooms)

  return (
    <div className="space-y-6 pb-28">
      {/* ── Hero header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Buildings size={28} weight="duotone" />
          </div>
          <div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-foreground">מחשבון שווי דירות מגורים</h1>
            <p className="text-[15px] text-muted-foreground mt-0.5">חישוב שווי מקצועי לנכסי מגורים</p>
          </div>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-700 gap-1.5">
          <CheckCircle size={14} weight="fill" />
          מחובר למאגר נדל״ן ממשלתי
        </Badge>
      </div>

      {/* ── Step indicator ─────────────────────────────────────── */}
      <Card>
        <CardContent className="py-4">
          <StepIndicator currentStep={activeStep} />
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
         STEP 1: Property Details
         ══════════════════════════════════════════════════════════ */}
      {activeStep === 1 && (
        <div className="space-y-5 animate-fade-in">
          {/* Location */}
          <SectionCard
            title="מיקום הנכס"
            description="הכנס את כתובת הנכס המוערך"
            icon={<MapPin size={20} weight="duotone" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>עיר</Label>
                <Input
                  value={property.city || ''}
                  onChange={(e) => setProperty({ ...property, city: e.target.value })}
                  placeholder="לדוגמה: תל אביב, ירושלים, חיפה"
                />
                <FieldHint>שם העיר בעברית — ישמש לשליפת עסקאות מהמאגר הממשלתי</FieldHint>
              </div>
              <div className="space-y-2">
                <Label>רחוב (אופציונלי)</Label>
                <Input
                  value={property.address || ''}
                  onChange={(e) => setProperty({ ...property, address: e.target.value })}
                  placeholder="לדוגמה: דיזנגוף 50"
                />
                <FieldHint>שם רחוב ומספר בית — מסייע בדיוק ההערכה</FieldHint>
              </div>
            </div>
          </SectionCard>

          {/* Physical attributes */}
          <SectionCard
            title="מאפיינים פיזיים"
            description="הגדרות הנכס המשפיעות ישירות על השווי"
            icon={<Ruler size={20} weight="duotone" />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label>שטח (מ״ר)</Label>
                <Input
                  type="number"
                  value={property.area || ''}
                  onChange={(e) => setProperty({ ...property, area: Number(e.target.value) })}
                  placeholder="90"
                />
                <FieldHint>שטח ברוטו לפי נסח — בד״כ 60–150 לדירות</FieldHint>
              </div>
              <div className="space-y-2">
                <Label>חדרים</Label>
                <Input
                  type="number"
                  value={property.rooms || ''}
                  onChange={(e) => setProperty({ ...property, rooms: Number(e.target.value) })}
                  placeholder="3"
                />
                <FieldHint>כולל חדרי שינה + סלון (לא שירותים/מטבח)</FieldHint>
              </div>
              <div className="space-y-2">
                <Label>קומה</Label>
                <Input
                  type="number"
                  value={property.floor || ''}
                  onChange={(e) => setProperty({ ...property, floor: Number(e.target.value) })}
                  placeholder="3"
                />
                <FieldHint>קומה 0 = קרקע. קומות גבוהות מעלות שווי</FieldHint>
              </div>
              <div className="space-y-2">
                <Label>מצב הנכס</Label>
                <Select
                  value={property.condition || 'good'}
                  onValueChange={(value) => setProperty({ ...property, condition: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">חדש מקבלן</SelectItem>
                    <SelectItem value="excellent">מצוין (שופץ לאחרונה)</SelectItem>
                    <SelectItem value="good">טוב (תקין)</SelectItem>
                    <SelectItem value="fair">בינוני (דרוש שיפוץ)</SelectItem>
                    <SelectItem value="poor">ירוד (שיפוץ כללי)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldHint>משפיע על התאמות מחיר ביחס לעסקאות השוואה</FieldHint>
              </div>
              <div className="space-y-2">
                <Label>שנת בנייה</Label>
                <Input
                  type="number"
                  value={property.buildYear || ''}
                  onChange={(e) => setProperty({ ...property, buildYear: Number(e.target.value) })}
                  placeholder="2010"
                />
                <FieldHint>גיל הבניין משפיע על פחת ושווי</FieldHint>
              </div>
            </div>
          </SectionCard>

          {/* Amenities */}
          <SectionCard
            title="מאפיינים נוספים"
            description="סמן את המאפיינים הקיימים בנכס — כל אחד משפיע על השווי"
            icon={<Wrench size={20} weight="duotone" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AmenityToggle
                label="מעלית"
                hint="מוסיף 5–10% לדירות בקומות 3+"
                checked={property.hasElevator}
                onChange={(checked) => setProperty({ ...property, hasElevator: checked })}
                icon={<Elevator size={20} weight="duotone" />}
              />
              <AmenityToggle
                label="חניה"
                hint="שווי חניה: ₪150K–300K בערים מרכזיות"
                checked={property.hasParkingSpot}
                onChange={(checked) => setProperty({ ...property, hasParkingSpot: checked })}
                icon={<Car size={20} weight="duotone" />}
              />
              <AmenityToggle
                label="מרפסת"
                hint="מרפסת שמש — מוסיף 3–7% לשווי"
                checked={property.hasBalcony}
                onChange={(checked) => setProperty({ ...property, hasBalcony: checked })}
                icon={<Sun size={20} weight="duotone" />}
              />
              <AmenityToggle
                label="מחסן"
                hint="מחסן צמוד — ₪50K–100K ערך נוסף"
                checked={property.hasStorage}
                onChange={(checked) => setProperty({ ...property, hasStorage: checked })}
                icon={<Package size={20} weight="duotone" />}
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         STEP 2: Comparables
         ══════════════════════════════════════════════════════════ */}
      {activeStep === 2 && (
        <div className="space-y-5 animate-fade-in">
          {/* Fetch from gov */}
          <SectionCard
            title="שליפת עסקאות ממאגר ממשלתי"
            description={`מחפש דירות דומות ב${property.city || 'ישראל'} • ${property.area ? `${Math.round(property.area * 0.8)}–${Math.round(property.area * 1.2)}` : '60–120'} מ״ר • שנה אחרונה`}
            icon={<CloudArrowDown size={20} weight="duotone" />}
          >
            <div className="space-y-4">
              <Button
                onClick={handleFetchNadlanTransactions}
                disabled={isLoadingNadlan}
                className="w-full gap-2 h-12 text-[15px]"
              >
                {isLoadingNadlan ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    מחפש עסקאות...
                  </>
                ) : (
                  <>
                    <MagnifyingGlass size={18} weight="bold" />
                    חפש עסקאות ממאגר נדל״ן ממשלתי
                  </>
                )}
              </Button>

              {/* Gov results */}
              {showNadlanResults && nadlanTransactions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="gap-1">
                      {comparables.length} נבחרו
                    </Badge>
                    <p className="text-[13px] font-medium text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle size={14} weight="fill" />
                      נמצאו {nadlanTransactions.length} עסקאות
                    </p>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-auto rounded-xl">
                    {nadlanTransactions.map(transaction => (
                      <div
                        key={transaction.dealId}
                        className="flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/60 rounded-lg transition-colors"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddNadlanTransaction(transaction)}
                          className="gap-1.5 shrink-0"
                        >
                          <Plus size={14} weight="bold" />
                          הוסף
                        </Button>
                        <div className="flex-1 text-right mr-3">
                          <div className="text-[14px] font-medium text-foreground">
                            {transaction.street} {transaction.houseNumber}, {transaction.city}
                          </div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">
                            {transaction.area} מ״ר • {transaction.rooms} חד׳ • ₪{transaction.pricePerMeter.toLocaleString()}/מ״ר • {transaction.dealDate}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Selected comparables */}
          <SectionCard
            title={`עסקאות השוואה שנבחרו (${comparables.length})`}
            description="לפחות עסקה אחת נדרשת לחישוב — מומלץ 3–5 עסקאות"
            icon={<Buildings size={20} weight="duotone" />}
          >
            {comparables.length === 0 ? (
              <EmptyState
                icon={<MagnifyingGlass size={32} weight="duotone" />}
                title="אין עסקאות השוואה עדיין"
                description="חפש עסקאות ממאגר הממשלה למעלה, או הוסף עסקאות ידנית. מומלץ לבחור 3–5 עסקאות דומות לנכס המוערך."
                action={
                  <Button variant="outline" onClick={addComparable} className="gap-2">
                    <Plus size={16} weight="bold" />
                    הוסף עסקה ידנית
                  </Button>
                }
                className="py-10"
              />
            ) : (
              <div className="space-y-3">
                {comparables.map((comp, index) => (
                  <Card key={comp.id} className="bg-muted/20 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeComparable(comp.id!)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X size={16} />
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-foreground">עסקה {index + 1}</span>
                          {comp.pricePerSqm ? (
                            <Badge variant="secondary" className="tabular-nums">
                              ₪{Math.round(comp.pricePerSqm).toLocaleString()}/מ״ר
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[12px]">כתובת</Label>
                          <Input
                            value={comp.address || ''}
                            onChange={(e) => updateComparable(comp.id!, 'address', e.target.value)}
                            placeholder="רחוב, עיר"
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[12px]">תאריך עסקה</Label>
                          <Input
                            type="date"
                            value={comp.saleDate || ''}
                            onChange={(e) => updateComparable(comp.id!, 'saleDate', e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[12px]">מחיר (₪)</Label>
                          <Input
                            type="number"
                            value={comp.salePrice || ''}
                            onChange={(e) => updateComparable(comp.id!, 'salePrice', Number(e.target.value))}
                            placeholder="1,500,000"
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[12px]">שטח (מ״ר)</Label>
                          <Input
                            type="number"
                            value={comp.area || ''}
                            onChange={(e) => updateComparable(comp.id!, 'area', Number(e.target.value))}
                            placeholder="90"
                            className="h-10"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" onClick={addComparable} className="w-full gap-2 border-dashed">
                  <Plus size={16} weight="bold" />
                  הוסף עסקה נוספת
                </Button>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         STEP 3: Results
         ══════════════════════════════════════════════════════════ */}
      {activeStep === 3 && (
        <div className="space-y-5 animate-fade-in">
          {result ? (
            <>
              {/* Hero result */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-l from-primary/5 to-primary/[0.02] p-8 text-center">
                  <div className="text-[13px] font-medium text-muted-foreground mb-2">שווי משוער</div>
                  <div className="text-[3rem] font-bold text-primary tracking-tight tabular-nums leading-none">
                    ₪{result.adjustedValue.toLocaleString()}
                  </div>
                  <div className="text-[17px] text-muted-foreground mt-2 tabular-nums">
                    ₪{result.valuePerSqm.toLocaleString()} למ״ר
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <div className="text-[13px] text-muted-foreground">
                      <span className="font-medium text-foreground">₪{result.valueRange.min.toLocaleString()}</span> – <span className="font-medium text-foreground">₪{result.valueRange.max.toLocaleString()}</span>
                    </div>
                    <Badge className={result.confidence > 0.8 ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}>
                      ביטחון: {Math.round(result.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Factors */}
              {result.adjustmentSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.adjustmentSummary.positiveFactors.length > 0 && (
                    <SectionCard title="גורמים חיוביים" icon={<TrendUp size={18} weight="duotone" />}>
                      <div className="flex flex-wrap gap-2">
                        {result.adjustmentSummary.positiveFactors.map((factor, i) => (
                          <Badge key={i} className="bg-emerald-500/10 text-emerald-700 gap-1">
                            <CheckCircle size={12} weight="fill" />
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                  {result.adjustmentSummary.negativeFactors.length > 0 && (
                    <SectionCard title="גורמים שליליים" icon={<Warning size={18} weight="duotone" />}>
                      <div className="flex flex-wrap gap-2">
                        {result.adjustmentSummary.negativeFactors.map((factor, i) => (
                          <Badge key={i} className="bg-red-500/10 text-red-700 gap-1">
                            <Warning size={12} weight="fill" />
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <SectionCard title="המלצות" icon={<Sparkle size={18} weight="duotone" />}>
                  <ul className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed">
                        <div className="mt-0.5 shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                          {i + 1}
                        </div>
                        <span className="text-foreground/70">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {/* Rental yield */}
              <RentalYieldAnalysis
                propertyValue={result.adjustedValue}
                propertyType="residential"
                autoCalculate={false}
                showAdvancedSettings={true}
              />
            </>
          ) : (
            <EmptyState
              icon={<CalcIcon size={36} weight="duotone" />}
              title="החישוב טרם בוצע"
              description="חזור לשלב 2 ולחץ ״חשב שווי״ כדי לקבל הערכת שווי מבוססת עסקאות השוואה."
              action={
                <Button onClick={() => setActiveStep(2)} className="gap-2">
                  <ArrowRight size={16} />
                  חזור לעסקאות
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         STICKY ACTION BAR
         ══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 py-3 sm:px-8">
          {/* Context info */}
          <div className="text-[13px] text-muted-foreground">
            {activeStep === 1 && (
              <span>{property.city || 'עיר'} • {property.area || '?'} מ״ר • {property.rooms || '?'} חד׳</span>
            )}
            {activeStep === 2 && (
              <span>{comparables.length} עסקאות נבחרו{comparables.length > 0 && ` • ₪${Math.round((comparables.reduce((s, c) => s + (c.pricePerSqm || 0), 0)) / (comparables.length || 1)).toLocaleString()}/מ״ר ממוצע`}</span>
            )}
            {activeStep === 3 && result && (
              <span>שווי: ₪{result.adjustedValue.toLocaleString()} • ביטחון: {Math.round(result.confidence * 100)}%</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {activeStep > 1 && (
              <Button variant="outline" onClick={() => setActiveStep(activeStep - 1)} className="gap-1.5">
                הקודם
              </Button>
            )}

            {activeStep === 1 && (
              <Button
                onClick={() => setActiveStep(2)}
                disabled={!isStep1Valid}
                className="gap-1.5 min-w-[140px]"
              >
                המשך לעסקאות
                <ArrowRight size={16} weight="bold" />
              </Button>
            )}

            {activeStep === 2 && (
              <Button
                onClick={handleCalculate}
                disabled={comparables.length === 0}
                className="gap-1.5 min-w-[140px]"
              >
                <Lightning size={16} weight="bold" />
                חשב שווי
              </Button>
            )}

            {activeStep === 3 && (
              <Button onClick={() => setActiveStep(1)} variant="outline" className="gap-1.5">
                שומה חדשה
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
