export type UnderwritingRow = {
  asset: string
  city: string
  value: string
  confidence: string
  status: string
}

export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function parsePercent(value: string) {
  return clamp(Number(sanitizeScalar(value).replace('%', '')) || 0, 0, 100)
}

export function parseCurrencyMillions(value: string) {
  const parsed = Number(sanitizeScalar(value).replace(/[^0-9.-]/g, ''))
  return Math.max(0, Number.isFinite(parsed) ? parsed : 0)
}

export function sanitizeAssetRow(row: UnderwritingRow): UnderwritingRow {
  return {
    asset: sanitizeLabel(row.asset, 'Unnamed asset'),
    city: sanitizeLabel(row.city, 'Unknown city'),
    value: sanitizeScalar(row.value),
    confidence: sanitizeScalar(row.confidence),
    status: sanitizeStatus(row.status),
  }
}

export function sanitizeAssetRows(rows: UnderwritingRow[]) {
  return rows.map(sanitizeAssetRow)
}

export function highestBy<T>(items: T[], selector: (item: T) => number) {
  return [...items].sort((first, second) => selector(second) - selector(first))[0]
}

export function lowestBy<T>(items: T[], selector: (item: T) => number) {
  return [...items].sort((first, second) => selector(first) - selector(second))[0]
}

export function formatMoneyMillions(value: number) {
  return `$${Math.max(0, value).toFixed(2)}M`
}

function sanitizeScalar(value: string) {
  return Array.from(String(value || ''))
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')
    .trim()
    .slice(0, 80)
}

function sanitizeLabel(value: string, fallback: string) {
  const sanitized = sanitizeScalar(value).replace(/[<>]/g, '')
  return sanitized || fallback
}

function sanitizeStatus(status: string) {
  const sanitized = sanitizeScalar(status)
  return ['Ready', 'Review', 'Draft'].includes(sanitized) ? sanitized : 'Draft'
}