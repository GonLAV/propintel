'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Field, Input, Button, ErrorNote } from '@/components/appraiser/ui'

// Office names here are almost always Hebrew, so an ASCII-only slugify of
// the name itself would often come back empty. Fall back to a short random
// id in that case rather than send the backend an invalid/empty slug.
function slugify(value: string) {
  const ascii = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return ascii || `office-${Math.random().toString(36).slice(2, 8)}`
}

export default function AppraiserRegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/appraiser/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email, password, fullName, tenantName,
          tenantSlug: tenantSlug || slugify(tenantName),
          ...(licenseNumber ? { licenseNumber } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ההרשמה נכשלה')
      router.push('/appraiser/properties')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-xl font-semibold text-white">פתיחת משרד שמאות</h1>
        <p className="mb-6 text-sm text-white/50">דקה אחת, ומתחילים לעבוד על תיקים אמיתיים.</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="שם מלא">
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ישראל ישראלי" />
          </Field>
          <Field label="מספר רישיון שמאי (אופציונלי)">
            <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="12345" />
          </Field>
          <Field label="שם המשרד">
            <Input required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="משרד שמאות ישראלי" />
          </Field>
          <Field label="אימייל">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@office.co.il" />
          </Field>
          <Field label="סיסמה (8 תווים לפחות)">
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={loading}>{loading ? 'פותח/ת משרד…' : 'פתיחת משרד'}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          כבר יש משרד? <Link href="/appraiser/login" className="text-teal-300 hover:underline">כניסה</Link>
        </p>
      </Card>
    </div>
  )
}
