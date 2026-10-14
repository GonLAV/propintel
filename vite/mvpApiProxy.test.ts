import { describe, expect, it } from 'vitest'
import {
  createMvpApiProxyOptions,
  resolveMvpApiProxyConfig,
  rewriteMvpApiPath,
} from './mvpApiProxy'

const serviceToken = 'server-only-token-with-at-least-32-chars'

describe('MVP API server proxy', () => {
  it('requires both server-only target and service token settings', () => {
    const config = resolveMvpApiProxyConfig({})

    expect(config.configured).toBe(false)
    expect(config.errorMessage).toContain('MVP_API_TARGET')
    expect(config.errorMessage).toContain('MVP_API_SERVICE_TOKEN')
    expect(createMvpApiProxyOptions(config)).toBeUndefined()
  })

  it('accepts an HTTP target and rewrites the same-origin prefix', () => {
    const config = resolveMvpApiProxyConfig({
      MVP_API_TARGET: 'http://localhost:3001/',
      MVP_API_SERVICE_TOKEN: serviceToken,
    })

    expect(config.configured).toBe(true)
    expect(config.target).toBe('http://localhost:3001')
    expect(rewriteMvpApiPath('/mvp-api/api/v1/ingestion/runs?limit=5'))
      .toBe('/api/v1/ingestion/runs?limit=5')
    expect(rewriteMvpApiPath('/mvp-api')).toBe('/')
    expect(createMvpApiProxyOptions(config)?.target).toBe('http://localhost:3001')
  })

  it('injects the bearer token only in the server-side proxy request', () => {
    const config = resolveMvpApiProxyConfig({
      MVP_API_TARGET: 'http://localhost:3001',
      MVP_API_SERVICE_TOKEN: serviceToken,
    })
    const options = createMvpApiProxyOptions(config)
    let proxyRequestListener: ((request: { setHeader(name: string, value: string): void }) => void) | undefined
    const proxy = {
      on(event: string, listener: typeof proxyRequestListener) {
        if (event === 'proxyReq') proxyRequestListener = listener
      },
    }
    const headers: Record<string, string> = {}

    options?.configure?.(proxy as never, {} as never)
    proxyRequestListener?.({
      setHeader(name, value) {
        headers[name] = value
      },
    })

    expect(headers).toEqual({ Authorization: ['Bearer', serviceToken].join(' ') })
  })

  it('rejects targets with embedded credentials or unsafe protocols', () => {
    expect(resolveMvpApiProxyConfig({
      MVP_API_TARGET: 'http://user:password@localhost:3001',
      MVP_API_SERVICE_TOKEN: serviceToken,
    }).configured).toBe(false)
    expect(resolveMvpApiProxyConfig({
      MVP_API_TARGET: 'file:///root-api',
      MVP_API_SERVICE_TOKEN: serviceToken,
    }).configured).toBe(false)
  })

  it('rejects short or whitespace-containing service tokens', () => {
    expect(resolveMvpApiProxyConfig({
      MVP_API_TARGET: 'http://localhost:3001',
      MVP_API_SERVICE_TOKEN: 'short-token',
    }).configured).toBe(false)
    expect(resolveMvpApiProxyConfig({
      MVP_API_TARGET: 'http://localhost:3001',
      MVP_API_SERVICE_TOKEN: `${serviceToken} with-space`,
    }).configured).toBe(false)
  })
})
