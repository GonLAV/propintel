import { Sparkles } from 'lucide-react'

export default function Loading() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4 text-white">
      <div className="premium-noise" />
      <div className="text-center">
        <span className="mx-auto grid size-14 animate-pulse place-items-center rounded-full bg-white text-ink">
          <Sparkles className="size-5" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.26em] text-cyan">Loading PropIntel</p>
        <div className="mx-auto mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-cobalt via-cyan to-mint bg-[length:200%_100%]" />
        </div>
      </div>
    </main>
  )
}
