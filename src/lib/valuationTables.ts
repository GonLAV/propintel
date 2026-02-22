import type { PropertyCondition } from './types'
import tables from './valuationTables.data.json'

/**
 * Centralized coefficient tables for the valuation engine.
 * Keep these values data-driven so appraisers can calibrate them without touching algorithms.
 */

export const CONDITION_MULTIPLIERS: Record<PropertyCondition, number> = {
  new: tables.conditionMultipliers.new,
  excellent: tables.conditionMultipliers.excellent,
  good: tables.conditionMultipliers.good,
  fair: tables.conditionMultipliers.fair,
  poor: tables.conditionMultipliers.poor,
  'renovation-needed': tables.conditionMultipliers['renovation-needed']
}

/**
 * Floor premium/discount (subject vs. comp handled as delta).
 * Keys are floor numbers capped by MAX_FLOOR_KEY.
 */
export const MAX_FLOOR_KEY = tables.floor.maxFloorKey
export const FLOOR_ADJUSTMENTS: Record<number, number> = {
  0: tables.floor.adjustments['0'],
  1: tables.floor.adjustments['1'],
  2: tables.floor.adjustments['2'],
  3: tables.floor.adjustments['3'],
  4: tables.floor.adjustments['4'],
  5: tables.floor.adjustments['5'],
  6: tables.floor.adjustments['6'],
  7: tables.floor.adjustments['7'],
  8: tables.floor.adjustments['8']
}

export const FEATURE_VALUES = {
  elevator: tables.featureValues.elevator,
  parking: tables.featureValues.parking,
  storage: tables.featureValues.storage,
  balcony: tables.featureValues.balcony,
  accessible: tables.featureValues.accessible,
  airConditioning: tables.featureValues.airConditioning,
  securityDoor: tables.featureValues.securityDoor,
  renovated: tables.featureValues.renovated,
  waterHeating: tables.featureValues.waterHeating
} as const

export const EFFECTIVE_AGE_FACTORS: Record<PropertyCondition, number> = {
  new: tables.effectiveAgeFactors.new,
  excellent: tables.effectiveAgeFactors.excellent,
  good: tables.effectiveAgeFactors.good,
  fair: tables.effectiveAgeFactors.fair,
  poor: tables.effectiveAgeFactors.poor,
  'renovation-needed': tables.effectiveAgeFactors['renovation-needed']
}

export const LOCATION_DISTANCE_ADJUSTMENTS: Array<{ maxKm: number; adjustment: number }> = [
  ...tables.location.distanceAdjustments
]

export const LOCATION_DEFAULT_ADJUSTMENT = tables.location.defaultAdjustment

/**
 * Size adjustment: apply after threshold; capped indirectly by downstream confidence/checks.
 */
export const SIZE_ADJUSTMENT = {
  noopThreshold: tables.sizeAdjustment.noopThreshold,
  factor: tables.sizeAdjustment.factor
} as const

export const SIZE_ADJUSTMENT_NOOP_THRESHOLD = SIZE_ADJUSTMENT.noopThreshold
export const SIZE_ADJUSTMENT_FACTOR = SIZE_ADJUSTMENT.factor

export const AGE_ADJUSTMENT_STEPS: Array<{ maxYearsDiff: number; adjustment: number }> = [
  ...tables.ageAdjustment.steps
]

export const AGE_DEFAULT_ADJUSTMENT = tables.ageAdjustment.defaultAdjustment
