'use client'

import { AlertTriangle, ArrowUpRight, Clock3, ShieldAlert } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { generatePermitPulse, summarizePermitPulse } from '@/lib/permit-pulse'
import { valuationRows } from '@/lib/data'
import { cn } from '@/lib/utils'

const signalCopy = {
  accelerate: 'Accelerate',
  watch: 'Watch',
  hold: 'Hold',
}

export function PermitPulsePanel() {
  const signals = generatePermitPulse(valuationRows)
  const summary = summarizePermitPulse(signals)

  return (
    <Card id="permit-pulse" className="overflow-hidden p-0">
      <div className="grid gap-0 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-white/10 p-5 md:p-6 xl:border-b-0 xl:border-r">
          <Badge className="border-amber/25 bg-amber/10 text-amber">
            <ShieldAlert className="size-3.5" />
            Permit Pulse
          </Badge>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Planning risk before it becomes valuation drift.</h2>
          <p className="mt-3 text-sm leading-6 text-white/56">
            Permit Pulse turns zoning and approval uncertainty into a control workflow: pressure windows, value-at-risk, and the next action needed to protect underwriting discipline.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <SummaryMetric label="Average risk" value={`${summary.averageRisk}/100`} />
            <SummaryMetric label="Accelerate" value={`${summary.accelerated} assets`} />
            <SummaryMetric label="Top pressure" value={summary.highestRisk?.valueAtRisk || '$0.00M'} />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <AlertTriangle className="size-4 text-amber" />
              {summary.headline}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/48">Founder edge: the product does not only explain today&apos;s value. It warns when planning time can quietly rewrite tomorrow&apos;s value.</p>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {signals.map((signal) => (
            <div key={signal.asset} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', signal.signal === 'accelerate' && 'bg-rose/10 text-rose', signal.signal === 'watch' && 'bg-amber/10 text-amber', signal.signal === 'hold' && 'bg-mint/10 text-mint')}>
                    {signalCopy[signal.signal]}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/34">{signal.permitStage}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{signal.asset}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">{signal.controlAction}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {signal.drivers.map((driver) => (
                    <span key={driver} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/46">{driver}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 md:w-[290px]">
                <SignalBox icon={ShieldAlert} label="Risk" value={`${signal.riskScore}`} emphasis={signal.signal} />
                <SignalBox icon={ArrowUpRight} label="At risk" value={signal.valueAtRisk} emphasis={signal.signal} />
                <SignalBox icon={Clock3} label="Window" value={signal.deadlineWindow} emphasis={signal.signal} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs text-white/42">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}

function SignalBox({ icon: Icon, label, value, emphasis }: { icon: typeof ShieldAlert; label: string; value: string; emphasis: 'accelerate' | 'watch' | 'hold' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <Icon className={cn('size-4', emphasis === 'accelerate' && 'text-rose', emphasis === 'watch' && 'text-amber', emphasis === 'hold' && 'text-mint')} />
      <p className="mt-3 text-[11px] text-white/38">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}