import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFPageProxy } from 'pdfjs-dist'

export type SmartOcrMethod = 'text-layer' | 'ocr'

export type SmartOcrPage = {
  pageNumber: number
  method: SmartOcrMethod
  text: string
  confidence?: number
}

export type DetectedField = {
  key: string
  value: string
  evidence: string
  pageNumber?: number
}

export type SmartOcrResult = {
  source: 'pdf' | 'image'
  fileName: string
  createdAt: string
  pages: SmartOcrPage[]
  fullText: string
  detectedFields: DetectedField[]
  issues?: OcrIssue[]
  note: string
}

export type OcrIssueType =
  | 'number_mixed_chars'
  | 'date_suspicious'
  | 'id_suspicious'
  | 'email_suspicious'
  | 'phone_suspicious'
  | 'whitespace_anomaly'
  | 'punctuation_anomaly'

export type OcrIssue = {
  id: string
  type: OcrIssueType
  pageNumber?: number
  original: string
  suggestion?: string
  evidence: string
  confidence: 'low' | 'medium' | 'high'
  rationale: string
}

export type SmartOcrProgress = {
  stage: 'load' | 'extract-text' | 'render' | 'ocr' | 'postprocess'
  pageNumber?: number
  progress?: number
  message?: string
}

export type SmartOcrOptions = {
  lang: string
  scale?: number
  maxPages?: number
  preferTextLayer?: boolean
  onProgress?: (p: SmartOcrProgress) => void
}

function emit(options: SmartOcrOptions, p: SmartOcrProgress) {
  options.onProgress?.(p)
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function isLikelyUsefulTextLayer(text: string) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length < 30) return false
  const heb = (t.match(/[\u0590-\u05FF]/g) || []).length
  const latin = (t.match(/[A-Za-z]/g) || []).length
  const digits = (t.match(/[0-9]/g) || []).length
  const letters = heb + latin
  if (letters === 0) return digits >= 8
  // if it's mostly weird symbols, treat as not useful
  const nonWord = (t.match(/[^\p{L}\p{N}\s]/gu) || []).length
  const nonWordRatio = nonWord / Math.max(1, t.length)
  if (nonWordRatio > 0.35) return false
  return true
}

type PdfTextItem = {
  str: string
  transform?: number[]
}

function reconstructTextFromPdfItems(items: PdfTextItem[]): string {
  // Group by Y coordinate to approximate lines; then sort by X.
  const lines = new Map<number, { x: number; str: string }[]>()

  for (const it of items) {
    const s = (it.str || '').trimEnd()
    if (!s) continue
    const tr = it.transform
    const x = Array.isArray(tr) ? Number(tr[4]) : 0
    const y = Array.isArray(tr) ? Number(tr[5]) : 0
    const yKey = Math.round(y / 2) // tolerance bucket

    const arr = lines.get(yKey) || []
    arr.push({ x, str: s })
    lines.set(yKey, arr)
  }

  const sortedY = Array.from(lines.keys()).sort((a, b) => b - a)

  const out: string[] = []
  for (const yKey of sortedY) {
    const parts = lines.get(yKey) || []
    const joinedRaw = parts.map(p => p.str).join(' ')
    const hebCount = (joinedRaw.match(/[\u0590-\u05FF]/g) || []).length
    const latinCount = (joinedRaw.match(/[A-Za-z]/g) || []).length

    const isHebLine = hebCount > latinCount
    parts.sort((a, b) => (isHebLine ? b.x - a.x : a.x - b.x))

    const line = parts.map(p => p.str).join(' ')
    if (line.trim()) out.push(line)
  }

  return out.join('\n')
}

function otsuThreshold(gray: Uint8ClampedArray): number {
  // gray values 0..255
  const hist = new Array<number>(256).fill(0)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++

  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]

  let sumB = 0
  let wB = 0
  let wF = 0

  let varMax = -1
  let threshold = 127

  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    wF = total - wB
    if (wF === 0) break

    sumB += t * hist[t]

    const mB = sumB / wB
    const mF = (sum - sumB) / wF

    const varBetween = wB * wF * (mB - mF) * (mB - mF)
    if (varBetween > varMax) {
      varMax = varBetween
      threshold = t
    }
  }

  return threshold
}

function preprocessCanvasToBinary(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = img.data

  // grayscale
  const gray = new Uint8ClampedArray(canvas.width * canvas.height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // luminance
    gray[p] = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0
  }

  const t = otsuThreshold(gray)
  // If threshold suggests inverted page, auto-adjust (very dark scans)
  const threshold = clamp(t, 40, 220)

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = gray[p] < threshold ? 0 : 255
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
    data[i + 3] = 255
  }

  ctx.putImageData(img, 0, 0)
  return canvas
}

export function preprocessCanvasForOcr(canvas: HTMLCanvasElement): HTMLCanvasElement {
  return preprocessCanvasToBinary(canvas)
}

function computeMeanConfidence(words?: Array<{ confidence?: number }>): number | undefined {
  if (!Array.isArray(words) || words.length === 0) return undefined
  const vals = words
    .map(w => (typeof w.confidence === 'number' ? w.confidence : NaN))
    .filter(n => Number.isFinite(n)) as number[]
  if (vals.length === 0) return undefined
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round(avg)
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\t\u00A0]+/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function makeIssueId(type: string, pageNumber: number | undefined, original: string, idx: number) {
  const p = typeof pageNumber === 'number' ? `p${pageNumber}` : 'p0'
  const seed = `${type}:${p}:${idx}:${original}`
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return `${type}-${p}-${h.toString(16)}`
}

const digitConfusions: Array<[RegExp, string]> = [
  [/O/g, '0'],
  [/o/g, '0'],
  [/I/g, '1'],
  [/l/g, '1'],
  [/S/g, '5'],
  [/B/g, '8'],
]

function suggestNumericFix(token: string): string {
  let out = token
  for (const [re, repl] of digitConfusions) out = out.replace(re, repl)
  return out
}

function likelyDateParts(d: string) {
  const m = d.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yy = Number(m[3].length === 2 ? `20${m[3]}` : m[3])
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yy)) return null
  return { dd, mm, yy }
}

type TesseractLoggerMessage = {
  status?: string
  progress?: number
}

export type OcrPass = {
  id: string
  psm: '6' | '11'
  preprocess: 'none' | 'binary' | 'deskew-binary'
}

export type OcrPassResult = {
  passId: string
  text: string
  confidence?: number
  score: number
}

function rotateCanvas(source: HTMLCanvasElement, angleDeg: number): HTMLCanvasElement {
  const radians = (angleDeg * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const w = source.width
  const h = source.height
  const newW = Math.ceil(Math.abs(w * cos) + Math.abs(h * sin))
  const newH = Math.ceil(Math.abs(w * sin) + Math.abs(h * cos))

  const out = document.createElement('canvas')
  out.width = newW
  out.height = newH
  const ctx = out.getContext('2d')
  if (!ctx) return out

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, newW, newH)
  ctx.translate(newW / 2, newH / 2)
  ctx.rotate(radians)
  ctx.drawImage(source, -w / 2, -h / 2)
  return out
}

function scoreBinaryCanvasForText(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = img.data

  const rowSums = new Array<number>(canvas.height).fill(0)
  // count black pixels per row (binary expected)
  for (let y = 0; y < canvas.height; y++) {
    let sum = 0
    const rowStart = y * canvas.width * 4
    for (let x = 0; x < canvas.width; x++) {
      const idx = rowStart + x * 4
      const v = data[idx] // R channel
      if (v < 128) sum++
    }
    rowSums[y] = sum
  }

  // score: how "peaky" rows are (more horizontal alignment => higher contrast between text lines and whitespace)
  let score = 0
  for (let y = 1; y < rowSums.length; y++) {
    score += Math.abs(rowSums[y] - rowSums[y - 1])
  }
  return score
}

function deskewCanvasBinary(canvas: HTMLCanvasElement, maxAngleDeg = 5, stepDeg = 1): HTMLCanvasElement {
  // expects binary-ish canvas; tries small rotations and picks best line-alignment score
  let bestAngle = 0
  let bestScore = -Infinity
  let bestCanvas = canvas

  for (let angle = -maxAngleDeg; angle <= maxAngleDeg; angle += stepDeg) {
    const rotated = angle === 0 ? canvas : rotateCanvas(canvas, angle)
    const score = scoreBinaryCanvasForText(rotated)
    if (score > bestScore) {
      bestScore = score
      bestAngle = angle
      bestCanvas = rotated
    }
  }

  // If no meaningful gain, keep original
  if (bestAngle === 0) return canvas
  return bestCanvas
}

type TesseractWorkerResult = {
  data?: {
    text?: string
    words?: Array<{ confidence?: number }>
  }
}

type TesseractWorker = {
  load: () => Promise<void>
  loadLanguage: (lang: string) => Promise<void>
  initialize: (lang: string) => Promise<void>
  setParameters: (params: Record<string, string>) => Promise<void>
  recognize: (image: string) => Promise<TesseractWorkerResult>
  terminate: () => Promise<void>
}

type TesseractModule = {
  createWorker: (opts?: { logger?: (m: TesseractLoggerMessage) => void }) => TesseractWorker | Promise<TesseractWorker>
}

export function detectOcrIssues(pages: SmartOcrPage[], maxIssues = 200): OcrIssue[] {
  const issues: OcrIssue[] = []

  const push = (it: OcrIssue) => {
    issues.push(it)
    return issues.length >= maxIssues
  }

  for (const page of pages) {
    const text = page.text || ''

    // 1) Numbers that contain letters (common OCR error)
    {
      const re = /\b[0-9OolISB][0-9OolISB./-]{4,}\b/g
      let m: RegExpExecArray | null
      let idx = 0
      while ((m = re.exec(text))) {
        idx++
        const original = m[0]
        const fixed = suggestNumericFix(original)
        if (fixed !== original) {
          if (
            push({
              id: makeIssueId('number_mixed_chars', page.pageNumber, original, idx),
              type: 'number_mixed_chars',
              pageNumber: page.pageNumber,
              original,
              suggestion: fixed,
              evidence: evidenceSlice(text, m.index, original.length),
              confidence: 'high',
              rationale: 'נמצא מספר עם תווים שנראים כמו בלבול OCR (O/I/l/S/B במקום ספרות).',
            })
          )
            return issues
        }
      }
    }

    // 2) Suspicious dates
    {
      const re = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g
      let m: RegExpExecArray | null
      let idx = 0
      while ((m = re.exec(text))) {
        idx++
        const original = m[0]
        const parts = likelyDateParts(original)
        if (!parts) continue
        const suspicious = parts.dd < 1 || parts.dd > 31 || parts.mm < 1 || parts.mm > 12 || parts.yy < 1900 || parts.yy > 2100
        if (suspicious) {
          if (
            push({
              id: makeIssueId('date_suspicious', page.pageNumber, original, idx),
              type: 'date_suspicious',
              pageNumber: page.pageNumber,
              original,
              evidence: evidenceSlice(text, m.index, original.length),
              confidence: 'medium',
              rationale: 'תאריך שחולץ נראה מחוץ לטווחים סבירים (יום/חודש/שנה) – ייתכן בלבול ספרות.',
            })
          )
            return issues
        }
      }
    }

    // 3) Israeli IDs (ת"ז) suspicious
    {
      const re = /(ת\.ז\.?|תעודת\s*זהות|ח\.פ\.?|חפ)\s*[:-]?\s*([0-9OolISB]{6,10})/giu
      let m: RegExpExecArray | null
      let idx = 0
      while ((m = re.exec(text))) {
        idx++
        const original = m[2]
        const fixed = suggestNumericFix(original)
        const hasNonDigit = /\D/.test(fixed)
        const lenBad = fixed.length < 7 || fixed.length > 10
        if (hasNonDigit || lenBad) {
          if (
            push({
              id: makeIssueId('id_suspicious', page.pageNumber, original, idx),
              type: 'id_suspicious',
              pageNumber: page.pageNumber,
              original,
              suggestion: fixed !== original ? fixed : undefined,
              evidence: evidenceSlice(text, m.index, m[0].length),
              confidence: fixed !== original ? 'high' : 'low',
              rationale: 'נראה מספר זיהוי עם תווים/אורך לא טיפוסיים – ייתכן טעות OCR.',
            })
          )
            return issues
        }
      }
    }

    // 4) Email suspicious (common: commas/space)
    {
      const re = /\b[^\s@]{2,}@[^\s@]{2,}\b/g
      let m: RegExpExecArray | null
      let idx = 0
      while ((m = re.exec(text))) {
        idx++
        const original = m[0]
        // quick sanity: must contain a dot after @
        const at = original.indexOf('@')
        const hasDot = at >= 0 ? original.slice(at + 1).includes('.') : false
        if (!hasDot) {
          if (
            push({
              id: makeIssueId('email_suspicious', page.pageNumber, original, idx),
              type: 'email_suspicious',
              pageNumber: page.pageNumber,
              original,
              evidence: evidenceSlice(text, m.index, original.length),
              confidence: 'medium',
              rationale: 'כתובת אימייל ללא נקודה אחרי @ – ייתכן שחסרים תווים בגלל OCR.',
            })
          )
            return issues
        }
      }
    }

    // 5) Phone suspicious
    {
      const re = /(\+?972[- ]?|0)([23489]|5\d)[- ]?[0-9OolISB]{7}/g
      let m: RegExpExecArray | null
      let idx = 0
      while ((m = re.exec(text))) {
        idx++
        const original = m[0]
        const fixed = suggestNumericFix(original)
        if (fixed !== original) {
          if (
            push({
              id: makeIssueId('phone_suspicious', page.pageNumber, original, idx),
              type: 'phone_suspicious',
              pageNumber: page.pageNumber,
              original,
              suggestion: fixed,
              evidence: evidenceSlice(text, m.index, original.length),
              confidence: 'high',
              rationale: 'טלפון עם בלבול תווים אופייני ל‑OCR (O/I/l/S/B).',
            })
          )
            return issues
        }
      }
    }

    // 6) Whitespace anomalies
    {
      const re = /\S\s{4,}\S/g
      let m: RegExpExecArray | null
      let idx = 0
      while ((m = re.exec(text))) {
        idx++
        const original = m[0]
        if (
          push({
            id: makeIssueId('whitespace_anomaly', page.pageNumber, original, idx),
            type: 'whitespace_anomaly',
            pageNumber: page.pageNumber,
            original,
            evidence: evidenceSlice(text, m.index, original.length),
            confidence: 'low',
            rationale: 'ריווח חריג עשוי להצביע על שבירת מילים/טורים לא תקינה בהמרה.',
          })
        )
          return issues
      }
    }
  }

  return issues
}

function evidenceSlice(text: string, index: number, matchLength: number) {
  const start = Math.max(0, index - 40)
  const end = Math.min(text.length, index + matchLength + 40)
  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

function detectFieldsFromTextPerPage(pages: SmartOcrPage[]): DetectedField[] {
  const fields: DetectedField[] = []

  const patterns: Array<{ key: string; re: RegExp }> = [
    { key: 'gush', re: /(גוש|GUSH)\s*[:-]?\s*(\d{2,7})/giu },
    { key: 'helka', re: /(חלקה|HELKA)\s*[:-]?\s*(\d{1,6})/giu },
    { key: 'subParcel', re: /(תת\s*חלקה|תת-חלקה)\s*[:-]?\s*(\d{1,6})/giu },
    { key: 'idNumber', re: /(ת\.ז\.?|תעודת\s*זהות|ח\.פ\.?|חפ)\s*[:-]?\s*(\d{6,10})/giu },
    { key: 'date', re: /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/g },
    { key: 'phone', re: /(\+?972[- ]?|0)([23489]|5\d)[- ]?\d{7}/g },
    { key: 'email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    { key: 'caseNumber', re: /(מספר\s*תיק|תיק\s*מס')\s*[:-]?\s*([0-9/-]{4,})/giu },
  ]

  for (const page of pages) {
    const text = page.text || ''
    for (const { key, re } of patterns) {
      re.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = re.exec(text))) {
        const raw = m[0]
        const value = m.length >= 3 ? String(m[2]) : raw
        fields.push({
          key,
          value: String(value).trim(),
          evidence: evidenceSlice(text, m.index, raw.length),
          pageNumber: page.pageNumber,
        })
        if (fields.length > 200) return fields
      }
    }
  }

  return fields
}

async function renderPdfPageToCanvas(page: PDFPageProxy, scale: number): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

async function getPdfTextLayer(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent()
  const items = (content.items || []) as unknown as PdfTextItem[]
  const reconstructed = reconstructTextFromPdfItems(items)
  return normalizeExtractedText(reconstructed)
}

export async function recognizeCanvasWithTesseract(
  canvas: HTMLCanvasElement,
  lang: string,
  onLogger?: (m: TesseractLoggerMessage) => void
) {
  // Use a worker so we can set parameters for better Hebrew PDF OCR.
  const createWorker = (Tesseract as unknown as TesseractModule).createWorker
  const workerMaybePromise = createWorker({ logger: onLogger })
  const worker = (workerMaybePromise instanceof Promise ? await workerMaybePromise : workerMaybePromise)
  await worker.load()
  await worker.loadLanguage(lang)
  await worker.initialize(lang)
  await worker.setParameters({
    preserve_interword_spaces: '1',
    tessedit_pageseg_mode: '6',
  })

  const url = canvas.toDataURL('image/png')
  const result = await worker.recognize(url)
  await worker.terminate()

  const text = normalizeExtractedText(String(result?.data?.text || ''))
  const confidence = computeMeanConfidence(result?.data?.words)
  return { text, confidence }
}

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = source.width
  out.height = source.height
  const ctx = out.getContext('2d')
  if (!ctx) return out
  ctx.drawImage(source, 0, 0)
  return out
}

function textWeirdnessPenalty(text: string): number {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return 50
  const nonWord = (t.match(/[^\p{L}\p{N}\s.,:;/"'()-]/gu) || []).length
  const ratio = nonWord / Math.max(1, t.length)
  return ratio * 100
}

async function recognizeCanvasWithParams(
  canvas: HTMLCanvasElement,
  lang: string,
  psm: '6' | '11',
  onLogger?: (m: TesseractLoggerMessage) => void
) {
  const createWorker = (Tesseract as unknown as TesseractModule).createWorker
  const workerMaybePromise = createWorker({ logger: onLogger })
  const worker = (workerMaybePromise instanceof Promise ? await workerMaybePromise : workerMaybePromise)
  await worker.load()
  await worker.loadLanguage(lang)
  await worker.initialize(lang)
  await worker.setParameters({
    preserve_interword_spaces: '1',
    tessedit_pageseg_mode: psm,
  })

  const url = canvas.toDataURL('image/png')
  const result = await worker.recognize(url)
  await worker.terminate()

  const text = normalizeExtractedText(String(result?.data?.text || ''))
  const confidence = computeMeanConfidence(result?.data?.words)
  return { text, confidence }
}

export async function multiPassOcrCanvas(
  canvas: HTMLCanvasElement,
  lang: string,
  passes: OcrPass[] = [
    { id: 'deskew-binary-psm6', preprocess: 'deskew-binary', psm: '6' },
    { id: 'binary-psm6', preprocess: 'binary', psm: '6' },
    { id: 'none-psm6', preprocess: 'none', psm: '6' },
    { id: 'deskew-binary-psm11', preprocess: 'deskew-binary', psm: '11' },
  ],
  onProgress?: (p: { passId: string; progress?: number }) => void
): Promise<{ best: OcrPassResult; all: OcrPassResult[] }> {
  const all: OcrPassResult[] = []

  for (const pass of passes) {
    let working = cloneCanvas(canvas)
    if (pass.preprocess === 'binary') {
      preprocessCanvasToBinary(working)
    }
    if (pass.preprocess === 'deskew-binary') {
      preprocessCanvasToBinary(working)
      working = deskewCanvasBinary(working, 5, 1)
      // after rotate, re-binarize to clean interpolation
      preprocessCanvasToBinary(working)
    }

    const { text, confidence } = await recognizeCanvasWithParams(working, lang, pass.psm, (m) => {
      if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.({ passId: pass.id, progress: Math.round(m.progress * 100) })
      }
    })

    const conf = typeof confidence === 'number' ? confidence : 0
    const penalty = textWeirdnessPenalty(text)
    const score = conf - penalty
    all.push({ passId: pass.id, text, confidence, score })
  }

  all.sort((a, b) => b.score - a.score)
  const best = all[0] || { passId: 'none', text: '', confidence: undefined, score: -999 }
  return { best, all }
}

export async function smartExtractFromFile(file: File, options: SmartOcrOptions): Promise<SmartOcrResult> {
  const createdAt = new Date().toISOString()
  const scale = options.scale ?? 2.5

  if (file.type === 'application/pdf') {
    emit(options, { stage: 'load', message: 'טוען PDF…' })
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const pageCount = pdf.numPages as number
    const maxPages = typeof options.maxPages === 'number' ? clamp(options.maxPages, 1, pageCount) : pageCount

    const pages: SmartOcrPage[] = []
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)

      emit(options, { stage: 'extract-text', pageNumber, message: 'מנסה לחלץ שכבת טקסט…' })
      const textLayer = await getPdfTextLayer(page)

      if (options.preferTextLayer !== false && isLikelyUsefulTextLayer(textLayer)) {
        pages.push({ pageNumber, method: 'text-layer', text: textLayer })
        continue
      }

      emit(options, { stage: 'render', pageNumber, message: 'מרנדר עמוד לתמונה…' })
      const canvas = await renderPdfPageToCanvas(page, scale)
      preprocessCanvasToBinary(canvas)

      emit(options, { stage: 'ocr', pageNumber, progress: 0, message: 'מריץ OCR…' })
      const { text, confidence } = await recognizeCanvasWithTesseract(canvas, options.lang, (m) => {
        if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
          emit(options, { stage: 'ocr', pageNumber, progress: Math.round(m.progress * 100) })
        }
      })

      pages.push({ pageNumber, method: 'ocr', text, confidence })
    }

    emit(options, { stage: 'postprocess', message: 'מחלץ נתונים מהטקסט…' })
    const detectedFields = detectFieldsFromTextPerPage(pages)
    const issues = detectOcrIssues(pages)

    const fullText = normalizeExtractedText(
      pages
        .map((p) => `--- page ${p.pageNumber} (${p.method}) ---\n${p.text}`)
        .join('\n\n')
    )

    return {
      source: 'pdf',
      fileName: file.name,
      createdAt,
      pages,
      fullText,
      detectedFields,
      issues,
      note: 'תוצר חילוץ/OCR לא מאומת. יש להצליב עם מקור רשמי. שדות מחולצים כוללים Evidence לצורך אימות.'
    }
  }

  if (file.type.startsWith('image/')) {
    emit(options, { stage: 'ocr', message: 'מריץ OCR על תמונה…' })
    const imgUrl = URL.createObjectURL(file)

    const createWorker = (Tesseract as unknown as TesseractModule).createWorker
    const workerMaybePromise = createWorker({
      logger: (m: TesseractLoggerMessage) => {
        if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
          emit(options, { stage: 'ocr', progress: Math.round(m.progress * 100) })
        }
      },
    })

    const worker = (workerMaybePromise instanceof Promise ? await workerMaybePromise : workerMaybePromise)

    await worker.load()
    await worker.loadLanguage(options.lang)
    await worker.initialize(options.lang)
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: '6',
    })

    const result = await worker.recognize(imgUrl)
    await worker.terminate()

    const text = normalizeExtractedText(String(result?.data?.text || ''))
    const confidence = computeMeanConfidence(result?.data?.words)

    const pages: SmartOcrPage[] = [{ pageNumber: 1, method: 'ocr', text, confidence }]
    const detectedFields = detectFieldsFromTextPerPage(pages)
    const issues = detectOcrIssues(pages)

    return {
      source: 'image',
      fileName: file.name,
      createdAt,
      pages,
      fullText: text,
      detectedFields,
      issues,
      note: 'תוצר OCR לא מאומת. יש להצליב עם מקור רשמי. שדות מחולצים כוללים Evidence לצורך אימות.'
    }
  }

  throw new Error('נתמך רק PDF או תמונה')
}
