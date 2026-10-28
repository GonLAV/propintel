// Thin server-side bridge to the real saas-backend API for the Hebrew/RTL
// appraiser experience (app/appraiser/*). Deliberately separate from
// lib/api-server.ts / lib/auth.ts, which back the existing English demo
// dashboard (hardcoded single demo user, no real backend behind it).
//
// MVP simplification, flagged here on purpose: the backend access token is
// stored in a plain (not httpOnly-alternative-hardened) httpOnly cookie and
// forwarded as a Bearer token by the proxy route below. That's fine for an
// internal MVP — before real production traffic, add refresh-token rotation
// on the frontend side too (today a session just expires after 15m and the
// user re-logs in) and consider moving the token entirely server-side.

// 2026-10-28: was defaulting to :3001, which has never matched saas-backend's
// actual default (PORT=3000 in saas-backend/.env.example, Dockerfile, and
// docker-compose.yml) -- combined with this app's own dev/start scripts also
// binding to :3000, running the real full stack locally meant the frontend's
// own server and the backend it proxies to fought over the same port. Fixed
// both here (correct fallback) and in package.json (frontend moved to :3002).
export const BACKEND_URL = process.env.APPRAISER_API_URL || 'http://localhost:3000'
export const APPRAISER_TOKEN_COOKIE = 'appraiser_token'

export async function backendFetch(path: string, init?: RequestInit) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}
