'use client'

import { useEffect, useState } from 'react'
import { AppraiserShell } from '@/components/appraiser/shell'
import { Card, Field, Input, Select, Button, ErrorNote } from '@/components/appraiser/ui'
import { apiGet, apiSend } from '@/lib/appraiser-client'
import { translateAuthError } from '@/lib/i18n-errors'

type Me = { id: string; email: string; full_name: string; license_number: string | null; role: string }
type Tenant = { name: string }
type TeamMember = { id: string; email: string; full_name: string | null; role: string; status: string }

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים', admin: 'מנהל/ת', member: 'חבר/ת צוות', viewer: 'צופה',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל/ה', pending: 'ממתין/ה להצטרפות', disabled: 'מושבת/ת',
}

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

  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    fetch('/api/appraiser/auth/me')
      .then((r) => r.json())
      .then((data) => { setMe(data.user); setTenant(data.tenant) })
  }, [])

  const canManageTeam = me?.role === 'owner' || me?.role === 'admin'

  useEffect(() => {
    if (!canManageTeam) return
    loadTeam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageTeam])

  async function loadTeam() {
    try {
      const data = await apiGet<{ items: TeamMember[] }>('/users?pageSize=100')
      setTeam(data.items)
    } catch {
      // Non-fatal: the account card above still works without the team list.
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    setInviteLink(null)
    setLinkCopied(false)
    try {
      const result = await apiSend<{ inviteToken: string }>('POST', '/users/invite', {
        email: inviteEmail, role: inviteRole,
      })
      setInviteLink(`${window.location.origin}/appraiser/accept-invite/${result.inviteToken}`)
      setInviteEmail('')
      await loadTeam()
    } catch (err) {
      setInviteError(err instanceof Error ? translateAuthError(err.message) : 'שגיאה בהזמנת המשתמש/ת')
    } finally {
      setInviting(false)
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
    } catch {
      // Clipboard access can be denied (permissions, non-secure context) --
      // the link is still shown as selectable text either way.
    }
  }

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

      {canManageTeam && (
        <Card className="mb-6 max-w-lg p-6">
          <h2 className="mb-3 text-lg font-medium text-white">צוות המשרד</h2>
          <div className="mb-4 flex flex-col gap-2 text-sm">
            {team === null && <p className="text-white/50">טוען…</p>}
            {team?.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <div>
                  <div className="text-white">{m.full_name || m.email}</div>
                  <div className="text-xs text-white/50">{m.email}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-white/10 px-2 py-1 text-white/70">{ROLE_LABELS[m.role] || m.role}</span>
                  <span className={m.status === 'pending' ? 'text-amber-300' : 'text-white/40'}>
                    {STATUS_LABELS[m.status] || m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendInvite} className="flex flex-col gap-2 border-t border-white/10 pt-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="אימייל להזמנה">
                <Input type="email" required value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@office.co.il" />
              </Field>
              <Field label="תפקיד">
                <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="member">חבר/ת צוות</option>
                  <option value="admin">מנהל/ת</option>
                  <option value="viewer">צופה</option>
                  {me?.role === 'owner' && <option value="owner">בעלים</option>}
                </Select>
              </Field>
            </div>
            <ErrorNote message={inviteError} />
            <Button type="submit" disabled={inviting}>{inviting ? 'שולח/ת הזמנה…' : 'שליחת הזמנה'}</Button>
          </form>
          {inviteLink && (
            <div className="mt-3 rounded-lg border border-teal-300/30 bg-teal-300/10 p-3 text-sm text-teal-200">
              <p className="mb-2">
                ההזמנה נוצרה. אין שליחת אימייל אוטומטית כרגע — יש להעביר את הקישור הזה למוזמנ/ת (למשל בוואטסאפ או אימייל):
              </p>
              <div className="flex items-center gap-2">
                <input readOnly value={inviteLink} onClick={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/20 px-2 py-1 text-xs text-white" dir="ltr" />
                <Button type="button" variant="ghost" onClick={copyInviteLink}>{linkCopied ? 'הועתק!' : 'העתקה'}</Button>
              </div>
            </div>
          )}
        </Card>
      )}

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
