import {
  fetchTransactionsFromDataGov,
  normalizeTransactions,
  type CleanTransaction,
} from '@/lib/dataGovAPI'
import {
  unifiedGovAPI,
  type UnifiedBuildingRights,
} from '@/lib/unifiedGovAPI'

export type GovernmentDataSource = 'data.gov.il' | 'iPlan' | 'Mavat'

export interface SourceProvenance {
  source: GovernmentDataSource
  retrievedAt: string
  verified: boolean
}

export interface SourceStatus extends SourceProvenance {
  status: 'available' | 'empty' | 'failed'
  error?: string
}

export interface GovernmentTransaction extends CleanTransaction {
  provenance: SourceProvenance
}

export interface TransactionSearch {
  city: string
  street?: string
  limit?: number
  offset?: number
  signal?: AbortSignal
}

export interface TransactionSearchResult {
  transactions: GovernmentTransaction[]
  sources: [SourceStatus]
}

export interface BuildingRightsSearch {
  gush: string
  helka: string
  address?: string
}

export interface BuildingRightsResult {
  buildingRights: UnifiedBuildingRights | null
  sources: SourceStatus[]
}

export class GovernmentDataServiceError extends Error {
  constructor(
    message: string,
    readonly source: GovernmentDataSource,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'GovernmentDataServiceError'
  }
}

/**
 * Typed facade for government integrations that return verified source data.
 * Synthetic fallback clients are intentionally excluded from real-data flows.
 */
export class GovernmentDataService {
  async searchTransactions(search: TransactionSearch): Promise<TransactionSearchResult> {
    this.throwIfAborted(search.signal)

    try {
      const rawTransactions = await fetchTransactionsFromDataGov(search)
      this.throwIfAborted(search.signal)

      const retrievedAt = new Date().toISOString()
      const transactions = normalizeTransactions(rawTransactions).map((transaction) => ({
        ...transaction,
        provenance: {
          source: 'data.gov.il' as const,
          retrievedAt,
          verified: transaction.verified,
        },
      }))

      return {
        transactions,
        sources: [{
          source: 'data.gov.il',
          retrievedAt,
          verified: true,
          status: transactions.length > 0 ? 'available' : 'empty',
        }],
      }
    } catch (error) {
      if (this.isAbortError(error)) {
        throw error
      }

      throw new GovernmentDataServiceError(
        'Unable to retrieve transactions from data.gov.il',
        'data.gov.il',
        error,
      )
    }
  }

  async getBuildingRights(search: BuildingRightsSearch): Promise<BuildingRightsResult> {
    const retrievedAt = new Date().toISOString()

    try {
      const buildingRights = await unifiedGovAPI.fetchBuildingRights(
        search.gush,
        search.helka,
        search.address,
      )

      return {
        buildingRights,
        sources: [
          this.createSourceStatus('iPlan', Boolean(buildingRights.iPlanData), retrievedAt),
          this.createSourceStatus(
            'Mavat',
            buildingRights.mavatData.permits.length > 0 || buildingRights.mavatData.violations.length > 0,
            retrievedAt,
          ),
        ],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown source error'

      return {
        buildingRights: null,
        sources: [
          { source: 'iPlan', retrievedAt, verified: false, status: 'failed', error: message },
          { source: 'Mavat', retrievedAt, verified: false, status: 'failed', error: message },
        ],
      }
    }
  }

  private createSourceStatus(
    source: Exclude<GovernmentDataSource, 'data.gov.il'>,
    hasData: boolean,
    retrievedAt: string,
  ): SourceStatus {
    return {
      source,
      retrievedAt,
      verified: hasData,
      status: hasData ? 'available' : 'empty',
    }
  }

  private throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) {
      throw new DOMException('The government data request was aborted', 'AbortError')
    }
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError'
  }
}

export const govDataService = new GovernmentDataService()
