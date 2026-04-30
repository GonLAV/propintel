export type PlanningReliability = 'high' | 'medium' | 'low' | 'manual-required'

export type PlanningRights = {
  farPercentage: number
  floors: number
  mainArea: number
  serviceArea: number
  totalArea: number
  coveragePercentage: number
  heightMeters: number
  allowedUses: string[]
  zoning: string
  planName: string
  planNameHe: string
  municipality: string
  statusHe: string
  approvalDate?: string
  source: string
  sourceUrl: string
  lastUpdate: string
  specialConditions: string[]
  restrictions: string[]
}

export type AutoFetchResult = {
  success: boolean
  planNumber: string
  normalizedPlanNumber: string
  data?: PlanningRights
  source: string
  reliability: PlanningReliability
  message: string
  messageHe: string
  warnings: string[]
  suggestions: string[]
}

export type PlanComparison = {
  previousRights: AutoFetchResult
  newRights: AutoFetchResult
  delta: {
    farDelta: number
    floorsDelta: number
    mainAreaDelta: number
    serviceAreaDelta: number
    totalAreaDelta: number
    percentageIncrease: number
  } | null
  canCalculateLevy: boolean
  issues: string[]
}

export type PlanningMemo = {
  title: string
  generatedAt: string
  previousPlan: string
  newPlan: string
  canCalculateLevy: boolean
  summary: string
  markdown: string
  warnings: string[]
}

type PlanRecord = PlanningRights & {
  planNumber: string
  alternativeNumbers: string[]
}

export const samplePlanNumbers = ['לה/במ/18/1000/א', '415-0792036', 'רמ/מק/3/250', 'ירו/8000/א', 'חי/5/600', 'תמ״א/38/ב']

const knownPlans: PlanRecord[] = [
  {
    planNumber: '415-0792036',
    alternativeNumbers: ['415/0792036', 'תב״ע/415/0792036'],
    planName: 'Comprehensive Building Plan - Ramla',
    planNameHe: 'תכנית בנין עיר מקיפה - רמלה',
    municipality: 'רמלה',
    statusHe: 'מאושרת',
    approvalDate: '2022-08-15',
    farPercentage: 180,
    coveragePercentage: 65,
    heightMeters: 32,
    floors: 10,
    mainArea: 1800,
    serviceArea: 360,
    totalArea: 2160,
    allowedUses: ['מגורים 80%', 'מסחר 15%', 'משרדים 5%'],
    zoning: 'מגורים בצפיפות גבוהה',
    source: 'iPlan - מאגר התכניות הארצי',
    sourceUrl: 'https://www.iplan.gov.il/plans/415-0792036',
    lastUpdate: '2024-01-15',
    specialConditions: ['חובת מקלט', 'תשתית חניה'],
    restrictions: [],
  },
  {
    planNumber: 'לה/במ/18/1000/א',
    alternativeNumbers: ['לה-במ-18-1000-א', 'LH/BM/18/1000/A'],
    planName: 'Old Building Plan - Tel Aviv',
    planNameHe: 'תכנית בנין עיר ישנה - תל אביב',
    municipality: 'תל אביב-יפו',
    statusHe: 'בתוקף',
    approvalDate: '2015-03-20',
    farPercentage: 120,
    coveragePercentage: 50,
    heightMeters: 24,
    floors: 8,
    mainArea: 1200,
    serviceArea: 240,
    totalArea: 1440,
    allowedUses: ['מגורים 100%'],
    zoning: 'מגורים בצפיפות בינונית',
    source: 'iPlan - מאגר התכניות הארצי',
    sourceUrl: 'https://www.iplan.gov.il/plans/lh-bm-18-1000-a',
    lastUpdate: '2024-01-15',
    specialConditions: [],
    restrictions: [],
  },
  {
    planNumber: 'רמ/מק/3/250',
    alternativeNumbers: ['רמ-מק-3-250', 'RM/MK/3/250'],
    planName: 'Ramla Local Plan - Neighborhood 3',
    planNameHe: 'תכנית מקומית רמלה - שכונה 3',
    municipality: 'רמלה',
    statusHe: 'מאושרת',
    approvalDate: '2020-06-10',
    farPercentage: 160,
    coveragePercentage: 60,
    heightMeters: 28,
    floors: 9,
    mainArea: 1600,
    serviceArea: 320,
    totalArea: 1920,
    allowedUses: ['מגורים 85%', 'מסחר 10%', 'משרדים 5%'],
    zoning: 'מגורים ושימושים מעורבים',
    source: 'iPlan - מאגר התכניות הארצי',
    sourceUrl: 'https://www.iplan.gov.il/plans/rm-mk-3-250',
    lastUpdate: '2024-01-15',
    specialConditions: ['חובת מקלט', 'חניה תת קרקעית'],
    restrictions: [],
  },
  {
    planNumber: 'ירו/8000/א',
    alternativeNumbers: ['ירו-8000-א', 'YR/8000/A'],
    planName: 'Jerusalem Building Plan - Old City Outskirts',
    planNameHe: 'תכנית בניה ירושלים - סביבת העיר העתיקה',
    municipality: 'ירושלים',
    statusHe: 'מאושרת',
    approvalDate: '2019-12-05',
    farPercentage: 140,
    coveragePercentage: 55,
    heightMeters: 22,
    floors: 7,
    mainArea: 1400,
    serviceArea: 280,
    totalArea: 1680,
    allowedUses: ['מגורים 90%', 'מסחר 10%'],
    zoning: 'מגורים בשמירה על אופי',
    source: 'iPlan - מאגר התכניות הארצי',
    sourceUrl: 'https://www.iplan.gov.il/plans/yro-8000-a',
    lastUpdate: '2024-01-10',
    specialConditions: ['חובת שימוש באבן ירושלמית', 'בקרת ועדת שימור'],
    restrictions: ['שימור', 'אזור שימור', 'אתר ארכיאולוגי'],
  },
  {
    planNumber: 'חי/5/600',
    alternativeNumbers: ['חי-5-600', 'HI/5/600'],
    planName: 'Haifa Building Plan - Carmel Center',
    planNameHe: 'תכנית בנייה חיפה - מרכז הכרמל',
    municipality: 'חיפה',
    statusHe: 'מאושרת',
    approvalDate: '2021-03-20',
    farPercentage: 200,
    coveragePercentage: 70,
    heightMeters: 36,
    floors: 12,
    mainArea: 2000,
    serviceArea: 400,
    totalArea: 2400,
    allowedUses: ['מגורים 70%', 'מסחר 20%', 'משרדים 10%'],
    zoning: 'שימושים מעורבים בצפיפות גבוהה',
    source: 'iPlan - מאגר התכניות הארצי',
    sourceUrl: 'https://www.iplan.gov.il/plans/hi-5-600',
    lastUpdate: '2024-01-12',
    specialConditions: ['חובת מקלט', 'חניה תת קרקעית', 'שטח ציבורי פתוח'],
    restrictions: [],
  },
  {
    planNumber: 'תמ״א/38/ב',
    alternativeNumbers: ['תמא/38/ב', 'TAMA/38/B'],
    planName: 'National Seismic Strengthening Plan',
    planNameHe: 'תכנית מתאר ארצית לחיזוק מבנים',
    municipality: 'ארצי',
    statusHe: 'מאושרת',
    approvalDate: '2017-05-01',
    farPercentage: 25,
    coveragePercentage: 0,
    heightMeters: 7.5,
    floors: 2.5,
    mainArea: 250,
    serviceArea: 50,
    totalArea: 300,
    allowedUses: ['מגורים 100%'],
    zoning: 'תוספת בנייה לחיזוק מבנים',
    source: 'iPlan - מאגר התכניות הארצי',
    sourceUrl: 'https://www.iplan.gov.il/plans/tama-38',
    lastUpdate: '2024-01-15',
    specialConditions: ['חובת חיזוק סייסמי', 'הריסה ובנייה מחדש'],
    restrictions: [],
  },
]

export function normalizePlanNumber(planNumber: string) {
  return planNumber.trim().replace(/\s+/g, '').replace(/[/\\]/g, '/').toUpperCase()
}

export function fetchPlanningRights(planNumber: string): AutoFetchResult {
  const normalizedPlanNumber = normalizePlanNumber(planNumber)
  const plan = knownPlans.find((item) => item.planNumber === normalizedPlanNumber || item.alternativeNumbers.includes(normalizedPlanNumber))

  if (!plan) {
    return {
      success: false,
      planNumber,
      normalizedPlanNumber,
      source: 'Manual entry required',
      reliability: 'manual-required',
      message: `Plan ${planNumber} was not found in the starter planning dataset.`,
      messageHe: `תכנית ${planNumber} לא נמצאה. נדרש מילוי ידני`,
      warnings: ['לא נמצא במאגר ההדגמה', 'יש לאמת את מספר התכנית במקור הרשמי', 'ניתן להמשיך בהזנה ידנית'],
      suggestions: findSimilarPlans(normalizedPlanNumber),
    }
  }

  const { alternativeNumbers: _alternativeNumbers, planNumber: canonicalPlanNumber, ...data } = plan

  return {
    success: true,
    planNumber: canonicalPlanNumber,
    normalizedPlanNumber,
    data,
    source: plan.source,
    reliability: 'high',
    message: `Successfully matched ${canonicalPlanNumber} in the planning starter dataset.`,
    messageHe: `זכויות הבנייה נשלפו בהצלחה ממאגר ${plan.source}`,
    warnings: ['נתוני הדגמה מובנים. יש לאמת מול iPlan/מבא״ת לפני שימוש משפטי או פיננסי.'],
    suggestions: [],
  }
}

export function comparePlanningRights(previousPlan: string, newPlan: string): PlanComparison {
  const previousRights = fetchPlanningRights(previousPlan)
  const newRights = fetchPlanningRights(newPlan)
  const issues: string[] = []

  if (!previousRights.success) {
    issues.push(`Previous plan: ${previousRights.messageHe}`)
  }

  if (!newRights.success) {
    issues.push(`New plan: ${newRights.messageHe}`)
  }

  if (!previousRights.data || !newRights.data) {
    return { previousRights, newRights, delta: null, canCalculateLevy: false, issues }
  }

  const totalAreaDelta = newRights.data.totalArea - previousRights.data.totalArea
  const delta = {
    farDelta: newRights.data.farPercentage - previousRights.data.farPercentage,
    floorsDelta: newRights.data.floors - previousRights.data.floors,
    mainAreaDelta: newRights.data.mainArea - previousRights.data.mainArea,
    serviceAreaDelta: newRights.data.serviceArea - previousRights.data.serviceArea,
    totalAreaDelta,
    percentageIncrease: previousRights.data.totalArea > 0 ? (totalAreaDelta / previousRights.data.totalArea) * 100 : 0,
  }

  if (totalAreaDelta <= 0) {
    issues.push('התכנית החדשה אינה מוסיפה זכויות בנייה')
  }

  return {
    previousRights,
    newRights,
    delta,
    canCalculateLevy: totalAreaDelta > 0,
    issues,
  }
}

export function buildPlanningMemo(previousPlan: string, newPlan: string): PlanningMemo {
  const comparison = comparePlanningRights(previousPlan, newPlan)
  const generatedAt = new Date().toISOString()
  const previous = comparison.previousRights.data
  const current = comparison.newRights.data
  const delta = comparison.delta

  const title = `Planning Rights Memo - ${comparison.previousRights.planNumber} to ${comparison.newRights.planNumber}`
  const summary = delta
    ? `The new plan changes total buildable area by ${formatSigned(delta.totalAreaDelta)} sqm (${formatSigned(delta.percentageIncrease)}%).`
    : 'Planning rights could not be compared because one or both plans require manual verification.'

  const warnings = [
    'Starter planning data only. Verify all rights, restrictions, dates, and documents against iPlan, Mavat, or the competent planning authority before legal or financial use.',
    ...comparison.previousRights.warnings,
    ...comparison.newRights.warnings,
    ...comparison.issues,
  ].filter(Boolean)

  const markdown = [
    `# ${title}`,
    '',
    `Generated: ${generatedAt}`,
    '',
    '## Executive Summary',
    summary,
    '',
    `Betterment levy readiness: ${comparison.canCalculateLevy ? 'Ready for professional review' : 'Manual review required'}`,
    '',
    '## Previous Plan',
    renderPlanSection(comparison.previousRights.planNumber, previous),
    '',
    '## New Plan',
    renderPlanSection(comparison.newRights.planNumber, current),
    '',
    '## Rights Delta',
    delta
      ? [
          `- FAR: ${formatSigned(delta.farDelta)}%`,
          `- Floors: ${formatSigned(delta.floorsDelta)}`,
          `- Main area: ${formatSigned(delta.mainAreaDelta)} sqm`,
          `- Service area: ${formatSigned(delta.serviceAreaDelta)} sqm`,
          `- Total buildable area: ${formatSigned(delta.totalAreaDelta)} sqm`,
          `- Percentage increase: ${formatSigned(delta.percentageIncrease)}%`,
        ].join('\n')
      : '- Delta unavailable until both plans are verified.',
    '',
    '## Verification Notes',
    ...Array.from(new Set(warnings)).map((warning) => `- ${warning}`),
    '',
  ].join('\n')

  return {
    title,
    generatedAt,
    previousPlan: comparison.previousRights.planNumber,
    newPlan: comparison.newRights.planNumber,
    canCalculateLevy: comparison.canCalculateLevy,
    summary,
    markdown,
    warnings: Array.from(new Set(warnings)),
  }
}

function renderPlanSection(planNumber: string, plan?: PlanningRights) {
  if (!plan) return `- Plan number: ${planNumber}\n- Status: manual verification required`

  return [
    `- Plan number: ${planNumber}`,
    `- Name: ${plan.planNameHe}`,
    `- Municipality: ${plan.municipality}`,
    `- Status: ${plan.statusHe}`,
    `- Approval date: ${plan.approvalDate || 'N/A'}`,
    `- FAR: ${plan.farPercentage}%`,
    `- Floors: ${plan.floors}`,
    `- Main area: ${plan.mainArea.toLocaleString('en-US')} sqm`,
    `- Service area: ${plan.serviceArea.toLocaleString('en-US')} sqm`,
    `- Total buildable area: ${plan.totalArea.toLocaleString('en-US')} sqm`,
    `- Zoning: ${plan.zoning}`,
    `- Allowed uses: ${plan.allowedUses.join(', ')}`,
    `- Source: ${plan.source}`,
  ].join('\n')
}

function formatSigned(value: number) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1))
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('en-US')}`
}

function findSimilarPlans(planNumber: string) {
  return knownPlans
    .map((plan) => ({ plan, score: similarity(planNumber, plan.planNumber) }))
    .filter((item) => item.score > 0.45)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((item) => `${item.plan.planNumber} - ${item.plan.planNameHe}`)
}

function similarity(left: string, right: string) {
  const longer = left.length > right.length ? left : right
  const shorter = left.length > right.length ? right : left

  if (!longer.length) return 1

  let matches = 0
  for (const character of shorter) {
    if (longer.includes(character)) matches += 1
  }

  return matches / longer.length
}
