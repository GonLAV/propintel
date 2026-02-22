import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { extractTabaFromText, type TabaExtraction } from '@/lib/tabaExtraction'
import { calculateFromExtraction, type TabaDerived } from '@/lib/tabaCalculator'
import { generateTabaReportPDF } from '@/lib/tabaReport'

type IndexItem = {
  id: string
  fileName: string
  relPath: string
  extractPath: string
  metadata?: Meta
  planKey?: string | null
}

type IndexDoc = {
  items: IndexItem[]
  total: number
  generatedAt: string
}

export function TabaExtractor() {
  const [idx, setIdx] = useState<IndexDoc | null>(null)
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [result, setResult] = useState<TabaExtraction | null>(null)
  const [derived, setDerived] = useState<TabaDerived | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [siteArea, setSiteArea] = useState<number | ''>('')

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/gisn-index.json', { cache: 'no-store' })
        if (r.ok) setIdx(await r.json())
      } catch {
        setIdx({ items: [], total: 0, generatedAt: new Date().toISOString() })
      }
    })()
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = idx?.items || []
   
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter((it) => {
      const hay = [it.fileName, it.planKey, it.metadata?.primaryPlan, it.metadata?.address]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [items, q])

  const selected = items.find((x) => x.id === selectedId) || null

  const runExtraction = async () => {
    if (!selected) {
      toast.error('בחר מסמך מהרשימה')
      return
    }
    setIsRunning(true)
    setResult(null)
    try {
      const r = await fetch('/' + selected.extractPath, { cache: 'no-store' })
      if (!r.ok) throw new Error('נכשל בקריאת JSON החילוץ לקובץ')
      const json = await r.json()
      const text: string = String(json.fullText || '')
      if (!text.trim()) throw new Error('אין טקסט לחילוץ (ייתכן PDF סרוק ללא OCR)')
      const out = await extractTabaFromText(text)
      setResult(out)
      setDerived(null)
      toast.success('חילוץ הושלם בהצלחה')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'שגיאה בחילוץ')
    } finally {
      setIsRunning(false)
    }
  }
  const handleReport = () => {
    if (!result) return
    const item = idx?.items.find(i => i.id === selectedId)
    generateTabaReportPDF({
      extraction: result,
      derived,
      meta: {
        fileName: item?.fileName || selectedId,
        planKey: item?.planKey || null,
        address: item?.metadata?.address || null,
        city: item?.metadata?.city || null
      }
    })
  }

  const saveJSON = () => {
    if (!result || !selected) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `taba_extract_${selected.planKey || selected.fileName}.json`
    a.click()
  }

  const runCalculator = () => {
    if (!result) {
      toast.error('אין תוצאת חילוץ')
      return
    }
    const v = typeof siteArea === 'number' ? siteArea : NaN
    const out = calculateFromExtraction(result, Number.isFinite(v) ? v : null)
    setDerived(out)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold mb-2">חילוץ הוראות תב"ע (רשמי)</h1>
        <p className="text-muted-foreground">שיטה סגורה ומבוקרת – ללא ניחושים, ללא פרשנות, ללא הידיעת חוץ.</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">חיפוש מסמך</label>
            <Input placeholder="6400 / כתובת / שם קובץ" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">בחר מסמך</label>
            <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— בחר —</option>
              {filtered.map((it) => (
                <option key={it.id} value={it.id}>{it.planKey ? `[${it.planKey}] ` : ''}{it.fileName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={runExtraction} disabled={!selected || isRunning} className="mr-2">חלץ הוראות</Button>
          {result && (
            <Button onClick={saveJSON} variant="outline">ייצא JSON</Button>
          )}
          <button className="btn" onClick={handleReport} disabled={!result}>
            הפק דוח PDF
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-semibold mb-2">מסמך נבחר</div>
          {selected ? (
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{selected.fileName}</span>
                {selected.planKey && <Badge variant="outline">{selected.planKey}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {selected.metadata?.address || selected.metadata?.primaryPlan || '—'}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">לא נבחר מסמך</div>
          )}
        </Card>

        <Card className="p-4">
          <div className="font-semibold mb-2">תוצאה (JSON)</div>
          <ScrollArea className="h-[360px]">
            <pre className="text-xs whitespace-pre-wrap leading-relaxed">
{result ? JSON.stringify(result, null, 2) : '—'}
            </pre>
          </ScrollArea>
        </Card>
      </div>

      <Card className="p-4">
        <div className="font-semibold mb-3">מחשבוני שמאות מעל ה-JSON</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">שטח מגרש (מ"ר)</label>
            <Input
              type="number"
              inputMode="decimal"
              value={siteArea}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setSiteArea(Number.isFinite(v) ? v : '')
              }}
              placeholder="לדוגמה: 750"
            />
          </div>
          <div>
            <Button onClick={runCalculator} disabled={!result}>חשב זכויות</Button>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm text-muted-foreground">חישוב שמרני בלבד; אין פרשנות או השלמות מעבר לנתונים המפורשים.</div>
        </div>
        <div className="mt-4">
          <ScrollArea className="h-[280px]">
            <pre className="text-xs whitespace-pre-wrap leading-relaxed">
{derived ? JSON.stringify(derived, null, 2) : '—'}
            </pre>
          </ScrollArea>
        </div>
      </Card>
    </div>
  )
}

export default TabaExtractor

type Meta = {
  address?: string
  city?: string
  primaryPlan?: string
}
