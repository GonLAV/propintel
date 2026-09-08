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
const PORT = Number(process.env.PORT || 3001)
const JSON_LIMIT = process.env.JSON_LIMIT || '2mb'
const MAX_INGESTION_RECORDS = Number(process.env.MAX_INGESTION_RECORDS || 1000)
const MAX_COMPARABLES_POOL = Number(process.env.MAX_COMPARABLES_POOL || 2000)
const MAX_REPORT_FACTS = Number(process.env.MAX_REPORT_FACTS || 100)
const MEMORY_RETENTION_LIMIT = Number(process.env.MEMORY_RETENTION_LIMIT || 500)
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5001,http://localhost:3000')

app.disable('x-powered-by')
app.use(requestContext)
app.use(securityHeaders)
app.use(cors({
  origin: corsOrigin,
  maxAge: 600,
}))
app.use(express.json({ limit: JSON_LIMIT }))

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

app.get('/api/v1/health/db', asyncHandler(async (_req, res) => {
  const health = await checkPersistenceHealth()
  if (health.status === 'error') {
    return res.status(500).json(health)
  }
  return res.json(health)
}))

// --- Ingestion pipeline -----------------------------------------------------
app.post('/api/v1/ingestion/run', asyncHandler(async (req, res) => {
  const validation = validateIngestionRequest(req.body)
  if (!validation.ok) return sendError(res, 400, 'BAD_REQUEST', validation.error)

  const { transactions, listings, createdBy } = validation.value

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
}))

app.get('/api/v1/ingestion/runs', asyncHandler(async (_req, res) => {
  const runs = (await listPersistedIngestionRuns(100))
    .map((x) => ({
      runId: x.runId,
      createdBy: x.createdBy,
      createdAt: x.createdAt,
      elapsedMs: x.elapsedMs,
      summary: x.summary,
    }))

  return res.json({ count: runs.length, runs })
}))

app.get('/api/v1/ingestion/:runId', asyncHandler(async (req, res) => {
  if (!isSafeToken(req.params.runId, 'ing_')) return sendError(res, 400, 'BAD_REQUEST', 'Invalid runId')
  const run = await getPersistedIngestionRun(req.params.runId)
  if (!run) return sendError(res, 404, 'NOT_FOUND', 'Ingestion run not found')
  return res.json(run)
}))

// --- Comparable search ------------------------------------------------------
app.post('/api/v1/comparables/search', (req, res) => {
  const validation = validateComparableSearchRequest(req.body)
  if (!validation.ok) return sendError(res, 400, 'BAD_REQUEST', validation.error)

  const { subject, comparablesPool, topK, requestedBy } = validation.value

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
  if (!isSafeToken(runId, 'run_')) return sendError(res, 400, 'BAD_REQUEST', 'Invalid runId')

  const validation = validateAdjustmentOverrideRequest(req.body)
  if (!validation.ok) return sendError(res, 400, 'BAD_REQUEST', validation.error)

  const { candidateId, patch, appraiserId, reason } = validation.value
  const run = comparableRuns.get(runId)

  if (!run) return sendError(res, 404, 'NOT_FOUND', 'Comparable run not found')

  const idx = run.comparables.findIndex((x) => x.candidateId === candidateId)
  if (idx < 0) return sendError(res, 404, 'NOT_FOUND', 'Candidate not found in run')

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
  if (!isSafeToken(runId, 'run_')) return sendError(res, 400, 'BAD_REQUEST', 'Invalid runId')
  if (!valuationStrategies.has(strategy)) {
    return sendError(res, 400, 'BAD_REQUEST', 'strategy must be mean | weighted-mean | hedonic')
  }

  const run = comparableRuns.get(runId)
  if (!run) return sendError(res, 404, 'NOT_FOUND', 'Comparable run not found')

  const result = calculateValuation(run.comparables, strategy)
  pushAudit('valuation', runId, 'create', { strategy, result })
  return res.json({ runId, strategy, ...result })
})

// Backward compatibility endpoint
app.post('/api/valuations', (req, res) => {
  const { propertyId, method } = req.body || {}
  if (!propertyId || !method) {
    return sendError(res, 400, 'BAD_REQUEST', 'propertyId and method required')
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
  const validation = validateReportGenerateRequest(req.body)
  if (!validation.ok) return sendError(res, 400, 'BAD_REQUEST', validation.error)

  const { subjectProperty, runId, templateId, language, documentFacts, imageEvidence } = validation.value

  const run = comparableRuns.get(runId)
  if (!run) return sendError(res, 404, 'NOT_FOUND', 'Comparable run not found')

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
  if (!isSafeToken(req.params.reportId, 'report_')) return sendError(res, 400, 'BAD_REQUEST', 'Invalid reportId')
  const report = reports.get(req.params.reportId)
  if (!report) return sendError(res, 404, 'NOT_FOUND', 'Report not found')

  const status = report.validations.some((x) => x.severity === 'error') ? 'fail' : 'pass'
  return res.json({ reportId: req.params.reportId, status, issues: report.validations })
})

app.post('/api/v1/reports/:reportId/finalize', (req, res) => {
  if (!isSafeToken(req.params.reportId, 'report_')) return sendError(res, 400, 'BAD_REQUEST', 'Invalid reportId')
  const report = reports.get(req.params.reportId)
  if (!report) return sendError(res, 404, 'NOT_FOUND', 'Report not found')
  const appraiserId = sanitizeToken(req.body?.appraiserId, 120)
  const approvalComment = sanitizeString(req.body?.approvalComment, 1000)
  if (!appraiserId || !approvalComment) {
    return sendError(res, 400, 'BAD_REQUEST', 'appraiserId and approvalComment are required')
  }

  if (report.validations.some((x) => x.severity === 'error')) {
    return sendError(res, 409, 'CONFLICT', 'Report has validation errors and cannot be finalized')
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
  trimMap(comparableRuns, MEMORY_RETENTION_LIMIT)
  trimMap(reports, MEMORY_RETENTION_LIMIT)
  trimArray(auditEvents, MEMORY_RETENTION_LIMIT)
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

function requestContext(req, res, next) {
  const incoming = req.headers['x-request-id']
  const id = typeof incoming === 'string' && /^[A-Za-z0-9._-]{8,128}$/.test(incoming)
    ? incoming
    : crypto.randomUUID()
  req.id = id
  res.setHeader('x-request-id', id)
  next()
}

function securityHeaders(_req, res, next) {
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('referrer-policy', 'no-referrer')
  res.setHeader('x-frame-options', 'DENY')
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()')
  next()
}

function parseAllowedOrigins(value) {
  return String(value).split(',').map((x) => x.trim()).filter(Boolean)
}

function corsOrigin(origin, callback) {
  if (!origin) return callback(null, true)
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
  return callback(new Error(`Origin ${origin} not allowed`))
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function sendError(res, status, code, message, details) {
  return res.status(status).json({
    error: {
      code,
      message,
      requestId: res.req?.id,
      ...(details ? { details } : {}),
    },
  })
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeString(value, maxLength = 255) {
  if (value === undefined || value === null) return ''
  return stripControlChars(String(value))
    .trim()
    .slice(0, maxLength)
}

function stripControlChars(value) {
  return [...value].filter((char) => {
    const code = char.charCodeAt(0)
    return code >= 32 && code !== 127
  }).join('')
}

function sanitizeToken(value, maxLength = 160) {
  const text = sanitizeString(value, maxLength)
  return /^[A-Za-z0-9._:-]+$/.test(text) ? text : ''
}

function isSafeToken(value, prefix) {
  return typeof value === 'string' && value.startsWith(prefix) && /^[A-Za-z0-9._:-]+$/.test(value) && value.length <= 160
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function validateIngestionRequest(body) {
  if (!isPlainObject(body)) return { ok: false, error: 'Request body must be an object' }
  const transactions = body.transactions ?? []
  const listings = body.listings ?? []
  if (!Array.isArray(transactions) || !Array.isArray(listings)) {
    return { ok: false, error: 'transactions and listings must be arrays' }
  }
  if (transactions.length + listings.length > MAX_INGESTION_RECORDS) {
    return { ok: false, error: `Too many records. Maximum is ${MAX_INGESTION_RECORDS}` }
  }
  return {
    ok: true,
    value: {
      transactions,
      listings,
      createdBy: sanitizeToken(body.createdBy, 120) || 'system',
    },
  }
}

function validateComparableSearchRequest(body) {
  if (!isPlainObject(body)) return { ok: false, error: 'Request body must be an object' }
  if (!isPlainObject(body.subject)) return { ok: false, error: 'subject is required' }
  if (!Array.isArray(body.comparablesPool)) return { ok: false, error: 'comparablesPool must be an array' }
  if (body.comparablesPool.length > MAX_COMPARABLES_POOL) {
    return { ok: false, error: `comparablesPool exceeds maximum of ${MAX_COMPARABLES_POOL}` }
  }

  const topK = clamp(Math.trunc(toFiniteNumber(body.topK, 25)), 1, 100)
  const subject = sanitizePropertyLike(body.subject)
  const comparablesPool = body.comparablesPool.map(sanitizePropertyLike).filter((x) => x.id)

  return {
    ok: true,
    value: {
      subject,
      comparablesPool,
      topK,
      requestedBy: sanitizeToken(body.requestedBy, 120) || 'system',
    },
  }
}

function sanitizePropertyLike(input) {
  const source = isPlainObject(input) ? input : {}
  return {
    ...source,
    id: sanitizeToken(source.id, 120) || `item_${crypto.randomUUID()}`,
    address: sanitizeString(source.address, 255),
    city: sanitizeString(source.city, 120),
    propertyType: sanitizeString(source.propertyType, 80),
    renovationState: sanitizeString(source.renovationState, 80),
    lat: toFiniteNumber(source.lat, 0),
    lng: toFiniteNumber(source.lng, 0),
    sizeSqm: clamp(toFiniteNumber(source.sizeSqm, 0), 0, 1000000),
    floor: clamp(toFiniteNumber(source.floor, 0), -10, 300),
    buildingAge: clamp(toFiniteNumber(source.buildingAge, 0), 0, 300),
    conditionScore: clamp(toFiniteNumber(source.conditionScore, 5), 0, 10),
    planningPotentialScore: clamp(toFiniteNumber(source.planningPotentialScore, 0), 0, 10),
    noiseLevel: clamp(toFiniteNumber(source.noiseLevel, 5), 0, 10),
    salePrice: clamp(toFiniteNumber(source.salePrice, 0), 0, 10000000000),
    saleDate: sanitizeString(source.saleDate, 40),
    hasElevator: Boolean(source.hasElevator),
    hasParking: Boolean(source.hasParking),
    hasBalcony: Boolean(source.hasBalcony),
    hasView: Boolean(source.hasView),
  }
}

function validateAdjustmentOverrideRequest(body) {
  if (!isPlainObject(body)) return { ok: false, error: 'Request body must be an object' }
  const candidateId = sanitizeToken(body.candidateId, 160)
  const appraiserId = sanitizeToken(body.appraiserId, 120)
  const reason = sanitizeString(body.reason, 1000)
  if (!candidateId || !appraiserId || !reason) {
    return { ok: false, error: 'candidateId, appraiserId, and reason are required' }
  }
  if (!isPlainObject(body.patch)) return { ok: false, error: 'patch must be an object' }

  const allowed = ['floor', 'elevator', 'renovation', 'balcony', 'parking', 'view', 'noise', 'size', 'planningPotential', 'mlResidual']
  const patch = {}
  for (const key of allowed) {
    if (body.patch[key] !== undefined) patch[key] = clamp(toFiniteNumber(body.patch[key], 0), -0.25, 0.25)
  }
  return { ok: true, value: { candidateId, appraiserId, reason, patch } }
}

function validateReportGenerateRequest(body) {
  if (!isPlainObject(body)) return { ok: false, error: 'Request body must be an object' }
  if (!isPlainObject(body.subjectProperty)) return { ok: false, error: 'subjectProperty is required' }
  if (!isSafeToken(body.runId, 'run_')) return { ok: false, error: 'Invalid runId' }

  const documentFacts = Array.isArray(body.documentFacts) ? body.documentFacts.slice(0, MAX_REPORT_FACTS) : []
  const imageEvidence = Array.isArray(body.imageEvidence) ? body.imageEvidence.slice(0, MAX_REPORT_FACTS) : []
  return {
    ok: true,
    value: {
      subjectProperty: sanitizePropertyLike(body.subjectProperty),
      runId: body.runId,
      templateId: ['default-court-il', 'bank-il', 'private-client'].includes(body.templateId) ? body.templateId : 'default-court-il',
      language: body.language === 'en' ? 'en' : 'he',
      documentFacts,
      imageEvidence,
    },
  }
}

function trimMap(map, maxSize) {
  while (map.size > maxSize) {
    const first = map.keys().next().value
    map.delete(first)
  }
}

function trimArray(array, maxSize) {
  if (array.length > maxSize) array.splice(0, array.length - maxSize)
}

app.use((err, req, res, _next) => {
  const isCors = err instanceof Error && err.message.includes('not allowed')
  const status = isCors ? 403 : 500
  console.error(`[${req.id || 'no-request-id'}]`, err)
  return sendError(res, status, isCors ? 'FORBIDDEN' : 'INTERNAL_ERROR', isCors ? err.message : 'Internal server error')
})

app.listen(PORT, () => {
  console.log(`✓ Backend server running on http://localhost:${PORT}`)
  console.log(`✓ Health check: http://localhost:${PORT}/health`)
})
