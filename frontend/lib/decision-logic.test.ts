import { describe, expect, it } from 'vitest'
import { generateCapitalCovenantRadar } from '@/lib/capital-covenant'
import { createDecisionAuditEvent } from '@/lib/decision-audit'
import { loadDecisionRiskConfig } from '@/lib/decision-config'
import { generatePermitPulse, summarizePermitPulse, type PermitPulseInput } from '@/lib/permit-pulse'
import { generateReviewDefensePack } from '@/lib/review-defense'
import { summarizeScenarioShockMatrix } from '@/lib/scenario-shock'

const rows: PermitPulseInput[] = [
  { asset: 'Rothschild 18', city: 'Tel Aviv', value: '$2.84M', confidence: '94%', status: 'Ready' },
  { asset: 'Sderot HaNassi 7', city: 'Haifa', value: '$1.18M', confidence: '86%', status: 'Draft' },
]

describe('PropIntel decision engines', () => {
  it('creates bounded planning-risk signals and a useful summary', () => {
    const signals = generatePermitPulse(rows)
    const summary = summarizePermitPulse(signals)

    expect(signals).toHaveLength(2)
    expect(signals[0].riskScore).toBeGreaterThanOrEqual(18)
    expect(signals[0].riskScore).toBeLessThanOrEqual(94)
    expect(signals[0].deadlineWindow).toBe('21 days')
    expect(summary.averageRisk).toBeGreaterThan(0)
    expect(summary.headline).toContain('planning control')
  })

  it('links covenant pressure to financing posture', () => {
    const signals = generateCapitalCovenantRadar(rows)

    expect(signals[0].ltvHeadroom).toMatch(/%$/)
    expect(signals[0].dscrBuffer).toMatch(/x$/)
    expect(['greenlight', 'tighten', 'renegotiate']).toContain(signals[1].lenderPosture)
  })

  it('stress-tests multiple downside scenarios', () => {
    const summary = summarizeScenarioShockMatrix(rows)

    expect(summary.scenarioCount).toBe(3)
    expect(summary.highestBreak?.breakScore).toBeGreaterThan(0)
    expect(summary.matrix[0].results[0].equityBuffer).toMatch(/%$/)
  })

  it('handles empty portfolios without invalid summaries', () => {
    const permit = summarizePermitPulse(generatePermitPulse([]))
    const shock = summarizeScenarioShockMatrix([])

    expect(permit.averageRisk).toBe(0)
    expect(permit.highestRisk).toBeUndefined()
    expect(shock.averageBreakScore).toBe(0)
    expect(shock.highestBreak).toBeUndefined()
    expect(shock.matrix.every((entry) => entry.results.length === 0)).toBe(true)
  })

  it('creates review-defense gates from risk coverage', () => {
    const signals = generateReviewDefensePack(rows)

    expect(signals[0].reviewerQuestions.length).toBeGreaterThan(0)
    expect(signals[1].missingProof).toContain('final reviewer sign-off')
    expect(signals[1].exportGate).toContain(signals[1].asset)
  })

  it('sanitizes malformed inputs and never emits invalid scores', () => {
    const unsafeRows: PermitPulseInput[] = [
      { asset: '<script>alert(1)</script>', city: '', value: 'not-money', confidence: '999%', status: 'Unknown' },
    ]

    const permit = generatePermitPulse(unsafeRows)[0]
    const covenant = generateCapitalCovenantRadar(unsafeRows)[0]
    const defense = generateReviewDefensePack(unsafeRows)[0]

    expect(permit.asset).not.toContain('<')
    expect(permit.city).toBe('Unknown city')
    expect(permit.riskScore).toBeGreaterThanOrEqual(18)
    expect(permit.riskScore).toBeLessThanOrEqual(94)
    expect(covenant.covenantScore).toBeGreaterThanOrEqual(12)
    expect(defense.defenseScore).toBeGreaterThanOrEqual(8)
    expect(defense.missingProof).toContain('final reviewer sign-off')
  })

  it('loads bounded decision thresholds from environment config', () => {
    const config = loadDecisionRiskConfig({
      NEXT_PUBLIC_DECISION_MODEL_VERSION: '<v-test>',
      NEXT_PUBLIC_DECISION_AUDIT_LOGS: 'true',
      NEXT_PUBLIC_PERMIT_ACCELERATE_SCORE: '150',
      NEXT_PUBLIC_PERMIT_WATCH_SCORE: '-20',
      NEXT_PUBLIC_COVENANT_RENEGOTIATE_SCORE: 'not-a-number',
    })

    expect(config.modelVersion).toBe('v-test')
    expect(config.enableDecisionAuditLogs).toBe(true)
    expect(config.permitAccelerateScore).toBe(100)
    expect(config.permitWatchScore).toBe(0)
    expect(config.covenantRenegotiateScore).toBe(62)
  })

  it('creates privacy-safe audit events without asset names or values', () => {
    const event = createDecisionAuditEvent('review-defense', 2, 2)
    const clampedEvent = createDecisionAuditEvent('permit-pulse', -1, 200000)
    const serialized = JSON.stringify(event)

    expect(event.module).toBe('review-defense')
    expect(event.inputCount).toBe(2)
    expect(event.outputCount).toBe(2)
    expect(clampedEvent.inputCount).toBe(0)
    expect(clampedEvent.outputCount).toBe(100000)
    expect(serialized).not.toContain('Rothschild')
    expect(serialized).not.toContain('$')
  })
})