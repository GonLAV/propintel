'use client'

import { useEffect, useState, use as usePromise } from 'react'
import { AppraiserShell } from '@/components/appraiser/shell'
import { Card, Field, Input, Select, Button, ErrorNote } from '@/components/appraiser/ui'
import { apiGet, apiSend, formatILS, PROPERTY_TYPES, VALUATION_METHODS } from '@/lib/appraiser-client'

type Property = {
  id: string; address: string; city: string; property_type: string
  area_sqm: string | null; rooms: string | null; floor: number | null; year_built: number | null
}
type Comparable = {
  id: string; area_sqm: string; sale_price: string; sold_at: string; floor: number | null
}
type Valuation = {
  id: string; method: string; status: string; estimated_value: string | null
  confidence: string | null; currency: string; error: string | null
  result: { sampleSize?: number; landValueSource?: string } | null
}
type Report = {
  id: string; title: string; format: string; created_at: string
  valuation_summary: { method: string; estimatedValue: number | null; currency: string } | null
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const [property, setProperty] = useState<Property | null>(null)
  const [comps, setComps] = useState<Comparable[]>([])
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [error, setError] = useState<string | null>(null)
  const [compForm, setCompForm] = useState({ areaSqm: '', salePrice: '', soldAt: '', floor: '', rooms: '' })
  const [addingComp, setAddingComp] = useState(false)
  const [runningMethod, setRunningMethod] = useState<string | null>(null)
  const [generatingReportFor, setGeneratingReportFor] = useState<string | null>(null)
  const [reportFormFor, setReportFormFor] = useState<string | null>(null)
  const [reportForm, setReportForm] = useState({ clientName: '', purpose: '' })

  async function load() {
    try {
      const p = await apiGet<Property>(`/properties/${id}`)
      setProperty(p)
      if (p.city && p.property_type) {
        const c = await apiGet<{ items: Comparable[] }>(
          `/comparables?city=${encodeURIComponent(p.city)}&propertyType=${p.property_type}`,
        )
        setComps(c.items)
      }
      const v = await apiGet<{ items: Valuation[] }>(`/valuations?propertyId=${id}`)
      setValuations(v.items)
      const r = await apiGet<{ items: Report[] }>(`/reports?propertyId=${id}`)
      setReports(r.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הנכס')
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addComparable(e: React.FormEvent) {
    e.preventDefault()
    if (!property) return
    setAddingComp(true)
    setError(null)
    try {
      await apiSend('POST', '/comparables', {
        city: property.city,
        propertyType: property.property_type,
        areaSqm: Number(compForm.areaSqm),
        salePrice: Number(compForm.salePrice),
        soldAt: compForm.soldAt,
        floor: compForm.floor ? Number(compForm.floor) : undefined,
        rooms: compForm.rooms ? Number(compForm.rooms) : undefined,
        source: 'ידני',
      })
      setCompForm({ areaSqm: '', salePrice: '', soldAt: '', floor: '', rooms: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספת עסקת השוואה')
    } finally {
      setAddingComp(false)
    }
  }

  async function runValuation(method: string) {
    setRunningMethod(method)
    setError(null)
    try {
      await apiSend('POST', '/valuations', { propertyId: id, method })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בחישוב השומה')
    } finally {
      setRunningMethod(null)
    }
  }

  async function generateReport(valuationId: string) {
    if (!property) return
    setGeneratingReportFor(valuationId)
    setError(null)
    try {
      const report = await apiSend<{ id: string }>('POST', '/reports', {
        valuationId,
        title: `שומת ${property.address}`,
        format: 'pdf',
        ...(reportForm.clientName ? { clientName: reportForm.clientName } : {}),
        ...(reportForm.purpose ? { purpose: reportForm.purpose } : {}),
      })
      window.open(`/api/appraiser/reports/${report.id}/pdf`, '_blank')
      setReportFormFor(null)
      setReportForm({ clientName: '', purpose: '' })
      const r = await apiGet<{ items: Report[] }>(`/reports?propertyId=${id}`)
      setReports(r.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהפקת הדוח')
    } finally {
      setGeneratingReportFor(null)
    }
  }

  if (!property && !error) {
    return <AppraiserShell><p className="text-white/50">טוען…</p></AppraiserShell>
  }

  return (
    <AppraiserShell>
      <ErrorNote message={error} />
      {property && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-white">{property.address}</h1>
            <p className="text-white/50">
              {property.city} · {PROPERTY_TYPES[property.property_type]}
              {property.area_sqm ? ` · ${property.area_sqm} מ״ר` : ''}
              {property.rooms ? ` · ${property.rooms} חדרים` : ''}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Comparable sales */}
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-medium text-white">עסקאות השוואה ({comps.length})</h2>
              <div className="mb-4 flex flex-col gap-2 text-sm">
                {comps.map((c) => (
                  <div key={c.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span>{c.area_sqm} מ״ר · קומה {c.floor ?? '—'}</span>
                    <span className="text-white/60">{formatILS(c.sale_price)} · {new Date(c.sold_at).toLocaleDateString('he-IL')}</span>
                  </div>
                ))}
                {comps.length === 0 && <p className="text-white/40">אין עדיין עסקאות השוואה לעיר/סוג הנכס הזה.</p>}
              </div>
              <form onSubmit={addComparable} className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                <Field label="שטח (מ״ר)">
                  <Input type="number" step="0.1" required value={compForm.areaSqm}
                    onChange={(e) => setCompForm((f) => ({ ...f, areaSqm: e.target.value }))} />
                </Field>
                <Field label="מחיר מכירה">
                  <Input type="number" required value={compForm.salePrice}
                    onChange={(e) => setCompForm((f) => ({ ...f, salePrice: e.target.value }))} />
                </Field>
                <Field label="תאריך מכירה">
                  <Input type="date" required value={compForm.soldAt}
                    onChange={(e) => setCompForm((f) => ({ ...f, soldAt: e.target.value }))} />
                </Field>
                <Field label="קומה">
                  <Input type="number" value={compForm.floor}
                    onChange={(e) => setCompForm((f) => ({ ...f, floor: e.target.value }))} />
                </Field>
                <Button type="submit" variant="ghost" disabled={addingComp} className="col-span-2">
                  {addingComp ? 'מוסיף/ה…' : '+ הוספת עסקת השוואה'}
                </Button>
              </form>
            </Card>

            {/* Valuations */}
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-medium text-white">שומה</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                {Object.entries(VALUATION_METHODS).map(([method, label]) => (
                  <Button key={method} variant="ghost" disabled={runningMethod !== null}
                    onClick={() => runValuation(method)}>
                    {runningMethod === method ? 'מחשב/ת…' : `חשב ${label}`}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {valuations.map((v) => (
                  <div key={v.id} className="rounded-lg bg-white/5 px-3 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{VALUATION_METHODS[v.method] || v.method}</span>
                      <span className={v.status === 'completed' ? 'text-teal-300' : 'text-red-300'}>
                        {v.status === 'completed' ? formatILS(v.estimated_value) : v.error || 'נכשל'}
                      </span>
                    </div>
                    {v.status === 'completed' && (
                      <>
                        <div className="mt-1 text-white/50">
                          ביטחון {Math.round(Number(v.confidence) * 100)}%
                          {v.result?.sampleSize ? ` · ${v.result.sampleSize} עסקאות` : ''}
                          {v.result?.landValueSource === 'market-abstraction' ? ' · קרקע מבוססת-שוק' : ''}
                        </div>
                        {reportFormFor === v.id ? (
                          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-white/5 p-3">
                            <Field label="מזמין/ת השומה">
                              <Input value={reportForm.clientName}
                                onChange={(e) => setReportForm((f) => ({ ...f, clientName: e.target.value }))}
                                placeholder="לדוגמה: בנק הפועלים / ישראל ישראלי" />
                            </Field>
                            <Field label="מטרת השומה">
                              <Select value={reportForm.purpose}
                                onChange={(e) => setReportForm((f) => ({ ...f, purpose: e.target.value }))}>
                                <option value="">— ללא ציון —</option>
                                <option value="רכישה / מכירה">רכישה / מכירה</option>
                                <option value="משכנתא">משכנתא</option>
                                <option value="דיווח חשבונאי / מס">דיווח חשבונאי / מס</option>
                                <option value="הליך משפטי">הליך משפטי</option>
                                <option value="אחר">אחר</option>
                              </Select>
                            </Field>
                            <div className="flex gap-2">
                              <Button className="flex-1" disabled={generatingReportFor !== null}
                                onClick={() => generateReport(v.id)}>
                                {generatingReportFor === v.id ? 'מפיק/ה דוח…' : 'הפקת הדוח'}
                              </Button>
                              <Button variant="ghost" disabled={generatingReportFor !== null}
                                onClick={() => setReportFormFor(null)}>
                                ביטול
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="ghost" className="mt-2 w-full"
                            disabled={generatingReportFor !== null}
                            onClick={() => setReportFormFor(v.id)}>
                            📄 הפק דוח PDF
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {valuations.length === 0 && <p className="text-white/40">עדיין לא חושבה שומה לנכס הזה.</p>}
              </div>
            </Card>
          </div>

          {/* Past reports for this property */}
          <Card className="mt-6 p-5">
            <h2 className="mb-4 text-lg font-medium text-white">דוחות קודמים ({reports.length})</h2>
            <div className="flex flex-col gap-2 text-sm">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <div>
                    <div className="text-white">{r.title}</div>
                    <div className="text-white/50">
                      {r.valuation_summary && (
                        <>
                          {VALUATION_METHODS[r.valuation_summary.method] || r.valuation_summary.method}
                          {' · '}
                          {formatILS(r.valuation_summary.estimatedValue)}
                          {' · '}
                        </>
                      )}
                      {new Date(r.created_at).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                  {r.format === 'pdf' ? (
                    <a
                      href={`/api/appraiser/reports/${r.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-white transition hover:bg-white/10"
                    >
                      פתיחת PDF
                    </a>
                  ) : (
                    <span className="text-xs text-white/30">אין PDF</span>
                  )}
                </div>
              ))}
              {reports.length === 0 && <p className="text-white/40">עדיין לא הופק דוח לנכס הזה.</p>}
            </div>
          </Card>
        </>
      )}
    </AppraiserShell>
  )
}
