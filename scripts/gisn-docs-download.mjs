/* eslint-env node */
// Download PDFs listed in public/gisn-doc-links.json into public/gisn/
// Usage:
//   node scripts/gisn-docs-download.mjs [id ...]
// If ids provided, downloads only for those plan ids.

import fs from 'node:fs/promises'
import path from 'node:path'

function sanitizeName(name) {
  return name.replace(/[^\w\u0590-\u05FF.-]+/g, '_')
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function main() {
  const filterIds = new Set(process.argv.slice(2).map(String))
  const baseDir = 'public'
  const outDir = path.join(baseDir, 'gisn')
  await ensureDir(outDir)

  const jsonPath = path.join(baseDir, 'gisn-doc-links.json')
  const raw = await fs.readFile(jsonPath, 'utf8').catch(() => null)
  if (!raw) {
    console.error('Missing public/gisn-doc-links.json. Run `npm run gisn:docs -- <planId>` first.')
    process.exit(1)
  }
  const doc = JSON.parse(raw)
  const items = doc.items || []

  let total = 0
  for (const it of items) {
    if (filterIds.size && !filterIds.has(String(it.id))) continue
    for (let i = 0; i < it.pdfs.length; i++) {
      const url = it.pdfs[i]
      try {
        const u = new URL(url)
        const base = path.basename(u.pathname)
        const name = sanitizeName(`${it.id}-${String(i + 1).padStart(2, '0')}-${base || 'doc.pdf'}`)
        const dest = path.join(outDir, name)

        // Skip if exists
        try {
          await fs.stat(dest)
          continue
        } catch {
          // ignore
        }

        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        await fs.writeFile(dest, buf)
        console.log('Saved', path.join('public', 'gisn', name))
        total++
      } catch (e) {
        console.error('Failed', url, e?.message || e)
      }
    }
  }

  if (!total) console.log('No files downloaded.')
}

main().catch((e) => {
  console.error('Download failed:', e)
  process.exit(1)
})
