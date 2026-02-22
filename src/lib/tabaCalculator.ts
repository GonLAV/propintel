import type { TabaExtraction } from '@/lib/tabaExtraction'

export interface TabaDerived {
  site_area_sqm: number | null
  allowed_built_area_sqm: number | null
  main_building_rights_sqm: number | null
  max_floors: number | null
  max_height_m: number | null
  primary_use: string | null
  additional_uses: string[]
  special_restrictions: string[]
  completeness: number
  confidence_input: number
  confidence_final: number
  notes: string[]
}

export function calculateFromExtraction(ex: TabaExtraction, siteAreaSqm?: number | null): TabaDerived {
  const site = typeof siteAreaSqm === 'number' && siteAreaSqm > 0 ? siteAreaSqm : null

  const allowed = site && ex.building_percent != null
    ? Math.round((site * ex.building_percent) / 100)
    : null

  const tracked: Array<keyof TabaExtraction> = [
    'primary_use',
    'additional_uses',
    'max_floors',
    'max_height_m',
    'building_percent',
    'main_building_rights_sqm',
    'special_restrictions',
    'parking_requirements',
    'notes'
  ]

  let filled = 0
  for (const k of tracked) {
    const v = (ex as any)[k]
    if (Array.isArray(v)) {
      if (v.length > 0) filled++
    } else if (v !== null && v !== undefined && v !== '') {
      filled++
    }
  }
  const completeness = tracked.length ? Math.round((filled / tracked.length) * 100) : 0

  const confidence_input = Math.max(0, Math.min(1, ex.confidence))
  const completenessFactor = completeness / 100
  const confidence_final = Math.min(confidence_input, completenessFactor)

  return {
    site_area_sqm: site,
    allowed_built_area_sqm: allowed,
    main_building_rights_sqm: ex.main_building_rights_sqm,
    max_floors: ex.max_floors,
    max_height_m: ex.max_height_m,
    primary_use: ex.primary_use,
    additional_uses: ex.additional_uses,
    special_restrictions: ex.special_restrictions,
    completeness,
    confidence_input,
    confidence_final,
    notes: ex.notes
  }
}
