import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchTransactions: vi.fn(),
  normalizeTransactions: vi.fn(),
  fetchBuildingRights: vi.fn(),
}))

vi.mock('@/lib/dataGovAPI', () => ({
  fetchTransactionsFromDataGov: mocks.fetchTransactions,
  normalizeTransactions: mocks.normalizeTransactions,
}))

vi.mock('@/lib/unifiedGovAPI', () => ({
  unifiedGovAPI: {
    fetchBuildingRights: mocks.fetchBuildingRights,
  },
}))

import {
  GovernmentDataService,
  GovernmentDataServiceError,
} from './govDataService'

describe('GovernmentDataService', () => {
  const service = new GovernmentDataService()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('normalizes data.gov.il transactions and records verified provenance', async () => {
    mocks.fetchTransactions.mockResolvedValue([{ _id: 42 }])
    mocks.normalizeTransactions.mockReturnValue([{
      id: '42',
      price: 2_000_000,
      pricePerSqm: 20_000,
      area: 100,
      date: '2026-01-01',
      city: 'Tel Aviv',
      street: 'Known source street',
      houseNumber: '1',
      floor: 2,
      rooms: 3,
      assetType: 'apartment',
      dealNature: 'sale',
      propertyStatus: 'new',
      dataSource: 'data.gov.il',
      verified: true,
    }])

    const result = await service.searchTransactions({ city: 'Tel Aviv' })

    expect(mocks.fetchTransactions).toHaveBeenCalledWith({ city: 'Tel Aviv' })
    expect(result.transactions[0].provenance).toMatchObject({
      source: 'data.gov.il',
      verified: true,
    })
    expect(result.sources[0]).toMatchObject({
      source: 'data.gov.il',
      status: 'available',
      verified: true,
    })
  })

  it('labels partial iPlan/Mavat building-rights results without inventing source data', async () => {
    mocks.fetchBuildingRights.mockResolvedValue({
      iPlanData: null,
      mavatData: { permits: [{ permitNumber: 'P-1' }], violations: [] },
    })

    const result = await service.getBuildingRights({ gush: '1', helka: '2' })

    expect(result.buildingRights).not.toBeNull()
    expect(result.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'iPlan', status: 'empty', verified: false }),
      expect.objectContaining({ source: 'Mavat', status: 'available', verified: true }),
    ]))
  })

  it('returns failed source metadata when the building-rights aggregator fails', async () => {
    mocks.fetchBuildingRights.mockRejectedValue(new Error('service unavailable'))

    const result = await service.getBuildingRights({ gush: '1', helka: '2' })

    expect(result.buildingRights).toBeNull()
    expect(result.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'iPlan', status: 'failed', error: 'service unavailable' }),
      expect.objectContaining({ source: 'Mavat', status: 'failed', error: 'service unavailable' }),
    ]))
  })

  it('passes cancellation to data.gov.il and preserves abort errors', async () => {
    const controller = new AbortController()
    mocks.fetchTransactions.mockImplementation(async (search) => {
      expect(search.signal).toBe(controller.signal)
      controller.abort()
      throw new DOMException('The request was aborted', 'AbortError')
    })

    await expect(
      service.searchTransactions({ city: 'Tel Aviv', signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(mocks.fetchTransactions).toHaveBeenCalledOnce()
  })

  it('surfaces data.gov.il failures with source context', async () => {
    mocks.fetchTransactions.mockRejectedValue(new Error('network unavailable'))

    await expect(service.searchTransactions({ city: 'Tel Aviv' })).rejects.toEqual(
      expect.objectContaining<Partial<GovernmentDataServiceError>>({
        name: 'GovernmentDataServiceError',
        source: 'data.gov.il',
      }),
    )
  })
})
