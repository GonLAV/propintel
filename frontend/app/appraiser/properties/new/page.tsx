'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppraiserShell } from '@/components/appraiser/shell'
import { Card, Field, Input, Select, Button, ErrorNote } from '@/components/appraiser/ui'
import { apiSend, PROPERTY_TYPES } from '@/lib/appraiser-client'

export default function NewPropertyPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    address: '', city: '', propertyType: 'apartment',
    areaSqm: '', rooms: '', floor: '', yearBuilt: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        address: form.address, city: form.city, propertyType: form.propertyType,
      }
      if (form.areaSqm) payload.areaSqm = Number(form.areaSqm)
      if (form.rooms) payload.rooms = Number(form.rooms)
      if (form.floor) payload.floor = Number(form.floor)
      if (form.yearBuilt) payload.yearBuilt = Number(form.yearBuilt)

      const created = await apiSend<{ id: string }>('POST', '/properties', payload)
      router.push(`/appraiser/properties/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת הנכס')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppraiserShell>
      <h1 className="mb-6 text-2xl font-semibold text-white">נכס חדש</h1>
      <Card className="max-w-xl p-6">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="כתובת">
            <Input required value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="רוטשילד 45" />
          </Field>
          <Field label="עיר">
            <Input required value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="תל אביב" />
          </Field>
          <Field label="סוג נכס">
            <Select value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
              {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="שטח (מ״ר)">
              <Input type="number" min="0" step="0.1" value={form.areaSqm} onChange={(e) => set('areaSqm', e.target.value)} />
            </Field>
            <Field label="חדרים">
              <Input type="number" min="0" step="0.5" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} />
            </Field>
            <Field label="קומה">
              <Input type="number" value={form.floor} onChange={(e) => set('floor', e.target.value)} />
            </Field>
            <Field label="שנת בנייה">
              <Input type="number" value={form.yearBuilt} onChange={(e) => set('yearBuilt', e.target.value)} />
            </Field>
          </div>
          <ErrorNote message={error} />
          <Button type="submit" disabled={loading}>{loading ? 'שומר/ת…' : 'שמירה והמשך לשומה'}</Button>
        </form>
      </Card>
    </AppraiserShell>
  )
}
