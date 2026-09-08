import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { backendFetch, APPRAISER_TOKEN_COOKIE } from '@/lib/appraiser-backend'

export async function GET() {
  const token = (await cookies()).get(APPRAISER_TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ user: null }, { status: 200 })

  const res = await backendFetch('/api/v1/auth/me', {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) return NextResponse.json({ user: null }, { status: 200 })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json({ user: data.user, tenant: data.tenant })
}
