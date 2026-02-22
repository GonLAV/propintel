import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

type ArcItem = Record<string, string | number | null | undefined>
type ArcDoc = { generatedAt: string; layerId: string; where: string; total: number; items: ArcItem[] }
type DocLinks = { generatedAt: string; items: { id: string; url: string; pdfs: string[]; count: number }[] }

export function GISNArcGIS() {
  const [arc, setArc] = useState<ArcDoc | null>(null)
  const [links, setLinks] = useState<DocLinks | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/tlv-arcgis.json', { cache: 'no-store' })
        if (r.ok) setArc(await r.json())
      } catch {
        // ignore
      }
      try {
        const r2 = await fetch('/gisn-doc-links.json', { cache: 'no-store' })
        if (r2.ok) setLinks(await r2.json())
      } catch {
        // ignore
      }
    })()
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = arc?.items || []
   
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return list
    return list.filter((it) => JSON.stringify(it).toLowerCase().includes(needle))
  }, [q, list])

  const linkMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const row of links?.items || []) map.set(row.id, row.pdfs)
    return map
  }, [links])

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold mb-2">ArcGIS + קישורי מסמכים</h1>
        <p className="text-muted-foreground">טען `tlv-arcgis.json` ו-`gisn-doc-links.json` להצגה וסינון.</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input placeholder="חיפוש חופשי (JSON)" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="text-sm text-muted-foreground self-center">
            {arc ? (
              <span>
                שכבה {arc.layerId} | where: <span className="font-mono">{arc.where}</span> | שורות: <span className="font-semibold">{filtered.length}</span>
              </span>
            ) : (
              <span>אין tlv-arcgis.json</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        {!filtered.length ? (
          <div className="text-center text-muted-foreground py-10">אין נתונים להצגה</div>
        ) : (
          <ScrollArea className="h-[560px]">
            <div className="space-y-3">
              {filtered.map((row, i) => {
                const planId = row.TABA_ID || row.PLAN_ID || row.id || row.plan_id
                const pdfs = planId ? linkMap.get(String(planId)) || [] : []
                return (
                  <Card key={i} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold">{row.PLAN_NAME || row.TABA_NAME || '—'}</div>
                          {planId && <Badge variant="outline">{String(planId)}</Badge>}
                          {row.GUSH && <Badge variant="secondary">גוש {row.GUSH}</Badge>}
                          {row.HELKA && <Badge variant="secondary">חלקה {row.HELKA}</Badge>}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-all">
                          {JSON.stringify(row, null, 2)}
                        </div>
                      </div>
                      <div className="shrink-0 w-48">
                        <div className="text-sm font-medium mb-1">PDFים</div>
                        {pdfs && pdfs.length ? (
                          <div className="space-y-1 text-xs">
                            {pdfs.slice(0, 6).map((u) => (
                              <div key={u} className="truncate">
                                <a className="text-primary hover:underline" href={u} target="_blank" rel="noreferrer">
                                  {u}
                                </a>
                              </div>
                            ))}
                            {pdfs.length > 6 && <div className="text-muted-foreground">+{pdfs.length - 6} נוספים…</div>}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

export default GISNArcGIS
