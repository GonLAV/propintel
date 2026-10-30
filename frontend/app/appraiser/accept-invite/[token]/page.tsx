'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Field, Input, Button, ErrorNote } from '@/components/appraiser/ui'

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים', admin: 'מנהל/ת', member: 'חבר/ת צוות', viewer: 'צופה',
}

type InviteInfo = { email: string; role: string; tenantName: string }

export default function AcceptInvitePage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const token = params.token

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/appraiser/auth/invite/${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'קישור ההזמנה אינו תקין')
        setInfo(data)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'שגיאה בטעינת ההזמנה'))
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/appraiser/auth/invite/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password, ...(fullName ? { fullName } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'קבלת ההזמנה נכשלה')
      router.push('/appraiser/properties')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא צפויה')
    } finally {
      setLoading(false)
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold text-white">הזמנה לא תקינה</h1>
          <ErrorNote message={loadError} />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm p-8">
        <h1 className="mb-1 text-xl font-semibold text-white">הצטרפות למשרד</h1>
        {info ? (
          <p className="mb-6 text-sm text-white/50">
            הוזמנת להצטרף ל<span className="text-white">{info.tenantName}</span> בתפקיד{' '}
            <span className="text-white">{ROLE_LABELS[info.role] || info.role}</span>, עבור{' '}
            <span className="font-mono text-white">{info.email}</span>. השלימו את הפרטים כדי להתחיל.
          </p>
        ) : (
          <p className="mb-6 text-sm text-white/50">טוען…</p>
        )}
        {info && (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="שם מלא">
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ישראל ישראלי" />
            </Field>
            <Field label="סיסמה (8 תווים לפחות)">
              <Input type="password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="אימות סיסמה">
              <Input type="password" required minLength={8} value={confirm}
                onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            </Field>
            <ErrorNote message={error} />
            <Button type="submit" disabled={loading}>{loading ? 'מצטרף/ת…' : 'הצטרפות למשרד'}</Button>
          </form>
        )}
      </Card>
    </div>
  )
}
