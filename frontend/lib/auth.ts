import { SignJWT, jwtVerify } from 'jose'
import { getJwtSecret, sessionAudience, sessionIssuer } from '@/lib/session-config'

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

  return verified.payload.user as SessionUser
}
