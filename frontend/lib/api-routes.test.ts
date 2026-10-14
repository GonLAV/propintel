import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as comparePlanning } from '@/app/api/planning/compare/route'
import { POST as buildPlanningMemo } from '@/app/api/planning/memo/route'
import { POST as analyzeDealTwin } from '@/app/api/intelligence/deal-twin/route'
import { createRequestContext } from '@/lib/api-server'
import { signSession, type SessionUser } from '@/lib/auth'
import { sessionCookieName } from '@/lib/session-config'

const configuredUser: SessionUser = {
  id: 'owner-test',
  email: 'owner@example.com',
  name: 'Owner Test',
  role: 'owner',
}

const planningBody = {
  previousPlan: 'לה/במ/18/1000/א',
  newPlan: '415-0792036',
}

const dealTwinBody = {
  assetName: 'Demo asset',
  city: 'Tel Aviv',
  mode: 'acquire' as const,
  askingPrice: 2_800_000,
  estimatedValue: 3_100_000,
  annualRent: 140_000,
  capex: 250_000,
  planningUpsideSqm: 120,
  riskScore: 35,
  confidence: 90,
  debtRatio: 55,
  exitCapRate: 5.2,
}

describe('authenticated decision API routes', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret-that-is-longer-than-thirty-two-characters')
    vi.stubEnv('AUTH_OWNER_ID', configuredUser.id)
    vi.stubEnv('AUTH_OWNER_EMAIL', configuredUser.email)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['planning compare', comparePlanning, planningBody],
    ['planning memo', buildPlanningMemo, planningBody],
    ['deal twin', analyzeDealTwin, dealTwinBody],
  ])('returns 401 for unauthenticated %s requests', async (_name, handler, body) => {
    const response = await handler(jsonRequest('https://app.example.test/api/test', body))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'not_authenticated' },
    })
  })

  it.each([
    ['planning compare', comparePlanning, planningBody],
    ['planning memo', buildPlanningMemo, planningBody],
    ['deal twin', analyzeDealTwin, dealTwinBody],
  ])('returns success for an authenticated %s request', async (_name, handler, body) => {
    const token = await signSession(configuredUser)
    const response = await handler(jsonRequest('https://app.example.test/api/test', body, token))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(expect.any(Object))
  })

  it('rejects a signed session whose principal no longer matches configuration', async () => {
    const token = await signSession({ ...configuredUser, id: 'former-owner' })
    const response = await comparePlanning(jsonRequest('https://app.example.test/api/planning/compare', planningBody, token))
    expect(response.status).toBe(401)
  })

  it('authenticates before consuming an authenticated principal rate-limit budget', async () => {
    const unauthenticatedResponses = await Promise.all(
      Array.from({ length: 31 }, () => (
        comparePlanning(jsonRequest('https://app.example.test/api/planning/compare', planningBody))
      )),
    )
    expect(unauthenticatedResponses.every((response) => response.status === 401)).toBe(true)

    const token = await signSession(configuredUser)
    const authenticatedResponse = await comparePlanning(
      jsonRequest('https://app.example.test/api/planning/compare', planningBody, token),
    )
    expect(authenticatedResponse.status).toBe(200)
  })

  it('ignores forwarding headers unless trusted-proxy handling is explicitly enabled', () => {
    const request = new Request('https://app.example.test/api/test', {
      headers: {
        'x-forwarded-for': '198.51.100.8',
        'x-real-ip': '198.51.100.9',
      },
    })

    expect(createRequestContext(request).ipAddress).toBe('untrusted-client')
    vi.stubEnv('TRUST_PROXY_HEADERS', 'true')
    expect(createRequestContext(request).ipAddress).toBe('198.51.100.8')
  })
})

function jsonRequest(url: string, body: unknown, token?: string) {
  const headers = new Headers({
    'content-type': 'application/json',
    'x-forwarded-for': `test-${crypto.randomUUID()}`,
  })
  if (token) headers.set('cookie', `${sessionCookieName}=${encodeURIComponent(token)}`)

  return new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}
