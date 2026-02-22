/**
 * Core Modules — Register all platform modules & commands.
 * ─────────────────────────────────────────────────────────
 * Called once at app startup. Each call to moduleRegistry.register()
 * adds navigation commands, action commands, and AI commands.
 */

import {
  House,
  Buildings,
  Users,
  Calculator,
  Lightning,
  ChartBar,
  FolderOpen,
  FileText,
  Briefcase,
  Scales,
  MapTrifold,
  CurrencyDollar,
  Palette,
  Key,
  Robot,
  MagnifyingGlass,
  Plus,
  ArrowsLeftRight,
  ChartLineUp,
  Camera,
  CalendarBlank,
  Microphone,
  Image,
  ThermometerHot,
  Detective,
} from '@phosphor-icons/react'
import { moduleRegistry, type PlatformCommand } from '@/core/moduleRegistry'
import { bus } from '@/core/eventBus'
import type { ViewId } from '@/lib/viewRegistry'

// ── Helper: create a navigation command ──────────────────────────
function nav(id: ViewId, label: string, icon: PlatformCommand['icon'], keywords: string[] = []): PlatformCommand {
  return {
    id: `nav.${id}`,
    label,
    keywords: [label, ...keywords],
    icon,
    group: 'navigation',
    execute: () => bus.emit('nav:navigate', id),
  }
}

export function registerCoreModules() {
  // ── Main module ──────────────────────────────────────────────────
  moduleRegistry.register({
    id: 'main',
    name: 'ראשי',
    views: ['dashboard', 'properties', 'clients'],
    commands: [
      nav('dashboard', 'לוח בקרה', House, ['דשבורד', 'סטטיסטיקות', 'ראשי', 'home']),
      nav('properties', 'נכסים', Buildings, ['דירות', 'בתים', 'מקרקעין']),
      nav('clients', 'לקוחות', Users, ['קונים', 'מוכרים', 'אנשי קשר']),
      {
        id: 'action.new-property',
        label: 'שומה חדשה',
        keywords: ['חדש', 'נכס', 'שומה', 'הוסף', 'new', 'create'],
        icon: Plus,
        group: 'action',
        shortcut: 'Ctrl+Shift+N',
        execute: () => {
          bus.emit('nav:navigate', 'properties')
          // The properties view listens for create mode
        },
      },
    ],
  })

  // ── Valuations module ─────────────────────────────────────────── 
  moduleRegistry.register({
    id: 'valuations',
    name: 'שומות',
    views: [
      'data-gov-valuation', 'quicker', 'residential-valuation',
      'commercial-valuation', 'land-valuation', 'office-valuation',
      'betterment-levy', 'calculators',
    ],
    commands: [
      nav('data-gov-valuation', '🇮🇱 שמאות ממשלתית (Data.gov)', Calculator, ['ממשלה', 'data.gov.il', 'API']),
      nav('quicker', 'QUICKER — שומה מהירה', Lightning, ['מהיר', 'חישוב', 'שטח']),
      nav('residential-valuation', 'שווי דירות מגורים', House, ['דירות', 'מגורים', 'nadlan']),
      nav('commercial-valuation', 'שווי נכסי מסחר', Briefcase, ['מסחר', 'חנויות', 'NOI']),
      nav('land-valuation', 'שווי קרקעות', ChartLineUp, ['קרקע', 'מגרש', 'זכויות בנייה']),
      nav('betterment-levy', 'היטל השבחה', Scales, ['היטל', 'השבחה', 'תב"ע']),
      nav('calculators', 'מחשבונים נוספים', Calculator, ['חישוב', 'התאמות', 'נוסחאות']),
    ],
  })

  // ── Market Analysis module ──────────────────────────────────────
  moduleRegistry.register({
    id: 'market-analysis',
    name: 'ניתוח שוק',
    views: [
      'insights', 'transactions-map', 'rental-analysis',
      'property-comparison', 'market-heatmap', 'anomaly-detector', 'valuation-assistant',
      'gisn-viewer', 'gisn-diff', 'gisn-arcgis', 'gisn-doc-scanner',
      'taba-extractor', 'data-gov-check', 'ocr-helper', 'ingestion-helper',
    ],
    commands: [
      nav('insights', 'ניתוח ותובנות', ChartBar, ['מגמות', 'גרפים', 'AI', 'חיזוי']),
      nav('transactions-map', 'מפת עסקאות ארצית', MapTrifold, ['מפה', 'ישראל', 'גאוגרפי']),
      nav('property-comparison', 'השוואת נכסים', ArrowsLeftRight, ['השוואה', 'דומים', 'מקביל', 'התאמות']),
      nav('market-heatmap', 'מפת חום — השקעות', ThermometerHot, ['חם', 'קר', 'השקעה', 'תשואה', 'סיכון']),
      nav('anomaly-detector', 'גלאי חריגות', Detective, ['חריג', 'הונאה', 'חשוד', 'מחיר', 'אזהרה']),
      nav('valuation-assistant', 'עוזר שמאות AI', Scales, ['שומה', 'AI', 'השוואות', 'שווי', 'מוערך']),
      nav('rental-analysis', 'ניתוח שכירות', Calculator, ['שכירות', 'דמי שכירות']),
      nav('gisn-viewer', 'מסמכי תב"ע (GISN)', FileText, ['תב"ע', 'תכנון', 'PDF']),
      nav('gisn-diff', 'השוואת תב"ע', ArrowsLeftRight, ['השוואה', 'GISN', 'diff']),
      nav('gisn-arcgis', 'ArcGIS תכניות', MapTrifold, ['ArcGIS', 'שכבות', 'גוש']),
    ],
  })

  // ── Fieldwork module ────────────────────────────────────────────
  moduleRegistry.register({
    id: 'fieldwork',
    name: 'עבודת שטח',
    views: ['smart-inspection', 'visit-manager', 'voice-report', 'before-after', 'ai-photo-analysis'],
    commands: [
      nav('smart-inspection', 'ביקור חכם בנכס', Camera, ['צילום', 'ביקור', 'צ\'ק ליסט', 'מדידה', 'ליקויים']),
      nav('visit-manager', 'ניהול ביקורים', CalendarBlank, ['לוח שנה', 'פגישות', 'תיאום', 'מעקב']),
      nav('voice-report', 'דוח קולי', Microphone, ['קול', 'הקלטה', 'תמלול', 'דיבור', 'AI']),
      nav('before-after', 'לפני / אחרי', Image, ['שיפוץ', 'השוואה', 'צילום', 'תיקון']),
      nav('ai-photo-analysis', 'ניתוח תמונות AI', Camera, ['AI', 'תמונה', 'ליקוי', 'זיהוי', 'שיפוץ', 'עלות']),
    ],
  })

  // ── Management module ───────────────────────────────────────────
  moduleRegistry.register({
    id: 'management',
    name: 'ניהול',
    views: ['cases', 'tasks', 'income-report', 'standardized', 'portal', 'business'],
    commands: [
      nav('cases', 'ניהול תיקים', FolderOpen, ['פרויקטים', 'תיקים', 'מעקב']),
      nav('tasks', 'משימות', FileText, ['משימות', 'סטטוס', 'עדיפות']),
      nav('income-report', 'דוח הכנסות', CurrencyDollar, ['הכנסות', 'חשבוניות']),
      nav('standardized', 'דוחות תקניים', FileText, ['תקן', 'בנק', 'בית משפט']),
      nav('business', 'ניהול עסקי', CurrencyDollar, ['הוצאות', 'רווחיות']),
    ],
  })

  // ── Settings module ─────────────────────────────────────────────
  moduleRegistry.register({
    id: 'settings',
    name: 'הגדרות',
    views: ['branding', 'api-settings'],
    commands: [
      nav('branding', 'מיתוג ועיצוב', Palette, ['לוגו', 'צבעים', 'PDF']),
      nav('api-settings', 'חיבורי נתונים', Key, ['API', 'מפתחות', 'iPlan']),
    ],
  })

  // ── AI commands (cross-cutting) ─────────────────────────────────
  moduleRegistry.register({
    id: 'ai',
    name: 'בינה מלאכותית',
    commands: [
      {
        id: 'ai.market-summary',
        label: 'AI — סיכום שוק',
        keywords: ['AI', 'סיכום', 'שוק', 'מגמות', 'בינה מלאכותית'],
        icon: Robot,
        group: 'ai',
        execute: () => bus.emit('nav:navigate', 'ai-insights'),
      },
      {
        id: 'ai.search-transactions',
        label: 'חיפוש עסקאות ארצי',
        keywords: ['חיפוש', 'עסקאות', 'ישראל', 'נדלן', 'search'],
        icon: MagnifyingGlass,
        group: 'data',
        execute: () => bus.emit('nav:navigate', 'transactions-map'),
      },
    ],
  })
}
