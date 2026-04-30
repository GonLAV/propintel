import { Clipboard, Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { type PlanningMemo } from '@/lib/planning-database'

type PlanningMemoPanelProps = {
  memo: PlanningMemo | null
  memoLoading: boolean
  memoStatus: string | null
  onGenerate: () => void
  onCopy: () => void
  onDownload: () => void
}

export function PlanningMemoPanel({ memo, memoLoading, memoStatus, onGenerate, onCopy, onDownload }: PlanningMemoPanelProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div>
          <Badge className="border-mint/20 bg-mint/10 text-mint">
            <FileText className="size-3.5" />
            Review memo
          </Badge>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Planning rights memo</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/54">
            Generate a Markdown memo from the comparison, including source notes and professional verification warnings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onGenerate} disabled={memoLoading} variant="secondary">
            {memoLoading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Generate memo
          </Button>
          <Button onClick={onCopy} disabled={!memo} variant="ghost">
            <Clipboard className="size-4" />
            Copy
          </Button>
          <Button onClick={onDownload} disabled={!memo} variant="ghost">
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="p-5 md:p-6">
        {memoStatus ? <p className="mb-4 text-sm font-semibold text-cyan">{memoStatus}</p> : null}
        {memo ? (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-sm font-semibold text-white">{memo.title}</p>
              <p className="mt-2 text-sm leading-6 text-white/52">{memo.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className={memo.canCalculateLevy ? 'border-mint/20 bg-mint/10 text-mint' : 'border-amber/20 bg-amber/10 text-amber'}>
                  {memo.canCalculateLevy ? 'Levy review ready' : 'Manual review'}
                </Badge>
                <Badge>{memo.warnings.length} verification notes</Badge>
              </div>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-ink/70 p-4 text-xs leading-6 text-white/62">
              {memo.markdown}
            </pre>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.035] p-5 text-sm leading-6 text-white/48">
            Generate a memo after reviewing the rights delta. The memo is produced from the same starter planning dataset and keeps verification warnings visible.
          </div>
        )}
      </div>
    </Card>
  )
}
