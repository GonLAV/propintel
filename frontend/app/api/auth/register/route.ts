import { z } from 'zod'
import { apiError, createRequestContext, jsonResponse, rateLimit, readJSON, sanitizeText } from '@/lib/api-server'
import { signSession } from '@/lib/auth'
import { sessionCookieName, sessionMaxAgeSeconds } from '@/lib/session-config'

const schema = z.object({
  name: z.string().min(2).max(120).transform(sanitizeText),
  email: z.string().email().max(254).transform((value) => sanitizeText(value).toLowerCase()),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const context = createRequestContext(request)
  const limited = rateLimit(context, 'auth:register', { limit: 6, windowMs: 60_000 })
  if (limited) return limited

  const parsed = schema.safeParse(await readJSON(request))
  if (!parsed.success) {
    return apiError(context, 'Invalid registration payload', 400, 'invalid_payload')
  }

  const user = {
    id: `usr_${crypto.randomUUID()}`,
    email: parsed.data.email,
    name: parsed.data.name,
    role: 'owner' as const,
  }

  const token = await signSession(user)
  const response = jsonResponse(context, { user }, { status: 201 })
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: sessionMaxAgeSeconds,
    path: '/',
  })
  return response
}
