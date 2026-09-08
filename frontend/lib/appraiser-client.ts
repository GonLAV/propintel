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

export function formatILS(value: number | string | null | undefined) {
  if (value === null || value === undefined) return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n)
}
