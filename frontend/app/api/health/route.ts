import { createRequestContext, jsonResponse } from '@/lib/api-server'

export async function GET(request: Request) {
  const context = createRequestContext(request)

  return jsonResponse(context, {
    status: 'ok',
    service: 'propintel-premium-web',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  })
}
