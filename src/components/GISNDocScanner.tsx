import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

function extractPdfLinks(html: string): string[] {
  const links: string[] = []
  const regex = /href=["']([^"']+\.pdf)["']/ig
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    const url = m[1]
    if (!links.includes(url)) links.push(url)
  }
  return links
}

export default function GISNDocScanner() {
  const [planId, setPlanId] = useState('')
  const [links, setLinks] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scan = async () => {
    if (!planId.trim()) return
    setLoading(true)
    setError(null)
    setLinks([])
    try {
      const url = `https://gisn.tel-aviv.gov.il/gisnDocs/Docs.aspx?plan=${encodeURIComponent(planId.trim())}`
      const r = await fetch(url, { mode: 'cors' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const html = await r.text()
      const found = extractPdfLinks(html)
      setLinks(found)
      if (found.length === 0) setError('לא נמצאו קישורי PDF עבורה תכנית זו')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בסריקה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">סריקת מסמכי GISN לפי מזהה תכנית</h2>
      <div className="flex items-center gap-2">
        <Input value={planId} onChange={e => setPlanId(e.target.value)} placeholder="לדוגמה: 6400" />
        <Button onClick={scan} disabled={loading}>{loading ? 'סורק…' : 'סריקה'}</Button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {links.length > 0 && (
        <Card className="p-3">
          <div className="text-sm mb-2">נמצאו {links.length} קבצים:</div>
          <ul className="list-disc pl-5 space-y-1">
            {links.map((href) => (
              <li key={href}>
                <a className="text-blue-600 underline" href={href} target="_blank" rel="noreferrer">{href}</a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
