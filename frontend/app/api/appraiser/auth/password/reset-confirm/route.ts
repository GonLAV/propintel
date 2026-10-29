import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/appraiser-backend'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })

  const res = await backendFetch('/api/v1/auth/password/reset/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message || 'איפוס הסיסמה נכשל' }, { status: res.status })
  }
  return NextResponse.json({ ok: true })
}
