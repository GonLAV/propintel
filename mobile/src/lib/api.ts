import * as SecureStore from 'expo-secure-store'

const tokenKey = 'dirashield.accessToken'
const requestTimeoutMs = 15000

export type ApiEnvelope<T> = {
  data?: T
  error?: { code: string; message: string; requestId?: string }
}

export async function setAccessToken(token: string) {
  await SecureStore.setItemAsync(tokenKey, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
}

export async function clearAccessToken() {
  await SecureStore.deleteItemAsync(tokenKey)
}

export async function apiRequest<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = await SecureStore.getItemAsync(tokenKey)
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body) headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}${normalizePath(path)}`, { ...init, headers, signal: controller.signal })
    const requestId = response.headers.get('x-request-id') || undefined
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        error: payload?.error || { code: 'REQUEST_FAILED', message: response.statusText || 'Request failed', requestId },
      }
    }

    return { data: payload as T }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return { error: { code: aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR', message: aborted ? 'Request timed out' : 'Network request failed' } }
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function normalizePath(value: string) {
  return value.startsWith('/') ? value : `/${value}`
}