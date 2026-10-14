import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const tokenA = 'principal-a-token-12345678901234567890'
const tokenB = 'principal-b-token-12345678901234567890'

test('MVP API enforces ownership, evidence gates, rate limits, and persistence', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'propintel-mvp-'))
  process.env.MVP_DATA_DIR = dataDir
  process.env.RATE_LIMIT_MAX = '30'
  process.env.RATE_LIMIT_WINDOW_MS = '60000'
  process.env.API_AUTH_PRINCIPALS = JSON.stringify([
    { token: tokenA, subject: 'principal-a', roles: ['admin', 'appraiser', 'analyst'] },
    { token: tokenB, subject: 'principal-b', roles: ['admin', 'appraiser', 'analyst'] },
  ])

  t.after(async () => {
    await fs.rm(dataDir, { recursive: true, force: true })
  })

  const firstModule = await import(`./server.mjs?first=${Date.now()}`)
  const firstServer = firstModule.startServer(0)
  await onceListening(firstServer)
  const firstBaseUrl = serverBaseUrl(firstServer)

  const unauthenticated = await fetch(`${firstBaseUrl}/api/v1/audit/events`)
  assert.equal(unauthenticated.status, 401)

  const ingestion = await jsonRequest(firstBaseUrl, '/api/v1/ingestion/run', tokenA, {
    transactions: [],
    listings: [],
  })
  assert.equal(ingestion.response.status, 200)

  const principalBIngestionList = await fetch(`${firstBaseUrl}/api/v1/ingestion/runs`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert.equal(principalBIngestionList.status, 200)
  assert.equal((await principalBIngestionList.json()).count, 0)

  const principalBIngestionRead = await fetch(
    `${firstBaseUrl}/api/v1/ingestion/${ingestion.payload.runId}`,
    { headers: { Authorization: `Bearer ${tokenB}` } },
  )
  assert.equal(principalBIngestionRead.status, 404)

  const subject = {
    id: 'subject-1',
    address: 'Test 1',
    city: 'Tel Aviv',
    propertyType: 'apartment',
    lat: 32.08,
    lng: 34.78,
    sizeSqm: 100,
    floor: 2,
  }
  const comparablesPool = [
    comparable('comp-1', 32.081, 34.781, 2_000_000, 100, 2),
    comparable('comp-2', 32.082, 34.782, 2_100_000, 102, 3),
    comparable('comp-3', 32.083, 34.783, 1_900_000, 98, 1),
  ]

  const search = await jsonRequest(firstBaseUrl, '/api/v1/comparables/search', tokenA, {
    subject,
    comparablesPool,
    topK: 3,
  })
  assert.equal(search.response.status, 200)

  const crossPrincipal = await jsonRequest(firstBaseUrl, '/api/v1/valuations/estimate', tokenB, {
    runId: search.payload.runId,
    strategy: 'weighted-mean',
  })
  assert.equal(crossPrincipal.response.status, 404)

  const report = await jsonRequest(firstBaseUrl, '/api/v1/reports/generate', tokenA, {
    subjectProperty: subject,
    runId: search.payload.runId,
    templateId: 'default-court-il',
    language: 'he',
    documentFacts: [],
    imageEvidence: [],
  })
  assert.equal(report.response.status, 200)
  assert.equal(report.payload.readyForFinalApproval, true)

  const unavailableDataDir = `${dataDir}.unavailable`
  await fs.rename(dataDir, unavailableDataDir)
  await fs.writeFile(dataDir, 'blocked', 'utf8')
  const failedFinalization = await jsonRequest(
    firstBaseUrl,
    `/api/v1/reports/${report.payload.reportId}/finalize`,
    tokenA,
    { approvalComment: 'Persistence unavailable' },
  )
  assert.equal(failedFinalization.response.status, 500)
  await fs.rm(dataDir, { force: true })
  await fs.rename(unavailableDataDir, dataDir)

  const finalized = await jsonRequest(
    firstBaseUrl,
    `/api/v1/reports/${report.payload.reportId}/finalize`,
    tokenA,
    { approvalComment: 'Reviewed' },
  )
  assert.equal(finalized.response.status, 200)
  assert.equal(finalized.payload.version, 2)

  const repeatedFinalization = await jsonRequest(
    firstBaseUrl,
    `/api/v1/reports/${report.payload.reportId}/finalize`,
    tokenA,
    { approvalComment: 'Again' },
  )
  assert.equal(repeatedFinalization.response.status, 409)

  const emptySearch = await jsonRequest(firstBaseUrl, '/api/v1/comparables/search', tokenA, {
    subject: { ...subject, id: 'subject-empty' },
    comparablesPool: [],
    topK: 3,
  })
  const emptyReport = await jsonRequest(firstBaseUrl, '/api/v1/reports/generate', tokenA, {
    subjectProperty: { ...subject, id: 'subject-empty' },
    runId: emptySearch.payload.runId,
    templateId: 'default-court-il',
    language: 'he',
    documentFacts: [],
    imageEvidence: [],
  })
  assert.equal(emptyReport.payload.readyForFinalApproval, false)
  assert.ok(emptyReport.payload.validations.every((issue) => issue.severity === 'error'))

  const emptyFinalization = await jsonRequest(
    firstBaseUrl,
    `/api/v1/reports/${emptyReport.payload.reportId}/finalize`,
    tokenA,
    { approvalComment: 'Should fail' },
  )
  assert.equal(emptyFinalization.response.status, 409)

  const principalBSearch = await jsonRequest(firstBaseUrl, '/api/v1/comparables/search', tokenB, {
    subject: { ...subject, id: 'subject-b' },
    comparablesPool,
    topK: 3,
  })
  assert.equal(principalBSearch.response.status, 200)

  const principalAAuditResponse = await fetch(`${firstBaseUrl}/api/v1/audit/events`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert.equal(principalAAuditResponse.status, 200)
  const principalAAudit = await principalAAuditResponse.json()
  assert.ok(principalAAudit.events.length > 0)
  assert.ok(principalAAudit.events.every((event) => event.actorSubject === 'principal-a'))

  let sawRateLimit = false
  for (let index = 0; index < 40; index += 1) {
    const response = await fetch(`${firstBaseUrl}/api/v1/not-found`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    if (response.status === 429) sawRateLimit = true
  }
  assert.equal(sawRateLimit, true)
  const principalBAfterRateLimit = await fetch(`${firstBaseUrl}/api/v1/not-found`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert.equal(principalBAfterRateLimit.status, 404)

  await closeServer(firstServer)

  const secondModule = await import(`./server.mjs?second=${Date.now()}`)
  const secondServer = secondModule.startServer(0)
  await onceListening(secondServer)
  const secondBaseUrl = serverBaseUrl(secondServer)

  const persistedValuation = await jsonRequest(secondBaseUrl, '/api/v1/valuations/estimate', tokenA, {
    runId: search.payload.runId,
    strategy: 'weighted-mean',
  })
  assert.equal(persistedValuation.response.status, 200)

  const persistedFinalization = await jsonRequest(
    secondBaseUrl,
    `/api/v1/reports/${report.payload.reportId}/finalize`,
    tokenA,
    { approvalComment: 'Still finalized' },
  )
  assert.equal(persistedFinalization.response.status, 409)

  await closeServer(secondServer)
})

test('ingestion persistence serializes concurrent writes and preserves corrupt data', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'propintel-ingestion-'))
  process.env.MVP_DATA_DIR = dataDir
  t.after(async () => {
    await fs.rm(dataDir, { recursive: true, force: true })
  })

  const persistence = await import(`./persistence.mjs?concurrency=${Date.now()}`)
  await Promise.all(
    Array.from({ length: 50 }, (_, index) =>
      persistence.saveIngestionRun({
        runId: `ing_${index}`,
        createdAt: new Date(2026, 0, 1, 0, 0, index).toISOString(),
        createdBy: 'test',
        summary: {},
      }),
    ),
  )

  const runs = await persistence.listIngestionRuns(100)
  assert.equal(runs.length, 50)

  const ingestionPath = path.join(dataDir, 'ingestion-runs.json')
  await fs.writeFile(ingestionPath, '{corrupt', 'utf8')
  await assert.rejects(
    () => persistence.listIngestionRuns(100),
    (error) => error?.code === 'PERSISTENCE_CORRUPT',
  )
  assert.equal(await fs.readFile(ingestionPath, 'utf8'), '{corrupt')
})

test('persistence recovers an interrupted replacement from its backup', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'propintel-recovery-'))
  process.env.MVP_DATA_DIR = dataDir
  t.after(async () => {
    await fs.rm(dataDir, { recursive: true, force: true })
  })

  await fs.writeFile(path.join(dataDir, 'ingestion-runs.json'), JSON.stringify({ runs: [] }), 'utf8')
  const backupPath = path.join(dataDir, 'domain-state.json.123.recovery.bak')
  await fs.writeFile(
    backupPath,
    JSON.stringify({
      comparableRuns: [{ id: 'run_recovered', requestedBy: 'test' }],
      reports: [],
      auditEvents: [],
    }),
    'utf8',
  )

  const persistence = await import(`./persistence.mjs?recovery=${Date.now()}`)
  const recovered = await persistence.loadDomainState()
  assert.equal(recovered.comparableRuns[0].id, 'run_recovered')
  assert.equal(await fileExists(path.join(dataDir, 'domain-state.json')), true)
  assert.equal(await fileExists(backupPath), false)
})

function comparable(id, lat, lng, salePrice, sizeSqm, floor) {
  return {
    id,
    address: id,
    city: 'Tel Aviv',
    propertyType: 'apartment',
    lat,
    lng,
    sizeSqm,
    floor,
    salePrice,
    saleDate: '2026-01-01',
  }
}

async function jsonRequest(baseUrl, route, token, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return {
    response,
    payload: await response.json(),
  }
}

function onceListening(server) {
  if (server.listening) return Promise.resolve()
  return new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

function serverBaseUrl(server) {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Server did not expose a TCP address')
  return `http://127.0.0.1:${address.port}`
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
