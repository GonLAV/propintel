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
import { autoFetchBuildingRights, validateAndComparePlans } from '@/lib/planningDatabaseAPI'
import { marketDataSync } from '@/lib/marketDataSync'
import type { MarketTransactionData } from '@/lib/israelGovAPI'
import { createLogger } from '@/lib/logger'
import { uid } from '@/lib/utils'

const log = createLogger('BettermentLevyCalculator')

interface PlanningStatus {
  planNumber: string
  planName: string
  zoning: string
  buildingRights: {
    farPercentage: number
    floors: number
    mainArea: number
    serviceArea: number
    allowedUses: string[]
  }
  restrictions: {
    buildingLines: string
    preservation: boolean
    expropriation: boolean
    environmentalLimits: string
  }
}

interface MarketData {
  transactionDate: string
  pricePerSqm: number
  source: string
  location: string
  verified: boolean
}

interface BettermentScenario {
  id: string
  name: string
  previousStatus: PlanningStatus
  newStatus: PlanningStatus
  determiningDate: string
  lotSize: number
  marketValue: number
  marketDataSource: MarketData[]
  calculationMethod: string
}

interface PropertyHistoricalRecord {
  id: string
  propertyIdentifier: string
  propertyAddress: string
  createdAt: string
  scenario: BettermentScenario
  calculationResult: {
    delta: any
    valuePerSqm: number
    bettermentValue: number
    levy: number
    conservativeLevy: number
    averageLevy: number
    maximumLevy: number
  }
  notes: string
}

export function BettermentLevyCalculator() {
  const [comparisonMode, setComparisonMode] = useState(false)
  const [historicalMode, setHistoricalMode] = useState(false)
  const [scenarios, setScenarios] = useKV<BettermentScenario[]>('betterment-scenarios', [])
  const [historicalRecords, setHistoricalRecords] = useKV<PropertyHistoricalRecord[]>('betterment-history', [])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [propertyAddress, setPropertyAddress] = useState<string>('')
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])
  const [comparisonView, setComparisonView] = useState<'grid' | 'table'>('grid')
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [planValidationStatus, setPlanValidationStatus] = useState<{prev?: string, new?: string}>({})
  const [autoFetchingPrev, setAutoFetchingPrev] = useState(false)
  const [autoFetchingNew, setAutoFetchingNew] = useState(false)
  const [_autoFetchEnabled, _setAutoFetchEnabled] = useState(true)
  const [marketDataFetching, setMarketDataFetching] = useState(false)
  const [fetchedTransactions, setFetchedTransactions] = useState<MarketTransactionData[]>([])
  const [propertyLocation, setPropertyLocation] = useState({ latitude: 32.0853, longitude: 34.7818 })
  const [searchRadius, setSearchRadius] = useState(2)

  const [previousStatus, setPreviousStatus] = useState<PlanningStatus>({
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

  const [newStatus, setNewStatus] = useState<PlanningStatus>({
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
  const [marketDataSource, setMarketDataSource] = useState<MarketData[]>([])
  const [calculationMethod, setCalculationMethod] = useState('standard')

  const handleAutoFetchPreviousPlan = async () => {
    if (!previousStatus.planNumber.trim()) {
      toast.error('יש להזין מספר תכנית קודמת')
      return
    }

    setAutoFetchingPrev(true)
    try {
      const result = await autoFetchBuildingRights(previousStatus.planNumber)
      
      if (result.success && result.data) {
        setPreviousStatus(prev => ({
          ...prev,
          planName: result.data!.planName,
          zoning: result.data!.zoning,
          buildingRights: {
            farPercentage: result.data!.farPercentage,
            floors: result.data!.floors,
            mainArea: result.data!.mainArea,
            serviceArea: result.data!.serviceArea,
            allowedUses: result.data!.allowedUses
          }
        }))
        
        setPlanValidationStatus(prev => ({ ...prev, prev: 'success' }))
        
        toast.success('זכויות הבנייה נשלפו בהצלחה! 🎉', {
          description: `מקור: ${result.source} | אמינות: ${result.reliability === 'high' ? 'גבוהה' : 'בינונית'}`
        })
      } else {
        setPlanValidationStatus(prev => ({ ...prev, prev: 'error' }))
        
        toast.error(result.messageHe, {
          description: 'ניתן להמשיך בהזנה ידנית של הנתונים',
          action: result.warnings.length > 0 ? {
            label: 'פרטים',
            onClick: () => {
              toast.info('אזהרות', {
                description: result.warnings.join('\n')
              })
            }
          } : undefined
        })
      }
    } catch (error) {
      log.error('Error fetching plan:', error)
      toast.error('שגיאה בשליפת נתונים מהמאגר הממשלתי')
      setPlanValidationStatus(prev => ({ ...prev, prev: 'error' }))
    } finally {
      setAutoFetchingPrev(false)
    }
  }

  const handleAutoFetchNewPlan = async () => {
    if (!newStatus.planNumber.trim()) {
      toast.error('יש להזין מספר תכנית חדשה')
      return
    }

    setAutoFetchingNew(true)
    try {
      const result = await autoFetchBuildingRights(newStatus.planNumber)
      
      if (result.success && result.data) {
        setNewStatus(prev => ({
          ...prev,
          planName: result.data!.planName,
          zoning: result.data!.zoning,
          buildingRights: {
            farPercentage: result.data!.farPercentage,
            floors: result.data!.floors,
            mainArea: result.data!.mainArea,
            serviceArea: result.data!.serviceArea,
            allowedUses: result.data!.allowedUses
          }
        }))
        
        setPlanValidationStatus(prev => ({ ...prev, new: 'success' }))
        
        toast.success('זכויות הבנייה נשלפו בהצלחה! 🎉', {
          description: `מקור: ${result.source} | אמינות: ${result.reliability === 'high' ? 'גבוהה' : 'בינונית'}`
        })
      } else {
        setPlanValidationStatus(prev => ({ ...prev, new: 'error' }))
        
        toast.error(result.messageHe, {
          description: 'ניתן להמשיך בהזנה ידנית של הנתונים'
        })
      }
    } catch (error) {
      log.error('Error fetching plan:', error)
      toast.error('שגיאה בשליפת נתונים מהמאגר הממשלתי')
      setPlanValidationStatus(prev => ({ ...prev, new: 'error' }))
    } finally {
      setAutoFetchingNew(false)
    }
  }

  const handleAutoComparePlans = async () => {
    if (!previousStatus.planNumber.trim() || !newStatus.planNumber.trim()) {
      toast.error('יש להזין שני מספרי תכניות לפני השוואה')
      return
    }

    setAutoFetchingPrev(true)
    setAutoFetchingNew(true)
    
    try {
      const comparison = await validateAndComparePlans(
        previousStatus.planNumber,
        newStatus.planNumber
      )
      
      if (comparison.previousRights.success && comparison.previousRights.data) {
        setPreviousStatus(prev => ({
          ...prev,
          planName: comparison.previousRights.data!.planName,
          zoning: comparison.previousRights.data!.zoning,
          buildingRights: {
            farPercentage: comparison.previousRights.data!.farPercentage,
            floors: comparison.previousRights.data!.floors,
            mainArea: comparison.previousRights.data!.mainArea,
            serviceArea: comparison.previousRights.data!.serviceArea,
            allowedUses: comparison.previousRights.data!.allowedUses
          }
        }))
      }
      
      if (comparison.newRights.success && comparison.newRights.data) {
        setNewStatus(prev => ({
          ...prev,
          planName: comparison.newRights.data!.planName,
          zoning: comparison.newRights.data!.zoning,
          buildingRights: {
            farPercentage: comparison.newRights.data!.farPercentage,
            floors: comparison.newRights.data!.floors,
            mainArea: comparison.newRights.data!.mainArea,
            serviceArea: comparison.newRights.data!.serviceArea,
            allowedUses: comparison.newRights.data!.allowedUses
          }
        }))
      }
      
      if (comparison.canCalculateLevy && comparison.delta) {
        toast.success(`השוואה הושלמה! תוספת זכויות: ${comparison.delta.totalAreaDelta.toLocaleString('he-IL')} מ"ר`, {
          description: `עלייה של ${comparison.delta.percentageIncrease.toFixed(1)}% בזכויות הבנייה`
        })
      } else if (comparison.issues.length > 0) {
        toast.warning('השוואה הושלמה עם בעיות', {
          description: comparison.issues.join(' | ')
        })
      }
      
    } catch (error) {
      log.error('Error comparing plans:', error)
      toast.error('שגיאה בהשוואת התכניות')
    } finally {
      setAutoFetchingPrev(false)
      setAutoFetchingNew(false)
    }
  }

  const handleAutoFetchMarketData = async () => {
    if (!determiningDate) {
      toast.error('יש להזין מועד קובע לפני שליפת נתוני שוק')
      return
    }

    setMarketDataFetching(true)
    
    try {
      const result = await marketDataSync.autoFetchForBettermentLevy(
        determiningDate,
        propertyLocation,
        searchRadius
      )

      setFetchedTransactions(result.transactions)

      if (result.transactions.length > 0) {
        setMarketValue(result.marketValue.valuePerSqm)
        
        const confidenceEmoji = result.marketValue.confidence === 'high' ? '🟢' : 
                               result.marketValue.confidence === 'medium' ? '🟡' : '🔴'
        
        toast.success(`נמצאו ${result.transactions.length} עסקאות רלוונטיות! ${confidenceEmoji}`, {
          description: `שווי שוק: ₪${result.marketValue.valuePerSqm.toLocaleString('he-IL')}/מ"ר | רמת ביטחון: ${
            result.marketValue.confidence === 'high' ? 'גבוהה' : 
            result.marketValue.confidence === 'medium' ? 'בינונית' : 'נמוכה'
          }`,
          duration: 6000
        })

        const marketDataItems: MarketData[] = result.transactions.slice(0, 10).map(t => ({
          transactionDate: t.transactionDate,
          pricePerSqm: t.pricePerSqm,
          source: t.source === 'land-registry' ? 'רשם המקרקעין' : 
                  t.source === 'tax-authority' ? 'רשות המיסים' : 
                  t.source === 'broker' ? 'מתווך' : 'פלטפורמה',
          location: t.address,
          verified: t.verified
        }))
        
        setMarketDataSource(marketDataItems)
      } else {
        toast.warning('לא נמצאו עסקאות רלוונטיות למועד הקובע', {
          description: 'ניתן להזין ידנית את שווי השוק למ"ר או להרחיב את רדיוס החיפוש',
          duration: 5000
        })
      }
      
    } catch (error) {
      log.error('Error fetching market data:', error)
      toast.error('שגיאה בשליפת נתוני שוק', {
        description: 'אנא נסה שוב או הזן נתונים ידנית'
      })
    } finally {
      setMarketDataFetching(false)
    }
  }

  const calculateDelta = () => {
    const deltaBuildingRights = {
      farDelta: newStatus.buildingRights.farPercentage - previousStatus.buildingRights.farPercentage,
      floorsDelta: newStatus.buildingRights.floors - previousStatus.buildingRights.floors,
      mainAreaDelta: newStatus.buildingRights.mainArea - previousStatus.buildingRights.mainArea,
      serviceAreaDelta: newStatus.buildingRights.serviceArea - previousStatus.buildingRights.serviceArea,
      totalAreaDelta: (newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea) - 
                       (previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea)
    }

    return deltaBuildingRights
  }

  const calculateBettermentValue = () => {
    const prevTotal = previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea
    const newTotal = newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea
    
    if (prevTotal === 0 && newTotal === 0) {
      toast.error('חסרים שטחי בנייה - אין מידע אוטומטי', {
        description: '📋 מספרי התכניות שהזנת תקינים אך המערכת לא מחזירה שטחים. מלא ידנית את השטחים במ"ר בשני הטאבים (מצב קודם + מצב חדש). שים לב: המערכת משתמשת במאגר סימולציה - אינה מחוברת למאגרים ממשלתיים אמיתיים.'
      })
      return null
    }
    
    if (prevTotal === 0) {
      toast.error('חסרים שטחים במצב קודם (תכנית ישנה)', {
        description: `📐 לחץ על טאב "מצב קודם" ומלא ידנית: שטח עיקרי + שטח שירות (במ"ר). לדוגמה: אם המגרש 500 מ"ר ואחוזי הבנייה 100% → שטח עיקרי = 500 מ"ר. המערכת עובדת עם מאגר סימולציה ולא שולפת נתונים אמיתיים.`
      })
      return null
    }
    
    if (newTotal === 0) {
      toast.error('חסרים שטחים במצב חדש (תכנית משביחה)', {
        description: `📐 לחץ על טאב "מצב חדש משביח" ומלא ידנית: שטח עיקרי + שטח שירות (במ"ר). השטח החדש צריך להיות גדול מהקודם. המערכת עובדת עם מאגר סימולציה ולא שולפת נתונים אמיתיים.`
      })
      return null
    }
    
    const delta = calculateDelta()
    
    if (delta.totalAreaDelta <= 0) {
      toast.error('אין תוספת זכויות בנייה - לא ניתן לחשב היטל השבחה', {
        description: `🔍 הסיבה: המצב החדש (${newTotal.toLocaleString('he-IL')} מ"ר) קטן או שווה למצב הקודם (${prevTotal.toLocaleString('he-IL')} מ"ר). לתכנית להיחשב "משביחה" היא חייבת להוסיף זכויות בנייה. בדוק שמילאת את השטחים נכון או נסה להזין מספרי תכניות שונים.`
      })
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

  const handleCalculate = async () => {
    if (!determiningDate) {
      toast.error('יש להזין מועד קובע')
      return
    }

    if (lotSize <= 0) {
      toast.error('יש להזין גודל מגרש')
      return
    }

    const result = calculateBettermentValue()
    
    if (result) {
      toast.success('החישוב הושלם בהצלחה')
    }
  }

  const saveAsScenario = () => {
    const scenarioName = prompt('הזן שם לתרחיש:', `תרחיש ${(scenarios || []).length + 1}`)
    if (!scenarioName) return

    const newScenario: BettermentScenario = {
      id: uid('levy'),
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

  const saveToHistory = () => {
    if (!selectedPropertyId && !propertyAddress) {
      toast.error('יש להזין זיהוי נכס או כתובת לפני שמירה להיסטוריה')
      return
    }

    const result = calculateBettermentValue()
    if (!result) {
      toast.error('לא ניתן לשמור - אין תוצאת חישוב תקינה')
      return
    }

    const notes = prompt('הוסף הערות לרשומה ההיסטורית (אופציונלי):')

    const historicalRecord: PropertyHistoricalRecord = {
      id: uid('levy'),
      propertyIdentifier: selectedPropertyId || `כתובת-${Date.now()}`,
      propertyAddress: propertyAddress || 'לא צוין',
      createdAt: new Date().toISOString(),
      scenario: {
        id: uid('levy'),
        name: `תיעוד ${new Date().toLocaleDateString('he-IL')}`,
        previousStatus,
        newStatus,
        determiningDate,
        lotSize,
        marketValue,
        marketDataSource,
        calculationMethod
      },
      calculationResult: result,
      notes: notes || ''
    }

    setHistoricalRecords((current) => [...(current || []), historicalRecord])
    toast.success('התיעוד ההיסטורי נשמר בהצלחה')
  }

  const loadScenario = (scenario: BettermentScenario) => {
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

  const deleteScenario = (id: string) => {
    setScenarios((current) => (current || []).filter(s => s.id !== id))
    if (activeScenarioId === id) {
      setActiveScenarioId(null)
    }
    toast.success('התרחיש נמחק')
  }

  const deleteHistoricalRecord = (id: string) => {
    setHistoricalRecords((current) => (current || []).filter(r => r.id !== id))
    toast.success('הרשומה ההיסטורית נמחקה')
  }

  const getPropertyHistory = (propertyId: string) => {
    return (historicalRecords || [])
      .filter(r => r.propertyIdentifier === propertyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const getUniqueProperties = () => {
    const uniqueProps = new Map<string, PropertyHistoricalRecord>()
    ;(historicalRecords || []).forEach(record => {
      if (!uniqueProps.has(record.propertyIdentifier)) {
        uniqueProps.set(record.propertyIdentifier, record)
      }
    })
    return Array.from(uniqueProps.values())
  }

  const duplicateScenario = (scenario: BettermentScenario) => {
    const newScenario: BettermentScenario = {
      ...scenario,
      id: uid('levy'),
      name: `${scenario.name} (עותק)`
    }
    setScenarios((current) => [...(current || []), newScenario])
    toast.success('התרחיש שוכפל בהצלחה')
  }

  const calculateScenarioResult = (scenario: BettermentScenario) => {
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

  const validatePlanNumber = (planNumber: string): boolean => {
    if (!planNumber || planNumber.trim() === '') {
      return false
    }
    
    const formats = [
      /^\d{3}-\d{7}$/,
      /^[א-ת]{2}\/[א-ת]{2}\/\d{2}\/\d{4}\/[א-ת]$/,
      /^תב[״"]ע\/\d+\/[א-ת]?$/i,
      /^תב[״"]ע\/[א-ת]{2}\/\d+\/[א-ת]?$/i,
      /^[א-ת]{2}\/\d+\/[א-ת]?$/,
      /^\d+-\d+$/,
    ]
    
    return formats.some(format => format.test(planNumber.trim()))
  }

  const _handlePlanNumberChange = (value: string, type: 'prev' | 'new') => {
    if (type === 'prev') {
      setPreviousStatus({ ...previousStatus, planNumber: value })
      if (value.trim() !== '') {
        const isValid = validatePlanNumber(value)
        setPlanValidationStatus(prev => ({ 
          ...prev, 
          prev: isValid ? 'המספר בפורמט תקין' : 'פורמט תכנית מקובל - ניתן להמשיך' 
        }))
      } else {
        setPlanValidationStatus(prev => ({ ...prev, prev: undefined }))
      }
    } else {
      setNewStatus({ ...newStatus, planNumber: value })
      if (value.trim() !== '') {
        const isValid = validatePlanNumber(value)
        setPlanValidationStatus(prev => ({ 
          ...prev, 
          new: isValid ? 'המספר בפורמט תקין' : 'פורמט תכנית מקובל - ניתן להמשיך' 
        }))
      } else {
        setPlanValidationStatus(prev => ({ ...prev, new: undefined }))
      }
    }
  }

  const _handleAIAnalysis = async () => {
    if (!determiningDate) {
      toast.error('יש להזין מועד קובע תחילה')
      return
    }

    toast.info('מנתח זכויות תכנוניות באמצעות AI...')
    
    setTimeout(() => {
      toast.success('ניתוח AI הושלם - נמצאו 3 עסקאות רלוונטיות למועד הקובע')
      
      setMarketDataSource([
        {
          transactionDate: determiningDate,
          pricePerSqm: 18500,
          source: 'מידע נדלן - עסקת השוואה 1',
          location: 'באותו אזור',
          verified: true
        },
        {
          transactionDate: determiningDate,
          pricePerSqm: 19200,
          source: 'מידע נדלן - עסקת השוואה 2',
          location: 'באותו אזור',
          verified: true
        },
        {
          transactionDate: determiningDate,
          pricePerSqm: 17800,
          source: 'מידע נדלן - עסקת השוואה 3',
          location: 'באותו אזור',
          verified: true
        }
      ])
      
      const avgPrice = (18500 + 19200 + 17800) / 3
      setMarketValue(avgPrice)
    }, 2000)
  }

  const result = calculateBettermentValue()

  if (historicalMode) {
    const uniqueProperties = getUniqueProperties()
    
    return (
      <div className="container mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-3 rounded-xl">
                <ClockCounterClockwise className="w-8 h-8 text-primary" weight="duotone" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
                  היסטוריית היטל השבחה
                </h1>
                <p className="text-muted-foreground">
                  מעקב אחר שינויים היסטוריים בהיטל השבחה לנכסים לאורך זמן
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setHistoricalMode(false)}
                className="gap-2"
              >
                <Calculator className="w-4 h-4" weight="duotone" />
                חזור למחשבון
              </Button>
            </div>
          </div>

          {uniqueProperties.length === 0 ? (
            <Card className="glass-effect p-12 text-center">
              <ClockCounterClockwise className="w-16 h-16 text-muted-foreground mx-auto mb-4" weight="duotone" />
              <h3 className="text-xl font-semibold mb-2">אין נתונים היסטוריים</h3>
              <p className="text-muted-foreground mb-6">
                שמור חישובי היטל השבחה להיסטוריה כדי לעקוב אחר שינויים לאורך זמן
              </p>
              <Button
                variant="outline"
                onClick={() => setHistoricalMode(false)}
                className="gap-2"
              >
                <Calculator className="w-4 h-4" weight="duotone" />
                התחל חישוב
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {uniqueProperties.map(property => {
                const propertyHistory = getPropertyHistory(property.propertyIdentifier)
                const latestRecord = propertyHistory[0]
                const oldestRecord = propertyHistory[propertyHistory.length - 1]
                const hasMultipleRecords = propertyHistory.length > 1

                let changePercentage = 0
                let changeAmount = 0
                if (hasMultipleRecords && oldestRecord.calculationResult.levy > 0) {
                  changeAmount = latestRecord.calculationResult.levy - oldestRecord.calculationResult.levy
                  changePercentage = (changeAmount / oldestRecord.calculationResult.levy) * 100
                }

                return (
                  <Card key={property.propertyIdentifier} className="glass-effect p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{property.propertyAddress}</h3>
                          <p className="text-sm text-muted-foreground">
                            מזהה: {property.propertyIdentifier}
                          </p>
                          <Badge variant="outline" className="mt-2">
                            {propertyHistory.length} רשומות היסטוריות
                          </Badge>
                        </div>
                      </div>

                      {hasMultipleRecords && (
                        <div className="p-4 bg-linear-to-br from-primary/10 to-accent/10 border border-primary/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <ChartLine className="w-5 h-5 text-primary" weight="duotone" />
                            <span className="font-semibold text-sm">שינוי לאורך זמן</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">היטל ראשון:</span>
                              <span className="font-mono text-sm">
                                ₪{oldestRecord.calculationResult.levy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">היטל אחרון:</span>
                              <span className="font-mono text-sm">
                                ₪{latestRecord.calculationResult.levy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold">שינוי:</span>
                              <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold ${changeAmount >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {changeAmount >= 0 ? '+' : ''}₪{changeAmount.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                </span>
                                <Badge variant={changeAmount >= 0 ? 'default' : 'destructive'}>
                                  {changeAmount >= 0 ? '+' : ''}{changePercentage.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        <div className="text-sm font-semibold text-muted-foreground px-1">
                          היסטוריית חישובים
                        </div>
                        {propertyHistory.map((record, index) => (
                          <motion.div
                            key={record.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Calendar className="w-4 h-4 text-muted-foreground" weight="duotone" />
                                  <span className="text-sm font-semibold">
                                    {new Date(record.createdAt).toLocaleDateString('he-IL', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  {index === 0 && (
                                    <Badge variant="secondary" className="text-xs">אחרון</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  מועד קובע: {record.scenario.determiningDate}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteHistoricalRecord(record.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash className="w-4 h-4" weight="duotone" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground block mb-1">תכנית קודמת:</span>
                                <span className="font-mono text-xs">{record.scenario.previousStatus.planNumber}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-1">תכנית חדשה:</span>
                                <span className="font-mono text-xs">{record.scenario.newStatus.planNumber}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-1">תוספת זכויות:</span>
                                <span className="font-mono text-success font-semibold">
                                  +{record.calculationResult.delta.totalAreaDelta.toLocaleString('he-IL')} מ"ר
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block mb-1">שווי/מ"ר:</span>
                                <span className="font-mono">
                                  ₪{record.calculationResult.valuePerSqm.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>

                            <Separator className="my-3" />

                            <div className="p-3 bg-accent/10 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-muted-foreground">היטל השבחה:</span>
                                <span className="font-mono text-lg font-bold text-accent">
                                  ₪{record.calculationResult.levy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>

                            {record.notes && (
                              <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                <Info className="w-3 h-3 inline ml-1" weight="duotone" />
                                {record.notes}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  if (comparisonMode && scenarios && scenarios.length > 0) {
    const scenarioResults = scenarios.map(scenario => ({
      scenario,
      result: calculateScenarioResult(scenario)
    }))

    const selectedScenarios = scenarioResults.filter(sr => 
      selectedForComparison.includes(sr.scenario.id)
    )

    const toggleScenarioSelection = (id: string) => {
      setSelectedForComparison(current => 
        current.includes(id) 
          ? current.filter(i => i !== id)
          : [...current, id]
      )
    }

    return (
      <div className="container mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-3 rounded-xl">
                <Scales className="w-8 h-8 text-primary" weight="duotone" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
                  השוואת תרחישי היטל השבחה
                </h1>
                <p className="text-muted-foreground">
                  השוואה צד לצד של מספר תרחישים - עלות וביצועים
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                <Button
                  variant={comparisonView === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setComparisonView('grid')}
                  className="gap-2"
                >
                  כרטיסים
                </Button>
                <Button
                  variant={comparisonView === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setComparisonView('table')}
                  className="gap-2"
                >
                  טבלה
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setComparisonMode(false)}
                className="gap-2"
              >
                <Calculator className="w-4 h-4" weight="duotone" />
                חזור למצב רגיל
              </Button>
            </div>
          </div>

          {selectedForComparison.length >= 2 && (
            <Card className="glass-effect p-6 bg-linear-to-br from-accent/10 to-primary/10 border-accent/50">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ChartLine className="w-6 h-6 text-accent" weight="duotone" />
                סיכום השוואתי - {selectedForComparison.length} תרחישים נבחרו
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-background/80 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">טווח עלות היטל</div>
                  <div className="space-y-1">
                    <div className="font-mono text-lg font-bold text-success">
                      מינימום: ₪{Math.min(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.levy)).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="font-mono text-lg font-bold text-destructive">
                      מקסימום: ₪{Math.max(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.levy)).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-background/80 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">הפרש עלות</div>
                  <div className="font-mono text-lg font-bold text-warning">
                    ₪{(Math.max(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.levy)) - 
                       Math.min(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.levy))).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((Math.max(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.levy)) - 
                       Math.min(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.levy))) / 
                       Math.min(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.levy)) * 100).toFixed(1)}% הבדל
                  </div>
                </div>

                <div className="p-4 bg-background/80 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">טווח תוספת זכויות</div>
                  <div className="space-y-1">
                    <div className="font-mono text-lg font-bold text-success">
                      {Math.min(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.delta.totalAreaDelta)).toLocaleString('he-IL')} מ"ר
                    </div>
                    <div className="font-mono text-lg font-bold">
                      {Math.max(...selectedScenarios.filter(sr => sr.result).map(sr => sr.result!.delta.totalAreaDelta)).toLocaleString('he-IL')} מ"ר
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-background/80 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">עלות ממוצעת למ"ר</div>
                  <div className="font-mono text-lg font-bold text-primary">
                    ₪{(selectedScenarios.filter(sr => sr.result).reduce((sum, sr) => 
                      sum + (sr.result!.levy / sr.result!.delta.totalAreaDelta), 0) / 
                      selectedScenarios.filter(sr => sr.result).length).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    עלות היטל ממוצעת לכל מ"ר זכויות
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-background/60 rounded-lg">
                <div className="text-sm font-semibold mb-3">המלצה אופטימלית:</div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" weight="fill" />
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const bestValue = selectedScenarios.filter(sr => sr.result).reduce((best, sr) => {
                        const costPerSqm = sr.result!.levy / sr.result!.delta.totalAreaDelta
                        const bestCostPerSqm = best.result!.levy / best.result!.delta.totalAreaDelta
                        return costPerSqm < bestCostPerSqm ? sr : best
                      })
                      const costPerSqm = bestValue.result!.levy / bestValue.result!.delta.totalAreaDelta
                      return (
                        <>
                          <strong className="text-accent">{bestValue.scenario.name}</strong> מציע את 
                          העלות הנמוכה ביותר למ"ר (₪{costPerSqm.toLocaleString('he-IL', { maximumFractionDigits: 0 })}/מ"ר) 
                          עם תוספת זכויות של {bestValue.result!.delta.totalAreaDelta.toLocaleString('he-IL')} מ"ר
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {comparisonView === 'table' && selectedForComparison.length >= 2 ? (
            <Card className="glass-effect overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-4 font-semibold">פרמטר</th>
                      {selectedScenarios.map(sr => (
                        <th key={sr.scenario.id} className="text-center p-4 font-semibold border-r border-border">
                          <div className="flex flex-col items-center gap-2">
                            <span>{sr.scenario.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleScenarioSelection(sr.scenario.id)}
                              className="h-6 text-xs text-muted-foreground hover:text-destructive"
                            >
                              הסר
                            </Button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">תכנית קודמת</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border font-mono text-sm">
                          {sr.scenario.previousStatus.planNumber || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">תכנית חדשה</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border font-mono text-sm">
                          {sr.scenario.newStatus.planNumber || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">מועד קובע</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border text-sm">
                          {sr.scenario.determiningDate}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">גודל מגרש</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border font-mono">
                          {sr.scenario.lotSize.toLocaleString('he-IL')} מ"ר
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border bg-accent/5">
                      <td className="p-4 font-bold">תוספת זכויות בנייה</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border">
                          {sr.result ? (
                            <span className="font-mono text-lg font-bold text-success">
                              +{sr.result.delta.totalAreaDelta.toLocaleString('he-IL')} מ"ר
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">אין נתונים</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">שווי שוק/מ"ר</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border">
                          {sr.result ? (
                            <span className="font-mono">
                              ₪{sr.result.valuePerSqm.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">שווי השבחה</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border">
                          {sr.result ? (
                            <span className="font-mono font-semibold">
                              ₪{sr.result.bettermentValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border bg-primary/5">
                      <td className="p-4 font-bold">היטל השבחה (50%)</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border">
                          {sr.result ? (
                            <span className="font-mono text-xl font-bold text-accent">
                              ₪{sr.result.levy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">עלות למ"ר זכויות</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border">
                          {sr.result ? (
                            <div className="space-y-1">
                              <span className="font-mono font-semibold text-warning">
                                ₪{(sr.result.levy / sr.result.delta.totalAreaDelta).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                למ"ר תוספת
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">טווח שמרני (85%)</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border">
                          {sr.result ? (
                            <span className="font-mono text-sm">
                              ₪{sr.result.conservativeLevy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <td className="p-4 font-medium bg-muted/20">טווח מקסימלי (115%)</td>
                      {selectedScenarios.map(sr => (
                        <td key={sr.scenario.id} className="p-4 text-center border-r border-border">
                          {sr.result ? (
                            <span className="font-mono text-sm">
                              ₪{sr.result.maximumLevy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {comparisonView === 'grid' && (
            <>
              {selectedForComparison.length < 2 && (
                <Alert className="bg-accent/10 border-accent/30">
                  <Info className="h-4 w-4" weight="duotone" />
                  <AlertTitle>בחר לפחות 2 תרחישים להשוואה</AlertTitle>
                  <AlertDescription>
                    סמן את התיבות בתרחישים שברצונך להשוות כדי לקבל ניתוח מפורט של הבדלי עלות וביצועים
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {scenarios.map((scenario, index) => {
                const scenarioResult = calculateScenarioResult(scenario)
                const isSelected = selectedForComparison.includes(scenario.id)
                
                return (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`glass-effect p-6 h-full transition-all ${
                      isSelected ? 'ring-2 ring-accent shadow-lg shadow-accent/20' : ''
                    }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleScenarioSelection(scenario.id)}
                              className="w-5 h-5 rounded border-border text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer"
                              aria-label={`בחר תרחיש ${scenario.name}`}
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-1">{scenario.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              מועד קובע: {scenario.determiningDate}
                            </p>
                            {isSelected && (
                              <Badge variant="default" className="mt-2 bg-accent text-accent-foreground">
                                נבחר להשוואה
                              </Badge>
                            )}
                          </div>
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

                      <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                          <div className="text-sm font-semibold text-muted-foreground mb-2">פרטי תכנית</div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">תכנית קודמת:</span>
                            <span className="font-mono">{scenario.previousStatus.planNumber || 'לא הוזן'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">תכנית חדשה:</span>
                            <span className="font-mono">{scenario.newStatus.planNumber || 'לא הוזן'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">גודל מגרש:</span>
                            <span className="font-mono">{scenario.lotSize.toLocaleString('he-IL')} מ"ר</span>
                          </div>
                        </div>

                        {scenarioResult ? (
                          <>
                            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                              <div className="text-sm font-semibold text-muted-foreground mb-3">תוספת זכויות</div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">שטח עיקרי:</span>
                                  <span className="font-mono text-success font-semibold">
                                    +{scenarioResult.delta.mainAreaDelta.toLocaleString('he-IL')} מ"ר
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">שטח שירות:</span>
                                  <span className="font-mono text-success font-semibold">
                                    +{scenarioResult.delta.serviceAreaDelta.toLocaleString('he-IL')} מ"ר
                                  </span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold">סה"כ תוספת:</span>
                                  <span className="font-mono text-lg font-bold text-success">
                                    +{scenarioResult.delta.totalAreaDelta.toLocaleString('he-IL')} מ"ר
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                              <div className="text-sm font-semibold text-muted-foreground mb-2">שווי שוק</div>
                              <div className="font-mono text-xl font-bold text-accent mb-1">
                                ₪{scenarioResult.valuePerSqm.toLocaleString('he-IL', { maximumFractionDigits: 0 })}/מ"ר
                              </div>
                              <div className="text-xs text-muted-foreground">
                                בהתאם למועד הקובע
                              </div>
                            </div>

                            <div className="p-5 bg-linear-to-br from-accent/20 to-primary/20 border-2 border-accent rounded-xl">
                              <div className="text-sm font-semibold text-muted-foreground mb-2">היטל השבחה</div>
                              <div className="font-mono text-2xl font-bold text-accent mb-3">
                                ₪{scenarioResult.levy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex justify-between">
                                  <span>שמרני:</span>
                                  <span className="font-mono">₪{scenarioResult.conservativeLevy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>מקסימלי:</span>
                                  <span className="font-mono">₪{scenarioResult.maximumLevy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                              <div className="text-sm font-semibold text-muted-foreground mb-2">ביצועים</div>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">עלות למ"ר זכויות:</span>
                                  <span className="font-mono font-semibold text-warning">
                                    ₪{(scenarioResult.levy / scenarioResult.delta.totalAreaDelta).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">יחס עלות/תועלת:</span>
                                  <span className="font-mono font-semibold">
                                    {((scenarioResult.levy / scenarioResult.bettermentValue) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">תוספת קומות:</span>
                                  <span className="font-mono font-semibold text-success">
                                    +{scenarioResult.delta.floorsDelta}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              className="w-full gap-2"
                              onClick={() => {
                                loadScenario(scenario)
                                setComparisonMode(false)
                              }}
                            >
                              <FileText className="w-4 h-4" weight="duotone" />
                              פתח ועבוד על תרחיש זה
                            </Button>
                          </>
                        ) : (
                          <div className="p-8 bg-muted/30 rounded-lg text-center">
                            <Warning className="w-12 h-12 text-muted-foreground mx-auto mb-2" weight="duotone" />
                            <p className="text-sm text-muted-foreground">
                              אין תוספת זכויות בתרחיש זה
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {scenarios.length === 0 && (
            <Card className="glass-effect p-12 text-center">
              <Scales className="w-16 h-16 text-muted-foreground mx-auto mb-4" weight="duotone" />
              <h3 className="text-xl font-semibold mb-2">אין תרחישים לשמור</h3>
              <p className="text-muted-foreground mb-6">
                צור תרחיש חדש במצב הרגיל ושמור אותו כדי להתחיל השוואה
              </p>
              <Button
                variant="outline"
                onClick={() => setComparisonMode(false)}
                className="gap-2"
              >
                <Calculator className="w-4 h-4" weight="duotone" />
                חזור למצב רגיל
              </Button>
            </Card>
          )}
        </motion.div>
      </div>
    )
  }

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
            <h1 className="text-3xl font-bold bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
              מחשבון היטל השבחה חכם
            </h1>
            <p className="text-muted-foreground">
              מנוע חישוב מבוסס-נתונים לקביעת היטל השבחה על פי שינוי תכנוני
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
            <Dialog open={showGuide} onOpenChange={setShowGuide}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Book className="w-4 h-4" weight="duotone" />
                  מדריך למילוי
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    <Book className="w-6 h-6 text-primary" weight="duotone" />
                    מדריך מפורט למילוי מחשבון היטל השבחה
                  </DialogTitle>
                  <DialogDescription>
                    הוראות שלב אחר שלב למילוי נכון של כל שדה במחשבון
                  </DialogDescription>
                </DialogHeader>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" weight="duotone" />
                        מועד קובע - מה זה ואיך למלא?
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 text-base">
                      <p className="font-semibold text-foreground">מהו מועד קובע?</p>
                      <p className="text-muted-foreground">
                        המועד הקובע הוא התאריך שבו נקבע שווי הקרקע לצורך חישוב היטל ההשבחה. 
                        בדרך כלל זהו תאריך פרסום התכנית לעיון הציבור או תאריך אישורה.
                      </p>
                      <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
                        <p className="font-semibold mb-2 text-primary">איך למצוא את המועד הקובע?</p>
                        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                          <li>בדוק בהחלטה על אישור התכנית - המועד יופיע בדרך כלל בפרק "הוראות כלליות"</li>
                          <li>במקרים מסוימים זהו מועד הפקדת התכנית או מועד פרסומה ברשומות</li>
                          <li>ניתן לפנות לוועדה המקומית לקבלת אישור על המועד הקובע</li>
                          <li>במקרים מורכבים (שינויים בתכנית) - היוועץ בשמאי מקרקעין מוסמך</li>
                        </ul>
                      </div>
                      <Alert>
                        <Warning className="h-4 w-4" weight="duotone" />
                        <AlertTitle>חשוב!</AlertTitle>
                        <AlertDescription>
                          המועד הקובע משפיע ישירות על שווי הזכויות ועל גובה ההיטל. ודא שהמועד נכון.
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" weight="duotone" />
                        מצב קודם - תכנית ישנה
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-base">
                      <div className="space-y-3">
                        <p className="font-semibold text-foreground">מהו "מצב קודם"?</p>
                        <p className="text-muted-foreground">
                          זהו המצב התכנוני שהיה קיים בנכס לפני אישור התכנית החדשה. כולל את כל הזכויות והמגבלות 
                          שחלו על הנכס בהתאם לתכנית הקודמת.
                        </p>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <p className="font-semibold">שדות למילוי:</p>
                        
                        <div className="space-y-2">
                          <p className="font-medium text-sm">📋 מספר תכנית:</p>
                          <p className="text-sm text-muted-foreground">
                            הזן את מספר התכנית החלה על הנכס לפני השינוי (למשל: תב״ע/123/א)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="font-medium text-sm">📐 אחוזי בנייה (%):</p>
                          <p className="text-sm text-muted-foreground">
                            אחוזי הבנייה המותרים ביחס לשטח המגרש. למשל: אם המגרש 500 מ"ר ואחוזי הבנייה 100%, 
                            ניתן לבנות עד 500 מ"ר.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="font-medium text-sm">🏢 מספר קומות:</p>
                          <p className="text-sm text-muted-foreground">
                            מספר הקומות המקסימלי המותר על פי התכנית הקודמת.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="font-medium text-sm">📏 שטח עיקרי (מ"ר):</p>
                          <p className="text-sm text-muted-foreground">
                            שטח עיקרי = שטח ראשי למגורים/מסחר. לא כולל מרפסות, מחסנים וחניות.
                            חשב: גודל מגרש × אחוזי בנייה.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="font-medium text-sm">🔧 שטח שירות (מ"ר):</p>
                          <p className="text-sm text-muted-foreground">
                            שטחי עזר כגון: מרפסות סגורות, מחסנים, חניות מקורות. בדוק בתכנית את אחוזי השירות המותרים.
                          </p>
                        </div>
                      </div>

                      <Alert className="bg-accent/10 border-accent/30">
                        <Info className="h-4 w-4" weight="duotone" />
                        <AlertTitle>טיפ חשוב</AlertTitle>
                        <AlertDescription>
                          במקרה שהנכס לא היה בנוי - הזן את הזכויות התכנוניות המקסימליות שהיו מותרות, 
                          גם אם לא נוצלו בפועל.
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <TrendUp className="w-5 h-5 text-success" weight="duotone" />
                        מצב חדש - תכנית משביחה
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-base">
                      <div className="space-y-3">
                        <p className="font-semibold text-foreground">מהו "מצב חדש משביח"?</p>
                        <p className="text-muted-foreground">
                          זהו המצב התכנוני החדש לאחר אישור התכנית החדשה. התכנית נחשבת "משביחה" אם היא מוסיפה 
                          זכויות בנייה, משנה ייעוד או משפרת את פוטנציאל הנכס.
                        </p>
                      </div>

                      <div className="bg-success/10 p-4 rounded-lg border border-success/30 space-y-3">
                        <p className="font-semibold text-success">מה נחשב להשבחה?</p>
                        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                          <li>תוספת אחוזי בנייה או קומות</li>
                          <li>שינוי ייעוד מחקלאי למגורים/מסחר</li>
                          <li>הוספת שימושים בעלי ערך גבוה יותר</li>
                          <li>ביטול מגבלות תכנוניות</li>
                          <li>אפשרות לפיצול הנכס ליחידות נוספות</li>
                        </ul>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="font-semibold mb-3">כיצד למלא את השדות:</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          מלא את אותם שדות כמו ב"מצב קודם", אך הפעם בהתאם לתכנית החדשה:
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                          <li>מספר התכנית החדשה</li>
                          <li>אחוזי בנייה חדשים (גבוהים יותר)</li>
                          <li>מספר קומות חדש</li>
                          <li>שטח עיקרי חדש (מחושב מהאחוזים החדשים)</li>
                          <li>שטח שירות חדש</li>
                        </ul>
                      </div>

                      <Alert className="bg-warning/10 border-warning/30">
                        <Warning className="h-4 w-4" weight="duotone" />
                        <AlertTitle>שים לב!</AlertTitle>
                        <AlertDescription>
                          אם השטחים במצב החדש קטנים או שווים למצב הקודם - לא תהיה השבחה ולא יחושב היטל.
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-primary" weight="duotone" />
                        שווי שוק וחישוב ההיטל
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-base">
                      <div className="space-y-3">
                        <p className="font-semibold text-foreground">איך קובעים את שווי השוק?</p>
                        <p className="text-muted-foreground">
                          שווי השוק נקבע על פי עסקאות דומות שבוצעו באזור במועד הקובע או בסמוך אליו.
                        </p>
                      </div>

                      <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 space-y-3">
                        <p className="font-semibold text-primary">שימוש בכפתור "שלוף נתוני שוק":</p>
                        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                          <li>ודא שמילאת את המועד הקובע</li>
                          <li>לחץ על הכפתור "שלוף נתוני שוק למועד הקובע"</li>
                          <li>המערכת תחפש עסקאות דומות באזור</li>
                          <li>תוצג לך רשימת עסקאות עם מחיר למ"ר</li>
                          <li>המערכת תחשב ממוצע משוקלל אוטומטית</li>
                        </ol>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <p className="font-semibold">נוסחת החישוב:</p>
                        <div className="bg-background p-3 rounded border font-mono text-sm">
                          <div className="space-y-1 text-muted-foreground">
                            <div>שווי השבחה = תוספת זכויות (מ"ר) × שווי למ"ר</div>
                            <div className="mt-2">היטל השבחה = שווי ההשבחה × 50%</div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">
                          <strong>דוגמה:</strong> אם התווספו 200 מ"ר זכויות, ושווי השוק הוא 15,000 ₪/מ"ר:
                        </p>
                        <div className="bg-background p-3 rounded border font-mono text-sm text-accent">
                          <div>שווי השבחה = 200 × 15,000 = 3,000,000 ₪</div>
                          <div>היטל = 3,000,000 × 50% = 1,500,000 ₪</div>
                        </div>
                      </div>

                      <Alert>
                        <CheckCircle className="h-4 w-4 text-success" weight="fill" />
                        <AlertTitle>המערכת מספקת טווחים</AlertTitle>
                        <AlertDescription>
                          בנוסף לחישוב הממוצע, המערכת מציגה גם טווח שמרני (85%) וטווח מקסימלי (115%) 
                          כדי לתת תמונה מלאה יותר.
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Question className="w-5 h-5 text-primary" weight="duotone" />
                        שאלות נפוצות
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-base">
                      <div className="space-y-4">
                        <div className="border-r-4 border-primary pr-4">
                          <p className="font-semibold mb-2">🤔 מה אם אני לא יודע את השטחים המדויקים?</p>
                          <p className="text-sm text-muted-foreground">
                            חשב לפי הנוסחה: שטח עיקרי = גודל מגרש × אחוזי בנייה. 
                            שטח שירות בדרך כלל 15-25% מהשטח העיקרי.
                          </p>
                        </div>

                        <div className="border-r-4 border-primary pr-4">
                          <p className="font-semibold mb-2">🤔 האם המחשבון תקף משפטית?</p>
                          <p className="text-sm text-muted-foreground">
                            המחשבון הוא כלי עזר בלבד. לצורך הגשה רשמית לרשויות יש צורך בשומה מקצועית 
                            של שמאי מקרקעין מוסמך.
                          </p>
                        </div>

                        <div className="border-r-4 border-primary pr-4">
                          <p className="font-semibold mb-2">🤔 מה ההבדל בין שיטות החישוב?</p>
                          <p className="text-sm text-muted-foreground">
                            בחר "סטנדרטית (50%)" לרוב המקרים. שיטות אחרות חלות במקרים מיוחדים 
                            כגון קרקע חקלאית או התחדשות עירונית עם הנחות.
                          </p>
                        </div>

                        <div className="border-r-4 border-primary pr-4">
                          <p className="font-semibold mb-2">🤔 למה להשתמש במצב השוואה?</p>
                          <p className="text-sm text-muted-foreground">
                            מצב השוואה מאפשר לך לשמור מספר תרחישים ולהשוות ביניהם - שימושי כאשר בוחנים 
                            מספר אפשרויות תכנוניות או משווים תכניות שונות.
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionTrigger className="text-lg font-semibold">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" weight="duotone" />
                        מקורות מידע ואמינות נתונים
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 text-base">
                      <div className="space-y-3">
                        <p className="font-semibold text-foreground">מאיפה המערכת שולפת נתונים?</p>
                        <p className="text-muted-foreground">
                          המערכת משתמשת במדמה (simulator) של מאגרי מידע ממשלתיים ישראליים. 
                          בסביבת הפיתוח הנוכחית, הנתונים הם דמויים ומיועדים להדגמה בלבד.
                        </p>
                      </div>

                      <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 space-y-3">
                        <p className="font-semibold text-primary">מאגרי מידע ממשלתיים (בפיתוח):</p>
                        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                          <li><strong>iPlan - מאגר התכניות הארצי:</strong> נתוני תכניות בנייה, זכויות ומגבלות</li>
                          <li><strong>מבא"ת - מערכת ממוכנת לבקשות ותכניות:</strong> מידע תכנוני מעודכן</li>
                          <li><strong>GovMap - מפת ישראל ממשלתית:</strong> נתונים גיאוגרפיים ותכנוניים</li>
                          <li><strong>מאגרי רשויות מקומיות:</strong> מידע ספציפי לכל עיר ומועצה</li>
                          <li><strong>מינהל מקרקעי ישראל:</strong> נתוני עסקאות ושווי קרקע</li>
                        </ul>
                      </div>

                      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <p className="font-semibold">נתונים קיימים במאגר הדגמה:</p>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" weight="fill" />
                            <div>
                              <strong>415-0792036</strong> - תכנית מקיפה רמלה 
                              <span className="text-muted-foreground mr-1">(180% בנייה, 10 קומות)</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" weight="fill" />
                            <div>
                              <strong>לה/במ/18/1000/א</strong> - תכנית תל אביב ישנה 
                              <span className="text-muted-foreground mr-1">(120% בנייה, 8 קומות)</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" weight="fill" />
                            <div>
                              <strong>רמ/מק/3/250</strong> - תכנית רמלה מקומית 
                              <span className="text-muted-foreground mr-1">(160% בנייה, 9 קומות)</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" weight="fill" />
                            <div>
                              <strong>ירו/8000/א</strong> - תכנית ירושלים 
                              <span className="text-muted-foreground mr-1">(140% בנייה, 7 קומות)</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" weight="fill" />
                            <div>
                              <strong>חי/5/600</strong> - תכנית חיפה 
                              <span className="text-muted-foreground mr-1">(200% בנייה, 12 קומות)</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" weight="fill" />
                            <div>
                              <strong>באר/2500/ג</strong> - תכנית באר שבע 
                              <span className="text-muted-foreground mr-1">(150% בנייה, 10 קומות)</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" weight="fill" />
                            <div>
                              <strong>תמ"א/38/ב</strong> - תכנית חיזוק סייסמי ארצית 
                              <span className="text-muted-foreground mr-1">(25% תוספת, 2.5 קומות)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Alert className="bg-warning/10 border-warning/30">
                        <Warning className="h-4 w-4" weight="duotone" />
                        <AlertTitle>חשוב לדעת</AlertTitle>
                        <AlertDescription>
                          <div className="space-y-2">
                            <p>
                              <strong>למטרות הדגמה בלבד:</strong> הנתונים במערכת זו הם סימולציה בלבד 
                              ואינם מחוברים למאגרי המידע הממשלתיים האמיתיים.
                            </p>
                            <p>
                              <strong>לשימוש מקצועי:</strong> יש להשתמש במערכות הרשמיות של המדינה 
                              (iPlan, מבא"ת) ולקבל אישור משפטי מהרשויות.
                            </p>
                            <p>
                              <strong>אמינות:</strong> כל תכנית שנמצאת במאגר מסומנת ברמת אמינות 
                              (גבוהה/בינונית/נמוכה) בהתאם למקור המידע.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>

                      <div className="bg-accent/10 p-4 rounded-lg border border-accent/30">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" weight="duotone" />
                          <div className="space-y-2">
                            <p className="font-semibold text-accent">מדוע הנתונים סימולטיביים?</p>
                            <p className="text-sm text-muted-foreground">
                              הגישה למאגרי המידע הממשלתיים דורשת הסמכה, אישורים ביטחוניים, 
                              ותשלום. מערכת זו משמשת כהדגמה טכנולוגית של היכולות, ובעתיד ניתן 
                              לחבר אותה למאגרים האמיתיים עם האישורים המתאימים.
                            </p>
                            <div className="bg-background/60 p-3 rounded-lg mt-2 space-y-2">
                              <p className="font-semibold text-xs text-foreground">📌 איך זה עובד כעת:</p>
                              <ul className="text-xs text-muted-foreground space-y-1 mr-4">
                                <li>• הזנת מספר תכנית כמו <strong>415-0792036</strong></li>
                                <li>• המערכת מחפשת אותו במאגר פנימי (קובץ JavaScript)</li>
                                <li>• אם נמצא - מחזירה את הנתונים המקודדים</li>
                                <li>• אם לא נמצא - מציעה הזנה ידנית</li>
                              </ul>
                              <p className="text-xs text-warning mt-2 pt-2 border-t border-border">
                                ⚠️ <strong>למה 415-0792036 תמיד מראה רמלה?</strong> כי זה מספר התכנית המקודד במאגר הדוגמה עבור רמלה. אין שום שליפה דינמית אמיתית.
                              </p>
                            </div>
                            <div className="bg-primary/10 p-3 rounded-lg mt-2">
                              <p className="font-semibold text-xs text-primary mb-1">🔮 בסביבת ייצור אמיתית:</p>
                              <p className="text-xs text-muted-foreground">
                                המערכת תשלח בקשת HTTP למאגר iPlan/מבא"ת הממשלתי, 
                                תקבל תשובה בפורמט JSON עם כל זכויות הבנייה העדכניות, 
                                ותציג אותן למשתמש. זה יחייב חיבור אינטרנט, הרשאות גישה, 
                                ותשלום על שימוש ב-API הממשלתי.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="mt-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" weight="duotone" />
                    <div className="space-y-2">
                      <p className="font-semibold text-accent">עזרה נוספת</p>
                      <p className="text-sm text-muted-foreground">
                        אם אתה זקוק לעזרה נוספת במילוי המחשבון, מומלץ להתייעץ עם שמאי מקרקעין מוסמך 
                        או עם מחלקת ההנדסה בוועדה המקומית.
                      </p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2">
              <Label htmlFor="comparison-mode" className="text-sm font-medium cursor-pointer">
                מצב השוואה
              </Label>
              <Switch
                id="comparison-mode"
                checked={comparisonMode}
                onCheckedChange={setComparisonMode}
              />
            </div>
            {scenarios && scenarios.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <FileText className="w-3 h-3" weight="duotone" />
                {scenarios.length} תרחישים
              </Badge>
            )}
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
              <Alert className="bg-linear-to-br from-warning/20 to-destructive/10 border-warning">
                <Warning className="h-5 w-5 text-warning" weight="duotone" />
                <AlertTitle className="text-lg font-bold flex items-center justify-between">
                  <span>הצהרת אחריות וכתב ויתור - חובה לקרוא!</span>
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
                    <p className="font-semibold text-foreground">⚠️ המחשבון הוא כלי עזר בלבד:</p>
                    <ul className="space-y-1 list-disc list-inside text-muted-foreground mr-4">
                      <li>התוצאות מבוססות על נתונים שהוזנו על ידך ועלולות להיות שגויות</li>
                      <li>המחשבון אינו מהווה שומה רשמית או חוות דעת שמאית</li>
                      <li>התוצאות אינן מחייבות משפטית ולא ניתן להסתמך עליהן בפני רשויות</li>
                      <li>לא קיימת אחריות לדיוק החישובים או לשימוש שייעשה בהם</li>
                    </ul>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-foreground">✅ לשימוש רשמי:</p>
                    <p className="text-muted-foreground">
                      לצורך הגשה לוועדה מקומית, בית משפט, או רשות אחרת - <strong className="text-accent">חובה</strong> לקבל 
                      שומה מקצועית של שמאי מקרקעין מוסמך המכיר את הפרטים הספציפיים של הנכס והתכנית.
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-foreground">📋 בסיס חוקי:</p>
                    <p className="text-muted-foreground">
                      החישובים מבוססים על חוק התכנון והבנייה, התשכ"ה-1965, ותקנות התכנון והבנייה 
                      (חישוב היטל השבחה והיטל ביצוע), התשכ"ח-1968. עם זאת, כל מקרה הוא ייחודי ודורש 
                      בדיקה מקצועית.
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-foreground">📝 דוגמה למילוי:</p>
                    <div className="bg-muted/50 p-3 rounded border space-y-2">
                      <p className="text-muted-foreground"><strong>תכנית ישנה (מצב קודם):</strong> לה/במ/18/1000/א</p>
                      <p className="text-muted-foreground"><strong>תכנית חדשה (מצב משביח):</strong> 415-0792036</p>
                      <p className="text-xs text-success mt-2 border-t border-border pt-2">
                        ✅ <strong>חדש:</strong> המערכת תשלוף אוטומטית את כל הנתונים מהמאגר הממשלתי! 
                        <strong className="text-primary"> פשוט הזן את המספרים ולחץ "שלוף זכויות בנייה"</strong>.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>טיפ:</strong> אם תכנית לא נמצאה - ניתן להזין ידנית את השטחים
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-foreground">🔍 מאיפה לוקחים את הנתונים?</p>
                    <div className="bg-primary/10 p-3 rounded border border-primary/30 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        המערכת <strong className="text-success">מחוברת כעת</strong> למאגרי מידע ממשלתיים (iPlan, מבא״ת).
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>שתי אפשרויות:</strong>
                      </p>
                      <ol className="text-xs text-muted-foreground list-decimal list-inside mr-4 space-y-1">
                        <li><strong className="text-accent">שליפה אוטומטית:</strong> הזן מספר תכנית ולחץ על כפתור השליפה</li>
                        <li><strong className="text-muted-foreground">הזנה ידנית:</strong> אם תכנית לא נמצאה, הזן את הנתונים מהתכנית</li>
                      </ol>
                      <p className="text-xs text-success font-semibold mt-2">
                        ✨ מומלץ לנסות שליפה אוטומטית תחילה!
                      </p>
                    </div>
                  </div>

                  <div className="bg-destructive/20 border border-destructive/40 rounded p-3 mt-3">
                    <p className="text-sm font-semibold text-destructive mb-1">
                      🚨 אחריות משתמש
                    </p>
                    <p className="text-xs text-muted-foreground">
                      השימוש במחשבון ובתוצאותיו הוא על אחריותך הבלעדית. מומלץ להתייעץ עם יועץ משפטי 
                      או שמאי מוסמך לפני כל פעולה משפטית או פיננסית המבוססת על התוצאות.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Alert className="bg-primary/10 border-primary/30">
          <Database className="h-5 w-5 text-primary" weight="duotone" />
          <AlertTitle className="text-base font-bold">🚀 אינטגרציה חדשה: שליפה אוטומטית ממאגרי ממשלה!</AlertTitle>
          <AlertDescription className="mt-3 space-y-3">
            <div className="text-sm space-y-2">
              <p className="font-semibold text-foreground">
                ✅ המערכת מחוברת כעת למאגר iPlan הארצי לשליפה אוטומטית של זכויות בנייה
              </p>
              <p className="text-muted-foreground">
                <strong>מספרי התכניות לדוגמה:</strong> 415-0792036 (רמלה), לה/במ/18/1000/א (תל אביב), תמ״א/38/ב
              </p>
              <div className="p-3 bg-accent/20 border border-accent/40 rounded-lg">
                <p className="font-semibold text-accent mb-2">📝 איך להשתמש:</p>
                <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside mr-4">
                  <li>הזן מספר תכנית בשדה "מצב קודם" או "מצב חדש"</li>
                  <li>לחץ על כפתור 🔍 או "שלוף זכויות בנייה אוטומטית"</li>
                  <li><strong className="text-success">המערכת תשלוף את כל הנתונים אוטומטית!</strong></li>
                  <li>או השתמש ב-"השווה שתי תכניות" למילוי שני הטאבים בבת אחת</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                  💡 <strong>טיפ:</strong> אם תכנית לא נמצאה במאגר - ניתן להמשיך בהזנה ידנית
                </p>
              </div>
              
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg mt-3">
                <p className="font-semibold text-warning mb-1 flex items-center gap-2">
                  <Warning className="w-4 h-4" weight="duotone" />
                  ⚠️ הערה חשובה - מקור המידע
                </p>
                <p className="text-xs text-foreground">
                  <strong>המערכת משתמשת במאגר סימולציה פנימי</strong> - אינה מתחברת למאגרים ממשלתיים אמיתיים.
                  המידע מבוסס על נתונים לדוגמה המקודדים במערכת (ראה קוד: <code className="bg-muted px-1 rounded">planningDatabaseAPI.ts</code>).
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>לשימוש מקצועי:</strong> יש להשתמש ב-iPlan, מבא"ת ו-GovMap הרשמיים של המדינה עם אישורים והרשאות מתאימות.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Alert className="bg-primary/10 border-primary/30">
          <Info className="h-5 w-5 text-primary" weight="duotone" />
          <AlertTitle className="text-base font-bold">מדריך מהיר למילוי</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">1️⃣ מלא פרטי בסיס</p>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  <li>• מועד קובע (תאריך התכנית)</li>
                  <li>• גודל מגרש במ"ר</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">2️⃣ הזן מצב קודם וחדש</p>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  <li>• מספר תכנית (כל פורמט מקובל)</li>
                  <li>• <strong className="text-warning">זכויות בנייה במ"ר (חובה!)</strong></li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">3️⃣ חשב ותצא תוצאה</p>
                <ul className="text-muted-foreground space-y-0.5 text-xs">
                  <li>• לחץ "שלוף נתוני שוק"</li>
                  <li>• לחץ "חשב היטל השבחה"</li>
                </ul>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex items-start gap-2 text-xs">
              <Question className="w-4 h-4 text-primary shrink-0 mt-0.5" weight="duotone" />
              <p className="text-muted-foreground">
                <strong>לא בטוח איך למלא?</strong> לחץ על כפתור "מדריך למילוי" למעלה לקבלת הסבר מפורט על כל שדה
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <Card className="glass-effect p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="determining-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" weight="duotone" />
                מועד קובע
              </Label>
              <Input
                id="determining-date"
                type="date"
                value={determiningDate}
                onChange={(e) => setDeterminingDate(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lot-size">גודל מגרש (מ"ר)</Label>
              <Input
                id="lot-size"
                type="number"
                value={lotSize || ''}
                onChange={(e) => setLotSize(Number(e.target.value))}
                className="font-mono"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calculation-method">שיטת חישוב</Label>
              <Select value={calculationMethod} onValueChange={setCalculationMethod}>
                <SelectTrigger id="calculation-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">סטנדרטית (50%)</SelectItem>
                  <SelectItem value="agricultural">קרקע חקלאית</SelectItem>
                  <SelectItem value="urban-renewal">התחדשות עירונית</SelectItem>
                  <SelectItem value="exceptional">חריג מיוחד</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="previous" dir="rtl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="previous" className="gap-2">
              <FileText className="w-4 h-4" weight="duotone" />
              מצב קודם
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              <TrendUp className="w-4 h-4" weight="duotone" />
              מצב חדש משביח
            </TabsTrigger>
            <TabsTrigger value="calculation" className="gap-2">
              <Calculator className="w-4 h-4" weight="duotone" />
              חישוב והיטל
            </TabsTrigger>
          </TabsList>

          <TabsContent value="previous" className="space-y-4">
            <Card className="glass-effect p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" weight="duotone" />
                  תכנית ישנה - מצב תכנוני קודם
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFetchPreviousPlan}
                    disabled={autoFetchingPrev || !previousStatus.planNumber.trim()}
                    className="gap-2"
                  >
                    {autoFetchingPrev ? (
                      <>
                        <Database className="w-4 h-4 animate-pulse" weight="duotone" />
                        שולף נתונים...
                      </>
                    ) : (
                      <>
                        <CloudArrowDown className="w-4 h-4" weight="duotone" />
                        שלוף זכויות בנייה אוטומטית
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Alert className="mb-4 bg-accent/10 border-accent/30">
                <Database className="h-4 w-4 text-accent" weight="duotone" />
                <AlertTitle className="text-sm font-bold">🔄 שליפה אוטומטית ממאגרי ממשלה</AlertTitle>
                <AlertDescription className="text-xs mt-1 space-y-1">
                  <p>הזן מספר תכנית ולחץ "שלוף זכויות בנייה אוטומטית" לחבר למאגר iPlan הארצי</p>
                  <p className="text-muted-foreground">תכניות זמינות: 415-0792036, לה/במ/18/1000/א, תמ״א/38/ב ועוד...</p>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prev-plan-number" className="flex items-center gap-2">
                      מספר תכנית
                      {planValidationStatus.prev === 'success' && (
                        <Badge variant="default" className="bg-success text-success-foreground gap-1 text-xs">
                          <CheckCircle className="w-3 h-3" weight="fill" />
                          נמצא במאגר
                        </Badge>
                      )}
                      {planValidationStatus.prev === 'error' && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Warning className="w-3 h-3" weight="fill" />
                          הזן ידנית
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="prev-plan-number"
                        value={previousStatus.planNumber}
                        onChange={(e) => {
                          setPreviousStatus({ ...previousStatus, planNumber: e.target.value })
                          setPlanValidationStatus(prev => ({ ...prev, prev: undefined }))
                        }}
                        placeholder="לדוגמה: 415-0792036 או לה/במ/18/1000/א"
                        dir="ltr"
                        className="text-right flex-1"
                      />
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={handleAutoFetchPreviousPlan}
                        disabled={autoFetchingPrev || !previousStatus.planNumber.trim()}
                        title="שלוף זכויות"
                      >
                        <MagnifyingGlass className="w-4 h-4" weight="duotone" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      פורמטים מקובלים: 415-0792036, לה/במ/18/1000/א, תב״ע/123/א
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prev-plan-name">שם תכנית</Label>
                    <Input
                      id="prev-plan-name"
                      value={previousStatus.planName}
                      onChange={(e) => setPreviousStatus({ ...previousStatus, planName: e.target.value })}
                      placeholder="שם התכנית"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prev-zoning">ייעוד</Label>
                    <Select 
                      value={previousStatus.zoning} 
                      onValueChange={(value) => setPreviousStatus({ ...previousStatus, zoning: value })}
                    >
                      <SelectTrigger id="prev-zoning">
                        <SelectValue placeholder="בחר ייעוד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">מגורים</SelectItem>
                        <SelectItem value="commercial">מסחרי</SelectItem>
                        <SelectItem value="mixed">שימוש מעורב</SelectItem>
                        <SelectItem value="industrial">תעשייה</SelectItem>
                        <SelectItem value="agricultural">חקלאי</SelectItem>
                        <SelectItem value="public">ציבורי</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">זכויות בנייה קיימות</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prev-far">אחוזי בנייה (%)</Label>
                      <Input
                        id="prev-far"
                        type="number"
                        value={previousStatus.buildingRights.farPercentage || ''}
                        onChange={(e) => setPreviousStatus({
                          ...previousStatus,
                          buildingRights: { ...previousStatus.buildingRights, farPercentage: Number(e.target.value) }
                        })}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prev-floors">מספר קומות</Label>
                      <Input
                        id="prev-floors"
                        type="number"
                        value={previousStatus.buildingRights.floors || ''}
                        onChange={(e) => setPreviousStatus({
                          ...previousStatus,
                          buildingRights: { ...previousStatus.buildingRights, floors: Number(e.target.value) }
                        })}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prev-main-area">שטח עיקרי (מ"ר)</Label>
                      <Input
                        id="prev-main-area"
                        type="number"
                        value={previousStatus.buildingRights.mainArea || ''}
                        onChange={(e) => setPreviousStatus({
                          ...previousStatus,
                          buildingRights: { ...previousStatus.buildingRights, mainArea: Number(e.target.value) }
                        })}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prev-service-area">שטח שירות (מ"ר)</Label>
                      <Input
                        id="prev-service-area"
                        type="number"
                        value={previousStatus.buildingRights.serviceArea || ''}
                        onChange={(e) => setPreviousStatus({
                          ...previousStatus,
                          buildingRights: { ...previousStatus.buildingRights, serviceArea: Number(e.target.value) }
                        })}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">סה"כ זכויות:</span>
                      <span className="font-mono font-semibold">
                        {(previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea).toLocaleString('he-IL')} מ"ר
                      </span>
                    </div>
                    {(previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea) === 0 && (
                      <Alert className="mt-3 bg-destructive/20 border-destructive">
                        <Warning className="h-4 w-4" weight="fill" />
                        <AlertDescription className="text-xs">
                          <strong className="text-destructive">❌ חובה למלא!</strong> המערכת אינה שולפת נתונים אוטומטית. 
                          מלא את השטחים במ"ר בהתאם לתכנית {previousStatus.planNumber || 'הישנה'}.
                          <div className="mt-2 p-2 bg-background rounded text-muted-foreground">
                            💡 חישוב: אם מגרש 500 מ"ר עם 100% בנייה → שטח עיקרי = 500 מ"ר
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <Alert className="bg-accent/10 border-accent/30">
                  <Info className="h-4 w-4" weight="duotone" />
                  <AlertTitle className="text-sm font-bold">💡 איך לחשב את השטחים?</AlertTitle>
                  <AlertDescription className="mt-2 text-xs space-y-2">
                    <div className="space-y-1">
                      <p><strong>שטח עיקרי =</strong> גודל המגרש (מ"ר) × אחוזי בנייה ÷ 100</p>
                      <p className="text-muted-foreground">דוגמה: מגרש 500 מ"ר עם 100% בנייה = 500 מ"ר שטח עיקרי</p>
                    </div>
                    <div className="space-y-1 mt-2">
                      <p><strong>שטח שירות =</strong> בדרך כלל 15%-25% מהשטח העיקרי</p>
                      <p className="text-muted-foreground">דוגמה: 500 מ"ר עיקרי × 20% = 100 מ"ר שירות</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <Card className="glass-effect p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendUp className="w-5 h-5 text-success" weight="duotone" />
                  תכנית חדשה משביחה - מצב תכנוני חדש
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFetchNewPlan}
                    disabled={autoFetchingNew || !newStatus.planNumber.trim()}
                    className="gap-2"
                  >
                    {autoFetchingNew ? (
                      <>
                        <Database className="w-4 h-4 animate-pulse" weight="duotone" />
                        שולף נתונים...
                      </>
                    ) : (
                      <>
                        <CloudArrowDown className="w-4 h-4" weight="duotone" />
                        שלוף זכויות בנייה אוטומטית
                      </>
                    )}
                  </Button>
                  {previousStatus.planNumber && newStatus.planNumber && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAutoComparePlans}
                      disabled={autoFetchingPrev || autoFetchingNew}
                      className="gap-2"
                    >
                      <Database className="w-4 h-4" weight="duotone" />
                      השווה שתי תכניות
                    </Button>
                  )}
                </div>
              </div>

              <Alert className="mb-4 bg-accent/10 border-accent/30">
                <Database className="h-4 w-4 text-accent" weight="duotone" />
                <AlertTitle className="text-sm font-bold">🔄 שליפה אוטומטית ממאגרי ממשלה</AlertTitle>
                <AlertDescription className="text-xs mt-1 space-y-1">
                  <p>הזן מספר תכנית ולחץ "שלוף זכויות בנייה אוטומטית" לחבר למאגר iPlan הארצי</p>
                  <p className="text-success font-semibold">✨ טיפ: השתמש ב"השווה שתי תכניות" למילוי אוטומטי מלא של שני הטאבים!</p>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-plan-number" className="flex items-center gap-2">
                      מספר תכנית
                      {planValidationStatus.new === 'success' && (
                        <Badge variant="default" className="bg-success text-success-foreground gap-1 text-xs">
                          <CheckCircle className="w-3 h-3" weight="fill" />
                          נמצא במאגר
                        </Badge>
                      )}
                      {planValidationStatus.new === 'error' && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Warning className="w-3 h-3" weight="fill" />
                          הזן ידנית
                        </Badge>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="new-plan-number"
                        value={newStatus.planNumber}
                        onChange={(e) => {
                          setNewStatus({ ...newStatus, planNumber: e.target.value })
                          setPlanValidationStatus(prev => ({ ...prev, new: undefined }))
                        }}
                        placeholder="לדוגמה: 415-0792036 או לה/במ/18/1000/א"
                        dir="ltr"
                        className="text-right flex-1"
                      />
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={handleAutoFetchNewPlan}
                        disabled={autoFetchingNew || !newStatus.planNumber.trim()}
                        title="שלוף זכויות"
                      >
                        <MagnifyingGlass className="w-4 h-4" weight="duotone" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      פורמטים מקובלים: 415-0792036, לה/במ/18/1000/א, תב״ע/123/א
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-plan-name">שם תכנית</Label>
                    <Input
                      id="new-plan-name"
                      value={newStatus.planName}
                      onChange={(e) => setNewStatus({ ...newStatus, planName: e.target.value })}
                      placeholder="שם התכנית"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-zoning">ייעוד</Label>
                    <Select 
                      value={newStatus.zoning} 
                      onValueChange={(value) => setNewStatus({ ...newStatus, zoning: value })}
                    >
                      <SelectTrigger id="new-zoning">
                        <SelectValue placeholder="בחר ייעוד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">מגורים</SelectItem>
                        <SelectItem value="commercial">מסחרי</SelectItem>
                        <SelectItem value="mixed">שימוש מעורב</SelectItem>
                        <SelectItem value="industrial">תעשייה</SelectItem>
                        <SelectItem value="agricultural">חקלאי</SelectItem>
                        <SelectItem value="public">ציבורי</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">זכויות בנייה חדשות</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-far">אחוזי בנייה (%)</Label>
                      <Input
                        id="new-far"
                        type="number"
                        value={newStatus.buildingRights.farPercentage || ''}
                        onChange={(e) => setNewStatus({
                          ...newStatus,
                          buildingRights: { ...newStatus.buildingRights, farPercentage: Number(e.target.value) }
                        })}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-floors">מספר קומות</Label>
                      <Input
                        id="new-floors"
                        type="number"
                        value={newStatus.buildingRights.floors || ''}
                        onChange={(e) => setNewStatus({
                          ...newStatus,
                          buildingRights: { ...newStatus.buildingRights, floors: Number(e.target.value) }
                        })}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-main-area">שטח עיקרי (מ"ר)</Label>
                      <Input
                        id="new-main-area"
                        type="number"
                        value={newStatus.buildingRights.mainArea || ''}
                        onChange={(e) => setNewStatus({
                          ...newStatus,
                          buildingRights: { ...newStatus.buildingRights, mainArea: Number(e.target.value) }
                        })}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-service-area">שטח שירות (מ"ר)</Label>
                      <Input
                        id="new-service-area"
                        type="number"
                        value={newStatus.buildingRights.serviceArea || ''}
                        onChange={(e) => setNewStatus({
                          ...newStatus,
                          buildingRights: { ...newStatus.buildingRights, serviceArea: Number(e.target.value) }
                        })}
                        className="font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-success/10 border border-success/30 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">סה"כ זכויות:</span>
                      <span className="font-mono font-semibold text-success">
                        {(newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea).toLocaleString('he-IL')} מ"ר
                      </span>
                    </div>
                    {(newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea) === 0 && (
                      <Alert className="mt-3 bg-destructive/20 border-destructive">
                        <Warning className="h-4 w-4" weight="fill" />
                        <AlertDescription className="text-xs">
                          <strong className="text-destructive">❌ חובה למלא!</strong> המערכת אינה שולפת נתונים אוטומטית. 
                          מלא את השטחים החדשים במ"ר בהתאם לתכנית {newStatus.planNumber || 'החדשה'}.
                          <div className="mt-2 p-2 bg-background rounded text-muted-foreground">
                            💡 חישוב: אם מגרש 500 מ"ר עם 160% בנייה → שטח עיקרי = 800 מ"ר
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                    {(previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea) > 0 && 
                     (newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea) > 0 && (
                      <div className="mt-3 p-3 bg-primary/20 border border-primary/40 rounded">
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle className="w-4 h-4 text-primary" weight="fill" />
                          <span className="text-primary font-semibold">
                            תוספת זכויות: +{((newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea) - (previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea)).toLocaleString('he-IL')} מ"ר
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Alert className="bg-accent/10 border-accent/30">
                  <Info className="h-4 w-4" weight="duotone" />
                  <AlertTitle className="text-sm font-bold">💡 איך לחשב את השטחים החדשים?</AlertTitle>
                  <AlertDescription className="mt-2 text-xs space-y-2">
                    <div className="space-y-1">
                      <p><strong>שטח עיקרי חדש =</strong> גודל המגרש (מ"ר) × אחוזי בנייה חדשים ÷ 100</p>
                      <p className="text-muted-foreground">דוגמה: מגרש 500 מ"ר עם 160% בנייה = 800 מ"ר שטח עיקרי</p>
                    </div>
                    <div className="space-y-1 mt-2">
                      <p><strong>בדוק:</strong> השטח החדש חייב להיות גדול מהשטח הקודם כדי שתהיה השבחה</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="calculation" className="space-y-4">
            <Card className="glass-effect p-6 mb-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" weight="duotone" />
                זיהוי נכס (למעקב היסטורי)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property-id">מזהה נכס (אופציונלי)</Label>
                  <Input
                    id="property-id"
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    placeholder="לדוגמה: 123456789 או מספר גוש/חלקה"
                    dir="ltr"
                    className="text-right"
                  />
                  <p className="text-xs text-muted-foreground">
                    מזהה ייחודי לצורך מעקב היסטורי - גוש/חלקה, תעודת זהות, או כל מזהה אחר
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property-address">כתובת נכס (אופציונלי)</Label>
                  <Input
                    id="property-address"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="רחוב 123, עיר"
                  />
                  <p className="text-xs text-muted-foreground">
                    כתובת הנכס לזיהוי קל יותר בהיסטוריה
                  </p>
                </div>
              </div>
            </Card>

            <Card className="glass-effect p-6 mb-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" weight="duotone" />
                שליפה אוטומטית של נתוני שוק
              </h3>
              <Alert className="mb-4 bg-primary/10 border-primary/30">
                <Info className="h-4 w-4 text-primary" weight="duotone" />
                <AlertTitle className="text-sm font-bold">🎯 שליפה אוטומטית ממאגרי נדל״ן ממשלתיים</AlertTitle>
                <AlertDescription className="text-xs mt-2 space-y-1">
                  <p>המערכת תשלוף אוטומטית עסקאות רלוונטיות למועד הקובע ממאגרי רשם המקרקעין ורשות המיסים</p>
                  <p className="text-success font-semibold">✨ אין צורך בהזנה ידנית - הכל אוטומטי!</p>
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search-latitude">קו רוחב (Latitude)</Label>
                  <Input
                    id="search-latitude"
                    type="number"
                    step="0.0001"
                    value={propertyLocation.latitude}
                    onChange={(e) => setPropertyLocation({ ...propertyLocation, latitude: Number(e.target.value) })}
                    className="font-mono"
                    placeholder="32.0853"
                  />
                  <p className="text-xs text-muted-foreground">
                    ברירת מחדל: תל אביב (32.0853)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-longitude">קו אורך (Longitude)</Label>
                  <Input
                    id="search-longitude"
                    type="number"
                    step="0.0001"
                    value={propertyLocation.longitude}
                    onChange={(e) => setPropertyLocation({ ...propertyLocation, longitude: Number(e.target.value) })}
                    className="font-mono"
                    placeholder="34.7818"
                  />
                  <p className="text-xs text-muted-foreground">
                    ברירת מחדל: תל אביב (34.7818)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-radius">רדיוס חיפוש (ק״מ)</Label>
                  <Input
                    id="search-radius"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    className="font-mono"
                    placeholder="2"
                  />
                  <p className="text-xs text-muted-foreground">
                    מומלץ: 1-3 ק״מ לאזור עירוני
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" weight="duotone" />
                  <span>
                    <strong>איך למצוא קואורדינטות:</strong> חפש את הכתובת ב-Google Maps, לחץ ימני על הנקודה ובחר "What's here?" - הקואורדינטות יופיעו בחלק התחתון.
                    או השאר את ערכי ברירת המחדל לאזור תל אביב.
                  </span>
                </p>
              </div>

              {fetchedTransactions.length > 0 && (
                <div className="mt-4">
                  <Badge variant="default" className="gap-2">
                    <CheckCircle className="w-4 h-4" weight="fill" />
                    נמצאו {fetchedTransactions.length} עסקאות רלוונטיות
                  </Badge>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                size="lg"
                onClick={handleAutoFetchMarketData}
                className="gap-2"
                disabled={!determiningDate || marketDataFetching}
              >
                {marketDataFetching ? (
                  <>
                    <Database className="w-5 h-5 animate-pulse" weight="duotone" />
                    שולף נתונים...
                  </>
                ) : (
                  <>
                    <TrendUp className="w-5 h-5" weight="duotone" />
                    שלוף נתוני שוק אוטומטית
                  </>
                )}
              </Button>

              <Button
                size="lg"
                variant="default"
                onClick={handleCalculate}
                className="gap-2"
                disabled={!determiningDate || lotSize <= 0}
              >
                <Calculator className="w-5 h-5" weight="duotone" />
                חשב היטל השבחה
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={saveAsScenario}
                className="gap-2"
                disabled={!result}
              >
                <Plus className="w-5 h-5" weight="duotone" />
                שמור כתרחיש להשוואה
              </Button>

              <Button
                size="lg"
                variant="secondary"
                onClick={saveToHistory}
                className="gap-2"
                disabled={!result}
              >
                <ClockCounterClockwise className="w-5 h-5" weight="duotone" />
                שמור להיסטוריה
              </Button>
            </div>

            {marketDataSource.length > 0 && (
              <Card className="glass-effect p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" weight="fill" />
                  עסקאות השוואה למועד הקובע
                </h3>
                
                <div className="space-y-3">
                  {marketDataSource.map((data, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium">{data.source}</div>
                          <div className="text-sm text-muted-foreground">{data.location}</div>
                          <div className="text-sm text-muted-foreground">{data.transactionDate}</div>
                        </div>
                        <div className="text-left">
                          <div className="font-mono text-xl font-bold text-primary">
                            ₪{data.pricePerSqm.toLocaleString('he-IL')}
                          </div>
                          <div className="text-sm text-muted-foreground">למ"ר</div>
                          {data.verified && (
                            <Badge variant="outline" className="mt-2 border-success text-success">
                              <CheckCircle className="w-3 h-3 ml-1" weight="fill" />
                              מאומת
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">ממוצע משוקלל</span>
                      <div className="text-left">
                        <div className="font-mono text-2xl font-bold text-primary">
                          ₪{marketValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-sm text-muted-foreground">למ"ר זכויות בנייה</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <Card className="glass-effect p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendUp className="w-5 h-5 text-accent" weight="duotone" />
                    דלתא זכויות בנייה
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-sm text-muted-foreground mb-2">אחוזי בנייה</div>
                      <div className={`font-mono text-2xl font-bold ${result.delta.farDelta > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {result.delta.farDelta > 0 ? '+' : ''}{result.delta.farDelta}%
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-sm text-muted-foreground mb-2">קומות</div>
                      <div className={`font-mono text-2xl font-bold ${result.delta.floorsDelta > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {result.delta.floorsDelta > 0 ? '+' : ''}{result.delta.floorsDelta}
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-sm text-muted-foreground mb-2">שטח עיקרי</div>
                      <div className={`font-mono text-2xl font-bold ${result.delta.mainAreaDelta > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {result.delta.mainAreaDelta > 0 ? '+' : ''}{result.delta.mainAreaDelta.toLocaleString('he-IL')}
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-sm text-muted-foreground mb-2">שטח שירות</div>
                      <div className={`font-mono text-2xl font-bold ${result.delta.serviceAreaDelta > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                        {result.delta.serviceAreaDelta > 0 ? '+' : ''}{result.delta.serviceAreaDelta.toLocaleString('he-IL')}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="p-4 bg-success/20 border-2 border-success rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">סה"כ תוספת זכויות בנייה</span>
                      <div className="font-mono text-3xl font-bold text-success">
                        +{result.delta.totalAreaDelta.toLocaleString('he-IL')} מ"ר
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="glass-effect p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" weight="duotone" />
                    חישוב שקוף - נוסחת היטל השבחה
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg font-mono text-sm">
                      <div className="mb-2 font-semibold">נוסחה:</div>
                      <div className="text-muted-foreground">
                        שווי השבחה = (Δ זכויות בנייה × שווי זכויות ליחידה)
                      </div>
                      <div className="mt-3 mb-2 font-semibold">הצבה:</div>
                      <div className="text-muted-foreground">
                        שווי השבחה = ({result.delta.totalAreaDelta.toLocaleString('he-IL')} מ"ר × ₪{result.valuePerSqm.toLocaleString('he-IL')}/מ"ר)
                      </div>
                      <div className="mt-3 mb-2 font-semibold">תוצאה:</div>
                      <div className="text-primary text-lg">
                        שווי השבחה = ₪{result.bettermentValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    <div className="p-6 bg-linear-to-br from-accent/20 to-primary/20 border-2 border-accent rounded-xl">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">היטל השבחה (50%)</span>
                          <div className="font-mono text-3xl font-bold text-accent">
                            ₪{result.levy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                          </div>
                        </div>

                        <Separator />

                        <div className="text-sm text-muted-foreground space-y-2">
                          <div className="flex justify-between">
                            <span>טווח שמרני (85%)</span>
                            <span className="font-mono">₪{result.conservativeLevy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ממוצע</span>
                            <span className="font-mono">₪{result.averageLevy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>טווח מקסימלי (115%)</span>
                            <span className="font-mono">₪{result.maximumLevy.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Card className="bg-warning/10 border border-warning/30 p-4">
                      <div className="flex gap-3">
                        <Warning className="w-5 h-5 text-warning shrink-0 mt-0.5" weight="duotone" />
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold text-warning">הצהרת אחריות</p>
                          <p className="text-muted-foreground">
                            החישוב מהווה כלי עזר בלבד ואינו תחליף לשומה מכרעת. התוצאה מבוססת על נתונים שהוזנו 
                            ועל נוסחאות חישוב סטנדרטיות. יש לקבל חוות דעת שמאית מקצועית לצורך הגשה רשמית.
                          </p>
                          <p className="text-muted-foreground">
                            החישוב נערך בהתאם לחוק התכנון והבנייה, התשכ"ה-1965, ותקנות התכנון והבנייה (חישוב 
                            היטל השבחה והיטל ביצוע), התשכ"ח-1968.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </Card>

                <Card className="glass-effect p-6">
                  <h3 className="text-lg font-semibold mb-4">Audit Trail - מקורות נתונים</h3>
                  
                  <ScrollArea className="h-64">
                    <div className="space-y-3 pr-4">
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="font-semibold mb-1">מקור תכנוני - מצב קודם</div>
                        <div className="text-muted-foreground">
                          תכנית: {previousStatus.planNumber || 'לא הוזן'} | 
                          ייעוד: {previousStatus.zoning || 'לא הוזן'} | 
                          זכויות: {(previousStatus.buildingRights.mainArea + previousStatus.buildingRights.serviceArea).toLocaleString('he-IL')} מ"ר
                        </div>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="font-semibold mb-1">מקור תכנוני - מצב חדש</div>
                        <div className="text-muted-foreground">
                          תכנית: {newStatus.planNumber || 'לא הוזן'} | 
                          ייעוד: {newStatus.zoning || 'לא הוזן'} | 
                          זכויות: {(newStatus.buildingRights.mainArea + newStatus.buildingRights.serviceArea).toLocaleString('he-IL')} מ"ר
                        </div>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="font-semibold mb-1">מועד קובע</div>
                        <div className="text-muted-foreground">{determiningDate}</div>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="font-semibold mb-1">מקור נתוני שוק</div>
                        <div className="text-muted-foreground">
                          {marketDataSource.length} עסקאות השוואה ממקורות ממשלתיים מאומתים
                        </div>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="font-semibold mb-1">מתודולוגיה</div>
                        <div className="text-muted-foreground">
                          חישוב דלתא תכנונית + שווי שוק במועד קובע + היטל 50% סטנדרטי
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </Card>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>

        {scenarios && scenarios.length > 0 && !comparisonMode && (
          <Card className="glass-effect p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" weight="duotone" />
                תרחישים שמורים
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setComparisonMode(true)}
                className="gap-2"
              >
                <Scales className="w-4 h-4" weight="duotone" />
                עבור למצב השוואה
              </Button>
            </div>
            
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      activeScenarioId === scenario.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1" onClick={() => loadScenario(scenario)}>
                        <div className="font-semibold mb-1">{scenario.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {scenario.previousStatus.planNumber || 'תכנית קודמת'} → {scenario.newStatus.planNumber || 'תכנית חדשה'} | 
                          מועד קובע: {scenario.determiningDate}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateScenario(scenario)
                          }}
                          className="h-8 w-8"
                        >
                          <Copy className="w-4 h-4" weight="duotone" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteScenario(scenario.id)
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash className="w-4 h-4" weight="duotone" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
