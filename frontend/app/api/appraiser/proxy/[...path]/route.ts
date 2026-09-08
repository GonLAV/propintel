import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { backendFetch, APPRAISER_TOKEN_COOKIE } from '@/lib/appraiser-backend'

// Generic authenticated proxy: browser -> this route (same-origin, cookie
// auth) -> real saas-backend (Bearer token). Keeps the backend token out of
// client-side JS entirely and sidesteps CORS — the Next.js server talks to
// the backend directly, the browser only ever talks to Next.js.
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const token = (await cookies()).get(APPRAISER_TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ error: { message: 'לא מחובר/ת' } }, { status: 401 })

  const { path } = await params
  const url = new URL(request.url)
  const target = `/api/v1/${path.join('/')}${url.search}`

  const hasBody = !['GET', 'HEAD', 'DELETE'].includes(request.method)
  const body = hasBody ? await request.text() : undefined

  const res = await backendFetch(target, {
    method: request.method,
    headers: { authorization: `Bearer ${token}` },
    body,
  })

  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as DELETE,
}
