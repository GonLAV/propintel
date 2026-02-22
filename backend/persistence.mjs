import fsp from 'node:fs/promises'
import path from 'node:path'

const dataDir = path.resolve(process.cwd(), 'backend/.data')
const ingestionRunsPath = path.join(dataDir, 'ingestion-runs.json')

export async function ensurePersistence() {
  await fsp.mkdir(dataDir, { recursive: true })
  try {
    await fsp.access(ingestionRunsPath)
  } catch {
    await fsp.writeFile(ingestionRunsPath, JSON.stringify({ runs: [] }, null, 2), 'utf8')
  }
}

export async function saveIngestionRun(run) {
  await ensurePersistence()
  const doc = await readDoc()

  const existingIndex = doc.runs.findIndex((x) => x.runId === run.runId)
  if (existingIndex >= 0) {
    doc.runs[existingIndex] = run
  } else {
    doc.runs.push(run)
  }

  await writeDoc(doc)
  return run
}

export async function getIngestionRun(runId) {
  await ensurePersistence()
  const doc = await readDoc()
  return doc.runs.find((x) => x.runId === runId) ?? null
}

export async function listIngestionRuns(limit = 100) {
  await ensurePersistence()
  const doc = await readDoc()
  return doc.runs
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit)
}

export async function checkPersistenceHealth() {
  try {
    await ensurePersistence()
    const testPath = path.join(dataDir, '.healthcheck')
    await fsp.writeFile(testPath, 'ok', 'utf8')
    await fsp.unlink(testPath)

    return {
      status: 'ok',
      engine: 'file-json',
      path: ingestionRunsPath,
      writable: true,
    }
  } catch (error) {
    return {
      status: 'error',
      engine: 'file-json',
      path: ingestionRunsPath,
      writable: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function readDoc() {
  const text = await fsp.readFile(ingestionRunsPath, 'utf8')
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed.runs)) return parsed
    return { runs: [] }
  } catch {
    return { runs: [] }
  }
}

async function writeDoc(doc) {
  await fsp.writeFile(ingestionRunsPath, JSON.stringify(doc, null, 2), 'utf8')
}
