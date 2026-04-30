export type DealTwinMode = 'acquire' | 'hold' | 'redevelop'

export type DealTwinScenario = {
  id: string
  assetName: string
  city: string
  mode: DealTwinMode
  askingPrice: number
  estimatedValue: number
  annualRent: number
  capex: number
  planningUpsideSqm: number
  riskScore: number
  confidence: number
  debtRatio: number
  exitCapRate: number
}

export type DealTwinInput = Omit<DealTwinScenario, 'id' | 'assetName' | 'city'> & {
  assetName?: string
  city?: string
}

export type DealTwinCondition = {
  label: string
  current: string
  target: string
  impact: 'high' | 'medium' | 'low'
  status: 'met' | 'watch' | 'blocked'
}

export type DealTwinAction = {
  title: string
  owner: string
  due: string
  reason: string
}

export type DealTwinResult = {
  verdict: 'investigate' | 'negotiate' | 'approve' | 'decline'
  conviction: number
  equityGap: number
  breakEvenPrice: number
  upsideCapture: number
  yieldOnCost: number
  stressLoss: number
  narrative: string
  conditions: DealTwinCondition[]
  actions: DealTwinAction[]
  boardMemo: string
}

export const sampleDealTwinScenarios: DealTwinScenario[] = [
  {
    id: 'rothschild-renewal',
    assetName: 'Rothschild 18 renewal block',
    city: 'Tel Aviv',
    mode: 'redevelop',
    askingPrice: 2840000,
    estimatedValue: 3120000,
    annualRent: 126000,
    capex: 420000,
    planningUpsideSqm: 280,
    riskScore: 38,
    confidence: 91,
    debtRatio: 58,
    exitCapRate: 4.9,
  },
  {
    id: 'haneviim-preservation',
    assetName: 'HaNeviim 42 preservation asset',
    city: 'Jerusalem',
    mode: 'hold',
    askingPrice: 1910000,
    estimatedValue: 2020000,
    annualRent: 84000,
    capex: 180000,
    planningUpsideSqm: 80,
    riskScore: 64,
    confidence: 84,
    debtRatio: 52,
    exitCapRate: 5.6,
  },
  {
    id: 'yigal-alon-income',
    assetName: 'Yigal Alon 96 income tower',
    city: 'Tel Aviv',
    mode: 'acquire',
    askingPrice: 6420000,
    estimatedValue: 6760000,
    annualRent: 396000,
    capex: 250000,
    planningUpsideSqm: 130,
    riskScore: 42,
    confidence: 89,
    debtRatio: 61,
    exitCapRate: 6.1,
  },
]

const costPerPlanningSqm = 4200
const planningValuePerSqm = 9800

export function getDealTwinScenario(id: string) {
  return sampleDealTwinScenarios.find((scenario) => scenario.id === id) || sampleDealTwinScenarios[0]
}

export function analyzeDealTwin(input: DealTwinInput): DealTwinResult {
  const scenario = normalizeInput(input)
  const planningNetValue = scenario.planningUpsideSqm * Math.max(0, planningValuePerSqm - costPerPlanningSqm)
  const stabilizedValue = scenario.estimatedValue + planningNetValue - scenario.capex
  const riskHaircut = stabilizedValue * (scenario.riskScore / 100) * 0.16
  const confidenceHaircut = stabilizedValue * ((100 - scenario.confidence) / 100) * 0.12
  const riskAdjustedValue = stabilizedValue - riskHaircut - confidenceHaircut
  const equityRequired = scenario.askingPrice * (1 - scenario.debtRatio / 100) + scenario.capex
  const equityValue = riskAdjustedValue - scenario.askingPrice * (scenario.debtRatio / 100)
  const equityGap = equityValue - equityRequired
  const yieldOnCost = (scenario.annualRent / Math.max(1, scenario.askingPrice + scenario.capex)) * 100
  const upsideCapture = ((riskAdjustedValue - scenario.askingPrice) / Math.max(1, scenario.askingPrice)) * 100
  const breakEvenPrice = Math.max(0, riskAdjustedValue - scenario.capex * 0.35)
  const stressLoss = calculateStressLoss(scenario, riskAdjustedValue)
  const conviction = calculateConviction({ equityGap, yieldOnCost, upsideCapture, stressLoss, scenario })
  const verdict = chooseVerdict(conviction, equityGap, stressLoss)
  const conditions = buildConditions(scenario, breakEvenPrice, yieldOnCost, upsideCapture, stressLoss)
  const actions = buildActions(scenario, conditions, verdict)
  const narrative = buildNarrative(scenario, verdict, conviction, equityGap, breakEvenPrice)

  return {
    verdict,
    conviction,
    equityGap: Math.round(equityGap),
    breakEvenPrice: Math.round(breakEvenPrice),
    upsideCapture: roundOne(upsideCapture),
    yieldOnCost: roundOne(yieldOnCost),
    stressLoss: Math.round(stressLoss),
    narrative,
    conditions,
    actions,
    boardMemo: buildBoardMemo(scenario, verdict, conviction, equityGap, breakEvenPrice, conditions, actions),
  }
}

function normalizeInput(input: DealTwinInput): DealTwinScenario {
  return {
    id: 'custom',
    assetName: input.assetName || 'Custom investment candidate',
    city: input.city || 'Market',
    mode: input.mode,
    askingPrice: clamp(input.askingPrice, 100000, 1000000000),
    estimatedValue: clamp(input.estimatedValue, 100000, 1000000000),
    annualRent: clamp(input.annualRent, 0, 100000000),
    capex: clamp(input.capex, 0, 1000000000),
    planningUpsideSqm: clamp(input.planningUpsideSqm, 0, 1000000),
    riskScore: clamp(input.riskScore, 0, 100),
    confidence: clamp(input.confidence, 0, 100),
    debtRatio: clamp(input.debtRatio, 0, 85),
    exitCapRate: clamp(input.exitCapRate, 1, 20),
  }
}

function calculateStressLoss(scenario: DealTwinScenario, riskAdjustedValue: number) {
  const capRateShock = scenario.annualRent / Math.max(0.01, (scenario.exitCapRate + 1.25) / 100)
  const downsideValue = Math.min(riskAdjustedValue * 0.88, capRateShock + scenario.planningUpsideSqm * 2800)
  return Math.max(0, scenario.askingPrice + scenario.capex - downsideValue)
}

function calculateConviction(values: { equityGap: number; yieldOnCost: number; upsideCapture: number; stressLoss: number; scenario: DealTwinScenario }) {
  const gapScore = clamp(50 + values.equityGap / 50000, 0, 100)
  const yieldScore = clamp(values.yieldOnCost * 10, 0, 100)
  const upsideScore = clamp(50 + values.upsideCapture * 2, 0, 100)
  const stressScore = clamp(100 - values.stressLoss / Math.max(1, values.scenario.askingPrice) * 240, 0, 100)
  const confidenceScore = values.scenario.confidence
  const riskScore = 100 - values.scenario.riskScore

  return Math.round(gapScore * 0.22 + yieldScore * 0.16 + upsideScore * 0.2 + stressScore * 0.18 + confidenceScore * 0.14 + riskScore * 0.1)
}

function chooseVerdict(conviction: number, equityGap: number, stressLoss: number): DealTwinResult['verdict'] {
  if (conviction >= 78 && equityGap > 0 && stressLoss < 250000) return 'approve'
  if (conviction >= 62 && equityGap > -150000) return 'negotiate'
  if (conviction >= 45) return 'investigate'
  return 'decline'
}

function buildConditions(scenario: DealTwinScenario, breakEvenPrice: number, yieldOnCost: number, upsideCapture: number, stressLoss: number): DealTwinCondition[] {
  return [
    {
      label: 'Price discipline',
      current: formatCurrency(scenario.askingPrice),
      target: `At or below ${formatCurrency(breakEvenPrice)}`,
      impact: 'high',
      status: scenario.askingPrice <= breakEvenPrice ? 'met' : 'blocked',
    },
    {
      label: 'Income resilience',
      current: `${roundOne(yieldOnCost)}% yield on cost`,
      target: 'At least 4.8% after capex',
      impact: 'medium',
      status: yieldOnCost >= 4.8 ? 'met' : yieldOnCost >= 4.1 ? 'watch' : 'blocked',
    },
    {
      label: 'Planning value capture',
      current: `${roundOne(upsideCapture)}% risk-adjusted upside`,
      target: 'At least 7.5% upside',
      impact: 'high',
      status: upsideCapture >= 7.5 ? 'met' : upsideCapture >= 3 ? 'watch' : 'blocked',
    },
    {
      label: 'Downside containment',
      current: `${formatCurrency(stressLoss)} modeled loss`,
      target: 'Stress loss below 8% of basis',
      impact: 'high',
      status: stressLoss / Math.max(1, scenario.askingPrice + scenario.capex) <= 0.08 ? 'met' : 'watch',
    },
  ]
}

function buildActions(scenario: DealTwinScenario, conditions: DealTwinCondition[], verdict: DealTwinResult['verdict']): DealTwinAction[] {
  const blocked = conditions.filter((condition) => condition.status === 'blocked')
  const watch = conditions.filter((condition) => condition.status === 'watch')

  return [
    {
      title: verdict === 'approve' ? 'Prepare investment committee pack' : 'Open counteroffer path',
      owner: 'Acquisitions lead',
      due: '24h',
      reason: verdict === 'approve' ? 'The twin shows investable conditions are currently met.' : `Anchor below ${formatCurrency(analyzeCounteroffer(scenario))} before legal diligence.` ,
    },
    {
      title: blocked.length ? `Resolve ${blocked[0].label.toLowerCase()}` : 'Verify official planning documents',
      owner: blocked.length ? ownerForCondition(blocked[0].label) : 'Planning counsel',
      due: '48h',
      reason: blocked.length ? blocked[0].target : 'Planning upside is material and should be verified against source records.',
    },
    {
      title: watch.length ? `Stress-test ${watch[0].label.toLowerCase()}` : 'Lock lender term sheet sensitivity',
      owner: 'Finance partner',
      due: '72h',
      reason: watch.length ? watch[0].current : 'Debt terms are a primary driver of equity gap and stress loss.',
    },
  ]
}

function analyzeCounteroffer(scenario: DealTwinScenario) {
  const planningNetValue = scenario.planningUpsideSqm * Math.max(0, planningValuePerSqm - costPerPlanningSqm)
  const stabilizedValue = scenario.estimatedValue + planningNetValue - scenario.capex
  const riskHaircut = stabilizedValue * (scenario.riskScore / 100) * 0.16
  const confidenceHaircut = stabilizedValue * ((100 - scenario.confidence) / 100) * 0.12
  const riskAdjustedValue = stabilizedValue - riskHaircut - confidenceHaircut
  const breakEvenPrice = Math.max(0, riskAdjustedValue - scenario.capex * 0.35)

  return Math.min(scenario.askingPrice * 0.96, breakEvenPrice)
}

function ownerForCondition(label: string) {
  if (label.includes('Income')) return 'Asset management'
  if (label.includes('Price')) return 'Acquisitions lead'
  if (label.includes('Planning')) return 'Planning counsel'
  return 'Finance partner'
}

function buildNarrative(scenario: DealTwinScenario, verdict: DealTwinResult['verdict'], conviction: number, equityGap: number, breakEvenPrice: number) {
  const direction = verdict === 'approve' ? 'clears the current investment bar' : verdict === 'decline' ? 'does not yet justify capital' : 'needs targeted proof before capital is committed'
  return `${scenario.assetName} ${direction}. Conviction is ${conviction}/100, with a ${formatCurrency(equityGap)} equity gap and a break-even price of ${formatCurrency(breakEvenPrice)}.`
}

function buildBoardMemo(scenario: DealTwinScenario, verdict: DealTwinResult['verdict'], conviction: number, equityGap: number, breakEvenPrice: number, conditions: DealTwinCondition[], actions: DealTwinAction[]) {
  return [
    `# Deal Twin Memo - ${scenario.assetName}`,
    '',
    `Verdict: ${verdict.toUpperCase()}`,
    `Conviction: ${conviction}/100`,
    `City: ${scenario.city}`,
    `Mode: ${scenario.mode}`,
    '',
    '## Counterfactual Question',
    'What would need to be true for this asset to deserve capital today?',
    '',
    '## Economics',
    `- Asking price: ${formatCurrency(scenario.askingPrice)}`,
    `- Break-even price: ${formatCurrency(breakEvenPrice)}`,
    `- Equity gap: ${formatCurrency(equityGap)}`,
    `- Planning upside: ${scenario.planningUpsideSqm.toLocaleString('en-US')} sqm`,
    '',
    '## Approval Conditions',
    ...conditions.map((condition) => `- ${condition.label}: ${condition.current}; target ${condition.target}; status ${condition.status}`),
    '',
    '## Next Actions',
    ...actions.map((action) => `- ${action.owner}: ${action.title} (${action.due}) - ${action.reason}`),
    '',
    '## Verification Note',
    'This deterministic twin uses configured assumptions and starter product data. Verify source records, financing terms, legal constraints, and planning rights before any investment decision.',
    '',
  ].join('\n')
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}

function roundOne(value: number) {
  return Number(value.toFixed(1))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}