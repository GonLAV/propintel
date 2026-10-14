import { NextRequest, NextResponse } from 'next/server'
import { verifyConfiguredSession } from '@/lib/auth'
import { getPathWithSearch } from '@/lib/navigation'
import { sessionCookieName } from '@/lib/session-config'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value

  if (!token) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', getPathWithSearch(request.nextUrl.pathname, request.nextUrl.search))
    return NextResponse.redirect(login)
  }

  try {
    await verifyConfiguredSession(token)
    return NextResponse.next()
  } catch {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', getPathWithSearch(request.nextUrl.pathname, request.nextUrl.search))
    const response = NextResponse.redirect(login)
    response.cookies.set(sessionCookieName, '', { maxAge: 0, path: '/' })
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}