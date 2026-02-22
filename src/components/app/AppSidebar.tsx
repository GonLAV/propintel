import { useMemo, useState } from 'react'
import type { ViewId } from '@/lib/viewRegistry'
import { 
  House, 
  ChartBar, 
  Users, 
  UserCircle, 
  CurrencyDollar, 
  Palette, 
  Calculator, 
  Lightning, 
  FolderOpen, 
  FileText, 
  Buildings, 
  MagnifyingGlass,
  X,
  ChartLineUp,
  Briefcase,
  Scales,
  Key,
  MapTrifold,
  ArrowsLeftRight,
  Camera,
  CalendarBlank,
  Microphone,
  Image,
  ThermometerHot,
  Detective,
} from '@phosphor-icons/react'
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AppSidebarProps {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
}

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const menuItems = useMemo(
    () => [
      {
        title: 'ראשי',
        items: [
          { id: 'dashboard', label: 'לוח בקרה', icon: House, keywords: ['בית', 'דשבורד', 'סטטיסטיקות', 'ראשי'] },
          { id: 'properties', label: 'נכסים', icon: Buildings, keywords: ['דירות', 'בתים', 'מקרקעין', 'רכוש'] },
          { id: 'clients', label: 'לקוחות', icon: Users, keywords: ['קונים', 'מוכרים', 'משקיעים', 'אנשי קשר'] }
        ]
      },
      {
        title: 'שומות',
        items: [
          { id: 'data-gov-valuation', label: '🇮🇱 Data.gov.il - שמאות ממשלתית', icon: Calculator, keywords: ['ממשלה', 'data.gov.il', 'אמיתי', 'שקוף', 'API', 'מקצועי', 'לגיטימי'] },
          { id: 'quicker', label: 'QUICKER - שומה מהירה', icon: Lightning, keywords: ['מהיר', 'פשוט', 'בסיסי', 'חישוב', 'שטח', 'מחיר'] },
          { id: 'residential-valuation', label: 'שווי דירות מגורים', icon: House, keywords: ['דירות', 'מגורים', 'דיור', 'nadlan', 'נדלן'] },
          { id: 'commercial-valuation', label: 'שווי נכסי מסחר', icon: Briefcase, keywords: ['מסחר', 'חנויות', 'מסעדות', 'nadlan', 'נדלן', 'משרדים', 'מסחרי', 'NOI', 'היוון', 'חלל עבודה', 'אופיס'] },
          { id: 'land-valuation', label: 'שווי קרקעות', icon: ChartLineUp, keywords: ['קרקע', 'מגרש', 'זכויות בנייה', 'nadlan', 'נדלן'] },
          { id: 'betterment-levy', label: 'היטל השבחה', icon: Scales, keywords: ['היטל', 'השבחה', 'תכנון', 'זכויות', 'תב"ע', 'מועד קובע'] },
          { id: 'calculators', label: 'מחשבונים נוספים', icon: Calculator, keywords: ['חישוב', 'התאמות', 'נוסחאות', 'השוואה', 'בולק', 'מרובה', 'פורטפוליו', 'חלוקה', 'פיצול', 'בניין', 'דירות', 'יחידות', 'תמ"א', 'פינוי בינוי'] }
        ]
      },
      {
        title: 'עבודת שטח',
        items: [
          { id: 'smart-inspection', label: 'ביקור חכם בנכס', icon: Camera, keywords: ['צילום', 'ביקור', 'צ\'ק ליסט', 'מדידה', 'ליקויים', 'שטח', 'תיעוד'] },
          { id: 'visit-manager', label: 'ניהול ביקורים', icon: CalendarBlank, keywords: ['לוח שנה', 'פגישות', 'תיאום', 'מעקב', 'שטח'] },
          { id: 'voice-report', label: 'דוח קולי', icon: Microphone, keywords: ['קול', 'הקלטה', 'תמלול', 'דיבור', 'AI', 'דוח'] },
          { id: 'before-after', label: 'לפני / אחרי', icon: Image, keywords: ['שיפוץ', 'השוואה', 'צילום', 'תיקון', 'מצב'] },
          { id: 'ai-photo-analysis', label: 'ניתוח תמונות AI', icon: Camera, keywords: ['AI', 'תמונה', 'ליקוי', 'זיהוי', 'שיפוץ', 'עלות', 'מצלמה'] },
        ]
      },
      {
        title: 'ניתוח שוק',
        items: [
          { id: 'insights', label: 'ניתוח ותובנות', icon: ChartBar, keywords: ['מגמות', 'סטטיסטיקות', 'נתונים', 'גרפים', 'שוק', 'AI', 'בינה מלאכותית', 'חיזוי'] },
          { id: 'transactions-map', label: 'מפת עסקאות ארצית', icon: MapTrifold, keywords: ['מפה', 'עסקאות', 'ישראל', 'גאוגרפי', 'מיקום', 'אזורי', 'ארצי', 'נדלן', 'ממשלה'] },
          { id: 'property-comparison', label: 'השוואת נכסים', icon: ArrowsLeftRight, keywords: ['השוואה', 'נכסים', 'מקביל', 'דומים', 'התאמות', 'מחיר'] },
          { id: 'market-heatmap', label: 'מפת חום — השקעות', icon: ThermometerHot, keywords: ['חם', 'קר', 'השקעה', 'תשואה', 'סיכון', 'מגמות', 'מפה'] },
          { id: 'anomaly-detector', label: 'גלאי חריגות', icon: Detective, keywords: ['חריג', 'הונאה', 'חשוד', 'מחיר', 'אזהרה', 'בדיקה'] },
          { id: 'valuation-assistant', label: 'עוזר שמאות AI', icon: Scales, keywords: ['שומה', 'AI', 'השוואות', 'שווי', 'מוערך', 'ביטחון'] },
          { id: 'ai-comparable-report', label: 'סטודיו AI השוואות ודוח', icon: ChartLineUp, keywords: ['comparables', 'דוח', 'court', 'bank', 'adjustments', 'KNN', 'AI', 'שומה'] },
          { id: 'rental-analysis', label: 'ניתוח שכירות', icon: Calculator, keywords: ['שכירות', 'חישוב', 'התאמות', 'השוואה', 'מחיר', 'דמי שכירות', 'נתונים', 'מאגר', 'עסקאות'] },
          { id: 'gisn-viewer', label: 'מסמכי תב"ע (GISN)', icon: FileText, keywords: ['תב"ע', 'תכנון', 'GISN', 'תיק מידע', 'PDF', 'תל אביב', 'גוש', 'חלקה', 'iView'] },
          { id: 'gisn-diff', label: 'השוואת תב"ע (GISN)', icon: ArrowsLeftRight, keywords: ['תב"ע', 'השוואה', 'חדש', 'ישן', '6400', 'GISN', 'diff'] },
          { id: 'gisn-arcgis', label: 'ArcGIS תכניות (TLV)', icon: MapTrifold, keywords: ['ArcGIS', 'TLV', 'query', 'שכבות', 'תכניות', 'גוש', 'חלקה'] },
          { id: 'gisn-doc-scanner', label: 'סריקת מסמכי GISN', icon: FileText, keywords: ['GISN', 'Docs.aspx', 'PDF', 'סריקה', 'קישורים'] },
          { id: 'ingestion-helper', label: 'עזר אינדוקס PDF', icon: FileText, keywords: ['אינדקס', 'ingest', 'PDF', 'כלים', 'מקומי'] },
          { id: 'ocr-helper', label: 'OCR לא מאומת', icon: FileText, keywords: ['OCR', 'טקסט', 'PDF', 'תמונה', 'זיהוי'] },
          { id: 'data-gov-check', label: 'בדיקת משאב Data.gov.il', icon: FileText, keywords: ['CKAN', 'resource', 'valid', 'data.gov.il'] },
          { id: 'taba-extractor', label: 'חילוץ הוראות תב"ע', icon: FileText, keywords: ['TABA', 'חילוץ', 'הוראות', 'JSON', 'OCR'] }
        ]
      },
      {
        title: 'ניהול',
        items: [
          { id: 'cases', label: 'ניהול תיקים', icon: FolderOpen, keywords: ['פרויקטים', 'תיקים', 'מעקב', 'סטטוס', 'משימות'] },
          { id: 'tasks', label: 'משימות', icon: FileText, keywords: ['משימות', 'סטטוס', 'עדיפות', 'מעקב', 'צוות'] },
          { id: 'income-report', label: 'דוח הכנסות', icon: CurrencyDollar, keywords: ['הכנסות', 'תשלומים', 'חשבוניות', 'כסף', 'עסקי'] },
          { id: 'standardized', label: 'דוחות תקניים', icon: FileText, keywords: ['תקן', 'רשמי', 'בנק', 'בית משפט', 'דוח', 'מסמכים'] },
          { id: 'portal', label: 'פורטל לקוחות', icon: UserCircle, keywords: ['לקוח', 'גישה', 'שיתוף', 'צפייה', 'פורטל', 'תקשורת', 'מייל', 'דוחות'] },
          { id: 'business', label: 'ניהול עסקי', icon: CurrencyDollar, keywords: ['הכנסות', 'הוצאות', 'רווחיות', 'כסף', 'עסק', 'צוות', 'הרשאות'] }
        ]
      },
      {
        title: 'הגדרות',
        items: [
          { id: 'branding', label: 'מיתוג ועיצוב', icon: Palette, keywords: ['עיצוב', 'לוגו', 'צבעים', 'גופנים', 'PDF'] },
          { id: 'api-settings', label: 'חיבורי נתונים', icon: Key, keywords: ['אימות', 'מפתחות', 'API', 'הגדרות', 'חיבורים', 'iPlan', 'Mavat', 'GovMap', 'ממשלה', 'אבטחה', 'נדל"ן', 'סנכרון', 'ייבוא', 'ממשלתי', 'זכויות בנייה', 'תכנון', 'היתרים'] }
        ]
      }
    ],
    []
  )

  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems

    const query = searchQuery.toLowerCase().trim()
    
    return menuItems
      .map(group => ({
        ...group,
        items: group.items.filter(item => 
          item.label.toLowerCase().includes(query) ||
          item.keywords?.some(keyword => keyword.toLowerCase().includes(query))
        )
      }))
      .filter(group => group.items.length > 0)
  }, [menuItems, searchQuery])

  return (
    <Sidebar collapsible="icon" side="right" className="border-l border-black/[0.08] bg-white">
      <SidebarHeader className="px-4 py-4.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <House weight="fill" className="text-white" size={18} />
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="font-semibold text-[15px] tracking-tight text-[#1d1d1f]">
              AppraisalPro
            </h2>
            <p className="text-[12px] text-black/40">
              מערכת שמאות מקצועית
            </p>
          </div>
        </div>

        <div className="mt-3 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <MagnifyingGlass 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" 
              size={16} 
            />
            <Input
              type="text"
              placeholder="חיפוש..."
              aria-label="חיפוש ניווט"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl border-black/8 bg-black/[0.03] pr-9 pl-3 text-[13px] text-[#1d1d1f] placeholder:text-black/30 shadow-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/30 transition-colors"
            />
            {searchQuery && (
                <Button
                variant="ghost"
                size="icon"
                aria-label="נקה חיפוש"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} className="text-black/30" />
              </Button>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 border-t border-black/[0.06]">
        <ScrollArea className="h-full">
          {filteredMenuItems.length === 0 ? (
            <div className="text-center py-12 px-4 group-data-[collapsible=icon]:hidden">
              <MagnifyingGlass size={28} className="text-black/20 mx-auto mb-2" weight="duotone" />
              <p className="text-sm text-black/35">
                לא נמצאו תוצאות
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMenuItems.map((group) => (
                <SidebarGroup key={group.title}>
                  <SidebarGroupLabel className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-black/30 group-data-[collapsible=icon]:hidden">
                    {group.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeView === item.id
                        
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => {
                                onNavigate(item.id as ViewId)
                                setSearchQuery('')
                              }}
                              isActive={isActive}
                              aria-current={isActive ? 'page' : undefined}
                              className={
                                `relative h-9 w-full rounded-xl px-3 transition-all duration-150 ` +
                                (isActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-[#6e6e73] hover:bg-black/[0.04] hover:text-[#1d1d1f]')
                              }
                              tooltip={item.label}
                            >
                              {isActive && (
                                <span
                                  className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                                  aria-hidden
                                />
                              )}
                              <Icon 
                                size={18} 
                                weight={isActive ? 'fill' : 'regular'}
                              />
                              <span className="group-data-[collapsible=icon]:hidden text-sm leading-5">
                                {item.label}
                              </span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </div>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-black/[0.06] p-3 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between text-[11px] text-black/30">
          <span>v2.0</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span>מקוון</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
