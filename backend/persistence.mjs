import crypto from 'node:crypto'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(process.env.MVP_DATA_DIR || path.join(moduleDir, '.data'))
const ingestionRunsPath = path.join(dataDir, 'ingestion-runs.json')
const domainStatePath = path.join(dataDir, 'domain-state.json')
const ingestionRunsRetention = readPositiveInteger('INGESTION_RUNS_RETENTION', 500)

let writeQueue = Promise.resolve()

export async function ensurePersistence() {
  await fsp.mkdir(dataDir, { recursive: true })
  await ensureJsonFile(ingestionRunsPath, { runs: [] })
  await ensureJsonFile(domainStatePath, {
    comparableRuns: [],
    reports: [],
    auditEvents: [],
  })
}

export async function saveIngestionRun(run) {
  return enqueueWrite(async () => {
    await ensurePersistence()
    const doc = await readIngestionDoc()

    const existingIndex = doc.runs.findIndex((x) => x.runId === run.runId)
    if (existingIndex >= 0) {
      doc.runs[existingIndex] = run
    } else {
      doc.runs.push(run)
    }

    doc.runs = doc.runs
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, ingestionRunsRetention)

    await atomicWriteJson(ingestionRunsPath, doc)
    return run
  })
}

export async function getIngestionRun(runId) {
  await waitForWrites()
  await ensurePersistence()
  const doc = await readIngestionDoc()
  return doc.runs.find((x) => x.runId === runId) ?? null
}

export async function listIngestionRuns(limit = 100) {
  await waitForWrites()
  await ensurePersistence()
  const doc = await readIngestionDoc()
  return doc.runs
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit)
}

export async function loadDomainState() {
  await waitForWrites()
  await ensurePersistence()
  return readDomainState()
}

export async function saveDomainState(state) {
  return enqueueWrite(async () => {
    await ensurePersistence()
    const normalized = validateDomainState(state, domainStatePath)
    await atomicWriteJson(domainStatePath, normalized)
    return normalized
  })
}

export async function checkPersistenceHealth() {
  try {
    await waitForWrites()
    await ensurePersistence()
    await Promise.all([readIngestionDoc(), readDomainState()])

    const testPath = path.join(dataDir, `.healthcheck.${process.pid}.${crypto.randomUUID()}`)
    await fsp.writeFile(testPath, 'ok', 'utf8')
    await fsp.unlink(testPath)

    return {
      status: 'ok',
      engine: 'file-json',
      paths: {
        ingestionRuns: ingestionRunsPath,
        domainState: domainStatePath,
      },
      writable: true,
    }
  } catch (error) {
    return {
      status: 'error',
      engine: 'file-json',
      paths: {
        ingestionRuns: ingestionRunsPath,
        domainState: domainStatePath,
      },
      writable: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function ensureJsonFile(filePath, initialValue) {
  try {
    await fsp.access(filePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    if (await recoverBackup(filePath)) return
    await atomicWriteJson(filePath, initialValue)
  }
}

async function recoverBackup(filePath) {
  const directory = path.dirname(filePath)
  const prefix = `${path.basename(filePath)}.`
  const candidates = (await fsp.readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith('.bak'))

  if (candidates.length === 0) return false

  const withStats = await Promise.all(
    candidates.map(async (entry) => ({
      path: path.join(directory, entry.name),
      stat: await fsp.stat(path.join(directory, entry.name)),
    })),
  )
  withStats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
  await fsp.rename(withStats[0].path, filePath)
  return true
}

async function readIngestionDoc() {
  const parsed = await readJson(ingestionRunsPath)
  if (!isPlainObject(parsed) || !Array.isArray(parsed.runs)) {
    throw corruptionError(ingestionRunsPath, 'expected an object with a runs array')
  }
  return parsed
}

async function readDomainState() {
  const parsed = await readJson(domainStatePath)
  return validateDomainState(parsed, domainStatePath)
}

async function readJson(filePath) {
  const text = await fsp.readFile(filePath, 'utf8')
  try {
    return JSON.parse(text)
  } catch (error) {
    throw corruptionError(filePath, error instanceof Error ? error.message : 'invalid JSON')
  }
}

function validateDomainState(value, filePath) {
  if (
    !isPlainObject(value) ||
    !Array.isArray(value.comparableRuns) ||
    !Array.isArray(value.reports) ||
    !Array.isArray(value.auditEvents)
  ) {
    throw corruptionError(filePath, 'expected comparableRuns, reports, and auditEvents arrays')
  }

  return {
    comparableRuns: value.comparableRuns,
    reports: value.reports,
    auditEvents: value.auditEvents,
  }
}

async function atomicWriteJson(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`
  const backupPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.bak`
  let movedExisting = false
  try {
    const handle = await fsp.open(tempPath, 'wx')
    try {
      await handle.writeFile(JSON.stringify(value, null, 2), 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    try {
      await fsp.rename(filePath, backupPath)
      movedExisting = true
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    await fsp.rename(tempPath, filePath)
    if (movedExisting) {
      await fsp.rm(backupPath, { force: true }).catch((error) => {
        console.warn(`Could not remove persistence backup ${backupPath}:`, error)
      })
    }
  } catch (error) {
    await fsp.rm(tempPath, { force: true }).catch(() => {})
    if (movedExisting) {
      const targetExists = await fileExists(filePath)
      if (!targetExists) await fsp.rename(backupPath, filePath).catch(() => {})
    }
    throw error
  }
}

function enqueueWrite(operation) {
  const result = writeQueue.catch(() => {}).then(operation)
  writeQueue = result.then(() => undefined, () => undefined)
  return result
}

async function waitForWrites() {
  await writeQueue
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

function corruptionError(filePath, reason) {
  const error = new Error(`Persistence file is corrupt: ${filePath} (${reason})`)
  error.code = 'PERSISTENCE_CORRUPT'
  return error
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readPositiveInteger(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}
