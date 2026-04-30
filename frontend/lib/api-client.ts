export type ApiResult<T> = {
  ok: boolean
  data?: T
  error?: string
  requestId?: string | null
}

export async function postJSON<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)
    const requestId = response.headers.get('x-request-id')

    if (!response.ok) {
      return { ok: false, error: payload?.error?.message || response.statusText, requestId: payload?.error?.requestId || requestId }
    }

    return { ok: true, data: payload as T, requestId }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}
