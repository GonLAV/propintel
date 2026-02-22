/**
 * EventBus — Typed publish / subscribe for cross-module communication.
 * ────────────────────────────────────────────────────────────────────
 * Modules emit domain events; other modules react without tight coupling.
 *
 * Usage:
 *   bus.emit('property:created', property)
 *   const off = bus.on('property:created', (p) => { ... })
 *   off()  // unsubscribe
 */

import type { Property, Client, Case } from '@/lib/types'
import type { ViewId } from '@/lib/viewRegistry'

// ── Domain event map ──────────────────────────────────────────────
export interface PlatformEvents {
  // Navigation
  'nav:navigate': ViewId
  'nav:back': void

  // Property lifecycle
  'property:created': Property
  'property:updated': Property
  'property:deleted': string           // id
  'property:selected': Property

  // Client lifecycle
  'client:created': Client
  'client:updated': Client
  'client:deleted': string

  // Case lifecycle
  'case:created': Case
  'case:updated': Case
  'case:statusChanged': { caseId: string; from: string; to: string }

  // Valuation events
  'valuation:started': { propertyId: string; method: string }
  'valuation:completed': { propertyId: string; estimatedValue: number; confidence: number }
  'valuation:failed': { propertyId: string; error: string }

  // Data events
  'data:synced': { source: string; count: number }
  'data:importCompleted': { type: string; count: number; errors: number }

  // AI events
  'ai:insightGenerated': { module: string; summary: string }
  'ai:reportReady': { reportId: string; title: string }

  // UI events
  'command-palette:open': void
  'command-palette:close': void
  'notification:new': { title: string; body: string; level: 'info' | 'success' | 'warning' | 'error' }

  // Audit
  'audit:action': { actor: string; action: string; target: string; details?: Record<string, unknown> }
}

// ── Listener types ────────────────────────────────────────────────
type Listener<T> = (payload: T) => void
type Unsubscribe = () => void

// ── Bus implementation ────────────────────────────────────────────
class EventBusImpl {
  private listeners = new Map<string, Set<Listener<unknown>>>()

  on<K extends keyof PlatformEvents>(
    event: K,
    listener: Listener<PlatformEvents[K]>,
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const set = this.listeners.get(event)!
    set.add(listener as Listener<unknown>)

    return () => {
      set.delete(listener as Listener<unknown>)
      if (set.size === 0) this.listeners.delete(event)
    }
  }

  /** Subscribe, auto-unsub after first call */
  once<K extends keyof PlatformEvents>(
    event: K,
    listener: Listener<PlatformEvents[K]>,
  ): Unsubscribe {
    const off = this.on(event, (payload) => {
      off()
      listener(payload)
    })
    return off
  }

  emit<K extends keyof PlatformEvents>(
    event: K,
    ...[payload]: PlatformEvents[K] extends void ? [] : [PlatformEvents[K]]
  ): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const fn of set) {
      try {
        fn(payload as unknown)
      } catch {
        // swallow — listeners must not break the emitter
      }
    }
  }

  /** Remove all listeners (useful for tests / HMR) */
  clear(): void {
    this.listeners.clear()
  }
}

/** Singleton event bus */
export const bus = new EventBusImpl()
