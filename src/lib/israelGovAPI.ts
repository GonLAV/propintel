import { createLogger } from '@/lib/logger'

const log = createLogger('IsraelGovAPI')

export interface LandRegistryData {
  parcelId: string
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

export interface PlanningData {
  planNumber: string
  planName: string
  planNameHe: string
  planType: 'תב״ע' | 'תמ״א' | 'תכנית מתאר' | 'תכנית מפורטת'
  status: 'approved' | 'pending' | 'in-review' | 'rejected' | 'appealed'
  statusHe: string
  approvalDate?: string
  publicationDate?: string
  buildingRights: {
    far: number
    coverage: number
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

export interface TaxAssessmentData {
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

export interface MunicipalData {
  municipalityName: string
  municipalityCode: string
  neighborhood: string
  neighborhoodCode: string
  statisticalArea: string
  infrastructure: {
    water: boolean
    sewage: boolean
    electricity: boolean
    gas: boolean
    fiber: boolean
  }
  publicServices: {
    schools: Array<{
      name: string
      type: 'elementary' | 'middle' | 'high'
      distance: number
      rating?: number
    }>
    parks: Array<{
      name: string
      area: number
      distance: number
    }>
    publicTransport: Array<{
      type: 'bus' | 'train' | 'light-rail'
      line: string
      distance: number
    }>
  }
  developmentPlans: Array<{
    project: string
    projectHe: string
    budget: number
    startDate?: string
    completionDate?: string
    impact: string
  }>
}

export interface GISData {
  coordinates: {
    latitude: number
    longitude: number
  }
  elevation: number
  slope: number
  aspect: string
  soilType: string
  floodZone: boolean
  earthquakeZone: number
  protectedArea: boolean
  archaeologicalSite: boolean
  environmentalRestrictions: string[]
  viewshed: {
    hasView: boolean
    viewQuality: 'poor' | 'fair' | 'good' | 'excellent'
    visibleLandmarks: string[]
  }
  accessibility: {
    distanceToHighway: number
    distanceToPublicTransport: number
    walkabilityScore: number
  }
}

export interface MarketTransactionData {
  transactionId: string
  transactionDate: string
  price: number
  pricePerSqm: number
  address: string
  city?: string
  neighborhood?: string
  propertyType: string
  rooms: number
  area: number
  floor: number
  totalFloors: number
  condition: string
  age: number
  features: string[]
  verified: boolean
  source: 'land-registry' | 'tax-authority' | 'broker' | 'platform'
}

class IsraeliGovernmentAPI {
  private baseUrls = {
    landRegistry: 'https://data.gov.il/api/3/action',
    planning: 'https://www.iplan.gov.il/api',
    taxAuthority: 'https://taxes.gov.il/api',
    municipal: 'https://www.municipalities.org.il/api',
    gis: 'https://www.govmap.gov.il/api',
    cbs: 'https://www.cbs.gov.il/api'
  }

  private apiKey: string | null = null

  setApiKey(key: string) {
    this.apiKey = key
  }

  async fetchLandRegistryData(gush: string, helka: string): Promise<LandRegistryData> {
    await this.simulateNetworkDelay()
    
    return this.generateMockLandRegistryData(gush, helka)
  }

  async fetchPlanningData(address: string): Promise<PlanningData> {
    await this.simulateNetworkDelay()
    void address
    return this.generateMockPlanningData()
  }

  async fetchTaxAssessmentData(propertyId: string): Promise<TaxAssessmentData> {
    await this.simulateNetworkDelay()
    
    return this.generateMockTaxData(propertyId)
  }

  async fetchMunicipalData(address: string): Promise<MunicipalData> {
    await this.simulateNetworkDelay()
    void address
    return this.generateMockMunicipalData()
  }

  async fetchGISData(latitude: number, longitude: number): Promise<GISData> {
    await this.simulateNetworkDelay()
    
    return this.generateMockGISData(latitude, longitude)
  }

  async fetchMarketTransactions(
    lat: number,
    lng: number,
    radiusKm: number,
    months: number
  ): Promise<MarketTransactionData[]> {
    await this.simulateNetworkDelay()
    
    return this.generateMockTransactions(lat, lng, radiusKm, months)
  }

  async validatePropertyAddress(address: string): Promise<{
    valid: boolean
    normalized: string
    suggestions: string[]
  }> {
    await this.simulateNetworkDelay(300)
    
    return {
      valid: true,
      normalized: address,
      suggestions: []
    }
  }

  private async simulateNetworkDelay(ms: number = 800) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateMockLandRegistryData(gush: string, helka: string): LandRegistryData {
    return {
      parcelId: `${gush}/${helka}`,
      gush,
      helka,
      subHelka: Math.random() > 0.5 ? '1' : undefined,
      owners: [
        {
          name: 'דוד כהן',
          idNumber: '123456789',
          sharePercentage: 100,
          acquisitionDate: '2015-03-15'
        }
      ],
      encumbrances: [
        {
          type: 'mortgage',
          typeHe: 'משכנתא',
          amount: 850000,
          creditor: 'בנק הפועלים',
          registrationDate: '2015-03-20',
          status: 'active'
        }
      ],
      propertyRights: {
        ownershipType: 'full',
        ownershipTypeHe: 'בעלות מלאה',
        registrationDate: '2015-03-15',
        area: 95,
        restrictions: []
      },
      legalStatus: 'encumbered',
      lastUpdate: new Date().toISOString()
    }
  }

  private generateMockPlanningData(): PlanningData {
    return {
      planNumber: 'תב״ע/מק/1234/ב',
      planName: 'Plan for Residential Development',
      planNameHe: 'תכנית למגורים',
      planType: 'תב״ע',
      status: 'approved',
      statusHe: 'מאושרת',
      approvalDate: '2018-06-15',
      publicationDate: '2018-07-01',
      buildingRights: {
        far: 120,
        coverage: 60,
        heightMeters: 24,
        heightFloors: 8,
        setbacks: {
          front: 5,
          rear: 3,
          side: 3
        }
      },
      zoningDesignation: 'Residential A',
      zoningDesignationHe: 'מגורים א',
      permittedUses: ['Residential', 'Mixed Use'],
      permittedUsesHe: ['מגורים', 'שימוש מעורב'],
      buildingPermits: [
        {
          permitNumber: 'BP-2019-4567',
          permitType: 'Renovation',
          permitTypeHe: 'שיפוץ',
          issueDate: '2019-05-10',
          area: 20,
          floors: 1,
          status: 'active'
        }
      ],
      violations: [],
      futureChanges: [
        {
          planNumber: 'תמ״א 38/ב',
          description: 'Seismic strengthening plan',
          descriptionHe: 'תכנית חיזוק מבנים',
          expectedApproval: '2025-12-31',
          impact: 'positive'
        }
      ]
    }
  }

  private generateMockTaxData(propertyId: string): TaxAssessmentData {
    const currentYear = new Date().getFullYear()
    return {
      propertyId,
      taxAssessedValue: 1850000,
      assessmentYear: currentYear,
      assessmentDate: `${currentYear}-01-01`,
      previousValues: [
        { year: currentYear - 1, value: 1750000 },
        { year: currentYear - 2, value: 1650000 },
        { year: currentYear - 3, value: 1550000 }
      ],
      arnona: {
        annualAmount: 8500,
        ratePerSqm: 89.5,
        exemptions: [
          {
            type: 'senior-citizen',
            typeHe: 'אזרח ותיק',
            percentage: 10,
            amount: 850
          }
        ]
      },
      improvementTax: {
        paid: [],
        pending: []
      },
      purchaseTax: {
        bracket: 3,
        rate: 5.0,
        exemptions: []
      }
    }
  }

  private generateMockMunicipalData(): MunicipalData {
    return {
      municipalityName: 'Tel Aviv-Yafo',
      municipalityCode: '5000',
      neighborhood: 'Florentin',
      neighborhoodCode: '5012',
      statisticalArea: '501201',
      infrastructure: {
        water: true,
        sewage: true,
        electricity: true,
        gas: true,
        fiber: true
      },
      publicServices: {
        schools: [
          {
            name: 'בית ספר אלון',
            type: 'elementary',
            distance: 450,
            rating: 8
          },
          {
            name: 'תיכון ירושלים',
            type: 'high',
            distance: 1200,
            rating: 9
          }
        ],
        parks: [
          {
            name: 'גן לוינסקי',
            area: 5000,
            distance: 300
          }
        ],
        publicTransport: [
          {
            type: 'bus',
            line: '10',
            distance: 150
          },
          {
            type: 'bus',
            line: '42',
            distance: 200
          }
        ]
      },
      developmentPlans: [
        {
          project: 'Light Rail Extension',
          projectHe: 'הרחבת הרכבת הקלה',
          budget: 2500000000,
          startDate: '2024-01-01',
          completionDate: '2027-12-31',
          impact: 'שיפור משמעותי בתחבורה ציבורית'
        }
      ]
    }
  }

  private generateMockGISData(latitude: number, longitude: number): GISData {
    return {
      coordinates: { latitude, longitude },
      elevation: 25,
      slope: 2.5,
      aspect: 'Southeast',
      soilType: 'Urban Fill',
      floodZone: false,
      earthquakeZone: 7,
      protectedArea: false,
      archaeologicalSite: false,
      environmentalRestrictions: [],
      viewshed: {
        hasView: true,
        viewQuality: 'good',
        visibleLandmarks: ['Mediterranean Sea', 'Azrieli Towers']
      },
      accessibility: {
        distanceToHighway: 2500,
        distanceToPublicTransport: 200,
        walkabilityScore: 85
      }
    }
  }

  private generateMockTransactions(
    lat: number,
    lng: number,
    radiusKm: number,
    months: number
  ): MarketTransactionData[] {
    const transactions: MarketTransactionData[] = []
    const count = Math.floor(Math.random() * 15) + 10
    
    const cities = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה']
    const neighborhoods = [
      'צפון ישן', 'נווה צדק', 'רמת אביב', 'פלורנטין', 'שכונה ג׳',
      'רמת שרת', 'מרכז העיר', 'הדר', 'נאות אפקה', 'גן העיר'
    ]
    
    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * months * 30)
      const date = new Date()
      date.setDate(date.getDate() - daysAgo)
      
      const area = 60 + Math.floor(Math.random() * 80)
      const pricePerSqm = 18000 + Math.floor(Math.random() * 8000)
      const city = cities[Math.floor(Math.random() * cities.length)]
      const neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)]
      
      transactions.push({
        transactionId: `TX-${Date.now()}-${i}`,
        transactionDate: date.toISOString().split('T')[0],
        price: area * pricePerSqm,
        pricePerSqm,
        address: `רחוב הרצל ${10 + i}, ${city}`,
        city,
        neighborhood,
        propertyType: 'apartment',
        rooms: 2 + Math.floor(Math.random() * 3),
        area,
        floor: Math.floor(Math.random() * 8),
        totalFloors: 5 + Math.floor(Math.random() * 5),
        condition: ['משופץ', 'שמור', 'דורש שיפוץ'][Math.floor(Math.random() * 3)],
        age: Math.floor(Math.random() * 40),
        features: ['מעלית', 'מרפסת', 'חניה'].filter(() => Math.random() > 0.5),
        verified: Math.random() > 0.2,
        source: 'land-registry'
      })
    }
    
    return transactions.sort((a, b) => 
      new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    )
  }
}

export const israelGovAPI = new IsraeliGovernmentAPI()

export async function enrichPropertyWithGovData(propertyId: string, address: string) {
  try {
    const [landRegistry, planning, taxData, municipal, gis, transactions] = await Promise.all([
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
  } catch (error) {
    log.error('Error enriching property data:', error)
    throw error
  }
}
