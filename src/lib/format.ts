/**
 * Shared formatters
 * ─────────────────
 * All number / currency / date formatting in one place.
 */

const ilsFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const ilsCompactFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  notation: 'compact',
  compactDisplay: 'short',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat('he-IL')

/**
 * Format a number as Israeli Shekel currency.
 * @example formatILS(1500000) → "₪1,500,000"
 */
export function formatILS(value: number): string {
  return ilsFormatter.format(value)
}

/**
 * Format a number as compact Israeli Shekel currency.
 * @example formatILSCompact(1500000) → "₪1.5M"
 */
export function formatILSCompact(value: number): string {
  if (value >= 1_000_000) {
    return `₪${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `₪${(value / 1_000).toFixed(0)}K`
  }
  return ilsCompactFormatter.format(value)
}

/**
 * Format a plain number with locale-aware separators.
 * @example formatNumber(12345) → "12,345"
 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/**
 * Format area in square meters.
 * @example formatArea(120) → "120 מ״ר"
 */
export function formatArea(sqm: number): string {
  return `${formatNumber(sqm)} מ״ר`
}

/**
 * Format a date string as a localized short date.
 * @example formatDate("2025-01-15") → "15/01/2025"
 */
export function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

/**
 * Format a date string as relative time.
 * @example formatRelativeDate("2025-12-01") → "לפני 3 חודשים"
 */
export function formatRelativeDate(dateStr: string): string {
  try {
    const rtf = new Intl.RelativeTimeFormat('he-IL', { numeric: 'auto' })
    const diff = new Date(dateStr).getTime() - Date.now()
    const days = Math.round(diff / (1000 * 60 * 60 * 24))

    if (Math.abs(days) < 1) return 'היום'
    if (Math.abs(days) < 7) return rtf.format(days, 'day')
    if (Math.abs(days) < 30) return rtf.format(Math.round(days / 7), 'week')
    if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month')
    return rtf.format(Math.round(days / 365), 'year')
  } catch {
    return dateStr
  }
}
