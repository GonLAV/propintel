import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getJwtSecret, sessionAudience, sessionCookieName, sessionIssuer } from '@/lib/session-config'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value

  if (!token) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }

  try {
    await jwtVerify(token, getJwtSecret(), {
      issuer: sessionIssuer,
      audience: sessionAudience,
    })
    return NextResponse.next()
  } catch {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', request.nextUrl.pathname)
    const response = NextResponse.redirect(login)
    response.cookies.set(sessionCookieName, '', { maxAge: 0, path: '/' })
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}