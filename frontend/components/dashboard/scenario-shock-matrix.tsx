'use client'

import { Activity, AlertTriangle, Gauge, Waves } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { summarizeScenarioShockMatrix } from '@/lib/scenario-shock'
import { valuationRows } from '@/lib/data'
import { cn } from '@/lib/utils'

export function ScenarioShockMatrix() {
  const summary = summarizeScenarioShockMatrix(valuationRows)

  return (
    <Card id="shock-matrix" className="overflow-hidden p-0">
      <div className="border-b border-white/10 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="border-cyan/25 bg-cyan/10 text-cyan">
              <Waves className="size-3.5" />
              Scenario Shock Matrix
            </Badge>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Stress the portfolio before the market does.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/56">
              Shock Matrix combines permit pressure, covenant pressure, valuation confidence, and market shocks to show which asset breaks first under board-level downside scenarios.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
            <MatrixMetric icon={Gauge} label="Avg break score" value={`${summary.averageBreakScore}/100`} />
            <MatrixMetric icon={Activity} label="Scenarios" value={`${summary.scenarioCount}`} />
            <MatrixMetric icon={AlertTriangle} label="First break" value={summary.highestBreak?.asset || 'None'} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:p-6 xl:grid-cols-3">
        {summary.matrix.map(({ scenario, firstToBreak, results }) => (
          <div key={scenario.id} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{scenario.label}</p>
                <p className="mt-1 text-xs text-white/42">{scenario.rateShockBps} bps · {scenario.rentShockPercent}% rent · {scenario.permitDelayDays}d delay</p>
              </div>
              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', firstToBreak && firstToBreak.breakScore >= 72 && 'bg-rose/10 text-rose', firstToBreak && firstToBreak.breakScore >= 54 && firstToBreak.breakScore < 72 && 'bg-amber/10 text-amber', (!firstToBreak || firstToBreak.breakScore < 54) && 'bg-mint/10 text-mint')}>
                {firstToBreak ? `${firstToBreak.breakScore}/100` : 'No data'}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-ink/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/34">Breaks first</p>
              <p className="mt-2 text-lg font-semibold text-white">{firstToBreak?.asset || 'No active asset'}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">{firstToBreak?.firstBreak || 'Add assets to calculate scenario exposure.'}</p>
              <p className="mt-3 text-sm leading-6 text-cyan">{firstToBreak?.boardMove || 'No board action required yet.'}</p>
            </div>

            <div className="mt-4 space-y-2">
              {results.map((result) => (
                <div key={`${scenario.id}-${result.asset}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2">
                  <span className="truncate text-sm text-white/70">{result.asset}</span>
                  <span className="text-xs text-white/38">{result.equityBuffer}</span>
                  <span className={cn('text-sm font-semibold', result.breakScore >= 72 && 'text-rose', result.breakScore >= 54 && result.breakScore < 72 && 'text-amber', result.breakScore < 54 && 'text-mint')}>
                    {result.breakScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function MatrixMetric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <Icon className="size-4 text-cyan" />
      <p className="mt-3 text-xs text-white/42">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}