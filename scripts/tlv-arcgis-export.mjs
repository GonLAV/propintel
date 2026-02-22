/* eslint-env node */
// ArcGIS REST export for Tel-Aviv GISN (configurable layer)
// Usage:
//   node scripts/tlv-arcgis-export.mjs [layerId] [where]
// Examples:
//   node scripts/tlv-arcgis-export.mjs 0 "1=1"
//   node scripts/tlv-arcgis-export.mjs 123 "GUSH=6400"
// Output: public/tlv-arcgis.json

import fs from 'node:fs/promises'

const SERVICE_BASE = 'https://gisn.tel-aviv.gov.il/arcgis/rest/services/WM/IView2WM/MapServer'
const layerId = process.argv[2] || '0'
const where = process.argv[3] || '1=1'

async function queryLayer({ layerId, where }) {
  const url = `${SERVICE_BASE}/${layerId}/query`
  const params = new URLSearchParams({
    where,
    outFields: '*',
    returnGeometry: 'false',
    f: 'json',
    resultOffset: '0',
    resultRecordCount: '2000'
  })

  const items = []
  while (true) {
    const res = await fetch(`${url}?${params.toString()}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const features = data.features || []
    for (const f of features) {
      items.push(f.attributes || {})
    }
    if (!data.exceededTransferLimit) break
    params.set('resultOffset', String(Number(params.get('resultOffset')) + Number(params.get('resultRecordCount'))))
    await new Promise((r) => setTimeout(r, 250))
  }
  return items
}

async function main() {
  const items = await queryLayer({ layerId, where })
  const output = {
    generatedAt: new Date().toISOString(),
    service: SERVICE_BASE,
    layerId,
    where,
    total: items.length,
    disclaimer: 'Public ArcGIS REST query for exploration. Subject to publisher terms; treat as informational only.',
    items
  }
  await fs.mkdir('public', { recursive: true })
  await fs.writeFile('public/tlv-arcgis.json', JSON.stringify(output, null, 2), 'utf8')
  console.log(`Saved ${items.length} items to public/tlv-arcgis.json`)
}

main().catch((e) => {
  console.error('ArcGIS export failed:', e)
  process.exit(1)
})
