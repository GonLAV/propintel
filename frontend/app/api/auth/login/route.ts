import { timingSafeEqual } from 'node:crypto'
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
  const configuredEmail = sanitizeText(process.env.AUTH_OWNER_EMAIL || '').toLowerCase()
  const configuredPassword = process.env.AUTH_OWNER_PASSWORD || ''
  const configuredId = sanitizeText(process.env.AUTH_OWNER_ID || '')
  const configuredName = sanitizeText(process.env.AUTH_OWNER_NAME || 'PropIntel Owner')

  if (!configuredEmail || configuredPassword.length < 12 || !configuredId) {
    return apiError(context, 'Authentication is not configured', 503, 'auth_not_configured')
  }

  if (email !== configuredEmail || !secureEqual(password, configuredPassword)) {
    return apiError(context, 'Invalid credentials', 401, 'invalid_credentials')
  }

  const user = {
    id: configuredId,
    email: configuredEmail,
    name: configuredName,
    role: 'owner' as const,
  }
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

function secureEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}
