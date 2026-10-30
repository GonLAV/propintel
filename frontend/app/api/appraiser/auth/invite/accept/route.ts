import { NextResponse } from 'next/server'
import { backendFetch, setAuthCookies } from '@/lib/appraiser-backend'
import { translateAuthError } from '@/lib/i18n-errors'

// Public: the invitee has no session yet. Same shape as register's route --
// on success, logs them straight in (sets auth cookies) rather than
// bouncing them to a separate login step.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })

  const res = await backendFetch('/api/v1/auth/invite/accept', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.error?.message
    return NextResponse.json({ error: message ? translateAuthError(message) : 'קבלת ההזמנה נכשלה' }, { status: res.status })
  }

  const response = NextResponse.json({ user: data.user, tenant: data.tenant })
  setAuthCookies(response.cookies, { accessToken: data.accessToken, refreshToken: data.refreshToken })
  return response
}
