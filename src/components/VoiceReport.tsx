/**
 * VoiceReport — Voice-to-report using Web Speech API.
 * ────────────────────────────────────────────────────
 * The appraiser speaks → the app transcribes → structures into
 * a professional report using AI (Spark LLM).
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Microphone, Stop, Trash,
  FileText, SpinnerGap, Copy,
  MagicWand, ArrowClockwise,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'

type RecordingState = 'idle' | 'recording' | 'processing' | 'done'

// ── Check Speech API availability ─────────────────────────────────
type SpeechRecognitionCtor = new () => any
const SpeechRecognitionImpl: SpeechRecognitionCtor | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>)['SpeechRecognition'] as SpeechRecognitionCtor | undefined) ??
      ((window as unknown as Record<string, unknown>)['webkitSpeechRecognition'] as SpeechRecognitionCtor | undefined)
    : undefined

export function VoiceReport() {
  const [state, setState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [structuredReport, setStructuredReport] = useState('')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<InstanceType<NonNullable<typeof SpeechRecognitionImpl>> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // ── Start recording ─────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!SpeechRecognitionImpl) {
      setError('הדפדפן אינו תומך בזיהוי קולי. נסה Chrome.')
      return
    }

    setError(null)
    const recognition = new SpeechRecognitionImpl()
    recognition.lang = 'he-IL'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: { resultIndex: number; results: SpeechRecognitionResultList }) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript + ' '
        } else {
          interim += result[0].transcript
        }
      }
      if (final) setTranscript(prev => prev + final)
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== 'aborted') {
        setError(`שגיאה בזיהוי קולי: ${event.error}`)
      }
      setState('idle')
      if (timerRef.current) clearInterval(timerRef.current)
    }

    recognition.onend = () => {
      // Auto-restart if still in recording state
      if (recognitionRef.current && state === 'recording') {
        try { recognition.start() } catch { /* already started */ }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setState('recording')
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [state])

  // ── Stop recording ──────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setState('idle')
    setInterimTranscript('')
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ── Generate structured report via AI ───────────────────────────
  const generateReport = useCallback(async () => {
    if (!transcript.trim()) return
    setState('processing')
    setError(null)

    try {
      const prompt = `
אתה שמאי מקרקעין ישראלי מנוסה.
קיבלת תמלול של ביקור בשטח. ארגן את הטקסט לדוח שמאות מקצועי ומסודר.

חלק את הדוח לסעיפים:
1. **תיאור הנכס** — כתובת, סוג, שטח, קומה
2. **מצב פיזי** — מבנה, גימור, תחזוקה
3. **ליקויים שנמצאו** — פירוט כל בעיה
4. **סביבת הנכס** — שכונה, גישה, שכנים
5. **הערות נוספות** — תצפיות, המלצות
6. **סיכום** — הערכה כללית

חשוב: אל תמציא עובדות. אם מידע חסר, ציין "לא צוין בתמלול".
כתוב בעברית מקצועית.

── תמלול הביקור ──
${transcript}
`
      if (typeof window !== 'undefined' && 'spark' in window) {
        const result = await (window as unknown as { spark: { llm: (prompt: string) => Promise<string> } }).spark.llm(prompt)
        setStructuredReport(result)
      } else {
        // Fallback: format the raw transcript
        setStructuredReport(
          `# דוח ביקור בנכס\n\n` +
          `**תאריך:** ${new Date().toLocaleDateString('he-IL')}\n\n` +
          `## תמלול שטח\n\n${transcript}\n\n` +
          `---\n*הדוח נוצר אוטומטית מתמלול קולי. יש לעבור ולערוך לפני הפצה.*`
        )
      }
      setState('done')
    } catch (_err) {
      setError('שגיאה ביצירת הדוח. נסה שוב.')
      setState('idle')
    }
  }, [transcript])

  // ── Copy to clipboard ───────────────────────────────────────────
  const copyReport = useCallback(() => {
    const text = structuredReport || transcript
    navigator.clipboard.writeText(text)
  }, [structuredReport, transcript])

  // ── Format timer ────────────────────────────────────────────────
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const hasNoSpeechAPI = !SpeechRecognitionImpl

  return (
    <div className="space-y-6">
      <PageHeader
        title="דוח קולי"
        description="דבר — והאפליקציה תיצור דוח מקצועי אוטומטית"
        icon={<Microphone size={28} weight="duotone" />}
      />

      {hasNoSpeechAPI && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-800">
            ⚠️ הדפדפן שלך אינו תומך בזיהוי קולי. השתמש ב-Google Chrome לחוויה מלאה.
            ניתן להקליד ידנית בשדה התמלול למטה.
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="py-4 text-sm text-red-800">{error}</CardContent>
        </Card>
      )}

      {/* Recording controls */}
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-6">
          {/* Microphone button */}
          <div className="relative">
            <button
              onClick={state === 'recording' ? stopRecording : startRecording}
              disabled={state === 'processing' || hasNoSpeechAPI}
              className={cn(
                'h-24 w-24 rounded-full flex items-center justify-center transition-all',
                'focus:outline-none focus:ring-4 focus:ring-primary/20',
                state === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg',
                (state === 'processing' || hasNoSpeechAPI) && 'opacity-50 cursor-not-allowed',
              )}
              aria-label={state === 'recording' ? 'הפסק הקלטה' : 'התחל הקלטה'}
            >
              {state === 'recording' ? <Stop size={36} weight="fill" /> : state === 'processing' ? <SpinnerGap size={36} className="animate-spin" /> : <Microphone size={36} weight="fill" />}
            </button>
            {state === 'recording' && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {formatDuration(duration)}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center max-w-md">
            {state === 'idle' && 'לחץ על המיקרופון והתחל לדבר. תאר את הנכס, מצבו, ליקויים וסביבה.'}
            {state === 'recording' && 'מקליט... דבר בצורה ברורה. לחץ שוב לעצירה.'}
            {state === 'processing' && 'מעבד את התמלול ויוצר דוח מסודר...'}
            {state === 'done' && 'הדוח מוכן! ניתן לערוך ולהעתיק.'}
          </p>

          {/* Interim transcript (live) */}
          {interimTranscript && (
            <div className="bg-secondary/50 rounded-xl px-4 py-2 text-sm text-muted-foreground italic max-w-lg text-center">
              {interimTranscript}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Raw transcript */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={18} /> תמלול גולמי
              </CardTitle>
              {transcript && (
                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setTranscript('')}>
                  <Trash size={12} /> נקה
                </Button>
              )}
            </div>
            <CardDescription>הטקסט כפי שנקלט מהמיקרופון</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[200px] text-sm"
              placeholder={hasNoSpeechAPI ? 'הקלד כאן את תיאור הנכס...' : 'התמלול יופיע כאן בזמן אמת...'}
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
            {transcript && (
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">{transcript.split(/\s+/).filter(Boolean).length} מילים</Badge>
                <Button variant="outline" size="sm" className="gap-1.5 mr-auto" onClick={generateReport} disabled={state === 'processing'}>
                  <MagicWand size={14} />
                  {state === 'processing' ? 'מעבד...' : 'צור דוח מסודר'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Structured report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MagicWand size={18} /> דוח מסודר
              </CardTitle>
              {structuredReport && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={copyReport}>
                    <Copy size={12} /> העתק
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={generateReport}>
                    <ArrowClockwise size={12} /> חדש
                  </Button>
                </div>
              )}
            </div>
            <CardDescription>הדוח המקצועי שנוצר מהתמלול</CardDescription>
          </CardHeader>
          <CardContent>
            {structuredReport ? (
              <ScrollArea className="max-h-[400px]">
                <Textarea
                  className="min-h-[200px] text-sm"
                  value={structuredReport}
                  onChange={e => setStructuredReport(e.target.value)}
                />
              </ScrollArea>
            ) : (
              <div className="min-h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                <p>הדוח יופיע כאן אחרי לחיצה על "צור דוח מסודר"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
