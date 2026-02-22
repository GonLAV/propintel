/**
 * Shared label maps & display constants
 * ─────────────────────────────────────
 * Single source of truth for all Hebrew UI labels.
 * Import from here instead of re-declaring inline.
 */

import type { PropertyStatus, PropertyType, PropertyCondition, ValuationMethod } from './types'

// ── Property status ──────────────────────────────────────────────────
export const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: 'טיוטה',
  'in-progress': 'בעבודה',
  completed: 'הושלם',
  sent: 'נשלח',
}

export const STATUS_COLORS: Record<PropertyStatus, string> = {
  draft: 'bg-muted/50 text-muted-foreground border-muted',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  sent: 'bg-green-50 text-green-700 border-green-200',
}

// ── Property type ────────────────────────────────────────────────────
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'דירה',
  house: 'בית פרטי',
  penthouse: 'פנטהאוז',
  'garden-apartment': 'דירת גן',
  duplex: 'דופלקס',
  studio: 'סטודיו',
  commercial: 'מסחרי',
  land: 'מגרש',
}

// ── Property condition ───────────────────────────────────────────────
export const CONDITION_LABELS: Record<PropertyCondition, string> = {
  new: 'חדש',
  excellent: 'מעולה',
  good: 'טוב',
  fair: 'סביר',
  poor: 'ירוד',
  'renovation-needed': 'דורש שיפוץ',
}

// ── Valuation method ─────────────────────────────────────────────────
export const VALUATION_METHOD_LABELS: Record<ValuationMethod, string> = {
  'comparable-sales': 'גישת ההשוואה',
  'cost-approach': 'גישת העלות',
  'income-approach': 'גישת ההכנסה',
  hybrid: 'שיטה משולבת',
}
