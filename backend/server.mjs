import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { runMvpIngestionPipeline } from './mvp-ingestion.mjs'
import {
  checkPersistenceHealth,
  getIngestionRun as getPersistedIngestionRun,
  listIngestionRuns as listPersistedIngestionRuns,
  saveIngestionRun,
} from './persistence.mjs'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const comparableRuns = new Map()
const reports = new Map()
const auditEvents = []

const valuationStrategies = new Set(['mean', 'weighted-mean', 'hedonic'])

app.get('/', (_req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Appraisal Backend</title>
        <style>body{font-family:system-ui, Arial; padding:24px} code{background:#f4f4f5; padding:2px 6px; border-radius:4px}</style>
      </head>
      <body>
        <h1>Appraisal Backend</h1>
        <p>Status: <a href="/health">/health</a></p>
        <p>Frontend UI runs at <code>http://localhost:5001/</code> (Vite dev server).</p>
        <p>Sample API: POST <code>/api/v1/comparables/search</code> and <code>/api/v1/reports/generate</code>.</p>
      </body>
    </html>
  `)
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/v1/health/db', async (_req, res) => {
  const health = await checkPersistenceHealth()
  if (health.status === 'error') {
    return res.status(500).json(health)
  }
  return res.json(health)
})

// --- Ingestion pipeline -----------------------------------------------------
app.post('/api/v1/ingestion/run', async (req, res) => {
  const { transactions = [], listings = [], createdBy = 'system' } = req.body || {}

  if (!Array.isArray(transactions) || !Array.isArray(listings)) {
    return res.status(400).json({ error: 'transactions and listings must be arrays' })
  }

  const runId = `ing_${crypto.randomUUID()}`
  const started = Date.now()

  const txResult = runMvpIngestionPipeline(transactions, 'transaction')
  const listingResult = runMvpIngestionPipeline(listings, 'listing')

  const payload = {
    runId,
    createdBy,
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    transactions: txResult,
    listings: listingResult,
    summary: {
      input: transactions.length + listings.length,
      cleaned: txResult.cleaned.length + listingResult.cleaned.length,
      duplicates: txResult.duplicates.length + listingResult.duplicates.length,
      errors: txResult.errors.length + listingResult.errors.length,
      avgConfidence:
        weightedAvg([
          { v: txResult.stats.avgConfidence, n: txResult.cleaned.length },
          { v: listingResult.stats.avgConfidence, n: listingResult.cleaned.length },
        ]),
    },
  }

  await saveIngestionRun(payload)
  pushAudit('ingestion-run', runId, 'create', {
    createdBy,
    totalTransactions: transactions.length,
    totalListings: listings.length,
    elapsedMs: payload.elapsedMs,
  })

  return res.json(payload)
})

app.get('/api/v1/ingestion/runs', async (_req, res) => {
  const runs = (await listPersistedIngestionRuns(100))
    .map((x) => ({
      runId: x.runId,
      createdBy: x.createdBy,
      createdAt: x.createdAt,
      elapsedMs: x.elapsedMs,
      summary: x.summary,
    }))

  return res.json({ count: runs.length, runs })
})

app.get('/api/v1/ingestion/:runId', async (req, res) => {
  const run = await getPersistedIngestionRun(req.params.runId)
  if (!run) return res.status(404).json({ error: 'Ingestion run not found' })
  return res.json(run)
})

// --- Comparable search ------------------------------------------------------
app.post('/api/v1/comparables/search', (req, res) => {
  const { subject, comparablesPool = [], topK = 25, requestedBy = 'system' } = req.body || {}
  if (!subject || !Array.isArray(comparablesPool)) {
    return res.status(400).json({ error: 'subject and comparablesPool are required' })
  }

  const runId = `run_${crypto.randomUUID()}`
  const started = Date.now()

  const ranked = comparablesPool
    .map((comp) => {
      const distanceMeters = haversine(subject.lat, subject.lng, comp.lat, comp.lng)
      const similarity = similarityScore(subject, comp, distanceMeters)
      const adjustment = ruleBasedAdjustment(subject, comp)
      const adjustedPrice = Math.round((comp.salePrice ?? 0) * (1 + adjustment.totalPercent))
      const weight = comparableWeight(similarity, distanceMeters, comp.saleDate)

      return {
        candidateId: `cand_${crypto.randomUUID()}`,
        comparable: comp,
        similarity,
        distanceMeters,
        adjustment,
        adjustedPrice,
        weight,
        explanation: explainComparable(subject, comp, similarity, distanceMeters),
      }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.min(100, Math.max(1, topK)))

  const run = {
    id: runId,
    createdAt: new Date().toISOString(),
    requestedBy,
    subject,
    comparables: ranked,
    elapsedMs: Date.now() - started,
  }

  comparableRuns.set(runId, run)
  pushAudit('comparable-run', runId, 'create', { requestedBy, topK })

  return res.json({
    runId,
    elapsedMs: run.elapsedMs,
    comparables: ranked.map((x) => ({
      candidateId: x.candidateId,
      comparableId: x.comparable.id,
      similarity: x.similarity,
      distanceMeters: x.distanceMeters,
      adjustment: x.adjustment,
      adjustedPrice: x.adjustedPrice,
      weight: x.weight,
      explanation: x.explanation,
    })),
  })
})

app.post('/api/v1/comparables/:runId/adjustments/override', (req, res) => {
  const { runId } = req.params
  const { candidateId, patch, appraiserId, reason } = req.body || {}
  const run = comparableRuns.get(runId)

  if (!run) return res.status(404).json({ error: 'Comparable run not found' })
  if (!candidateId || !patch || !appraiserId || !reason) {
    return res.status(400).json({ error: 'candidateId, patch, appraiserId, and reason are required' })
  }

  const idx = run.comparables.findIndex((x) => x.candidateId === candidateId)
  if (idx < 0) return res.status(404).json({ error: 'Candidate not found in run' })

  const current = run.comparables[idx]
  const next = {
    ...current.adjustment,
    ...patch,
  }

  next.totalPercent = clamp(
    Number(next.floor ?? 0) +
      Number(next.elevator ?? 0) +
      Number(next.renovation ?? 0) +
      Number(next.balcony ?? 0) +
      Number(next.parking ?? 0) +
      Number(next.view ?? 0) +
      Number(next.noise ?? 0) +
      Number(next.size ?? 0) +
      Number(next.planningPotential ?? 0) +
      Number(next.mlResidual ?? 0),
    -0.25,
    0.25,
  )
  const adjustedPrice = Math.round((current.comparable.salePrice ?? 0) * (1 + next.totalPercent))

  run.comparables[idx] = {
    ...current,
    adjustment: next,
    adjustedPrice,
  }

  const auditEventId = `audit_${crypto.randomUUID()}`
  pushAudit('adjustment-override', candidateId, 'update', {
    auditEventId,
    appraiserId,
    reason,
    patch,
  })

  return res.json({
    runId,
    candidateId,
    adjustedPrice,
    updatedAdjustment: next,
    auditEventId,
  })
})

// --- Valuation --------------------------------------------------------------
app.post('/api/v1/valuations/estimate', (req, res) => {
  const { runId, strategy = 'weighted-mean' } = req.body || {}
  if (!runId) return res.status(400).json({ error: 'runId is required' })
  if (!valuationStrategies.has(strategy)) {
    return res.status(400).json({ error: 'strategy must be mean | weighted-mean | hedonic' })
  }

  const run = comparableRuns.get(runId)
  if (!run) return res.status(404).json({ error: 'Comparable run not found' })

  const result = calculateValuation(run.comparables, strategy)
  pushAudit('valuation', runId, 'create', { strategy, result })
  return res.json({ runId, strategy, ...result })
})

// Backward compatibility endpoint
app.post('/api/valuations', (req, res) => {
  const { propertyId, method } = req.body || {}
  if (!propertyId || !method) {
    return res.status(400).json({ error: 'propertyId and method required' })
  }
  const result = {
    propertyId,
    method,
    estimatedValue: 2950000,
    valueRange: { min: 2700000, max: 3200000 },
    confidence: 85,
    methodology: 'Stubbed comparable sales analysis',
  }
  return res.json(result)
})

// --- Report generation ------------------------------------------------------
app.post('/api/v1/reports/generate', (req, res) => {
  const {
    subjectProperty,
    runId,
    templateId = 'default-court-il',
    language = 'he',
    documentFacts = [],
    imageEvidence = [],
  } = req.body || {}

  if (!subjectProperty || !runId) {
    return res.status(400).json({ error: 'subjectProperty and runId are required' })
  }

  const run = comparableRuns.get(runId)
  if (!run) return res.status(404).json({ error: 'Comparable run not found' })

  const valuation = calculateValuation(run.comparables, 'weighted-mean')
  const sections = buildReportSections({
    subjectProperty,
    language,
    valuation,
    topComparables: run.comparables.slice(0, 10),
    documentFacts,
    imageEvidence,
  })
  const validations = validateReport({ valuation, documentFacts, comparables: run.comparables })

  const reportId = `report_${crypto.randomUUID()}`
  const payload = {
    reportId,
    version: 1,
    templateId,
    language,
    createdAt: new Date().toISOString(),
    runId,
    sections,
    validations,
    readyForFinalApproval: validations.every((x) => x.severity !== 'error'),
  }
  reports.set(reportId, payload)

  pushAudit('report', reportId, 'create', { runId, templateId, language })
  return res.json(payload)
})

app.post('/api/v1/reports/:reportId/validate', (req, res) => {
  const report = reports.get(req.params.reportId)
  if (!report) return res.status(404).json({ error: 'Report not found' })

  const status = report.validations.some((x) => x.severity === 'error') ? 'fail' : 'pass'
  return res.json({ reportId: req.params.reportId, status, issues: report.validations })
})

app.post('/api/v1/reports/:reportId/finalize', (req, res) => {
  const report = reports.get(req.params.reportId)
  if (!report) return res.status(404).json({ error: 'Report not found' })
  const { appraiserId, approvalComment } = req.body || {}
  if (!appraiserId || !approvalComment) {
    return res.status(400).json({ error: 'appraiserId and approvalComment are required' })
  }

  if (report.validations.some((x) => x.severity === 'error')) {
    return res.status(409).json({ error: 'Report has validation errors and cannot be finalized' })
  }

  const finalized = {
    reportId: report.reportId,
    version: report.version + 1,
    pdfUrl: `/api/v1/reports/${report.reportId}/pdf`,
    signatureId: `sig_${crypto.randomUUID()}`,
    approvedBy: appraiserId,
    approvalComment,
    approvedAt: new Date().toISOString(),
  }
  pushAudit('report', report.reportId, 'finalize', finalized)
  return res.json(finalized)
})

app.get('/api/v1/audit/events', (_req, res) => {
  return res.json({ count: auditEvents.length, events: auditEvents.slice(-500).reverse() })
})

function calculateValuation(candidates, strategy) {
  const prices = candidates.map((x) => x.adjustedPrice).filter((x) => Number.isFinite(x))
  if (prices.length === 0) {
    return {
      range: { low: 0, mid: 0, high: 0 },
      confidenceScore: 0,
      comparablesUsed: 0,
      rejectedOutliers: [],
      rationale: ['No adjusted prices available'],
    }
  }

  const sorted = [...prices].sort((a, b) => a - b)
  const q1 = percentile(sorted, 0.25)
  const q3 = percentile(sorted, 0.75)
  const iqr = q3 - q1
  const minP = q1 - 1.5 * iqr
  const maxP = q3 + 1.5 * iqr

  const filtered = candidates.filter((x) => x.adjustedPrice >= minP && x.adjustedPrice <= maxP)
  const filteredPrices = filtered.map((x) => x.adjustedPrice)
  const rejectedOutliers = candidates
    .filter((x) => x.adjustedPrice < minP || x.adjustedPrice > maxP)
    .map((x) => x.comparable.id)

  const mid =
    strategy === 'mean'
      ? round(mean(filteredPrices))
      : strategy === 'weighted-mean'
        ? round(weightedMean(filtered.map((x) => x.adjustedPrice), filtered.map((x) => x.weight)))
        : round(0.55 * weightedMean(filtered.map((x) => x.adjustedPrice), filtered.map((x) => x.weight)) + 0.45 * percentile([...filteredPrices].sort((a, b) => a - b), 0.5))

  const dispersion = stddev(filteredPrices) / Math.max(1, mid)
  const spread = clamp(0.05 + dispersion, 0.06, 0.2)
  const confidenceScore = round(
    (clamp(filtered.length / 12, 0, 1) * 0.3 +
      mean(filtered.map((x) => x.similarity)) * 0.35 +
      (1 - clamp(dispersion / 0.2, 0, 1)) * 0.2 +
      (1 - mean(filtered.map((x) => clamp(monthsAgo(x.comparable.saleDate) / 36, 0, 1)))) * 0.15) *
      100,
  )

  return {
    range: {
      low: round(mid * (1 - spread)),
      mid,
      high: round(mid * (1 + spread)),
    },
    confidenceScore,
    comparablesUsed: filtered.length,
    rejectedOutliers,
    rationale: [
      `${filtered.length} comparables used after outlier filtering`,
      `Dispersion ${(dispersion * 100).toFixed(1)}%`,
      `Strategy ${strategy}`,
    ],
  }
}

function buildReportSections({ subjectProperty, valuation, topComparables, documentFacts, imageEvidence, language }) {
  const isHebrew = language === 'he'
  return [
    {
      sectionId: 'subject',
      title: isHebrew ? 'פרטי הנכס' : 'Subject Property',
      markdown: `${subjectProperty.address || 'N/A'} | ${subjectProperty.city || 'N/A'} | type=${subjectProperty.propertyType || 'N/A'} | area=${subjectProperty.areaSqm || 'N/A'}`,
      groundedFacts: [`property:${subjectProperty.id || 'unknown'}`],
    },
    {
      sectionId: 'comparables',
      title: isHebrew ? 'עסקאות השוואה' : 'Comparable Transactions',
      markdown: topComparables
        .map((x, i) => `${i + 1}. ${x.comparable.address || x.comparable.id} | sim=${(x.similarity * 100).toFixed(1)}% | adj=${x.adjustedPrice}`)
        .join('\n'),
      groundedFacts: topComparables.map((x) => `comparable:${x.comparable.id}`),
    },
    {
      sectionId: 'valuation',
      title: isHebrew ? 'מסקנת שווי' : 'Valuation Conclusion',
      markdown: isHebrew
        ? `טווח שווי: ₪${valuation.range.low.toLocaleString('he-IL')} - ₪${valuation.range.high.toLocaleString('he-IL')} (אמצע ₪${valuation.range.mid.toLocaleString('he-IL')}). ביטחון ${valuation.confidenceScore}%.`
        : `Range: ${valuation.range.low} - ${valuation.range.high} (mid ${valuation.range.mid}), confidence ${valuation.confidenceScore}%.`,
      groundedFacts: ['valuation:range', ...valuation.rationale],
    },
    {
      sectionId: 'legal-risks',
      title: isHebrew ? 'סיכונים משפטיים' : 'Legal Risks',
      markdown: summarizeLegalRisks(documentFacts, isHebrew),
      groundedFacts: documentFacts.map((x) => `doc:${x.sourceDocumentId || 'unknown'}`),
    },
    {
      sectionId: 'visual-evidence',
      title: isHebrew ? 'ראיות חזותיות' : 'Visual Evidence',
      markdown: (imageEvidence || [])
        .slice(0, 10)
        .map((x) => `- ${x.imageId || 'image'} | score=${x.conditionScore ?? 'N/A'} | issues=${(x.detectedIssues || []).join(', ') || 'none'}`)
        .join('\n'),
      groundedFacts: (imageEvidence || []).map((x) => `image:${x.imageId || 'unknown'}`),
    },
  ]
}

function validateReport({ valuation, documentFacts, comparables }) {
  const issues = []

  if (!(valuation.range.low <= valuation.range.mid && valuation.range.mid <= valuation.range.high)) {
    issues.push({ key: 'valuation.order', severity: 'error', message: 'Invalid valuation range ordering' })
  }

  const conflicting = (documentFacts || []).filter((x) => Array.isArray(x.conflictWith) && x.conflictWith.length > 0)
  if (conflicting.length > 0) {
    issues.push({ key: 'documents.conflicts', severity: 'error', message: `Detected ${conflicting.length} conflicting facts` })
  }

  if ((comparables || []).length < 3) {
    issues.push({ key: 'comparables.low-count', severity: 'warning', message: 'Less than 3 comparables in analysis' })
  }

  if (valuation.confidenceScore < 55) {
    issues.push({ key: 'valuation.low-confidence', severity: 'warning', message: 'Low confidence score' })
  }

  return issues
}

function summarizeLegalRisks(documentFacts, isHebrew) {
  const conflicts = (documentFacts || []).filter((x) => Array.isArray(x.conflictWith) && x.conflictWith.length > 0)
  if (conflicts.length === 0) {
    return isHebrew
      ? 'לא זוהו סתירות מהותיות במסמכים שסופקו. בכל מקרה נדרש אישור שמאי סופי.'
      : 'No material document conflicts were found. Final human appraiser approval is still required.'
  }

  return conflicts
    .map((x) =>
      isHebrew
        ? `- סתירה במסמך ${x.sourceDocumentId || 'unknown'} בשדה ${x.factKey || 'unknown'}; נדרשת בדיקה ידנית.`
        : `- Conflict in document ${x.sourceDocumentId || 'unknown'} at field ${x.factKey || 'unknown'}; manual review required.`,
    )
    .join('\n')
}

function explainComparable(subject, comp, similarity, distanceMeters) {
  const reasons = []
  if (distanceMeters <= 700) reasons.push('Very close location')
  if (subject.propertyType === comp.propertyType) reasons.push('Same property type')
  if (Math.abs((subject.sizeSqm ?? 0) - (comp.sizeSqm ?? 0)) <= 15) reasons.push('Similar size')
  if (Math.abs((subject.floor ?? 0) - (comp.floor ?? 0)) <= 2) reasons.push('Similar floor')
  reasons.push(`Similarity ${(similarity * 100).toFixed(1)}%`)
  return reasons
}

function ruleBasedAdjustment(subject, comp) {
  const floor = clamp(((subject.floor ?? 0) - (comp.floor ?? 0)) * 0.004, -0.08, 0.08)
  const elevator = boolAdj(subject.hasElevator, comp.hasElevator, 0.025)
  const renovation = clamp(renovationScore(subject.renovationState) - renovationScore(comp.renovationState), -0.12, 0.12)
  const balcony = boolAdj(subject.hasBalcony, comp.hasBalcony, 0.012)
  const parking = boolAdj(subject.hasParking, comp.hasParking, 0.03)
  const view = boolAdj(subject.hasView, comp.hasView, 0.018)
  const noise = clamp(((comp.noiseLevel ?? 5) - (subject.noiseLevel ?? 5)) * 0.01, -0.05, 0.05)
  const size = clamp((((subject.sizeSqm ?? 0) - (comp.sizeSqm ?? 0)) / 100) * 0.02, -0.08, 0.08)
  const planningPotential = clamp(((subject.planningPotentialScore ?? 0) - (comp.planningPotentialScore ?? 0)) * 0.01, -0.06, 0.06)
  const mlResidual = clamp(0.004 * ((subject.floor ?? 0) - (comp.floor ?? 0)) + 0.012 * boolDiff(subject.hasParking, comp.hasParking), -0.03, 0.03)

  const totalPercent = clamp(
    floor + elevator + renovation + balcony + parking + view + noise + size + planningPotential + mlResidual,
    -0.25,
    0.25,
  )

  return {
    floor,
    elevator,
    renovation,
    balcony,
    parking,
    view,
    noise,
    size,
    planningPotential,
    mlResidual,
    totalPercent,
  }
}

function similarityScore(subject, comp, distanceMeters) {
  const geo = 1 - clamp(distanceMeters / 5000, 0, 1)
  const size = 1 - clamp(Math.abs((subject.sizeSqm ?? 0) - (comp.sizeSqm ?? 0)) / 200, 0, 1)
  const floor = 1 - clamp(Math.abs((subject.floor ?? 0) - (comp.floor ?? 0)) / 30, 0, 1)
  const age = 1 - clamp(Math.abs((subject.buildingAge ?? 0) - (comp.buildingAge ?? 0)) / 100, 0, 1)
  const cond = 1 - clamp(Math.abs((subject.conditionScore ?? 5) - (comp.conditionScore ?? 5)) / 10, 0, 1)
  const type = subject.propertyType === comp.propertyType ? 1 : 0.7
  return clamp(geo * 0.35 + size * 0.15 + floor * 0.1 + age * 0.1 + cond * 0.15 + type * 0.15, 0, 1)
}

function comparableWeight(similarity, distanceMeters, saleDate) {
  const distancePenalty = clamp(distanceMeters / 4000, 0, 1)
  const recencyPenalty = clamp(monthsAgo(saleDate) / 36, 0, 1)
  return clamp(similarity * 0.65 + (1 - distancePenalty) * 0.2 + (1 - recencyPenalty) * 0.15, 0.01, 1)
}

function haversine(lat1, lng1, lat2, lng2) {
  const r = 6371000
  const dLat = degToRad((lat2 ?? 0) - (lat1 ?? 0))
  const dLng = degToRad((lng2 ?? 0) - (lng1 ?? 0))
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(lat1 ?? 0)) * Math.cos(degToRad(lat2 ?? 0)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

function percentile(values, p) {
  if (!values.length) return 0
  const idx = (values.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return values[lo]
  const w = idx - lo
  return values[lo] * (1 - w) + values[hi] * w
}

function mean(values) {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function weightedMean(values, weights) {
  if (!values.length) return 0
  let sum = 0
  let wSum = 0
  for (let i = 0; i < values.length; i++) {
    const w = Number(weights[i] ?? 0)
    sum += Number(values[i] ?? 0) * w
    wSum += w
  }
  return wSum > 0 ? sum / wSum : mean(values)
}

function stddev(values) {
  if (values.length <= 1) return 0
  const m = mean(values)
  const variance = values.reduce((acc, x) => acc + (x - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function pushAudit(entityType, entityId, eventType, payload) {
  auditEvents.push({
    id: `audit_${crypto.randomUUID()}`,
    entityType,
    entityId,
    eventType,
    payload,
    createdAt: new Date().toISOString(),
  })
}

function monthsAgo(date) {
  if (!date) return 999
  const now = new Date()
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return 999
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth())
}

function boolAdj(a, b, factor) {
  if (a === b) return 0
  return a ? factor : -factor
}

function boolDiff(a, b) {
  if (a === b) return 0
  return a ? 1 : -1
}

function renovationScore(state) {
  if (state === 'new') return 0.1
  if (state === 'renovated') return 0.06
  if (state === 'partial') return 0.02
  if (state === 'needs-renovation') return -0.04
  return 0
}

function degToRad(deg) {
  return (deg * Math.PI) / 180
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function round(value) {
  return Math.round(value)
}

function weightedAvg(items) {
  let weighted = 0
  let total = 0
  for (const item of items) {
    const n = Number(item.n ?? 0)
    const v = Number(item.v ?? 0)
    if (n <= 0) continue
    weighted += v * n
    total += n
  }
  return total > 0 ? weighted / total : 0
}

app.listen(PORT, () => {
  console.log(`✓ Backend server running on http://localhost:${PORT}`)
  console.log(`✓ Health check: http://localhost:${PORT}/health`)
})
