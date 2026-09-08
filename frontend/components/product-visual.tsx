'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, CircleDollarSign, MapPinned, ShieldCheck } from 'lucide-react'
import { integrations, valuationRows } from '@/lib/data'

export function ProductVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative mx-auto mt-12 max-w-6xl overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.06] p-3 shadow-premium backdrop-blur-2xl"
    >
      <div className="rounded-[1.5rem] border border-white/10 bg-ink/82 p-4 md:p-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan">Live portfolio room</p>
            <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Valuation intelligence, compressed into one command center.</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/65">
            {['Market', 'Planning', 'Risk'].map((label) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3">{label}</div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 pt-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/55">Projected portfolio value</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight text-white">$284.7M</p>
              </div>
              <div className="rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-sm font-semibold text-mint">+12.8%</div>
            </div>

            <div className="mt-7 h-56 rounded-[1.25rem] border border-white/10 bg-premium-grid bg-[length:44px_44px] p-4">
              <div className="flex h-full items-end gap-2">
                {[42, 68, 54, 82, 71, 92, 76, 101, 88, 116, 97, 132].map((height, index) => (
                  <motion.div
                    key={height + index}
                    initial={{ height: 0 }}
                    whileInView={{ height }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.75, delay: index * 0.035 }}
                    className="flex-1 rounded-t-lg bg-gradient-to-t from-cobalt via-cyan to-mint shadow-glow"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-cyan/12 text-cyan"><MapPinned className="size-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-white">Evidence map</p>
                  <p className="text-sm text-white/55">18 verified signals attached</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {integrations.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-center text-xs text-white/64">{item}</span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Review queue</p>
                <ArrowUpRight className="size-4 text-white/45" />
              </div>
              <div className="space-y-2">
                {valuationRows.slice(0, 3).map((row) => (
                  <div key={row.asset} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-white/8 bg-white/[0.05] p-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.asset}</p>
                      <p className="text-xs text-white/50">{row.city} · {row.confidence} confidence</p>
                    </div>
                    <p className="text-sm font-semibold text-white">{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[{ icon: CircleDollarSign, label: 'Yield model synced' }, { icon: ShieldCheck, label: 'Audit trail complete' }, { icon: CheckCircle2, label: 'Bank report ready' }].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white/70">
              <Icon className="size-4 text-mint" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
