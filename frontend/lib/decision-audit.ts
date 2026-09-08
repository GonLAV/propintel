import { decisionRiskConfig } from '@/lib/decision-config'
import { clamp } from '@/lib/decision-utils'

export type DecisionModuleName = 'permit-pulse' | 'capital-covenant' | 'scenario-shock' | 'review-defense'

export type DecisionAuditEvent = {
  module: DecisionModuleName
  modelVersion: string
  inputCount: number
  outputCount: number
  generatedAt: string
}

export function createDecisionAuditEvent(module: DecisionModuleName, inputCount: number, outputCount: number): DecisionAuditEvent {
  return {
    module,
    modelVersion: decisionRiskConfig.modelVersion,
    inputCount: clamp(Math.round(inputCount), 0, 100000),
    outputCount: clamp(Math.round(outputCount), 0, 100000),
    generatedAt: new Date().toISOString(),
  }
}

export function logDecisionAudit(event: DecisionAuditEvent, logger: Pick<Console, 'info'> = console) {
  if (!decisionRiskConfig.enableDecisionAuditLogs) return
  logger.info('[propintel:decision]', event)
}