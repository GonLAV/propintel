'use client'

import { useEffect, useState } from 'react'
import { AppraiserShell } from '@/components/appraiser/shell'
import { Card, Field, Input, Button, ErrorNote } from '@/components/appraiser/ui'
import { apiSend } from '@/lib/appraiser-client'
import { translateAuthError } from '@/lib/i18n-errors'

type Me = { id: string; email: string; full_name: string; license_number: string | null }
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
  const [editingLicense, setEditingLicense] = useState(false)
  const [licenseValue, setLicenseValue] = useState('')
  const [savingLicense, setSavingLicense] = useState(false)
  const [licenseError, setLicenseError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/appraiser/auth/me')
      .then((r) => r.json())
      .then((data) => { setMe(data.user); setTenant(data.tenant) })
  }, [])

  function startEditingLicense() {
    setLicenseValue(me?.license_number || '')
    setLicenseError(null)
    setEditingLicense(true)
  }

  async function saveLicense(e: React.FormEvent) {
    e.preventDefault()
    if (!me) return
    setSavingLicense(true)
    setLicenseError(null)
    try {
      const updated = await apiSend<Me>('PATCH', `/users/${me.id}`, {
        licenseNumber: licenseValue.trim() || null,
      })
      setMe((m) => (m ? { ...m, license_number: updated.license_number } : m))
      setEditingLicense(false)
    } catch (err) {
      setLicenseError(err instanceof Error ? translateAuthError(err.message) : 'שגיאה בעדכון מספר הרישיון')
    } finally {
      setSavingLicense(false)
    }
  }

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
      setError(err instanceof Error ? translateAuthError(err.message) : 'שגיאה בעדכון הסיסמה')
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
            {editingLicense ? (
              <form onSubmit={saveLicense} className="flex flex-col gap-2 pt-1">
                <Field label="מספר רישיון שמאי">
                  <Input value={licenseValue} onChange={(e) => setLicenseValue(e.target.value)}
                    placeholder="לדוגמה: 12345" />
                </Field>
                <ErrorNote message={licenseError} />
                <div className="flex gap-2">
                  <Button type="submit" disabled={savingLicense}>{savingLicense ? 'שומר/ת…' : 'שמירה'}</Button>
                  <Button type="button" variant="ghost" disabled={savingLicense}
                    onClick={() => { setEditingLicense(false); setLicenseError(null) }}>ביטול</Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-white/50">מספר רישיון שמאי: </span>
                <span className="text-white">{me.license_number || 'לא צוין'}</span>
                <button type="button" onClick={startEditingLicense}
                  className="text-xs text-teal-300 hover:underline">עריכה</button>
              </div>
            )}
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
