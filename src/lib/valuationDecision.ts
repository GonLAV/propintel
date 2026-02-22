import type { Comparable, Property, PropertyType } from './types'

export type ValuationEngineMethod = 'comparable-sales' | 'cost-approach' | 'income-approach' | 'hybrid'

export interface ValuationRecommendation {
  recommendedMethod: ValuationEngineMethod
  fallbackMethods: ValuationEngineMethod[]
  reasons: string[]
  requiredInputs: Array<'comparables' | 'landValue' | 'constructionCostPerSqm' | 'monthlyRent'>
  warnings: string[]
}

export interface ValuationContext {
  comparables?: Comparable[]
  hasLandValue?: boolean
  hasConstructionCostPerSqm?: boolean
  hasMonthlyRent?: boolean
}

function isResidential(type: PropertyType): boolean {
  return type === 'apartment' ||
    type === 'house' ||
    type === 'penthouse' ||
    type === 'garden-apartment' ||
    type === 'duplex' ||
    type === 'studio'
}

/**
 * Minimal decision engine:
 * - Residential existing: Comparable Sales
 * - Commercial/income-producing: Income
 * - Land: Cost (as placeholder; extraction not implemented)
 * - If data is missing, still recommends but declares required inputs.
 */
export function recommendValuationMethod(property: Property, context: ValuationContext = {}): ValuationRecommendation {
  const reasons: string[] = []
  const warnings: string[] = []
  const requiredInputs: ValuationRecommendation['requiredInputs'] = []

  const selectedComps = (context.comparables || []).filter(c => c.selected)
  const selectedCount = selectedComps.length

  if (isResidential(property.type)) {
    reasons.push('נכס מגורים: שיטת ההשוואה היא ברירת מחדל מקובלת')

    if (selectedCount === 0) {
      requiredInputs.push('comparables')
      warnings.push('לא נבחרו עסקאות להשוואה; נדרש סט עסקאות לצורך הרצה')
    } else if (selectedCount < 3) {
      warnings.push('לא נבחרו עסקאות מספיקות (פחות מ-3); רמת הביטחון צפויה לרדת')
    }

    return {
      recommendedMethod: 'comparable-sales',
      fallbackMethods: ['cost-approach'],
      reasons,
      requiredInputs,
      warnings
    }
  }

  if (property.type === 'commercial') {
    reasons.push('נכס מסחרי/מניב: שיטת ההיוון משקפת NOI ותשואת שוק')

    if (!context.hasMonthlyRent) {
      requiredInputs.push('monthlyRent')
      warnings.push('אין נתון שכירות חודשית; נדרש לצורך NOI והיוון')
    }

    return {
      recommendedMethod: 'income-approach',
      fallbackMethods: ['comparable-sales', 'cost-approach'],
      reasons,
      requiredInputs,
      warnings
    }
  }

  if (property.type === 'land') {
    reasons.push('קרקע: כרגע יש במערכת שיטת עלות (קרקע + רכיב פיתוח/עלות)')
    warnings.push('שיטת החילוץ/Residual לקרקע אינה ממומשת עדיין במנוע')

    if (!context.hasLandValue) requiredInputs.push('landValue')
    if (!context.hasConstructionCostPerSqm) requiredInputs.push('constructionCostPerSqm')

    return {
      recommendedMethod: 'cost-approach',
      fallbackMethods: ['comparable-sales'],
      reasons,
      requiredInputs,
      warnings
    }
  }

  // Fallback (should be unreachable with current PropertyType union)
  warnings.push('סוג נכס לא מזוהה; משתמש בברירת מחדל')
  return {
    recommendedMethod: 'comparable-sales',
    fallbackMethods: ['cost-approach', 'income-approach'],
    reasons,
    requiredInputs,
    warnings
  }
}
