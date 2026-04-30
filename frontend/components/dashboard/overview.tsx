'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, BrainCircuit, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { CapitalCovenantRadar } from '@/components/dashboard/capital-covenant-radar'
import { PermitPulsePanel } from '@/components/dashboard/permit-pulse-panel'
import { ScenarioShockMatrix } from '@/components/dashboard/scenario-shock-matrix'
import { activity, dashboardCards, valuationRows } from '@/lib/data'

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((item, index) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-cyan"><item.icon className="size-5" /></span>
                <span className="rounded-full bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">{item.trend}</span>
              </div>
              <p className="mt-6 text-sm text-white/52">{item.label}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{item.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card id="analytics" className="p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/52">Market confidence trend</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">North district portfolio</h2>
            </div>
            <ArrowUpRight className="size-5 text-white/35" />
          </div>
          <div className="mt-8 h-80 rounded-[1.4rem] border border-white/10 bg-premium-grid bg-[length:42px_42px] p-5">
            <div className="flex h-full items-end gap-3">
              {[62, 84, 71, 98, 90, 112, 101, 138, 126, 156].map((height, index) => (
                <motion.div key={height} initial={{ height: 0 }} animate={{ height }} transition={{ duration: 0.75, delay: index * 0.04 }} className="flex-1 rounded-t-xl bg-gradient-to-t from-cobalt via-cyan to-mint" />
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="text-xl font-semibold">Activity stream</h2>
          <div className="mt-5 space-y-3">
            {activity.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 size-4 text-mint" />
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/50">{item.detail}</p>
                    <p className="mt-2 text-xs text-white/34">{item.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-white/10 p-5 md:p-6 lg:border-b-0 lg:border-r">
            <Badge className="border-cyan/20 bg-cyan/10 text-cyan">
              <BrainCircuit className="size-3.5" />
              New product edge
            </Badge>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Deal Twin asks the question valuation tools avoid.</h2>
            <p className="mt-3 text-sm leading-6 text-white/56">
              Instead of only estimating value, it reverse-engineers what must be true for an asset to deserve capital: price discipline, income resilience, planning capture, and downside containment.
            </p>
            <Link href="/dashboard/deal-twin" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink transition hover:bg-mist">
              Open Deal Twin
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-3 md:p-6">
            <DealTwinSignal icon={BrainCircuit} label="Conviction" value="71/100" detail="Investment committee readiness" />
            <DealTwinSignal icon={ShieldCheck} label="Capital gates" value="3 / 4" detail="Conditions met or watchlisted" />
            <DealTwinSignal icon={ArrowUpRight} label="Counteroffer" value="$2.72M" detail="Disciplined anchor price" />
          </div>
        </div>
      </Card>

      <PermitPulsePanel />

      <CapitalCovenantRadar />

      <ScenarioShockMatrix />

      <Card id="assets" className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-white/52">Priority queue</p>
            <h2 className="text-xl font-semibold">Active valuations</h2>
          </div>
          <button className="rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/72 hover:bg-white/12">Export memo</button>
        </div>
        <div id="reports" className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-white/42">
              <tr>
                <th className="px-5 py-4 font-medium">Asset</th>
                <th className="px-5 py-4 font-medium">City</th>
                <th className="px-5 py-4 font-medium">Value</th>
                <th className="px-5 py-4 font-medium">Confidence</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {valuationRows.map((row) => (
                <tr key={row.asset} className="border-t border-white/8">
                  <td className="px-5 py-4 font-semibold text-white">{row.asset}</td>
                  <td className="px-5 py-4 text-white/56">{row.city}</td>
                  <td className="px-5 py-4 text-white/72">{row.value}</td>
                  <td className="px-5 py-4 text-white/72">{row.confidence}</td>
                  <td className="px-5 py-4"><span className="rounded-full border border-mint/20 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint">{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function DealTwinSignal({ icon: Icon, label, value, detail }: { icon: typeof BrainCircuit; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <Icon className="size-5 text-mint" />
      <p className="mt-5 text-sm text-white/46">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/46">{detail}</p>
    </div>
  )
}
