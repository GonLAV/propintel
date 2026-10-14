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
    const verified = await jwtVerify(token, getJwtSecret(), {
      issuer: sessionIssuer,
      audience: sessionAudience,
    })
    const user = verified.payload.user as {
      id?: string
      email?: string
      role?: string
    } | undefined
    const configuredId = process.env.AUTH_OWNER_ID
    const configuredEmail = process.env.AUTH_OWNER_EMAIL?.trim().toLowerCase()

    if (
      !user ||
      !configuredId ||
      !configuredEmail ||
      user.id !== configuredId ||
      user.email?.toLowerCase() !== configuredEmail ||
      user.role !== 'owner'
    ) {
      throw new Error('Session principal is no longer authorized')
    }
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