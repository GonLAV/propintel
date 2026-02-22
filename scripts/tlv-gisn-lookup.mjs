/* eslint-env node */
// Tel Aviv GISN lookup helper
// - Discovers ArcGIS layers for cadastre/plan/permit by field hints
// - Queries gush/helka or planId
// - Optionally scrapes plan docs page for PDFs
// Usage examples:
//   node scripts/tlv-gisn-lookup.mjs --gush 6400 --helka 262
//   node scripts/tlv-gisn-lookup.mjs --plan 6400
//   node scripts/tlv-gisn-lookup.mjs --gush 6400 --helka 262 --plan 6400
// Output: prints JSON summary to stdout

import fs from 'node:fs/promises'

const SERVICE_BASE = 'https://gisn.tel-aviv.gov.il/arcgis/rest/services/WM/IView2WM/MapServer'
const DOCS_BASE = 'https://gisn.tel-aviv.gov.il/tabaot/docs.aspx'

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const k = args[i]
    if (!k.startsWith('--')) continue
    const key = k.replace(/^--/, '')
    const val = args[i + 1]?.startsWith('--') ? true : args[i + 1]
    out[key] = val === undefined ? true : val
    if (val !== undefined && val !== true) i++
  }
  return {
    gush: out.gush ? String(out.gush) : null,
    helka: out.helka ? String(out.helka) : null,
    plan: out.plan ? String(out.plan) : null,
    limit: out.limit ? Number(out.limit) : 10
  }
}

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return await res.json()
}

async function fetchLayerInfo(layerId) {
  return await getJson(`${SERVICE_BASE}/${layerId}?f=json`)
}

function fieldsInclude(info, required) {
  const names = (info.fields || []).map((f) => f.name.toUpperCase())
  return required.every((r) => names.includes(r.toUpperCase()))
}

function nameMatches(info, hints) {
  const name = (info.name || '').toLowerCase()
  return hints.some((h) => name.includes(h.toLowerCase()))
}

async function discoverLayers() {
  const root = await getJson(`${SERVICE_BASE}?f=json`)
  const layers = root.layers || []
  const cache = new Map()
  async function load(id) {
    if (!cache.has(id)) cache.set(id, fetchLayerInfo(id))
    return await cache.get(id)
  }

  let cadLayer = null
  let planLayer = null
  let permitLayer = null

  for (const l of layers) {
    const info = await load(l.id)
    if (!cadLayer && fieldsInclude(info, ['GUSH', 'HELKA'])) cadLayer = info
    if (!planLayer && (fieldsInclude(info, ['TABA_ID']) || fieldsInclude(info, ['PLAN_ID']) || nameMatches(info, ['taba', 'plan']))) planLayer = info
    if (!permitLayer && (nameMatches(info, ['permit', 'license', 'building']) || fieldsInclude(info, ['GUSH', 'HELKA', 'YEAR']))) permitLayer = info
    if (cadLayer && planLayer && permitLayer) break
  }

  return { cadLayer, planLayer, permitLayer }
}

async function queryLayer(layerId, where, outFields = '*', limit = 20) {
  const params = new URLSearchParams({
    where,
    outFields,
    returnGeometry: 'false',
    f: 'json',
    resultOffset: '0',
    resultRecordCount: String(limit)
  })
  const url = `${SERVICE_BASE}/${layerId}/query?${params.toString()}`
  const data = await getJson(url)
  const features = data.features || []
  return features.map((f) => f.attributes || {})
}

function docsUrl(planId) {
  return `${DOCS_BASE}?id_taba=${encodeURIComponent(planId)}&st_taba=5000&mode=intranet`
}

function extractPdfLinks(html, base) {
  const links = new Set()
  const re = /href="([^"]+\.pdf)"/gi
  let m
  while ((m = re.exec(html))) {
    let href = m[1]
    if (href.startsWith('/')) {
      const u = new URL(base)
      href = `${u.origin}${href}`
    }
    links.add(href)
  }
  return Array.from(links)
}

async function fetchDocs(planId) {
  if (!planId) return []
  const url = docsUrl(planId)
  const html = await fetch(url).then((r) => r.text())
  return extractPdfLinks(html, url)
}

async function main() {
  const { gush, helka, plan, limit } = parseArgs()
  if (!gush && !plan) {
    console.error('Usage: node scripts/tlv-gisn-lookup.mjs --gush <gush> --helka <helka> [--plan <planId>] [--limit N]')
    process.exit(1)
  }

  const layers = await discoverLayers()
  const summary = {
    generatedAt: new Date().toISOString(),
    service: SERVICE_BASE,
    inputs: { gush, helka, plan },
    layersUsed: {
      cadastre: layers.cadLayer ? { id: layers.cadLayer.id, name: layers.cadLayer.name } : null,
      plans: layers.planLayer ? { id: layers.planLayer.id, name: layers.planLayer.name } : null,
      permits: layers.permitLayer ? { id: layers.permitLayer.id, name: layers.permitLayer.name } : null
    },
    parcel: [],
    plans: [],
    permits: [],
    docs: []
  }

  if (gush && helka && layers.cadLayer) {
    const where = `GUSH=${gush} AND HELKA=${helka}`
    summary.parcel = await queryLayer(layers.cadLayer.id, where, '*', limit)
  }

  if (plan && layers.planLayer) {
    const where = `(TABA_ID='${plan}') OR (PLAN_ID='${plan}') OR (id='${plan}')`
    summary.plans = await queryLayer(layers.planLayer.id, where, '*', limit)
  } else if (gush && helka && layers.planLayer) {
    const where = `GUSH=${gush} AND HELKA=${helka}`
    summary.plans = await queryLayer(layers.planLayer.id, where, '*', limit)
  }

  if (gush && helka && layers.permitLayer) {
    const where = `GUSH=${gush} AND HELKA=${helka}`
    summary.permits = await queryLayer(layers.permitLayer.id, where, '*', limit)
  }

  if (plan) {
    try {
      summary.docs = await fetchDocs(plan)
    } catch (e) {
      summary.docs = []
      summary.docsError = e?.message || String(e)
    }
  }

  summary.disclaimer = 'Informational only; respect source terms and verify against official documents.'

  const json = JSON.stringify(summary, null, 2)
  await fs.mkdir('public', { recursive: true })
  await fs.writeFile('public/tlv-gisn-lookup.json', json, 'utf8')
  process.stdout.write(json + '\n')
  console.log('\nSaved public/tlv-gisn-lookup.json')
}

main().catch((e) => {
  console.error('Lookup failed:', e)
  process.exit(1)
})
