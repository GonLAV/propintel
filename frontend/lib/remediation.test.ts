import { afterEach, describe, expect, it, vi } from 'vitest'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { logoutSession } from '@/lib/api-client'
import { buildDemoPortfolioMemo } from '@/lib/demo-export'
import { getPathWithSearch, getSafeInternalPath, isDashboardNavActive } from '@/lib/navigation'
import { getPublicAppUrl } from '@/lib/public-url'
import { defaultWorkspaceSettings, loadWorkspaceSettings, saveWorkspaceSettings, workspaceSettingsStorageKey } from '@/lib/workspace-settings'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('remediation helpers', () => {
  it('preserves pathname, query, and safe fragments in login return paths', () => {
    expect(getPathWithSearch('/dashboard/planning', '?tab=rights&plan=415')).toBe('/dashboard/planning?tab=rights&plan=415')
    expect(getSafeInternalPath('/dashboard?tab=rights#reports', 'https://app.example.test')).toBe('/dashboard?tab=rights#reports')
    expect(getSafeInternalPath('https://evil.example/path', 'https://app.example.test')).toBe('/dashboard')
    expect(getSafeInternalPath('//evil.example/path', 'https://app.example.test')).toBe('/dashboard')
  })

  it('tracks fragment navigation separately from the dashboard overview', () => {
    expect(isDashboardNavActive('/dashboard', '/dashboard', '')).toBe(true)
    expect(isDashboardNavActive('/dashboard', '/dashboard', '#assets')).toBe(false)
    expect(isDashboardNavActive('/dashboard#assets', '/dashboard', '#assets')).toBe(true)
    expect(isDashboardNavActive('/dashboard#reports', '/dashboard', '#assets')).toBe(false)
  })

  it('retains the session when logout returns a non-success response', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      error: { message: 'Logout service unavailable', requestId: 'req-1' },
    }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'x-request-id': 'req-1' },
    })) as unknown as typeof fetch

    await expect(logoutSession(fetcher)).resolves.toEqual({
      ok: false,
      error: 'Logout service unavailable',
      requestId: 'req-1',
    })
  })

  it('loads, normalizes, and persists standalone workspace settings', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    }

    expect(loadWorkspaceSettings(storage)).toEqual(defaultWorkspaceSettings)
    const saved = saveWorkspaceSettings(storage, {
      company: '  Example\u0000 Company  ',
      criticalValuationAlerts: false,
    })

    expect(saved).toEqual({ company: 'Example Company', criticalValuationAlerts: false })
    expect(JSON.parse(values.get(workspaceSettingsStorageKey) || '')).toEqual(saved)
    expect(loadWorkspaceSettings(storage)).toEqual(saved)
  })

  it('never emits a localhost public URL in production', () => {
    expect(getPublicAppUrl({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' })).toBeNull()
    expect(getPublicAppUrl({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: undefined })).toBeNull()
    expect(getPublicAppUrl({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://propintel.example/' })?.toString()).toBe('https://propintel.example/')
  })

  it('omits disabled registration and fails closed when production metadata URL is missing', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')

    expect(sitemap()).toEqual([])
    expect(robots()).toMatchObject({
      rules: [{ userAgent: '*', disallow: '/' }],
    })

    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://propintel.example')
    expect(sitemap().map((entry) => entry.url)).toEqual([
      'https://propintel.example/',
      'https://propintel.example/login',
    ])
    expect(JSON.stringify(robots())).not.toContain('localhost')
    expect(JSON.stringify(sitemap())).not.toContain('/register')
  })

  it('marks exported portfolio content as demo data', () => {
    const memo = buildDemoPortfolioMemo([
      { asset: 'Fixture A', city: 'Tel Aviv', value: '$1M', confidence: '90%', status: 'Ready' },
    ], new Date('2026-10-14T12:00:00.000Z'))

    expect(memo).toContain('DEMO DATA')
    expect(memo).toContain('illustrative fixtures only')
    expect(memo).toContain('Fixture A')
  })
})
