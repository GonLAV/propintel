import { describe, expect, it } from 'vitest'
import { buildDataGovSearchUrl, resolveDataGovResourceId } from '@/lib/dataGovAPI'

describe('Data.gov resource configuration', () => {
  it('fails visibly when no resource is configured', () => {
    expect(() => resolveDataGovResourceId({})).toThrow(/VITE_DATA_GOV_NADLAN_RESOURCE_ID/)
  })

  it('builds a request with the configured resource and property filters', () => {
    const url = buildDataGovSearchUrl({
      resourceId: 'active-resource',
      city: 'חיפה',
      street: 'הרצל',
      limit: 25,
      offset: 50,
    })

    expect(url.searchParams.get('resource_id')).toBe('active-resource')
    expect(url.searchParams.get('limit')).toBe('25')
    expect(url.searchParams.get('offset')).toBe('50')
    expect(JSON.parse(url.searchParams.get('filters') || '{}')).toEqual({
      city: 'חיפה',
      street: 'הרצל',
    })
  })
})
