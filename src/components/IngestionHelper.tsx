import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createAPIClient, type V1IngestionRunRequest, type V1IngestionRunResponse } from '@/lib/apiClient'

const samplePayload: V1IngestionRunRequest = {
  createdBy: 'manual-ui',
  transactions: [
    {
      source: 'official-gov-feed',
      sourceRecordId: 'tx-1001',
      address: 'רח׳ ויצמן 12, תל אביב',
      city: 'תל אביב-יפו',
      transactionDate: '2025-11-10',
      price: 2780000,
      area: 96,
      floor: 5,
      rooms: 4,
      lat: 32.08,
      lon: 34.78,
    },
  ],
  listings: [
    {
      source: 'market-listing',
      sourceRecordId: 'ls-5001',
      address: 'ויצמן 12 תל אביב דירה 4',
      city: 'תל אביב-יפו',
      listingDate: '2026-01-03',
      price: 2890000,
      area: 97,
      floor: 5,
      rooms: 4,
      status: 'active',
    },
  ],
}

export default function IngestionHelper() {
  const apiBaseURL =
    (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ??
    'http://localhost:3001'
  const apiClient = useMemo(() => createAPIClient(apiBaseURL), [apiBaseURL])

  const [payloadText, setPayloadText] = useState(JSON.stringify(samplePayload, null, 2))
  const [runResult, setRunResult] = useState<V1IngestionRunResponse | null>(null)
  const [runs, setRuns] = useState<Array<{ runId: string; createdBy: string; createdAt: string; elapsedMs: number; summary: V1IngestionRunResponse['summary'] }>>([])
  const [loadingRun, setLoadingRun] = useState(false)
  const [loadingRuns, setLoadingRuns] = useState(false)

  const refreshRuns = useCallback(async () => {
    setLoadingRuns(true)
    try {
      const result = await apiClient.listIngestionRunsV1()
      setRuns(result.runs)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'שגיאה בטעינת ריצות')
    } finally {
      setLoadingRuns(false)
    }
  }, [apiClient])

  useEffect(() => {
    void refreshRuns()
  }, [refreshRuns])

  const copySample = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2))
      toast.success('Payload לדוגמה הועתק ללוח')
    } catch {
      toast.error('נכשל בהעתקה')
    }
  }

  const runIngestion = async () => {
    let payload: V1IngestionRunRequest
    try {
      payload = JSON.parse(payloadText) as V1IngestionRunRequest
    } catch {
      toast.error('JSON לא תקין')
      return
    }

    setLoadingRun(true)
    try {
      const result = await apiClient.runIngestionV1(payload)
      setRunResult(result)
      toast.success(`Ingestion completed: ${result.summary.cleaned} cleaned`)
      await refreshRuns()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'שגיאה בהרצת ingestion')
    } finally {
      setLoadingRun(false)
    }
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h2 className="text-lg font-semibold">Ingestion Control Panel (MVP)</h2>
      <p className="text-sm text-muted-foreground">הרץ ingestion חי מול השרת, ראה cleaned / duplicates / errors ושמור היסטוריית ריצות.</p>

      <Card>
        <CardHeader>
          <CardTitle>Payload JSON</CardTitle>
          <CardDescription>API base URL: {apiBaseURL}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            className="min-h-64 font-mono text-xs"
            aria-label="ingestion-payload"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={runIngestion} disabled={loadingRun}>{loadingRun ? 'מריץ…' : 'Run Ingestion'}</Button>
            <Button variant="outline" onClick={copySample}>Copy sample payload</Button>
            <Button variant="outline" onClick={() => setPayloadText(JSON.stringify(samplePayload, null, 2))}>Reset sample</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last Run Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {runResult ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Run: {runResult.runId}</Badge>
                <Badge variant="secondary">Cleaned: {runResult.summary.cleaned}</Badge>
                <Badge variant={runResult.summary.duplicates > 0 ? 'destructive' : 'success'}>Duplicates: {runResult.summary.duplicates}</Badge>
                <Badge variant={runResult.summary.errors > 0 ? 'destructive' : 'success'}>Errors: {runResult.summary.errors}</Badge>
                <Badge variant="outline">Confidence: {(runResult.summary.avgConfidence * 100).toFixed(1)}%</Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="font-medium mb-1">Cleaned</div>
                  <div className="text-muted-foreground">Transactions: {runResult.transactions.cleaned.length}</div>
                  <div className="text-muted-foreground">Listings: {runResult.listings.cleaned.length}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="font-medium mb-1">Duplicates</div>
                  <div className="text-muted-foreground">Transactions: {runResult.transactions.duplicates.length}</div>
                  <div className="text-muted-foreground">Listings: {runResult.listings.duplicates.length}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="font-medium mb-1">Errors</div>
                  <div className="text-muted-foreground">Transactions: {runResult.transactions.errors.length}</div>
                  <div className="text-muted-foreground">Listings: {runResult.listings.errors.length}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">אין תוצאות עדיין. הרץ ingestion ראשון.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshRuns} disabled={loadingRuns}>{loadingRuns ? 'מרענן…' : 'רענן ריצות'}</Button>
          </div>
          {runs.length === 0 ? (
            <div className="text-muted-foreground">אין ריצות שמורות</div>
          ) : (
            runs.slice(0, 10).map((r) => (
              <div key={r.runId} className="rounded-md border p-2">
                <div className="font-medium">{r.runId}</div>
                <div className="text-muted-foreground">{new Date(r.createdAt).toLocaleString('he-IL')} · {r.createdBy}</div>
                <div className="text-muted-foreground">input {r.summary.input} · cleaned {r.summary.cleaned} · dup {r.summary.duplicates} · errors {r.summary.errors}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
