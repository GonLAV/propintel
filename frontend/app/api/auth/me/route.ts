import { apiError, createRequestContext, jsonResponse } from '@/lib/api-server'
import { authenticateRequest } from '@/lib/auth'

export async function GET(request: Request) {
  const context = createRequestContext(request)
  const user = await authenticateRequest(request)
  return user
    ? jsonResponse(context, { user })
    : apiError(context, 'Not authenticated', 401, 'not_authenticated')
}
