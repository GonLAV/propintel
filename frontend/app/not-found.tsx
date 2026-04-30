import { Sparkles } from 'lucide-react'
import { LinkButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12 text-white">
      <div className="premium-noise" />
      <Card className="w-full max-w-xl p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-ink">
          <Sparkles className="size-5" />
        </span>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.26em] text-cyan">404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">This valuation room does not exist.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/58">
          The page may have moved, or the workspace route is unavailable in this preview build.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton href="/">Back to landing</LinkButton>
          <LinkButton href="/dashboard" variant="secondary">Open dashboard</LinkButton>
        </div>
      </Card>
    </main>
  )
}
