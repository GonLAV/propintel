import { NextResponse } from 'next/server'
import { APPRAISER_TOKEN_COOKIE } from '@/lib/appraiser-backend'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(APPRAISER_TOKEN_COOKIE)
  return response
}
