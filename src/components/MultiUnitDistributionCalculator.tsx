import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { MultiUnitCalculator, type UnitParams, type BuildingParams, type MultiUnitResult } from '@/lib/calculators/multiUnitCalculator'
import { Plus, Trash, Calculator, Building, WarningCircle, CheckCircle, ChartBar, FunnelSimple, Stack, Download, Eye, EyeSlash } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'

const log = createLogger('MultiUnitDistributionCalculator')

interface DistributionMethod {
  id: string
  name: string
  nameHebrew: string
  description: string
  formula: string
}

const DISTRIBUTION_METHODS: DistributionMethod[] = [
  {
    id: 'weighted',
    name: 'Weighted Distribution',
    nameHebrew: 'חלוקה משוקללת',
    description: 'משקלל לפי שטח, קומה, חזית ומצב',
    formula: 'Weight = Area × Floor × Facing × Condition'
  },
  {
    id: 'proportional',
    name: 'Proportional by Area',
    nameHebrew: 'חלוקה יחסית לפי שטח',
    description: 'חלוקה פשוטה לפי יחס שטחים',
    formula: 'Value = (Unit Area / Total Area) × Building Value'
  },
  {
    id: 'equal',
    name: 'Equal Distribution',
    nameHebrew: 'חלוקה שווה',
    description: 'חלוקה שווה בין כל היחידות',
    formula: 'Value = Building Value / Number of Units'
  },
  {
    id: 'custom',
    name: 'Custom Weights',
    nameHebrew: 'משקלים מותאמים',
    description: 'הגדרת משקלים ידנית לכל יחידה',
    formula: 'Value = (Custom Weight / Total Weights) × Building Value'
  }
]

export function MultiUnitDistributionCalculator() {
  const [buildingValue, setBuildingValue] = useState<number>(10000000)
  const [distributionMethod, setDistributionMethod] = useState<string>('weighted')
  const [autoBalance, setAutoBalance] = useState<boolean>(true)
  const [balanceTolerance, setBalanceTolerance] = useState<number>(0.5)
  const [units, setUnits] = useState<UnitParams[]>([
    {
      id: '1',
      unitNumber: '1',
      floor: 0,
      area: 100,
      rooms: 4,
      hasFrontFacing: true,
      hasBalcony: true,
      balconyArea: 15,
      condition: 'good',
      specificFeatures: []
    },
    {
      id: '2',
      unitNumber: '2',
      floor: 0,
      area: 95,
      rooms: 4,
      hasFrontFacing: false,
      hasBalcony: true,
      balconyArea: 12,
      condition: 'good',
      specificFeatures: []
    },
    {
      id: '3',
      unitNumber: '3',
      floor: 1,
      area: 100,
      rooms: 4,
      hasFrontFacing: true,
      hasBalcony: true,
      balconyArea: 15,
      condition: 'excellent',
      specificFeatures: []
    }
  ])
  const [result, setResult] = useState<MultiUnitResult | null>(null)
  const [showFormulas, setShowFormulas] = useState<boolean>(false)
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({})

   
  useEffect(() => {
    calculateDistribution()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingValue, units, distributionMethod, autoBalance, balanceTolerance, customWeights])

  const calculateDistribution = () => {
    try {
      const totalArea = units.reduce((sum, u) => sum + u.area, 0)
      const baseValuePerSqm = buildingValue / totalArea

      const params: BuildingParams = {
        totalBuildingValue: buildingValue,
        totalArea,
        baseValuePerSqm,
        units
      }

      let calculatedResult: MultiUnitResult

      switch (distributionMethod) {
        case 'weighted':
          calculatedResult = MultiUnitCalculator.calculate(params)
          break
        case 'proportional':
          calculatedResult = calculateProportional(params)
          break
        case 'equal':
          calculatedResult = calculateEqual(params)
          break
        case 'custom':
          calculatedResult = calculateCustom(params, customWeights)
          break
        default:
          calculatedResult = MultiUnitCalculator.calculate(params)
      }

      setResult(calculatedResult)
    } catch (error) {
      toast.error('שגיאה בחישוב החלוקה')
      log.error(error)
    }
  }

  const calculateProportional = (params: BuildingParams): MultiUnitResult => {
    const weights = params.units.map(unit => ({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      floorWeight: 1,
      areaWeight: unit.area,
      frontFacingWeight: 1,
      conditionWeight: 1,
      totalWeight: unit.area,
      explanation: `יחידה ${unit.unitNumber}: שטח ${unit.area} מ"ר`
    }))

    const totalWeight = weights.reduce((sum, w) => sum + w.totalWeight, 0)

    const unitValuations = params.units.map(unit => {
      const weight = weights.find(w => w.unitId === unit.id)!
      const weightShare = weight.totalWeight / totalWeight
      const adjustedValue = params.totalBuildingValue * weightShare
      const valuePerSqm = adjustedValue / unit.area

      return {
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        area: unit.area,
        floor: unit.floor,
        baseValue: adjustedValue,
        adjustedValue,
        valuePerSqm,
        weightShare,
        adjustmentFactors: { floor: 0, frontFacing: 0, condition: 0, balcony: 0 },
        narrative: `יחידה ${unit.unitNumber}: ${adjustedValue.toLocaleString('he-IL')} ₪`
      }
    })

    const totalAllocatedValue = unitValuations.reduce((sum, u) => sum + u.adjustedValue, 0)

    return {
      buildingValue: params.totalBuildingValue,
      totalArea: params.totalArea,
      baseValuePerSqm: params.baseValuePerSqm,
      units: unitValuations,
      totalAllocatedValue,
      allocationAccuracy: 100,
      weights,
      formula: 'Value = (Unit Area / Total Area) × Building Value',
      narrativeHebrew: 'חלוקה יחסית לפי שטח',
      reconciliation: {
        targetValue: params.totalBuildingValue,
        allocatedValue: totalAllocatedValue,
        difference: 0,
        differencePercent: 0,
        adjustmentNeeded: false
      }
    }
  }

  const calculateEqual = (params: BuildingParams): MultiUnitResult => {
    const valuePerUnit = params.totalBuildingValue / params.units.length
    
    const weights = params.units.map(unit => ({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      floorWeight: 1,
      areaWeight: 1,
      frontFacingWeight: 1,
      conditionWeight: 1,
      totalWeight: 1,
      explanation: `יחידה ${unit.unitNumber}: משקל שווה`
    }))

    const unitValuations = params.units.map(unit => ({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      area: unit.area,
      floor: unit.floor,
      baseValue: valuePerUnit,
      adjustedValue: valuePerUnit,
      valuePerSqm: valuePerUnit / unit.area,
      weightShare: 1 / params.units.length,
      adjustmentFactors: { floor: 0, frontFacing: 0, condition: 0, balcony: 0 },
      narrative: `יחידה ${unit.unitNumber}: ${valuePerUnit.toLocaleString('he-IL')} ₪`
    }))

    return {
      buildingValue: params.totalBuildingValue,
      totalArea: params.totalArea,
      baseValuePerSqm: params.baseValuePerSqm,
      units: unitValuations,
      totalAllocatedValue: params.totalBuildingValue,
      allocationAccuracy: 100,
      weights,
      formula: 'Value = Building Value / Number of Units',
      narrativeHebrew: 'חלוקה שווה',
      reconciliation: {
        targetValue: params.totalBuildingValue,
        allocatedValue: params.totalBuildingValue,
        difference: 0,
        differencePercent: 0,
        adjustmentNeeded: false
      }
    }
  }

  const calculateCustom = (params: BuildingParams, weights: Record<string, number>): MultiUnitResult => {
    const unitWeights = params.units.map(unit => ({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      floorWeight: 1,
      areaWeight: 1,
      frontFacingWeight: 1,
      conditionWeight: 1,
      totalWeight: weights[unit.id] || 1,
      explanation: `יחידה ${unit.unitNumber}: משקל מותאם ${weights[unit.id] || 1}`
    }))

    const totalWeight = unitWeights.reduce((sum, w) => sum + w.totalWeight, 0)

    const unitValuations = params.units.map(unit => {
      const weight = unitWeights.find(w => w.unitId === unit.id)!
      const weightShare = weight.totalWeight / totalWeight
      const adjustedValue = params.totalBuildingValue * weightShare
      const valuePerSqm = adjustedValue / unit.area

      return {
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        area: unit.area,
        floor: unit.floor,
        baseValue: adjustedValue,
        adjustedValue,
        valuePerSqm,
        weightShare,
        adjustmentFactors: { floor: 0, frontFacing: 0, condition: 0, balcony: 0 },
        narrative: `יחידה ${unit.unitNumber}: ${adjustedValue.toLocaleString('he-IL')} ₪`
      }
    })

    const totalAllocatedValue = unitValuations.reduce((sum, u) => sum + u.adjustedValue, 0)

    return {
      buildingValue: params.totalBuildingValue,
      totalArea: params.totalArea,
      baseValuePerSqm: params.baseValuePerSqm,
      units: unitValuations,
      totalAllocatedValue,
      allocationAccuracy: 100,
      weights: unitWeights,
      formula: 'Value = (Custom Weight / Total Weights) × Building Value',
      narrativeHebrew: 'חלוקה לפי משקלים מותאמים',
      reconciliation: {
        targetValue: params.totalBuildingValue,
        allocatedValue: totalAllocatedValue,
        difference: 0,
        differencePercent: 0,
        adjustmentNeeded: false
      }
    }
  }

  const addUnit = () => {
    const newUnit: UnitParams = {
      id: String(units.length + 1),
      unitNumber: String(units.length + 1),
      floor: 0,
      area: 100,
      rooms: 4,
      hasFrontFacing: true,
      hasBalcony: true,
      balconyArea: 10,
      condition: 'good',
      specificFeatures: []
    }
    setUnits([...units, newUnit])
    setCustomWeights({ ...customWeights, [newUnit.id]: 1 })
  }

  const removeUnit = (id: string) => {
    if (units.length <= 2) {
      toast.error('חייבות להיות לפחות 2 יחידות')
      return
    }
    setUnits(units.filter(u => u.id !== id))
    const newWeights = { ...customWeights }
    delete newWeights[id]
    setCustomWeights(newWeights)
  }

  const updateUnit = (id: string, field: keyof UnitParams, value: any) => {
    setUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u))
  }

  const exportResults = () => {
    if (!result) return

    const text = MultiUnitCalculator.createAllocationTable(result)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `multi-unit-distribution-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('הקובץ יוצא בהצלחה')
  }

  const validation = result ? MultiUnitCalculator.validateAllocation(result) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Building size={32} weight="duotone" className="text-primary" />
            מחשבון חלוקת שווי ריבוי יחידות
          </h2>
          <p className="text-muted-foreground mt-2">
            חלוקה אוטומטית של שווי בניין ליחידות בודדות עם איזון חכם
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFormulas(!showFormulas)}
            className="gap-2"
          >
            {showFormulas ? <EyeSlash size={18} /> : <Eye size={18} />}
            {showFormulas ? 'הסתר נוסחאות' : 'הצג נוסחאות'}
          </Button>
          <Button
            variant="outline"
            onClick={exportResults}
            disabled={!result}
            className="gap-2"
          >
            <Download size={18} />
            ייצא תוצאות
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-effect border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stack size={20} weight="duotone" />
                הגדרות כלליות
              </CardTitle>
              <CardDescription>
                הגדר את שווי הבניין ושיטת החלוקה
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="building-value">שווי בניין כולל (₪)</Label>
                  <Input
                    id="building-value"
                    type="number"
                    value={buildingValue}
                    onChange={(e) => setBuildingValue(Number(e.target.value))}
                    className="text-lg font-bold"
                  />
                  <p className="text-xs text-muted-foreground">
                    {buildingValue.toLocaleString('he-IL')} ₪
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">שיטת חלוקה</Label>
                  <Select value={distributionMethod} onValueChange={setDistributionMethod}>
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISTRIBUTION_METHODS.map(method => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.nameHebrew}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {DISTRIBUTION_METHODS.find(m => m.id === distributionMethod)?.description}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-balance" className="text-base">איזון אוטומטי</Label>
                    <p className="text-xs text-muted-foreground">
                      וידוא שסכום היחידות תואם לשווי הבניין
                    </p>
                  </div>
                  <Switch
                    id="auto-balance"
                    checked={autoBalance}
                    onCheckedChange={setAutoBalance}
                  />
                </div>

                {autoBalance && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label>סטייה מותרת (%)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[balanceTolerance]}
                        onValueChange={(v) => setBalanceTolerance(v[0])}
                        min={0.1}
                        max={5}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-12">{balanceTolerance.toFixed(1)}%</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {showFormulas && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert className="bg-accent/10 border-accent">
                    <Calculator size={18} />
                    <AlertDescription className="font-mono text-sm mt-2">
                      {DISTRIBUTION_METHODS.find(m => m.id === distributionMethod)?.formula}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building size={20} weight="duotone" />
                    יחידות ({units.length})
                  </CardTitle>
                  <CardDescription>
                    הגדר את מאפייני כל יחידה בבניין
                  </CardDescription>
                </div>
                <Button onClick={addUnit} className="gap-2">
                  <Plus size={18} weight="bold" />
                  הוסף יחידה
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence mode="popLayout">
                {units.map((unit, index) => (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card 
                      className={`${selectedUnit === unit.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'} transition-all cursor-pointer hover:border-primary/50`}
                      onClick={() => setSelectedUnit(selectedUnit === unit.id ? null : unit.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">{index + 1}</span>
                            </div>
                            <div>
                              <CardTitle className="text-lg">יחידה {unit.unitNumber}</CardTitle>
                              <CardDescription className="text-sm">
                                קומה {unit.floor} • {unit.area} מ"ר • {unit.rooms} חדרים
                              </CardDescription>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeUnit(unit.id)
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash size={18} />
                          </Button>
                        </div>
                      </CardHeader>
                      <AnimatePresence>
                        {selectedUnit === unit.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-0">
                              <div className="space-y-2">
                                <Label>מספר יחידה</Label>
                                <Input
                                  value={unit.unitNumber}
                                  onChange={(e) => updateUnit(unit.id, 'unitNumber', e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>קומה</Label>
                                <Input
                                  type="number"
                                  value={unit.floor}
                                  onChange={(e) => updateUnit(unit.id, 'floor', Number(e.target.value))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>שטח (מ"ר)</Label>
                                <Input
                                  type="number"
                                  value={unit.area}
                                  onChange={(e) => updateUnit(unit.id, 'area', Number(e.target.value))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>חדרים</Label>
                                <Input
                                  type="number"
                                  value={unit.rooms}
                                  onChange={(e) => updateUnit(unit.id, 'rooms', Number(e.target.value))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>מצב</Label>
                                <Select 
                                  value={unit.condition} 
                                  onValueChange={(v) => updateUnit(unit.id, 'condition', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="poor">ירוד</SelectItem>
                                    <SelectItem value="fair">סביר</SelectItem>
                                    <SelectItem value="good">טוב</SelectItem>
                                    <SelectItem value="excellent">מצוין</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>שטח מרפסת (מ"ר)</Label>
                                <Input
                                  type="number"
                                  value={unit.balconyArea}
                                  onChange={(e) => updateUnit(unit.id, 'balconyArea', Number(e.target.value))}
                                />
                              </div>

                              <div className="flex items-center justify-between col-span-2">
                                <Label>חזית</Label>
                                <Switch
                                  checked={unit.hasFrontFacing}
                                  onCheckedChange={(v) => updateUnit(unit.id, 'hasFrontFacing', v)}
                                />
                              </div>

                              {distributionMethod === 'custom' && (
                                <div className="space-y-2 col-span-2">
                                  <Label>משקל מותאם</Label>
                                  <div className="flex items-center gap-2">
                                    <Slider
                                      value={[customWeights[unit.id] || 1]}
                                      onValueChange={(v) => setCustomWeights({ ...customWeights, [unit.id]: v[0] })}
                                      min={0.1}
                                      max={5}
                                      step={0.1}
                                      className="flex-1"
                                    />
                                    <span className="text-sm font-mono w-12">{(customWeights[unit.id] || 1).toFixed(1)}</span>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {result && (
            <>
              <Card className="glass-effect border-accent/30 bg-linear-to-br from-accent/5 to-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartBar size={20} weight="duotone" />
                    סיכום חלוקה
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">שווי בניין</span>
                      <span className="font-bold">{result.buildingValue.toLocaleString('he-IL')} ₪</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">סה"כ משוקלל</span>
                      <span className="font-bold">{result.totalAllocatedValue.toLocaleString('he-IL')} ₪</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">הפרש</span>
                      <span className={`font-bold ${Math.abs(result.reconciliation.differencePercent) < 1 ? 'text-success' : 'text-warning'}`}>
                        {result.reconciliation.difference.toLocaleString('he-IL')} ₪
                        ({result.reconciliation.differencePercent.toFixed(2)}%)
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">דיוק חלוקה</span>
                      <Badge variant={result.allocationAccuracy > 99 ? 'default' : 'secondary'}>
                        {result.allocationAccuracy.toFixed(2)}%
                      </Badge>
                    </div>
                    <Progress value={result.allocationAccuracy} className="h-2" />
                  </div>

                  {validation && (
                    <div className="space-y-2 pt-2">
                      {validation.errors.map((error, idx) => (
                        <Alert key={idx} variant="destructive">
                          <WarningCircle size={18} />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      ))}
                      {validation.warnings.map((warning, idx) => (
                        <Alert key={idx} className="border-warning bg-warning/10">
                          <WarningCircle size={18} className="text-warning" />
                          <AlertDescription className="text-warning-foreground">{warning}</AlertDescription>
                        </Alert>
                      ))}
                      {validation.isValid && validation.warnings.length === 0 && (
                        <Alert className="border-success bg-success/10">
                          <CheckCircle size={18} className="text-success" />
                          <AlertDescription className="text-success-foreground">
                            החלוקה תקינה ומאוזנת
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-effect border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FunnelSimple size={20} weight="duotone" />
                    פירוט יחידות
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {result.units.map((unit, index) => (
                      <motion.div
                        key={unit.unitId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="bg-card/50 border-border/50">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">יחידה {unit.unitNumber}</span>
                              <Badge variant="outline">{(unit.weightShare * 100).toFixed(1)}%</Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between text-muted-foreground">
                                <span>שטח</span>
                                <span>{unit.area} מ"ר</span>
                              </div>
                              <div className="flex justify-between font-bold text-primary">
                                <span>שווי</span>
                                <span>{unit.adjustedValue.toLocaleString('he-IL')} ₪</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>מחיר למ"ר</span>
                                <span>{unit.valuePerSqm.toLocaleString('he-IL')} ₪</span>
                              </div>
                            </div>
                            <Progress 
                              value={unit.weightShare * 100} 
                              className="h-1.5"
                            />
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {result && showFormulas && (
        <Card className="glass-effect border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator size={20} weight="duotone" />
              נוסחאות ופירוט חישובים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="formula" dir="rtl">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="formula">נוסחה</TabsTrigger>
                <TabsTrigger value="weights">משקלים</TabsTrigger>
                <TabsTrigger value="narrative">נרטיב</TabsTrigger>
              </TabsList>
              <TabsContent value="formula" className="space-y-4">
                <pre className="bg-muted p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96">
                  {result.formula}
                </pre>
              </TabsContent>
              <TabsContent value="weights" className="space-y-4">
                {result.weights.map(weight => (
                  <Card key={weight.unitId} className="bg-card/50">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">יחידה {weight.unitNumber}</span>
                          <Badge>{weight.totalWeight.toFixed(2)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {weight.explanation}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="text-muted-foreground">קומה</div>
                            <div className="font-mono">{weight.floorWeight.toFixed(2)}</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="text-muted-foreground">שטח</div>
                            <div className="font-mono">{weight.areaWeight.toFixed(2)}</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="text-muted-foreground">חזית</div>
                            <div className="font-mono">{weight.frontFacingWeight.toFixed(2)}</div>
                          </div>
                          <div className="bg-muted/50 p-2 rounded">
                            <div className="text-muted-foreground">מצב</div>
                            <div className="font-mono">{weight.conditionWeight.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="narrative">
                <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap overflow-auto max-h-96">
                  {result.narrativeHebrew}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
