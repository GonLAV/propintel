export type PropertyType = 'apartment' | 'house' | 'penthouse' | 'garden-apartment' | 'duplex' | 'studio' | 'commercial' | 'land'
export type PropertyStatus = 'draft' | 'in-progress' | 'completed' | 'sent'
export type PropertyCondition = 'new' | 'excellent' | 'good' | 'fair' | 'poor' | 'renovation-needed'
export type ValuationMethod = 'comparable-sales' | 'cost-approach' | 'income-approach' | 'hybrid'

export interface Property {
  id: string
  clientId: string
  status: PropertyStatus
  address: {
    street: string
    city: string
    neighborhood: string
    postalCode: string
  }
  type: PropertyType
  details: {
    builtArea: number
    totalArea?: number
    rooms: number
    bedrooms: number
    bathrooms: number
    floor: number
    totalFloors: number
    buildYear: number
    condition: PropertyCondition
    parking: number
    storage: boolean
    balcony: boolean
    elevator: boolean
    accessible: boolean
  }
  features: string[]
  description: string
  photos: string[]
  createdAt: string
  updatedAt: string
  valuationData?: {
    estimatedValue: number
    valueRange: { min: number; max: number }
    confidence: number
    method: ValuationMethod
    comparables: string[]
    notes: string
  }
}

export interface Comparable {
  id: string
  address: string
  type: PropertyType
  salePrice: number
  saleDate: string
  builtArea: number
  rooms: number
  floor: number
  distance: number
  adjustments: {
    location: number
    size: number
    condition: number
    floor: number
    age: number
    features: number
    total: number
  }
  adjustedPrice: number
  pricePerSqm: number
  selected: boolean
  similarityScore?: number
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  avatar?: string
  properties: string[]
  notes: string
  createdAt: string
}

export interface MarketTrend {
  period: string
  avgPrice: number
  avgPricePerSqm: number
  sales: number
  avgDaysOnMarket: number
}

export interface NeighborhoodData {
  name: string
  schools: Array<{ name: string; distance: number; rating: number }>
  amenities: Array<{ name: string; type: string; distance: number }>
  transit: Array<{ name: string; type: string; distance: number }>
  demographics?: {
    population: number
    avgAge: number
    avgIncome: number
  }
}

export interface ARMeasurement {
  id: string
  type: 'distance' | 'area' | 'height' | 'volume'
  value: number
  unit: string
  points: { x: number; y: number; z?: number }[]
  timestamp: string
  createdBy: string
}

export interface ARAnnotation {
  id: string
  position: { x: number; y: number; z?: number }
  text: string
  type: 'info' | 'warning' | 'feature' | 'improvement' | 'issue' | 'question'
  timestamp: string
  createdBy: string
  replies?: ARAnnotationReply[]
}

export interface ARAnnotationReply {
  id: string
  text: string
  timestamp: string
  createdBy: string
}

export interface ARParticipant {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'appraiser' | 'client' | 'inspector' | 'viewer'
  joinedAt: string
  isActive: boolean
  cursor?: { x: number; y: number }
  color: string
}

export interface ARSession {
  id: string
  propertyId: string
  title: string
  description?: string
  type: 'solo' | 'collaborative'
  status: 'active' | 'paused' | 'completed' | 'archived'
  measurements: ARMeasurement[]
  annotations: ARAnnotation[]
  photos: ARPhoto[]
  videoRecordings: ARVideo[]
  participants: ARParticipant[]
  hostId: string
  environmentalData?: {
    light: number
    temperature: number
    humidity: number
    noise: number
    timestamp: string
  }[]
  duration: number
  startedAt: string
  completedAt?: string
  shareLink?: string
  shareCode?: string
  isPublic: boolean
  allowedViewers?: string[]
}

export interface ARPhoto {
  id: string
  dataUrl: string
  timestamp: string
  capturedBy: string
  annotations?: string[]
  environmentalData?: {
    light: number
    temperature: number
    humidity: number
    noise: number
  }
}

export interface ARVideo {
  id: string
  dataUrl: string
  duration: number
  timestamp: string
  capturedBy: string
  thumbnailUrl?: string
}

export interface Report {
  id: string
  propertyId: string
  clientId: string
  title: string
  format: 'pdf' | 'word' | 'html'
  template: 'standard' | 'detailed' | 'summary' | 'bank'
  status: 'draft' | 'pending-review' | 'completed' | 'delivered'
  sections: ReportSection[]
  appraiserName: string
  appraiserLicense: string
  generatedAt: string
  deliveredAt?: string
  downloadUrl?: string
  notes?: string
  watermark: boolean
}

export interface ReportSection {
  id: string
  title: string
  content: string
  type: 'text' | 'table' | 'chart' | 'image' | 'list'
  order: number
  required: boolean
  enabled: boolean
}

export interface UpdateRequest {
  id: string
  propertyId: string
  clientId: string
  reportId?: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in-review' | 'in-progress' | 'completed' | 'rejected'
  requestedAt: string
  updatedAt: string
  completedAt?: string
  response?: string
  attachments?: string[]
  internalNotes?: string
}

export interface ClientActivity {
  id: string
  clientId: string
  type: 'login' | 'view-report' | 'download-report' | 'create-request' | 'message' | 'update-request'
  description: string
  metadata?: Record<string, any>
  timestamp: string
}

export interface ClientPortalAccess {
  clientId: string
  email: string
  password?: string
  isActive: boolean
  lastLogin?: string
  notifications: boolean
  emailNotifications: boolean
}

export interface Invoice {
  id: string
  propertyId: string
  clientId: string
  invoiceNumber: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issueDate: string
  dueDate: string
  lineItems: InvoiceLineItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  balance: number
  paymentTerms: string
  notes?: string
  paymentMethod?: 'cash' | 'check' | 'bank-transfer' | 'credit-card'
  paidAt?: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceLineItem {
  id: string
  description: string
  serviceType: ServiceType
  quantity: number
  unitPrice: number
  amount: number
}

export type ServiceType = 
  | 'residential-appraisal'
  | 'commercial-appraisal'
  | 'land-appraisal'
  | 'rental-appraisal'
  | 'complex-appraisal'
  | 'consultation'
  | 'site-inspection'
  | 'additional-report'
  | 'rush-fee'
  | 'travel-expenses'
  | 'other'

export interface PricingTemplate {
  id: string
  name: string
  serviceType: ServiceType
  basePrice: number
  pricePerSqm?: number
  minimumPrice?: number
  maximumPrice?: number
  description: string
  isActive: boolean
}

export interface DigitalSignature {
  id: string
  documentId: string
  documentType: 'report' | 'invoice' | 'contract'
  signedBy: string
  signerName: string
  signerLicense?: string
  signatureData: string
  timestamp: string
  ipAddress: string
  hash: string
  verified: boolean
}

export interface AuditLog {
  id: string
  entityType: 'property' | 'report' | 'invoice' | 'client'
  entityId: string
  action: 'created' | 'updated' | 'deleted' | 'viewed' | 'exported' | 'signed'
  userId: string
  userName: string
  timestamp: string
  changes?: Record<string, { before: any; after: any }>
  metadata?: Record<string, any>
}

export interface BrandingSettings {
  id: string
  companyName: string
  companyTagline?: string
  logo?: {
    dataUrl: string
    width: number
    height: number
    position: 'left' | 'center' | 'right'
    size: 'small' | 'medium' | 'large'
  }
  colors: {
    primary: string
    secondary: string
    accent: string
    headerBackground: string
    headerText: string
    footerBackground: string
    footerText: string
  }
  fonts: {
    heading: string
    body: string
    headingSize: number
    bodySize: number
  }
  header: {
    enabled: boolean
    height: number
    showLogo: boolean
    showCompanyName: boolean
    showTagline: boolean
    customText?: string
    backgroundColor?: string
    textColor?: string
    borderBottom: boolean
  }
  footer: {
    enabled: boolean
    height: number
    showPageNumbers: boolean
    showCompanyName: boolean
    showContactInfo: boolean
    customText?: string
    backgroundColor?: string
    textColor?: string
    borderTop: boolean
  }
  contactInfo: {
    address?: string
    phone?: string
    email?: string
    website?: string
    licenseNumber?: string
  }
  watermark?: {
    text: string
    opacity: number
    angle: number
    fontSize: number
    color: string
  }
  pageLayout: {
    margins: {
      top: number
      bottom: number
      left: number
      right: number
    }
    pageSize: 'a4' | 'letter' | 'legal'
    orientation: 'portrait' | 'landscape'
  }
  createdAt: string
  updatedAt: string
  isDefault: boolean
}

export interface ValuationResult {
  method: 'comparable-sales' | 'cost-approach' | 'income-approach' | 'hybrid'
  estimatedValue: number
  confidence: number
  valueRange: { min: number; max: number }
  calculations: ValuationCalculation[]
  reconciliation?: string
  methodology: string
  assumptions: string[]
  limitations: string[]
  qualityChecks?: ValuationQualityCheck[]
  calculatedAt?: string
  transactionDetails?: Array<{
    id: string
    address: string
    basePrice: number
    adjustedPrice: number
    weight: number
    adjustments: Record<string, number>
  }>
}

export interface ValuationQualityCheck {
  severity: 'info' | 'warning' | 'error'
  code:
    | 'missing-input'
    | 'low-sample'
    | 'high-variation'
    | 'outlier'
    | 'large-adjustment'
    | 'parameter-out-of-range'
    | 'method-divergence'
  message: string
}

export interface ValuationCalculation {
  step: string
  description: string
  formula: string
  inputs: Record<string, number | string>
  result: number
}

export type SequenceTrigger = 'manual' | 'report-sent' | 'invoice-sent' | 'no-response' | 'payment-overdue' | 'appointment-scheduled'
export type SequenceStatus = 'active' | 'paused' | 'completed' | 'archived'
export type EmailStepStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'skipped'

export interface EmailSequenceStep {
  id: string
  order: number
  delayDays: number
  delayHours: number
  subject: string
  message: string
  attachReport: boolean
  attachInvoice: boolean
  waitForResponse: boolean
  enabled: boolean
}

export interface EmailSequence {
  id: string
  name: string
  description: string
  trigger: SequenceTrigger
  status: SequenceStatus
  steps: EmailSequenceStep[]
  createdAt: string
  updatedAt: string
  lastUsed?: string
  useCount: number
  isDefault: boolean
  tags: string[]
}

export interface SequenceExecution {
  id: string
  sequenceId: string
  sequenceName: string
  recipientEmail: string
  recipientName: string
  propertyId?: string
  propertyAddress?: string
  status: SequenceStatus
  currentStepIndex: number
  startedAt: string
  completedAt?: string
  pausedAt?: string
  steps: ExecutionStep[]
  metadata?: Record<string, any>
}

export interface ExecutionStep {
  stepId: string
  stepOrder: number
  status: EmailStepStatus
  scheduledFor: string
  sentAt?: string
  failedAt?: string
  errorMessage?: string
  opened?: boolean
  clicked?: boolean
}

export type ReportTemplate = 'bank' | 'tax' | 'internal' | 'multi-unit' | 'court' | 'betterment-levy' | 'rental'
export type ReportStandard = 'standard-19' | 'standard-22' | 'custom'
export type CaseStatus = 'draft' | 'submitted' | 'under-review' | 'approved' | 'closed' | 'archived'
export type UserRole = 'senior-appraiser' | 'junior-appraiser' | 'intern' | 'admin' | 'viewer'

export interface StandardizedReport {
  id: string
  caseId: string
  propertyId: string
  template: ReportTemplate
  standard: ReportStandard
  version: number
  status: CaseStatus
  requiredFields: ReportField[]
  completedFields: string[]
  missingFields: string[]
  regulatoryWarnings: RegulatoryWarning[]
  sections: ReportSection[]
  smartFill: SmartFillData
  versionHistory: ReportVersion[]
  lockedAt?: string
  lockedBy?: string
  digitalSignature?: DigitalSignature
  createdAt: string
  updatedAt: string
  submittedAt?: string
  approvedAt?: string
}

export interface ReportField {
  id: string
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file'
  required: boolean
  standard?: ReportStandard
  section: string
  value?: any
  validation?: FieldValidation
  helpText?: string
}

export interface FieldValidation {
  min?: number
  max?: number
  pattern?: string
  options?: string[]
  dependsOn?: string
  customRule?: string
}

export interface RegulatoryWarning {
  id: string
  severity: 'critical' | 'warning' | 'info'
  standard: ReportStandard
  section: string
  field?: string
  message: string
  regulation: string
  resolution?: string
  acknowledgedAt?: string
  acknowledgedBy?: string
}

export interface SmartFillData {
  autoCompletedFields: string[]
  suggestions: FieldSuggestion[]
  dataSource: 'previous-reports' | 'property-data' | 'government-api' | 'ai-analysis'
  confidence: number
}

export interface FieldSuggestion {
  fieldId: string
  suggestedValue: any
  confidence: number
  source: string
  reasoning: string
}

export interface ReportVersion {
  version: number
  createdAt: string
  createdBy: string
  createdByName: string
  changes: VersionChange[]
  comment?: string
  snapshot: any
  isLocked: boolean
}

export interface VersionChange {
  field: string
  fieldLabel: string
  before: any
  after: any
  timestamp: string
}

export interface Case {
  id: string
  caseNumber: string
  clientId: string
  propertyId: string
  status: CaseStatus
  priority: 'low' | 'normal' | 'high' | 'urgent'
  type: 'single-property' | 'multi-unit' | 'portfolio' | 'land' | 'commercial'
  assignedTo: string[]
  reports: string[]
  invoices: string[]
  documents: CaseDocument[]
  timeline: CaseEvent[]
  tags: string[]
  dueDate?: string
  startedAt: string
  completedAt?: string
  archivedAt?: string
  notes?: string
  internalNotes?: string
}

export interface CaseDocument {
  id: string
  name: string
  type: 'report' | 'contract' | 'correspondence' | 'photo' | 'plan' | 'other'
  fileUrl: string
  uploadedBy: string
  uploadedAt: string
  size: number
  tags: string[]
}

export interface CaseEvent {
  id: string
  type: 'created' | 'assigned' | 'status-changed' | 'report-generated' | 'invoice-sent' | 'payment-received' | 'note-added' | 'document-uploaded' | 'archived'
  description: string
  userId: string
  userName: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface MultiUnitBuilding {
  id: string
  address: {
    street: string
    city: string
    neighborhood: string
    postalCode: string
  }
  buildingDetails: {
    totalFloors: number
    totalUnits: number
    buildYear: number
    constructionType: string
    roofType: string
    commonAreas: string[]
  }
  units: BuildingUnit[]
  commonData: {
    landValue: number
    constructionCost: number
    depreciation: number
    buildingRights: BuildingRights
    utilities: UtilityConnection[]
  }
  masterValuation?: {
    totalValue: number
    valuePerSqm: number
    methodology: string
    calculatedAt: string
  }
  createdAt: string
  updatedAt: string
}

export interface BuildingUnit {
  id: string
  unitNumber: string
  floor: number
  type: PropertyType
  builtArea: number
  rooms: number
  bedrooms: number
  bathrooms: number
  balcony: boolean
  balconyArea?: number
  parking?: number
  storage?: boolean
  condition: PropertyCondition
  exposure: 'north' | 'south' | 'east' | 'west' | 'ne' | 'nw' | 'se' | 'sw'
  individualAdjustments: UnitAdjustment[]
  valuationResult?: {
    estimatedValue: number
    confidence: number
    method: ValuationMethod
  }
  reportId?: string
  status: 'pending' | 'valued' | 'reported'
}

export interface UnitAdjustment {
  type: 'floor' | 'exposure' | 'condition' | 'view' | 'renovation' | 'custom'
  description: string
  adjustmentPercent: number
  reasoning: string
}

export interface BuildingRights {
  currentUsage: number
  allowedUsage: number
  remainingRights: number
  zoningDesignation: string
  restrictions: string[]
  potentialExpansion?: {
    additionalSqm: number
    estimatedCost: number
    estimatedValue: number
    feasibility: 'high' | 'medium' | 'low'
  }
}

export interface UtilityConnection {
  type: 'water' | 'electricity' | 'gas' | 'sewage' | 'internet'
  status: 'connected' | 'available' | 'unavailable'
  provider?: string
  notes?: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  licenseNumber?: string
  phone?: string
  avatar?: string
  permissions: Permission[]
  activeCases: string[]
  completedCases: number
  performance: {
    avgCompletionTime: number
    clientSatisfaction: number
    accuracy: number
  }
  isActive: boolean
  joinedAt: string
  lastActive?: string
}

export interface Permission {
  resource: 'cases' | 'clients' | 'properties' | 'reports' | 'invoices' | 'settings' | 'team'
  actions: ('view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'sign')[]
  scope: 'all' | 'assigned' | 'own' | 'none'
}

export interface ChangeLog {
  id: string
  entityType: 'case' | 'property' | 'report' | 'client' | 'invoice' | 'comparable' | 'appraisal'
  entityId: string
  entityName: string
  action: 'created' | 'updated' | 'deleted' | 'locked' | 'unlocked' | 'signed' | 'exported' | 'shared'
  userId: string
  userName: string
  userRole: UserRole
  changes: VersionChange[]
  timestamp: string
  ipAddress?: string
  userAgent?: string
  comment?: string
  isReversible: boolean
}

export interface AIInsight {
  id: string
  type: 'comparable-suggestion' | 'price-anomaly' | 'internal-contradiction' | 'market-trend' | 'risk-warning' | 'text-draft'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  affectedEntity: {
    type: string
    id: string
    name: string
  }
  suggestions?: string[]
  confidence: number
  dataSource: string[]
  createdAt: string
  acknowledgedAt?: string
  dismissedAt?: string
  actionTaken?: string
}

export interface DocumentLock {
  documentId: string
  documentType: 'report' | 'case' | 'invoice'
  lockedAt: string
  lockedBy: string
  lockedByName: string
  reason: string
  digitalSignature?: DigitalSignature
  checksum: string
  isRevocable: boolean
}

export interface ExportFormat {
  type: 'word' | 'pdf-unsigned' | 'pdf-signed' | 'excel' | 'json'
  includeAttachments: boolean
  includeAuditTrail: boolean
  watermark?: boolean
  encryptionLevel?: 'none' | 'password' | 'certificate'
}
