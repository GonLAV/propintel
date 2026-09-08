import { generateCapitalCovenantRadar } from '@/lib/capital-covenant'
import { createDecisionAuditEvent, logDecisionAudit } from '@/lib/decision-audit'
import { decisionRiskConfig } from '@/lib/decision-config'
import { average, clamp, highestBy, parseCurrencyMillions, parsePercent, sanitizeAssetRows } from '@/lib/decision-utils'
import { generatePermitPulse, type PermitPulseInput } from '@/lib/permit-pulse'

export type ShockScenario = {
  id: string
  label: string
  rateShockBps: number
  rentShockPercent: number
  permitDelayDays: number
}

export type ShockResult = {
  asset: string
  city: string
  scenario: string
  breakScore: number
  equityBuffer: string
  firstBreak: string
  boardMove: string
}

export const shockScenarios: ShockScenario[] = [
  { id: 'rates', label: 'Rate jump', rateShockBps: 125, rentShockPercent: 0, permitDelayDays: 0 },
  { id: 'rent', label: 'Rent softness', rateShockBps: 50, rentShockPercent: -7, permitDelayDays: 0 },
  { id: 'planning', label: 'Permit delay', rateShockBps: 75, rentShockPercent: -3, permitDelayDays: 90 },
]

export function generateScenarioShockMatrix(rows: PermitPulseInput[]) {
  const safeRows = sanitizeAssetRows(rows)
  const permitSignals = generatePermitPulse(safeRows)
  const covenantSignals = generateCapitalCovenantRadar(safeRows)

  const matrix = shockScenarios.map((scenario) => {
    const results = safeRows.map((row, index) => {
      const confidence = parsePercent(row.confidence)
      const value = parseCurrencyMillions(row.value)
      const permitRisk = permitSignals[index]?.riskScore || 40
      const covenantRisk = covenantSignals[index]?.covenantScore || 40
      const shockLoad = scenario.rateShockBps / 9 + Math.abs(scenario.rentShockPercent) * 2.2 + scenario.permitDelayDays / 5
      const exposureLoad = value > 5 ? 12 : value > 2 ? 8 : 4
      const breakScore = clamp(Math.round(covenantRisk * 0.42 + permitRisk * 0.24 + (100 - confidence) * 0.18 + shockLoad + exposureLoad), 15, 99)

      return {
        asset: row.asset,
        city: row.city,
        scenario: scenario.label,
        breakScore,
        equityBuffer: `${Math.max(3, Math.round((100 - breakScore) / 2.8))}%`,
        firstBreak: findFirstBreak(scenario, permitRisk, covenantRisk),
        boardMove: buildBoardMove(breakScore, row.asset),
      }
    })

    return {
      scenario,
      results,
      firstToBreak: highestBy(results, (result) => result.breakScore),
    }
  })

  logDecisionAudit(createDecisionAuditEvent('scenario-shock', safeRows.length, matrix.flatMap((entry) => entry.results).length))
  return matrix
}

export function summarizeScenarioShockMatrix(rows: PermitPulseInput[]) {
  const matrix = generateScenarioShockMatrix(rows)
  const allResults = matrix.flatMap((entry) => entry.results)
  const highestBreak = highestBy(allResults, (result) => result.breakScore)
  const averageBreakScore = average(allResults.map((result) => result.breakScore))

  return {
    matrix,
    highestBreak,
    averageBreakScore,
    scenarioCount: matrix.length,
  }
}

function findFirstBreak(scenario: ShockScenario, permitRisk: number, covenantRisk: number) {
  if (scenario.permitDelayDays >= 60 && permitRisk >= 48) return 'Planning milestone slips first'
  if (scenario.rateShockBps >= 100 && covenantRisk >= 45) return 'Debt-service covenant tightens first'
  if (scenario.rentShockPercent <= -5) return 'Income resilience breaks first'
  return 'Equity buffer absorbs first shock'
}

function buildBoardMove(breakScore: number, asset: string) {
  if (breakScore >= decisionRiskConfig.shockCriticalScore) return `Pause ${asset} approval until downside case is repriced.`
  if (breakScore >= decisionRiskConfig.shockWatchScore) return `Keep ${asset} live, but require a shock-adjusted IC memo.`
  return `Keep ${asset} in standard review with weekly signal refresh.`
}

