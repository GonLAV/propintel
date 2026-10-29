import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/appraiser-backend'

// Unauthenticated by design (that's the point of a password-reset flow) --
// does not use the generic proxy route, which requires an existing session
// cookie, same reason login/register bypass it too.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })

  const res = await backendFetch('/api/v1/auth/password/reset/request', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  // Always 202 regardless of backend response shape: the backend itself
  // always returns 202 whether or not the email exists, to prevent account
  // enumeration -- surfacing anything else here would defeat that.
  if (res.status === 202) return NextResponse.json({ ok: true })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json({ error: data?.error?.message || 'שגיאה בשליחת הבקשה' }, { status: res.status })
}
