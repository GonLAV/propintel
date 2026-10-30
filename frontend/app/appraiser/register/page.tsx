'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Field, Input, Button, ErrorNote } from '@/components/appraiser/ui'
import { slugify } from '@/lib/slugify'

export default function AppraiserRegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [duplicateNotice, setDuplicateNotice] = useState<{ slug: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const usedSlug = slugify(tenantName)
      const res = await fetch('/api/appraiser/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email, password, fullName, tenantName, tenantSlug: usedSlug,
          ...(licenseNumber ? { licenseNumber } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ההרשמה נכשלה')
      // The same email can legitimately exist under more than one office
      // (e.g. two separate appraisal offices) -- this isn't blocked. But
      // the person may not have intended that (forgot an existing office,
      // mistyped a slug) -- so tell them plainly instead of just silently
      // dropping them into a second, disconnected office with no notice.
      if (data.otherTenantsExist) {
        setDuplicateNotice({ slug: data.tenant?.slug || usedSlug })
        return
      }
      router.push('/appraiser/properties')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setLoading(false)
    }
  }

  if (duplicateNotice) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm p-8">
          <h1 className="mb-1 text-xl font-semibold text-white">המשרד נפתח בהצלחה</h1>
          <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
            שימו לב: קיים/ים משרד/ות נוסף/ים הרשומ/ים עם האימייל הזה. בכניסה הבאה, אם תתבקשו לבחור משרד, קוד המשרד שפתחתם עכשיו הוא:
            {' '}<span className="font-mono text-white">{duplicateNotice.slug}</span>
          </div>
          <Button className="mt-6 w-full" onClick={() => router.push('/appraiser/properties')}>
            המשך לדשבורד
          </Button>
        </Card>
      </div>
    )
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
