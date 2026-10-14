import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Property } from '@/lib/types'
import {
  AIServiceError,
  generateComparablesForProperty,
  generateInitialComparables,
  generateReportContent,
  generateValuationInsights,
} from '@/services/aiService'

function createTestProperty(): Property {
  return {
    id: 'test-prop-1',
    clientId: 'client-1',
    status: 'in-progress',
    address: {
      street: 'רחוב לוינסקי 22',
      city: 'תל אביב',
      neighborhood: 'פלורנטין',
      postalCode: '64161',
    },
    type: 'apartment',
    details: {
      builtArea: 85,
      rooms: 3.5,
      bedrooms: 2,
      bathrooms: 1,
      floor: 3,
      totalFloors: 5,
      buildYear: 2010,
      condition: 'good',
      parking: 1,
      storage: true,
      balcony: true,
      elevator: true,
      accessible: false,
    },
    features: [],
    description: 'דירת 3.5 חדרים בפלורנטין',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const validComparable = {
  id: 'comp-1',
  address: 'לא מאומת (AI)',
  type: 'apartment',
  salePrice: 2_000_000,
  saleDate: '2024-01-15',
  builtArea: 80,
  rooms: 3,
  floor: 2,
  distance: 0.5,
  pricePerSqm: 25_000,
  selected: false,
  adjustments: {
    location: 0,
    size: 10_000,
    condition: 0,
    floor: 0,
    age: -5_000,
    features: 0,
    total: 5_000,
  },
  adjustedPrice: 2_005_000,
  similarityScore: 88,
}

const validReportContent = {
  executiveSummary: 'תקציר',
  locationAnalysis: 'ניתוח מיקום',
  marketAnalysis: 'ניתוח שוק',
  conclusion: 'סיכום',
}

let llmMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  llmMock = vi.fn()
  vi.stubGlobal('window', { spark: { llm: llmMock } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateComparablesForProperty', () => {
  it('parses and returns validated comparables, forcing selected=false', async () => {
    llmMock.mockResolvedValue(JSON.stringify({ comparables: [{ ...validComparable, selected: true }] }))

    const result = await generateComparablesForProperty(createTestProperty(), {
      radiusKm: 1,
      maxResults: 1,
      minSize: 50,
      maxSize: 150,
      saleTimeframeMonths: 6,
      propertyTypes: ['apartment'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('comp-1')
    expect(result[0].selected).toBe(false)
    expect(llmMock).toHaveBeenCalledWith(expect.any(String), 'gpt-4o', true)
  })

  it('throws AIServiceError when the LLM response is not valid JSON', async () => {
    llmMock.mockResolvedValue('not json at all')

    await expect(
      generateComparablesForProperty(createTestProperty(), {
        radiusKm: 1,
        maxResults: 1,
        minSize: 50,
        maxSize: 150,
        saleTimeframeMonths: 6,
        propertyTypes: ['apartment'],
      })
    ).rejects.toBeInstanceOf(AIServiceError)
  })

  it('throws AIServiceError when the JSON fails schema validation', async () => {
    llmMock.mockResolvedValue(JSON.stringify({ comparables: [{ id: 'comp-1' }] }))

    await expect(
      generateComparablesForProperty(createTestProperty(), {
        radiusKm: 1,
        maxResults: 1,
        minSize: 50,
        maxSize: 150,
        saleTimeframeMonths: 6,
        propertyTypes: ['apartment'],
      })
    ).rejects.toBeInstanceOf(AIServiceError)
  })

  it('throws AIServiceError when the address is not the unverified placeholder', async () => {
    llmMock.mockResolvedValue(
      JSON.stringify({ comparables: [{ ...validComparable, address: 'רחוב בדוי 5' }] })
    )

    await expect(
      generateComparablesForProperty(createTestProperty(), {
        radiusKm: 1,
        maxResults: 1,
        minSize: 50,
        maxSize: 150,
        saleTimeframeMonths: 6,
        propertyTypes: ['apartment'],
      })
    ).rejects.toBeInstanceOf(AIServiceError)
  })

  it('propagates a wrapped AIServiceError when the underlying LLM call rejects', async () => {
    llmMock.mockRejectedValue(new Error('network down'))

    await expect(
      generateComparablesForProperty(createTestProperty(), {
        radiusKm: 1,
        maxResults: 1,
        minSize: 50,
        maxSize: 150,
        saleTimeframeMonths: 6,
        propertyTypes: ['apartment'],
      })
    ).rejects.toBeInstanceOf(AIServiceError)
  })
})

describe('generateReportContent', () => {
  it('parses and returns validated report content', async () => {
    llmMock.mockResolvedValue(JSON.stringify(validReportContent))

    const result = await generateReportContent(createTestProperty(), 'לקוח לדוגמה', 'standard')

    expect(result).toEqual(validReportContent)
  })

  it('throws AIServiceError on malformed JSON', async () => {
    llmMock.mockResolvedValue('{not valid json')

    await expect(
      generateReportContent(createTestProperty(), undefined, 'standard')
    ).rejects.toBeInstanceOf(AIServiceError)
  })
})

describe('generateInitialComparables', () => {
  it('parses and returns validated comparables with selected=true', async () => {
    llmMock.mockResolvedValue(JSON.stringify({ comparables: [{ ...validComparable, selected: false }] }))

    const result = await generateInitialComparables(createTestProperty())

    expect(result).toHaveLength(1)
    expect(result[0].selected).toBe(true)
  })

  it('throws AIServiceError when schema validation fails', async () => {
    llmMock.mockResolvedValue(JSON.stringify({ comparables: [{ ...validComparable, type: 'castle' }] }))

    await expect(generateInitialComparables(createTestProperty())).rejects.toBeInstanceOf(AIServiceError)
  })
})

describe('generateValuationInsights', () => {
  it('returns trimmed plain-text insights from the LLM', async () => {
    llmMock.mockResolvedValue('  ניתוח מקצועי קצר.  ')

    const result = await generateValuationInsights(createTestProperty(), [], 2_000_000, 90)

    expect(result).toBe('ניתוח מקצועי קצר.')
    expect(llmMock).toHaveBeenCalledWith(expect.any(String), 'gpt-4o')
  })

  it('throws AIServiceError when the underlying LLM call rejects', async () => {
    llmMock.mockRejectedValue(new Error('timeout'))

    await expect(
      generateValuationInsights(createTestProperty(), [], 2_000_000, 90)
    ).rejects.toBeInstanceOf(AIServiceError)
  })
})
