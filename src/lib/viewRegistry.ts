/**
 * View Registry — Single source of truth for all navigable views.
 * ───────────────────────────────────────────────────────────────
 * Every view ID, label, icon, and component are declared here.
 * The sidebar, App.tsx routing, and breadcrumbs all read from this.
 */

// ── All valid view IDs as a union type ────────────────────────────
export const VIEW_IDS = [
  'dashboard',
  'properties',
  'clients',
  // Valuations
  'data-gov-valuation',
  'quicker',
  'residential-valuation',
  'commercial-valuation',
  'land-valuation',
  'office-valuation',
  'betterment-levy',
  'calculators',
  'distribution',
  // Market Analysis
  'insights',
  'transactions-map',
  'rental-analysis',
  'rental-data',
  'gisn-viewer',
  'gisn-diff',
  'gisn-arcgis',
  'gisn-doc-scanner',
  'ingestion-helper',
  'ocr-helper',
  'data-gov-check',
  'taba-extractor',
  'historical-search',
  'market-sync',
  // Fieldwork
  'smart-inspection',
  'visit-manager',
  'voice-report',
  'before-after',
  'ai-photo-analysis',
  // Advanced Analysis
  'property-comparison',
  'market-heatmap',
  'anomaly-detector',
  'valuation-assistant',
  'ai-comparable-report',
  // Management
  'cases',
  'tasks',
  'income-report',
  'standardized',
  'portal',
  'business',
  'bulk',
  'email',
  'sequences',
  'automated-reports',
  // Team
  'team',
  'team-manage',
  'audit',
  'ai-insights',
  'import',
  // Settings
  'branding',
  'api-settings',
  'api-analytics',
  'api-quota',
  // Other
  'tester',
  'digital-twin',
  'data-sources',
  'development',
  'multi-unit',
  'real-building-rights',
] as const

export type ViewId = (typeof VIEW_IDS)[number]

/** Type guard: is this string a valid ViewId? */
export function isViewId(value: string): value is ViewId {
  return (VIEW_IDS as readonly string[]).includes(value)
}

// ── View group structure for sidebar ──────────────────────────────
export interface ViewGroupDef {
  id: string
  title: string
  views: ViewId[]
}

export const VIEW_GROUPS: ViewGroupDef[] = [
  {
    id: 'main',
    title: 'ראשי',
    views: ['dashboard', 'properties', 'clients'],
  },
  {
    id: 'valuations',
    title: 'שומות',
    views: [
      'data-gov-valuation',
      'quicker',
      'residential-valuation',
      'commercial-valuation',
      'land-valuation',
      'office-valuation',
      'betterment-levy',
      'calculators',
    ],
  },
  {
    id: 'fieldwork',
    title: 'עבודת שטח',
    views: [
      'smart-inspection',
      'visit-manager',
      'voice-report',
      'before-after',
      'ai-photo-analysis',
    ],
  },
  {
    id: 'market',
    title: 'ניתוח שוק',
    views: [
      'insights',
      'transactions-map',
      'property-comparison',
      'market-heatmap',
      'anomaly-detector',
      'valuation-assistant',
      'ai-comparable-report',
      'rental-analysis',
      'gisn-viewer',
      'gisn-diff',
      'gisn-arcgis',
      'gisn-doc-scanner',
      'taba-extractor',
      'data-gov-check',
      'ocr-helper',
      'ingestion-helper',
    ],
  },
  {
    id: 'management',
    title: 'ניהול',
    views: [
      'cases',
      'tasks',
      'income-report',
      'standardized',
      'portal',
      'business',
    ],
  },
  {
    id: 'settings',
    title: 'הגדרות',
    views: ['branding', 'api-settings'],
  },
]
