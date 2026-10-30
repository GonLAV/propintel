import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/appraiser-backend'
import { translateAuthError } from '@/lib/i18n-errors'

// Public preview for the accept-invite page -- no cookies involved, this
// runs before the invitee has any session at all.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const res = await backendFetch(`/api/v1/auth/invite/${encodeURIComponent(token)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.error?.message
    return NextResponse.json({ error: message ? translateAuthError(message) : 'קישור ההזמנה אינו תקין' }, { status: res.status })
  }
  return NextResponse.json(data)
}
