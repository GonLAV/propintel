import { generatePermitPulse, type PermitPulseInput } from '@/lib/permit-pulse'

export type CapitalCovenantSignal = {
  asset: string
  city: string
  covenantScore: number
  ltvHeadroom: string
  dscrBuffer: string
  lenderPosture: 'greenlight' | 'tighten' | 'renegotiate'
  nextMove: string
  triggers: string[]
}

export function generateCapitalCovenantRadar(rows: PermitPulseInput[]): CapitalCovenantSignal[] {
  const permitSignals = generatePermitPulse(rows)

  return rows.map((row, index) => {
    const confidence = parsePercent(row.confidence)
    const value = parseCurrencyMillions(row.value)
    const permitRisk = permitSignals[index]?.riskScore || 40
    const exposureLoad = value > 5 ? 13 : value > 2 ? 8 : 4
    const statusLoad = row.status === 'Draft' ? 14 : row.status === 'Review' ? 9 : 3
    const covenantScore = clamp(Math.round(permitRisk * 0.48 + (100 - confidence) * 0.34 + exposureLoad + statusLoad), 12, 96)
    const lenderPosture = covenantScore >= 62 ? 'renegotiate' : covenantScore >= 44 ? 'tighten' : 'greenlight'

    return {
      asset: row.asset,
      city: row.city,
      covenantScore,
      ltvHeadroom: `${Math.max(4, Math.round((100 - covenantScore) / 3.1))}%`,
      dscrBuffer: `${(1.08 + (100 - covenantScore) / 220).toFixed(2)}x`,
      lenderPosture,
      nextMove: buildNextMove(lenderPosture, row.asset),
      triggers: buildTriggers(row, permitRisk, covenantScore),
    }
  })
}

export function summarizeCapitalCovenants(signals: CapitalCovenantSignal[]) {
  const highestPressure = [...signals].sort((first, second) => second.covenantScore - first.covenantScore)[0]
  const renegotiateCount = signals.filter((signal) => signal.lenderPosture === 'renegotiate').length
  const averageScore = Math.round(signals.reduce((sum, signal) => sum + signal.covenantScore, 0) / Math.max(signals.length, 1))

  return {
    highestPressure,
    renegotiateCount,
    averageScore,
    headline: highestPressure ? `${highestPressure.asset} is closest to covenant pressure` : 'No covenant pressure detected',
  }
}

function parsePercent(value: string) {
  return Number(value.replace('%', '')) || 0
}

function parseCurrencyMillions(value: string) {
  return Number(value.replace('$', '').replace('M', '')) || 0
}

function buildNextMove(posture: CapitalCovenantSignal['lenderPosture'], asset: string) {
  if (posture === 'renegotiate') return `Reprice ${asset} with stricter LTV and request lender conditions before committee.`
  if (posture === 'tighten') return 'Keep underwriting live, but add debt-service sensitivity before issuing terms.'
  return 'Keep current financing path and monitor permit-risk refreshes weekly.'
}

function buildTriggers(row: PermitPulseInput, permitRisk: number, covenantScore: number) {
  const triggers = [`${row.confidence} valuation confidence`, `${permitRisk}/100 permit pressure`]
  if (row.status !== 'Ready') triggers.push(`${row.status} valuation status`)
  if (covenantScore >= 62) triggers.push('low financing headroom')
  return triggers
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}