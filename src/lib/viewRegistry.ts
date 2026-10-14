import * as Phosphor from '@phosphor-icons/react'

const {
  Buildings, Calculator, Camera, ChartBar, ChartLineUp, ClockCounterClockwise,
  CurrencyDollar, Database, Detective, FileText, FolderOpen, House, Image, Key, Lightning,
  MagnifyingGlass, MapTrifold, Microphone, Palette, Robot, Scales, Stack, Users, UserCircle,
  Wrench, ArrowsLeftRight, CalendarBlank, TreeStructure, Briefcase, Bell, TestTube, Cube,
} = Phosphor

type Icon = typeof House

export type ViewGroupId = 'main' | 'valuations' | 'market' | 'fieldwork' | 'management' | 'team' | 'settings' | 'tools'

export interface ViewDefinition {
  label: string
  group: ViewGroupId
  icon: Icon
  keywords: string[]
}

export const VIEW_DEFINITIONS = {
  dashboard: { label: 'לוח בקרה', group: 'main', icon: House, keywords: ['ראשי', 'סטטיסטיקות', 'home'] },
  properties: { label: 'נכסים', group: 'main', icon: Buildings, keywords: ['דירות', 'מקרקעין'] },
  clients: { label: 'לקוחות', group: 'main', icon: Users, keywords: ['אנשי קשר', 'קונים', 'מוכרים'] },

  'data-gov-valuation': { label: 'שמאות Data.gov.il', group: 'valuations', icon: Database, keywords: ['ממשלה', 'עסקאות', 'CKAN'] },
  quicker: { label: 'QUICKER — שומה מהירה', group: 'valuations', icon: Lightning, keywords: ['מהיר', 'חישוב'] },
  'residential-valuation': { label: 'שווי דירות מגורים', group: 'valuations', icon: House, keywords: ['דירה', 'מגורים'] },
  'commercial-valuation': { label: 'שווי נכסי מסחר', group: 'valuations', icon: Briefcase, keywords: ['מסחר', 'NOI', 'היוון'] },
  'land-valuation': { label: 'שווי קרקעות', group: 'valuations', icon: TreeStructure, keywords: ['קרקע', 'מגרש'] },
  'office-valuation': { label: 'שווי משרדים', group: 'valuations', icon: Buildings, keywords: ['משרד', 'office'] },
  'betterment-levy': { label: 'היטל השבחה', group: 'valuations', icon: Scales, keywords: ['תב״ע', 'זכויות'] },
  calculators: { label: 'מחשבונים מקצועיים', group: 'valuations', icon: Calculator, keywords: ['נוסחאות', 'התאמות'] },
  distribution: { label: 'חלוקת שווי ליחידות', group: 'valuations', icon: Stack, keywords: ['חלוקה', 'יחידות'] },

  insights: { label: 'ניתוח ותובנות', group: 'market', icon: ChartBar, keywords: ['שוק', 'מגמות'] },
  'transactions-map': { label: 'מפת עסקאות ארצית', group: 'market', icon: MapTrifold, keywords: ['מפה', 'עסקאות'] },
  'rental-analysis': { label: 'ניתוח שכירות', group: 'market', icon: Calculator, keywords: ['שכירות', 'תשואה'] },
  'rental-data': { label: 'מאגר נתוני שכירות', group: 'market', icon: Database, keywords: ['שכירות', 'מאגר'] },
  'property-comparison': { label: 'השוואת נכסים', group: 'market', icon: ArrowsLeftRight, keywords: ['השוואה', 'דומים'] },
  'market-heatmap': { label: 'מפת חום השקעות', group: 'market', icon: MapTrifold, keywords: ['השקעה', 'סיכון'] },
  'anomaly-detector': { label: 'גלאי חריגות', group: 'market', icon: Detective, keywords: ['חריג', 'הונאה'] },
  'valuation-assistant': { label: 'עוזר שמאות AI', group: 'market', icon: Robot, keywords: ['AI', 'השוואות'] },
  'ai-comparable-report': { label: 'סטודיו AI להשוואות', group: 'market', icon: ChartLineUp, keywords: ['דוח', 'comparables'] },
  'historical-search': { label: 'חיפוש היסטורי', group: 'market', icon: ClockCounterClockwise, keywords: ['היסטוריה', 'חיפוש'] },
  'market-sync': { label: 'סנכרון נתוני שוק', group: 'market', icon: ChartLineUp, keywords: ['סנכרון', 'עדכון'] },
  'gisn-viewer': { label: 'מסמכי תב״ע GISN', group: 'market', icon: FileText, keywords: ['GISN', 'תכנון'] },
  'gisn-diff': { label: 'השוואת תב״ע', group: 'market', icon: ArrowsLeftRight, keywords: ['GISN', 'diff'] },
  'gisn-arcgis': { label: 'ArcGIS תכניות', group: 'market', icon: MapTrifold, keywords: ['ArcGIS', 'שכבות'] },
  'gisn-doc-scanner': { label: 'סריקת מסמכי GISN', group: 'market', icon: MagnifyingGlass, keywords: ['PDF', 'סריקה'] },
  'ingestion-helper': { label: 'עזר אינדוקס PDF', group: 'market', icon: Wrench, keywords: ['ingest', 'PDF'] },
  'ocr-helper': { label: 'OCR לא מאומת', group: 'market', icon: FileText, keywords: ['OCR', 'זיהוי טקסט'] },
  'data-gov-check': { label: 'בדיקת משאב Data.gov.il', group: 'market', icon: Database, keywords: ['resource', 'CKAN'] },
  'taba-extractor': { label: 'חילוץ הוראות תב״ע', group: 'market', icon: FileText, keywords: ['TABA', 'חילוץ'] },

  'smart-inspection': { label: 'ביקור חכם בנכס', group: 'fieldwork', icon: Camera, keywords: ['ביקור', 'ליקויים'] },
  'visit-manager': { label: 'ניהול ביקורים', group: 'fieldwork', icon: CalendarBlank, keywords: ['פגישות', 'לוח שנה'] },
  'voice-report': { label: 'דוח קולי', group: 'fieldwork', icon: Microphone, keywords: ['קול', 'תמלול'] },
  'before-after': { label: 'לפני ואחרי', group: 'fieldwork', icon: Image, keywords: ['שיפוץ', 'צילום'] },
  'ai-photo-analysis': { label: 'ניתוח תמונות AI', group: 'fieldwork', icon: Camera, keywords: ['AI', 'תמונה'] },

  cases: { label: 'ניהול תיקים', group: 'management', icon: FolderOpen, keywords: ['תיקים', 'פרויקטים'] },
  tasks: { label: 'משימות', group: 'management', icon: FileText, keywords: ['מעקב', 'עדיפות'] },
  'income-report': { label: 'דוח הכנסות', group: 'management', icon: CurrencyDollar, keywords: ['הכנסות', 'חשבוניות'] },
  standardized: { label: 'דוחות תקניים', group: 'management', icon: FileText, keywords: ['בנק', 'בית משפט'] },
  portal: { label: 'ניהול פורטל לקוחות', group: 'management', icon: UserCircle, keywords: ['לקוח', 'דוחות'] },
  business: { label: 'ניהול עסקי', group: 'management', icon: CurrencyDollar, keywords: ['רווחיות', 'הוצאות'] },
  bulk: { label: 'שמאות מרובה', group: 'management', icon: Stack, keywords: ['bulk', 'פורטפוליו'] },
  email: { label: 'היסטוריית הודעות', group: 'management', icon: Bell, keywords: ['אימייל', 'הודעות'] },
  sequences: { label: 'רצפי הודעות', group: 'management', icon: Bell, keywords: ['אוטומציה', 'אימייל'] },
  'automated-reports': { label: 'דוחות אוטומטיים', group: 'management', icon: FileText, keywords: ['אוטומציה', 'דוח'] },
  'multi-unit': { label: 'ניהול יחידות מרובות', group: 'management', icon: Buildings, keywords: ['בניין', 'יחידות'] },

  team: { label: 'שיתוף צוות', group: 'team', icon: Users, keywords: ['צוות', 'שיתוף'] },
  'team-manage': { label: 'ניהול צוות', group: 'team', icon: Users, keywords: ['הרשאות', 'משתמשים'] },
  audit: { label: 'יומן ביקורת', group: 'team', icon: ChartBar, keywords: ['audit', 'פעילות'] },
  'ai-insights': { label: 'תובנות AI', group: 'team', icon: Robot, keywords: ['AI', 'סיכום'] },
  import: { label: 'ייבוא עסקאות', group: 'team', icon: Database, keywords: ['CSV', 'ייבוא'] },

  branding: { label: 'מיתוג ועיצוב', group: 'settings', icon: Palette, keywords: ['לוגו', 'צבעים'] },
  'api-settings': { label: 'חיבורי נתונים', group: 'settings', icon: Key, keywords: ['API', 'מפתחות'] },
  'api-analytics': { label: 'ניתוח שימוש API', group: 'settings', icon: ChartBar, keywords: ['API', 'עלויות'] },
  'api-quota': { label: 'מכסות API', group: 'settings', icon: ChartBar, keywords: ['API', 'מכסה'] },
  'data-sources': { label: 'מקורות נתונים', group: 'settings', icon: Database, keywords: ['חיבורים', 'מקורות'] },

  tester: { label: 'בדיקת מנוע שמאות', group: 'tools', icon: TestTube, keywords: ['בדיקה', 'test'] },
  'digital-twin': { label: 'תאום דיגיטלי', group: 'tools', icon: Cube, keywords: ['3D', 'דיגיטלי'] },
  development: { label: 'זכויות בנייה', group: 'tools', icon: Buildings, keywords: ['פיתוח', 'זכויות'] },
  'real-building-rights': { label: 'זכויות בנייה בפועל', group: 'tools', icon: Buildings, keywords: ['תכנון', 'היתרים'] },
} satisfies Record<string, ViewDefinition>

export type ViewId = keyof typeof VIEW_DEFINITIONS
export const VIEW_IDS = Object.keys(VIEW_DEFINITIONS) as ViewId[]

export function isViewId(value: string): value is ViewId {
  return Object.prototype.hasOwnProperty.call(VIEW_DEFINITIONS, value)
}

const GROUP_TITLES: Record<ViewGroupId, string> = {
  main: 'ראשי',
  valuations: 'שומות',
  market: 'ניתוח שוק ונתונים',
  fieldwork: 'עבודת שטח',
  management: 'ניהול',
  team: 'צוות ואוטומציה',
  settings: 'הגדרות',
  tools: 'כלים נוספים',
}

export interface ViewGroupDef {
  id: ViewGroupId
  title: string
  views: ViewId[]
}

export const VIEW_GROUPS: ViewGroupDef[] = (Object.keys(GROUP_TITLES) as ViewGroupId[]).map(id => ({
  id,
  title: GROUP_TITLES[id],
  views: VIEW_IDS.filter(viewId => VIEW_DEFINITIONS[viewId].group === id),
}))
