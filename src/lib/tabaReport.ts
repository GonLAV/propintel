import { jsPDF } from 'jspdf'
import type { TabaExtraction } from '@/lib/tabaExtraction'
import type { TabaDerived } from '@/lib/tabaCalculator'

export interface TabaReportMeta {
  fileName: string
  planKey?: string | null
  address?: string | null
  city?: string | null
}

export function generateTabaReportPDF(params: {
  extraction: TabaExtraction
  derived?: TabaDerived | null
  meta: TabaReportMeta
}) {
  const { extraction, derived, meta } = params
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  let y = 40
  const lh = 18

  const addLine = (text: string) => {
    doc.text(text, 40, y)
    y += lh
  }

  doc.setFontSize(16)
  addLine('דוח חילוץ הוראות תב"ע (מערכת ביקורתית)')
  doc.setFontSize(11)
  addLine(`קובץ: ${meta.fileName}`)
  if (meta.planKey) addLine(`מזהה תכנית/planKey: ${meta.planKey}`)
  if (meta.address) addLine(`כתובת: ${meta.address}${meta.city ? ', ' + meta.city : ''}`)

  y += 6
  doc.setFontSize(13)
  addLine('תוצאה רשמית (JSON) – ללא פרשנות')
  doc.setFontSize(10)

  const rows1 = [
    ['ייעוד עיקרי', extraction.primary_use ?? 'null'],
    ['שימושים נוספים', (extraction.additional_uses || []).join(', ') || '[]'],
    ['מס׳ קומות מירבי', extraction.max_floors !== null ? String(extraction.max_floors) : 'null'],
    ['גובה מירבי (מ׳)', extraction.max_height_m !== null ? String(extraction.max_height_m) : 'null'],
    ['אחוז בנייה', extraction.building_percent !== null ? String(extraction.building_percent) : 'null'],
    ['זכויות עיקריות (מ״ר)', extraction.main_building_rights_sqm !== null ? String(extraction.main_building_rights_sqm) : 'null'],
    ['הגבלות מיוחדות', (extraction.special_restrictions || []).join(', ') || '[]'],
    ['דרישות חניה', extraction.parking_requirements ?? 'null'],
    ['Confidence', String(extraction.confidence)]
  ]

  for (const [k, v] of rows1) {
    addLine(`${k}: ${v}`)
  }

  if (extraction.notes && extraction.notes.length) {
    y += 6
    doc.setFontSize(12)
    addLine('הערות/סתירות:')
    doc.setFontSize(10)
    for (const n of extraction.notes) addLine(`• ${n}`)
  }

  if (derived) {
    y += 10
    doc.setFontSize(13)
    addLine('מחשבוני שמאות (שמרני)')
    doc.setFontSize(10)

    const rows2 = [
      ['שטח מגרש (מ״ר)', derived.site_area_sqm !== null ? String(derived.site_area_sqm) : '—'],
      ['בנייה מותרת (מ״ר)', derived.allowed_built_area_sqm !== null ? String(derived.allowed_built_area_sqm) : '—'],
      ['זכויות עיקריות (מ״ר)', derived.main_building_rights_sqm !== null ? String(derived.main_building_rights_sqm) : '—'],
      ['מס׳ קומות', derived.max_floors !== null ? String(derived.max_floors) : '—'],
      ['גובה (מ׳)', derived.max_height_m !== null ? String(derived.max_height_m) : '—'],
      ['שלמות נתונים (%)', String(derived.completeness)],
      ['Confidence (input)', String(derived.confidence_input)],
      ['Confidence (final)', String(derived.confidence_final)]
    ]

    for (const [k, v] of rows2) addLine(`${k}: ${v}`)

    if (derived.special_restrictions && derived.special_restrictions.length) {
      y += 6
      doc.setFontSize(12)
      addLine('הגבלות מיוחדות (נגזר):')
      doc.setFontSize(10)
      for (const s of derived.special_restrictions) addLine(`• ${s}`)
    }
  }

  y += 10
  doc.setFontSize(9)
  addLine('שקיפות: החילוץ מבוסס טקסט בלבד, ללא פרשנות. נתונים שאינם מפורשים מוחזרים כ-null. יש להצליב עם מקור התכנית והמסמכים.')

  doc.save(`taba_report_${meta.planKey || meta.fileName}.pdf`)
}
