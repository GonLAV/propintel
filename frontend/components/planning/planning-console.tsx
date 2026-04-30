'use client'

import { useState } from 'react'
import { AlertCircle, ArrowRightLeft, DatabaseZap, Loader2 } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BettermentSignalCard } from '@/components/planning/betterment-signal-card'
import { PlanInput } from '@/components/planning/plan-input'
import { PlanningMemoPanel } from '@/components/planning/planning-memo-panel'
import { RightsCard } from '@/components/planning/rights-card'
import { postJSON } from '@/lib/api-client'
import { planningMemoFileName } from '@/lib/planning-format'
import { type PlanComparison, type PlanningMemo, samplePlanNumbers } from '@/lib/planning-database'

const defaultPreviousPlan = 'לה/במ/18/1000/א'
const defaultNewPlan = '415-0792036'

export function PlanningConsole() {
  const [previousPlan, setPreviousPlan] = useState(defaultPreviousPlan)
  const [newPlan, setNewPlan] = useState(defaultNewPlan)
  const [comparison, setComparison] = useState<PlanComparison | null>(null)
  const [memo, setMemo] = useState<PlanningMemo | null>(null)
  const [memoStatus, setMemoStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [memoLoading, setMemoLoading] = useState(false)

  async function runComparison() {
    setLoading(true)
    setError(null)
    setMemo(null)
    setMemoStatus(null)

    const result = await postJSON<PlanComparison>('/api/planning/compare', { previousPlan, newPlan })
    setLoading(false)

    if (!result.ok || !result.data) {
      setComparison(null)
      setError(result.error || 'Planning comparison failed')
      return
    }

    setComparison(result.data)
  }

  async function generateMemo() {
    setMemoLoading(true)
    setMemoStatus(null)

    const result = await postJSON<PlanningMemo>('/api/planning/memo', { previousPlan, newPlan })
    setMemoLoading(false)

    if (!result.ok || !result.data) {
      setMemo(null)
      setMemoStatus(result.error || 'Planning memo generation failed')
      return
    }

    setMemo(result.data)
    setMemoStatus('Memo generated')
  }

  async function copyMemo() {
    if (!memo) return

    try {
      await navigator.clipboard.writeText(memo.markdown)
      setMemoStatus('Memo copied to clipboard')
    } catch {
      setMemoStatus('Clipboard permission unavailable')
    }
  }

  function downloadMemo() {
    if (!memo) return

    const blob = new Blob([memo.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = planningMemoFileName(memo.previousPlan)
    anchor.click()
    URL.revokeObjectURL(url)
    setMemoStatus('Memo downloaded')
  }

  function loadSample(planNumber: string) {
    setPreviousPlan(defaultPreviousPlan)
    setNewPlan(planNumber)
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/10 p-5 md:p-6">
            <Badge className="border-cyan/20 bg-cyan/10 text-cyan">
              <DatabaseZap className="size-3.5" />
              Planning intelligence
            </Badge>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white md:text-3xl">Government planning rights console</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/56">
              Compare previous and new statutory plans, extract buildable area changes, and prepare betterment levy inputs with traceable source context.
            </p>
          </div>

          <div className="space-y-4 p-5 md:p-6">
            <PlanInput label="Previous plan" value={previousPlan} onChange={setPreviousPlan} />
            <PlanInput label="New plan" value={newPlan} onChange={setNewPlan} />

            <div className="flex flex-wrap gap-2 pt-1">
              {samplePlanNumbers.slice(1).map((planNumber) => (
                <button
                  key={planNumber}
                  onClick={() => loadSample(planNumber)}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/58 transition hover:border-cyan/40 hover:text-cyan"
                >
                  {planNumber}
                </button>
              ))}
            </div>

            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose/20 bg-rose/10 p-4 text-sm text-rose">
                <AlertCircle className="mt-0.5 size-4" />
                {error}
              </div>
            ) : null}

            <Button onClick={runComparison} disabled={loading || !previousPlan.trim() || !newPlan.trim()} className="w-full md:w-auto">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
              Compare planning rights
            </Button>
          </div>
        </Card>

        <BettermentSignalCard comparison={comparison} />
      </section>

      {comparison ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <RightsCard title="Previous plan rights" result={comparison.previousRights} />
          <RightsCard title="New plan rights" result={comparison.newRights} featured />
        </section>
      ) : null}

      {comparison ? (
        <PlanningMemoPanel memo={memo} memoLoading={memoLoading} memoStatus={memoStatus} onGenerate={generateMemo} onCopy={copyMemo} onDownload={downloadMemo} />
      ) : null}
    </div>
  )
}
