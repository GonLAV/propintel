/**
 * useNavigation — URL-based navigation with browser history support.
 * ──────────────────────────────────────────────────────────────────
 * Replaces the raw useState('dashboard') pattern in App.tsx.
 * Syncs the active view to the URL hash so users can:
 * - Bookmark specific views
 * - Use browser back/forward
 * - Share deep links
 *
 * URL format: /#/view-id
 */

import { useState, useEffect, useCallback } from 'react'
import { type ViewId, isViewId } from '@/lib/viewRegistry'

const DEFAULT_VIEW: ViewId = 'dashboard'

function getViewFromHash(): ViewId {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return isViewId(hash) ? hash : DEFAULT_VIEW
}

export function useNavigation() {
  const [activeView, setActiveViewState] = useState<ViewId>(getViewFromHash)

  const navigate = useCallback((view: ViewId) => {
    setActiveViewState(view)
    window.history.pushState(null, '', `#/${view}`)
  }, [])

  // Listen for browser back/forward
  useEffect(() => {
    const onPopState = () => {
      setActiveViewState(getViewFromHash())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return { activeView, navigate } as const
}
