/**
 * CSV Parser for real estate comparable transactions.
 * Auto-detects and maps common field patterns from CSV headers.
 */

import { importComparablesFromJson } from './comparablesImport'
import type { Comparable } from './types'

export interface CSVParseResult {
  comparables: Comparable[]
  errors: Array<{ row: number; message: string }>
  fieldMapping: FieldMapping
}

export interface FieldMapping {
  address: string | null
  type: string | null
  salePrice: string | null
  saleDate: string | null
  builtArea: string | null
  rooms: string | null
  floor: string | null
}

const COMMON_FIELD_PATTERNS: Record<string, RegExp[]> = {
  address: [/^(address|כתובת|loc|location|주소)$/i],
  type: [/^(type|סוג|property_type|유형)$/i],
  // Include common camelCase headers used in app/tests
  salePrice: [/^(price|מחיר|sale_price|sale|salePrice)$/i],
  saleDate: [/^(date|תאריך|sale_date|saleDate|날짜)$/i],
  builtArea: [/^(area|שטח|sqm|m2|builtArea|面積)$/i],
  rooms: [/^(rooms|חדרים|bedrooms|bed|רoomcount)$/i],
  floor: [/^(floor|קומה|level|층)$/i]
}

function autoDetectFields(headers: string[]): FieldMapping {
  const mapping: FieldMapping = {
    address: null,
    type: null,
    salePrice: null,
    saleDate: null,
    builtArea: null,
    rooms: null,
    floor: null
  }

  for (const [key, patterns] of Object.entries(COMMON_FIELD_PATTERNS)) {
    for (let i = 0; i < headers.length; i++) {
      if (patterns.some(p => p.test(headers[i]))) {
        mapping[key as keyof FieldMapping] = headers[i]
        break
      }
    }
  }

  return mapping
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
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

export function parseCSV(csvText: string): CSVParseResult {
  const lines = csvText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length < 2) {
    return {
      comparables: [],
      errors: [{ row: 0, message: 'קובץ CSV חייב להכיל שורת כותרות + לפחות שורה אחת של נתונים' }],
      fieldMapping: {
        address: null,
        type: null,
        salePrice: null,
        saleDate: null,
        builtArea: null,
        rooms: null,
        floor: null
      }
    }
  }

  // Parse headers
  const headers = parseCSVLine(lines[0])
  const fieldMapping = autoDetectFields(headers)

  // Validate that we found key fields
  if (!fieldMapping.address || !fieldMapping.salePrice || !fieldMapping.builtArea) {
    return {
      comparables: [],
      errors: [
        {
          row: 0,
          message: `לא הצלחתי למצוא עמודות חובה: ${
            !fieldMapping.address ? 'כתובת' : ''
          } ${!fieldMapping.salePrice ? 'מחיר' : ''} ${!fieldMapping.builtArea ? 'שטח' : ''}`
        }
      ],
      fieldMapping
    }
  }

  // Parse data rows
  const jsonRows: Record<string, unknown>[] = []
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue

    const row: Record<string, unknown> = {}

    // Map values to field names
    const addressIdx = headers.indexOf(fieldMapping.address!)
    const typeIdx = fieldMapping.type ? headers.indexOf(fieldMapping.type) : -1
    const pricIdx = headers.indexOf(fieldMapping.salePrice!)
    const dateIdx = fieldMapping.saleDate ? headers.indexOf(fieldMapping.saleDate) : -1
    const areaIdx = headers.indexOf(fieldMapping.builtArea!)
    const roomsIdx = fieldMapping.rooms ? headers.indexOf(fieldMapping.rooms) : -1
    const floorIdx = fieldMapping.floor ? headers.indexOf(fieldMapping.floor) : -1

    try {
      row.address = values[addressIdx] || `Property ${i}`
      row.type = typeIdx >= 0 ? values[typeIdx] : 'apartment'
      row.salePrice = parseFloat(values[pricIdx])
      row.saleDate = dateIdx >= 0 ? values[dateIdx] : new Date().toISOString().split('T')[0]
      row.builtArea = parseFloat(values[areaIdx])
      row.rooms = roomsIdx >= 0 ? parseFloat(values[roomsIdx]) : undefined
      row.floor = floorIdx >= 0 ? parseInt(values[floorIdx], 10) : undefined

      if (isNaN(row.salePrice as number) || isNaN(row.builtArea as number)) {
        errors.push({ row: i + 1, message: 'מחיר או שטח לא תקינים' })
        continue
      }

      jsonRows.push(row)
    } catch (e) {
      errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'שגיאה בעיבוד שורה' })
    }
  }

  // Use existing JSON import logic to normalize
  const jsonImportResult = importComparablesFromJson(JSON.stringify(jsonRows))
  const finalErrors = [
    ...errors,
    ...jsonImportResult.errors.map(e => ({
      row: (e.index ?? -1) + 2,
      message: e.message
    }))
  ]

  return {
    comparables: jsonImportResult.comparables,
    errors: finalErrors,
    fieldMapping
  }
}
