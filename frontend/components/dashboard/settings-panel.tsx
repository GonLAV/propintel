'use client'

import { useEffect, useState } from 'react'
import { Save, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { defaultWorkspaceSettings, loadWorkspaceSettings, saveWorkspaceSettings } from '@/lib/workspace-settings'

export function SettingsPanel() {
  const [company, setCompany] = useState(defaultWorkspaceSettings.company)
  const [alerts, setAlerts] = useState(defaultWorkspaceSettings.criticalValuationAlerts)
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    try {
      const settings = loadWorkspaceSettings(window.localStorage)
      setCompany(settings.company)
      setAlerts(settings.criticalValuationAlerts)
    } catch {
      setStatus({ tone: 'error', message: 'Saved settings could not be read in this browser.' })
    }
  }, [])

  function saveSettings() {
    try {
      const saved = saveWorkspaceSettings(window.localStorage, {
        company,
        criticalValuationAlerts: alerts,
      })
      setCompany(saved.company)
      setStatus({ tone: 'success', message: 'Workspace settings saved on this device.' })
    } catch {
      setStatus({ tone: 'error', message: 'Settings could not be saved. Check browser storage permissions.' })
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="p-6">
        <span className="grid size-12 place-items-center rounded-2xl border border-mint/20 bg-mint/10 text-mint"><ShieldCheck className="size-5" /></span>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">Security posture</h2>
        <p className="mt-3 text-sm leading-7 text-white/58">This standalone frontend uses an administrator-configured JWT session in an httpOnly cookie. It does not provide tenant isolation, refresh-token rotation, or durable audit storage without a backend.</p>
        <div className="mt-6 space-y-3 text-sm text-white/64">
          <div className="flex justify-between rounded-2xl bg-white/[0.05] px-4 py-3"><span>Session policy</span><strong className="text-white">8 hours</strong></div>
          <div className="flex justify-between gap-3 rounded-2xl bg-white/[0.05] px-4 py-3"><span>Account model</span><strong className="text-amber">Single configured owner</strong></div>
          <div className="flex justify-between gap-3 rounded-2xl bg-white/[0.05] px-4 py-3"><span>Audit storage</span><strong className="text-amber">Backend required</strong></div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold tracking-tight">Workspace settings</h2>
        <p className="mt-2 text-sm text-white/54">Standalone preferences are stored locally in this browser and do not sync across devices.</p>

        <div className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/68">Company name</span>
            <input name="company" autoComplete="organization" maxLength={120} className="h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-sm text-white outline-none focus:border-cyan/60" value={company} onChange={(event) => setCompany(event.target.value)} />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div>
              <p className="text-sm font-semibold text-white">Critical valuation alerts</p>
              <p className="mt-1 text-sm text-white/48">Notify reviewers when confidence falls below 85%.</p>
            </div>
            <input type="checkbox" checked={alerts} onChange={(event) => setAlerts(event.target.checked)} className="size-5 accent-cyan" />
          </label>

          <Button className="h-12" onClick={saveSettings}><Save className="size-4" /> Save settings</Button>
          <div aria-live="polite" aria-atomic="true">
            {status ? (
              <p className={status.tone === 'success' ? 'text-sm font-semibold text-mint' : 'text-sm font-semibold text-rose'} role={status.tone === 'error' ? 'alert' : 'status'}>
                {status.message}
              </p>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  )
}
