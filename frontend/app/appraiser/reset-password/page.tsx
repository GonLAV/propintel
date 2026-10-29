'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Field, Input, Button, ErrorNote } from '@/components/appraiser/ui'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirm) {
      setError('הסיסמאות אינן תואמות')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/appraiser/auth/password/reset-confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'איפוס הסיסמה נכשל')
      setDone(true)
      setTimeout(() => router.push('/appraiser/login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-4 text-xl font-semibold text-white">קישור לא תקין</h1>
        <p className="text-sm text-white/50">
          הקישור חסר טוקן לאיפוס סיסמה. יש לבקש קישור חדש מ
          <Link href="/appraiser/forgot-password" className="text-teal-300 hover:underline"> דף שחזור הסיסמה</Link>.
        </p>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm p-8">
      <h1 className="mb-1 text-xl font-semibold text-white">קביעת סיסמה חדשה</h1>
      {done ? (
        <p className="mt-4 text-sm text-white/70">הסיסמה עודכנה בהצלחה. מעביר/ה אתכם למסך הכניסה…</p>
      ) : (
        <>
          <p className="mb-6 text-sm text-white/50">לפחות 10 תווים, עם אות גדולה, אות קטנה וספרה.</p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="סיסמה חדשה">
              <Input type="password" required value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••••" />
            </Field>
            <Field label="אימות סיסמה">
              <Input type="password" required value={confirm}
                onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••••" />
            </Field>
            <ErrorNote message={error} />
            <Button type="submit" disabled={loading}>{loading ? 'מעדכן/ת…' : 'עדכון הסיסמה'}</Button>
          </form>
        </>
      )}
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Suspense fallback={<p className="text-white/50">טוען…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
