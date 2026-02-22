# Technical Specification: Automatic Property Valuation Engine

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
│  - AutoValuationEngine Component (React)                    │
│  - Progress tracking, Results display, Tab navigation       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
│  - calculateAutoValuation()                                 │
│  - calculateDataQuality()                                   │
│  - Factor analysis and weighting                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│  - israelGovAPI service                                     │
│  - enrichPropertyWithGovData()                              │
│  - Parallel API calls with Promise.all()                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              External Government APIs                        │
│  Land Registry │ Planning │ Tax │ Municipal │ GIS │ Market  │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### AutoValuationResult

```typescript
interface AutoValuationResult {
  estimatedValue: number
  valueRange: {
    min: number
    max: number
  }
  confidenceScore: number        // 0-100
  dataQuality: number             // 0-100
  sources: {
    landRegistry: boolean
    planning: boolean
    taxAuthority: boolean
    municipal: boolean
    marketData: boolean
    gis: boolean
  }
  breakdown: {
    baseValue: number
    locationAdjustment: number
    conditionAdjustment: number
    planningAdjustment: number
    marketTrendAdjustment: number
  }
  factors: Array<{
    name: string
    nameHe: string
    impact: number               // percentage impact
    source: string
    description: string
  }>
  warnings: string[]
  recommendations: string[]
}
```

### Government Data Schemas

#### LandRegistryData
```typescript
interface LandRegistryData {
  parcelId: string               // "gush/helka"
  gush: string
  helka: string
  subHelka?: string
  owners: Array<{
    name: string
    idNumber: string
    sharePercentage: number
    acquisitionDate: string
  }>
  encumbrances: Array<{
    type: 'mortgage' | 'lien' | 'caveat' | 'lease' | 'easement'
    typeHe: string
    amount?: number
    creditor?: string
    registrationDate: string
    expiryDate?: string
    status: 'active' | 'released' | 'pending'
  }>
  propertyRights: {
    ownershipType: 'full' | 'shared' | 'leasehold' | 'cooperative'
    ownershipTypeHe: string
    registrationDate: string
    area: number
    restrictions: string[]
  }
  legalStatus: 'clear' | 'encumbered' | 'disputed' | 'frozen'
  lastUpdate: string
}
```

#### PlanningData
```typescript
interface PlanningData {
  planNumber: string
  planName: string
  planNameHe: string
  planType: 'תב״ע' | 'תמ״א' | 'תכנית מתאר' | 'תכנית מפורטת'
  status: 'approved' | 'pending' | 'in-review' | 'rejected' | 'appealed'
  statusHe: string
  approvalDate?: string
  publicationDate?: string
  buildingRights: {
    far: number                  // Floor Area Ratio (%)
    coverage: number             // Coverage (%)
    heightMeters: number
    heightFloors: number
    setbacks: {
      front: number
      rear: number
      side: number
    }
  }
  zoningDesignation: string
  zoningDesignationHe: string
  permittedUses: string[]
  permittedUsesHe: string[]
  buildingPermits: Array<{
    permitNumber: string
    permitType: string
    permitTypeHe: string
    issueDate: string
    area: number
    floors: number
    status: 'active' | 'expired' | 'revoked'
  }>
  violations: Array<{
    violationType: string
    violationTypeHe: string
    issueDate: string
    status: 'open' | 'closed' | 'in-litigation'
    description: string
  }>
  futureChanges: Array<{
    planNumber: string
    description: string
    descriptionHe: string
    expectedApproval?: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
}
```

#### TaxAssessmentData
```typescript
interface TaxAssessmentData {
  propertyId: string
  taxAssessedValue: number
  assessmentYear: number
  assessmentDate: string
  previousValues: Array<{
    year: number
    value: number
  }>
  arnona: {
    annualAmount: number
    ratePerSqm: number
    exemptions: Array<{
      type: string
      typeHe: string
      percentage: number
      amount: number
    }>
  }
  improvementTax: {
    paid: Array<{
      year: number
      amount: number
      reason: string
      reasonHe: string
    }>
    pending: Array<{
      dueDate: string
      estimatedAmount: number
      trigger: string
      triggerHe: string
    }>
  }
  purchaseTax: {
    bracket: number
    rate: number
    exemptions: string[]
  }
}
```

## Algorithms

### Base Value Calculation

```typescript
function calculateBaseValue(
  taxAssessedValue: number,
  builtArea: number,
  marketMultiplier: number = 1.15
): number {
  const valuePerSqm = taxAssessedValue / builtArea
  return valuePerSqm * builtArea * marketMultiplier
}
```

**Rationale:**
- Tax assessed values are typically conservative (below market)
- Market multiplier of 1.15 (15% premium) adjusts to current market
- Uses property's actual built area for accuracy

### Location Adjustment

```typescript
function calculateLocationAdjustment(
  baseValue: number,
  walkabilityScore: number  // 0-100
): number {
  const locationScore = walkabilityScore / 100
  const adjustmentFactor = (locationScore - 0.5) * 0.3
  return baseValue * adjustmentFactor
}
```

**Rationale:**
- Walkability score is normalized to 0-1
- Score of 50 (0.5) is neutral (no adjustment)
- Maximum 30% adjustment (±15%) based on location quality
- Higher walkability = better location = higher value

### Condition Adjustment

```typescript
const CONDITION_MULTIPLIERS = {
  'new': 0.15,
  'excellent': 0.10,
  'good': 0.05,
  'fair': 0,
  'poor': -0.10,
  'renovation-needed': -0.20
}

function calculateConditionAdjustment(
  baseValue: number,
  condition: PropertyCondition
): number {
  const multiplier = CONDITION_MULTIPLIERS[condition] || 0
  return baseValue * multiplier
}
```

**Rationale:**
- Fair condition is baseline (no adjustment)
- New properties command premium of 15%
- Properties needing renovation discounted 20%
- Reflects renovation costs and buyer preferences

### Planning Adjustment

```typescript
function calculatePlanningAdjustment(
  baseValue: number,
  far: number  // Floor Area Ratio
): number {
  if (far > 100) {
    return baseValue * 0.08  // 8% premium for high development rights
  }
  return 0
}
```

**Rationale:**
- High FAR (>100%) indicates development potential
- Additional building rights add value beyond current use
- 8% premium reflects option value for future development

### Market Trend Adjustment

```typescript
function calculateMarketTrendAdjustment(
  baseValue: number,
  baseValuePerSqm: number,
  marketTransactions: MarketTransactionData[]
): number {
  const avgMarketPrice = marketTransactions.reduce(
    (sum, t) => sum + t.pricePerSqm, 0
  ) / marketTransactions.length
  
  const trendDelta = (avgMarketPrice - baseValuePerSqm) / baseValuePerSqm
  return baseValue * trendDelta
}
```

**Rationale:**
- Compares current market prices to tax-based value
- Positive delta indicates appreciating market
- Negative delta indicates declining market
- Reflects real-time market conditions

### Data Quality Score

```typescript
const DATA_SOURCE_WEIGHTS = {
  landRegistry: 20,
  planning: 20,
  taxData: 15,
  municipal: 15,
  gis: 15,
  transactions: 15  // Only if ≥5 transactions
}

function calculateDataQuality(data: EnrichedPropertyData): number {
  let score = 0
  
  if (data.landRegistry) score += 20
  if (data.planning) score += 20
  if (data.taxData) score += 15
  if (data.municipal) score += 15
  if (data.gis) score += 15
  if (data.transactions && data.transactions.length >= 5) score += 15
  
  return score  // 0-100
}
```

### Confidence Score

```typescript
function calculateConfidenceScore(dataQuality: number): number {
  const baseConfidence = 60
  const qualityBonus = dataQuality * 0.35
  return Math.min(95, Math.round(baseConfidence + qualityBonus))
}
```

**Rationale:**
- Minimum 60% confidence with no data
- Maximum 95% confidence (never 100% - acknowledges uncertainty)
- Data quality directly impacts confidence
- Formula: 60 + (quality × 0.35), capped at 95

### Value Range Calculation

```typescript
function calculateValueRange(
  estimatedValue: number,
  variance: number = 0.12  // 12% variance
): { min: number, max: number } {
  return {
    min: Math.round(estimatedValue * (1 - variance)),
    max: Math.round(estimatedValue * (1 + variance))
  }
}
```

**Rationale:**
- 12% variance represents market uncertainty
- Wider range for properties with lower data quality
- Provides realistic expectation of value bounds

## API Integration

### Parallel Data Fetching

```typescript
async function enrichPropertyWithGovData(
  propertyId: string,
  address: string
): Promise<EnrichedPropertyData> {
  const [
    landRegistry,
    planning,
    taxData,
    municipal,
    gis,
    transactions
  ] = await Promise.all([
    israelGovAPI.fetchLandRegistryData('12345', '67'),
    israelGovAPI.fetchPlanningData(address),
    israelGovAPI.fetchTaxAssessmentData(propertyId),
    israelGovAPI.fetchMunicipalData(address),
    israelGovAPI.fetchGISData(32.0853, 34.7818),
    israelGovAPI.fetchMarketTransactions(32.0853, 34.7818, 2, 12)
  ])

  return {
    landRegistry,
    planning,
    taxData,
    municipal,
    gis,
    transactions,
    enrichedAt: new Date().toISOString()
  }
}
```

### Error Handling

```typescript
async function fetchWithFallback<T>(
  fetchFn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fetchFn()
  } catch (error) {
    console.error('API fetch failed:', error)
    return fallback
  }
}
```

## Performance Optimization

### Caching Strategy

```typescript
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 1000 * 60 * 60  // 1 hour

function getCachedData(key: string): any | null {
  const cached = cache.get(key)
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > CACHE_DURATION) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}
```

### Request Deduplication

Prevents duplicate simultaneous API calls:

```typescript
const pendingRequests = new Map<string, Promise<any>>()

async function fetchWithDedup(key: string, fetchFn: () => Promise<any>) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)
  }
  
  const promise = fetchFn()
  pendingRequests.set(key, promise)
  
  try {
    const result = await promise
    return result
  } finally {
    pendingRequests.delete(key)
  }
}
```

## Testing

### Unit Tests

```typescript
describe('calculateAutoValuation', () => {
  it('should calculate base value correctly', () => {
    const result = calculateBaseValue(1000000, 100, 1.15)
    expect(result).toBe(1150000)
  })
  
  it('should apply location adjustment', () => {
    const adjustment = calculateLocationAdjustment(1000000, 85)
    expect(adjustment).toBeCloseTo(105000, 0)  // 10.5% premium
  })
  
  it('should handle excellent condition', () => {
    const adjustment = calculateConditionAdjustment(1000000, 'excellent')
    expect(adjustment).toBe(100000)  // 10% premium
  })
})
```

### Integration Tests

```typescript
describe('Auto Valuation Engine', () => {
  it('should fetch all data sources', async () => {
    const data = await enrichPropertyWithGovData('PROP-123', 'Tel Aviv')
    
    expect(data.landRegistry).toBeDefined()
    expect(data.planning).toBeDefined()
    expect(data.taxData).toBeDefined()
    expect(data.municipal).toBeDefined()
    expect(data.gis).toBeDefined()
    expect(data.transactions).toHaveLength.greaterThan(0)
  })
  
  it('should calculate valuation within expected range', async () => {
    const property = mockProperty({ builtArea: 100 })
    const result = await runAutoValuation(property)
    
    expect(result.estimatedValue).toBeGreaterThan(0)
    expect(result.confidenceScore).toBeGreaterThanOrEqual(60)
    expect(result.confidenceScore).toBeLessThanOrEqual(95)
  })
})
```

## Security Considerations

### API Key Management

- Store API keys in environment variables
- Never expose keys in client-side code
- Rotate keys quarterly
- Use separate keys for dev/staging/prod

### Data Privacy

- Comply with Israeli data protection laws
- Encrypt sensitive property data at rest
- Use HTTPS for all API communications
- Log access to personal information

### Rate Limiting

```typescript
const rateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000  // 1 minute
})

async function fetchWithRateLimit(fn: () => Promise<any>) {
  await rateLimiter.acquire()
  return fn()
}
```

## Monitoring and Analytics

### Key Metrics

- **API Success Rate**: % of successful API calls per source
- **Average Response Time**: ms per data source
- **Valuation Accuracy**: Comparison with manual valuations
- **Data Quality Distribution**: Histogram of quality scores
- **User Adoption**: % of properties valued automatically

### Logging

```typescript
interface ValuationLog {
  propertyId: string
  timestamp: string
  dataQuality: number
  confidenceScore: number
  estimatedValue: number
  apiCallDurations: {
    landRegistry: number
    planning: number
    taxData: number
    municipal: number
    gis: number
    transactions: number
  }
  errors: string[]
}
```

## Deployment

### Environment Variables

```bash
# Israeli Government APIs
TABU_API_KEY=xxx
IPLAN_API_KEY=xxx
TAX_AUTHORITY_API_KEY=xxx
MUNICIPAL_API_KEY=xxx
GOVMAP_API_KEY=xxx

# Feature Flags
ENABLE_AUTO_VALUATION=true
ENABLE_CACHING=true
CACHE_DURATION_MS=3600000

# Performance
MAX_CONCURRENT_API_CALLS=6
API_TIMEOUT_MS=5000
```

### Rollout Strategy

1. **Phase 1**: Internal testing (1 week)
2. **Phase 2**: Beta users (select appraisers, 2 weeks)
3. **Phase 3**: Gradual rollout (10% → 50% → 100% over 1 month)
4. **Phase 4**: Monitor metrics and gather feedback

## Future Enhancements

### Machine Learning Integration

Train ML model on historical valuations:
- Features: All government data + appraiser adjustments
- Target: Final appraised value
- Algorithm: Gradient boosting (XGBoost)
- Update model monthly with new data

### Automated Comparable Selection

Use clustering algorithms to find best comparables:
- K-means clustering on property features
- Distance metrics: Euclidean + custom weights
- Filter by time, location, property type

### Real-time Data Streaming

Subscribe to government data updates:
- WebSocket connections to planning databases
- Push notifications for property changes
- Automatic re-valuation triggers

---

**Document Version:** 1.0.0  
**Last Updated:** 2024  
**Author:** AppraisalPro Development Team
