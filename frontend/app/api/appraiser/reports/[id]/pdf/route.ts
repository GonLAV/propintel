import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { backendFetch, APPRAISER_TOKEN_COOKIE } from '@/lib/appraiser-backend'

// Binary passthrough — the generic proxy route only handles JSON, and a PDF
// response would break `res.json()` there. Same cookie-auth pattern as the
// rest of app/api/appraiser/*.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(APPRAISER_TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'לא מחובר/ת' }, { status: 401 })

  const { id } = await params
  const res = await backendFetch(`/api/v1/reports/${id}/pdf`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return NextResponse.json({ error: data?.error?.message || 'שגיאה בהפקת הדוח' }, { status: res.status })
  }

  const bytes = await res.arrayBuffer()
  return new NextResponse(bytes, {
    headers: {
      'content-type': res.headers.get('content-type') || 'application/pdf',
      'content-disposition': res.headers.get('content-disposition') || 'inline',
    },
  })
}
