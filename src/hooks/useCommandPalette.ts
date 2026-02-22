/**
 * useCommandPalette — React hook for keyboard shortcut & palette state.
 * ────────────────────────────────────────────────────────────────────
 * Opens on Ctrl+K / ⌘K.  Listens to 'command-palette:open' event.
 */

import { useState, useEffect, useCallback } from 'react'
import { bus } from '@/core/eventBus'

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, toggle, close])

  // Event bus integration
  useEffect(() => {
    const offOpen = bus.on('command-palette:open', open)
    const offClose = bus.on('command-palette:close', close)
    return () => { offOpen(); offClose() }
  }, [open, close])

  return { isOpen, open, close, toggle }
}
