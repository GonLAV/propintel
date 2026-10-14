export interface SizeNormalizationAdjustment {
  percentage: number
  amount: number
  normalizedValue: number
}

export function calculateSizeNormalizationAdjustment(
  subjectArea: number,
  comparableArea: number,
  comparablePrice: number,
): SizeNormalizationAdjustment {
  if (
    !Number.isFinite(subjectArea) ||
    !Number.isFinite(comparableArea) ||
    !Number.isFinite(comparablePrice) ||
    subjectArea <= 0 ||
    comparableArea <= 0 ||
    comparablePrice <= 0
  ) {
    throw new Error('Areas and comparable price must be positive finite numbers')
  }

  const normalizationRatio = subjectArea / comparableArea
  const normalizedValue = comparablePrice * normalizationRatio
  return {
    percentage: (normalizationRatio - 1) * 100,
    amount: normalizedValue - comparablePrice,
    normalizedValue,
  }
}
