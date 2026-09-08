import { clamp } from '@/lib/decision-utils'

export type DecisionRiskConfig = {
  modelVersion: string
  enableDecisionAuditLogs: boolean
  permitAccelerateScore: number
  permitWatchScore: number
  covenantRenegotiateScore: number
  covenantTightenScore: number
  shockCriticalScore: number
  shockWatchScore: number
  defenseReadyScore: number
  defenseReviewScore: number
}

export const defaultDecisionRiskConfig: DecisionRiskConfig = {
  modelVersion: '2026.04',
  enableDecisionAuditLogs: false,
  permitAccelerateScore: 58,
  permitWatchScore: 42,
  covenantRenegotiateScore: 62,
  covenantTightenScore: 44,
  shockCriticalScore: 72,
  shockWatchScore: 54,
  defenseReadyScore: 76,
  defenseReviewScore: 56,
}

export function loadDecisionRiskConfig(env: Record<string, string | undefined> = process.env): DecisionRiskConfig {
  return {
    modelVersion: safeString(env.NEXT_PUBLIC_DECISION_MODEL_VERSION, defaultDecisionRiskConfig.modelVersion),
    enableDecisionAuditLogs: env.NEXT_PUBLIC_DECISION_AUDIT_LOGS === 'true',
    permitAccelerateScore: readThreshold(env.NEXT_PUBLIC_PERMIT_ACCELERATE_SCORE, defaultDecisionRiskConfig.permitAccelerateScore),
    permitWatchScore: readThreshold(env.NEXT_PUBLIC_PERMIT_WATCH_SCORE, defaultDecisionRiskConfig.permitWatchScore),
    covenantRenegotiateScore: readThreshold(env.NEXT_PUBLIC_COVENANT_RENEGOTIATE_SCORE, defaultDecisionRiskConfig.covenantRenegotiateScore),
    covenantTightenScore: readThreshold(env.NEXT_PUBLIC_COVENANT_TIGHTEN_SCORE, defaultDecisionRiskConfig.covenantTightenScore),
    shockCriticalScore: readThreshold(env.NEXT_PUBLIC_SHOCK_CRITICAL_SCORE, defaultDecisionRiskConfig.shockCriticalScore),
    shockWatchScore: readThreshold(env.NEXT_PUBLIC_SHOCK_WATCH_SCORE, defaultDecisionRiskConfig.shockWatchScore),
    defenseReadyScore: readThreshold(env.NEXT_PUBLIC_DEFENSE_READY_SCORE, defaultDecisionRiskConfig.defenseReadyScore),
    defenseReviewScore: readThreshold(env.NEXT_PUBLIC_DEFENSE_REVIEW_SCORE, defaultDecisionRiskConfig.defenseReviewScore),
  }
}

export const decisionRiskConfig = loadDecisionRiskConfig()

function readThreshold(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? clamp(Math.round(parsed), 0, 100) : fallback
}

function safeString(value: string | undefined, fallback: string) {
  const sanitized = String(value || '').replace(/[<>]/g, '').trim().slice(0, 32)
  return sanitized || fallback
}