import { generateCapitalCovenantRadar } from '@/lib/capital-covenant'
import { generatePermitPulse, type PermitPulseInput } from '@/lib/permit-pulse'
import { summarizeScenarioShockMatrix } from '@/lib/scenario-shock'

export type DefenseStatus = 'defensible' | 'needs-review' | 'not-ready'

export type ReviewDefenseSignal = {
  asset: string
  status: DefenseStatus
  defenseScore: number
  evidenceCoverage: number
  reviewerQuestions: string[]
  strongestArgument: string
  missingProof: string[]
  exportGate: string
}

export function generateReviewDefensePack(rows: PermitPulseInput[]): ReviewDefenseSignal[] {
  const permitSignals = generatePermitPulse(rows)
  const covenantSignals = generateCapitalCovenantRadar(rows)
  const shockSummary = summarizeScenarioShockMatrix(rows)

  return rows.map((row, index) => {
    const confidence = parsePercent(row.confidence)
    const permitRisk = permitSignals[index]?.riskScore || 40
    const covenantRisk = covenantSignals[index]?.covenantScore || 40
    const shockRisk = findShockRisk(shockSummary.matrix, row.asset)
    const evidenceCoverage = calculateEvidenceCoverage(row, permitRisk, covenantRisk, shockRisk)
    const defenseScore = clamp(Math.round(confidence * 0.38 + evidenceCoverage * 0.34 + (100 - Math.max(permitRisk, covenantRisk, shockRisk)) * 0.28), 8, 98)
    const status = defenseScore >= 76 ? 'defensible' : defenseScore >= 56 ? 'needs-review' : 'not-ready'

    return {
      asset: row.asset,
      status,
      defenseScore,
      evidenceCoverage,
      reviewerQuestions: buildReviewerQuestions(row, permitRisk, covenantRisk, shockRisk),
      strongestArgument: buildStrongestArgument(row, confidence, permitRisk),
      missingProof: buildMissingProof(row, permitRisk, covenantRisk, shockRisk),
      exportGate: buildExportGate(status, row.asset),
    }
  })
}

export function summarizeReviewDefensePack(signals: ReviewDefenseSignal[]) {
  const weakest = [...signals].sort((first, second) => first.defenseScore - second.defenseScore)[0]
  const defensibleCount = signals.filter((signal) => signal.status === 'defensible').length
  const averageDefense = Math.round(signals.reduce((sum, signal) => sum + signal.defenseScore, 0) / Math.max(signals.length, 1))

  return {
    weakest,
    defensibleCount,
    averageDefense,
    headline: weakest ? `${weakest.asset} has the weakest review defense` : 'All files are defensible',
  }
}

function findShockRisk(matrix: ReturnType<typeof summarizeScenarioShockMatrix>['matrix'], asset: string) {
  const matches = matrix.flatMap((entry) => entry.results).filter((result) => result.asset === asset)
  return matches.length ? Math.max(...matches.map((result) => result.breakScore)) : 40
}

function calculateEvidenceCoverage(row: PermitPulseInput, permitRisk: number, covenantRisk: number, shockRisk: number) {
  const confidence = parsePercent(row.confidence)
  const base = row.status === 'Ready' ? 74 : row.status === 'Review' ? 60 : 44
  const confidenceBonus = Math.max(0, confidence - 85)
  const riskPenalty = Math.round((Math.max(permitRisk, covenantRisk, shockRisk) - 45) * 0.35)
  return clamp(base + confidenceBonus - Math.max(0, riskPenalty), 20, 96)
}

function buildReviewerQuestions(row: PermitPulseInput, permitRisk: number, covenantRisk: number, shockRisk: number) {
  const questions = [`Can ${row.confidence} confidence be traced to comparable selection?`]
  if (permitRisk >= 50) questions.push('Is planning-source evidence current enough for export?')
  if (covenantRisk >= 50) questions.push('Does the debt case still pass lender sensitivity?')
  if (shockRisk >= 64) questions.push('Has the downside scenario been added to the committee memo?')
  return questions
}

function buildStrongestArgument(row: PermitPulseInput, confidence: number, permitRisk: number) {
  if (confidence >= 92 && permitRisk < 45) return `${row.asset} has strong valuation confidence and controlled planning pressure.`
  if (confidence >= 88) return `${row.asset} has a usable valuation base, but review should explain planning sensitivity.`
  return `${row.asset} needs stronger comparable and planning evidence before it reads as defensible.`
}

function buildMissingProof(row: PermitPulseInput, permitRisk: number, covenantRisk: number, shockRisk: number) {
  const missingProof: string[] = []
  if (row.status !== 'Ready') missingProof.push('final reviewer sign-off')
  if (permitRisk >= 50) missingProof.push('fresh planning-source confirmation')
  if (covenantRisk >= 50) missingProof.push('lender sensitivity appendix')
  if (shockRisk >= 64) missingProof.push('downside scenario memo')
  return missingProof.length ? missingProof : ['no critical gaps detected']
}

function buildExportGate(status: DefenseStatus, asset: string) {
  if (status === 'defensible') return `Export ${asset} with review-defense appendix.`
  if (status === 'needs-review') return `Route ${asset} to senior review before external export.`
  return `Block ${asset} export until missing proof is resolved.`
}

function parsePercent(value: string) {
  return Number(value.replace('%', '')) || 0
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}