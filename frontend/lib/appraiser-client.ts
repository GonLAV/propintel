'use client'

// Browser-side helper for the appraiser section. Always same-origin —
// talks to /api/appraiser/*, which is the only thing that knows the real
// backend's address and holds the auth cookie.

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`/api/appraiser/proxy${path}`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `שגיאה (${res.status})`)
  return data as T
}

export async function apiSend<T = unknown>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/appraiser/proxy${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return {} as T
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `שגיאה (${res.status})`)
  return data as T
}

export const PROPERTY_TYPES: Record<string, string> = {
  apartment: 'דירה',
  house: 'בית פרטי',
  office: 'משרד',
  retail: 'מסחרי',
  land: 'קרקע',
  other: 'אחר',
}

export const VALUATION_METHODS: Record<string, string> = {
  comparables: 'השוואה',
  cost: 'עלות',
  income: 'היוון הכנסה',
  reconciled: 'משוקללת',
}

export { translateValuationError, translateAuthError } from './i18n-errors'

// A native <input type="date">'s value is always the ISO "YYYY-MM-DD" per
// spec, regardless of what format the browser's picker widget displays --
// so this is a safe, locale-proof way to show the date back unambiguously
// (DD.MM.YYYY, matching how dates render everywhere else in this app)
// right next to a field whose native widget may render MM/DD/YYYY.
export function formatDateInputPreview(value: string | null | undefined): string | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const [, y, mo, d] = m
  return `${d}.${mo}.${y}`
}

// area_sqm/rooms are Postgres `numeric` columns and arrive as fixed-scale
// strings ("85.00", "3.0") -- Intl.NumberFormat with no explicit fraction-
// digit options naturally drops insignificant trailing zeros while still
// showing a real one (85.00 -> "85", 85.50 -> "85.5", 3.0 -> "3"), so this
// is a safe, locale-correct way to display either without a separate
// "is this a whole number" check.
export function formatQuantity(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('he-IL').format(n)
}

export function formatILS(value: number | string | null | undefined) {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}
