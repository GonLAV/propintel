// Thin server-side bridge to the real saas-backend API for the Hebrew/RTL
// appraiser experience (app/appraiser/*). Deliberately separate from
// lib/api-server.ts / lib/auth.ts, which back the existing English demo
// dashboard (hardcoded single demo user, no real backend behind it).
//
// MVP simplification, flagged here on purpose: the backend access token is
// stored in a plain (not httpOnly-alternative-hardened) httpOnly cookie and
// forwarded as a Bearer token by the proxy route below. That's fine for an
// internal MVP — consider moving the token entirely server-side before real
// production traffic. Refresh-token rotation IS wired up (see
// refreshAccessToken below and the proxy route) -- a session no longer just
// dies after 15m while the refresh token (7d) is still good.

// 2026-10-28: was defaulting to :3001, which has never matched saas-backend's
// actual default (PORT=3000 in saas-backend/.env.example, Dockerfile, and
// docker-compose.yml) -- combined with this app's own dev/start scripts also
// binding to :3000, running the real full stack locally meant the frontend's
// own server and the backend it proxies to fought over the same port. Fixed
// both here (correct fallback) and in package.json (frontend moved to :3002).
export const BACKEND_URL = process.env.APPRAISER_API_URL || 'http://localhost:3000'
export const APPRAISER_TOKEN_COOKIE = 'appraiser_token'
export const APPRAISER_REFRESH_COOKIE = 'appraiser_refresh'

const ACCESS_TOKEN_MAX_AGE = 60 * 15 // matches saas-backend JWT_ACCESS_TTL default (15m)
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7 // matches JWT_REFRESH_TTL default (7d)

export async function backendFetch(path: string, init?: RequestInit) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}

function cookieBase() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

// NextResponse['cookies'] -- both route handlers below pass theirs in.
type CookieJar = { set: (name: string, value: string, opts: Record<string, unknown>) => void; delete: (name: string) => void }

export function setAuthCookies(jar: CookieJar, tokens: { accessToken: string; refreshToken: string }) {
  jar.set(APPRAISER_TOKEN_COOKIE, tokens.accessToken, { ...cookieBase(), maxAge: ACCESS_TOKEN_MAX_AGE })
  jar.set(APPRAISER_REFRESH_COOKIE, tokens.refreshToken, { ...cookieBase(), maxAge: REFRESH_TOKEN_MAX_AGE })
}

export function clearAuthCookies(jar: CookieJar) {
  jar.delete(APPRAISER_TOKEN_COOKIE)
  jar.delete(APPRAISER_REFRESH_COOKIE)
}

// Single-flight de-dup: saas-backend rotates the refresh token on every use
// and revokes the whole token family if an already-rotated-away token is
// reused (theft detection). Without this, two API calls that both hit a
// 401 at the same moment (e.g. two panels loading together right as the
// access token expires) would both try to redeem the same refresh token --
// the second call would look exactly like token reuse and log the user out
// entirely. Module-level state is safely shared across concurrent requests
// in one Node process (this is a single-instance deployment today).
let inFlightRefresh: Promise<{ accessToken: string; refreshToken: string } | null> | null = null

export async function refreshAccessToken(refreshToken: string) {
  if (!inFlightRefresh) {
    inFlightRefresh = doRefresh(refreshToken).finally(() => { inFlightRefresh = null })
  }
  return inFlightRefresh
}

async function doRefresh(refreshToken: string) {
  const res = await backendFetch('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  if (!data?.accessToken || !data?.refreshToken) return null
  return { accessToken: data.accessToken as string, refreshToken: data.refreshToken as string }
}
