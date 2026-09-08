import { NextResponse } from 'next/server'
import { backendFetch, APPRAISER_TOKEN_COOKIE } from '@/lib/appraiser-backend'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })

  const res = await backendFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error?.message || 'התחברות נכשלה' }, { status: res.status })
  }

  const response = NextResponse.json({ user: data.user })
  response.cookies.set(APPRAISER_TOKEN_COOKIE, data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 15,
    path: '/',
  })
  return response
}
