import { z } from 'zod'

// Official, strict schema per user's spec
export const TabaExtractionSchema = z.object({
  primary_use: z.string().nullable(),
  additional_uses: z.array(z.string()).default([]),
  max_floors: z.number().nullable(),
  max_height_m: z.number().nullable(),
  building_percent: z.number().nullable(),
  main_building_rights_sqm: z.number().nullable(),
  special_restrictions: z.array(z.string()).default([]),
  parking_requirements: z.string().nullable(),
  notes: z.array(z.string()).default([]),
  confidence: z.number()
})

export type TabaExtraction = z.infer<typeof TabaExtractionSchema>

const SYSTEM_PROMPT = `אתה מנוע חילוץ מידע תכנוני.
תפקידך הוא לחלץ נתונים מתוך טקסט של הוראות תב"ע בלבד.

אסור לך:
- לנחש
- לפרש
- להסתמך על ידע חיצוני
- להניח הנחות תכנוניות

אם נתון לא מופיע במפורש בטקסט – החזר null.
אם יש סתירה – ציין אותה בשדה notes.`

function buildUserPrompt(planText: string) {
  return `להלן טקסט מלא מתוך "הוראות התכנית" של תב"ע.

משימה:
חלץ אך ורק מידע שמופיע במפורש בטקסט.
אל תסיק מסקנות.
אל תשלב ידע תכנוני כללי.
אל תתייחס לתשריטים.

החזר תשובה בפורמט JSON בלבד,
בהתאם לסכמה הבאה.

סכמה:
{"primary_use": null, "additional_uses": [], "max_floors": null, "max_height_m": null, "building_percent": null, "main_building_rights_sqm": null, "special_restrictions": [], "parking_requirements": null, "notes": [], "confidence": 0.0}

טקסט:
<<<
${planText}
>>>`
}

function coerceNumber(value: any): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const v = parseFloat(value.replace(/[^\d.-]/g, ''))
    return Number.isFinite(v) ? v : null
  }
  return null
}

export async function extractTabaFromText(fullText: string): Promise<TabaExtraction> {
  const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(fullText)}`
  // Request strict JSON from Spark LLM
  const raw = await (window as any).spark.llm(prompt, 'gpt-4o', true)
  const obj: any = typeof raw === 'string' ? JSON.parse(raw) : raw

  // Coerce numeric fields just in case the model returns strings
  if (obj) {
    obj.max_floors = coerceNumber(obj.max_floors)
    obj.max_height_m = coerceNumber(obj.max_height_m)
    obj.building_percent = coerceNumber(obj.building_percent)
    obj.main_building_rights_sqm = coerceNumber(obj.main_building_rights_sqm)
    if (!Array.isArray(obj.additional_uses)) obj.additional_uses = []
    if (!Array.isArray(obj.special_restrictions)) obj.special_restrictions = []
    if (!Array.isArray(obj.notes)) obj.notes = []
    if (typeof obj.confidence !== 'number') obj.confidence = 0
    if (obj.primary_use !== null && typeof obj.primary_use !== 'string') obj.primary_use = String(obj.primary_use)
    if (obj.parking_requirements !== null && typeof obj.parking_requirements !== 'string') obj.parking_requirements = String(obj.parking_requirements)
  }

  return TabaExtractionSchema.parse(obj)
}
