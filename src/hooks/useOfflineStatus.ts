/**
 * useOfflineStatus — React hook exposing connectivity + pending sync count.
 * ─────────────────────────────────────────────────────────────────────────
 * Renders an indicator in the UI and integrates with the OfflineManager.
 */

import { useState, useEffect, useCallback } from 'react'
import { initConnectivityMonitor, getPendingOps } from '@/services/offlineManager'

export function useOfflineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const cleanup = initConnectivityMonitor()

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      cleanup()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Poll pending ops count
  const refreshPending = useCallback(async () => {
    try {
      const ops = await getPendingOps()
      setPendingCount(ops.length)
    } catch {
      // IndexedDB may not be available
    }
  }, [])

  useEffect(() => {
    refreshPending()
    const interval = setInterval(refreshPending, 10_000)
    return () => clearInterval(interval)
  }, [refreshPending])

  return { online, pendingCount, refreshPending }
}
