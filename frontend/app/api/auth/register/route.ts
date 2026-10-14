import { apiError, createRequestContext } from '@/lib/api-server'

export async function POST(request: Request) {
  const context = createRequestContext(request)
  return apiError(context, 'Public registration is disabled', 404, 'registration_disabled')
}
