// Pure CSV-parsing logic for bulk comparable-sale import, split out of
// components/appraiser/csv-import.tsx so that file only exports a
// component (keeps Fast Refresh happy) and so this logic is independently
// testable without rendering anything.

export type ParsedComparableRow = {
  line: number
  areaSqm: number | null
  salePrice: number | null
  soldAt: string | null
  floor: number | null
  rooms: number | null
  yearBuilt: number | null
  error: string | null
}

// city/propertyType come from the parent property (same as the manual
// add-comparable form) -- a row only needs the per-sale numbers. Matches
// both Hebrew and English column headers, case-insensitively.
const HEADER_PATTERNS: Record<'areaSqm' | 'salePrice' | 'soldAt' | 'floor' | 'rooms' | 'yearBuilt', RegExp> = {
  areaSqm: /^(area|areasqm|sqm|m2|שטח|מ"ר|מ״ר)$/i,
  salePrice: /^(price|saleprice|sale_price|מחיר|מחיר מכירה)$/i,
  soldAt: /^(date|solddate|sold_at|soldat|תאריך|תאריך מכירה)$/i,
  floor: /^(floor|קומה)$/i,
  rooms: /^(rooms|חדרים)$/i,
  yearBuilt: /^(year|yearbuilt|year_built|שנת בנייה|שנה)$/i,
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"') {
      if (inQuotes && next === '"') { current += '"'; i += 1 } else { inQuotes = !inQuotes }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Accepts ISO (YYYY-MM-DD) or Israeli-conventional DD/MM/YYYY or
// DD.MM.YYYY -- deliberately does NOT accept bare MM/DD/YYYY, the same
// ambiguity this product avoids elsewhere (see DateField).
function parseDateFlexible(raw: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (iso) return raw
  const il = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(raw)
  if (il) {
    const [, d, m, y] = il
    const day = Number(d)
    const month = Number(m)
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
  }
  return null
}

export function parseCsv(text: string): { rows: ParsedComparableRow[]; headerError: string | null } {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length < 2) {
    return { rows: [], headerError: 'הקובץ חייב להכיל שורת כותרות ולפחות שורת נתונים אחת' }
  }
  const headers = parseCsvLine(lines[0])
  const colIndex: Partial<Record<keyof typeof HEADER_PATTERNS, number>> = {}
  ;(Object.keys(HEADER_PATTERNS) as Array<keyof typeof HEADER_PATTERNS>).forEach((key) => {
    const idx = headers.findIndex((h) => HEADER_PATTERNS[key].test(h))
    if (idx >= 0) colIndex[key] = idx
  })
  if (colIndex.areaSqm === undefined || colIndex.salePrice === undefined || colIndex.soldAt === undefined) {
    const missing = [
      colIndex.areaSqm === undefined ? 'שטח' : null,
      colIndex.salePrice === undefined ? 'מחיר' : null,
      colIndex.soldAt === undefined ? 'תאריך' : null,
    ].filter(Boolean).join(', ')
    return { rows: [], headerError: `לא נמצאו עמודות חובה בקובץ: ${missing}. עמודות נדרשות: שטח, מחיר, תאריך (אופציונלי: קומה, חדרים, שנת בנייה).` }
  }

  const rows: ParsedComparableRow[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i])
    const get = (key: keyof typeof HEADER_PATTERNS) => {
      const idx = colIndex[key]
      return idx === undefined ? undefined : values[idx]
    }

    // Spreadsheet exports (Excel/Sheets) commonly quote numbers with
    // thousand-separator commas ("2,200,000") and/or a currency symbol --
    // strip both before parsing, since a bare Number() would silently
    // reject them (caught by testing against a real-shaped export, not by
    // inspection).
    const cleanNumber = (s: string | undefined) => (s ? Number(s.replace(/[,₪$\s]/g, '')) : NaN)

    const areaSqm = cleanNumber(get('areaSqm'))
    const salePrice = cleanNumber(get('salePrice'))
    const soldAtRaw = get('soldAt') || ''
    const soldAt = parseDateFlexible(soldAtRaw)
    const floorRaw = get('floor')
    const roomsRaw = get('rooms')
    const yearBuiltRaw = get('yearBuilt')

    let error: string | null = null
    if (!Number.isFinite(areaSqm) || areaSqm <= 0) error = 'שטח לא תקין'
    else if (!Number.isFinite(salePrice) || salePrice <= 0) error = 'מחיר לא תקין'
    else if (!soldAt) error = `תאריך לא תקין ("${soldAtRaw}") — נדרש DD/MM/YYYY או YYYY-MM-DD`

    // Optional fields: a garbage value just means "not provided" rather
    // than failing the whole row -- only the three required fields above
    // can mark a row invalid.
    const optionalOrNull = (s: string | undefined) => {
      if (!s) return null
      const n = cleanNumber(s)
      return Number.isFinite(n) ? n : null
    }

    rows.push({
      line: i + 1,
      areaSqm: Number.isFinite(areaSqm) ? areaSqm : null,
      salePrice: Number.isFinite(salePrice) ? salePrice : null,
      soldAt,
      floor: optionalOrNull(floorRaw),
      rooms: optionalOrNull(roomsRaw),
      yearBuilt: optionalOrNull(yearBuiltRaw),
      error,
    })
  }
  return { rows, headerError: null }
}
