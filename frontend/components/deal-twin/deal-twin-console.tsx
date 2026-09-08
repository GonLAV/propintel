'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, BrainCircuit, Clipboard, Download, Gauge, Loader2, Milestone, RefreshCcw, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { postJSON } from '@/lib/api-client'
import { analyzeDealTwin, sampleDealTwinScenarios, type DealTwinResult, type DealTwinScenario } from '@/lib/deal-twin'
import { cn, formatCurrency } from '@/lib/utils'

const verdictLabels = {
  approve: 'Approve conditions met',
  negotiate: 'Negotiate with discipline',
  investigate: 'Investigate before capital',
  decline: 'Decline for now',
}

export function DealTwinConsole() {
  const [scenario, setScenario] = useState<DealTwinScenario>(sampleDealTwinScenarios[0])
  const [result, setResult] = useState<DealTwinResult>(() => analyzeDealTwin(sampleDealTwinScenarios[0]))
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const blockedCount = useMemo(() => result.conditions.filter((condition) => condition.status === 'blocked').length, [result])

  async function runTwin(nextScenario = scenario) {
    setLoading(true)
    setError(null)
    setStatus(null)

    const response = await postJSON<DealTwinResult>('/api/intelligence/deal-twin', nextScenario)
    setLoading(false)

    if (!response.ok || !response.data) {
      setError(response.error || 'Deal Twin analysis failed')
      return
    }

    setResult(response.data)
    setStatus('Twin recalibrated')
  }

  function loadScenario(id: string) {
    const nextScenario = sampleDealTwinScenarios.find((item) => item.id === id) || sampleDealTwinScenarios[0]
    setScenario(nextScenario)
    void runTwin(nextScenario)
  }

  function updateNumeric(key: keyof DealTwinScenario, value: number) {
    setScenario((current) => ({ ...current, [key]: value }))
  }

  async function copyMemo() {
    try {
      await navigator.clipboard.writeText(result.boardMemo)
      setStatus('Board memo copied')
    } catch {
      setStatus('Clipboard permission unavailable')
    }
  }

  function downloadMemo() {
    const blob = new Blob([result.boardMemo], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${scenario.id}-deal-twin-memo.md`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus('Board memo downloaded')
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-white/10 p-5 md:p-6">
            <Badge className="border-cyan/20 bg-cyan/10 text-cyan">
              <BrainCircuit className="size-3.5" />
              Decision twin
            </Badge>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white md:text-3xl">What would need to be true?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/56">
              Simulate an investment committee before the meeting: reverse-engineer approval conditions, downside triggers, and the exact diligence moves that change the decision.
            </p>
          </div>

          <div className="space-y-5 p-5 md:p-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/38">Scenario</span>
              <select
                value={scenario.id}
                onChange={(event) => loadScenario(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-ink px-4 text-sm font-semibold text-white outline-none transition focus:border-cyan/50 focus:ring-2 focus:ring-cyan/20"
              >
                {sampleDealTwinScenarios.map((item) => (
                  <option key={item.id} value={item.id}>{item.assetName}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <TwinNumber label="Asking price" value={scenario.askingPrice} min={500000} max={9000000} step={10000} onChange={(value) => updateNumeric('askingPrice', value)} money />
              <TwinNumber label="Estimated value" value={scenario.estimatedValue} min={500000} max={9000000} step={10000} onChange={(value) => updateNumeric('estimatedValue', value)} money />
              <TwinNumber label="Annual rent" value={scenario.annualRent} min={0} max={600000} step={1000} onChange={(value) => updateNumeric('annualRent', value)} money />
              <TwinNumber label="Capex" value={scenario.capex} min={0} max={1200000} step={10000} onChange={(value) => updateNumeric('capex', value)} money />
              <TwinNumber label="Planning upside" value={scenario.planningUpsideSqm} min={0} max={600} step={10} onChange={(value) => updateNumeric('planningUpsideSqm', value)} suffix="sqm" />
              <TwinNumber label="Risk score" value={scenario.riskScore} min={0} max={100} step={1} onChange={(value) => updateNumeric('riskScore', value)} suffix="/100" />
            </div>

            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose/20 bg-rose/10 p-4 text-sm text-rose">
                <AlertTriangle className="mt-0.5 size-4" />
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => runTwin()} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                Recalculate twin
              </Button>
              <Button onClick={copyMemo} variant="secondary">
                <Clipboard className="size-4" />
                Copy memo
              </Button>
              <Button onClick={downloadMemo} variant="ghost">
                <Download className="size-4" />
                Download
              </Button>
            </div>

            {status ? <p className="text-sm font-semibold text-cyan">{status}</p> : null}
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5 md:p-6">
          <div className="absolute right-8 top-8 hidden size-36 rounded-full border border-mint/10 bg-mint/10 blur-3xl md:block" />
          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-white/52">Twin verdict</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">{verdictLabels[result.verdict]}</h2>
              </div>
              <Badge className={cn('text-white', getVerdictClass(result.verdict))}>{scenario.mode}</Badge>
            </div>

            <motion.div key={result.conviction} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 grid gap-4 sm:grid-cols-3">
              <TwinMetric icon={Gauge} label="Conviction" value={`${result.conviction}/100`} tone="cyan" />
              <TwinMetric icon={Sparkles} label="Equity gap" value={formatCurrency(result.equityGap)} tone={result.equityGap >= 0 ? 'mint' : 'rose'} />
              <TwinMetric icon={ShieldCheck} label="Blocked gates" value={String(blockedCount)} tone={blockedCount ? 'amber' : 'mint'} />
            </motion.div>

            <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-white/58">{result.narrative}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <CompactMetric label="Break-even" value={formatCurrency(result.breakEvenPrice)} />
              <CompactMetric label="Upside capture" value={`${result.upsideCapture}%`} />
              <CompactMetric label="Stress loss" value={formatCurrency(result.stressLoss)} />
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-cyan">
              <Milestone className="size-5" />
            </span>
            <div>
              <p className="text-sm text-white/52">Approval conditions</p>
              <h2 className="text-xl font-semibold text-white">Capital gates</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {result.conditions.map((condition) => (
              <div key={condition.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{condition.label}</p>
                    <p className="mt-1 text-sm leading-6 text-white/50">{condition.current} · {condition.target}</p>
                  </div>
                  <Badge className={getStatusClass(condition.status)}>{condition.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-mint">
              <SlidersHorizontal className="size-5" />
            </span>
            <div>
              <p className="text-sm text-white/52">Founder operator mode</p>
              <h2 className="text-xl font-semibold text-white">Next decisive moves</h2>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {result.actions.map((action) => (
              <div key={action.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{action.title}</p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/56">{action.due}</span>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">{action.owner}</p>
                <p className="mt-2 text-sm leading-6 text-white/50">{action.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}

type TwinNumberProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  money?: boolean
  suffix?: string
}

function TwinNumber({ label, value, min, max, step, onChange, money = false, suffix }: TwinNumberProps) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/38">{label}</span>
      <div className="mt-2 flex items-center justify-between gap-3">
        <strong className="text-lg font-semibold text-white">{money ? formatCurrency(value) : `${value.toLocaleString('en-US')} ${suffix || ''}`}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-cyan"
      />
    </label>
  )
}

function TwinMetric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: 'cyan' | 'mint' | 'rose' | 'amber' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <Icon className={cn('size-5', tone === 'cyan' && 'text-cyan', tone === 'mint' && 'text-mint', tone === 'rose' && 'text-rose', tone === 'amber' && 'text-amber')} />
      <p className="mt-4 text-xs text-white/38">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs text-white/38">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function getVerdictClass(verdict: DealTwinResult['verdict']) {
  if (verdict === 'approve') return 'border-mint/20 bg-mint/10 text-mint'
  if (verdict === 'negotiate') return 'border-cyan/20 bg-cyan/10 text-cyan'
  if (verdict === 'investigate') return 'border-amber/20 bg-amber/10 text-amber'
  return 'border-rose/20 bg-rose/10 text-rose'
}

function getStatusClass(status: 'met' | 'watch' | 'blocked') {
  if (status === 'met') return 'border-mint/20 bg-mint/10 text-mint'
  if (status === 'watch') return 'border-amber/20 bg-amber/10 text-amber'
  return 'border-rose/20 bg-rose/10 text-rose'
}