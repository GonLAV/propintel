import { z } from 'zod'
import type { Comparable, PropertyType } from './types'
import { EngineComparableSchema } from './valuationSchemas'

const RawComparableSchema = z.object({
  id: z.string().optional(),
  address: z.string(),
  type: z.custom<PropertyType>(),
  salePrice: z.number(),
  saleDate: z.string(),
  builtArea: z.number(),
  rooms: z.number().optional().default(0),
  floor: z.number().optional().default(0),
  distance: z.number().optional().default(0),
  similarityScore: z.number().optional()
})

export interface ImportComparablesResult {
  comparables: Comparable[]
  errors: Array<{ index: number; message: string }>
}

function toComparable(input: z.infer<typeof RawComparableSchema>, _index: number): Comparable {
  const id = input.id || crypto.randomUUID()

  // Build a Comparable with defaults aligned to the app's type
  const candidate: unknown = {
    id,
    address: input.address,
    type: input.type,
    salePrice: input.salePrice,
    saleDate: input.saleDate,
    builtArea: input.builtArea,
    rooms: input.rooms ?? 0,
    floor: input.floor ?? 0,
    distance: input.distance ?? 0,
    adjustments: {
      location: 0,
      size: 0,
      condition: 0,
      floor: 0,
      age: 0,
      features: 0,
      total: 0
    },
    adjustedPrice: 0,
    pricePerSqm: input.builtArea > 0 ? input.salePrice / input.builtArea : 0,
    selected: true,
    similarityScore: input.similarityScore
  }

  // Validate and coerce to engine shape (ensures required fields exist)
  const validated = EngineComparableSchema.parse(candidate)

  return {
    ...validated,
    // keep as Comparable (same shape)
    selected: true
  }
}

/**
 * Import comparables from a JSON string.
 * Expected format: array of objects. Extra fields are ignored.
 */
export function importComparablesFromJson(json: string): ImportComparablesResult {
  const errors: ImportComparablesResult['errors'] = []
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch {
    return {
      comparables: [],
      errors: [{ index: -1, message: 'JSON לא תקין' }]
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      comparables: [],
      errors: [{ index: -1, message: 'הקלט חייב להיות מערך (Array) של עסקאות' }]
    }
  }

  const comparables: Comparable[] = []

  parsed.forEach((row, index) => {
    const raw = RawComparableSchema.safeParse(row)
    if (!raw.success) {
      errors.push({ index, message: raw.error.issues[0]?.message || 'שגיאה בנתוני העסקה' })
      return
    }

    try {
      comparables.push(toComparable(raw.data, index))
    } catch (e) {
      errors.push({ index, message: e instanceof Error ? e.message : 'שגיאה בולידציה' })
    }
  })

  return { comparables, errors }
}
