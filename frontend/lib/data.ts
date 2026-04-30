import { BarChart3, BrainCircuit, Building2, CheckCircle2, FileSearch, Gauge, Layers3, LockKeyhole, Radar, ShieldCheck, Sparkles, Users2, Workflow } from 'lucide-react'

export const navItems = [
  { label: 'Product', href: '#product' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Customers', href: '#customers' },
]

export const features = [
  {
    icon: BrainCircuit,
    title: 'Deal Twin decision simulator',
    description: 'Reverse-engineer approval conditions, counteroffer discipline, and decisive next actions before capital reaches committee.',
  },
  {
    icon: Radar,
    title: 'Permit Pulse risk windows',
    description: 'Detect planning-pressure windows, value-at-risk, and control actions before permit uncertainty quietly changes the deal thesis.',
  },
  {
    icon: Radar,
    title: 'Market intelligence engine',
    description: 'Live comparable scoring, zoning signals, rental yield context, and confidence scoring in one operating layer.',
  },
  {
    icon: FileSearch,
    title: 'Evidence-grade reports',
    description: 'Generate investor, bank, and appraisal-ready valuation narratives with source traceability and review workflow.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for regulated teams',
    description: 'JWT auth, tenant-aware data boundaries, audit trails, and schema-first API design for serious production use.',
  },
  {
    icon: Workflow,
    title: 'Automated deal pipeline',
    description: 'Move from acquisition lead to valuation, committee memo, risk review, and PDF export without losing context.',
  },
  {
    icon: Layers3,
    title: 'GIS and planning layers',
    description: 'Blend parcel, TABA, transaction, and planning signals into clean decision surfaces for underwriting teams.',
  },
  {
    icon: Gauge,
    title: 'Fast by default',
    description: 'Responsive dashboards, optimized page routes, reusable components, and API adapters ready for real services.',
  },
]

export const metrics = [
  { label: 'Portfolio value tracked', value: '$2.8B' },
  { label: 'Median report cycle', value: '11m' },
  { label: 'Comparable matches scored', value: '4.7M' },
]

export const pricingPlans = [
  {
    name: 'Studio',
    price: '$149',
    description: 'For boutique appraisal and investment teams launching a modern valuation workflow.',
    features: ['3 team seats', '250 valuations per month', 'AI report drafts', 'CSV and PDF export'],
  },
  {
    name: 'Scale',
    price: '$499',
    description: 'For growing operators that need secure collaboration, auditability, and advanced data flows.',
    featured: true,
    features: ['Unlimited seats', '2,500 valuations per month', 'API access', 'Tenant audit logs', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For banks, funds, and regulated institutions with custom data, security, and deployment needs.',
    features: ['Dedicated environments', 'Custom integrations', 'SSO roadmap', 'Security review support'],
  },
]

export const testimonials = [
  {
    quote: 'PropIntel turned our underwriting meetings from spreadsheet archaeology into a focused investment conversation.',
    name: 'Maya Levin',
    role: 'Head of Acquisitions, Northline Capital',
  },
  {
    quote: 'The product feels like it understands valuation work, not just dashboards. The traceability is the unlock.',
    name: 'Daniel Bar',
    role: 'Managing Partner, Datum Appraisals',
  },
  {
    quote: 'We cut our first-pass appraisal prep from days to under an hour without sacrificing professional review.',
    name: 'Noa Shalev',
    role: 'Director of Strategy, Urban Yield',
  },
]

export const dashboardCards = [
  { label: 'Active valuations', value: '128', trend: '+18%', icon: Building2 },
  { label: 'Avg confidence', value: '92.4%', trend: '+4.1%', icon: CheckCircle2 },
  { label: 'Risk alerts', value: '7', trend: '-23%', icon: LockKeyhole },
  { label: 'Team reviews', value: '31', trend: '+12%', icon: Users2 },
]

export const valuationRows = [
  { asset: 'Rothschild 18', city: 'Tel Aviv', value: '$2.84M', confidence: '94%', status: 'Ready' },
  { asset: 'HaNeviim 42', city: 'Jerusalem', value: '$1.91M', confidence: '89%', status: 'Review' },
  { asset: 'Yigal Alon 96', city: 'Tel Aviv', value: '$6.42M', confidence: '91%', status: 'Ready' },
  { asset: 'Sderot HaNassi 7', city: 'Haifa', value: '$1.18M', confidence: '86%', status: 'Draft' },
]

export const activity = [
  { title: 'Court-grade report exported', detail: 'Rothschild 18 package signed by Maya', time: '2m ago' },
  { title: 'Planning layer updated', detail: 'New Mavat parcel evidence linked', time: '18m ago' },
  { title: 'Comparable override approved', detail: 'Noise adjustment changed from -3% to -5%', time: '1h ago' },
]

export const integrations = ['PostgreSQL', 'JWT Auth', 'Gov Data', 'GIS Layers', 'PDF Export', 'Audit Logs']

export const heroHighlights = [Sparkles, BarChart3, ShieldCheck]
