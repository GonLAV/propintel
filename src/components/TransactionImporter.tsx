import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Download, 
  Play, 
  Pause, 
  Plus, 
  Trash, 
  Gear, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  FileText,
  TrendUp,
  Calendar,
  MapPin,
  Funnel,
  ArrowsClockwise,
  FloppyDisk
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { 
  type ImportConfig, 
  type ImportedTransaction, 
  type ImportHistory,
  transactionImporter,
  createDefaultImportConfig
} from '@/lib/transactionImporter'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

export function TransactionImporter() {
  const [configs, setConfigs] = useKV<ImportConfig[]>('import-configs', [])
  const [transactions, setTransactions] = useKV<ImportedTransaction[]>('imported-transactions', [])
  const [history, setHistory] = useKV<ImportHistory[]>('import-history', [])
  const [activeTab, setActiveTab] = useState('configs')
  const [selectedConfig, setSelectedConfig] = useState<ImportConfig | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ImportConfig | null>(null)

  const handleCreateConfig = () => {
    const newConfig = createDefaultImportConfig()
    setEditingConfig(newConfig)
  }

  const handleSaveConfig = () => {
    if (!editingConfig) return

    setConfigs((current) => {
      const existing = (current || []).findIndex(c => c.id === editingConfig.id)
      if (existing >= 0) {
        const updated = [...(current || [])]
        updated[existing] = { ...editingConfig, updatedAt: new Date().toISOString() }
        return updated
      }
      return [...(current || []), editingConfig]
    })

    setEditingConfig(null)
    toast.success('הגדרת הייבוא נשמרה')
  }

  const handleDeleteConfig = (id: string) => {
    setConfigs((current) => (current || []).filter(c => c.id !== id))
    toast.success('הגדרת הייבוא נמחקה')
  }

  const handleToggleConfig = (id: string) => {
    setConfigs((current) => 
      (current || []).map(c => 
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    )
  }

  const handleRunImport = async (config: ImportConfig) => {
    setIsRunning(true)
    setSelectedConfig(config)

    try {
      toast.loading(`מריץ ייבוא: ${config.nameHe}...`)

      const result = await transactionImporter.runImport(config, transactions || [])

      setTransactions((current) => [...(current || []), ...result.transactions])

      setConfigs((current) => 
        (current || []).map(c => 
          c.id === config.id 
            ? { 
                ...c, 
                lastRun: result.startTime,
                nextRun: transactionImporter.calculateNextRun(c)
              } 
            : c
        )
      )

      const historyEntry: ImportHistory = {
        id: `HIST-${Date.now()}`,
        configId: config.id,
        configName: config.nameHe,
        timestamp: result.startTime,
        result
      }

      setHistory((current) => [historyEntry, ...(current || [])])

      toast.dismiss()
      toast.success(
        `ייבוא הושלם: ${result.newTransactions} עסקאות חדשות`,
        {
          description: `כפילויות: ${result.duplicates} | סוננו: ${result.filtered}`
        }
      )

    } catch (error) {
      toast.dismiss()
      toast.error('שגיאה בייבוא', {
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      })
    } finally {
      setIsRunning(false)
      setSelectedConfig(null)
    }
  }

  const handleApproveTransaction = (transactionId: string) => {
    setTransactions((current) =>
      (current || []).map(t =>
        t.importId === transactionId
          ? { ...t, status: 'approved', reviewed: true, reviewedAt: new Date().toISOString() }
          : t
      )
    )
    toast.success('העסקה אושרה')
  }

  const handleRejectTransaction = (transactionId: string) => {
    setTransactions((current) =>
      (current || []).map(t =>
        t.importId === transactionId
          ? { ...t, status: 'rejected', reviewed: true, reviewedAt: new Date().toISOString() }
          : t
      )
    )
    toast.success('העסקה נדחתה')
  }

  const handleExportCSV = () => {
    const csv = transactionImporter.exportTransactionsToCSV(transactions || [])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('הקובץ יוצא בהצלחה')
  }

  const stats = transactionImporter.getImportStatistics(transactions || [])
  const pendingCount = (transactions || []).filter(t => t.status === 'pending').length

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ייבוא אוטומטי של עסקאות</h2>
          <p className="text-muted-foreground mt-1">
            חיבור ל-API ממשלתי לייבוא עסקאות מקרקעין בזמן אמת
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download size={18} weight="duotone" />
            ייצא CSV
          </Button>
          <Button onClick={handleCreateConfig} className="gap-2">
            <Plus size={18} weight="duotone" />
            הגדרת ייבוא חדשה
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database size={18} weight="duotone" className="text-primary" />
              סה״כ עסקאות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total.toLocaleString('he-IL')}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.verifiedPercentage.toFixed(0)}% מאומתות
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock size={18} weight="duotone" className="text-warning" />
              ממתינות לאישור
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              דורשות בדיקה
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendUp size={18} weight="duotone" className="text-success" />
              ממוצע מחיר
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₪{(stats.avgPrice / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ₪{stats.avgPricePerSqm.toLocaleString('he-IL')} למ״ר
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle size={18} weight="duotone" className="text-primary" />
              מאושרות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : 0}% מהכלל
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configs" className="gap-2">
            <Gear size={18} weight="duotone" />
            הגדרות ייבוא
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <Database size={18} weight="duotone" />
            עסקאות ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock size={18} weight="duotone" />
            ממתינות ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar size={18} weight="duotone" />
            היסטוריה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="space-y-4">
          {(configs || []).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database size={64} weight="duotone" className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">אין עדיין הגדרות ייבוא</p>
                <Button onClick={handleCreateConfig} className="gap-2">
                  <Plus size={18} weight="duotone" />
                  צור הגדרת ייבוא ראשונה
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(configs || []).map(config => (
                <Card key={config.id} className={!config.enabled ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {config.nameHe}
                          {config.enabled ? (
                            <Badge variant="outline" className="bg-success/10 text-success">
                              <CheckCircle size={14} weight="fill" className="ml-1" />
                              פעיל
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Pause size={14} className="ml-1" />
                              מושהה
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {config.schedule === 'manual' ? 'ידני' : 
                           config.schedule === 'daily' ? 'יומי' : 
                           config.schedule === 'weekly' ? 'שבועי' : 'חודשי'}
                        </CardDescription>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={() => handleToggleConfig(config.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin size={16} weight="duotone" />
                        רדיוס: {config.filters.location?.radiusKm} ק״מ
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={16} weight="duotone" />
                        טווח: {config.dataRange.months} חודשים אחרונים
                      </div>
                      {config.lastRun && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock size={16} weight="duotone" />
                          ריצה אחרונה: {new Date(config.lastRun).toLocaleDateString('he-IL')}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRunImport(config)}
                        disabled={isRunning || !config.enabled}
                        className="flex-1 gap-2"
                        size="sm"
                      >
                        {isRunning && selectedConfig?.id === config.id ? (
                          <>
                            <ArrowsClockwise size={16} weight="duotone" className="animate-spin" />
                            מייבא...
                          </>
                        ) : (
                          <>
                            <Play size={16} weight="duotone" />
                            הרץ עכשיו
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setEditingConfig(config)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Gear size={16} weight="duotone" />
                        ערוך
                      </Button>
                      <Button
                        onClick={() => handleDeleteConfig(config.id)}
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash size={16} weight="duotone" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionList
            transactions={transactions || []}
            onApprove={handleApproveTransaction}
            onReject={handleRejectTransaction}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <TransactionList
            transactions={(transactions || []).filter(t => t.status === 'pending')}
            onApprove={handleApproveTransaction}
            onReject={handleRejectTransaction}
            showActions
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <HistoryList history={history || []} />
        </TabsContent>
      </Tabs>

      {editingConfig && (
        <ConfigEditor
          config={editingConfig}
          onSave={handleSaveConfig}
          onCancel={() => setEditingConfig(null)}
          onChange={setEditingConfig}
        />
      )}
    </div>
  )
}

function TransactionList({
  transactions,
  onApprove,
  onReject,
  showActions = false
}: {
  transactions: ImportedTransaction[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  showActions?: boolean
}) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    propertyType: 'all' as 'all' | 'apartment' | 'house' | 'commercial' | 'land',
    dateFrom: '',
    dateTo: '',
    city: '',
    neighborhood: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    minRooms: '',
    maxRooms: '',
    verified: false
  })

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.propertyType !== 'all' && transaction.propertyType !== filters.propertyType) {
      return false
    }

    if (filters.dateFrom) {
      const transDate = new Date(transaction.transactionDate)
      const fromDate = new Date(filters.dateFrom)
      if (transDate < fromDate) return false
    }

    if (filters.dateTo) {
      const transDate = new Date(transaction.transactionDate)
      const toDate = new Date(filters.dateTo)
      if (transDate > toDate) return false
    }

    if (filters.city && !transaction.city?.includes(filters.city)) {
      return false
    }

    if (filters.neighborhood && !transaction.neighborhood?.includes(filters.neighborhood)) {
      return false
    }

    if (filters.minPrice && transaction.price < parseFloat(filters.minPrice)) {
      return false
    }

    if (filters.maxPrice && transaction.price > parseFloat(filters.maxPrice)) {
      return false
    }

    if (filters.minArea && transaction.area < parseFloat(filters.minArea)) {
      return false
    }

    if (filters.maxArea && transaction.area > parseFloat(filters.maxArea)) {
      return false
    }

    if (filters.minRooms && transaction.rooms < parseFloat(filters.minRooms)) {
      return false
    }

    if (filters.maxRooms && transaction.rooms > parseFloat(filters.maxRooms)) {
      return false
    }

    if (filters.verified && !transaction.verified) {
      return false
    }

    return true
  })

  const handleResetFilters = () => {
    setFilters({
      propertyType: 'all',
      dateFrom: '',
      dateTo: '',
      city: '',
      neighborhood: '',
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
      minRooms: '',
      maxRooms: '',
      verified: false
    })
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'propertyType') return value !== 'all'
    if (typeof value === 'boolean') return value
    return value !== ''
  }).length

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText size={64} weight="duotone" className="text-muted-foreground mb-4" />
          <p className="text-muted-foreground">אין עסקאות להצגה</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">סינון מתקדם</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">
                  {activeFiltersCount} פילטרים פעילים
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  onClick={handleResetFilters}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <XCircle size={16} weight="duotone" />
                  אפס סינון
                </Button>
              )}
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Funnel size={16} weight="duotone" />
                {showFilters ? 'הסתר' : 'הצג'} סינון
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property-type">סוג נכס</Label>
                <Select
                  value={filters.propertyType}
                  onValueChange={(value: any) => setFilters({ ...filters, propertyType: value })}
                >
                  <SelectTrigger id="property-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסוגים</SelectItem>
                    <SelectItem value="apartment">דירה</SelectItem>
                    <SelectItem value="house">בית פרטי</SelectItem>
                    <SelectItem value="commercial">מסחרי</SelectItem>
                    <SelectItem value="land">קרקע</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-from">תאריך מ-</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-to">תאריך עד</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">עיר</Label>
                <Input
                  id="city"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  placeholder="תל אביב, ירושלים..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">שכונה</Label>
                <Input
                  id="neighborhood"
                  value={filters.neighborhood}
                  onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}
                  placeholder="צפון ישן, נווה צדק..."
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-price">מחיר מינימום</Label>
                <Input
                  id="min-price"
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-price">מחיר מקסימום</Label>
                <Input
                  id="max-price"
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="10,000,000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-area">שטח מינימום (מ״ר)</Label>
                <Input
                  id="min-area"
                  type="number"
                  value={filters.minArea}
                  onChange={(e) => setFilters({ ...filters, minArea: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-area">שטח מקסימום (מ״ר)</Label>
                <Input
                  id="max-area"
                  type="number"
                  value={filters.maxArea}
                  onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })}
                  placeholder="500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-rooms">חדרים מינימום</Label>
                <Input
                  id="min-rooms"
                  type="number"
                  value={filters.minRooms}
                  onChange={(e) => setFilters({ ...filters, minRooms: e.target.value })}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-rooms">חדרים מקסימום</Label>
                <Input
                  id="max-rooms"
                  type="number"
                  value={filters.maxRooms}
                  onChange={(e) => setFilters({ ...filters, maxRooms: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="verified"
                checked={filters.verified}
                onCheckedChange={(checked) => setFilters({ ...filters, verified: checked === true })}
              />
              <Label htmlFor="verified" className="cursor-pointer">
                רק עסקאות מאומתות
              </Label>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>מציג {filteredTransactions.length} מתוך {transactions.length} עסקאות</span>
      </div>

      <div className="space-y-3">
        {filteredTransactions.map(transaction => (
          <Card key={transaction.importId}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{transaction.address}</h4>
                    <Badge variant={
                      transaction.status === 'approved' ? 'default' : 
                      transaction.status === 'pending' ? 'outline' : 
                      'destructive'
                    }>
                      {transaction.status === 'approved' ? 'אושר' : 
                       transaction.status === 'pending' ? 'ממתין' : 'נדחה'}
                    </Badge>
                    {transaction.verified && (
                      <Badge variant="outline" className="bg-success/10 text-success">
                        <CheckCircle size={12} weight="fill" className="ml-1" />
                        מאומת
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">מחיר:</span>
                      <div className="font-semibold">
                        ₪{(transaction.price / 1000000).toFixed(2)}M
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">מחיר למ״ר:</span>
                      <div className="font-semibold">
                        ₪{transaction.pricePerSqm.toLocaleString('he-IL')}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">שטח:</span>
                      <div className="font-semibold">{transaction.area} מ״ר</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">חדרים:</span>
                      <div className="font-semibold">{transaction.rooms}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">קומה:</span>
                      <div className="font-semibold">
                        {transaction.floor} מתוך {transaction.totalFloors}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">מצב:</span>
                      <div className="font-semibold">{transaction.condition}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">גיל:</span>
                      <div className="font-semibold">{transaction.age} שנים</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">תאריך:</span>
                      <div className="font-semibold">
                        {new Date(transaction.transactionDate).toLocaleDateString('he-IL')}
                      </div>
                    </div>
                  </div>

                  {transaction.features && transaction.features.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {transaction.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {showActions && transaction.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onApprove(transaction.importId)}
                      size="sm"
                      className="gap-2"
                    >
                      <CheckCircle size={16} weight="duotone" />
                      אשר
                    </Button>
                    <Button
                      onClick={() => onReject(transaction.importId)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <XCircle size={16} weight="duotone" />
                      דחה
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function HistoryList({ history }: { history: ImportHistory[] }) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar size={64} weight="duotone" className="text-muted-foreground mb-4" />
          <p className="text-muted-foreground">אין היסטוריית ייבוא</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {history.map(entry => (
        <Card key={entry.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{entry.configName}</CardTitle>
                <CardDescription>
                  {new Date(entry.timestamp).toLocaleString('he-IL')}
                </CardDescription>
              </div>
              <Badge variant={
                entry.result.status === 'success' ? 'default' :
                entry.result.status === 'partial' ? 'outline' :
                'destructive'
              }>
                {entry.result.status === 'success' ? 'הצליח' :
                 entry.result.status === 'partial' ? 'חלקי' : 'נכשל'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">נמשכו:</span>
                <div className="font-semibold">{entry.result.totalFetched}</div>
              </div>
              <div>
                <span className="text-muted-foreground">חדשות:</span>
                <div className="font-semibold text-success">{entry.result.newTransactions}</div>
              </div>
              <div>
                <span className="text-muted-foreground">כפילויות:</span>
                <div className="font-semibold text-muted-foreground">{entry.result.duplicates}</div>
              </div>
              <div>
                <span className="text-muted-foreground">סוננו:</span>
                <div className="font-semibold text-muted-foreground">{entry.result.filtered}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              משך: {(entry.result.duration / 1000).toFixed(1)} שניות
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ConfigEditor({
  config,
  onSave,
  onCancel,
  onChange
}: {
  config: ImportConfig
  onSave: () => void
  onCancel: () => void
  onChange: (config: ImportConfig) => void
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>הגדרות ייבוא</DialogTitle>
          <DialogDescription>
            הגדר פרמטרים לייבוא אוטומטי של עסקאות מהממשל
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name-he">שם (עברית)</Label>
                <Input
                  id="name-he"
                  value={config.nameHe}
                  onChange={(e) => onChange({ ...config, nameHe: e.target.value })}
                  placeholder="תל אביב מרכז"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule">תדירות</Label>
                <Select
                  value={config.schedule}
                  onValueChange={(value: any) => onChange({ ...config, schedule: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">ידני</SelectItem>
                    <SelectItem value="daily">יומי</SelectItem>
                    <SelectItem value="weekly">שבועי</SelectItem>
                    <SelectItem value="monthly">חודשי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin size={18} weight="duotone" />
                מיקום
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.0001"
                    value={config.filters.location?.latitude || 32.0853}
                    onChange={(e) => onChange({
                      ...config,
                      filters: {
                        ...config.filters,
                        location: {
                          ...config.filters.location!,
                          latitude: parseFloat(e.target.value)
                        }
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.0001"
                    value={config.filters.location?.longitude || 34.7818}
                    onChange={(e) => onChange({
                      ...config,
                      filters: {
                        ...config.filters,
                        location: {
                          ...config.filters.location!,
                          longitude: parseFloat(e.target.value)
                        }
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radius">רדיוס (ק״מ)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={config.filters.location?.radiusKm || 2}
                    onChange={(e) => onChange({
                      ...config,
                      filters: {
                        ...config.filters,
                        location: {
                          ...config.filters.location!,
                          radiusKm: parseInt(e.target.value)
                        }
                      }
                    })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Funnel size={18} weight="duotone" />
                סינון
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-price">מחיר מינימום</Label>
                    <Input
                      id="min-price"
                      type="number"
                      value={config.filters.minPrice || ''}
                      onChange={(e) => onChange({
                        ...config,
                        filters: {
                          ...config.filters,
                          minPrice: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      placeholder="500,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-price">מחיר מקסימום</Label>
                    <Input
                      id="max-price"
                      type="number"
                      value={config.filters.maxPrice || ''}
                      onChange={(e) => onChange({
                        ...config,
                        filters: {
                          ...config.filters,
                          maxPrice: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      placeholder="5,000,000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-area">שטח מינימום (מ״ר)</Label>
                    <Input
                      id="min-area"
                      type="number"
                      value={config.filters.minArea || ''}
                      onChange={(e) => onChange({
                        ...config,
                        filters: {
                          ...config.filters,
                          minArea: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      placeholder="40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-area">שטח מקסימום (מ״ר)</Label>
                    <Input
                      id="max-area"
                      type="number"
                      value={config.filters.maxArea || ''}
                      onChange={(e) => onChange({
                        ...config,
                        filters: {
                          ...config.filters,
                          maxArea: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      })}
                      placeholder="200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="months">טווח זמן (חודשים)</Label>
                  <Input
                    id="months"
                    type="number"
                    value={config.dataRange.months}
                    onChange={(e) => onChange({
                      ...config,
                      dataRange: {
                        months: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="verified-only"
                    checked={config.filters.verifiedOnly}
                    onCheckedChange={(checked) => onChange({
                      ...config,
                      filters: {
                        ...config.filters,
                        verifiedOnly: checked === true
                      }
                    })}
                  />
                  <Label htmlFor="verified-only">רק עסקאות מאומתות</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auto-approve"
                  checked={config.autoApprove}
                  onCheckedChange={(checked) => onChange({
                    ...config,
                    autoApprove: checked === true
                  })}
                />
                <Label htmlFor="auto-approve">אישור אוטומטי</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify"
                  checked={config.notifyOnImport}
                  onCheckedChange={(checked) => onChange({
                    ...config,
                    notifyOnImport: checked === true
                  })}
                />
                <Label htmlFor="notify">התראה על ייבוא</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={onCancel} variant="outline">
              ביטול
            </Button>
            <Button onClick={onSave} className="gap-2">
              <FloppyDisk size={18} weight="duotone" />
              שמור הגדרות
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
