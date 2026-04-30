import { FileSearch } from 'lucide-react'
import { Badge, Card } from '@/components/ui/card'
import { formatAbsoluteSqm } from '@/lib/planning-format'
import { type AutoFetchResult } from '@/lib/planning-database'
import { cn } from '@/lib/utils'

type RightsCardProps = {
  title: string
  result: AutoFetchResult
  featured?: boolean
}

export function RightsCard({ title, result, featured = false }: RightsCardProps) {
  return (
    <Card className={cn('p-5 md:p-6', featured && 'border-cyan/20')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-white/52">{title}</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{result.data?.planNameHe || result.planNumber}</h3>
        </div>
        <Badge className={cn(result.success ? 'border-mint/20 bg-mint/10 text-mint' : 'border-amber/20 bg-amber/10 text-amber')}>
          {result.success ? 'Verified match' : 'Manual entry'}
        </Badge>
      </div>

      {result.data ? (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <RightsMetric label="FAR" value={`${result.data.farPercentage}%`} />
            <RightsMetric label="Floors" value={String(result.data.floors)} />
            <RightsMetric label="Main" value={formatAbsoluteSqm(result.data.mainArea)} />
            <RightsMetric label="Service" value={formatAbsoluteSqm(result.data.serviceArea)} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-start gap-3">
              <FileSearch className="mt-1 size-4 text-cyan" />
              <div>
                <p className="text-sm font-semibold text-white">{result.data.source}</p>
                <p className="mt-1 text-sm leading-6 text-white/50">
                  {result.data.municipality} · {result.data.statusHe} · updated {result.data.lastUpdate}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {result.data.allowedUses.map((use) => (
              <Badge key={use}>{use}</Badge>
            ))}
            {result.data.restrictions.map((restriction) => (
              <Badge key={restriction} className="border-amber/20 bg-amber/10 text-amber">
                {restriction}
              </Badge>
            ))}
          </div>

          <p className="text-xs leading-5 text-white/36">{result.warnings[0]}</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-amber/20 bg-amber/10 p-4 text-sm leading-6 text-amber">
          {result.messageHe}
          {result.suggestions.length ? <p className="mt-2 text-white/58">Try: {result.suggestions.join(', ')}</p> : null}
        </div>
      )}
    </Card>
  )
}

function RightsMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <p className="text-xs text-white/38">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
