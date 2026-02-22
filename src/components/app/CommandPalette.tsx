/**
 * CommandPalette — ⌘K universal search + action overlay.
 * ──────────────────────────────────────────────────────
 * One input to navigate, run commands, or search across the platform.
 * Inspired by Linear, Raycast, VS Code.
 */

import { useState, useEffect, useRef, useMemo, useCallback, type KeyboardEvent } from 'react'
import { MagnifyingGlass, Command, ArrowRight, Lightning, Gear, Robot, NavigationArrow } from '@phosphor-icons/react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { moduleRegistry, type PlatformCommand } from '@/core/moduleRegistry'

// ── Group metadata ────────────────────────────────────────────────
const GROUP_META: Record<PlatformCommand['group'], { label: string; icon: typeof Lightning }> = {
  navigation: { label: 'ניווט', icon: NavigationArrow },
  action: { label: 'פעולות', icon: Lightning },
  data: { label: 'נתונים', icon: ArrowRight },
  settings: { label: 'הגדרות', icon: Gear },
  ai: { label: 'AI', icon: Robot },
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // ── Gather + filter commands ────────────────────────────────────
  const filteredCommands = useMemo(
    () => moduleRegistry.searchCommands(query),
    [query],
  )

  // ── Group commands for display ──────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<PlatformCommand['group'], PlatformCommand[]>()
    for (const cmd of filteredCommands) {
      if (!map.has(cmd.group)) map.set(cmd.group, [])
      map.get(cmd.group)!.push(cmd)
    }
    return Array.from(map.entries())
  }, [filteredCommands])

  // Flat list for keyboard navigation
  const flatList = useMemo(
    () => grouped.flatMap(([, cmds]) => cmds),
    [grouped],
  )

  // ── Reset on open ───────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // Autofocus happens via Dialog
    }
  }, [isOpen])

  // ── Keep selected index in bounds ───────────────────────────────
  useEffect(() => {
    if (selectedIndex >= flatList.length) setSelectedIndex(Math.max(0, flatList.length - 1))
  }, [flatList.length, selectedIndex])

  // ── Scroll selected item into view ──────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // ── Execute selected command ────────────────────────────────────
  const executeCommand = useCallback(
    (cmd: PlatformCommand) => {
      const result = cmd.execute()
      if (result !== false) onClose()
    },
    [onClose],
  )

  // ── Keyboard handling ───────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => (i + 1) % Math.max(1, flatList.length))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => (i - 1 + flatList.length) % Math.max(1, flatList.length))
          break
        case 'Enter':
          e.preventDefault()
          if (flatList[selectedIndex]) executeCommand(flatList[selectedIndex])
          break
      }
    },
    [flatList, selectedIndex, executeCommand],
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border shadow-2xl [&>button[class*='absolute']]:hidden"
      >
        {/* ── Search input ────────────────────────────────────────── */}
        <div className="flex items-center border-b px-4 h-14" dir="rtl">
          <MagnifyingGlass size={20} className="text-muted-foreground shrink-0 ml-3" weight="bold" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="חפש פקודה, תצוגה, או פעולה..."
            className="flex-1 bg-transparent border-0 outline-none text-sm h-full placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-md border">
            <Command size={10} /> K
          </kbd>
        </div>

        {/* ── Results list ─────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-2"
          dir="rtl"
          role="listbox"
          aria-label="תוצאות חיפוש פקודות"
        >
          {flatList.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <MagnifyingGlass size={32} className="mx-auto mb-2 opacity-30" weight="duotone" />
              לא נמצאו תוצאות עבור &ldquo;{query}&rdquo;
            </div>
          ) : (
            grouped.map(([group, cmds]) => {
              const meta = GROUP_META[group]
              const GroupIcon = meta.icon
              return (
                <div key={group} className="mb-1">
                  <div className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <GroupIcon size={12} weight="bold" />
                    {meta.label}
                  </div>
                  {cmds.map((cmd) => {
                    const globalIdx = flatList.indexOf(cmd)
                    const isSelected = globalIdx === selectedIndex
                    const CmdIcon = cmd.icon

                    return (
                      <button
                        key={cmd.id}
                        role="option"
                        data-selected={isSelected}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={cn(
                          'flex items-center gap-3 w-full px-4 py-2.5 text-sm text-right transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-secondary/60',
                        )}
                      >
                        {CmdIcon && <CmdIcon size={18} weight={isSelected ? 'fill' : 'regular'} className="shrink-0" />}
                        <span className="flex-1 truncate">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 border">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {isSelected && <ArrowRight size={14} className="text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* ── Footer hint ─────────────────────────────────────────── */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground" dir="rtl">
          <div className="flex items-center gap-3">
            <span>↑↓ ניווט</span>
            <span>↵ בחירה</span>
            <span>Esc סגירה</span>
          </div>
          <span>{flatList.length} תוצאות</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
