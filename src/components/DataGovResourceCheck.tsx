import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NADLAN_RESOURCE_ID } from '@/lib/dataGovAPI'

export default function DataGovResourceCheck() {
  const [resourceId, setResourceId] = useState(NADLAN_RESOURCE_ID)
  const [result, setResult] = useState<ResourceShowResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const check = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const url = new URL('https://data.gov.il/api/3/action/resource_show')
      url.searchParams.set('id', resourceId.trim())
      const r = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
      const json = (await r.json()) as ResourceShowResponse
      if (!json.success || !json.result) throw new Error('API success=false')
      setResult(json.result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בבדיקה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h2 className="text-lg font-semibold">בדיקת משאב Data.gov.il</h2>
      <div className="flex items-center gap-2">
        <Input value={resourceId} onChange={e => setResourceId(e.target.value)} />
        <Button onClick={check} disabled={loading}>{loading ? 'בודק…' : 'בדוק'}</Button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {result && (
        <Card className="p-3 text-sm space-y-1">
          <div><b>name:</b> {result.name || '—'}</div>
          <div><b>id:</b> {result.id}</div>
          <div><b>format:</b> {result.format || '—'}</div>
          <div><b>state:</b> {result.state || '—'}</div>
          <div><b>last modified:</b> {result.last_modified || '—'}</div>
          <div className="text-muted-foreground">השתמשו במשאב תקין בלבד. אם אינו זמין, עדכנו את המזהה בקובץ dataGovAPI.ts.</div>
        </Card>
      )}
    </div>
  )
}

type ResourceShowResult = {
  id: string
  name?: string
  format?: string
  state?: string
  last_modified?: string
}

type ResourceShowResponse = {
  help?: string
  success: boolean
  result?: ResourceShowResult
}
