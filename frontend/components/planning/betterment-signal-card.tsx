import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, MapPinned } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatPercent, formatSigned, formatSqm } from '@/lib/planning-format'
import { type PlanComparison } from '@/lib/planning-database'
import { cn } from '@/lib/utils'

type BettermentSignalCardProps = {
  comparison: PlanComparison | null
}

export function BettermentSignalCard({ comparison }: BettermentSignalCardProps) {
  const deltaTone = getDeltaTone(comparison)

  return (
    <Card className="relative overflow-hidden p-5 md:p-6">
      <div className="absolute right-6 top-6 hidden size-28 rounded-full border border-cyan/10 bg-cyan/10 blur-2xl md:block" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-cyan">
            <MapPinned className="size-5" />
          </span>
          <div>
            <p className="text-sm text-white/52">Betterment signal</p>
            <h2 className="text-xl font-semibold text-white">Rights delta preview</h2>
          </div>
        </div>

        {comparison?.delta ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-5">
            <div className={cn('rounded-[1.5rem] border p-5', deltaTone === 'positive' && 'border-mint/20 bg-mint/10', deltaTone === 'negative' && 'border-rose/20 bg-rose/10', deltaTone === 'neutral' && 'border-white/10 bg-white/[0.05]')}>
              <p className="text-sm text-white/58">Total buildable area delta</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <strong className="text-4xl font-semibold tracking-tight text-white">{formatSqm(comparison.delta.totalAreaDelta)}</strong>
                <span className="pb-1 text-sm font-semibold text-mint">{formatPercent(comparison.delta.percentageIncrease)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DeltaMetric label="FAR change" value={`${formatSigned(comparison.delta.farDelta)}%`} />
              <DeltaMetric label="Floors change" value={formatSigned(comparison.delta.floorsDelta)} />
              <DeltaMetric label="Main area" value={formatSqm(comparison.delta.mainAreaDelta)} />
              <DeltaMetric label="Service area" value={formatSqm(comparison.delta.serviceAreaDelta)} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-start gap-3">
                {comparison.canCalculateLevy ? <CheckCircle2 className="mt-1 size-4 text-mint" /> : <AlertCircle className="mt-1 size-4 text-amber" />}
                <div>
                  <p className="text-sm font-semibold text-white">{comparison.canCalculateLevy ? 'Ready for betterment levy workflow' : 'Manual review required'}</p>
                  <p className="mt-1 text-sm leading-6 text-white/52">
                    {comparison.canCalculateLevy ? 'The new plan adds positive buildable area and can seed levy calculations.' : comparison.issues.join(' ') || 'The comparison did not produce a positive area increase.'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="mt-8 rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.035] p-6 text-sm leading-6 text-white/50">
            Run a comparison to see FAR, floors, main area, service area, and betterment readiness in one review surface.
          </div>
        )}
      </div>
    </Card>
  )
}

function DeltaMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs text-white/38">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

function getDeltaTone(comparison: PlanComparison | null) {
  if (!comparison?.delta) return 'neutral'
  if (comparison.delta.totalAreaDelta > 0) return 'positive'
  if (comparison.delta.totalAreaDelta < 0) return 'negative'
  return 'neutral'
}
