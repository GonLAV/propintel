import { Plus, TextT, Command, MagnifyingGlass, WifiSlash, CloudArrowUp } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { NotificationCenter } from '@/components/app/NotificationCenter'
import { bus } from '@/core/eventBus'
import { useOfflineStatus } from '@/hooks/useOfflineStatus'

export function AppHeader({ onCreateNew, rtl, onToggleRTL }: { onCreateNew: () => void; rtl?: boolean; onToggleRTL?: () => void }) {
  const { online, pendingCount } = useOfflineStatus()

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.08] bg-white/88 [backdrop-filter:saturate(180%)_blur(20px)] [-webkit-backdrop-filter:saturate(180%)_blur(20px)]">
      <div className="flex h-12 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="h-8 w-8 rounded-full hover:bg-black/[0.05] transition-colors text-black/45" />
          <Separator orientation="vertical" className="h-4 mx-0.5 opacity-20" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">AppraisalPro</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Offline indicator */}
          {!online && (
            <Badge variant="outline" className="gap-1 border-amber-300/80 bg-amber-50/80 text-xs text-amber-700 dark:bg-amber-950/30">
              <WifiSlash size={12} weight="bold" />
              לא מקוון
            </Badge>
          )}
          {online && pendingCount > 0 && (
            <Badge variant="outline" className="gap-1 border-sky-300/80 bg-sky-50/80 text-xs text-sky-700 dark:bg-sky-950/30">
              <CloudArrowUp size={12} weight="bold" />
              מסנכרן ({pendingCount})
            </Badge>
          )}

          {/* ⌘K — Command palette trigger */}
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 w-60 justify-start gap-2 rounded-full border-black/8 bg-black/[0.03] px-3 text-[13px] text-black/35 hover:bg-black/[0.05] hover:text-black/50 sm:flex transition-colors"
            onClick={() => bus.emit('command-palette:open')}
            aria-label="פתח חיפוש פקודות (Ctrl+K)"
          >
            <MagnifyingGlass size={14} />
            <span className="flex-1 text-right">חיפוש…</span>
            <kbd className="pointer-events-none ml-1 inline-flex h-5 items-center gap-0.5 rounded border bg-background/80 px-1.5 text-[10px] font-medium text-muted-foreground/70">
              <Command size={10} />K
            </kbd>
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />

          {onToggleRTL && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={onToggleRTL}>
              <TextT size={16} />
              {rtl ? 'RTL' : 'LTR'}
            </Button>
          )}
          <Button onClick={onCreateNew} size="sm" className="gap-1.5">
            <Plus size={16} weight="bold" />
            <span className="hidden sm:inline">שומה חדשה</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
