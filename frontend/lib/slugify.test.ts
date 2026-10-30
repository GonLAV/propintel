import { describe, expect, it } from 'vitest'
import { slugify } from '@/lib/slugify'

describe('slugify', () => {
  it('keeps a normal ASCII-ish name as-is', () => {
    expect(slugify('Acme Appraisals')).toBe('acme-appraisals')
  })

  it('falls back to a random id for a purely Hebrew name (empty ascii result)', () => {
    const result = slugify('משרד שמאות ישראלי')
    expect(result).toMatch(/^office-[a-z0-9]+$/)
  })

  it('falls back to a random id when the ascii remainder is too short for the backend (min 2 chars), not just when empty', () => {
    // Regression: "משרד אימות 2" (a realistic Hebrew office name with a
    // trailing branch number) used to slugify to the single leftover
    // digit "2" -- non-empty, so the naive `ascii || fallback` check let
    // it through, but still below the backend's tenantSlug.min(2),
    // failing registration with a validation error (found live).
    const result = slugify('משרד אימות 2')
    expect(result).not.toBe('2')
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result).toMatch(/^office-[a-z0-9]+$/)
  })

  it('keeps a two-character-or-longer ascii remainder (does not over-fallback)', () => {
    expect(slugify('משרד 22')).toBe('22')
  })
})
