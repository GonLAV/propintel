import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { z } from 'zod'

const accessTokenKey = 'dirashield.accessToken'
const refreshTokenKey = 'dirashield.refreshToken'
const sessionKey = 'dirashield.session'
const requestTimeoutMs = 15000

const sessionSchema = z.object({
  phoneE164: z.string().regex(/^\+9725\d{8}$/),
  authenticatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
})

const otpResponseSchema = z.object({
  challengeId: z.string().min(1).optional(),
})

const verifyResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
})

export type AuthSession = z.infer<typeof sessionSchema>

export type ApiEnvelope<T> = {
  data?: T
  error?: { code: string; message: string; requestId?: string }
}

export function getApiBaseUrl() {
  const value = Constants.expoConfig?.extra?.apiBaseUrl
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('כתובת שירות האימות אינה מוגדרת')
  }

  const normalized = value.trim().replace(/\/+$/, '')
  const parsed = new URL(normalized)
  const localDevelopment = __DEV__ && ['localhost', '127.0.0.1', '10.0.2.2'].includes(parsed.hostname)
  if (parsed.protocol !== 'https:' && !localDevelopment) {
    throw new Error('שירות האימות חייב להשתמש בחיבור HTTPS')
  }

  return normalized
}

export function normalizeIsraeliPhone(value: string) {
  const compact = value.replace(/[\s-]/g, '')
  if (/^05\d{8}$/.test(compact)) return `+972${compact.slice(1)}`
  if (/^\+9725\d{8}$/.test(compact)) return compact
  return null
}

export async function requestOtp(phoneE164: string): Promise<ApiEnvelope<{ challengeId?: string }>> {
  const response = await apiRequest<unknown>(getApiBaseUrl(), '/auth/otp/start', {
    method: 'POST',
    body: JSON.stringify({ phoneE164 }),
  }, false)
  if (response.error) return { error: response.error }

  const parsed = otpResponseSchema.safeParse(unwrapData(response.data) ?? {})
  return parsed.success
    ? { data: parsed.data }
    : { error: { code: 'INVALID_RESPONSE', message: 'שירות האימות החזיר תשובה לא תקינה' } }
}

export async function verifyOtp(input: {
  phoneE164: string
  code: string
  challengeId?: string
}): Promise<ApiEnvelope<AuthSession>> {
  const response = await apiRequest<unknown>(getApiBaseUrl(), '/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  }, false)
  if (response.error) return { error: response.error }

  const parsed = verifyResponseSchema.safeParse(unwrapData(response.data))
  if (!parsed.success) {
    return { error: { code: 'INVALID_RESPONSE', message: 'האימות לא הושלם: לא התקבל אסימון גישה תקין' } }
  }

  const session: AuthSession = {
    phoneE164: input.phoneE164,
    authenticatedAt: new Date().toISOString(),
    expiresAt: parsed.data.expiresAt,
  }

  try {
    const writes: Array<Promise<void>> = [
      SecureStore.setItemAsync(accessTokenKey, parsed.data.accessToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
      SecureStore.setItemAsync(sessionKey, JSON.stringify(session), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    ]
    if (parsed.data.refreshToken) {
      writes.push(SecureStore.setItemAsync(refreshTokenKey, parsed.data.refreshToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }))
    }
    await Promise.all(writes)
    return { data: session }
  } catch {
    await clearAuthSession()
    return { error: { code: 'SESSION_STORAGE_FAILED', message: 'האימות הצליח אך לא ניתן היה לשמור את ההתחברות באופן מאובטח' } }
  }
}

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  const [rawSession, token] = await Promise.all([
    SecureStore.getItemAsync(sessionKey),
    SecureStore.getItemAsync(accessTokenKey),
  ])
  if (!rawSession || !token) return null

  let storedValue: unknown
  try {
    storedValue = JSON.parse(rawSession)
  } catch {
    await clearAuthSession()
    return null
  }

  const parsed = sessionSchema.safeParse(storedValue)
  if (!parsed.success || (parsed.data.expiresAt && Date.parse(parsed.data.expiresAt) <= Date.now())) {
    await clearAuthSession()
    return null
  }

  return parsed.data
}

export async function clearAuthSession() {
  const results = await Promise.allSettled([
    SecureStore.deleteItemAsync(accessTokenKey),
    SecureStore.deleteItemAsync(refreshTokenKey),
    SecureStore.deleteItemAsync(sessionKey),
  ])
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error('Could not securely clear the authentication session.')
  }
}

export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body) headers.set('content-type', 'application/json')

  if (authenticated) {
    const token = await SecureStore.getItemAsync(accessTokenKey)
    if (!token) return { error: { code: 'UNAUTHENTICATED', message: 'נדרשת התחברות מחדש' } }
    headers.set('authorization', `Bearer ${token}`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const response = await fetch(`${baseUrl}${normalizePath(path)}`, {
      ...init,
      headers,
      signal: controller.signal,
    })
    const requestId = response.headers.get('x-request-id') || undefined
    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      const serverError = extractServerError(payload)
      return {
        error: serverError || {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'הבקשה נכשלה',
          requestId,
        },
      }
    }

    return { data: payload as T }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return {
      error: {
        code: aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
        message: aborted ? 'תם הזמן שהוקצב לבקשה' : 'לא ניתן להתחבר לשירות. בדקו את החיבור ונסו שוב',
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

function normalizePath(value: string) {
  return value.startsWith('/') ? value : `/${value}`
}

function unwrapData(value: unknown) {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: unknown }).data
  }
  return value
}

function extractServerError(value: unknown) {
  if (!value || typeof value !== 'object' || !('error' in value)) return null
  const parsed = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    requestId: z.string().optional(),
  }).safeParse((value as { error: unknown }).error)
  if (!parsed.success) return null
  return {
    code: parsed.data.code || 'REQUEST_FAILED',
    message: parsed.data.message || 'הבקשה נכשלה',
    requestId: parsed.data.requestId,
  }
}
