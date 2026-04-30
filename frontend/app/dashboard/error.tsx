'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="p-8">
      <span className="grid size-12 place-items-center rounded-2xl border border-rose/30 bg-rose/10 text-rose">
        <AlertTriangle className="size-5" />
      </span>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-white">Dashboard failed to load</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-white/58">
        {error.message || 'We could not render this dashboard view. Retry keeps you in the same workspace.'}
      </p>
      <Button onClick={reset} className="mt-6">Retry dashboard</Button>
    </Card>
  )
}
