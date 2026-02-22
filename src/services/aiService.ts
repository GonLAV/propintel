import { z } from 'zod'
import type { Property } from '@/lib/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('AIService')

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

  const raw = await window.spark.llm(promptText, 'gpt-4o', true)
  const parsed = AIComparablesResponseSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) {
    log.error('AI comparables validation error:', parsed.error)
    return []
  }
  return parsed.data.comparables.map((c) => ({ ...c, selected: false }))
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

  const raw = await window.spark.llm(promptText, 'gpt-4o', true)
  const parsed = ReportAIContentSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) {
    log.error('AI report content validation error:', parsed.error)
    return { executiveSummary: '', locationAnalysis: '', marketAnalysis: '', conclusion: '' }
  }
  return parsed.data
}
