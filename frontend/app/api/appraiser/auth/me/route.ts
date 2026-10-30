import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  backendFetch, refreshAccessToken, setAuthCookies,
  APPRAISER_TOKEN_COOKIE, APPRAISER_REFRESH_COOKIE,
} from '@/lib/appraiser-backend'

// Same 401-then-silent-refresh retry as the generic proxy route. Without
// it, a merely-expired (but cookie-present) access token here just read as
// "not logged in" and silently bounced the properties list to /login even
// though the refresh-token cookie sitting right there was still good for
// days -- the same underlying gap the proxy route already handled, just
// never ported to this separate route (found live, not by inspection).
export async function GET() {
  const jar = await cookies()
  const token = jar.get(APPRAISER_TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ user: null }, { status: 200 })

  let res = await backendFetch('/api/v1/auth/me', {
    headers: { authorization: `Bearer ${token}` },
  })

  let refreshed: { accessToken: string; refreshToken: string } | null = null
  if (res.status === 401) {
    const refreshToken = jar.get(APPRAISER_REFRESH_COOKIE)?.value
    refreshed = refreshToken ? await refreshAccessToken(refreshToken) : null
    if (refreshed) {
      res = await backendFetch('/api/v1/auth/me', {
        headers: { authorization: `Bearer ${refreshed.accessToken}` },
      })
    }
  }

  if (!res.ok) return NextResponse.json({ user: null }, { status: 200 })
  const data = await res.json().catch(() => ({}))
  const response = NextResponse.json({ user: data.user, tenant: data.tenant })
  if (refreshed) setAuthCookies(response.cookies, refreshed)
  return response
}
