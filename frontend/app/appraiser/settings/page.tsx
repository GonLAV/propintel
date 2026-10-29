'use client'

import { useEffect, useState } from 'react'
import { AppraiserShell } from '@/components/appraiser/shell'
import { Card, Field, Input, Button, ErrorNote } from '@/components/appraiser/ui'
import { apiSend } from '@/lib/appraiser-client'

type Me = { email: string; full_name: string; license_number: string | null }
type Tenant = { name: string }

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/appraiser/auth/me')
      .then((r) => r.json())
      .then((data) => { setMe(data.user); setTenant(data.tenant) })
  }, [])

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (newPassword !== confirm) {
      setError('הסיסמאות החדשות אינן תואמות')
      return
    }
    setLoading(true)
    try {
      await apiSend('POST', '/auth/password/change', { currentPassword, newPassword })
      setSuccess('הסיסמה עודכנה בהצלחה. חיבורים פעילים אחרים נותקו מטעמי אבטחה.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון הסיסמה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppraiserShell userLabel={me?.full_name}>
      <h1 className="mb-6 text-2xl font-semibold text-white">הגדרות</h1>

      <Card className="mb-6 max-w-lg p-6">
        <h2 className="mb-3 text-lg font-medium text-white">פרטי חשבון</h2>
        {me ? (
          <div className="flex flex-col gap-2 text-sm">
            <div><span className="text-white/50">שם: </span><span className="text-white">{me.full_name}</span></div>
            <div><span className="text-white/50">אימייל: </span><span className="text-white">{me.email}</span></div>
            <div><span className="text-white/50">משרד: </span><span className="text-white">{tenant?.name || '—'}</span></div>
            <div><span className="text-white/50">מספר רישיון שמאי: </span><span className="text-white">{me.license_number || 'לא צוין'}</span></div>
          </div>
        ) : (
          <p className="text-white/50">טוען…</p>
        )}
      </Card>

      <Card className="max-w-lg p-6">
        <h2 className="mb-3 text-lg font-medium text-white">שינוי סיסמה</h2>
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <Field label="סיסמה נוכחית">
            <Input type="password" required value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="סיסמה חדשה">
            <Input type="password" required value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} placeholder="לפחות 10 תווים, אות גדולה, קטנה וספרה" />
          </Field>
          <Field label="אימות סיסמה חדשה">
            <Input type="password" required value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••••" />
          </Field>
          <ErrorNote message={error} />
          {success && (
            <div className="rounded-lg border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-sm text-teal-200">
              {success}
            </div>
          )}
          <Button type="submit" disabled={loading}>{loading ? 'מעדכן/ת…' : 'עדכון סיסמה'}</Button>
        </form>
      </Card>
    </AppraiserShell>
  )
}
