'use client'

import { useState } from 'react'
import { Button, ErrorNote } from '@/components/appraiser/ui'
import { apiSend, formatILS, formatQuantity } from '@/lib/appraiser-client'
import { parseCsv, type ParsedComparableRow } from '@/lib/csv-comparables-parser'

export function CsvComparablesImport({
  city, propertyType, onImported,
}: { city: string; propertyType: string; onImported: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedComparableRow[]>([])
  const [headerError, setHeaderError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  function handleFile(file: File) {
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const { rows: parsed, headerError: hErr } = parseCsv(String(reader.result || ''))
      setRows(parsed)
      setHeaderError(hErr)
    }
    reader.readAsText(file, 'utf-8')
  }

  async function confirmImport() {
    const valid = rows.filter((r) => !r.error)
    if (valid.length === 0) return
    setImporting(true)
    setResult(null)
    const outcomes = await Promise.allSettled(
      valid.map((r) => apiSend('POST', '/comparables', {
        city, propertyType,
        areaSqm: r.areaSqm, salePrice: r.salePrice, soldAt: r.soldAt,
        floor: r.floor ?? undefined, rooms: r.rooms ?? undefined, yearBuilt: r.yearBuilt ?? undefined,
        source: 'ייבוא CSV',
      })),
    )
    const succeeded = outcomes.filter((o) => o.status === 'fulfilled').length
    const failed = outcomes.length - succeeded
    setResult(
      failed === 0
        ? `יובאו ${succeeded} עסקאות השוואה בהצלחה.`
        : `יובאו ${succeeded} מתוך ${outcomes.length} עסקאות; ${failed} נכשלו בשרת.`,
    )
    setImporting(false)
    setRows([])
    await onImported()
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-teal-300 hover:underline">
        + ייבוא מרובה מקובץ CSV
      </button>
    )
  }

  const validCount = rows.filter((r) => !r.error).length
  const errorCount = rows.length - validCount

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">
          קובץ CSV עם עמודות: שטח, מחיר, תאריך (אופציונלי: קומה, חדרים, שנת בנייה)
        </span>
        <button type="button" onClick={() => { setOpen(false); setRows([]); setHeaderError(null); setResult(null) }}
          className="text-xs text-white/40 hover:text-white/70">ביטול</button>
      </div>
      <input
        type="file" accept=".csv,text/csv"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        className="text-sm text-white/70 file:ml-3 file:rounded-lg file:border file:border-white/20 file:bg-white/5 file:px-3 file:py-1.5 file:text-white file:transition hover:file:bg-white/10"
      />
      <ErrorNote message={headerError} />
      {rows.length > 0 && (
        <>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full text-xs">
              <thead className="bg-white/5 text-white/50">
                <tr>
                  <th className="p-2 text-right">שורה</th>
                  <th className="p-2 text-right">שטח</th>
                  <th className="p-2 text-right">מחיר</th>
                  <th className="p-2 text-right">תאריך</th>
                  <th className="p-2 text-right">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className={r.error ? 'bg-red-500/5' : ''}>
                    <td className="p-2">{r.line}</td>
                    <td className="p-2">{r.areaSqm !== null ? `${formatQuantity(r.areaSqm)} מ״ר` : '—'}</td>
                    <td className="p-2">{r.salePrice !== null ? formatILS(r.salePrice) : '—'}</td>
                    <td className="p-2">{r.soldAt || '—'}</td>
                    <td className="p-2">
                      {r.error
                        ? <span className="text-red-300">{r.error}</span>
                        : <span className="text-teal-300">תקין</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-white/50">
            {validCount} עסקאות תקינות{errorCount > 0 ? ` · ${errorCount} עם שגיאות (לא ייובאו)` : ''}
          </div>
          <Button type="button" disabled={importing || validCount === 0} onClick={confirmImport}>
            {importing ? 'מייבא/ת…' : `ייבוא ${validCount} עסקאות השוואה`}
          </Button>
        </>
      )}
      {result && (
        <div className="rounded-lg border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-sm text-teal-200">
          {result}
        </div>
      )}
    </div>
  )
}
