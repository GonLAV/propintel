import { SignJWT, jwtVerify } from 'jose'
import { getJwtSecret, sessionAudience, sessionCookieName, sessionIssuer } from '@/lib/session-config'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .setIssuer(sessionIssuer)
    .setAudience(sessionAudience)
    .sign(getJwtSecret())
}

export async function verifySession(token: string) {
  const verified = await jwtVerify(token, getJwtSecret(), {
    issuer: sessionIssuer,
    audience: sessionAudience,
  })

  const user = verified.payload.user
  if (!isSessionUser(user)) {
    throw new Error('Session payload is invalid')
  }

  return user
}

export async function verifyConfiguredSession(token: string) {
  const user = await verifySession(token)
  const configuredId = process.env.AUTH_OWNER_ID?.trim()
  const configuredEmail = process.env.AUTH_OWNER_EMAIL?.trim().toLowerCase()

  if (
    !configuredId ||
    !configuredEmail ||
    user.id !== configuredId ||
    user.email.toLowerCase() !== configuredEmail ||
    user.role !== 'owner'
  ) {
    throw new Error('Session principal is no longer authorized')
  }

  return user
}

export async function authenticateRequest(request: Request) {
  const token = getCookieValue(request.headers.get('cookie'), sessionCookieName)
  if (!token) return null

  try {
    return await verifyConfiguredSession(token)
  } catch {
    return null
  }
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    const key = part.slice(0, separator).trim()
    if (key !== name) continue

    const value = part.slice(separator + 1).trim()
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  return null
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    ['owner', 'admin', 'member', 'viewer'].includes(String(user.role))
  )
}
