/* eslint-env node */
// Scan GISN docs page(s) for PDF links by plan id(s)
// Usage:
//   node scripts/gisn-docs-scan.mjs 6177 6400 1234
// Output: public/gisn-doc-links.json

import fs from 'node:fs/promises'

function docsUrl(id) {
  return `https://gisn.tel-aviv.gov.il/tabaot/docs.aspx?id_taba=${encodeURIComponent(id)}&st_taba=5000&mode=intranet`
}

function extractPdfLinks(html, base) {
  const links = new Set()
  const re = /href="([^"]+\.pdf)"/gi
  let m
  while ((m = re.exec(html))) {
    let href = m[1]
    if (href.startsWith('/')) {
      const url = new URL(base)
      href = `${url.origin}${href}`
    }
    links.add(href)
  }
  return Array.from(links)
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

async function main() {
  const ids = process.argv.slice(2)
  if (!ids.length) {
    console.log('Provide at least one plan id, e.g., 6400')
  }
  const items = []
  for (const id of ids) {
    try {
      const url = docsUrl(id)
      const html = await fetchText(url)
      const pdfs = extractPdfLinks(html, url)
      items.push({ id, url, pdfs, count: pdfs.length })
      console.log(`Plan ${id}: ${pdfs.length} PDFs`)
      await new Promise((r) => setTimeout(r, 200))
    } catch (e) {
      console.error(`Plan ${id} failed:`, e?.message || e)
      items.push({ id, url: docsUrl(id), pdfs: [], count: 0, error: String(e?.message || e) })
    }
  }
  const output = {
    generatedAt: new Date().toISOString(),
    disclaimer: 'Links discovered from public docs pages. Use according to site terms; content is for information only.',
    items
  }
  await fs.mkdir('public', { recursive: true })
  await fs.writeFile('public/gisn-doc-links.json', JSON.stringify(output, null, 2), 'utf8')
  console.log('Saved public/gisn-doc-links.json')
}

main().catch((e) => {
  console.error('Docs scan failed:', e)
  process.exit(1)
})
