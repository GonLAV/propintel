'use client'

import { Banknote, Gauge, Landmark, ShieldAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { generateCapitalCovenantRadar, summarizeCapitalCovenants } from '@/lib/capital-covenant'
import { valuationRows } from '@/lib/data'
import { cn } from '@/lib/utils'

const postureCopy = {
  greenlight: 'Greenlight',
  tighten: 'Tighten',
  renegotiate: 'Renegotiate',
}

export function CapitalCovenantRadar() {
  const signals = generateCapitalCovenantRadar(valuationRows)
  const summary = summarizeCapitalCovenants(signals)

  return (
    <Card id="capital-radar" className="overflow-hidden p-0">
      <div className="border-b border-white/10 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="border-mint/25 bg-mint/10 text-mint">
              <Landmark className="size-3.5" />
              Capital Covenant Radar
            </Badge>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Know when the debt stack starts controlling the deal.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/56">
              Covenant Radar translates valuation confidence, permit pressure, and asset exposure into lender posture, LTV headroom, DSCR buffer, and the next financing move.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
            <RadarMetric icon={Gauge} label="Average pressure" value={`${summary.averageScore}/100`} />
            <RadarMetric icon={ShieldAlert} label="Renegotiate" value={`${summary.renegotiateCount} assets`} />
            <RadarMetric icon={Banknote} label="Top pressure" value={summary.highestPressure?.ltvHeadroom || '0%'} />
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="border-b border-white/10 p-5 md:p-6 lg:border-b-0 lg:border-r">
          <p className="text-sm font-semibold text-white">{summary.headline}</p>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Founder edge: valuation teams usually discover financing fragility after lender feedback. This creates the warning system before term-sheet drift becomes a board problem.
          </p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/34">Recommended posture</p>
            <p className="mt-2 text-lg font-semibold text-white">{summary.highestPressure?.nextMove || 'Keep current financing posture.'}</p>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {signals.map((signal) => (
            <div key={signal.asset} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', signal.lenderPosture === 'renegotiate' && 'bg-rose/10 text-rose', signal.lenderPosture === 'tighten' && 'bg-amber/10 text-amber', signal.lenderPosture === 'greenlight' && 'bg-mint/10 text-mint')}>
                    {postureCopy[signal.lenderPosture]}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/34">{signal.city}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{signal.asset}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">{signal.nextMove}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {signal.triggers.map((trigger) => (
                    <span key={trigger} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/46">{trigger}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 md:w-[290px]">
                <SignalBox label="Pressure" value={`${signal.covenantScore}`} posture={signal.lenderPosture} />
                <SignalBox label="LTV room" value={signal.ltvHeadroom} posture={signal.lenderPosture} />
                <SignalBox label="DSCR" value={signal.dscrBuffer} posture={signal.lenderPosture} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function RadarMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <Icon className="size-4 text-mint" />
      <p className="mt-3 text-xs text-white/42">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}

function SignalBox({ label, value, posture }: { label: string; value: string; posture: 'greenlight' | 'tighten' | 'renegotiate' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[11px] text-white/38">{label}</p>
      <p className={cn('mt-3 text-base font-semibold', posture === 'renegotiate' && 'text-rose', posture === 'tighten' && 'text-amber', posture === 'greenlight' && 'text-mint')}>
        {value}
      </p>
    </div>
  )
}