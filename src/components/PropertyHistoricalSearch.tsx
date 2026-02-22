import { useState, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MagnifyingGlass, 
  X, 
  SortAscending, 
  Calendar,
  MapPin,
  FileText,
  Download,
  Eye,
  Scales,
  ClockCounterClockwise,
  FunnelSimple,
  Star,
  BookmarkSimple,
  FloppyDisk,
  TrendUp
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface PropertyHistoricalRecord {
  id: string
  propertyIdentifier: string
  propertyAddress: string
  createdAt: string
  scenario: {
    id: string
    name: string
    previousStatus: {
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
    }
    newStatus: {
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
    }
    determiningDate: string
    lotSize: number
    marketValue: number
    calculationMethod: string
  }
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

interface ChangeLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  entityType: 'case' | 'property' | 'report' | 'client' | 'invoice'
  entityId: string
  action: 'created' | 'updated' | 'deleted' | 'locked' | 'unlocked' | 'signed' | 'exported' | 'shared'
  changes?: any
  metadata?: any
}

interface FilterState {
  searchTerm: string
  dateFrom: string
  dateTo: string
  planNumber: string
  calculationMethod: string
  levyRange: { min: string; max: string }
  sortBy: 'date' | 'levy' | 'address' | 'value'
  sortOrder: 'asc' | 'desc'
}

interface SearchPreset {
  id: string
  name: string
  description: string
  filters: FilterState
  createdAt: string
}

const defaultPresets: SearchPreset[] = [
  {
    id: 'recent-high-value',
    name: 'היטלים גבוהים אחרונים',
    description: 'היטלים מעל מיליון ₪ מ-30 יום אחרונים',
    filters: {
      searchTerm: '',
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: '',
      planNumber: '',
      calculationMethod: 'all',
      levyRange: { min: '1000000', max: '' },
      sortBy: 'levy',
      sortOrder: 'desc'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'this-year',
    name: 'חישובים השנה',
    description: 'כל החישובים מתחילת השנה',
    filters: {
      searchTerm: '',
      dateFrom: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      dateTo: '',
      planNumber: '',
      calculationMethod: 'all',
      levyRange: { min: '', max: '' },
      sortBy: 'date',
      sortOrder: 'desc'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'weighted-method',
    name: 'ממוצע משוקלל בלבד',
    description: 'חישובים בשיטת ממוצע משוקלל',
    filters: {
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      planNumber: '',
      calculationMethod: 'weighted',
      levyRange: { min: '', max: '' },
      sortBy: 'date',
      sortOrder: 'desc'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: 'last-quarter',
    name: 'רבעון אחרון',
    description: 'כל החישובים מ-90 יום אחרונים',
    filters: {
      searchTerm: '',
      dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: '',
      planNumber: '',
      calculationMethod: 'all',
      levyRange: { min: '', max: '' },
      sortBy: 'date',
      sortOrder: 'desc'
    },
    createdAt: new Date().toISOString()
  }
]

export function PropertyHistoricalSearch() {
  const [historicalRecords, _setHistoricalRecords] = useKV<PropertyHistoricalRecord[]>('betterment-history', [])
  const [_changeLogs] = useKV<ChangeLog[]>('change-logs', [])
  const [searchPresets, setSearchPresets] = useKV<SearchPreset[]>('search-presets', defaultPresets)
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    planNumber: '',
    calculationMethod: 'all',
    levyRange: { min: '', max: '' },
    sortBy: 'date',
    sortOrder: 'desc'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<PropertyHistoricalRecord | null>(null)
  const [_activeView, _setActiveView] = useState<'grid' | 'list'>('list')
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')

  const filteredAndSortedRecords = useMemo(() => {
    let filtered = historicalRecords || []

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(record => 
        record.propertyAddress.toLowerCase().includes(term) ||
        record.propertyIdentifier.toLowerCase().includes(term) ||
        record.scenario.name.toLowerCase().includes(term) ||
        record.scenario.previousStatus.planNumber.toLowerCase().includes(term) ||
        record.scenario.newStatus.planNumber.toLowerCase().includes(term) ||
        record.notes?.toLowerCase().includes(term)
      )
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(record => new Date(record.createdAt) >= fromDate)
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      filtered = filtered.filter(record => new Date(record.createdAt) <= toDate)
    }

    if (filters.planNumber) {
      const planTerm = filters.planNumber.toLowerCase()
      filtered = filtered.filter(record =>
        record.scenario.previousStatus.planNumber.toLowerCase().includes(planTerm) ||
        record.scenario.newStatus.planNumber.toLowerCase().includes(planTerm)
      )
    }

    if (filters.calculationMethod !== 'all') {
      filtered = filtered.filter(record => 
        record.scenario.calculationMethod === filters.calculationMethod
      )
    }

    if (filters.levyRange.min) {
      const minLevy = parseFloat(filters.levyRange.min)
      filtered = filtered.filter(record => record.calculationResult.levy >= minLevy)
    }

    if (filters.levyRange.max) {
      const maxLevy = parseFloat(filters.levyRange.max)
      filtered = filtered.filter(record => record.calculationResult.levy <= maxLevy)
    }

    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'levy':
          comparison = a.calculationResult.levy - b.calculationResult.levy
          break
        case 'address':
          comparison = a.propertyAddress.localeCompare(b.propertyAddress, 'he')
          break
        case 'value':
          comparison = a.calculationResult.bettermentValue - b.calculationResult.bettermentValue
          break
      }

      return filters.sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [historicalRecords, filters])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.searchTerm) count++
    if (filters.dateFrom) count++
    if (filters.dateTo) count++
    if (filters.planNumber) count++
    if (filters.calculationMethod !== 'all') count++
    if (filters.levyRange.min) count++
    if (filters.levyRange.max) count++
    return count
  }, [filters])

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      planNumber: '',
      calculationMethod: 'all',
      levyRange: { min: '', max: '' },
      sortBy: 'date',
      sortOrder: 'desc'
    })
    toast.success('הסננים נוקו')
  }

  const applyPreset = (preset: SearchPreset) => {
    setFilters(preset.filters)
    setShowFilters(false)
    toast.success(`החיפוש "${preset.name}" הופעל`)
  }

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) {
      toast.error('נא להזין שם לחיפוש השמור')
      return
    }

    const newPreset: SearchPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      description: newPresetDescription.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString()
    }

    setSearchPresets((current) => [...(current || defaultPresets), newPreset])
    setNewPresetName('')
    setNewPresetDescription('')
    setShowSavePreset(false)
    toast.success('החיפוש נשמר בהצלחה')
  }

  const deletePreset = (presetId: string) => {
    setSearchPresets((current) => (current || []).filter(p => p.id !== presetId))
    toast.success('החיפוש השמור נמחק')
  }

  const exportResults = () => {
    const csv = [
      ['כתובת', 'מזהה נכס', 'תכנית קודמת', 'תכנית חדשה', 'תאריך קובע', 'היטל ממוצע', 'השבחה', 'תאריך רישום'].join(','),
      ...filteredAndSortedRecords.map(record => [
        record.propertyAddress,
        record.propertyIdentifier,
        record.scenario.previousStatus.planNumber,
        record.scenario.newStatus.planNumber,
        new Date(record.scenario.determiningDate).toLocaleDateString('he-IL'),
        record.calculationResult.averageLevy.toLocaleString('he-IL'),
        record.calculationResult.bettermentValue.toLocaleString('he-IL'),
        new Date(record.createdAt).toLocaleDateString('he-IL')
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historical-records-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast.success('הקובץ יוצא בהצלחה')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ClockCounterClockwise className="w-8 h-8 text-primary" weight="duotone" />
            רשומות היסטוריות
          </h2>
          <p className="text-muted-foreground mt-2">
            חיפוס וסינון נכסים בהיסטוריית חישובי היטל השבחה
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportResults}
            disabled={filteredAndSortedRecords.length === 0}
          >
            <Download className="ml-2" />
            ייצא תוצאות ({filteredAndSortedRecords.length})
          </Button>
        </div>
      </div>

      {(searchPresets && searchPresets.length > 0) && (
        <Card className="p-4 glass-effect border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <BookmarkSimple className="w-5 h-5 text-primary" weight="duotone" />
            <h3 className="font-semibold text-foreground">חיפושים שמורים</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchPresets.map((preset) => (
              <div key={preset.id} className="group relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="pr-8 hover:bg-primary/10 hover:border-primary transition-all"
                >
                  <Star className="ml-2 w-4 h-4" weight="duotone" />
                  {preset.name}
                </Button>
                {!defaultPresets.find(p => p.id === preset.id) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -left-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePreset(preset.id)
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 glass-effect border-border/50">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlass className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="חיפוש לפי כתובת, מזהה נכס, תכנית, או הערות..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pr-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <FunnelSimple className="ml-2" weight={showFilters ? "fill" : "regular"} />
              סינון מתקדם
              {activeFilterCount > 0 && (
                <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <>
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="ml-2" />
                  נקה הכל
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSavePreset(true)}
                  className="gap-2"
                >
                  <FloppyDisk className="w-4 h-4" />
                  שמור חיפוש
                </Button>
              </>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Separator className="mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>מתאריך</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>עד תאריך</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>מספר תכנית</Label>
                    <Input
                      placeholder="חיפוש לפי מספר תכנית..."
                      value={filters.planNumber}
                      onChange={(e) => setFilters(prev => ({ ...prev, planNumber: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>שיטת חישוב</Label>
                    <Select
                      value={filters.calculationMethod}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, calculationMethod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">הכל</SelectItem>
                        <SelectItem value="direct">חישוב ישיר</SelectItem>
                        <SelectItem value="weighted">ממוצע משוקלל</SelectItem>
                        <SelectItem value="comparative">השוואתי</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>היטל מינימלי (₪)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.levyRange.min}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        levyRange: { ...prev.levyRange, min: e.target.value }
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>היטל מקסימלי (₪)</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.levyRange.max}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        levyRange: { ...prev.levyRange, max: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">מיין לפי:</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">תאריך</SelectItem>
                  <SelectItem value="levy">סכום היטל</SelectItem>
                  <SelectItem value="address">כתובת</SelectItem>
                  <SelectItem value="value">שווי השבחה</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                }))}
              >
                <SortAscending 
                  className={`transition-transform ${filters.sortOrder === 'desc' ? 'rotate-180' : ''}`} 
                />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              נמצאו <span className="font-semibold text-foreground">{filteredAndSortedRecords.length}</span> תוצאות
              {(historicalRecords?.length || 0) > filteredAndSortedRecords.length && (
                <span> מתוך {historicalRecords?.length || 0} סה"כ</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedRecords.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card className="p-5 hover:shadow-lg transition-all hover:border-primary/50 cursor-pointer group"
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <MapPin className="text-primary w-5 h-5" weight="duotone" />
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {record.propertyAddress}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span>מזהה: {record.propertyIdentifier}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(record.calculationResult.averageLevy)}
                        </div>
                        <div className="text-xs text-muted-foreground">היטל ממוצע</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">תכנית קודמת</div>
                        <Badge variant="outline" className="font-mono">
                          {record.scenario.previousStatus.planNumber}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">תכנית חדשה</div>
                        <Badge variant="default" className="font-mono">
                          {record.scenario.newStatus.planNumber}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">תאריך קובע</div>
                        <div className="text-sm font-medium flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(record.scenario.determiningDate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">שווי השבחה</div>
                        <div className="text-sm font-semibold text-success">
                          {formatCurrency(record.calculationResult.bettermentValue)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>נוצר: {formatDate(record.createdAt)}</span>
                        <span>שיטה: {record.scenario.calculationMethod}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Eye className="w-4 h-4" />
                        פרטים מלאים
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredAndSortedRecords.length === 0 && (
            <Card className="p-12 text-center">
              <MagnifyingGlass className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">לא נמצאו תוצאות</h3>
              <p className="text-muted-foreground mb-6">
                נסה לשנות את קריטריוני החיפוש או הסינון
              </p>
              {activeFilterCount > 0 && (
                <Button onClick={clearFilters}>
                  <X className="ml-2" />
                  נקה סננים
                </Button>
              )}
            </Card>
          )}
        </div>
      </ScrollArea>

      <Dialog open={showSavePreset} onOpenChange={setShowSavePreset}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FloppyDisk className="w-5 h-5 text-primary" weight="duotone" />
              שמירת חיפוש
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">שם החיפוש השמור</Label>
              <Input
                id="preset-name"
                placeholder="לדוגמה: היטלים גבוהים החודש"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-desc">תיאור (אופציונלי)</Label>
              <Input
                id="preset-desc"
                placeholder="תיאור קצר של החיפוש"
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
              />
            </div>
            <div className="bg-muted/30 p-3 rounded-lg text-sm">
              <div className="text-muted-foreground mb-2">קריטריוני חיפוש נוכחיים:</div>
              <div className="space-y-1">
                {filters.searchTerm && <div>• חיפוש טקסט: {filters.searchTerm}</div>}
                {filters.dateFrom && <div>• מתאריך: {new Date(filters.dateFrom).toLocaleDateString('he-IL')}</div>}
                {filters.dateTo && <div>• עד תאריך: {new Date(filters.dateTo).toLocaleDateString('he-IL')}</div>}
                {filters.planNumber && <div>• מספר תכנית: {filters.planNumber}</div>}
                {filters.calculationMethod !== 'all' && <div>• שיטת חישוב: {filters.calculationMethod}</div>}
                {filters.levyRange.min && <div>• היטל מינימלי: {formatCurrency(parseFloat(filters.levyRange.min))}</div>}
                {filters.levyRange.max && <div>• היטל מקסימלי: {formatCurrency(parseFloat(filters.levyRange.max))}</div>}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowSavePreset(false)
                setNewPresetName('')
                setNewPresetDescription('')
              }}>
                ביטול
              </Button>
              <Button onClick={saveCurrentAsPreset}>
                <FloppyDisk className="ml-2" />
                שמור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Scales className="w-6 h-6 text-primary" weight="duotone" />
              פרטי חישוב מלאים
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6 mt-4">
              <Card className="p-4 bg-muted/30">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">כתובת נכס</div>
                    <div className="font-semibold">{selectedRecord.propertyAddress}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">מזהה נכס</div>
                    <div className="font-semibold font-mono">{selectedRecord.propertyIdentifier}</div>
                  </div>
                </div>
              </Card>

              <Tabs defaultValue="calculation" dir="rtl">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="calculation">חישוב</TabsTrigger>
                  <TabsTrigger value="plans">תכניות</TabsTrigger>
                  <TabsTrigger value="market">נתוני שוק</TabsTrigger>
                </TabsList>

                <TabsContent value="calculation" className="space-y-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendUp className="w-5 h-5 text-primary" />
                      תוצאות חישוב
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span>שווי למ"ר</span>
                        <span className="font-semibold">{formatCurrency(selectedRecord.calculationResult.valuePerSqm)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span>שווי השבחה כולל</span>
                        <span className="font-semibold text-success">{formatCurrency(selectedRecord.calculationResult.bettermentValue)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                        <span className="font-semibold">היטל שמרני</span>
                        <span className="font-bold text-primary">{formatCurrency(selectedRecord.calculationResult.conservativeLevy)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                        <span className="font-semibold">היטל ממוצע</span>
                        <span className="font-bold text-primary">{formatCurrency(selectedRecord.calculationResult.averageLevy)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                        <span className="font-semibold">היטל מקסימלי</span>
                        <span className="font-bold text-primary">{formatCurrency(selectedRecord.calculationResult.maximumLevy)}</span>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="plans" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 text-muted-foreground">מצב קודם</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-muted-foreground">תכנית:</span> {selectedRecord.scenario.previousStatus.planNumber}</div>
                        <div><span className="text-muted-foreground">שם:</span> {selectedRecord.scenario.previousStatus.planName}</div>
                        <div><span className="text-muted-foreground">אזור:</span> {selectedRecord.scenario.previousStatus.zoning}</div>
                        <Separator className="my-2" />
                        <div><span className="text-muted-foreground">אחוז בנייה:</span> {selectedRecord.scenario.previousStatus.buildingRights.farPercentage}%</div>
                        <div><span className="text-muted-foreground">קומות:</span> {selectedRecord.scenario.previousStatus.buildingRights.floors}</div>
                        <div><span className="text-muted-foreground">שטח עיקרי:</span> {selectedRecord.scenario.previousStatus.buildingRights.mainArea} מ"ר</div>
                      </div>
                    </Card>

                    <Card className="p-4 border-primary">
                      <h4 className="font-semibold mb-3 text-primary">מצב חדש</h4>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-muted-foreground">תכנית:</span> {selectedRecord.scenario.newStatus.planNumber}</div>
                        <div><span className="text-muted-foreground">שם:</span> {selectedRecord.scenario.newStatus.planName}</div>
                        <div><span className="text-muted-foreground">אזור:</span> {selectedRecord.scenario.newStatus.zoning}</div>
                        <Separator className="my-2" />
                        <div><span className="text-muted-foreground">אחוז בנייה:</span> {selectedRecord.scenario.newStatus.buildingRights.farPercentage}%</div>
                        <div><span className="text-muted-foreground">קומות:</span> {selectedRecord.scenario.newStatus.buildingRights.floors}</div>
                        <div><span className="text-muted-foreground">שטח עיקרי:</span> {selectedRecord.scenario.newStatus.buildingRights.mainArea} מ"ר</div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="market" className="space-y-4">
                  <Card className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">תאריך קובע</span>
                        <span className="font-semibold">{formatDate(selectedRecord.scenario.determiningDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">שווי שוק</span>
                        <span className="font-semibold">{formatCurrency(selectedRecord.scenario.marketValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">שיטת חישוב</span>
                        <span className="font-semibold">{selectedRecord.scenario.calculationMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">גודל מגרש</span>
                        <span className="font-semibold">{selectedRecord.scenario.lotSize} מ"ר</span>
                      </div>
                    </div>
                  </Card>

                  {selectedRecord.notes && (
                    <Card className="p-4 bg-muted/30">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">הערות</h4>
                      <p className="text-sm">{selectedRecord.notes}</p>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
