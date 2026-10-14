import { describe, expect, it } from 'vitest'
import { isSyntheticGovernmentDemoEnabled } from '@/lib/israelGovAPI'

describe('synthetic government data demo gate', () => {
  it('is disabled unless it is explicitly enabled', () => {
    expect(isSyntheticGovernmentDemoEnabled({})).toBe(false)
    expect(isSyntheticGovernmentDemoEnabled({ VITE_ENABLE_SYNTHETIC_GOV_DEMO: 'false' })).toBe(false)
    expect(isSyntheticGovernmentDemoEnabled({ VITE_ENABLE_SYNTHETIC_GOV_DEMO: 'true' })).toBe(true)
  })
})
