import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'
import { Progress } from '@/components/ui/progress'
import type { OcrIssue, SmartOcrProgress, SmartOcrResult } from '@/lib/smartOcr'
import { multiPassOcrCanvas, preprocessCanvasForOcr, recognizeCanvasWithTesseract, smartExtractFromFile } from '@/lib/smartOcr'
import { z } from 'zod'
import { useKV } from '@github/spark/hooks'
import { extractTabaFromText, type TabaExtraction } from '@/lib/tabaExtraction'
import { calculateFromExtraction, type TabaDerived } from '@/lib/tabaCalculator'

// Configure PDF.js worker from CDN (client-side only)
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js'

export default function OCRHelper() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<SmartOcrResult | null>(null)
  const [text, setText] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [lang, setLang] = useState<'heb' | 'heb+eng'>('heb')
  const [maxPages, setMaxPages] = useState<number>(5)
  const [preferTextLayer, setPreferTextLayer] = useState(true)
  const [progress, setProgress] = useState<SmartOcrProgress | null>(null)
  const [issues, setIssues] = useState<OcrIssue[]>([])
  const [nlpIssues, setNlpIssues] = useState<OcrIssue[]>([])
  const [isNlpRunning, setIsNlpRunning] = useState(false)

  // Region-based OCR "training" (feedback loop)
  const [pdfNumPages, setPdfNumPages] = useState<number>(0)
  const [selectedPage, setSelectedPage] = useState<number>(1)
  const [pageScale, setPageScale] = useState<number>(2)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isRenderingPreview, setIsRenderingPreview] = useState(false)
  const [roi, setRoi] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [roiOcrText, setRoiOcrText] = useState('')
  const [roiCorrectedText, setRoiCorrectedText] = useState('')
  const [roiFieldKey, setRoiFieldKey] = useState<string>('')
  const [isRoiRunning, setIsRoiRunning] = useState(false)
  const [roiUseMultiPass, setRoiUseMultiPass] = useState(true)
  const [roiPassInfo, setRoiPassInfo] = useState<string>('')

  // Field-focused extraction
  const [requiredFields, setRequiredFields] = useState<string>('שם בעלים\nת.ז\nכתובת\nגוש\nחלקה\nתאריך מסמך\nסכום')
  type ExtractedField = {
    key: string
    value: string | null
    evidence: string
    confidence: 'low' | 'medium' | 'high'
    pageNumber?: number
    rationale: string
  }
  type FieldExtractionResult = { fields: ExtractedField[]; missing?: string[] }
  const [fieldExtraction, setFieldExtraction] = useState<FieldExtractionResult | null>(null)
  const [isFieldExtractionRunning, setIsFieldExtractionRunning] = useState(false)

  // Compare against typed text (ground truth)
  const [typedText, setTypedText] = useState('')

  // TABA (plan instructions) mode
  const [tabaExtraction, setTabaExtraction] = useState<TabaExtraction | null>(null)
  const [tabaDerived, setTabaDerived] = useState<TabaDerived | null>(null)
  const [tabaSiteArea, setTabaSiteArea] = useState<number | ''>('')
  const [isTabaRunning, setIsTabaRunning] = useState(false)

  type OcrTrainingSample = {
    id: string
    createdAt: string
    fileName: string
    pageNumber: number
    bbox: { x: number; y: number; w: number; h: number }
    lang: string
    fieldKey: string | null
    extracted: string
    corrected: string
    charAccuracy: number | null
  }

  const [trainingSamples, setTrainingSamples] = useKV<OcrTrainingSample[]>('ocrTrainingSamples', [])

  const trainingCount = (trainingSamples || []).length

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
      const out = await smartExtractFromFile(file, {
        lang,
        maxPages: file.type === 'application/pdf' ? maxPages : 1,
        preferTextLayer,
        onProgress: (p) => setProgress(p),
      })

      setResult(out)
      setText(out.fullText)
      setIssues(Array.isArray(out.issues) ? out.issues : [])
      setNlpIssues([])
      toast.success('החילוץ הושלם')
    } catch (e: any) {
      toast.error(e?.message || 'שגיאת חילוץ/OCR')
    } finally {
      setIsRunning(false)
      setProgress(null)
    }
  }

  const isPdf = file?.type === 'application/pdf'

  const renderPdfPreview = async () => {
    if (!file || file.type !== 'application/pdf') return
    const canvas = previewCanvasRef.current
    const overlay = overlayCanvasRef.current
    if (!canvas || !overlay) return

    setIsRenderingPreview(true)
    setRoi(null)
    setRoiOcrText('')
    setRoiCorrectedText('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const numPages = Number(pdf.numPages || 0)
      setPdfNumPages(numPages)
      const pageNumber = Math.min(Math.max(1, selectedPage), Math.max(1, numPages))
      if (pageNumber !== selectedPage) setSelectedPage(pageNumber)

      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: pageScale })
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)

      overlay.width = canvas.width
      overlay.height = canvas.height

      const ctx = canvas.getContext('2d')
      const octx = overlay.getContext('2d')
      if (!ctx || !octx) return

      octx.clearRect(0, 0, overlay.width, overlay.height)

      await page.render({ canvasContext: ctx, viewport }).promise
    } catch (e: any) {
      toast.error(e?.message || 'נכשל ברינדור תצוגת PDF')
    } finally {
      setIsRenderingPreview(false)
    }
  }

  useEffect(() => {
    if (!file || file.type !== 'application/pdf') {
      setPdfNumPages(0)
      setSelectedPage(1)
      setRoi(null)
      setRoiOcrText('')
      setRoiCorrectedText('')
      return
    }
    void renderPdfPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, selectedPage, pageScale])

  const drawRoiOverlay = (rect: { x: number; y: number; w: number; h: number } | null) => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    if (!rect) return

    const root = document.documentElement
    const primary = getComputedStyle(root).getPropertyValue('--primary').trim()
    const primaryColor = primary ? `hsl(${primary})` : 'currentColor'

    ctx.save()
    ctx.fillStyle = primary ? `hsla(${primary}, 0.15)` : 'rgba(0,0,0,0.10)'
    ctx.strokeStyle = primaryColor
    ctx.lineWidth = 2
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
    ctx.restore()
  }

  const clampRoi = (r: { x: number; y: number; w: number; h: number }) => {
    const canvas = previewCanvasRef.current
    if (!canvas) return r
    const x1 = Math.max(0, Math.min(canvas.width, r.x))
    const y1 = Math.max(0, Math.min(canvas.height, r.y))
    const x2 = Math.max(0, Math.min(canvas.width, r.x + r.w))
    const y2 = Math.max(0, Math.min(canvas.height, r.y + r.h))
    return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) }
  }

  const attachRoiSelection = () => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    let isDown = false
    let startX = 0
    let startY = 0

    const getPos = (ev: MouseEvent) => {
      const rect = overlay.getBoundingClientRect()
      const x = (ev.clientX - rect.left) * (overlay.width / rect.width)
      const y = (ev.clientY - rect.top) * (overlay.height / rect.height)
      return { x, y }
    }

    const onDown = (ev: MouseEvent) => {
      isDown = true
      const p = getPos(ev)
      startX = p.x
      startY = p.y
      const next = clampRoi({ x: startX, y: startY, w: 1, h: 1 })
      setRoi(next)
      drawRoiOverlay(next)
    }
    const onMove = (ev: MouseEvent) => {
      if (!isDown) return
      const p = getPos(ev)
      const x = Math.min(startX, p.x)
      const y = Math.min(startY, p.y)
      const w = Math.abs(p.x - startX)
      const h = Math.abs(p.y - startY)
      const next = clampRoi({ x, y, w, h })
      setRoi(next)
      drawRoiOverlay(next)
    }
    const onUp = () => {
      isDown = false
    }

    overlay.addEventListener('mousedown', onDown)
    overlay.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      overlay.removeEventListener('mousedown', onDown)
      overlay.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }

  useEffect(() => {
    const cleanup = attachRoiSelection()
    return () => cleanup?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cropCanvas = (source: HTMLCanvasElement, r: { x: number; y: number; w: number; h: number }) => {
    const out = document.createElement('canvas')
    out.width = Math.ceil(r.w)
    out.height = Math.ceil(r.h)
    const ctx = out.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(source, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height)
    return out
  }

  const levenshtein = (a: string, b: string) => {
    const s = a
    const t = b
    const m = s.length
    const n = t.length
    const dp = new Array<number>(n + 1)
    for (let j = 0; j <= n; j++) dp[j] = j
    for (let i = 1; i <= m; i++) {
      let prev = dp[0]
      dp[0] = i
      for (let j = 1; j <= n; j++) {
        const temp = dp[j]
        const cost = s[i - 1] === t[j - 1] ? 0 : 1
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost)
        prev = temp
      }
    }
    return dp[n]
  }

  const calcCharAccuracy = (extracted: string, corrected: string) => {
    const a = extracted.replace(/\s+/g, ' ').trim()
    const b = corrected.replace(/\s+/g, ' ').trim()
    if (!b) return null
    const dist = levenshtein(a, b)
    const denom = Math.max(1, b.length)
    const acc = 1 - dist / denom
    return Math.max(0, Math.min(1, acc))
  }

  const deterministicExtractField = (fieldLabel: string, fullText: string): ExtractedField => {
    const label = fieldLabel.trim()
    const t = fullText
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
    const mk = (value: string | null, evidence: string, confidence: ExtractedField['confidence'], rationale: string): ExtractedField => ({
      key: label,
      value,
      evidence: evidence || '—',
      confidence,
      rationale,
    })

    const tryRe = (re: RegExp, pickGroup = 1) => {
      re.lastIndex = 0
      const m = re.exec(t)
      if (!m) return null
      const raw = m[0]
      const val = m[pickGroup] ?? raw
      return { value: normalize(String(val)), evidence: raw }
    }

    // Common Hebrew field synonyms
    if (/\bגוש\b/.test(label)) {
      const hit = tryRe(/(?:גוש|GUSH)\s*[:-]?\s*(\d{2,7})/iu, 1)
      if (hit) return mk(hit.value, hit.evidence, 'high', 'זוהה מספר גוש לפי תבנית נפוצה.')
      return mk(null, 'לא נמצא מופע של "גוש" עם מספר סמוך.', 'low', 'לא נמצא בטקסט לפי Regex.')
    }
    if (/\bחלקה\b/.test(label)) {
      const hit = tryRe(/(?:חלקה|HELKA)\s*[:-]?\s*(\d{1,6})/iu, 1)
      if (hit) return mk(hit.value, hit.evidence, 'high', 'זוהתה חלקה לפי תבנית נפוצה.')
      return mk(null, 'לא נמצא מופע של "חלקה" עם מספר סמוך.', 'low', 'לא נמצא בטקסט לפי Regex.')
    }
    if (/תת\s*חלקה|תת-חלקה/i.test(label)) {
      const hit = tryRe(/(?:תת\s*חלקה|תת-חלקה)\s*[:-]?\s*(\d{1,6})/iu, 1)
      if (hit) return mk(hit.value, hit.evidence, 'medium', 'זוהתה תת-חלקה לפי תבנית.')
      return mk(null, 'לא נמצא מופע של "תת-חלקה" עם מספר סמוך.', 'low', 'לא נמצא בטקסט לפי Regex.')
    }
    if (/ת\.ז|תעודת\s*זהות|ח\.פ|חפ/i.test(label)) {
      const hit = tryRe(/(?:ת\.ז\.?|תעודת\s*זהות|ח\.פ\.?|חפ)\s*[:-]?\s*([0-9OolISB]{6,10})/iu, 1)
      if (hit) return mk(hit.value, hit.evidence, 'medium', 'זוהה מספר זיהוי סמוך למזהה (יתכן טעות OCR באותיות/ספרות).')
      return mk(null, 'לא נמצא מזהה ת.ז/ח.פ בטקסט.', 'low', 'לא נמצא בטקסט לפי Regex.')
    }
    if (/תאריך|date/i.test(label)) {
      const hit = tryRe(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/g, 1)
      if (hit) return mk(hit.value, hit.evidence, 'medium', 'זוהה תאריך לפי תבנית כללית; יתכן שיש כמה מופעים.')
      return mk(null, 'לא נמצא תאריך בתבנית נפוצה.', 'low', 'לא נמצא בטקסט לפי Regex.')
    }
    if (/אימייל|email/i.test(label)) {
      const hit = tryRe(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i, 1)
      if (hit) return mk(hit.value, hit.evidence, 'medium', 'זוהה אימייל לפי תבנית כללית.')
      return mk(null, 'לא נמצא אימייל.', 'low', 'לא נמצא בטקסט לפי Regex.')
    }
    if (/טלפון|נייד|phone/i.test(label)) {
      const hit = tryRe(/((?:\+?972[- ]?|0)(?:[23489]|5\d)[- ]?\d{7})/g, 1)
      if (hit) return mk(hit.value, hit.evidence, 'medium', 'זוהה מספר טלפון לפי תבנית כללית.')
      return mk(null, 'לא נמצא מספר טלפון.', 'low', 'לא נמצא בטקסט לפי Regex.')
    }
    if (/סכום|שווי|מחיר|₪|price|total/i.test(label)) {
      // permissive currency pattern
      const hit = tryRe(/(\d{1,3}(?:,\d{3})+|\d+)(?:\s*)?(₪|ש"ח|שח)?/g, 0)
      if (hit) return mk(normalize(hit.value), hit.evidence, 'low', 'זוהה מספר שיכול להיות סכום; מומלץ אימות לפי הקשר.')
      return mk(null, 'לא נמצא מספר שנראה כמו סכום.', 'low', 'לא נמצא בטקסט לפי Regex.')
    }

    return mk(null, '—', 'low', 'אין כלל דטרמיניסטי לשדה זה; יטופל ע"י AI אם תבחר.')
  }

  const runRoiOcr = async () => {
    if (!file || file.type !== 'application/pdf') {
      toast.error('בחר PDF כדי לסמן אזור')
      return
    }
    const base = previewCanvasRef.current
    if (!base || !roi) {
      toast.error('סמן אזור על העמוד')
      return
    }
    setIsRoiRunning(true)
    setRoiPassInfo('')
    try {
      const cropped = cropCanvas(base, roi)
      let outText = ''
      if (roiUseMultiPass) {
        const { best, all } = await multiPassOcrCanvas(cropped, lang, undefined, (p) => {
          if (typeof p.progress === 'number') {
            setRoiPassInfo(`Multi-pass: ${p.passId} ${p.progress}%`)
          }
        })
        outText = best.text
        const bestLine = `${best.passId} (score=${best.score.toFixed(1)}, conf=${best.confidence ?? '—'})`
        const allLines = all
          .slice(0, 5)
          .map((r) => `${r.passId}: score=${r.score.toFixed(1)} conf=${r.confidence ?? '—'}`)
          .join(' | ')
        setRoiPassInfo(`נבחר: ${bestLine} | כל המעברים: ${allLines}`)
      } else {
        preprocessCanvasForOcr(cropped)
        const { text } = await recognizeCanvasWithTesseract(cropped, lang)
        outText = text
      }
      setRoiOcrText(outText)
      if (!roiCorrectedText.trim()) setRoiCorrectedText(outText)
      toast.success('OCR על האזור הושלם')
    } catch (e: any) {
      toast.error(e?.message || 'נכשל OCR על האזור')
    } finally {
      setIsRoiRunning(false)
    }
  }

  const saveTrainingSample = () => {
    if (!file || file.type !== 'application/pdf' || !roi) {
      toast.error('אין PDF/אזור לשמירה')
      return
    }
    const extracted = roiOcrText
    const corrected = roiCorrectedText
    if (!corrected.trim()) {
      toast.error('הזן טקסט מתוקן (Ground Truth)')
      return
    }
    const acc = calcCharAccuracy(extracted, corrected)
    const sample: OcrTrainingSample = {
      id: `sample-${Date.now()}`,
      createdAt: new Date().toISOString(),
      fileName: file.name,
      pageNumber: selectedPage,
      bbox: roi,
      lang,
      fieldKey: roiFieldKey.trim() ? roiFieldKey.trim() : null,
      extracted,
      corrected,
      charAccuracy: acc,
    }
    setTrainingSamples([...(trainingSamples || []), sample])
    toast.success('דוגמה נשמרה')
  }

  const exportTrainingDataset = () => {
    const payload = {
      createdAt: new Date().toISOString(),
      note: 'Dataset תיקוני OCR (Ground Truth) – לשיפור חוקים/תבניות/אימון עתידי מחוץ לאפליקציה.',
      samples: trainingSamples || [],
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ocr-training-dataset.json'
    a.click()
  }

  const runFieldExtraction = async () => {
    if (!result?.fullText?.trim()) {
      toast.error('אין טקסט לחילוץ')
      return
    }
    const fields = requiredFields
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30)

    if (fields.length === 0) {
      toast.error('הזן רשימת שדות')
      return
    }

    setIsFieldExtractionRunning(true)
    setFieldExtraction(null)
    try {
      // 1) deterministic first
      const deterministic = fields.map((f) => deterministicExtractField(f, result.fullText))
      const missingLabels = deterministic.filter((x) => x.value == null).map((x) => x.key)

      const schema = z.object({
        fields: z.array(
          z.object({
            key: z.string().min(1),
            value: z.string().nullable(),
            evidence: z.string().min(1),
            confidence: z.enum(['low', 'medium', 'high']),
            pageNumber: z.number().int().positive().optional(),
            rationale: z.string().min(1),
          })
        ),
        missing: z.array(z.string()).optional(),
      })

      // If everything was found deterministically, skip AI.
      if (missingLabels.length === 0) {
        setFieldExtraction({ fields: deterministic, missing: [] })
        toast.success('חילוץ שדות הושלם (דטרמיניסטי)')
        return
      }

      const prompt = `את/ה מנוע חילוץ שדות למסמכי PDF בעברית.

מטרה: להוציא בדיוק את השדות המבוקשים בלבד.

חוקי בטיחות/איכות:
- אין להמציא מידע. אם לא נמצא בטקסט: value=null, confidence=low, ועדיין תן evidence שמראה למה לא נמצא/הקשר.
- לכל שדה חייב להיות evidence קצר שמצוטט מתוך הטקסט.
- אם יש כמה מופעים, החזר את הסביר ביותר ותסביר rationale.
    - יש כבר תוצאות "דטרמיניסטיות". אל תשנה שדות שיש להם value לא-null, אלא אם יש הוכחה חזקה מאוד שמדובר בטעות OCR.
- החזר/י JSON תקין בלבד לפי הסכמה.

רשימת שדות מבוקשים (בדיוק כפי שניתנה):
${fields.map((f) => `- ${f}`).join('\n')}

    תוצאות דטרמיניסטיות (אל תשנה אם value לא-null):
    ${JSON.stringify({ fields: deterministic }, null, 2)}

טקסט OCR/חילוץ:
"""
${result.fullText.slice(0, 18000)}
"""`

      const raw = await window.spark.llm(prompt, 'gpt-4o', true)
      const parsed = schema.parse(raw)

      // merge: prefer deterministic non-null values
      const merged: ExtractedField[] = fields.map((label) => {
        const d = deterministic.find((x) => x.key === label)
        const a = parsed.fields.find((x) => x.key === label)
        if (d && d.value != null) return d
        if (a) return a as ExtractedField
        return d || {
          key: label,
          value: null,
          evidence: '—',
          confidence: 'low',
          rationale: 'לא סופק ערך.',
        }
      })

      setFieldExtraction({ fields: merged, missing: parsed.missing || missingLabels })
      toast.success('חילוץ שדות הושלם')
    } catch (e: any) {
      toast.error(e?.message || 'נכשל חילוץ שדות')
    } finally {
      setIsFieldExtractionRunning(false)
    }
  }

  const runTabaMode = async () => {
    if (!result?.fullText?.trim()) {
      toast.error('אין טקסט לחילוץ תב"ע')
      return
    }
    setIsTabaRunning(true)
    setTabaExtraction(null)
    setTabaDerived(null)
    try {
      const out = await extractTabaFromText(result.fullText)
      setTabaExtraction(out)
      const site = typeof tabaSiteArea === 'number' ? tabaSiteArea : null
      setTabaDerived(calculateFromExtraction(out, site))
      toast.success('חילוץ תב"ע הושלם')
    } catch (e: any) {
      toast.error(e?.message || 'נכשל חילוץ תב"ע')
    } finally {
      setIsTabaRunning(false)
    }
  }

  const saveJSON = () => {
    const payload = result ? { ...result, issues, nlpIssues } : {
      source: 'ocr-unverified',
      createdAt: new Date().toISOString(),
      text,
      note: 'תוצר OCR לא מאומת. יש להצליב עם מקור רשמי.'
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ocr-extract.json'
    a.click()
  }

  const progressLabel = useMemo(() => {
    if (!progress) return ''
    const page = progress.pageNumber ? ` (עמוד ${progress.pageNumber})` : ''
    const pct = typeof progress.progress === 'number' ? ` ${progress.progress}%` : ''
    const stageMap: Record<SmartOcrProgress['stage'], string> = {
      load: 'טעינה',
      'extract-text': 'חילוץ שכבת טקסט',
      render: 'רינדור לתמונה',
      ocr: 'OCR',
      postprocess: 'עיבוד/זיהוי שדות',
    }
    return `${stageMap[progress.stage]}${page}${pct}${progress.message ? ` — ${progress.message}` : ''}`
  }, [progress])

  const progressValue = useMemo(() => {
    if (!progress) return 0
    if (typeof progress.progress === 'number') return progress.progress
    if (progress.stage === 'load') return 5
    if (progress.stage === 'extract-text') return 20
    if (progress.stage === 'render') return 40
    if (progress.stage === 'ocr') return 60
    if (progress.stage === 'postprocess') return 90
    return 0
  }, [progress])

  const runNlpReview = async () => {
    if (!result?.fullText?.trim()) {
      toast.error('אין טקסט לניתוח')
      return
    }
    setIsNlpRunning(true)
    setNlpIssues([])
    try {
      const schema = z.array(
        z.object({
          type: z.enum([
            'number_mixed_chars',
            'date_suspicious',
            'id_suspicious',
            'email_suspicious',
            'phone_suspicious',
            'whitespace_anomaly',
            'punctuation_anomaly',
          ]),
          original: z.string().min(1),
          suggestion: z.string().optional(),
          evidence: z.string().min(1),
          confidence: z.enum(['low', 'medium', 'high']),
          rationale: z.string().min(1),
          pageNumber: z.number().int().positive().optional(),
        })
      )

      const prompt = `את/ה בודק/ת איכות OCR למסמכי PDF בעברית.

הנחיות קריטיות:
- אין להמציא מידע שלא מופיע בטקסט. אין להשלים שדות חסרים.
- מותר להציע תיקון *רק* אם הוא נובע מטעות OCR סבירה (בלבול תווים/ריווח/פיסוק/ספרות), מתוך הקשר מקומי.
- לכל הצעה חייב להיות "evidence" שמצטט קטע קטן מהטקסט.
- אם לא בטוחים: confidence=low והימנע מהצעת תיקון.
- החזר/י אך ורק JSON תקין לפי הסכמה: מערך של אובייקטים.

טקסט OCR (יתכן מרובה עמודים, עם מפרידי page):
"""
${result.fullText.slice(0, 18000)}
"""`

      const raw = await window.spark.llm(prompt, 'gpt-4o', true)
      const parsed = schema.parse(raw)

      const mapped: OcrIssue[] = parsed.map((it, idx) => ({
        id: `nlp-${idx}`,
        type: it.type,
        pageNumber: it.pageNumber,
        original: it.original,
        suggestion: it.suggestion,
        evidence: it.evidence,
        confidence: it.confidence,
        rationale: it.rationale,
      }))

      setNlpIssues(mapped)
      toast.success('ניתוח NLP הושלם')
    } catch (e: any) {
      toast.error(e?.message || 'שגיאה בניתוח NLP')
    } finally {
      setIsNlpRunning(false)
    }
  }

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h2 className="text-lg font-semibold">חילוץ חכם מ‑PDF (עברית) + OCR</h2>
      <p className="text-sm text-muted-foreground">
        המנגנון מנסה קודם לחלץ טקסט מובנה מה‑PDF (הכי מדויק), ואם אין שכבת טקסט שימושית – מריץ OCR.
        תוצרי חילוץ/OCR מסומנים כלא מאומתים ויש להצליב מול מקור רשמי.
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
                setNlpIssues([])
                setRoi(null)
                setRoiOcrText('')
                setRoiCorrectedText('')
              }}
            />
            {file && <div className="text-xs text-muted-foreground mt-1">{file.name}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">שפה</label>
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
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
            <div className="text-xs text-muted-foreground">{progressLabel}</div>
            <Progress value={progressValue} />
          </div>
        )}
      </Card>

      {result?.detectedFields?.length ? (
        <Card className="p-3">
          <div className="font-semibold mb-2">נתונים שזוהו (עם Evidence)</div>
          <pre className="text-xs whitespace-pre-wrap leading-relaxed">{JSON.stringify(result.detectedFields, null, 2)}</pre>
        </Card>
      ) : null}

      {isPdf ? (
        <Card className="p-3 space-y-3">
          <div className="font-semibold">אימון/דיוק על אזור בעמוד (ROI)</div>
          <div className="text-xs text-muted-foreground">
            למסמכים ישנים/קשים: סמן אזור ספציפי בעמוד, הרץ OCR רק עליו, תקן ידנית ושמור כדוגמה. זה נותן לך Dataset מבוקר,
            ועוזר להגיע לדיוק תפעולי גבוה (עם ולידציה) גם כשאין 100% OCR.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">עמוד</label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(1, pdfNumPages || 1)}
                value={selectedPage}
                onChange={(e) => {
                  const n = parseInt(e.target.value || '1', 10)
                  setSelectedPage(Number.isFinite(n) ? Math.max(1, n) : 1)
                }}
              />
              <div className="text-xs text-muted-foreground mt-1">סה"כ עמודים: {pdfNumPages || '—'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סקייל תצוגה</label>
              <Input
                type="number"
                inputMode="decimal"
                min={1}
                max={5}
                step={0.5}
                value={pageScale}
                onChange={(e) => {
                  const n = parseFloat(e.target.value || '2')
                  setPageScale(Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : 2)
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={renderPdfPreview} disabled={isRenderingPreview}>
                {isRenderingPreview ? 'מרנדר…' : 'טען תצוגה'}
              </Button>
              <Button onClick={runRoiOcr} disabled={!roi || isRoiRunning || isRenderingPreview}>
                {isRoiRunning ? 'OCR…' : 'OCR לאזור'}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="roiMultiPass"
              type="checkbox"
              checked={roiUseMultiPass}
              onChange={(e) => setRoiUseMultiPass(e.target.checked)}
            />
            <label htmlFor="roiMultiPass" className="text-sm">Multi-pass (מומלץ למסמכים קשים)</label>
          </div>
          {roiPassInfo ? <div className="text-xs text-muted-foreground">{roiPassInfo}</div> : null}

          <div className="relative w-full overflow-auto rounded-md border bg-background" style={{ maxHeight: 520 }}>
            <div className="relative inline-block">
              <canvas ref={previewCanvasRef} className="block" />
              <canvas ref={overlayCanvasRef} className="absolute inset-0 cursor-crosshair" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-medium mb-1">תוצאת OCR (אזור)</div>
              <Textarea value={roiOcrText} onChange={(e) => setRoiOcrText(e.target.value)} rows={6} placeholder="הרץ OCR לאזור…" />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">טקסט מתוקן (Ground Truth)</div>
              <Textarea value={roiCorrectedText} onChange={(e) => setRoiCorrectedText(e.target.value)} rows={6} placeholder="תקן כאן את הטקסט המדויק כפי שמופיע במסמך" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">מפתח שדה (אופציונלי)</label>
              <Input value={roiFieldKey} onChange={(e) => setRoiFieldKey(e.target.value)} placeholder="למשל: gush / helka / name / address / total" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveTrainingSample} disabled={!roiCorrectedText.trim()}>
                שמור דוגמה
              </Button>
              <Button variant="outline" onClick={exportTrainingDataset} disabled={trainingCount === 0}>
                ייצא Dataset ({trainingCount})
              </Button>
            </div>
          </div>

          {roiOcrText.trim() && roiCorrectedText.trim() ? (
            <div className="text-xs text-muted-foreground">
              דיוק תווים משוער (CER-based): {(() => {
                const acc = calcCharAccuracy(roiOcrText, roiCorrectedText)
                return acc == null ? '—' : `${Math.round(acc * 100)}%`
              })()}
            </div>
          ) : null}
        </Card>
      ) : null}

      {result ? (
        <Card className="p-3 space-y-3">
          <div className="font-semibold">חילוץ “מה שצריך” (שדות בלבד)</div>
          <div className="text-xs text-muted-foreground">
            הגדר את רשימת השדות שאתה רוצה, והמערכת תחזיר JSON עם value + evidence לכל שדה (ללא המצאת מידע).
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">רשימת שדות (שורה לכל שדה)</label>
            <Textarea value={requiredFields} onChange={(e) => setRequiredFields(e.target.value)} rows={6} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={runFieldExtraction} disabled={isFieldExtractionRunning}>
              {isFieldExtractionRunning ? 'מחלץ…' : 'חלץ שדות'}
            </Button>
          </div>
          <pre className="text-xs whitespace-pre-wrap leading-relaxed">{fieldExtraction ? JSON.stringify(fieldExtraction, null, 2) : '—'}</pre>
        </Card>
      ) : null}

      {result ? (
        <Card className="p-3 space-y-3">
          <div className="font-semibold">מצב תב"ע (ישן/חדש) – חילוץ הוראות</div>
          <div className="text-xs text-muted-foreground">
            מתאים למסמכי תב"ע גם ישנים וגם חדשים. אם ה‑PDF סרוק, מומלץ קודם Multi‑pass/ROI לאזור "הוראות" ואז להפעיל כאן.
            החילוץ מבוקר: אם נתון לא מופיע במפורש בטקסט – מוחזר null.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">שטח מגרש (אופציונלי, מ"ר)</label>
              <Input
                type="number"
                inputMode="decimal"
                value={tabaSiteArea}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  setTabaSiteArea(Number.isFinite(v) ? v : '')
                }}
                placeholder="לדוגמה: 750"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button variant="outline" onClick={runTabaMode} disabled={isTabaRunning}>
                {isTabaRunning ? 'מחלץ…' : 'חלץ הוראות תב"ע'}
              </Button>
              {tabaExtraction ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify({ tabaExtraction, tabaDerived }, null, 2)], { type: 'application/json' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = 'taba-extract.json'
                    a.click()
                  }}
                >
                  ייצא JSON
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-medium mb-1">תוצאת חילוץ (JSON)</div>
              <pre className="text-xs whitespace-pre-wrap leading-relaxed">{tabaExtraction ? JSON.stringify(tabaExtraction, null, 2) : '—'}</pre>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">נגזרות/בדיקות (שמרני)</div>
              <pre className="text-xs whitespace-pre-wrap leading-relaxed">{tabaDerived ? JSON.stringify(tabaDerived, null, 2) : '—'}</pre>
            </div>
          </div>
        </Card>
      ) : null}

      {result ? (
        <Card className="p-3 space-y-3">
          <div className="font-semibold">השוואה לטקסט מקור (דיוק)</div>
          <div className="text-xs text-muted-foreground">
            הדבק כאן טקסט "מקור" שהוקלד/הועתק מפונט (Ground Truth) כדי למדוד התאמה מול הטקסט שחולץ.
          </div>
          <Textarea value={typedText} onChange={(e) => setTypedText(e.target.value)} rows={6} placeholder="הדבק טקסט מקור…" />
          <div className="text-sm">
            דיוק תווים משוער: {(() => {
              if (!typedText.trim()) return '—'
              const acc = calcCharAccuracy(text, typedText)
              return acc == null ? '—' : `${Math.round(acc * 100)}%`
            })()}
          </div>
        </Card>
      ) : null}

      {(issues.length > 0 || (result && issues.length === 0)) ? (
        <Card className="p-3">
          <div className="font-semibold mb-2">בדיקת טעויות (כללים)</div>
          <div className="text-xs text-muted-foreground mb-2">
            זיהוי אוטומטי של תקלות OCR נפוצות (ספרות/תאריכים/ת"ז/טלפון/ריווח). זה לא מתקן לבד – רק מסמן נקודות לבדיקה.
          </div>
          <pre className="text-xs whitespace-pre-wrap leading-relaxed">{issues.length ? JSON.stringify(issues, null, 2) : 'לא זוהו בעיות לפי כללים.'}</pre>
        </Card>
      ) : null}

      {result ? (
        <Card className="p-3 space-y-2">
          <div className="font-semibold">בדיקת טעויות (NLP חכם)</div>
          <div className="text-xs text-muted-foreground">
            משתמש במודל כדי להציע תיקונים אפשריים לטקסט OCR, ללא המצאת מידע. מומלץ לאימות ידני.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={runNlpReview} disabled={isNlpRunning}>
              {isNlpRunning ? 'מנתח…' : 'נתח עם AI'}
            </Button>
          </div>
          {nlpIssues.length ? (
            <pre className="text-xs whitespace-pre-wrap leading-relaxed">{JSON.stringify(nlpIssues, null, 2)}</pre>
          ) : (
            <div className="text-xs text-muted-foreground">—</div>
          )}
        </Card>
      ) : null}

      <Card className="p-3">
        <div className="font-semibold mb-2">טקסט שחולץ</div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="הטקסט יופיע כאן" />
        {result?.pages?.length ? (
          <div className="mt-2 text-xs text-muted-foreground">
            עמודים: {result.pages.length} | שיטה: {Array.from(new Set(result.pages.map(p => p.method))).join(', ')}
          </div>
        ) : null}
      </Card>
    </div>
  )
}
