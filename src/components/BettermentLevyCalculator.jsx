import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Calendar, Calculator, FileText, TrendUp, Warning, CheckCircle, Scales, Copy, Plus, Trash, Info, Book, Question, ClockCounterClockwise, ChartLine, CloudArrowDown, MagnifyingGlass, Database } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useKV } from '@github/spark/hooks'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function BettermentLevyCalculator() {
  const [comparisonMode, setComparisonMode] = useState(false)
  const [historicalMode, setHistoricalMode] = useState(false)
  const [scenarios, setScenarios] = useKV('betterment-scenarios', [])
  const [historicalRecords, setHistoricalRecords] = useKV('betterment-history', [])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [activeScenarioId, setActiveScenarioId] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [selectedForComparison, setSelectedForComparison] = useState([])
  const [comparisonView, setComparisonView] = useState('grid')
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [planValidationStatus, setPlanValidationStatus] = useState({})
  const [autoFetchingPrev, setAutoFetchingPrev] = useState(false)
  const [autoFetchingNew, setAutoFetchingNew] = useState(false)
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(true)

  const [previousStatus, setPreviousStatus] = useState({
    planNumber: '',
    planName: '',
    zoning: '',
    buildingRights: {
      farPercentage: 0,
      floors: 0,
      mainArea: 0,
      serviceArea: 0,
      allowedUses: []
    },
    restrictions: {
      buildingLines: '',
      preservation: false,
      expropriation: false,
      environmentalLimits: ''
    }
  })

  const [newStatus, setNewStatus] = useState({
    planNumber: '',
    planName: '',
    zoning: '',
    buildingRights: {
      farPercentage: 0,
      floors: 0,
      mainArea: 0,
      serviceArea: 0,
      allowedUses: []
    },
    restrictions: {
      buildingLines: '',
      preservation: false,
      expropriation: false,
      environmentalLimits: ''
    }
  })

  const [determiningDate, setDeterminingDate] = useState('')
  const [lotSize, setLotSize] = useState(0)
  const [marketValue, setMarketValue] = useState(0)
  const [marketDataSource, setMarketDataSource] = useState([])
  const [calculationMethod, setCalculationMethod] = useState('standard')

  const calculateDelta = () => {
    return {
      farDelta: newStatus.buildingRights.farPercentage - previousStatus.buildingRights.farPercentage,
      floorsDelta: newStatus.buildingRights.floors - previousStatus.buildingRights.floors,
      mainAreaDelta: newStatus.buildingRights.mainArea - previousStatus.buildingRights.mainArea,
      serviceAreaDelta: newStatus.buildingRights.serviceArea - previousStatus.buildingRights.serviceArea,
      totalAreaDelta: (newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea) - 
                       (previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea)
    }
  }

  const calculateBettermentValue = () => {
    const prevTotal = previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea
    const newTotal = newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea
    
    if (prevTotal === 0 && newTotal === 0) {
      toast.error('חסרים שטחי בנייה', {
        description: 'מלא את השטחים במ״ר בשני הטאבים'
      })
      return null
    }
    
    if (prevTotal === 0) {
      toast.error('חסרים שטחים במצב קודם')
      return null
    }
    
    if (newTotal === 0) {
      toast.error('חסרים שטחים במצב חדש')
      return null
    }
    
    const delta = calculateDelta()
    
    if (delta.totalAreaDelta <= 0) {
      toast.error('אין תוספת זכויות בנייה')
      return null
    }

    const valuePerSqm = marketValue || 0
    const bettermentValue = delta.totalAreaDelta * valuePerSqm
    const levy = bettermentValue * 0.5

    return {
      delta,
      valuePerSqm,
      bettermentValue,
      levy,
      conservativeLevy: levy * 0.85,
      averageLevy: levy,
      maximumLevy: levy * 1.15
    }
  }

  const saveAsScenario = () => {
    const scenarioName = prompt('הזן שם לתרחיש:', `תרחיש ${(scenarios || []).length + 1}`)
    if (!scenarioName) return

    const newScenario = {
      id: Date.now().toString(),
      name: scenarioName,
      previousStatus,
      newStatus,
      determiningDate,
      lotSize,
      marketValue,
      marketDataSource,
      calculationMethod
    }

    setScenarios((current) => [...(current || []), newScenario])
    toast.success(`התרחיש "${scenarioName}" נשמר בהצלחה`)
  }

  const loadScenario = (scenario) => {
    setPreviousStatus(scenario.previousStatus)
    setNewStatus(scenario.newStatus)
    setDeterminingDate(scenario.determiningDate)
    setLotSize(scenario.lotSize)
    setMarketValue(scenario.marketValue)
    setMarketDataSource(scenario.marketDataSource)
    setCalculationMethod(scenario.calculationMethod)
    setActiveScenarioId(scenario.id)
    toast.success(`התרחיש "${scenario.name}" נטען`)
  }

  const deleteScenario = (id) => {
    setScenarios((current) => (current || []).filter(s => s.id !== id))
    if (activeScenarioId === id) {
      setActiveScenarioId(null)
    }
    toast.success('התרחיש נמחק')
  }

  const deleteHistoricalRecord = (id) => {
    setHistoricalRecords((current) => (current || []).filter(r => r.id !== id))
    toast.success('הרשומה ההיסטורית נמחקה')
  }

  const duplicateScenario = (scenario) => {
    const newScenario = {
      ...scenario,
      id: Date.now().toString(),
      name: `${scenario.name} (עותק)`
    }
    setScenarios((current) => [...(current || []), newScenario])
    toast.success('התרחיש שוכפל בהצלחה')
  }

  const calculateScenarioResult = (scenario) => {
    const deltaBuildingRights = {
      farDelta: scenario.newStatus.buildingRights.farPercentage - scenario.previousStatus.buildingRights.farPercentage,
      floorsDelta: scenario.newStatus.buildingRights.floors - scenario.previousStatus.buildingRights.floors,
      mainAreaDelta: scenario.newStatus.buildingRights.mainArea - scenario.previousStatus.buildingRights.mainArea,
      serviceAreaDelta: scenario.newStatus.buildingRights.serviceArea - scenario.previousStatus.buildingRights.serviceArea,
      totalAreaDelta: (scenario.newStatus.buildingRights.mainArea + scenario.newStatus.buildingRights.serviceArea) - 
                       (scenario.previousStatus.buildingRights.mainArea + scenario.previousStatus.buildingRights.serviceArea)
    }

    if (deltaBuildingRights.totalAreaDelta <= 0) {
      return null
    }

    const valuePerSqm = scenario.marketValue || 0
    const bettermentValue = deltaBuildingRights.totalAreaDelta * valuePerSqm
    const levy = bettermentValue * 0.5

    return {
      delta: deltaBuildingRights,
      valuePerSqm,
      bettermentValue,
      levy,
      conservativeLevy: levy * 0.85,
      averageLevy: levy,
      maximumLevy: levy * 1.15
    }
  }

  const result = calculateBettermentValue()

  return (
    <div className="container mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-3 rounded-xl">
            <Scales className="w-8 h-8 text-primary" weight="duotone" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              מחשבון היטל השבחה
            </h1>
            <p className="text-muted-foreground">
              חישוב מדויק של היטל השבחה על בסיס שינוי תכנוני
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoricalMode(true)}
              className="gap-2"
            >
              <ClockCounterClockwise className="w-4 h-4" weight="duotone" />
              היסטוריה
              {historicalRecords && historicalRecords.length > 0 && (
                <Badge variant="secondary" className="mr-1">
                  {historicalRecords.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showDisclaimer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert className="bg-gradient-to-br from-warning/20 to-destructive/10 border-warning">
                <Warning className="h-5 w-5 text-warning" weight="duotone" />
                <AlertTitle className="text-lg font-bold flex items-center justify-between">
                  <span>הצהרת אחריות</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDisclaimer(false)}
                    className="h-6 text-xs"
                  >
                    סגור
                  </Button>
                </AlertTitle>
                <AlertDescription className="mt-3 space-y-3">
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-foreground">⚠️ המחשבון הוא כלי עזר בלבד</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground mr-4">
                      <li>התוצאות מבוססות על נתונים שהוזנו על ידך</li>
                      <li>המחשבון אינו מהווה שומה רשמית</li>
                      <li>לשימוש רשמי - דרוש אישור שמאי מוסמך</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs defaultValue="main" dir="rtl" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="main" className="gap-2">
              <Calculator className="w-4 h-4" weight="duotone" />
              חישוב
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-2">
              <FileText className="w-4 h-4" weight="duotone" />
              תרחישים {scenarios?.length > 0 && `(${scenarios.length})`}
            </TabsTrigger>
            <TabsTrigger value="guide" className="gap-2">
              <Book className="w-4 h-4" weight="duotone" />
              מדריך
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-6 mt-6">
            <Card className="glass-effect p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>מועד קובע *</Label>
                  <Input
                    type="date"
                    value={determiningDate}
                    onChange={(e) => setDeterminingDate(e.target.value)}
                    className="max-w-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label>גודל מגרש (מ״ר) *</Label>
                  <Input
                    type="number"
                    value={lotSize}
                    onChange={(e) => setLotSize(parseFloat(e.target.value))}
                    placeholder="0"
                    className="max-w-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label>שווי שוק (₪/מ״ר)</Label>
                  <Input
                    type="number"
                    value={marketValue}
                    onChange={(e) => setMarketValue(parseFloat(e.target.value))}
                    placeholder="0"
                    className="max-w-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label>שיטת חישוב</Label>
                  <Select value={calculationMethod} onValueChange={setCalculationMethod}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">סטנדרטית (50%)</SelectItem>
                      <SelectItem value="reduced">מוקטנת (35%)</SelectItem>
                      <SelectItem value="special">מיוחדת (25%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="glass-effect p-6">
              <h3 className="text-xl font-bold mb-4">מצב קודם (תכנית ישנה)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>מספר תכנית</Label>
                  <Input
                    value={previousStatus.planNumber}
                    onChange={(e) => setPreviousStatus({...previousStatus, planNumber: e.target.value})}
                    placeholder="לדוגמה: לה/במ/18/1000/א"
                  />
                </div>
                <div className="space-y-2">
                  <Label>שם התכנית</Label>
                  <Input
                    value={previousStatus.planName}
                    onChange={(e) => setPreviousStatus({...previousStatus, planName: e.target.value})}
                    disabled
                    placeholder="משהו"
                  />
                </div>
                <div className="space-y-2">
                  <Label>אחוזי בנייה (%)</Label>
                  <Input
                    type="number"
                    value={previousStatus.buildingRights.farPercentage}
                    onChange={(e) => setPreviousStatus({
                      ...previousStatus,
                      buildingRights: {...previousStatus.buildingRights, farPercentage: parseFloat(e.target.value)}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>מספר קומות</Label>
                  <Input
                    type="number"
                    value={previousStatus.buildingRights.floors}
                    onChange={(e) => setPreviousStatus({
                      ...previousStatus,
                      buildingRights: {...previousStatus.buildingRights, floors: parseFloat(e.target.value)}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שטח עיקרי (מ״ר)</Label>
                  <Input
                    type="number"
                    value={previousStatus.buildingRights.mainArea}
                    onChange={(e) => setPreviousStatus({
                      ...previousStatus,
                      buildingRights: {...previousStatus.buildingRights, mainArea: parseFloat(e.target.value)}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שטח שירות (מ״ר)</Label>
                  <Input
                    type="number"
                    value={previousStatus.buildingRights.serviceArea}
                    onChange={(e) => setPreviousStatus({
                      ...previousStatus,
                      buildingRights: {...previousStatus.buildingRights, serviceArea: parseFloat(e.target.value)}
                    })}
                  />
                </div>
              </div>
            </Card>

            <Card className="glass-effect p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendUp className="w-5 h-5 text-success" weight="duotone" />
                מצב חדש משביח (תכנית חדשה)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>מספר תכנית</Label>
                  <Input
                    value={newStatus.planNumber}
                    onChange={(e) => setNewStatus({...newStatus, planNumber: e.target.value})}
                    placeholder="לדוגמה: 415-0792036"
                  />
                </div>
                <div className="space-y-2">
                  <Label>שם התכנית</Label>
                  <Input
                    value={newStatus.planName}
                    onChange={(e) => setNewStatus({...newStatus, planName: e.target.value})}
                    disabled
                    placeholder="משהו"
                  />
                </div>
                <div className="space-y-2">
                  <Label>אחוזי בנייה (%)</Label>
                  <Input
                    type="number"
                    value={newStatus.buildingRights.farPercentage}
                    onChange={(e) => setNewStatus({
                      ...newStatus,
                      buildingRights: {...newStatus.buildingRights, farPercentage: parseFloat(e.target.value)}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>מספר קומות</Label>
                  <Input
                    type="number"
                    value={newStatus.buildingRights.floors}
                    onChange={(e) => setNewStatus({
                      ...newStatus,
                      buildingRights: {...newStatus.buildingRights, floors: parseFloat(e.target.value)}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שטח עיקרי (מ״ר)</Label>
                  <Input
                    type="number"
                    value={newStatus.buildingRights.mainArea}
                    onChange={(e) => setNewStatus({
                      ...newStatus,
                      buildingRights: {...newStatus.buildingRights, mainArea: parseFloat(e.target.value)}
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שטח שירות (מ״ר)</Label>
                  <Input
                    type="number"
                    value={newStatus.buildingRights.serviceArea}
                    onChange={(e) => setNewStatus({
                      ...newStatus,
                      buildingRights: {...newStatus.buildingRights, serviceArea: parseFloat(e.target.value)}
                    })}
                  />
                </div>
              </div>
            </Card>

            {result && (
              <Card className="glass-effect p-6 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/50">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" weight="fill" />
                  תוצאות החישוב
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">תוספת זכויות</div>
                    <div className="font-mono text-2xl font-bold text-success">
                      +{result.delta.totalAreaDelta.toLocaleString('he-IL')} מ״ר
                    </div>
                  </div>
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">שווי השבחה</div>
                    <div className="font-mono text-xl font-bold text-primary">
                      ₪{result.bettermentValue.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                    </div>
                  </div>
                  <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">היטל השבחה (50%)</div>
                    <div className="font-mono text-2xl font-bold text-accent">
                      ₪{result.levy.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                    </div>
                  </div>
                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">טווח שמרני (85%)</div>
                    <div className="font-mono text-lg font-bold text-warning">
                      ₪{result.conservativeLevy.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="p-4 bg-background/60 rounded-lg">
                  <div className="text-sm font-semibold text-muted-foreground mb-2">טווח תוצאות:</div>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">שמרני</div>
                      <div className="font-mono text-xl font-bold text-success">
                        ₪{result.conservativeLevy.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">ממוצע</div>
                      <div className="font-mono text-xl font-bold text-accent">
                        ₪{result.levy.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">מקסימלי</div>
                      <div className="font-mono text-xl font-bold text-warning">
                        ₪{result.maximumLevy.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Button onClick={saveAsScenario} className="w-full gap-2" size="lg">
              <Plus className="w-5 h-5" weight="duotone" />
              שמור תרחיש
            </Button>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-4 mt-6">
            {!scenarios || scenarios.length === 0 ? (
              <Card className="glass-effect p-12 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" weight="duotone" />
                <h3 className="text-xl font-semibold mb-2">אין תרחישים שמורים</h3>
                <p className="text-muted-foreground">צור תרחיש חדש וחזור לכאן כדי לראות אותו</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {scenarios.map((scenario) => {
                  const scenarioResult = calculateScenarioResult(scenario)
                  return (
                    <Card key={scenario.id} className="glass-effect p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{scenario.name}</h3>
                          <p className="text-sm text-muted-foreground">מועד קובע: {scenario.determiningDate}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => duplicateScenario(scenario)}
                            className="h-8 w-8"
                          >
                            <Copy className="w-4 h-4" weight="duotone" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteScenario(scenario.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash className="w-4 h-4" weight="duotone" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {scenarioResult ? (
                          <>
                            <div className="p-3 bg-accent/10 border border-accent/30 rounded">
                              <div className="text-xs text-muted-foreground mb-1">היטל השבחה</div>
                              <div className="font-mono text-xl font-bold text-accent">
                                ₪{scenarioResult.levy.toLocaleString('he-IL', {maximumFractionDigits: 0})}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              תוספת זכויות: +{scenarioResult.delta.totalAreaDelta.toLocaleString('he-IL')} מ״ר
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">אין תוספת זכויות בתרחיש זה</p>
                        )}
                      </div>

                      <Button
                        className="w-full mt-4 gap-2"
                        variant="outline"
                        onClick={() => loadScenario(scenario)}
                      >
                        <Calculator className="w-4 h-4" weight="duotone" />
                        פתח תרחיש
                      </Button>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="guide" className="space-y-4 mt-6">
            <Card className="glass-effect p-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" weight="duotone" />
                      מועד קובע
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-base">
                    <p className="text-muted-foreground">
                      המועד הקובע הוא התאריך שבו נקבע שווי הקרקע לצורך חישוב היטל ההשבחה. 
                      בדרך כלל זהו תאריך פרסום התכנית או אישורה.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-primary" weight="duotone" />
                      כיצד מחשבים היטל השבחה?
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-base">
                    <div className="bg-primary/10 p-4 rounded border border-primary/30">
                      <p className="font-mono text-sm mb-2">
                        היטל = (תוספת זכויות × שווי למ״ר) × 50%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        דוגמה: 200 מ״ר × 15,000 ₪/מ״ר = 3,000,000 ₪ × 50% = 1,500,000 ₪
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Question className="w-5 h-5 text-primary" weight="duotone" />
                      שאלות נפוצות
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold mb-1">האם זה תקף משפטית?</p>
                      <p className="text-muted-foreground">
                        המחשבון הוא כלי עזר בלבד. לצורך הגשה רשמית דרוש שומה של שמאי מוסמך.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}