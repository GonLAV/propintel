export type PermitPulseInput = {
  asset: string
  city: string
  value: string
  confidence: string
  status: string
}

export type PermitPulseSignal = {
  asset: string
  city: string
  riskScore: number
  valueAtRisk: string
  deadlineWindow: string
  permitStage: string
  signal: 'accelerate' | 'watch' | 'hold'
  controlAction: string
  drivers: string[]
}

const cityStageProfile: Record<string, Pick<PermitPulseSignal, 'deadlineWindow' | 'permitStage'>> = {
  'Tel Aviv': { deadlineWindow: '21 days', permitStage: 'objection window' },
  Jerusalem: { deadlineWindow: '34 days', permitStage: 'committee clarification' },
  Haifa: { deadlineWindow: '48 days', permitStage: 'rights validation' },
}

export function generatePermitPulse(rows: PermitPulseInput[]): PermitPulseSignal[] {
  return rows.map((row, index) => {
    const confidence = parsePercent(row.confidence)
    const value = parseCurrencyMillions(row.value)
    const stageProfile = cityStageProfile[row.city] || { deadlineWindow: '30 days', permitStage: 'municipal review' }
    const baseRisk = 100 - confidence
    const statusRisk = row.status === 'Draft' ? 23 : row.status === 'Review' ? 15 : 7
    const exposureRisk = value > 5 ? 14 : value > 2 ? 9 : 5
    const volatilityRisk = row.city === 'Tel Aviv' ? 11 : row.city === 'Jerusalem' ? 8 : 6
    const riskScore = clamp(Math.round(baseRisk + statusRisk + exposureRisk + volatilityRisk + index * 2), 18, 94)
    const signal = riskScore >= 58 ? 'accelerate' : riskScore >= 42 ? 'watch' : 'hold'

    return {
      asset: row.asset,
      city: row.city,
      riskScore,
      valueAtRisk: formatValueAtRisk(value, riskScore),
      deadlineWindow: stageProfile.deadlineWindow,
      permitStage: stageProfile.permitStage,
      signal,
      controlAction: buildControlAction(signal, row.city),
      drivers: buildDrivers(row, riskScore),
    }
  })
}

export function summarizePermitPulse(signals: PermitPulseSignal[]) {
  const highestRisk = [...signals].sort((first, second) => second.riskScore - first.riskScore)[0]
  const accelerated = signals.filter((signal) => signal.signal === 'accelerate').length
  const averageRisk = Math.round(signals.reduce((sum, signal) => sum + signal.riskScore, 0) / Math.max(signals.length, 1))

  return {
    highestRisk,
    accelerated,
    averageRisk,
    headline: highestRisk ? `${highestRisk.asset} needs planning control inside ${highestRisk.deadlineWindow}` : 'No planning pressure detected',
  }
}

function parsePercent(value: string) {
  return Number(value.replace('%', '')) || 0
}

function parseCurrencyMillions(value: string) {
  const normalized = value.replace('$', '').replace('M', '')
  return Number(normalized) || 0
}

function formatValueAtRisk(valueInMillions: number, riskScore: number) {
  const valueAtRisk = valueInMillions * (riskScore / 100) * 0.18
  return `$${valueAtRisk.toFixed(2)}M`
}

function buildControlAction(signal: PermitPulseSignal['signal'], city: string) {
  if (signal === 'accelerate') return `Escalate ${city} planning evidence review before committee movement.`
  if (signal === 'watch') return 'Hold price discipline and request missing permit-source confirmation.'
  return 'Keep current underwriting path; refresh planning signals weekly.'
}

function buildDrivers(row: PermitPulseInput, riskScore: number) {
  const drivers = [`${row.confidence} valuation confidence`, `${row.status} underwriting status`]
  if (row.city === 'Tel Aviv') drivers.push('high-density planning sensitivity')
  if (riskScore >= 58) drivers.push('decision window compression')
  return drivers
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}