'use client'

import { AlertTriangle } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4 py-12 text-white">
      <div className="premium-noise" />
      <Card className="w-full max-w-xl p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-rose/30 bg-rose/10 text-rose">
          <AlertTriangle className="size-5" />
        </span>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.26em] text-rose">Runtime error</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Something slipped in the valuation room.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/58">
          {error.message || 'The page failed to render. Retry the screen or return to the dashboard.'}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>Retry</Button>
          <LinkButton href="/dashboard" variant="secondary">Dashboard</LinkButton>
        </div>
      </Card>
    </main>
  )
}
