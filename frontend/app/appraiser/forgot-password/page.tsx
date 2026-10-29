'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, Field, Input, Button, ErrorNote } from '@/components/appraiser/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/appraiser/auth/password/reset-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, tenantSlug: tenantSlug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאה בשליחת הבקשה')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-xl font-semibold text-white">שחזור סיסמה</h1>
        {sent ? (
          <>
            <p className="mt-4 text-sm text-white/70">
              אם קיים חשבון עם הפרטים שסופקו, נשלחו אליו הוראות לאיפוס הסיסמה. בדקו את תיבת הדואר שלכם.
            </p>
            <p className="mt-6 text-center text-sm text-white/50">
              <Link href="/appraiser/login" className="text-teal-300 hover:underline">חזרה לכניסה</Link>
            </p>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-white/50">נזין לכם קישור לאיפוס הסיסמה לכתובת האימייל הרשומה.</p>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Field label="אימייל">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@office.co.il" />
              </Field>
              <Field label="קוד משרד (אופציונלי — רק אם יש כמה משרדים תחת אותו אימייל)">
                <Input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="office-slug" />
              </Field>
              <ErrorNote message={error} />
              <Button type="submit" disabled={loading}>{loading ? 'שולח/ת…' : 'שליחת קישור לאיפוס'}</Button>
            </form>
            <p className="mt-6 text-center text-sm text-white/50">
              <Link href="/appraiser/login" className="text-teal-300 hover:underline">חזרה לכניסה</Link>
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
