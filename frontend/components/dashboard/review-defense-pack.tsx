'use client'

import { FileCheck2, FileWarning, ShieldCheck, ShieldQuestion } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { generateReviewDefensePack, summarizeReviewDefensePack, type DefenseStatus } from '@/lib/review-defense'
import { valuationRows } from '@/lib/data'
import { cn } from '@/lib/utils'

const statusCopy = {
  defensible: 'Defensible',
  'needs-review': 'Needs review',
  'not-ready': 'Not ready',
}

export function ReviewDefensePack() {
  const signals = generateReviewDefensePack(valuationRows)
  const summary = summarizeReviewDefensePack(signals)

  return (
    <Card id="review-defense" className="overflow-hidden p-0">
      <div className="grid gap-0 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="border-b border-white/10 p-5 md:p-6 xl:border-b-0 xl:border-r">
          <Badge className="border-mint/25 bg-mint/10 text-mint">
            <FileCheck2 className="size-3.5" />
            Review Defense Pack
          </Badge>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Know if the valuation can survive review before export.</h2>
          <p className="mt-3 text-sm leading-6 text-white/56">
            Defense Pack combines confidence, planning pressure, covenant pressure, and downside shocks into a defensibility gate for lender, audit, and senior-review workflows.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <DefenseMetric icon={ShieldCheck} label="Avg defense" value={`${summary.averageDefense}/100`} />
            <DefenseMetric icon={FileCheck2} label="Defensible" value={`${summary.defensibleCount} files`} />
            <DefenseMetric icon={FileWarning} label="Weakest file" value={summary.weakest?.asset || 'None'} />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-sm font-semibold text-white">{summary.headline}</p>
            <p className="mt-2 text-sm leading-6 text-white/48">Founder edge: the product becomes a review workflow, not only a report generator. It tells teams what cannot be safely exported yet.</p>
          </div>
        </div>

        <div className="divide-y divide-white/10">
          {signals.map((signal) => (
            <div key={signal.asset} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', statusTone(signal.status))}>{statusCopy[signal.status]}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/34">coverage {signal.evidenceCoverage}/100</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{signal.asset}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/52">{signal.strongestArgument}</p>
                <p className="mt-2 text-sm leading-6 text-cyan">{signal.exportGate}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {signal.missingProof.map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/46">{item}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 md:w-[310px]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/42">Defense score</p>
                    <p className={cn('mt-1 text-3xl font-semibold tracking-tight', scoreTone(signal.status))}>{signal.defenseScore}</p>
                  </div>
                  <ShieldQuestion className={cn('size-8', scoreTone(signal.status))} />
                </div>
                <div className="mt-4 space-y-2">
                  {signal.reviewerQuestions.slice(0, 3).map((question) => (
                    <p key={question} className="rounded-2xl border border-white/8 bg-ink/30 px-3 py-2 text-xs leading-5 text-white/54">{question}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function DefenseMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <Icon className="size-4 text-mint" />
      <p className="mt-3 text-xs text-white/42">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}

function statusTone(status: DefenseStatus) {
  if (status === 'defensible') return 'bg-mint/10 text-mint'
  if (status === 'needs-review') return 'bg-amber/10 text-amber'
  return 'bg-rose/10 text-rose'
}

function scoreTone(status: DefenseStatus) {
  if (status === 'defensible') return 'text-mint'
  if (status === 'needs-review') return 'text-amber'
  return 'text-rose'
}