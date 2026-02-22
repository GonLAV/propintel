import { useEffect, useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, MagnifyingGlass, ArrowSquareOut } from '@phosphor-icons/react'

type IndexItem = {
  id: string
  source: string
  fileName: string
  relPath: string
  sizeBytes: number
  modifiedAt: string
  extractedAt: string
  textLength: number
  metadata: {
    address?: string | null
    street?: string | null
    houseNumber?: string | null
    city?: string | null
    block?: string | null
    parcel?: string | null
    primaryPlan?: string | null
    planNumbers?: string[]
  }
  tags?: string[]
  extractPath: string
  sample?: string
}

type IndexDoc = {
  generatedAt: string
  inputDir: string
  total: number
  items: IndexItem[]
}

export function GISNViewer() {
  const [data, setData] = useState<IndexDoc | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/gisn-index.json', { cache: 'no-store' })
        if (!res.ok) throw new Error('failed to load index')
        const json = (await res.json()) as IndexDoc
        setData(json)
      } catch {
        setData({ generatedAt: new Date().toISOString(), inputDir: 'public/gisn', total: 0, items: [] })
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !data) return data?.items || []
    return (data.items || []).filter((it) => {
      const hay = [
        it.fileName,
        it.metadata?.address,
        it.metadata?.street,
        it.metadata?.city,
        it.metadata?.block,
        it.metadata?.parcel,
        it.metadata?.primaryPlan,
        ...(it.metadata?.planNumbers || []),
        (it.sample || '').slice(0, 400)
      ]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [query, data])

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold mb-2">מסמכי תב"ע (GISN)</h1>
        <p className="text-muted-foreground">חילוץ טקסט מקומי מקובצי PDF והפניות למסמכי המקור</p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי כתובת / תכנית / גוש חלקה / שם קובץ"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-8"
            />
          </div>
          <Button variant="outline" onClick={() => setQuery('')}>נקה</Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
          <div>
            סה"כ: <span className="font-medium text-foreground">{filtered.length}</span>
            {data?.total !== undefined && (
              <span className="ml-2">(באינדקס: {data.total})</span>
            )}
          </div>
          {data?.generatedAt && (
            <div>עודכן: {new Date(data.generatedAt).toLocaleString('he-IL')}</div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            לא נמצאו מסמכים. יש לשים PDFים תחת public/gisn ולהריץ npm run ingest:gisn
          </div>
        ) : (
          <ScrollArea className="h-[520px]">
            <div className="space-y-3">
              {filtered.map((it) => (
                <Card key={it.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-primary" />
                        <div className="font-medium truncate">{it.fileName}</div>
                        <Badge variant="outline">{it.source}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        {it.metadata?.address && <span>כתובת: {it.metadata.address}</span>}
                        {it.metadata?.street && <span>רחוב: {it.metadata.street}</span>}
                        {it.metadata?.houseNumber && <span>בית: {it.metadata.houseNumber}</span>}
                        {it.metadata?.city && <span>עיר: {it.metadata.city}</span>}
                        {it.metadata?.block && <span>גוש: {it.metadata.block}</span>}
                        {it.metadata?.parcel && <span>חלקה: {it.metadata.parcel}</span>}
                        {it.metadata?.primaryPlan && <span>תב"ע: {it.metadata.primaryPlan}</span>}
                      </div>
                      {it.sample && (
                        <div className="mt-2 text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                          {it.sample}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col gap-2">
                      <a
                        href={`/${it.relPath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        פתח PDF <ArrowSquareOut size={14} />
                      </a>
                      <a
                        href={`/${it.extractPath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      >
                        JSON מלא
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

export default GISNViewer
