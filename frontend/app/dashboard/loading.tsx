import { Card } from '@/components/ui/card'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-40 animate-pulse bg-white/[0.055]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="h-96 animate-pulse bg-white/[0.055]" />
        <Card className="h-96 animate-pulse bg-white/[0.055]" />
      </div>
      <Card className="h-80 animate-pulse bg-white/[0.055]" />
    </div>
  )
}
