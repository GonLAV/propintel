import { z } from 'zod'
import type { Property, Comparable, PropertyType } from '@/lib/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('AIService')

/**
 * Thrown for any failure of an AI call — transport errors, malformed JSON,
 * or responses that fail schema validation. Callers should catch this (or
 * any Error) rather than relying on empty/partial fallback values.
 */
export class AIServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'AIServiceError'
  }
}

/**
 * Plain-text wrapper around `window.spark.llm`. Use for free-form prose
 * responses (no JSON parsing/validation).
 */
async function callLLMText(prompt: string, model = 'gpt-4o'): Promise<string> {
  try {
    return await window.spark.llm(prompt, model)
  } catch (error) {
    log.error('AI text request failed:', error)
    throw new AIServiceError('AI request failed', error)
  }
}

/**
 * Strict JSON-mode wrapper around `window.spark.llm`. Parses the raw
 * response and validates it against the provided Zod schema — never casts
 * unsafely. Throws `AIServiceError` on transport failure, malformed JSON,
 * or schema validation failure so callers get consistent error handling.
 */
async function callLLMJson<T>(prompt: string, schema: z.ZodType<T>, model = 'gpt-4o'): Promise<T> {
  let raw: string
  try {
    raw = await window.spark.llm(prompt, model, true)
  } catch (error) {
    log.error('AI JSON request failed:', error)
    throw new AIServiceError('AI request failed', error)
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (error) {
    log.error('AI JSON response was not valid JSON:', error)
    throw new AIServiceError('AI returned malformed JSON', error)
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    log.error('AI JSON response failed schema validation:', parsed.error)
    throw new AIServiceError('AI response failed schema validation', parsed.error)
  }

  return parsed.data
}

export type AIComparable = {
  id: string
  address: string
  type: string
  salePrice: number
  saleDate: string
  builtArea: number
  rooms: number
  floor: number
  distance: number
  pricePerSqm: number
  adjustments: {
    location: number
    size: number
    condition: number
    floor: number
    age: number
    features: number
    total: number
  }
  adjustedPrice: number
  similarityScore: number
  selected: boolean
}

export const AIComparableSchema = z.object({
  id: z.string(),
  address: z.literal('לא מאומת (AI)'),
  type: z.string(),
  salePrice: z.number().min(0),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  builtArea: z.number().min(0),
  rooms: z.number().min(0),
  floor: z.number().min(0),
  distance: z.number().min(0),
  pricePerSqm: z.number().min(0),
  selected: z.boolean().default(false),
  adjustments: z.object({
    location: z.number(),
    size: z.number(),
    condition: z.number(),
    floor: z.number(),
    age: z.number(),
    features: z.number(),
    total: z.number(),
  }),
  adjustedPrice: z.number(),
  similarityScore: z.number().min(0).max(100),
})

const AIComparablesResponseSchema = z.object({
  comparables: z.array(AIComparableSchema),
})

export type ReportAIContent = {
  executiveSummary: string
  locationAnalysis: string
  marketAnalysis: string
  conclusion: string
}

const ReportAIContentSchema = z.object({
  executiveSummary: z.string().default(''),
  locationAnalysis: z.string().default(''),
  marketAnalysis: z.string().default(''),
  conclusion: z.string().default(''),
})

export async function generateComparablesForProperty(
  property: Property,
  options: {
    radiusKm: number
    maxResults: number
    minSize: number
    maxSize: number
    saleTimeframeMonths: number
    propertyTypes: string[]
  }
): Promise<AIComparable[]> {
  const promptText = `אתה מומחה שמאות נדל"ן. צור רשימה של ${options.maxResults} נכסי השוואה ריאליסטיים עבור הנכס הבא:

כתובת: ${property.address.street}, ${property.address.neighborhood}, ${property.address.city}
סוג: ${property.type}
שטח בנוי: ${property.details.builtArea} מ"ר
חדרים: ${property.details.rooms}
קומה: ${property.details.floor}
שנת בנייה: ${property.details.buildYear}

קריטריונים לחיפוש:
- רדיוס חיפוש: ${options.radiusKm} ק"מ מהנכס
- סוגי נכסים: ${options.propertyTypes.join(', ')}
- טווח שטח: ${options.minSize}-${options.maxSize} מ"ר
- מכירות ב-${options.saleTimeframeMonths} חודשים אחרונים
- אין לך גישה למאגר כתובות. אסור להמציא רחובות/כתובות.

החזר JSON עם מפתח "comparables" שמכיל מערך של נכסים. כל נכס חייב לכלול:
{
  "id": "comp-{מספר}",
  "address": "לא מאומת (AI)",
  "type": "${property.type}",
  "salePrice": מחיר_מכירה_בשקלים,
  "saleDate": "YYYY-MM-DD",
  "builtArea": מספר,
  "rooms": מספר,
  "floor": מספר,
  "distance": מספר_בק"מ,
  "pricePerSqm": מספר,
  "selected": false,
  "adjustments": {
    "location": מספר,
    "size": מספר,
    "condition": מספר,
    "floor": מספר,
    "age": מספר,
    "features": מספר,
    "total": מספר
  },
  "adjustedPrice": מספר,
  "similarityScore": מספר_בין_0_ל_100
}

התאמות צריכות להיות הגיוניות (בדרך כלל -200,000 עד +200,000 לכל קטגוריה).`

  const data = await callLLMJson(promptText, AIComparablesResponseSchema)
  return data.comparables.map((c) => ({ ...c, selected: false }))
}

export async function generateReportContent(
  property: Property,
  clientName: string | undefined,
  template: 'standard' | 'detailed' | 'summary' | 'bank'
): Promise<ReportAIContent> {
  const promptText = `אתה כותב דוחות שמאות מקצועי. קח את פרטי הנכס והלקוח והפק תוכן לדוח:

נכס: ${property.address.street}, ${property.address.city} | סוג: ${property.type} | שטח: ${property.details.builtArea} מ"ר
לקוח: ${clientName ?? 'לא צוין'} | תבנית: ${template}

נדרש להחזיר JSON במבנה:
{
  "executiveSummary": "...",
  "locationAnalysis": "...",
  "marketAnalysis": "...",
  "conclusion": "..."
}
בלי להוסיף עובדות חיצוניות שאינן ניתנות לאימות.`

  return callLLMJson(promptText, ReportAIContentSchema)
}

const PropertyTypeSchema = z.enum([
  'apartment',
  'house',
  'penthouse',
  'garden-apartment',
  'duplex',
  'studio',
  'commercial',
  'land',
])

const ComparableSchema = z.object({
  id: z.string(),
  address: z.literal('לא מאומת (AI)'),
  type: PropertyTypeSchema,
  salePrice: z.number().min(0),
  saleDate: z.string(),
  builtArea: z.number().min(0),
  rooms: z.number().min(0),
  floor: z.number().min(0),
  distance: z.number().min(0),
  adjustments: z.object({
    location: z.number(),
    size: z.number(),
    condition: z.number(),
    floor: z.number(),
    age: z.number(),
    features: z.number(),
    total: z.number(),
  }),
  adjustedPrice: z.number(),
  pricePerSqm: z.number().min(0),
  selected: z.boolean().default(true),
  similarityScore: z.number().min(0).max(100).optional(),
})

const ComparablesResponseSchema = z.object({
  comparables: z.array(ComparableSchema),
})

/**
 * Generates an initial set of AI comparable properties for a valuation
 * (used by `AIValuation`). Preserves the original English prompt/behavior:
 * exactly 5 comparables, unverifiable placeholder address, sold within the
 * last 6 months.
 */
export async function generateInitialComparables(property: Property): Promise<Comparable[]> {
  const promptText = `You are a professional real estate appraiser. Generate realistic comparable properties for this property:

Address: ${property.address.street}, ${property.address.neighborhood}, ${property.address.city}
Type: ${property.type}
Built Area: ${property.details.builtArea} sqm
Rooms: ${property.details.rooms}
Floor: ${property.details.floor}/${property.details.totalFloors}
Build Year: ${property.details.buildYear}
Condition: ${property.details.condition}

Generate exactly 5 comparable properties sold within the last 6 months in the same area. For each comparable:
1. DO NOT invent street names or claim any address is real. Use the placeholder "לא מאומת (AI)" for the address field.
2. Set a sale price that makes sense for the area
3. Calculate appropriate adjustments for location, size, condition, floor, age, and features
4. Calculate adjusted price and price per sqm
5. Determine distance from subject property (0.2-2.0 km)

Return ONLY valid JSON with this exact structure, no additional text:
{
  "comparables": [
    {
      "id": "comp-{unique_id}",
          "address": "לא מאומת (AI)",
      "type": "${property.type}",
      "salePrice": 0,
      "saleDate": "2024-MM-DD",
      "builtArea": 0,
      "rooms": 0,
      "floor": 0,
      "distance": 0.0,
      "adjustments": {
        "location": 0,
        "size": 0,
        "condition": 0,
        "floor": 0,
        "age": 0,
        "features": 0,
        "total": 0
      },
      "adjustedPrice": 0,
      "pricePerSqm": 0,
      "selected": true
    }
  ]
}`

  const data = await callLLMJson(promptText, ComparablesResponseSchema)
  return data.comparables.map((c) => ({ ...c, type: c.type as PropertyType, selected: true }))
}

/**
 * Generates a short Hebrew professional-analysis note for a valuation
 * (used by `AIValuation`'s "refine with AI" action). Plain-text response,
 * no JSON parsing/validation involved.
 */
export async function generateValuationInsights(
  property: Property,
  selectedComparables: Comparable[],
  estimatedValue: number | undefined,
  confidence: number | undefined
): Promise<string> {
  const promptText = `As a professional appraiser, analyze these comparable properties and provide insights:

Subject Property:
- Address: ${property.address.street}, ${property.address.city}
- Type: ${property.type}
- Size: ${property.details.builtArea} sqm
- Rooms: ${property.details.rooms}
- Condition: ${property.details.condition}

Selected Comparables:
${selectedComparables.map((c, i) => `${i + 1}. ${c.address} - ${c.salePrice.toLocaleString()} ILS (${c.builtArea} sqm, ${c.rooms} rooms)`).join('\n')}

Estimated Value: ${estimatedValue?.toLocaleString()} ILS
Confidence: ${confidence}%

Provide a brief professional analysis (2-3 sentences in Hebrew) covering:
1. Market positioning of this property
2. Key factors affecting the valuation
3. Any recommendations or considerations

Return ONLY the Hebrew text, no JSON, no formatting.`

  const insights = await callLLMText(promptText)
  return insights.trim()
}
