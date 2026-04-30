import { createRequestContext, jsonResponse } from '@/lib/api-server'
import { sessionCookieName } from '@/lib/session-config'

export async function POST(request: Request) {
  const context = createRequestContext(request)
  const response = jsonResponse(context, { ok: true })
  response.cookies.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
  return response
}
