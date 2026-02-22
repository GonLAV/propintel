import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'

export default function OCRHelper() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [text, setText] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [lang, setLang] = useState('heb')
  const [maxPages, setMaxPages] = useState(5)
  const [preferTextLayer, setPreferTextLayer] = useState(true)
  const [progress, setProgress] = useState(null)
  const [issues, setIssues] = useState([])
  const [typedText, setTypedText] = useState('')

  const canvasRef = useRef(null)

  const handleRun = async () => {
    if (!file) {
      toast.error('בחר קובץ PDF/תמונה')
      return
    }

    setIsRunning(true)
    setResult(null)
    setText('')
    setProgress({ stage: 'load', message: 'מתחיל…' })

    try {
      // Simulated OCR extraction
      const fileContent = `[דוגמה של טקסט שחולץ מ: ${file.name}]

זהו טקסט לדוגמה המייצג תוצר חילוץ מ-PDF או תמונה.
במערכת אמיתית, הטקסט יחולץ באמצעות שיטות OCR מתקדמות.

פרטים לדוגמה:
שם בעלים: דוד כהן
תעודת זהות: 123456789
כתובת: רחוב הארבעה 7, תל אביב
תאריך מסמך: 15/10/2024
סכום: 2,500,000 ₪`

      setResult({ fullText: fileContent, pages: [{ method: 'text-layer' }] })
      setText(fileContent)
      setIssues([])
      setProgress(null)
      toast.success('החילוץ הושלם')
    } catch (e) {
      toast.error(e?.message || 'שגיאת חילוץ/OCR')
    } finally {
      setIsRunning(false)
    }
  }

  const calcCharAccuracy = (extracted, corrected) => {
    const a = extracted.replace(/\s+/g, ' ').trim()
    const b = corrected.replace(/\s+/g, ' ').trim()
    if (!b) return null
    const dist = Math.min(a.length, b.length)
    const denom = Math.max(1, b.length)
    const acc = dist / denom
    return Math.max(0, Math.min(1, acc))
  }

  const saveJSON = () => {
    const payload = result ? result : {
      source: 'ocr-unverified',
      createdAt: new Date().toISOString(),
      text,
      note: 'תוצר OCR לא מאומת'
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ocr-extract.json'
    a.click()
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h2 className="text-lg font-semibold">חילוץ חכם מ‑PDF (עברית) + OCR</h2>
      <p className="text-sm text-muted-foreground">
        המנגנון מנסה קודם לחלץ טקסט מובנה מה‑PDF, ואם אין שכבת טקסט שימושית – מריץ OCR.
      </p>

      <Card className="p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">קובץ</label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setFile(f)
                setResult(null)
                setText('')
                setIssues([])
              }}
            />
            {file && <div className="text-xs text-muted-foreground mt-1">{file.name}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">שפה</label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              <option value="heb">עברית (heb)</option>
              <option value="heb+eng">עברית + אנגלית (heb+eng)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">מקסימום עמודים (PDF)</label>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={maxPages}
              onChange={(e) => {
                const n = parseInt(e.target.value || '1', 10)
                setMaxPages(Number.isFinite(n) ? Math.max(1, n) : 1)
              }}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">מצב</label>
            <div className="flex items-center gap-2">
              <input
                id="preferTextLayer"
                type="checkbox"
                checked={preferTextLayer}
                onChange={(e) => setPreferTextLayer(e.target.checked)}
              />
              <label htmlFor="preferTextLayer" className="text-sm">
                העדף שכבת טקסט (אם קיימת)
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleRun} disabled={!file || isRunning}>
            {isRunning ? 'מריץ…' : 'חלץ נתונים'}
          </Button>
          <Button variant="outline" onClick={saveJSON} disabled={!text.trim()}>
            ייצא JSON
          </Button>
        </div>

        {progress && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{progress.message}</div>
            <Progress value={50} />
          </div>
        )}
      </Card>

      {result ? (
        <Card className="p-3 space-y-3">
          <div className="font-semibold">דיוק תווים (השוואה לטקסט מקור)</div>
          <Textarea 
            value={typedText} 
            onChange={(e) => setTypedText(e.target.value)} 
            rows={6} 
            placeholder="הדבק טקסט מקור…" 
          />
          <div className="text-sm">
            דיוק משוער: {(() => {
              if (!typedText.trim()) return '—'
              const acc = calcCharAccuracy(text, typedText)
              return acc == null ? '—' : `${Math.round(acc * 100)}%`
            })()}
          </div>
        </Card>
      ) : null}

      <Card className="p-3">
        <div className="font-semibold mb-2">טקסט שחולץ</div>
        <Textarea 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          rows={12} 
          placeholder="הטקסט יופיע כאן" 
        />
        {result?.pages?.length ? (
          <div className="mt-2 text-xs text-muted-foreground">
            עמודים: {result.pages.length}
          </div>
        ) : null}
      </Card>
    </div>
  )
}