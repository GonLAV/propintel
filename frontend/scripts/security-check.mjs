import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const scannerPath = fileURLToPath(import.meta.url)
const excluded = new Set(['.next', 'node_modules', 'coverage', 'out'])
const extensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx', '.json', '.md', '.sql'])

const rules = [
  { name: 'dynamic eval', pattern: /\beval\s*\(/ },
  { name: 'dynamic function constructor', pattern: /new\s+Function\s*\(/ },
  { name: 'raw html injection', pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/ },
  { name: 'jwt localStorage persistence', pattern: /localStorage\.(setItem|getItem)\(['"]propintel\.token['"]/ },
  { name: 'production secret fallback', pattern: /process\.env\.JWT_SECRET\s*\|\|\s*['"][^'"]+['"]/ },
]

const findings = []

await scan(root)

if (findings.length) {
  console.error('Security check failed:')
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.rule}`)
  }
  process.exit(1)
}

console.log('Security check passed')

async function scan(directory) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    if (excluded.has(entry.name)) continue

    const path = join(directory, entry.name)
    if (path === scannerPath) continue

    if (entry.isDirectory()) {
      await scan(path)
      continue
    }

    if (!extensions.has(path.slice(path.lastIndexOf('.')))) continue

    const content = await readFile(path, 'utf8')
    for (const rule of rules) {
      if (rule.pattern.test(content)) {
        findings.push({ file: relative(root, path).replaceAll('\\', '/'), rule: rule.name })
      }
    }
  }
}
