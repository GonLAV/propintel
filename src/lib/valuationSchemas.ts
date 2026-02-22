import { z } from 'zod'

/**
 * Schemas used by the valuation engine.
 * Intentionally narrower than the full UI types: only what calculations require.
 */

export const PropertyConditionSchema = z.enum([
  'new',
  'excellent',
  'good',
  'fair',
  'poor',
  'renovation-needed'
])

export const PropertyTypeSchema = z.enum([
  'apartment',
  'house',
  'penthouse',
  'garden-apartment',
  'duplex',
  'studio',
  'commercial',
  'land'
])

export const EnginePropertySchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  status: z.enum(['draft', 'in-progress', 'completed', 'sent']),
  address: z.object({
    street: z.string(),
    city: z.string(),
    neighborhood: z.string(),
    postalCode: z.string().optional().default('')
  }),
  type: PropertyTypeSchema,
  details: z.object({
    builtArea: z.number().positive(),
    totalArea: z.number().positive().optional(),
    rooms: z.number().nonnegative(),
    bedrooms: z.number().int().nonnegative(),
    bathrooms: z.number().int().nonnegative(),
    floor: z.number().int().nonnegative(),
    totalFloors: z.number().int().nonnegative().optional(),
    buildYear: z.number().int().min(1800).max(2200),
    condition: PropertyConditionSchema,
    parking: z.number().int().nonnegative(),
    storage: z.boolean(),
    balcony: z.boolean(),
    elevator: z.boolean(),
    accessible: z.boolean()
  }),
  features: z.array(z.string()).default([]),
  description: z.string().default(''),
  photos: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const EngineComparableSchema = z.object({
  id: z.string().min(1),
  address: z.string().min(1),
  type: PropertyTypeSchema,
  salePrice: z.number().positive(),
  saleDate: z.string().min(1),
  builtArea: z.number().positive(),
  rooms: z.number().nonnegative(),
  floor: z.number().int().nonnegative().default(0),
  distance: z.number().nonnegative().default(0),
  adjustments: z.object({
    location: z.number(),
    size: z.number(),
    condition: z.number(),
    floor: z.number(),
    age: z.number(),
    features: z.number(),
    total: z.number()
  }).default({
    location: 0,
    size: 0,
    condition: 0,
    floor: 0,
    age: 0,
    features: 0,
    total: 0
  }),
  adjustedPrice: z.number().nonnegative().default(0),
  pricePerSqm: z.number().nonnegative().default(0),
  selected: z.boolean().default(true),
  similarityScore: z.number().min(0).max(100).optional()
})

export type EngineProperty = z.infer<typeof EnginePropertySchema>
export type EngineComparable = z.infer<typeof EngineComparableSchema>
