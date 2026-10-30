import { describe, expect, it, vi } from 'vitest'
import { setAuthCookies } from '@/lib/appraiser-backend'

describe('setAuthCookies', () => {
  it('gives the access-token cookie the same lifetime as the refresh-token cookie, not the short JWT TTL', () => {
    // Regression: the access cookie used to expire at exactly the JWT's own
    // 15-minute TTL, so the browser deleted the cookie itself the moment
    // the JWT expired -- no request carrying it was ever sent again, so
    // the proxy's retry-on-401 silent-refresh logic never got a 401 to
    // react to in ordinary use (only in a crafted-token test, which leaves
    // the cookie's lifetime untouched). Caught by a real ~17-minute wait
    // with untouched cookies, not by code inspection.
    const calls: Array<{ name: string; opts: Record<string, unknown> }> = []
    const jar = {
      set: (name: string, _value: string, opts: Record<string, unknown>) => { calls.push({ name, opts }) },
      delete: vi.fn(),
    }

    setAuthCookies(jar, { accessToken: 'a', refreshToken: 'r' })

    const access = calls.find((c) => c.name === 'appraiser_token')
    const refresh = calls.find((c) => c.name === 'appraiser_refresh')
    expect(access?.opts.maxAge).toBe(refresh?.opts.maxAge)
    expect(Number(access?.opts.maxAge)).toBeGreaterThan(60 * 15)
  })
})
