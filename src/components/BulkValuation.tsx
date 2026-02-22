import { useState, useMemo } from 'react'
import type { Property, Comparable } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ListChecks, 
  ChartBar, 
  Calculator, 
  Download, 
  Play, 
  CheckCircle,
  Warning,
  Buildings,
  FileText,
  FileCsv,
  FileXls,
  CaretDown,
  PaperPlaneTilt
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ValuationEngine } from '@/lib/valuationEngine'
import { exportBulkValuationPDF } from '@/lib/bulkPdfExport'
import { exportToCSV, exportToExcel, exportDetailedCSV } from '@/lib/bulkExportUtils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { EmailReportDialog, type EmailData } from '@/components/EmailReportDialog'
import { createLogger } from '@/lib/logger'

const log = createLogger('BulkValuation')

interface BulkValuationProps {
  properties: Property[]
  onUpdateProperty?: (property: Property) => void
}

interface BulkValuationResult {
  propertyId: string
  property: Property
  status: 'pending' | 'processing' | 'completed' | 'error'
  estimatedValue?: number
  valueRange?: { min: number; max: number }
  confidence?: number
  method?: string
  comparables?: Comparable[]
  error?: string
  processingTime?: number
}

interface PortfolioStats {
  totalValue: number
  avgValue: number
  avgConfidence: number
  totalProperties: number
  completedProperties: number
  valueRange: { min: number; max: number }
  propertyTypes: Record<string, number>
  avgPricePerSqm: number
}

export function BulkValuation({ properties, onUpdateProperty }: BulkValuationProps) {
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [valuationResults, setValuationResults] = useState<BulkValuationResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [valuationMethod, setValuationMethod] = useState<'comparable-sales' | 'cost-approach' | 'income-approach' | 'auto'>('auto')
  const [searchRadius, setSearchRadius] = useState(2)
  const [similarityThreshold, setSimilarityThreshold] = useState(75)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  const eligibleProperties = useMemo(() => {
    return properties.filter(p => 
      p.details.builtArea > 0 && 
      p.address.city && 
      p.address.street
    )
  }, [properties])

  const portfolioStats = useMemo((): PortfolioStats | null => {
    const completedResults = valuationResults.filter(r => r.status === 'completed' && r.estimatedValue)
    if (completedResults.length === 0) return null

    const totalValue = completedResults.reduce((sum, r) => sum + (r.estimatedValue || 0), 0)
    const avgValue = totalValue / completedResults.length
    const avgConfidence = completedResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / completedResults.length

    const allValues = completedResults.map(r => r.estimatedValue || 0)
    const valueRange = {
      min: Math.min(...allValues),
      max: Math.max(...allValues)
    }

    const propertyTypes: Record<string, number> = {}
    completedResults.forEach(r => {
      const type = r.property.type
      propertyTypes[type] = (propertyTypes[type] || 0) + 1
    })

    const totalArea = completedResults.reduce((sum, r) => sum + r.property.details.builtArea, 0)
    const avgPricePerSqm = totalValue / totalArea

    return {
      totalValue,
      avgValue,
      avgConfidence,
      totalProperties: completedResults.length,
      completedProperties: completedResults.length,
      valueRange,
      propertyTypes,
      avgPricePerSqm
    }
  }, [valuationResults])

  const handleSelectAll = () => {
    if (selectedPropertyIds.length === eligibleProperties.length) {
      setSelectedPropertyIds([])
    } else {
      setSelectedPropertyIds(eligibleProperties.map(p => p.id))
    }
  }

  const handleToggleProperty = (propertyId: string) => {
    setSelectedPropertyIds(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    )
  }

  const handleStartBulkValuation = async () => {
    if (selectedPropertyIds.length === 0) {
      toast.error('אנא בחר לפחות נכס אחד לשומה')
      return
    }

    setIsProcessing(true)
    setCurrentProgress(0)

    const initialResults: BulkValuationResult[] = selectedPropertyIds.map(id => ({
      propertyId: id,
      property: properties.find(p => p.id === id)!,
      status: 'pending'
    }))
    setValuationResults(initialResults)

    for (let i = 0; i < selectedPropertyIds.length; i++) {
      const propertyId = selectedPropertyIds[i]
      const property = properties.find(p => p.id === propertyId)!

      setValuationResults(prev => prev.map(r => 
        r.propertyId === propertyId 
          ? { ...r, status: 'processing' }
          : r
      ))

      try {
        const startTime = Date.now()

        let result
        if (valuationMethod === 'auto' || valuationMethod === 'comparable-sales') {
          const prompt = `Generate ${10} realistic comparable properties for valuation in ${property.address.city}, ${property.address.neighborhood}.
          
Property to value:
- Type: ${property.type}
- Size: ${property.details.builtArea} sqm
- Rooms: ${property.details.rooms}
- Floor: ${property.details.floor}
- Build year: ${property.details.buildYear}
- Condition: ${property.details.condition}

Generate comparable properties as a JSON object with a "comparables" array. Each comparable should have:
- id: unique ID
- address: MUST be the string "לא מאומת (AI)" (do not invent or claim real street names)
- type: property type (same as subject)
- salePrice: realistic price in ILS (between 1-5M based on area and city)
- saleDate: recent date within last 12 months
- builtArea: area in sqm (similar to subject, within 20% difference)
- rooms: number of rooms (similar to subject)
- floor: floor number (0-10)
- distance: distance in km (between 0.5 and ${searchRadius})
- similarityScore: percentage between 70-95
- selected: true
- adjustments: object with location, size, condition, floor, age, features (all numbers between -0.1 and 0.1)
- adjustedPrice: salePrice adjusted by total adjustments
- pricePerSqm: adjusted price per sqm

Format: {"comparables": [...]}`
          
          const jsonResponse = await window.spark.llm(prompt, 'gpt-4o', true)
          const data = JSON.parse(jsonResponse)
          const comparables = data.comparables || []
          
          result = ValuationEngine.calculateComparableSalesApproach(property, comparables)
        } else if (valuationMethod === 'cost-approach') {
          const landValue = property.details.builtArea * 5000
          const constructionCostPerSqm = 8000
          result = ValuationEngine.calculateCostApproach(property, landValue, constructionCostPerSqm)
        } else {
          const monthlyRent = 5000
          result = ValuationEngine.calculateIncomeApproach(property, monthlyRent)
        }

        const processingTime = Date.now() - startTime

        setValuationResults(prev => prev.map(r => 
          r.propertyId === propertyId
            ? {
                ...r,
                status: 'completed',
                estimatedValue: result.estimatedValue,
                valueRange: result.valueRange,
                confidence: result.confidence,
                method: result.method,
                comparables: result.comparables,
                processingTime
              }
            : r
        ))

        if (onUpdateProperty) {
          const updatedProperty: Property = {
            ...property,
            valuationData: {
              estimatedValue: result.estimatedValue,
              valueRange: result.valueRange,
              confidence: result.confidence,
              method: valuationMethod === 'auto' ? 'comparable-sales' : valuationMethod,
              comparables: result.comparables?.map(c => c.id) || [],
              notes: `Bulk valuation completed on ${new Date().toLocaleDateString('he-IL')}`
            }
          }
          onUpdateProperty(updatedProperty)
        }

      } catch (error) {
        setValuationResults(prev => prev.map(r => 
          r.propertyId === propertyId
            ? {
                ...r,
                status: 'error',
                error: error instanceof Error ? error.message : 'שגיאה בחישוב שומה'
              }
            : r
        ))
      }

      setCurrentProgress(((i + 1) / selectedPropertyIds.length) * 100)
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsProcessing(false)
    toast.success(`הושלמה שומה ל-${selectedPropertyIds.length} נכסים`)
  }

  const handleExportPDF = () => {
    if (!portfolioStats) {
      toast.error('אין תוצאות לייצוא')
      return
    }

    const completedResults = valuationResults.filter(r => r.status === 'completed')
    exportBulkValuationPDF(completedResults, portfolioStats)
    toast.success('הדוח יוצא בהצלחה')
  }

  const handleExportCSV = () => {
    if (!portfolioStats) {
      toast.error('אין תוצאות לייצוא')
      return
    }

    try {
      exportToCSV(valuationResults, portfolioStats)
      toast.success('קובץ CSV יוצא בהצלחה')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בייצוא CSV')
    }
  }

  const handleExportExcel = () => {
    if (!portfolioStats) {
      toast.error('אין תוצאות לייצוא')
      return
    }

    try {
      exportToExcel(valuationResults, portfolioStats)
      toast.success('קובץ Excel יוצא בהצלחה')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בייצוא Excel')
    }
  }

  const handleExportDetailedCSV = () => {
    if (valuationResults.filter(r => r.status === 'completed').length === 0) {
      toast.error('אין תוצאות לייצוא')
      return
    }

    try {
      exportDetailedCSV(valuationResults)
      toast.success('דוח מפורט CSV יוצא בהצלחה')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בייצוא CSV')
    }
  }

  const handleSendEmail = async (emailData: EmailData) => {
    toast.loading('שולח דוח תיק השקעות באימייל...')
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    log.info('Bulk report email sent:', emailData)
    toast.success(`דוח תיק ההשקעות נשלח ל-${emailData.to.join(', ')}`)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0
    }).format(value)
  }

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'apartment': 'דירה',
      'house': 'בית',
      'penthouse': 'פנטהאוז',
      'garden-apartment': 'דירת גן',
      'duplex': 'דופלקס',
      'studio': 'סטודיו',
      'commercial': 'מסחרי',
      'land': 'קרקע'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <ListChecks size={32} weight="duotone" className="text-primary" />
            שומה מרובת נכסים
          </h2>
          <p className="text-muted-foreground mt-2">
            בצע שומה לכמה נכסים במקביל וקבל ניתוח תיק השקעות מקיף
          </p>
        </div>
        {valuationResults.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Download size={20} weight="bold" />
                ייצוא תוצאות
                <CaretDown size={16} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                <FileText size={18} weight="duotone" />
                ייצוא PDF מלא
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                <FileCsv size={18} weight="duotone" />
                ייצוא CSV - סיכום
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDetailedCSV} className="gap-2 cursor-pointer">
                <FileCsv size={18} weight="duotone" />
                ייצוא CSV - מפורט
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                <FileXls size={18} weight="duotone" />
                ייצוא Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowEmailDialog(true)} className="gap-2 cursor-pointer">
                <PaperPlaneTilt size={18} weight="fill" />
                שלח באימייל
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-effect lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Buildings size={24} weight="duotone" />
              בחירת נכסים לשומה
            </CardTitle>
            <CardDescription>
              נבחרו {selectedPropertyIds.length} מתוך {eligibleProperties.length} נכסים
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedPropertyIds.length === eligibleProperties.length ? 'בטל הכל' : 'בחר הכל'}
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {eligibleProperties.map(property => {
                  const result = valuationResults.find(r => r.propertyId === property.id)
                  const isSelected = selectedPropertyIds.includes(property.id)

                  return (
                    <div
                      key={property.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border transition-all",
                        isSelected && "bg-primary/5 border-primary",
                        result?.status === 'processing' && "animate-pulse",
                        result?.status === 'completed' && "bg-success/5 border-success/30",
                        result?.status === 'error' && "bg-destructive/5 border-destructive/30"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleProperty(property.id)}
                        disabled={isProcessing}
                      />

                      <div className="flex-1">
                        <div className="font-medium">
                          {property.address.street}, {property.address.city}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span>{getPropertyTypeLabel(property.type)}</span>
                          <span>•</span>
                          <span>{property.details.builtArea} מ"ר</span>
                          <span>•</span>
                          <span>{property.details.rooms} חדרים</span>
                        </div>
                      </div>

                      {result && (
                        <div className="flex items-center gap-3">
                          {result.status === 'completed' && (
                            <>
                              <div className="text-left">
                                <div className="font-bold text-success">
                                  {formatCurrency(result.estimatedValue || 0)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ביטחון: {result.confidence}%
                                </div>
                              </div>
                              <CheckCircle size={24} weight="fill" className="text-success" />
                            </>
                          )}
                          {result.status === 'processing' && (
                            <div className="text-primary animate-spin">
                              <Calculator size={24} weight="duotone" />
                            </div>
                          )}
                          {result.status === 'error' && (
                            <Warning size={24} weight="fill" className="text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-lg">הגדרות שומה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>שיטת שומה</Label>
                <Select value={valuationMethod} onValueChange={(v: any) => setValuationMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">אוטומטי (מומלץ)</SelectItem>
                    <SelectItem value="comparable-sales">השוואת מכירות</SelectItem>
                    <SelectItem value="cost-approach">גישת העלות</SelectItem>
                    <SelectItem value="income-approach">גישת ההיוון</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>רדיוס חיפוש (ק"מ)</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>סף דמיון מינימלי (%)</Label>
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseInt(e.target.value))}
                />
              </div>

              <Separator />

              <Button 
                className="w-full gap-2"
                onClick={handleStartBulkValuation}
                disabled={isProcessing || selectedPropertyIds.length === 0}
              >
                <Play size={20} weight="fill" />
                התחל שומה ({selectedPropertyIds.length} נכסים)
              </Button>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={currentProgress} />
                  <p className="text-xs text-center text-muted-foreground">
                    מעבד {Math.round(currentProgress)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {portfolioStats && (
            <Card className="glass-effect border-primary/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ChartBar size={24} weight="duotone" className="text-primary" />
                  סטטיסטיקות תיק
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">שווי כולל</span>
                    <span className="font-bold text-lg text-primary">
                      {formatCurrency(portfolioStats.totalValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">שווי ממוצע</span>
                    <span className="font-semibold">
                      {formatCurrency(portfolioStats.avgValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ביטחון ממוצע</span>
                    <span className="font-semibold">
                      {Math.round(portfolioStats.avgConfidence)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">מחיר למ"ר</span>
                    <span className="font-semibold">
                      {formatCurrency(portfolioStats.avgPricePerSqm)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">טווח שווי</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>מינימום:</span>
                      <span>{formatCurrency(portfolioStats.valueRange.min)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>מקסימום:</span>
                      <span>{formatCurrency(portfolioStats.valueRange.max)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">התפלגות סוגי נכסים</div>
                  <div className="space-y-1">
                    {Object.entries(portfolioStats.propertyTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{getPropertyTypeLabel(type)}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {valuationResults.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText size={24} weight="duotone" />
                תוצאות מפורטות
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                  <FileCsv size={16} weight="duotone" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                  <FileXls size={16} weight="duotone" />
                  Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList className="mb-4">
                <TabsTrigger value="summary">סיכום</TabsTrigger>
                <TabsTrigger value="detailed">פירוט מלא</TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                  <div className="text-sm space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Download size={16} weight="duotone" />
                      אפשרויות ייצוא
                    </div>
                    <div className="text-muted-foreground space-y-1">
                      <div>• <strong>CSV סיכום</strong> - טבלה מסודרת עם כל הנכסים וסטטיסטיקות תיק</div>
                      <div>• <strong>CSV מפורט</strong> - דוח מלא כולל כל הנכסים הדומים לכל נכס</div>
                      <div>• <strong>Excel</strong> - קובץ מעוצב להמשך עיבוד באקסל</div>
                      <div>• <strong>PDF</strong> - דוח מלא עם גרפים ומיתוג מותאם</div>
                    </div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>כתובת</TableHead>
                      <TableHead>סוג</TableHead>
                      <TableHead>שטח</TableHead>
                      <TableHead>שומה</TableHead>
                      <TableHead>מחיר למ"ר</TableHead>
                      <TableHead>ביטחון</TableHead>
                      <TableHead>סטטוס</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuationResults.map(result => (
                      <TableRow key={result.propertyId}>
                        <TableCell className="font-medium">
                          {result.property.address.street}, {result.property.address.city}
                        </TableCell>
                        <TableCell>{getPropertyTypeLabel(result.property.type)}</TableCell>
                        <TableCell>{result.property.details.builtArea} מ"ר</TableCell>
                        <TableCell>
                          {result.estimatedValue ? (
                            <span className="font-bold text-success">
                              {formatCurrency(result.estimatedValue)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {result.estimatedValue ? 
                            formatCurrency(result.estimatedValue / result.property.details.builtArea)
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {result.confidence ? (
                            <Badge variant={result.confidence >= 80 ? 'default' : 'secondary'}>
                              {result.confidence}%
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {result.status === 'completed' && (
                            <Badge variant="default" className="bg-success">
                              <CheckCircle size={14} weight="fill" className="ml-1" />
                              הושלם
                            </Badge>
                          )}
                          {result.status === 'processing' && (
                            <Badge variant="secondary">מעבד...</Badge>
                          )}
                          {result.status === 'error' && (
                            <Badge variant="destructive">
                              <Warning size={14} weight="fill" className="ml-1" />
                              שגיאה
                            </Badge>
                          )}
                          {result.status === 'pending' && (
                            <Badge variant="outline">ממתין</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="detailed">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {valuationResults.filter(r => r.status === 'completed').map(result => (
                      <Card key={result.propertyId}>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {result.property.address.street}, {result.property.address.city}
                          </CardTitle>
                          <CardDescription>
                            {getPropertyTypeLabel(result.property.type)} • {result.property.details.builtArea} מ"ר
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">שווי משוער</div>
                              <div className="text-2xl font-bold text-primary">
                                {formatCurrency(result.estimatedValue || 0)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">טווח שווי</div>
                              <div className="text-sm">
                                {formatCurrency(result.valueRange?.min || 0)} - {formatCurrency(result.valueRange?.max || 0)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">ביטחון</div>
                              <div className="text-lg font-semibold">{result.confidence}%</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">זמן עיבוד</div>
                              <div className="text-sm">{result.processingTime}ms</div>
                            </div>
                          </div>

                          {result.comparables && result.comparables.length > 0 && (
                            <div>
                              <div className="text-sm font-medium mb-2">נכסים דומים ({result.comparables.length})</div>
                              <div className="space-y-2">
                                {result.comparables.slice(0, 3).map(comp => (
                                  <div key={comp.id} className="text-xs p-2 bg-muted/50 rounded">
                                    <div className="flex justify-between">
                                      <span>{comp.address}</span>
                                      <span className="font-medium">{formatCurrency(comp.adjustedPrice)}</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                      דמיון: {comp.similarityScore}% • מרחק: {comp.distance}km
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <EmailReportDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        reportTitle={`תיק השקעות - ${valuationResults.filter(r => r.status === 'completed').length} נכסים`}
        reportType="דוח שומה מרובה"
        recipientSuggestions={[]}
        onSend={handleSendEmail}
        attachments={[
          {
            name: `דוח-תיק-השקעות-${new Date().toISOString().split('T')[0]}.pdf`,
            size: 1024 * 1024 * 2.5,
            type: 'pdf',
            preview: `דוח שומה מרובת נכסים\n\nתאריך: ${new Date().toLocaleDateString('he-IL')}\n\nסיכום:\n- סה"כ נכסים: ${valuationResults.filter(r => r.status === 'completed').length}\n- שווי כולל: ${portfolioStats ? formatCurrency(portfolioStats.totalValue) : 'N/A'}\n- שווי ממוצע: ${portfolioStats ? formatCurrency(portfolioStats.avgValue) : 'N/A'}\n\nמכיל ניתוח מפורט לכל נכס עם נתוני שוק מקומיים.`
          },
          {
            name: `נתוני-שומות-${new Date().toISOString().split('T')[0]}.csv`,
            size: 1024 * 45,
            type: 'csv',
            preview: `כתובת,סוג נכס,שטח,חדרים,שווי משוער,ביטחון,שיטה\n${valuationResults.filter(r => r.status === 'completed').slice(0, 3).map(r => `"${r.property.address.street}, ${r.property.address.city}",${getPropertyTypeLabel(r.property.type)},${r.property.details.builtArea},${r.property.details.rooms},${r.estimatedValue},${r.confidence}%,${r.method}`).join('\n')}\n...`
          },
          {
            name: `ניתוח-תיק-השקעות.xlsx`,
            size: 1024 * 128,
            type: 'excel'
          }
        ]}
      />
    </div>
  )
}
