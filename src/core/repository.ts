/**
 * Repository — Typed CRUD layer over Spark KV with change tracking.
 * ──────────────────────────────────────────────────────────────────
 * Wraps `useKV` into a consistent data-access pattern so every module
 * gets create / read / update / delete / list with automatic audit events.
 *
 * Usage:
 *   const { items, create, update, remove, findById } = useRepository<Property>('properties')
 */

import { useCallback, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { uid } from '@/lib/utils'
import { bus } from '@/core/eventBus'

export interface Entity {
  id: string
  createdAt?: string
  updatedAt?: string
}

export interface RepositoryOptions<T extends Entity> {
  /** KV key (e.g. 'properties') */
  key: string
  /** Default value when store is empty */
  defaults?: T[]
  /** Event prefix for bus (e.g. 'property' → 'property:created') */
  eventPrefix?: string
}

export function useRepository<T extends Entity>(
  key: string,
  defaults: T[] = [],
  eventPrefix?: string,
) {
  const [items, setItems] = useKV<T[]>(key, defaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safeItems = items || []

  // ── O(1) lookup map ─────────────────────────────────────────────
   
  const itemMap = useMemo(
    () => new Map(safeItems.map(item => [item.id, item])),
    [safeItems],
  )

  // ── Read ────────────────────────────────────────────────────────
  const findById = useCallback(
    (id: string): T | undefined => itemMap.get(id),
    [itemMap],
  )

  // ── Create ──────────────────────────────────────────────────────
  const create = useCallback(
    (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'id'>>) => {
      const now = new Date().toISOString()
      const entity = {
        ...data,
        id: (data as Record<string, unknown>).id as string || uid(eventPrefix || key),
        createdAt: now,
        updatedAt: now,
      } as T

      setItems(current => [...(current || []), entity])

      if (eventPrefix) {
        bus.emit('audit:action', {
          actor: 'user',
          action: 'create',
          target: `${eventPrefix}:${entity.id}`,
        })
      }

      return entity
    },
    [setItems, key, eventPrefix],
  )

  // ── Update ──────────────────────────────────────────────────────
  const update = useCallback(
    (id: string, changes: Partial<T>) => {
      setItems(current => {
        const arr = current || []
        const idx = arr.findIndex(item => item.id === id)
        if (idx < 0) return arr

        const updated = {
          ...arr[idx],
          ...changes,
          id, // prevent id overwrite
          updatedAt: new Date().toISOString(),
        }
        const next = [...arr]
        next[idx] = updated

        if (eventPrefix) {
          bus.emit('audit:action', {
            actor: 'user',
            action: 'update',
            target: `${eventPrefix}:${id}`,
            details: changes as Record<string, unknown>,
          })
        }

        return next
      })
    },
    [setItems, eventPrefix],
  )

  // ── Upsert (create or update) ───────────────────────────────────
  const upsert = useCallback(
    (entity: T) => {
      setItems(current => {
        const arr = current || []
        const idx = arr.findIndex(item => item.id === entity.id)
        const now = new Date().toISOString()

        if (idx >= 0) {
          const next = [...arr]
          next[idx] = { ...entity, updatedAt: now }
          return next
        }

        return [...arr, { ...entity, createdAt: now, updatedAt: now }]
      })
    },
    [setItems],
  )

  // ── Delete ──────────────────────────────────────────────────────
  const remove = useCallback(
    (id: string) => {
      setItems(current => (current || []).filter(item => item.id !== id))

      if (eventPrefix) {
        bus.emit('audit:action', {
          actor: 'user',
          action: 'delete',
          target: `${eventPrefix}:${id}`,
        })
      }
    },
    [setItems, eventPrefix],
  )

  // ── Filter helper ───────────────────────────────────────────────
   
  const filter = useCallback(
    (predicate: (item: T) => boolean): T[] => safeItems.filter(predicate),
    [safeItems],
  )

  return {
    items: safeItems,
    itemMap,
    findById,
    create,
    update,
    upsert,
    remove,
    filter,
    setItems,
  } as const
}
