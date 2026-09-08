import { cookies } from 'next/headers'
import { apiError, createRequestContext, jsonResponse } from '@/lib/api-server'
import { verifySession } from '@/lib/auth'
import { sessionCookieName } from '@/lib/session-config'

export async function GET(request: Request) {
  const context = createRequestContext(request)
  const token = (await cookies()).get(sessionCookieName)?.value
  if (!token) {
    return apiError(context, 'Not authenticated', 401, 'not_authenticated')
  }

  try {
    const user = await verifySession(token)
    return jsonResponse(context, { user })
  } catch {
    return apiError(context, 'Invalid session', 401, 'invalid_session')
  }
}
