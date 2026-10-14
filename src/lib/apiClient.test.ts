import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAPIClient } from '@/lib/apiClient'
import { getMvpApiBaseUrl } from '@/lib/runtimeConfig'

describe('MVP API client authentication boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the same-origin proxy and sends no browser authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ count: 0, runs: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    expect(getMvpApiBaseUrl()).toBe('/mvp-api')
    await createAPIClient().listIngestionRunsV1()

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/mvp-api/api/v1/ingestion/runs')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('surfaces a missing server proxy configuration error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        error: {
          code: 'MVP_API_PROXY_NOT_CONFIGURED',
          message: 'MVP API proxy is not configured.',
        },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )))

    await expect(createAPIClient().listIngestionRunsV1()).rejects.toMatchObject({
      name: 'APIClientError',
      status: 503,
      code: 'MVP_API_PROXY_NOT_CONFIGURED',
      message: 'MVP API proxy is not configured.',
    })
  })
})
