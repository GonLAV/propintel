'use client'

import { useEffect, useState, use as usePromise } from 'react'
import { useRouter } from 'next/navigation'
import { AppraiserShell } from '@/components/appraiser/shell'
import { Card, Field, Input, Select, Textarea, Button, ErrorNote, DateField } from '@/components/appraiser/ui'
import { CsvComparablesImport } from '@/components/appraiser/csv-import'
import { apiGet, apiSend, formatILS, formatQuantity, translateValuationError, PROPERTY_TYPES, VALUATION_METHODS } from '@/lib/appraiser-client'

type Property = {
  id: string; address: string; city: string; property_type: string
  area_sqm: string | null; rooms: string | null; floor: number | null; year_built: number | null
  block: string | null; parcel: string | null; sub_parcel: string | null; visit_date: string | null
  legal_rights_notes: string | null; planning_status_notes: string | null
}
type Comparable = {
  id: string; area_sqm: string; sale_price: string; sold_at: string; floor: number | null
  year_built: number | null
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
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [comps, setComps] = useState<Comparable[]>([])
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [error, setError] = useState<string | null>(null)
  const [compForm, setCompForm] = useState({ areaSqm: '', salePrice: '', soldAt: '', floor: '', rooms: '', yearBuilt: '' })
  const [addingComp, setAddingComp] = useState(false)
  const [deletingCompId, setDeletingCompId] = useState<string | null>(null)
  const [runningMethod, setRunningMethod] = useState<string | null>(null)
  const [generatingReportFor, setGeneratingReportFor] = useState<string | null>(null)
  const [reportFormFor, setReportFormFor] = useState<string | null>(null)
  const [reportForm, setReportForm] = useState({ clientName: '', purpose: '', principlesNotes: '' })
  const [editing, setEditing] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [editForm, setEditForm] = useState({
    address: '', city: '', propertyType: 'apartment',
    areaSqm: '', rooms: '', floor: '', yearBuilt: '',
    block: '', parcel: '', subParcel: '', visitDate: '',
    legalRightsNotes: '', planningStatusNotes: '',
  })

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

  function startEditing() {
    if (!property) return
    setEditForm({
      address: property.address, city: property.city, propertyType: property.property_type,
      areaSqm: property.area_sqm ? String(Number(property.area_sqm)) : '',
      rooms: property.rooms ? String(Number(property.rooms)) : '',
      floor: property.floor === null || property.floor === undefined ? '' : String(property.floor),
      yearBuilt: property.year_built ? String(property.year_built) : '',
      block: property.block ?? '', parcel: property.parcel ?? '', subParcel: property.sub_parcel ?? '',
      visitDate: property.visit_date ? property.visit_date.slice(0, 10) : '',
      legalRightsNotes: property.legal_rights_notes ?? '', planningStatusNotes: property.planning_status_notes ?? '',
    })
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSavingEdit(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        address: editForm.address, city: editForm.city, propertyType: editForm.propertyType,
      }
      if (editForm.areaSqm) payload.areaSqm = Number(editForm.areaSqm)
      if (editForm.rooms) payload.rooms = Number(editForm.rooms)
      if (editForm.floor) payload.floor = Number(editForm.floor)
      if (editForm.yearBuilt) payload.yearBuilt = Number(editForm.yearBuilt)
      payload.block = editForm.block || null
      payload.parcel = editForm.parcel || null
      payload.subParcel = editForm.subParcel || null
      if (editForm.visitDate) payload.visitDate = editForm.visitDate
      payload.legalRightsNotes = editForm.legalRightsNotes || null
      payload.planningStatusNotes = editForm.planningStatusNotes || null

      await apiSend('PATCH', `/properties/${id}`, payload)
      setEditing(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון פרטי הנכס')
    } finally {
      setSavingEdit(false)
    }
  }

  async function archiveProperty() {
    if (!property) return
    if (!window.confirm(`לארכב את הנכס "${property.address}"? הנכס יוסר מרשימת הנכסים שלך (ניתן לשחזר דרך תמיכה במידת הצורך).`)) return
    setArchiving(true)
    setError(null)
    try {
      await apiSend('DELETE', `/properties/${id}`)
      router.push('/appraiser/properties')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בארכוב הנכס')
      setArchiving(false)
    }
  }

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
        yearBuilt: compForm.yearBuilt ? Number(compForm.yearBuilt) : undefined,
        source: 'ידני',
      })
      setCompForm({ areaSqm: '', salePrice: '', soldAt: '', floor: '', rooms: '', yearBuilt: '' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספת עסקת השוואה')
    } finally {
      setAddingComp(false)
    }
  }

  async function deleteComparable(compId: string) {
    if (!window.confirm('להסיר את עסקת ההשוואה הזו? פעולה זו משפיעה על כל השומות העתידיות לעיר/סוג הנכס הזה.')) return
    setDeletingCompId(compId)
    setError(null)
    try {
      await apiSend('DELETE', `/comparables/${compId}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהסרת עסקת ההשוואה')
    } finally {
      setDeletingCompId(null)
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
        ...(reportForm.principlesNotes ? { principlesNotes: reportForm.principlesNotes } : {}),
      })
      window.open(`/api/appraiser/reports/${report.id}/pdf`, '_blank')
      setReportFormFor(null)
      setReportForm({ clientName: '', purpose: '', principlesNotes: '' })
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
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">{property.address}</h1>
              <p className="text-white/50">
                {property.city} · {PROPERTY_TYPES[property.property_type]}
                {property.area_sqm ? ` · ${formatQuantity(property.area_sqm)} מ״ר` : ''}
                {property.rooms ? ` · ${formatQuantity(property.rooms)} חדרים` : ''}
              </p>
            </div>
            {!editing && (
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" onClick={startEditing}>✎ עריכת פרטי נכס</Button>
                <Button variant="ghost" disabled={archiving} onClick={archiveProperty}
                  className="!border-red-400/30 !text-red-300 hover:!bg-red-500/10">
                  {archiving ? 'מארכב/ת…' : '🗄 ארכוב נכס'}
                </Button>
              </div>
            )}
          </div>

          {editing ? (
            <Card className="mb-6 p-5">
              <h2 className="mb-3 text-lg font-medium text-white">עריכת פרטי נכס</h2>
              <form onSubmit={saveEdit} className="flex flex-col gap-4">
                <Field label="כתובת">
                  <Input required value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
                </Field>
                <Field label="עיר">
                  <Input required value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
                </Field>
                <Field label="סוג נכס">
                  <Select value={editForm.propertyType} onChange={(e) => setEditForm((f) => ({ ...f, propertyType: e.target.value }))}>
                    {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="שטח (מ״ר)">
                    <Input type="number" min="0" step="0.1" value={editForm.areaSqm} onChange={(e) => setEditForm((f) => ({ ...f, areaSqm: e.target.value }))} />
                  </Field>
                  <Field label="חדרים">
                    <Input type="number" min="0" step="0.5" value={editForm.rooms} onChange={(e) => setEditForm((f) => ({ ...f, rooms: e.target.value }))} />
                  </Field>
                  <Field label="קומה">
                    <Input type="number" value={editForm.floor} onChange={(e) => setEditForm((f) => ({ ...f, floor: e.target.value }))} />
                  </Field>
                  <Field label="שנת בנייה">
                    <Input type="number" value={editForm.yearBuilt} onChange={(e) => setEditForm((f) => ({ ...f, yearBuilt: e.target.value }))} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="גוש">
                    <Input value={editForm.block} onChange={(e) => setEditForm((f) => ({ ...f, block: e.target.value }))} />
                  </Field>
                  <Field label="חלקה">
                    <Input value={editForm.parcel} onChange={(e) => setEditForm((f) => ({ ...f, parcel: e.target.value }))} />
                  </Field>
                  <Field label="תת חלקה">
                    <Input value={editForm.subParcel} onChange={(e) => setEditForm((f) => ({ ...f, subParcel: e.target.value }))} />
                  </Field>
                </div>
                <DateField label="מועד ביקור בנכס" value={editForm.visitDate} onChange={(v) => setEditForm((f) => ({ ...f, visitDate: v }))} />
                <Field label="זכויות משפטיות בנכס">
                  <Textarea rows={3} value={editForm.legalRightsNotes} onChange={(e) => setEditForm((f) => ({ ...f, legalRightsNotes: e.target.value }))} />
                </Field>
                <Field label="מצב תכנוני">
                  <Textarea rows={3} value={editForm.planningStatusNotes} onChange={(e) => setEditForm((f) => ({ ...f, planningStatusNotes: e.target.value }))} />
                </Field>
                <ErrorNote message={error} />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={savingEdit}>{savingEdit ? 'שומר/ת…' : 'שמירת שינויים'}</Button>
                  <Button type="button" variant="ghost" disabled={savingEdit} onClick={() => { setEditing(false); setError(null) }}>ביטול</Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="mb-6 p-5">
              <h2 className="mb-3 text-lg font-medium text-white">זיהוי ותיעוד</h2>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-white/50">גוש / חלקה / תת-חלקה: </span>
                  <span className="text-white">
                    {property.block || property.parcel || property.sub_parcel
                      ? `${property.block || '—'} / ${property.parcel || '—'} / ${property.sub_parcel || '—'}`
                      : 'לא צוין'}
                  </span>
                </div>
                <div>
                  <span className="text-white/50">מועד ביקור בנכס: </span>
                  <span className="text-white">
                    {property.visit_date ? new Date(property.visit_date).toLocaleDateString('he-IL') : 'לא תועד'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-white/50">זכויות משפטיות: </span>
                  <span className="text-white">{property.legal_rights_notes || 'לא תועד'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-white/50">מצב תכנוני: </span>
                  <span className="text-white">{property.planning_status_notes || 'לא תועד'}</span>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Comparable sales */}
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-medium text-white">עסקאות השוואה ({comps.length})</h2>
              <div className="mb-4 flex flex-col gap-2 text-sm">
                {comps.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                    <span>{formatQuantity(c.area_sqm)} מ״ר · קומה {c.floor ?? '—'}{c.year_built ? ` · נבנה ${c.year_built}` : ''}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">{formatILS(c.sale_price)} · {new Date(c.sold_at).toLocaleDateString('he-IL')}</span>
                      <button
                        type="button"
                        onClick={() => deleteComparable(c.id)}
                        disabled={deletingCompId !== null}
                        title="הסרת עסקת השוואה"
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                      >
                        {deletingCompId === c.id ? '…' : '✕'}
                      </button>
                    </div>
                  </div>
                ))}
                {comps.length === 0 && (
                  <p className="text-white/40">
                    אין עסקאות השוואה לעיר/סוג הנכס הזה בטווח 24 החודשים האחרונים (אם הוזנו עסקאות ישנות יותר, הן אינן מוצגות כאן).
                  </p>
                )}
              </div>
              <form onSubmit={addComparable} className="grid grid-cols-1 gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
                <Field label="שטח (מ״ר)">
                  <Input type="number" step="0.1" required value={compForm.areaSqm}
                    onChange={(e) => setCompForm((f) => ({ ...f, areaSqm: e.target.value }))} />
                </Field>
                <Field label="מחיר מכירה">
                  <Input type="number" required value={compForm.salePrice}
                    onChange={(e) => setCompForm((f) => ({ ...f, salePrice: e.target.value }))} />
                </Field>
                <DateField label="תאריך מכירה" required value={compForm.soldAt}
                  onChange={(v) => setCompForm((f) => ({ ...f, soldAt: v }))} />
                <Field label="קומה">
                  <Input type="number" value={compForm.floor}
                    onChange={(e) => setCompForm((f) => ({ ...f, floor: e.target.value }))} />
                </Field>
                <Field label="שנת בנייה (אופציונלי)">
                  <Input type="number" value={compForm.yearBuilt}
                    onChange={(e) => setCompForm((f) => ({ ...f, yearBuilt: e.target.value }))} />
                </Field>
                <Button type="submit" variant="ghost" disabled={addingComp} className="col-span-2">
                  {addingComp ? 'מוסיף/ה…' : '+ הוספת עסקת השוואה'}
                </Button>
              </form>
              <div className="border-t border-white/10 pt-3">
                <CsvComparablesImport city={property.city} propertyType={property.property_type} onImported={load} />
              </div>
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
                        {v.status === 'completed' ? formatILS(v.estimated_value) : translateValuationError(v.error)}
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
                            <Field label="עקרונות ושיקולים נוספים (אופציונלי)">
                              <Textarea rows={2} value={reportForm.principlesNotes}
                                onChange={(e) => setReportForm((f) => ({ ...f, principlesNotes: e.target.value }))}
                                placeholder="שיקולים מקצועיים נוספים מעבר לסיכום האוטומטי — לדוגמה: מגמת שוק מקומית, מאפיינים ייחודיים לנכס..." />
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
