import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  backendFetch, refreshAccessToken, setAuthCookies, clearAuthCookies,
  APPRAISER_TOKEN_COOKIE, APPRAISER_REFRESH_COOKIE,
} from '@/lib/appraiser-backend'

// Generic authenticated proxy: browser -> this route (same-origin, cookie
// auth) -> real saas-backend (Bearer token). Keeps the backend token out of
// client-side JS entirely and sidesteps CORS — the Next.js server talks to
// the backend directly, the browser only ever talks to Next.js.
//
// The access token is short-lived (15m). On a 401 here (expired, not just
// missing), try a silent refresh with the refresh-token cookie and retry
// the request once before giving up -- previously a session simply died
// after 15m with no recovery, mid-form, with only a raw English error.
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const jar = await cookies()
  const token = jar.get(APPRAISER_TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ error: { message: 'לא מחובר/ת' } }, { status: 401 })

  const { path } = await params
  const url = new URL(request.url)
  const target = `/api/v1/${path.join('/')}${url.search}`

  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(request.method)
  const body = hasBody ? await request.text() : undefined

  let res = await backendFetch(target, {
    method: request.method,
    headers: { authorization: `Bearer ${token}` },
    body,
  })

  let refreshed: { accessToken: string; refreshToken: string } | null = null
  if (res.status === 401) {
    const refreshToken = jar.get(APPRAISER_REFRESH_COOKIE)?.value
    refreshed = refreshToken ? await refreshAccessToken(refreshToken) : null
    if (refreshed) {
      res = await backendFetch(target, {
        method: request.method,
        headers: { authorization: `Bearer ${refreshed.accessToken}` },
        body,
      })
    }
  }

  if (res.status === 204) {
    const response = new NextResponse(null, { status: 204 })
    if (refreshed) setAuthCookies(response.cookies, refreshed)
    return response
  }

  const data = await res.json().catch(() => ({}))
  // Access token invalid/expired and no silent refresh rescued it --
  // either there was no refresh-token cookie at all (a session from before
  // this existed) or redeeming it also failed. Either way the original 401
  // would otherwise surface the backend's raw English "Invalid or expired
  // token". Replace it with a clear instruction and drop any cookies so
  // the next page load shows a clean logged-out state instead of a stuck
  // invalid one.
  if (res.status === 401 && !refreshed) {
    const response = NextResponse.json(
      { error: { message: 'החיבור פג תוקף — יש להתחבר מחדש' } },
      { status: 401 },
    )
    clearAuthCookies(response.cookies)
    return response
  }

  const response = NextResponse.json(data, { status: res.status })
  if (refreshed) setAuthCookies(response.cookies, refreshed)
  return response
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as DELETE,
}
