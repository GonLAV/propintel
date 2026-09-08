import { NextResponse } from 'next/server'

export type ApiRequestContext = {
  requestId: string
  ipAddress: string
}

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()
const defaultMaxJSONBytes = 64 * 1024

export function createRequestContext(request: Request): ApiRequestContext {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = request.headers.get('x-real-ip')?.trim()

  return {
    requestId: request.headers.get('x-request-id') || crypto.randomUUID(),
    ipAddress: forwardedFor || realIp || 'local',
  }
}

export async function readJSON(request: Request, maxBytes = defaultMaxJSONBytes) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) return null

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > maxBytes) return null

  const text = await request.text().catch(() => '')
  if (!text || new TextEncoder().encode(text).length > maxBytes) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export function sanitizeText(value: string) {
  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join('')
    .trim()
}

export function jsonResponse<T>(context: ApiRequestContext, data: T, init?: ResponseInit) {
  const response = NextResponse.json(data, init)
  applyApiHeaders(response, context)
  return response
}

export function apiError(context: ApiRequestContext, message: string, status = 500, code = 'api_error') {
  return jsonResponse(
    context,
    {
      error: {
        code,
        message,
        requestId: context.requestId,
      },
    },
    { status },
  )
}

export function rateLimit(context: ApiRequestContext, scope: string, options: RateLimitOptions) {
  const now = Date.now()
  pruneExpiredBuckets(now)

  const key = `${scope}:${context.ipAddress}`
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return null
  }

  if (bucket.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    const response = apiError(context, 'Too many requests. Please retry shortly.', 429, 'rate_limited')
    response.headers.set('retry-after', String(retryAfter))
    return response
  }

  bucket.count += 1
  return null
}

function applyApiHeaders(response: NextResponse, context: ApiRequestContext) {
  response.headers.set('x-request-id', context.requestId)
  response.headers.set('cache-control', 'no-store')
  response.headers.set('x-content-type-options', 'nosniff')
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 500) return

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}
