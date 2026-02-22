import { israelGovAPI, type MarketTransactionData } from './israelGovAPI'

export interface ImportConfig {
  id: string
  name: string
  nameHe: string
  enabled: boolean
  schedule: 'manual' | 'daily' | 'weekly' | 'monthly'
  lastRun?: string
  nextRun?: string
  filters: {
    location?: {
      latitude: number
      longitude: number
      radiusKm: number
    }
    propertyTypes?: string[]
    minPrice?: number
    maxPrice?: number
    minArea?: number
    maxArea?: number
    rooms?: number[]
    minFloor?: number
    maxFloor?: number
    condition?: string[]
    maxAge?: number
    verifiedOnly: boolean
    sources?: Array<'land-registry' | 'tax-authority' | 'broker' | 'platform'>
  }
  dataRange: {
    months: number
  }
  autoApprove: boolean
  notifyOnImport: boolean
  createdAt: string
  updatedAt: string
}

export interface ImportedTransaction extends MarketTransactionData {
  importId: string
  importConfigId: string
  importedAt: string
  status: 'pending' | 'approved' | 'rejected' | 'duplicate'
  reviewed: boolean
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
  duplicateOf?: string
  tags?: string[]
}

export interface ImportResult {
  configId: string
  configName: string
  startTime: string
  endTime: string
  duration: number
  totalFetched: number
  newTransactions: number
  duplicates: number
  filtered: number
  errors: number
  transactions: ImportedTransaction[]
  status: 'success' | 'partial' | 'failed'
  errorMessages?: string[]
}

export interface ImportHistory {
  id: string
  configId: string
  configName: string
  timestamp: string
  result: ImportResult
}

class TransactionImporter {
  private generateImportId(): string {
    return `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private applyFilters(
    transaction: MarketTransactionData,
    filters: ImportConfig['filters']
  ): boolean {
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      if (!filters.propertyTypes.includes(transaction.propertyType)) return false
    }

    if (filters.minPrice && transaction.price < filters.minPrice) return false
    if (filters.maxPrice && transaction.price > filters.maxPrice) return false
    if (filters.minArea && transaction.area < filters.minArea) return false
    if (filters.maxArea && transaction.area > filters.maxArea) return false

    if (filters.rooms && filters.rooms.length > 0) {
      if (!filters.rooms.includes(transaction.rooms)) return false
    }

    if (filters.minFloor && transaction.floor < filters.minFloor) return false
    if (filters.maxFloor && transaction.floor > filters.maxFloor) return false

    if (filters.condition && filters.condition.length > 0) {
      if (!filters.condition.includes(transaction.condition)) return false
    }

    if (filters.maxAge && transaction.age > filters.maxAge) return false

    if (filters.verifiedOnly && !transaction.verified) return false

    if (filters.sources && filters.sources.length > 0) {
      if (!filters.sources.includes(transaction.source)) return false
    }

    return true
  }

  private findDuplicates(
    newTransaction: MarketTransactionData,
    existingTransactions: ImportedTransaction[]
  ): ImportedTransaction | null {
    return existingTransactions.find(existing => {
      const sameAddress = existing.address === newTransaction.address
      const sameDate = existing.transactionDate === newTransaction.transactionDate
      const samePrice = Math.abs(existing.price - newTransaction.price) < 1000
      const sameArea = Math.abs(existing.area - newTransaction.area) < 2

      return sameAddress && sameDate && samePrice && sameArea
    }) || null
  }

  async runImport(
    config: ImportConfig,
    existingTransactions: ImportedTransaction[] = []
  ): Promise<ImportResult> {
    const startTime = new Date().toISOString()
    const result: ImportResult = {
      configId: config.id,
      configName: config.nameHe,
      startTime,
      endTime: '',
      duration: 0,
      totalFetched: 0,
      newTransactions: 0,
      duplicates: 0,
      filtered: 0,
      errors: 0,
      transactions: [],
      status: 'success',
      errorMessages: []
    }

    try {
      if (!config.filters.location) {
        throw new Error('Location filter is required')
      }

      const { latitude, longitude, radiusKm } = config.filters.location
      const { months } = config.dataRange

      const fetchedTransactions = await israelGovAPI.fetchMarketTransactions(
        latitude,
        longitude,
        radiusKm,
        months
      )

      result.totalFetched = fetchedTransactions.length

      for (const transaction of fetchedTransactions) {
        const passesFilters = this.applyFilters(transaction, config.filters)

        if (!passesFilters) {
          result.filtered++
          continue
        }

        const duplicate = this.findDuplicates(transaction, existingTransactions)

        if (duplicate) {
          result.duplicates++
          continue
        }

        const importedTransaction: ImportedTransaction = {
          ...transaction,
          importId: this.generateImportId(),
          importConfigId: config.id,
          importedAt: new Date().toISOString(),
          status: config.autoApprove ? 'approved' : 'pending',
          reviewed: config.autoApprove,
          tags: []
        }

        result.transactions.push(importedTransaction)
        result.newTransactions++
      }

      const endTime = new Date().toISOString()
      result.endTime = endTime
      result.duration = new Date(endTime).getTime() - new Date(startTime).getTime()

    } catch (error) {
      result.status = 'failed'
      result.errors++
      result.errorMessages = [error instanceof Error ? error.message : 'Unknown error']
      
      const endTime = new Date().toISOString()
      result.endTime = endTime
      result.duration = new Date(endTime).getTime() - new Date(startTime).getTime()
    }

    return result
  }

  async runScheduledImports(
    configs: ImportConfig[],
    existingTransactions: ImportedTransaction[] = []
  ): Promise<ImportResult[]> {
    const now = new Date()
    const results: ImportResult[] = []

    for (const config of configs) {
      if (!config.enabled || config.schedule === 'manual') continue

      const shouldRun = this.shouldRunScheduledImport(config, now)

      if (shouldRun) {
        const result = await this.runImport(config, existingTransactions)
        results.push(result)
      }
    }

    return results
  }

  private shouldRunScheduledImport(config: ImportConfig, now: Date): boolean {
    if (!config.nextRun) return true

    const nextRunDate = new Date(config.nextRun)
    return now >= nextRunDate
  }

  calculateNextRun(config: ImportConfig): string {
    const now = new Date()

    switch (config.schedule) {
      case 'daily':
        now.setDate(now.getDate() + 1)
        now.setHours(2, 0, 0, 0)
        break
      case 'weekly':
        now.setDate(now.getDate() + 7)
        now.setHours(2, 0, 0, 0)
        break
      case 'monthly':
        now.setMonth(now.getMonth() + 1)
        now.setDate(1)
        now.setHours(2, 0, 0, 0)
        break
      default:
        return ''
    }

    return now.toISOString()
  }

  generateImportSummary(result: ImportResult): string {
    const lines = [
      `ייבוא: ${result.configName}`,
      `זמן: ${new Date(result.startTime).toLocaleString('he-IL')}`,
      `משך: ${(result.duration / 1000).toFixed(1)} שניות`,
      ``,
      `📥 נמשכו: ${result.totalFetched}`,
      `✅ חדשות: ${result.newTransactions}`,
      `🔄 כפילויות: ${result.duplicates}`,
      `🔍 סוננו: ${result.filtered}`,
    ]

    if (result.errors > 0) {
      lines.push(`❌ שגיאות: ${result.errors}`)
      if (result.errorMessages) {
        result.errorMessages.forEach(msg => lines.push(`   - ${msg}`))
      }
    }

    return lines.join('\n')
  }

  exportTransactionsToCSV(transactions: ImportedTransaction[]): string {
    const headers = [
      'תאריך עסקה',
      'כתובת',
      'מחיר',
      'מחיר למ״ר',
      'שטח',
      'חדרים',
      'קומה',
      'סה״כ קומות',
      'מצב',
      'גיל',
      'מאומת',
      'מקור',
      'תאריך ייבוא',
      'סטטוס'
    ]

    const rows = transactions.map(t => [
      t.transactionDate,
      t.address,
      t.price.toLocaleString('he-IL'),
      t.pricePerSqm.toLocaleString('he-IL'),
      t.area,
      t.rooms,
      t.floor,
      t.totalFloors,
      t.condition,
      t.age,
      t.verified ? 'כן' : 'לא',
      t.source,
      new Date(t.importedAt).toLocaleDateString('he-IL'),
      t.status === 'approved' ? 'אושר' : t.status === 'pending' ? 'ממתין' : 'נדחה'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    return csv
  }

  getImportStatistics(transactions: ImportedTransaction[]) {
    const total = transactions.length
    const approved = transactions.filter(t => t.status === 'approved').length
    const pending = transactions.filter(t => t.status === 'pending').length
    const rejected = transactions.filter(t => t.status === 'rejected').length
    const duplicates = transactions.filter(t => t.status === 'duplicate').length

    const avgPrice = total > 0
      ? transactions.reduce((sum, t) => sum + t.price, 0) / total
      : 0

    const avgPricePerSqm = total > 0
      ? transactions.reduce((sum, t) => sum + t.pricePerSqm, 0) / total
      : 0

    const avgArea = total > 0
      ? transactions.reduce((sum, t) => sum + t.area, 0) / total
      : 0

    const byPropertyType = transactions.reduce((acc, t) => {
      acc[t.propertyType] = (acc[t.propertyType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySource = transactions.reduce((acc, t) => {
      acc[t.source] = (acc[t.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byMonth = transactions.reduce((acc, t) => {
      const month = t.transactionDate.substring(0, 7)
      acc[month] = (acc[month] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      approved,
      pending,
      rejected,
      duplicates,
      avgPrice,
      avgPricePerSqm,
      avgArea,
      byPropertyType,
      bySource,
      byMonth,
      verifiedCount: transactions.filter(t => t.verified).length,
      verifiedPercentage: total > 0 ? (transactions.filter(t => t.verified).length / total) * 100 : 0
    }
  }
}

export const transactionImporter = new TransactionImporter()

export function createDefaultImportConfig(): ImportConfig {
  const now = new Date().toISOString()
  return {
    id: `CONFIG-${Date.now()}`,
    name: 'Tel Aviv Center',
    nameHe: 'תל אביב מרכז',
    enabled: true,
    schedule: 'weekly',
    lastRun: undefined,
    nextRun: undefined,
    filters: {
      location: {
        latitude: 32.0853,
        longitude: 34.7818,
        radiusKm: 2
      },
      propertyTypes: ['apartment'],
      minPrice: 500000,
      maxPrice: 5000000,
      minArea: 40,
      maxArea: 200,
      rooms: [2, 3, 4, 5],
      verifiedOnly: true,
      sources: ['land-registry', 'tax-authority']
    },
    dataRange: {
      months: 12
    },
    autoApprove: false,
    notifyOnImport: true,
    createdAt: now,
    updatedAt: now
  }
}
