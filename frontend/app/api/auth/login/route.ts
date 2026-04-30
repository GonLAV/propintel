import { z } from 'zod'
import { apiError, createRequestContext, jsonResponse, rateLimit, readJSON, sanitizeText } from '@/lib/api-server'
import { signSession } from '@/lib/auth'
import { sessionCookieName, sessionMaxAgeSeconds } from '@/lib/session-config'

const schema = z.object({
  email: z.string().email().max(254).transform((value) => sanitizeText(value).toLowerCase()),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const context = createRequestContext(request)
  const limited = rateLimit(context, 'auth:login', { limit: 10, windowMs: 60_000 })
  if (limited) return limited

  const parsed = schema.safeParse(await readJSON(request))
  if (!parsed.success) {
    return apiError(context, 'Invalid login payload', 400, 'invalid_payload')
  }

  const { email, password } = parsed.data
  if (email !== 'demo@propintel.com' || password !== 'DemoPass123') {
    return apiError(context, 'Invalid demo credentials', 401, 'invalid_credentials')
  }

  const user = { id: 'usr_demo_owner', email, name: 'Maya Levin', role: 'owner' as const }
  const token = await signSession(user)
  const response = jsonResponse(context, { user })
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: sessionMaxAgeSeconds,
    path: '/',
  })
  return response
}
