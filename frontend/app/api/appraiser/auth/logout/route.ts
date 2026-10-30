import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { backendFetch, clearAuthCookies, APPRAISER_TOKEN_COOKIE, APPRAISER_REFRESH_COOKIE } from '@/lib/appraiser-backend'

export async function POST() {
  const jar = await cookies()
  const accessToken = jar.get(APPRAISER_TOKEN_COOKIE)?.value
  const refreshToken = jar.get(APPRAISER_REFRESH_COOKIE)?.value
  // Best-effort: revoke the refresh token server-side so it can't be reused
  // for the rest of its 7-day life. The local cookies are cleared either
  // way below -- that's what actually ends the session from this browser's
  // perspective, so a failure here (backend down, or the access token
  // already expired -- saas-backend's /auth/logout requires a currently
  // valid one, and this path deliberately doesn't attempt a refresh just
  // to log out) never blocks logout.
  if (accessToken && refreshToken) {
    await backendFetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }

  const response = NextResponse.json({ ok: true })
  clearAuthCookies(response.cookies)
  return response
}
