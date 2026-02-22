import { useState, useEffect, useCallback, useRef, lazy, Suspense, type ReactNode } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Property, Client } from '@/lib/types'
import type { ViewId } from '@/lib/viewRegistry'
import { generateMockProperties, generateMockClients } from '@/lib/mockData'
import { Dashboard } from '@/components/Dashboard'
import { Toaster } from '@/components/ui/sonner'
import { AppHeader } from '@/components/app/AppHeader'
import { AppSidebar } from '@/components/app/AppSidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { CardGridSkeleton } from '@/components/ui/content-skeleton'
import { ViewErrorBoundary } from '@/components/ViewErrorBoundary'
import { useNavigation } from '@/hooks/useNavigation'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { House } from '@phosphor-icons/react'

// ── Platform architecture ────────────────────────────────────────
import { bus } from '@/core/eventBus'
import { registerCoreModules } from '@/core/modules'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { CommandPalette } from '@/components/app/CommandPalette'
import { useActivityLog } from '@/core/activityService'

// ── Lazy-loaded tab components ──────────────────────────────────────
const ClientManager = lazy(() => import('@/components/ClientManager').then(m => ({ default: m.ClientManager })))
const MarketInsights = lazy(() => import('@/components/MarketInsights').then(m => ({ default: m.MarketInsights })))
const ClientPortal = lazy(() => import('@/components/ClientPortal').then(m => ({ default: m.ClientPortal })))
const ClientPortalManagement = lazy(() => import('@/components/ClientPortalManagement').then(m => ({ default: m.ClientPortalManagement })))
const BusinessManagement = lazy(() => import('@/components/BusinessManagement').then(m => ({ default: m.BusinessManagement })))
const PropertyDigitalTwin = lazy(() => import('@/components/PropertyDigitalTwin').then(m => ({ default: m.PropertyDigitalTwin })))
const LiveDataConnections = lazy(() => import('@/components/LiveDataConnections').then(m => ({ default: m.LiveDataConnections })))
const TeamCollaboration = lazy(() => import('@/components/TeamCollaboration').then(m => ({ default: m.TeamCollaboration })))
const DevelopmentRightsCalculator = lazy(() => import('@/components/DevelopmentRightsCalculator').then(m => ({ default: m.DevelopmentRightsCalculator })))
const EmailSequences = lazy(() => import('@/components/EmailSequences').then(m => ({ default: m.EmailSequences })))
const PropertiesTab = lazy(() => import('@/components/app/PropertiesTab').then(m => ({ default: m.PropertiesTab })))
const ValuationEngineTester = lazy(() => import('@/components/ValuationEngineTester').then(m => ({ default: m.ValuationEngineTester })))
const BrandingSettingsTab = lazy(() => import('@/components/BrandingSettingsTab').then(m => ({ default: m.BrandingSettingsTab })))
const BulkValuation = lazy(() => import('@/components/BulkValuation').then(m => ({ default: m.BulkValuation })))
const EmailHistory = lazy(() => import('@/components/EmailHistory').then(m => ({ default: m.EmailHistory })))
const CaseManagement = lazy(() => import('@/components/CaseManagement').then(m => ({ default: m.CaseManagement })))
const StandardizedReports = lazy(() => import('@/components/StandardizedReports').then(m => ({ default: m.StandardizedReports })))
const MultiUnitManager = lazy(() => import('@/components/MultiUnitManager').then(m => ({ default: m.MultiUnitManager })))
const TeamManagement = lazy(() => import('@/components/TeamManagement').then(m => ({ default: m.TeamManagement })))
const AuditTrail = lazy(() => import('@/components/AuditTrail').then(m => ({ default: m.AuditTrail })))
const AIInsights = lazy(() => import('@/components/AIInsights').then(m => ({ default: m.AIInsights })))
const TransactionImporter = lazy(() => import('@/components/TransactionImporter').then(m => ({ default: m.TransactionImporter })))
const AutomatedReports = lazy(() => import('@/components/AutomatedReports').then(m => ({ default: m.AutomatedReports })))
const ProfessionalCalculators = lazy(() => import('@/components/ProfessionalCalculators').then(m => ({ default: m.ProfessionalCalculators })))
const MultiUnitDistributionCalculator = lazy(() => import('@/components/MultiUnitDistributionCalculator').then(m => ({ default: m.MultiUnitDistributionCalculator })))
const RentalDataManager = lazy(() => import('@/components/RentalDataManager').then(m => ({ default: m.RentalDataManager })))
const RentalAnalyzer = lazy(() => import('@/components/RentalAnalyzer').then(m => ({ default: m.RentalAnalyzer })))
const BettermentLevyCalculator = lazy(() => import('@/components/BettermentLevyCalculator').then(m => ({ default: m.BettermentLevyCalculator })))
const PropertyHistoricalSearch = lazy(() => import('@/components/PropertyHistoricalSearch').then(m => ({ default: m.PropertyHistoricalSearch })))
const MarketDataSync = lazy(() => import('@/components/MarketDataSync').then(m => ({ default: m.MarketDataSync })))
const APIAuthSettings = lazy(() => import('@/components/APIAuthSettings').then(m => ({ default: m.APIAuthSettings })))
const APIUsageAnalytics = lazy(() => import('@/components/APIUsageAnalytics').then(m => ({ default: m.APIUsageAnalytics })))
const APIQuotaManager = lazy(() => import('@/components/APIQuotaManager').then(m => ({ default: m.APIQuotaManager })))
const OfficeValuationCalculator = lazy(() => import('@/components/OfficeValuationCalculator').then(m => ({ default: m.OfficeValuationCalculator })))
const QuickerCalculator = lazy(() => import('@/components/QuickerCalculator').then(m => ({ default: m.QuickerCalculator })))
const ResidentialValuationCalculator = lazy(() => import('@/components/ResidentialValuationCalculator').then(m => ({ default: m.ResidentialValuationCalculator })))
const CommercialValuationCalculator = lazy(() => import('@/components/CommercialValuationCalculator').then(m => ({ default: m.CommercialValuationCalculator })))
const LandValuationCalculator = lazy(() => import('@/components/LandValuationCalculator').then(m => ({ default: m.LandValuationCalculator })))
const RealBuildingRightsViewer = lazy(() => import('@/components/RealBuildingRightsViewer').then(m => ({ default: m.RealBuildingRightsViewer })))
const TransactionsMap = lazy(() => import('@/components/TransactionsMap').then(m => ({ default: m.TransactionsMap })))
const DataGovValuation = lazy(() => import('@/components/DataGovValuation').then(m => ({ default: m.DataGovValuation })))
const GISNViewer = lazy(() => import('@/components/GISNViewer').then(m => ({ default: m.GISNViewer })))
const GISNDiff = lazy(() => import('@/components/GISNDiff').then(m => ({ default: m.GISNDiff })))
const GISNArcGIS = lazy(() => import('@/components/GISNArcGIS').then(m => ({ default: m.GISNArcGIS })))
const TabaExtractor = lazy(() => import('@/components/TabaExtractor').then(m => ({ default: m.TabaExtractor })))
const GISNDocScanner = lazy(() => import('@/components/GISNDocScanner'))
const OCRHelper = lazy(() => import('@/components/OCRHelper'))
const IngestionHelper = lazy(() => import('@/components/IngestionHelper'))
const DataGovResourceCheck = lazy(() => import('@/components/DataGovResourceCheck'))
const TasksDashboard = lazy(() => import('@/components/TasksDashboard'))
const IncomeReport = lazy(() => import('@/components/IncomeReport'))

// ── Fieldwork & Advanced Analysis ─────────────────────────────────
const SmartInspection = lazy(() => import('@/components/SmartInspection').then(m => ({ default: m.SmartInspection })))
const VisitManager = lazy(() => import('@/components/VisitManager').then(m => ({ default: m.VisitManager })))
const VoiceReport = lazy(() => import('@/components/VoiceReport').then(m => ({ default: m.VoiceReport })))
const BeforeAfterComparison = lazy(() => import('@/components/BeforeAfterComparison').then(m => ({ default: m.BeforeAfterComparison })))
const PropertyComparison = lazy(() => import('@/components/PropertyComparison').then(m => ({ default: m.PropertyComparison })))
const MarketHeatmap = lazy(() => import('@/components/MarketHeatmap').then(m => ({ default: m.MarketHeatmap })))
const AnomalyDetector = lazy(() => import('@/components/AnomalyDetector').then(m => ({ default: m.AnomalyDetector })))
const AIPhotoAnalysis = lazy(() => import('@/components/AIPhotoAnalysis').then(m => ({ default: m.AIPhotoAnalysis })))
const ValuationAssistant = lazy(() => import('@/components/ValuationAssistant').then(m => ({ default: m.ValuationAssistant })))
const AIComparableReportStudio = lazy(() => import('@/components/AIComparableReportStudioLive').then(m => ({ default: m.AIComparableReportStudioLive })))

function App() {
  const [properties, setProperties] = useKV<Property[]>('properties', generateMockProperties())
  const [clients, setClients] = useKV<Client[]>('clients', generateMockClients())
  const { activeView, navigate } = useNavigation()
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isCreatingProperty, setIsCreatingProperty] = useState(false)
  const [isClientPortalMode, setIsClientPortalMode] = useState(false)
  const [rtl, setRtl] = useKV<boolean>('rtl', true)

  // ── Platform architecture hooks ─────────────────────────────────
  const commandPalette = useCommandPalette()
  useActivityLog()                // activate audit recording

  // Register modules once
  const registered = useRef(false)
  useEffect(() => {
    if (!registered.current) {
      registerCoreModules()
      registered.current = true
    }
  }, [])

  // Bridge: bus navigation events → useNavigation
  useEffect(() => {
    const off = bus.on('nav:navigate', (viewId) => {
      navigate(viewId)
    })
    return off
  }, [navigate])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('portal') === 'true') {
      setIsClientPortalMode(true)
    }
  }, [])

  // ── Property CRUD handlers ──────────────────────────────────────
  const handleSaveProperty = useCallback((property: Property) => {
    setProperties((current) => {
      const arr = current || []
      const index = arr.findIndex(p => p.id === property.id)
      if (index >= 0) {
        const updated = [...arr]
        updated[index] = property
        return updated
      }
      return [...arr, property]
    })
    setIsCreatingProperty(false)
    setSelectedProperty(null)
  }, [setProperties])

  const handleDeleteProperty = useCallback((id: string) => {
    setProperties((current) => (current || []).filter(p => p.id !== id))
    setSelectedProperty(null)
  }, [setProperties])

  const handleSelectProperty = useCallback((property: Property) => {
    setSelectedProperty(property)
    navigate('properties')
  }, [navigate])

  const handleCreateNew = useCallback(() => {
    setSelectedProperty(null)
    setIsCreatingProperty(true)
    navigate('properties')
  }, [navigate])

  // ── Shared data refs (avoid re-creating || [] on every render) ──
  const safeProperties = properties || []
  const safeClients = clients || []

  // ── Client portal mode ──────────────────────────────────────────
  if (isClientPortalMode) {
    return (
      <>
        <Suspense fallback={<CardGridSkeleton count={3} />}>
          <ClientPortal 
            clients={safeClients} 
            properties={safeProperties}
            onBackToAdmin={() => {
              setIsClientPortalMode(false)
              window.history.replaceState({}, '', window.location.pathname)
            }}
          />
        </Suspense>
        <Toaster />
      </>
    )
  }

  // ── View renderer (declarative map replaces giant switch) ───────
  const viewRenderers: Record<ViewId, () => ReactNode> = {
    dashboard: () => (
      <Dashboard
        properties={safeProperties}
        clients={safeClients}
        onSelectProperty={handleSelectProperty}
        onCreateNew={handleCreateNew}
      />
    ),
    properties: () => (
      <PropertiesTab
        properties={safeProperties}
        clients={safeClients}
        selectedProperty={selectedProperty}
        isCreatingProperty={isCreatingProperty}
        onSelectProperty={(property) => setSelectedProperty(property)}
        onCreateNew={handleCreateNew}
        onBackToList={() => {
          setSelectedProperty(null)
          setIsCreatingProperty(false)
        }}
        onStartEditing={(property) => {
          setSelectedProperty(property)
          setIsCreatingProperty(true)
        }}
        onSaveProperty={handleSaveProperty}
        onDeleteProperty={handleDeleteProperty}
      />
    ),
    clients: () => (
      <ClientManager
        clients={safeClients}
        properties={safeProperties}
        onUpdateClients={setClients}
        onSelectProperty={handleSelectProperty}
      />
    ),
    insights: () => <MarketInsights properties={safeProperties} />,
    bulk: () => <BulkValuation properties={safeProperties} onUpdateProperty={handleSaveProperty} />,
    email: () => <EmailHistory />,
    sequences: () => <EmailSequences />,
    business: () => <BusinessManagement properties={safeProperties} clients={safeClients} />,
    portal: () => <ClientPortalManagement clients={safeClients} properties={safeProperties} onSelectProperty={handleSelectProperty} />,
    tester: () => <ValuationEngineTester />,
    branding: () => <BrandingSettingsTab />,
    'digital-twin': () => safeProperties.length > 0 ? (
      <PropertyDigitalTwin property={safeProperties[0]} />
    ) : (
      <EmptyState
        icon={<House size={32} weight="duotone" />}
        title="אין נכסים להצגה"
        description="הוסף נכס ראשון כדי להפעיל את התצוגה התלת-ממדית"
      />
    ),
    'data-sources': () => <LiveDataConnections />,
    team: () => <TeamCollaboration />,
    development: () => <DevelopmentRightsCalculator />,
    cases: () => <CaseManagement properties={safeProperties} clients={safeClients} />,
    tasks: () => <TasksDashboard />,
    'income-report': () => <IncomeReport />,
    standardized: () => <StandardizedReports properties={safeProperties} clients={safeClients} />,
    'multi-unit': () => <MultiUnitManager />,
    'team-manage': () => <TeamManagement />,
    audit: () => <AuditTrail />,
    'ai-insights': () => <AIInsights />,
    import: () => <TransactionImporter />,
    'automated-reports': () => <AutomatedReports />,
    calculators: () => <ProfessionalCalculators properties={safeProperties} onUpdateProperty={handleSaveProperty} />,
    distribution: () => <MultiUnitDistributionCalculator />,
    'rental-data': () => <RentalDataManager />,
    'rental-analysis': () => <RentalAnalyzer />,
    'betterment-levy': () => <BettermentLevyCalculator />,
    'historical-search': () => <PropertyHistoricalSearch />,
    'market-sync': () => <MarketDataSync />,
    'api-settings': () => <APIAuthSettings />,
    'api-analytics': () => <APIUsageAnalytics />,
    'api-quota': () => <APIQuotaManager />,
    'office-valuation': () => <OfficeValuationCalculator />,
    'residential-valuation': () => <ResidentialValuationCalculator />,
    'commercial-valuation': () => <CommercialValuationCalculator />,
    'land-valuation': () => <LandValuationCalculator />,
    quicker: () => <QuickerCalculator />,
    'real-building-rights': () => <RealBuildingRightsViewer />,
    'transactions-map': () => <TransactionsMap />,
    'gisn-viewer': () => <GISNViewer />,
    'gisn-diff': () => <GISNDiff />,
    'gisn-arcgis': () => <GISNArcGIS />,
    'gisn-doc-scanner': () => <GISNDocScanner />,
    'ocr-helper': () => <OCRHelper />,
    'ingestion-helper': () => <IngestionHelper />,
    'data-gov-check': () => <DataGovResourceCheck />,
    'taba-extractor': () => <TabaExtractor />,
    // ── Fieldwork ──────────────────────────────────────────────────
    'smart-inspection': () => <SmartInspection />,
    'visit-manager': () => <VisitManager />,
    'voice-report': () => <VoiceReport />,
    'before-after': () => <BeforeAfterComparison />,
    // ── Advanced Analysis ─────────────────────────────────────────
    'property-comparison': () => <PropertyComparison />,
    'market-heatmap': () => <MarketHeatmap />,
    'anomaly-detector': () => <AnomalyDetector />,
    'ai-photo-analysis': () => <AIPhotoAnalysis />,
    'valuation-assistant': () => <ValuationAssistant />,
    'ai-comparable-report': () => <AIComparableReportStudio />,
    'data-gov-valuation': () => (
      <div className="space-y-6">
        <PageHeader
          title="🇮🇱 שמאות עם Data.gov.il"
          description="שמאות מקצועית מבוססת נתונים אמיתיים ממאגרי הממשלה הישראלית"
        />
        <DataGovValuation propertyId="demo-property" initialCity="" initialStreet="" initialArea={0} />
      </div>
    ),
  }

  const renderView = viewRenderers[activeView] ?? viewRenderers.dashboard

  // ── Determine if RTL is on (fix: `rtl` can be undefined from KV) ──
  const isRtl = rtl ?? true

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full flex-row-reverse" dir={isRtl ? 'rtl' : 'ltr'}>
        <AppSidebar activeView={activeView} onNavigate={navigate} />

        <div className="flex-1 flex flex-col relative min-w-0">
          <AppHeader onCreateNew={handleCreateNew} rtl={isRtl} onToggleRTL={() => setRtl(prev => !prev)} />

          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-[1400px] px-6 py-8 sm:px-8 lg:px-10 animate-fade-in">
              <ViewErrorBoundary viewKey={activeView}>
                <Suspense fallback={<CardGridSkeleton count={3} />}>
                  {renderView()}
                </Suspense>
              </ViewErrorBoundary>
            </div>
          </main>
        </div>

        <Toaster richColors closeButton position={isRtl ? 'bottom-left' : 'bottom-right'} />

        {/* ── Platform overlays ──────────────────────────────────── */}
        <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} />
      </div>
    </SidebarProvider>
  )
}

export default App
