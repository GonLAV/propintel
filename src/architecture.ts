/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              AppraisalPro — System Architecture & Roadmap           ║
 * ║   מערכת שמאות מקצועית — ארכיטקטורה, תכנון, ו-Roadmap לייצור       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * This file is the single source of truth for:
 *   1. Existing product analysis
 *   2. System architecture (mobile, backend, DB, AI, offline)
 *   3. API design
 *   4. Database schema
 *   5. Execution roadmap: MVP → Beta → Production
 *   6. Missing features & AI opportunities
 *
 * It is a .ts file so it's statically checked and importable.
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 1  EXISTING PRODUCT ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PRODUCT_ANALYSIS = {
  coreFeatures: [
    'Dashboard with portfolio KPIs & activity feed',
    '58 navigable views covering valuations, fieldwork, market, management',
    '7 valuation calculators (residential, commercial, land, office, betterment levy, quick, bulk)',
    'Government data integration (data.gov.il, GISN, ArcGIS, TABA)',
    'Smart field inspection with checklists, photo capture, measurements',
    'Voice-to-report using Web Speech API + AI structuring',
    'Before/after renovation photo slider with value impact',
    'Market heatmap for investment scoring',
    'Price anomaly detector for fraud/outlier detection',
    'Visit scheduler with calendar + status pipeline',
    'Property comparison engine with auto-adjustments',
    'PDF report generation (jspdf + html2canvas)',
    'Client portal & case management',
    'Command palette (⌘K) for power-user navigation',
    'Event-driven architecture (EventBus, ModuleRegistry)',
    'Full Hebrew RTL UI with Tailwind v4',
  ],

  hiddenWorkflows: [
    'Appraiser opens Dashboard → picks property → runs valuation → generates PDF → emails client',
    'Field visit: schedule → drive → inspect with SmartInspection → voice-dictate report → review AI output → finalize',
    'Market research: search transactions map → compare 3-4 properties → check anomalies → write insights',
    'Government data: pull GISN plans → OCR documents → extract TABA provisions → calculate betterment levy',
    'Bulk operations: import transactions → run bulk valuation → export standardized reports',
    'Team flow: assign case → set status → track audit trail → manage team permissions',
  ],

  uxStrengths: [
    'Hebrew-first, RTL-native design — no afterthought localization',
    'Command palette (⌘K) for power users — keyboard-driven workflow',
    'Consistent shadcn/Radix component library across all views',
    'Lazy-loaded views with skeleton placeholders — fast initial load',
    'Search-filterable sidebar with keyword matching',
    'Toast notifications with Sonner (rich, closeable, positioned for RTL)',
  ],

  uxWeaknesses: [
    'No onboarding / empty-state guidance for new users',
    'No breadcrumbs — users lose context when deep in a workflow',
    '19 orphan views with no sidebar entry — discoverable only via ⌘K',
    'No mobile-responsive layout — sidebar breaks on small screens',
    'No keyboard shortcuts beyond ⌘K — no Ctrl+S to save, Ctrl+P to print',
    'Heatmap uses cards instead of an actual geographic map visualization',
    'Anomaly detector relies on hardcoded sample data, no real statistical engine',
    'No undo/redo for destructive operations (delete property, delete client)',
    'No dark mode toggle (theme tokens exist but no switcher)',
  ],

  architectureAssumptions: [
    'Frontend-only SPA — all state in Spark KV (IndexedDB-backed via GitHub Spark)',
    'No traditional backend — Spark handles persistence',
    'AI calls via window.spark.llm() — no direct OpenAI/Anthropic API needed',
    'Government APIs called client-side (CORS via data.gov.il open endpoints)',
    'No authentication layer — assumes single-user or team-shared Spark instance',
    'No offline-first strategy (just added: offlineManager.ts but no service worker yet)',
  ],

  monetizationModel: {
    current: 'None — open-source / internal tool',
    proposed: [
      'Freemium: 5 free valuations/month → ₪149/mo for unlimited',
      'Per-report: ₪29 per professional PDF report with government data',
      'Team tier: ₪499/mo for 5 appraisers + admin panel + audit trail',
      'Enterprise: Custom pricing for appraisal firms with SLA + on-prem option',
      'Data marketplace: Sell anonymized market insights to investors/developers',
    ],
  },
} as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 2  RECOMMENDED FOLDER STRUCTURE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FOLDER_STRUCTURE = `
shumagon-goni/
├── public/                     # Static assets (favicon, manifest, JSON indexes)
├── src/
│   ├── main.tsx                # Entry: Spark init, ErrorBoundary, CSS
│   ├── App.tsx                 # Root: SidebarProvider, routing, state
│   ├── core/                   # Platform primitives (no UI)
│   │   ├── eventBus.ts         # Typed pub/sub (PlatformEvents)
│   │   ├── moduleRegistry.ts   # Plugin system (commands, modules)
│   │   ├── modules.ts          # Core module registrations
│   │   ├── repository.ts       # Generic CRUD hook over KV
│   │   ├── notifications.ts    # Notification store
│   │   └── activityService.ts  # Audit trail from events
│   ├── hooks/                  # Reusable React hooks
│   │   ├── useNavigation.ts    # Hash-based view routing
│   │   ├── useCommandPalette.ts# ⌘K keyboard listener
│   │   ├── useGeolocation.ts   # GPS + reverse geocoding ★ NEW
│   │   ├── useOfflineStatus.ts # Connectivity + sync status ★ NEW
│   │   └── use-mobile.ts       # Responsive breakpoint
│   ├── services/               # Business logic (no UI)
│   │   └── offlineManager.ts   # IndexedDB sync queue ★ NEW
│   ├── lib/                    # Pure functions, APIs, math
│   │   ├── types.ts            # 64+ shared type definitions
│   │   ├── viewRegistry.ts     # ViewId union + VIEW_GROUPS
│   │   ├── utils.ts            # cn(), uid()
│   │   ├── logger.ts           # Dev-only structured logger
│   │   ├── valuationEngine.ts  # Core valuation math
│   │   ├── professionalAVM.ts  # Advanced AVM logic
│   │   ├── dataGovAPI.ts       # data.gov.il API client
│   │   ├── calculators/        # 11 calculator modules
│   │   └── ...                 # 49 library files total
│   ├── components/
│   │   ├── app/                # App shell components
│   │   │   ├── AppHeader.tsx   # Top bar + offline indicator ★ UPGRADED
│   │   │   ├── AppSidebar.tsx  # Navigation sidebar (6 groups)
│   │   │   ├── CommandPalette.tsx # ⌘K overlay
│   │   │   └── NotificationCenter.tsx # Bell dropdown
│   │   ├── ui/                 # 49 shadcn/Radix primitives
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── SmartInspection.tsx # Field inspection workflow
│   │   ├── VoiceReport.tsx     # Speech-to-report
│   │   └── ...                 # 92 feature components total
│   └── styles/
│       └── theme.css           # oklch color tokens
├── backend/                    # Express server (optional)
│   ├── index.ts
│   └── server.mjs
├── scripts/                    # Build/data scripts
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
` as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 3  TECH STACK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const TECH_STACK = {
  frontend: {
    framework: 'React 19 + TypeScript 5.7',
    bundler: 'Vite 7.2 (SWC plugin)',
    styling: 'Tailwind CSS v4 (oklch tokens)',
    components: 'shadcn/ui + Radix UI',
    icons: '@phosphor-icons/react',
    animation: 'Framer Motion',
    charts: 'Recharts',
    forms: 'react-hook-form + zod',
    state: 'GitHub Spark KV (persistent key-value)',
    pdf: 'jspdf + html2canvas',
    ocr: 'tesseract.js',
    '3d': 'three.js (PropertyDigitalTwin)',
    speech: 'Web Speech API (SpeechRecognition)',
    offline: 'IndexedDB (offlineManager.ts) + navigator.onLine',
  },
  backend: {
    runtime: 'Node.js / Bun',
    framework: 'Express (lightweight REST)',
    database: 'PostgreSQL (recommended) or Supabase',
    cache: 'Redis (session, rate-limiting, API response cache)',
    auth: 'Supabase Auth or Auth0 (JWT)',
    storage: 'Supabase Storage or S3 (photos, PDFs)',
    queue: 'BullMQ (report generation, bulk valuations)',
    search: 'Meilisearch (property & transaction full-text)',
  },
  ai: {
    primary: 'GitHub Spark LLM (window.spark.llm)',
    fallback: 'OpenAI GPT-4 / Anthropic Claude',
    vision: 'GPT-4 Vision (photo defect analysis)',
    embedding: 'text-embedding-3-small (property similarity)',
    vectorDb: 'Supabase pgvector (comparable retrieval)',
  },
  infrastructure: {
    hosting: 'Vercel (frontend) + Railway/Fly.io (backend)',
    cdn: 'Vercel Edge / Cloudflare',
    monitoring: 'Sentry (errors) + PostHog (analytics)',
    ci: 'GitHub Actions',
  },
} as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 4  API DESIGN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const API_DESIGN = {
  prefix: '/api/v1',

  endpoints: [
    // ── Properties ─────────────────────────────────────────────────
    { method: 'GET',    path: '/properties',              desc: 'List properties (paginated, filterable)' },
    { method: 'GET',    path: '/properties/:id',          desc: 'Get single property with valuations' },
    { method: 'POST',   path: '/properties',              desc: 'Create property' },
    { method: 'PATCH',  path: '/properties/:id',          desc: 'Update property fields' },
    { method: 'DELETE', path: '/properties/:id',          desc: 'Soft-delete property' },

    // ── Valuations ─────────────────────────────────────────────────
    { method: 'POST',   path: '/valuations',              desc: 'Run valuation (returns result + comparables)' },
    { method: 'GET',    path: '/valuations/:id',          desc: 'Get stored valuation result' },
    { method: 'POST',   path: '/valuations/bulk',         desc: 'Queue bulk valuation job' },
    { method: 'GET',    path: '/valuations/bulk/:jobId',  desc: 'Check bulk job status' },

    // ── Transactions ───────────────────────────────────────────────
    { method: 'GET',    path: '/transactions',            desc: 'Search transactions (city, street, date range)' },
    { method: 'GET',    path: '/transactions/heatmap',    desc: 'Aggregated heatmap data by area' },
    { method: 'GET',    path: '/transactions/anomalies',  desc: 'Detected price anomalies' },
    { method: 'POST',   path: '/transactions/import',     desc: 'Import batch transactions (CSV/JSON)' },

    // ── Inspections ────────────────────────────────────────────────
    { method: 'GET',    path: '/inspections',             desc: 'List inspections for user' },
    { method: 'POST',   path: '/inspections',             desc: 'Create inspection record' },
    { method: 'PATCH',  path: '/inspections/:id',         desc: 'Update inspection (add photos, notes)' },
    { method: 'POST',   path: '/inspections/:id/photos',  desc: 'Upload inspection photos' },
    { method: 'POST',   path: '/inspections/:id/voice',   desc: 'Upload voice recording for AI transcription' },

    // ── Reports ────────────────────────────────────────────────────
    { method: 'POST',   path: '/reports',                 desc: 'Generate PDF report (async → job)' },
    { method: 'GET',    path: '/reports/:id',             desc: 'Download generated PDF' },
    { method: 'GET',    path: '/reports',                 desc: 'List user reports' },

    // ── Clients ────────────────────────────────────────────────────
    { method: 'GET',    path: '/clients',                 desc: 'List clients' },
    { method: 'POST',   path: '/clients',                 desc: 'Create client' },
    { method: 'PATCH',  path: '/clients/:id',             desc: 'Update client' },

    // ── AI ─────────────────────────────────────────────────────────
    { method: 'POST',   path: '/ai/analyze-photo',        desc: 'Vision AI: defect detection, room classification' },
    { method: 'POST',   path: '/ai/market-summary',       desc: 'Generate market summary for area' },
    { method: 'POST',   path: '/ai/voice-to-report',      desc: 'Transcribe + structure voice recording' },
    { method: 'POST',   path: '/ai/comparable-search',    desc: 'Semantic search for comparable properties' },

    // ── Gov Data ───────────────────────────────────────────────────
    { method: 'GET',    path: '/gov/transactions',        desc: 'Proxy to data.gov.il (cached)' },
    { method: 'GET',    path: '/gov/plans/:block/:parcel',desc: 'GISN planning documents' },
    { method: 'GET',    path: '/gov/arcgis/:layer',       desc: 'ArcGIS layer query (TLV)' },

    // ── Auth & Sync ────────────────────────────────────────────────
    { method: 'POST',   path: '/auth/login',              desc: 'Email/password login → JWT' },
    { method: 'POST',   path: '/auth/refresh',            desc: 'Refresh access token' },
    { method: 'POST',   path: '/sync/push',               desc: 'Push offline mutations' },
    { method: 'GET',    path: '/sync/pull',               desc: 'Pull changes since timestamp' },
  ],
} as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 5  DATABASE SCHEMA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DATABASE_SCHEMA = {
  tables: [
    {
      name: 'users',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'email TEXT UNIQUE NOT NULL',
        'name TEXT NOT NULL',
        'role ENUM(admin, appraiser, viewer)',
        'license_number TEXT',          // Israeli appraiser license
        'firm_name TEXT',
        'created_at TIMESTAMPTZ DEFAULT now()',
        'updated_at TIMESTAMPTZ DEFAULT now()',
      ],
    },
    {
      name: 'properties',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'user_id UUID FK → users.id',
        'address TEXT NOT NULL',
        'city TEXT NOT NULL',
        'neighborhood TEXT',
        'block TEXT',                   // גוש
        'parcel TEXT',                  // חלקה
        'sub_parcel TEXT',              // תת-חלקה
        'property_type ENUM(apartment, house, commercial, land, office)',
        'area_sqm DECIMAL(10,2)',
        'rooms DECIMAL(3,1)',
        'floor INTEGER',
        'total_floors INTEGER',
        'year_built INTEGER',
        'parking_spots INTEGER DEFAULT 0',
        'has_elevator BOOLEAN DEFAULT false',
        'has_balcony BOOLEAN DEFAULT false',
        'condition ENUM(new, excellent, good, fair, poor, needs_renovation)',
        'lat DECIMAL(10,7)',
        'lng DECIMAL(10,7)',
        'created_at TIMESTAMPTZ DEFAULT now()',
        'updated_at TIMESTAMPTZ DEFAULT now()',
        'deleted_at TIMESTAMPTZ',       // soft delete
      ],
      indexes: [
        'idx_properties_city ON (city)',
        'idx_properties_block_parcel ON (block, parcel)',
        'idx_properties_location ON (lat, lng) USING GIST',
      ],
    },
    {
      name: 'valuations',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'property_id UUID FK → properties.id',
        'user_id UUID FK → users.id',
        'method ENUM(comparative, cost, income, mixed)',
        'estimated_value DECIMAL(15,2)',
        'value_per_sqm DECIMAL(10,2)',
        'confidence DECIMAL(3,2)',       // 0.00–1.00
        'comparables_used INTEGER',
        'adjustments JSONB',            // adjustment breakdown
        'ai_summary TEXT',
        'gov_data_source TEXT',         // data.gov.il resource ID
        'created_at TIMESTAMPTZ DEFAULT now()',
      ],
      indexes: [
        'idx_valuations_property ON (property_id)',
        'idx_valuations_created ON (created_at DESC)',
      ],
    },
    {
      name: 'transactions',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'source ENUM(data_gov, manual, import)',
        'source_id TEXT',               // original _id from data.gov
        'city TEXT NOT NULL',
        'street TEXT',
        'house_number TEXT',
        'neighborhood TEXT',
        'block TEXT',
        'parcel TEXT',
        'deal_amount DECIMAL(15,2)',
        'deal_date DATE',
        'property_type TEXT',
        'rooms DECIMAL(3,1)',
        'floor INTEGER',
        'area_sqm DECIMAL(10,2)',
        'year_built INTEGER',
        'price_per_sqm DECIMAL(10,2)',  // computed
        'created_at TIMESTAMPTZ DEFAULT now()',
      ],
      indexes: [
        'idx_transactions_city_date ON (city, deal_date DESC)',
        'idx_transactions_block_parcel ON (block, parcel)',
        'idx_transactions_price ON (price_per_sqm)',
      ],
    },
    {
      name: 'inspections',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'property_id UUID FK → properties.id',
        'user_id UUID FK → users.id',
        'status ENUM(scheduled, in_progress, completed, reviewed)',
        'inspection_date TIMESTAMPTZ',
        'property_type TEXT',
        'condition_rating INTEGER',     // 1-10
        'checklist JSONB',              // {category: [{item, status, severity, notes}]}
        'measurements JSONB',           // [{room, width, length, area}]
        'notes TEXT',
        'gps_lat DECIMAL(10,7)',
        'gps_lng DECIMAL(10,7)',
        'created_at TIMESTAMPTZ DEFAULT now()',
        'updated_at TIMESTAMPTZ DEFAULT now()',
      ],
    },
    {
      name: 'inspection_photos',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'inspection_id UUID FK → inspections.id',
        'storage_url TEXT NOT NULL',
        'room_tag TEXT',
        'issue_tags TEXT[]',            // PostgreSQL array
        'ai_analysis JSONB',           // {defects: [], room_type: "", condition: ""}
        'is_before BOOLEAN DEFAULT false', // for before/after
        'captured_at TIMESTAMPTZ DEFAULT now()',
      ],
    },
    {
      name: 'visits',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'user_id UUID FK → users.id',
        'property_id UUID FK → properties.id',
        'client_id UUID FK → clients.id',
        'address TEXT NOT NULL',
        'status ENUM(scheduled, visited, documented, sent)',
        'scheduled_at TIMESTAMPTZ NOT NULL',
        'completed_at TIMESTAMPTZ',
        'notes TEXT',
        'created_at TIMESTAMPTZ DEFAULT now()',
      ],
    },
    {
      name: 'clients',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'user_id UUID FK → users.id',
        'name TEXT NOT NULL',
        'email TEXT',
        'phone TEXT',
        'company TEXT',
        'type ENUM(individual, company, bank, court, government)',
        'notes TEXT',
        'created_at TIMESTAMPTZ DEFAULT now()',
      ],
    },
    {
      name: 'reports',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'valuation_id UUID FK → valuations.id',
        'user_id UUID FK → users.id',
        'template ENUM(standard, bank, court, summary)',
        'format ENUM(pdf, docx)',
        'storage_url TEXT',
        'status ENUM(generating, ready, failed)',
        'metadata JSONB',              // {pages, size_bytes, generated_at}
        'created_at TIMESTAMPTZ DEFAULT now()',
      ],
    },
    {
      name: 'audit_log',
      columns: [
        'id UUID PK DEFAULT gen_random_uuid()',
        'user_id UUID FK → users.id',
        'action TEXT NOT NULL',
        'entity_type TEXT NOT NULL',
        'entity_id UUID',
        'details JSONB',
        'ip_address INET',
        'created_at TIMESTAMPTZ DEFAULT now()',
      ],
      indexes: [
        'idx_audit_user_time ON (user_id, created_at DESC)',
      ],
    },
  ],
} as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 6  KEY SERVICES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const KEY_SERVICES = [
  {
    name: 'ValuationEngine',
    responsibility: 'Run comparative/cost/income valuations with reconciliation',
    location: 'src/lib/valuationEngine.ts (existing)',
    status: 'production-ready',
  },
  {
    name: 'ProfessionalAVM',
    responsibility: 'Advanced automated valuation model with quality scores',
    location: 'src/lib/professionalAVM.ts (existing)',
    status: 'production-ready',
  },
  {
    name: 'DataGovClient',
    responsibility: 'Fetch + normalize transactions from data.gov.il',
    location: 'src/lib/dataGovAPI.ts (existing)',
    status: 'production-ready',
  },
  {
    name: 'OfflineManager',
    responsibility: 'IndexedDB sync queue, API cache, connectivity monitor',
    location: 'src/services/offlineManager.ts (NEW)',
    status: 'mvp-ready',
  },
  {
    name: 'PhotoAnalysisService',
    responsibility: 'AI photo analysis: defect detection, room classification, condition rating',
    location: 'planned — will use GPT-4 Vision API',
    status: 'planned',
  },
  {
    name: 'ReportGenerator',
    responsibility: 'PDF/DOCX report generation with templates, photos, maps, signatures',
    location: 'src/lib/reportGenerator.ts + src/lib/pdfExport.ts (existing)',
    status: 'needs-upgrade (add photos, maps, signatures)',
  },
  {
    name: 'AnomalyDetectionEngine',
    responsibility: 'Statistical outlier detection (z-score, IQR, regression residuals)',
    location: 'src/components/AnomalyDetector.tsx (exists but uses hardcoded data)',
    status: 'needs-upgrade (connect to real transaction data)',
  },
  {
    name: 'ComparableSearchService',
    responsibility: 'Find similar properties using embeddings + vector search',
    location: 'planned',
    status: 'planned',
  },
  {
    name: 'NotificationService',
    responsibility: 'In-app + push + email notifications',
    location: 'src/core/notifications.ts (in-app only)',
    status: 'needs-upgrade (add push/email)',
  },
  {
    name: 'SyncService',
    responsibility: 'Bidirectional sync between local KV and backend DB',
    location: 'planned — will use offlineManager.ts as foundation',
    status: 'planned',
  },
] as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 7  SCALABILITY CONSIDERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SCALABILITY = {
  frontend: [
    'Code-splitting: All 58+ views are lazy-loaded (already done)',
    'Bundle size: 3 chunks >500KB need manual chunking (ProfessionalCalculators, PropertiesTab, OCRHelper)',
    'Image optimization: Inspection photos should be compressed client-side before upload (use canvas resize)',
    'Virtual scrolling: Transaction lists with 10K+ items need react-window or @tanstack/virtual',
    'Service Worker: Add vite-plugin-pwa for offline caching of static assets',
  ],
  backend: [
    'Horizontal scaling: Stateless Express/Fastify behind load balancer',
    'Rate limiting: Redis-backed rate limiter for gov API proxy endpoints',
    'Job queue: BullMQ for PDF generation, bulk valuations, AI analysis',
    'Connection pooling: pg-pool with 20-50 connections per instance',
    'API caching: Redis cache with 1hr TTL for gov data endpoints',
  ],
  database: [
    'Partitioning: transactions table partitioned by deal_date (yearly)',
    'Materialized views: heatmap aggregations refreshed hourly',
    'Full-text search: GIN indexes on address fields with Hebrew tokenizer',
    'Vector index: pgvector HNSW index for comparable property embeddings',
    'Read replicas: 1-2 replicas for dashboard analytics queries',
  ],
  monitoring: [
    'Error tracking: Sentry with source maps',
    'Performance: Web Vitals (LCP, FID, CLS) reporting',
    'Usage analytics: PostHog for feature adoption tracking',
    'Uptime: Better Uptime for API health checks',
    'Cost tracking: Per-user API usage metering for billing',
  ],
} as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 8  AI COMPONENTS & OPPORTUNITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AI_COMPONENTS = {
  existing: [
    {
      name: 'AI Market Insights',
      tech: 'window.spark.llm (GPT-4)',
      description: 'Generates market summaries, trend analysis, predictions from transaction data',
    },
    {
      name: 'Voice-to-Report',
      tech: 'Web Speech API + Spark LLM',
      description: 'Hebrew speech recognition → raw transcript → AI-structured report',
    },
    {
      name: 'AI Valuation Assistant',
      tech: 'Spark LLM',
      description: 'Natural language interaction for property valuation guidance',
    },
  ],

  planned: [
    {
      name: 'Photo Defect Detection',
      tech: 'GPT-4 Vision / fine-tuned YOLO',
      description: 'Upload inspection photo → detect cracks, moisture, mold, structural issues',
      impact: 'HIGH — saves 30min per inspection',
      magicLevel: '🪄🪄🪄🪄🪄',
    },
    {
      name: 'Auto-Comparable Selection',
      tech: 'text-embedding-3-small + pgvector',
      description: 'Input property → find top-5 most similar sold properties using embeddings',
      impact: 'HIGH — eliminates manual comparable hunting',
      magicLevel: '🪄🪄🪄🪄',
    },
    {
      name: 'Smart Report Writer',
      tech: 'GPT-4 + templates',
      description: 'One-click full appraisal report: pulls data, writes narrative, formats PDF',
      impact: 'CRITICAL — reduces report writing from 4 hours to 15 minutes',
      magicLevel: '🪄🪄🪄🪄🪄',
    },
    {
      name: 'Price Prediction Model',
      tech: 'XGBoost / LightGBM trained on data.gov.il transactions',
      description: 'Predict future property value (3/6/12 months) with confidence intervals',
      impact: 'MEDIUM — differentiator for investment analysis',
      magicLevel: '🪄🪄🪄',
    },
    {
      name: 'Document OCR + Extraction',
      tech: 'Tesseract.js + GPT-4 (existing Tesseract, add structured extraction)',
      description: 'Scan government documents → extract rights, restrictions, zoning automatically',
      impact: 'HIGH — automates tedious TABA/GISN document reading',
      magicLevel: '🪄🪄🪄🪄',
    },
    {
      name: 'Anomaly Explanation AI',
      tech: 'GPT-4 + statistical context',
      description: 'Not just "this price is anomalous" but "why" — explains in Hebrew with comparable evidence',
      impact: 'MEDIUM — builds trust in anomaly detection',
      magicLevel: '🪄🪄🪄',
    },
  ],
} as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 9  INTEGRATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const INTEGRATIONS = [
  { name: 'data.gov.il',     status: 'connected',  desc: 'Transaction data, property records' },
  { name: 'GISN (TLV)',      status: 'connected',  desc: 'Planning documents, TABA' },
  { name: 'ArcGIS (TLV)',    status: 'connected',  desc: 'Map layers, zoning' },
  { name: 'iPlan/Mavat',     status: 'partial',    desc: 'National planning database' },
  { name: 'Israel Tax Auth',  status: 'planned',    desc: 'Purchase tax, betterment levy data' },
  { name: 'Tabu (Land Registry)', status: 'planned', desc: 'Official ownership records' },
  { name: 'Yad2',            status: 'research',   desc: 'Listed properties, asking prices' },
  { name: 'Madlan',          status: 'research',   desc: 'Market analytics, neighborhood scores' },
  { name: 'GovMap',          status: 'planned',     desc: 'National GIS, boundaries, zoning' },
  { name: 'Google Maps',     status: 'planned',     desc: 'Geocoding, Street View, commute times' },
  { name: 'Nominatim/OSM',   status: 'connected',  desc: 'Reverse geocoding (useGeolocation)' },
  { name: 'Calendar (Google/Outlook)', status: 'planned', desc: 'Visit sync, reminders' },
] as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 10  EXECUTION ROADMAP: MVP → BETA → PRODUCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type MilestoneStatus = 'done' | 'in-progress' | 'planned'

export interface Milestone {
  id: string
  phase: 'mvp' | 'beta' | 'production'
  title: string
  titleHe: string
  tasks: string[]
  status: MilestoneStatus
  targetWeek: number        // week from project start
  kpiTarget: string
}

export const ROADMAP: Milestone[] = [
  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: MVP (Weeks 1–6)
  // Goal: One appraiser can do a full inspection → valuation → report
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'mvp-1',
    phase: 'mvp',
    title: 'Core Platform Stability',
    titleHe: 'יציבות פלטפורמה',
    tasks: [
      '✅ Fix all TypeScript compilation errors (done)',
      '✅ Build validation — Vite build succeeds: 7350 modules (done)',
      '✅ Lazy-load all 58 views with error boundaries (done)',
      '✅ Event-driven architecture: EventBus, ModuleRegistry (done)',
      '✅ Command palette (⌘K) with 33 registered commands (done)',
      '✅ Notification center with real-time events (done)',
      '✅ Offline status indicator in header (done)',
    ],
    status: 'done',
    targetWeek: 1,
    kpiTarget: 'Zero crashes, <2s initial load',
  },
  {
    id: 'mvp-2',
    phase: 'mvp',
    title: 'Field Inspection MVP',
    titleHe: 'ביקור שטח — MVP',
    tasks: [
      '✅ SmartInspection: property-type checklists, photo capture, measurements (done)',
      '✅ VisitManager: calendar, scheduling, status pipeline (done)',
      '✅ VoiceReport: Hebrew speech-to-text + AI structuring (done)',
      '✅ GPS hook with reverse geocoding (useGeolocation — done)',
      '✅ IndexedDB offline sync queue (offlineManager — done)',
      'Add camera capture from mobile (MediaDevices API) — in progress',
      'Connect GPS coordinates to inspection records',
    ],
    status: 'in-progress',
    targetWeek: 3,
    kpiTarget: 'Appraiser completes full inspection in <20min',
  },
  {
    id: 'mvp-3',
    phase: 'mvp',
    title: 'Valuation + Report Pipeline',
    titleHe: 'שומה + דוח',
    tasks: [
      '✅ 7 valuation calculators operational (done)',
      '✅ data.gov.il transaction integration (done)',
      'Connect AnomalyDetector to real transaction data (currently hardcoded)',
      'Connect MarketHeatmap to real data (currently hardcoded)',
      'One-click PDF report with header, photos, comparables table, map',
      'Digital signature field on reports',
      'Email report directly to client with tracking',
    ],
    status: 'planned',
    targetWeek: 5,
    kpiTarget: 'Generate professional PDF in <30 seconds',
  },
  {
    id: 'mvp-4',
    phase: 'mvp',
    title: 'Authentication + Data Layer',
    titleHe: 'התחברות + שכבת נתונים',
    tasks: [
      'Add Supabase Auth (email/password + Google)',
      'Migrate from Spark KV to Supabase PostgreSQL',
      'Keep Spark KV as offline cache, sync to Supabase',
      'Row-Level Security (RLS) per user',
      'API proxy for gov data (avoid CORS, add caching)',
    ],
    status: 'planned',
    targetWeek: 6,
    kpiTarget: 'Multi-user ready, data persists across devices',
  },

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: BETA (Weeks 7–14)
  // Goal: 10 appraisers using daily, AI features differentiate product
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'beta-1',
    phase: 'beta',
    title: 'AI Photo Analysis',
    titleHe: 'ניתוח תמונות AI',
    tasks: [
      'Integrate GPT-4 Vision for inspection photos',
      'Auto-detect: cracks, moisture, mold, structural damage',
      'Auto-classify room type from photo',
      'Generate condition score from photo set',
      'Highlight defects with bounding boxes on photo',
    ],
    status: 'planned',
    targetWeek: 8,
    kpiTarget: '85% accuracy on defect detection',
  },
  {
    id: 'beta-2',
    phase: 'beta',
    title: 'Smart Comparable Engine',
    titleHe: 'מנוע השוואות חכם',
    tasks: [
      'Embed all transactions using text-embedding-3-small',
      'Store in Supabase pgvector',
      'Input property → find top-5 by embedding similarity + geo distance',
      'Auto-calculate adjustments (size, floor, age, condition, parking)',
      'Provide confidence score for each comparable',
    ],
    status: 'planned',
    targetWeek: 10,
    kpiTarget: 'Top-5 comparables match expert selection 80% of the time',
  },
  {
    id: 'beta-3',
    phase: 'beta',
    title: 'One-Click Report Generation',
    titleHe: 'דוח בלחיצה אחת',
    tasks: [
      'Templatized report builder (bank, court, summary, full)',
      'AI writes narrative section from valuation data',
      'Auto-insert photos, maps, comparable table, adjustments',
      'Hebrew-compliant formatting (Israeli Standard 17)',
      'Export as PDF and DOCX',
      'Batch report generation for portfolios',
    ],
    status: 'planned',
    targetWeek: 12,
    kpiTarget: 'Full professional report in <5 minutes vs 4 hours manual',
  },
  {
    id: 'beta-4',
    phase: 'beta',
    title: 'Mobile-First Responsive',
    titleHe: 'רספונסיבי למובייל',
    tasks: [
      'Redesign sidebar: bottom tab bar on mobile',
      'Touch-optimized inspection forms',
      'Swipe gestures for before/after comparison',
      'PWA: Add to home screen, push notifications',
      'Service worker for offline asset caching (vite-plugin-pwa)',
      'Camera access with MediaDevices.getUserMedia()',
    ],
    status: 'planned',
    targetWeek: 14,
    kpiTarget: 'Full inspection flow works on iPhone/Android browser',
  },

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 3: PRODUCTION (Weeks 15–24)
  // Goal: 100+ appraisers, billing, compliance, enterprise features
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'prod-1',
    phase: 'production',
    title: 'Billing & Monetization',
    titleHe: 'חיוב ומונטיזציה',
    tasks: [
      'Stripe integration (₪ support)',
      'Free tier: 5 valuations/month',
      'Pro tier: ₪149/month unlimited',
      'Team tier: ₪499/month for 5 seats',
      'Usage metering (API calls, reports, AI tokens)',
      'Invoice generation in Hebrew',
    ],
    status: 'planned',
    targetWeek: 17,
    kpiTarget: '50 paying customers',
  },
  {
    id: 'prod-2',
    phase: 'production',
    title: 'Team & Enterprise',
    titleHe: 'צוות וארגון',
    tasks: [
      'Multi-tenant architecture',
      'Role-based access control (admin, appraiser, viewer, client)',
      'Case assignment with workload balancing',
      'Real-time collaboration on valuations',
      'Firm-wide analytics dashboard',
      'White-label branding per firm',
      'SLA and priority support',
    ],
    status: 'planned',
    targetWeek: 20,
    kpiTarget: '3 appraisal firms onboarded',
  },
  {
    id: 'prod-3',
    phase: 'production',
    title: 'Advanced Integrations',
    titleHe: 'אינטגרציות מתקדמות',
    tasks: [
      'Tabu (Land Registry) — official ownership verification',
      'Israel Tax Authority — purchase tax calculations',
      'GovMap — national GIS layers',
      'Google Maps — Street View, commute analytics',
      'Calendar sync (Google Calendar, Outlook)',
      'WhatsApp Business — client communication',
      'Accounting software export (Hashavshevet, Priority)',
    ],
    status: 'planned',
    targetWeek: 22,
    kpiTarget: '5+ live data integrations',
  },
  {
    id: 'prod-4',
    phase: 'production',
    title: 'Compliance & Security',
    titleHe: 'רגולציה ואבטחה',
    tasks: [
      'Israeli Standard 17 compliance checker',
      'Audit trail with immutable log (blockchain-style hash chain)',
      'GDPR/Israeli Privacy Protection compliance',
      'Data encryption at rest (AES-256)',
      'Penetration testing',
      'SOC 2 Type I preparation',
      'Automated compliance reports for regulators',
    ],
    status: 'planned',
    targetWeek: 24,
    kpiTarget: 'Pass security audit, compliance-ready',
  },
] as const

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// § 11  MISSING FEATURES & MAGICAL OPPORTUNITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const MISSING_FEATURES = [
  {
    name: 'Onboarding Wizard',
    description: 'First-time user sees guided setup: add firm details, branding, first property',
    priority: 'HIGH',
    effort: 'small',
  },
  {
    name: 'Breadcrumbs Navigation',
    description: 'Dashboard > Properties > #123 > Valuation — always know where you are',
    priority: 'HIGH',
    effort: 'small',
  },
  {
    name: 'Undo/Redo Stack',
    description: 'Ctrl+Z for any destructive action. Store last 20 operations.',
    priority: 'MEDIUM',
    effort: 'medium',
  },
  {
    name: 'Dark Mode Toggle',
    description: 'Theme tokens exist — just need a switcher in AppHeader',
    priority: 'LOW',
    effort: 'tiny',
  },
  {
    name: 'Real Geographic Heatmap',
    description: 'Replace card-based heatmap with Leaflet/Mapbox actual map with color overlays',
    priority: 'HIGH',
    effort: 'medium',
  },
  {
    name: 'Statistical Anomaly Engine',
    description: 'Replace hardcoded anomalies with z-score, IQR, regression residual analysis',
    priority: 'HIGH',
    effort: 'medium',
  },
  {
    name: 'Keyboard Shortcuts',
    description: 'Ctrl+S save, Ctrl+P print, Ctrl+N new, Ctrl+/ help overlay',
    priority: 'MEDIUM',
    effort: 'small',
  },
  {
    name: 'WhatsApp Integration',
    description: 'Send report link via WhatsApp to client — huge in Israeli market',
    priority: 'HIGH',
    effort: 'small',
  },
  {
    name: 'Client Self-Service Portal',
    description: 'Client logs in → sees status, downloads report, makes payment',
    priority: 'MEDIUM',
    effort: 'large',
  },
  {
    name: 'Multi-Language (English/Arabic)',
    description: 'i18n infrastructure for Arab-Israeli and international appraisers',
    priority: 'LOW',
    effort: 'large',
  },
]

export const MAGICAL_FEATURES = [
  {
    name: '📸 "Point & Value"',
    description: 'Open camera → point at property → AI identifies address, pulls data, estimates value in <10 seconds',
    techRequired: 'Vision AI + geocoding + transaction DB',
    wow: '🪄🪄🪄🪄🪄',
  },
  {
    name: '🎤 "Walk & Talk" Inspection',
    description: 'Start walking through property, narrate observations, AI auto-generates full inspection report with photos from camera roll matched by timestamp',
    techRequired: 'Speech API + photo metadata + AI structuring',
    wow: '🪄🪄🪄🪄🪄',
  },
  {
    name: '🔮 "What If" Simulator',
    description: '"What would this property be worth with 2 extra rooms? If it had parking? If the neighborhood gentrifies?" — AI-powered scenario modeling',
    techRequired: 'Valuation engine + adjustment calculator + GPT-4',
    wow: '🪄🪄🪄🪄',
  },
  {
    name: '📊 Auto-Competitor Scan',
    description: 'Every morning at 7am: scan Yad2/Madlan for new listings matching your active cases. Push notification with price comparison.',
    techRequired: 'Web scraping + matching algorithm + push notifications',
    wow: '🪄🪄🪄🪄',
  },
  {
    name: '🤖 "Second Opinion" AI',
    description: 'After you complete a valuation, AI independently does one. Shows disagreements with reasoning. Like peer review from a tireless colleague.',
    techRequired: 'Independent AVM pipeline + GPT-4 reasoning',
    wow: '🪄🪄🪄🪄🪄',
  },
  {
    name: '📱 NFC Property Tag',
    description: 'Stick NFC tag on property door during inspection. Next visit, tap phone → full history, photos, last valuation loads instantly.',
    techRequired: 'Web NFC API + property linking',
    wow: '🪄🪄🪄',
  },
  {
    name: '⚡ "Instant Bank Package"',
    description: 'One button: generates bank-compliant valuation report + fills bank forms + emails to bank contact. Currently takes appraisers 2 hours.',
    techRequired: 'Template engine + bank form integration + email',
    wow: '🪄🪄🪄🪄🪄',
  },
]

export const WORKFLOW_IMPROVEMENTS = [
  'Eliminate double data entry: inspection photos auto-populate report',
  'Auto-fill property details from Tabu registry by block/parcel',
  'GPS auto-detect nearest properties when arriving at inspection site',
  'Voice memos on each photo — AI transcribes and attaches to inspection item',
  'Smart scheduling: suggest optimal route for multiple visits per day',
  'Template library: save and reuse adjustment sets for specific neighborhoods',
  'Market alerts: get notified when a transaction closes near your active cases',
  'Draft auto-save every 30 seconds — never lose work',
  'Quick-compare: select 2 properties from any list → instant side-by-side',
  'Export to Excel: any data table can be downloaded as XLSX',
]

export const AUTOMATION_OPPORTUNITIES = [
  'Nightly sync of data.gov.il new transactions → auto-update price indexes',
  'Auto-generate monthly market reports per tracked neighborhood',
  'Auto-detect when betterment levy plan is approved → notify affected clients',
  'Auto-archive completed cases after 90 days of inactivity',
  'Auto-send satisfaction survey to client after report delivery',
  'Auto-backup all data to Supabase Storage daily',
  'CI/CD: auto-deploy on main branch push, preview environments for PRs',
  'Auto-run accessibility audit on each build (pa11y)',
]
