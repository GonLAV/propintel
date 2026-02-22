/**
 * Activity Service — Automatic audit trail from event bus.
 * ─────────────────────────────────────────────────────────
 * Listens to bus events and writes a persistent activity log.
 * Components use useActivityLog() to display recent activity.
 */

import { useEffect, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { uid } from '@/lib/utils'
import { bus } from '@/core/eventBus'

export interface ActivityEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  target: string
  details?: Record<string, unknown>
}

const MAX_ENTRIES = 200

export function useActivityLog() {
  const [entries, setEntries] = useKV<ActivityEntry[]>('platform:activity', [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safe = entries || []

  // ── Auto-record audit events ────────────────────────────────────
  useEffect(() => {
    const off = bus.on('audit:action', ({ actor, action, target, details }) => {
      const entry: ActivityEntry = {
        id: uid('act'),
        timestamp: new Date().toISOString(),
        actor,
        action,
        target,
        details,
      }
      setEntries(prev => [entry, ...(prev || [])].slice(0, MAX_ENTRIES))
    })
    return off
  }, [setEntries])

  // ── Also log valuation events ───────────────────────────────────
  useEffect(() => {
    const offStarted = bus.on('valuation:started', ({ propertyId, method }) => {
      bus.emit('audit:action', {
        actor: 'system',
        action: 'valuation-started',
        target: `property:${propertyId}`,
        details: { method },
      })
    })
    const offCompleted = bus.on('valuation:completed', ({ propertyId, estimatedValue, confidence }) => {
      bus.emit('audit:action', {
        actor: 'system',
        action: 'valuation-completed',
        target: `property:${propertyId}`,
        details: { estimatedValue, confidence },
      })
    })
    return () => { offStarted(); offCompleted() }
  }, [])

  // ── Also log navigation ─────────────────────────────────────────
  useEffect(() => {
    const off = bus.on('nav:navigate', (viewId) => {
      bus.emit('audit:action', {
        actor: 'user',
        action: 'navigate',
        target: viewId,
      })
    })
    return off
  }, [])

   
  const recent = useMemo(() => safe.slice(0, 20), [safe])

  return {
    entries: safe,
    recent,
  } as const
}
