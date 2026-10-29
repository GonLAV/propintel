import { NextResponse } from 'next/server'
import { backendFetch, APPRAISER_TOKEN_COOKIE } from '@/lib/appraiser-backend'
import { translateAuthError } from '@/lib/i18n-errors'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })

  const res = await backendFetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = Array.isArray(data?.error?.details)
      ? data.error.details.map((d: { path: string; message: string }) => `${d.path}: ${d.message}`).join(', ')
      : null
    const message = data?.error?.message
    return NextResponse.json({ error: detail || (message ? translateAuthError(message) : 'ההרשמה נכשלה') }, { status: res.status })
  }

  const response = NextResponse.json({
    user: data.user, tenant: data.tenant, otherTenantsExist: Boolean(data.otherTenantsExist),
  })
  response.cookies.set(APPRAISER_TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 15,
    path: '/',
  })
  return response
}
