'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Field, Input, Button, ErrorNote } from '@/components/appraiser/ui'

export default function AppraiserLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/appraiser/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, tenantSlug: tenantSlug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'התחברות נכשלה')
      router.push('/appraiser/properties')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-xl font-semibold text-white">כניסה למשרד השמאות</h1>
        <p className="mb-6 text-sm text-white/50">תיקי שומה, קומפרבלים ושומות — במקום אחד.</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="אימייל">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@office.co.il" />
          </Field>
          <Field label="סיסמה">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="קוד משרד (אופציונלי — רק אם יש כמה משרדים תחת אותו אימייל)">
            <Input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="office-slug" />
          </Field>
          <ErrorNote message={error} />
          <Button type="submit" disabled={loading}>{loading ? 'מתחבר/ת…' : 'כניסה'}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          אין לך עדיין משרד? <Link href="/appraiser/register" className="text-teal-300 hover:underline">פתיחת משרד חדש</Link>
        </p>
      </Card>
    </div>
  )
}
