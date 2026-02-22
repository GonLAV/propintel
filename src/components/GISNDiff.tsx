import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowsLeftRight, ListMagnifyingGlass } from '@phosphor-icons/react'

type IndexItem = {
  id: string
  fileName: string
  relPath: string
  extractPath: string
  metadata?: Meta
  planKey?: string | null
  textLength: number
  sample?: string
  source: string
}

type Meta = {
  address?: string
  street?: string
  houseNumber?: string
  city?: string
  block?: string
  parcel?: string
  primaryPlan?: string
  planNumbers?: string[]
}

type IndexDoc = {
  items: IndexItem[]
  total: number
  generatedAt: string
}

function kvPairs(meta?: Meta): { key: string; value: string }[] {
  if (!meta) return []
  const ordered = ['address', 'street', 'houseNumber', 'city', 'block', 'parcel', 'primaryPlan']
  const pairs: { key: string; value: string }[] = []
  for (const k of ordered) {
    const v = (meta as Record<string, unknown>)?.[k]
    if (v) pairs.push({ key: k, value: String(v) })
  }
  const pn = meta?.planNumbers
  if (Array.isArray(pn) && pn.length) {
    pairs.push({ key: 'planNumbers', value: pn.map(String).join(', ') })
  }
  return pairs
}

function simpleLineDiff(a: string, b: string) {
  const aLines = new Set(a.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))
  const bLines = new Set(b.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))
  const onlyA: string[] = []
  const onlyB: string[] = []
  for (const s of aLines) if (!bLines.has(s)) onlyA.push(s)
  for (const s of bLines) if (!aLines.has(s)) onlyB.push(s)
  return {
    onlyA: onlyA.slice(0, 20),
    onlyB: onlyB.slice(0, 20)
  }
}

export function GISNDiff() {
  const [data, setData] = useState<IndexDoc | null>(null)
  const [q, setQ] = useState('')
  const [leftId, setLeftId] = useState<string>('')
  const [rightId, setRightId] = useState<string>('')
  const [leftText, setLeftText] = useState<string>('')
  const [rightText, setRightText] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/gisn-index.json', { cache: 'no-store' })
        const json = (await res.json()) as IndexDoc
        setData(json)
      } catch {
        setData({ items: [], total: 0, generatedAt: new Date().toISOString() })
      }
    }
    load()
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = data?.items || []
   
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter((it) => {
      const hay = [it.fileName, it.planKey, it.metadata?.primaryPlan, it.metadata?.address, it.metadata?.block, it.metadata?.parcel]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [items, q])

  const left = items.find((x) => x.id === leftId) || null
  const right = items.find((x) => x.id === rightId) || null

   
  useEffect(() => {
    const fetchFull = async (item: IndexItem | null, set: (t: string) => void) => {
      if (!item) return set('')
      try {
        const res = await fetch('/' + item.extractPath, { cache: 'no-store' })
        const json = await res.json()
        set(String(json.fullText || ''))
      } catch {
        set('')
      }
    }
    fetchFull(left, setLeftText)
    fetchFull(right, setRightText)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftId, rightId])

  const diff = useMemo(() => simpleLineDiff(leftText, rightText), [leftText, rightText])

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold mb-2">השוואת מסמכי תב"ע</h1>
        <p className="text-muted-foreground">בחר שני מסמכים מאינדקס ה‑GISN להשוואה (למשל לפי planKey כמו "6400").</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="col-span-3 sm:col-span-1">
            <label className="text-sm font-medium mb-1 block">חיפוש</label>
            <Input placeholder="6400 / כתובת / גוש חלקה" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">מסמך שמאל (חדש)</label>
            <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={leftId} onChange={(e) => setLeftId(e.target.value)}>
              <option value="">— בחר —</option>
              {filtered.map((it) => (
                <option key={it.id} value={it.id}>{it.planKey ? `[${it.planKey}] ` : ''}{it.fileName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">מסמך ימין (ישן)</label>
            <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={rightId} onChange={(e) => setRightId(e.target.value)}>
              <option value="">— בחר —</option>
              {filtered.map((it) => (
                <option key={it.id} value={it.id}>{it.planKey ? `[${it.planKey}] ` : ''}{it.fileName}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {(left || right) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">שמאל (חדש)</div>
              {left?.planKey && <Badge variant="outline">planKey: {left.planKey}</Badge>}
            </div>
            {left ? (
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">{left.fileName}</div>
                <div className="flex flex-wrap gap-2">
                  {kvPairs(left.metadata).map((p) => (
                    <Badge key={p.key} variant="secondary">{p.key}: {p.value}</Badge>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{left.sample}</div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">לא נבחר מסמך</div>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">ימין (ישן)</div>
              {right?.planKey && <Badge variant="outline">planKey: {right.planKey}</Badge>}
            </div>
            {right ? (
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">{right.fileName}</div>
                <div className="flex flex-wrap gap-2">
                  {kvPairs(right.metadata).map((p) => (
                    <Badge key={p.key} variant="secondary">{p.key}: {p.value}</Badge>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{right.sample}</div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">לא נבחר מסמך</div>
            )}
          </Card>
        </div>
      )}

      {left && right && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowsLeftRight size={18} />
            <div className="font-semibold">הבדלים בטקסט (דגימה)</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="mb-1 text-muted-foreground flex items-center gap-1"><ListMagnifyingGlass size={14}/> קווים ייחודיים לשמאל</div>
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {diff.onlyA.length === 0 ? (
                    <div className="text-muted-foreground">—</div>
                  ) : (
                    diff.onlyA.map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap">{line}</div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            <div>
              <div className="mb-1 text-muted-foreground flex items-center gap-1"><ListMagnifyingGlass size={14}/> קווים ייחודיים לימין</div>
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {diff.onlyB.length === 0 ? (
                    <div className="text-muted-foreground">—</div>
                  ) : (
                    diff.onlyB.map((line, idx) => (
                      <div key={idx} className="whitespace-pre-wrap">{line}</div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default GISNDiff
