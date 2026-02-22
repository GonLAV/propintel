/**
 * Notification Store — Persistent in-app notification system.
 * ───────────────────────────────────────────────────────────
 * Listens to bus events and accumulates notifications.
 * Components use useNotifications() to read + dismiss.
 */

import { useEffect, useCallback, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { uid } from '@/lib/utils'
import { bus } from '@/core/eventBus'

export interface Notification {
  id: string
  title: string
  body: string
  level: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

const MAX_NOTIFICATIONS = 50

export function useNotifications() {
  const [notifications, setNotifications] = useKV<Notification[]>('platform:notifications', [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safe = notifications || []

  // ── Listen to bus ───────────────────────────────────────────────
  useEffect(() => {
    const off = bus.on('notification:new', ({ title, body, level }) => {
      const notif: Notification = {
        id: uid('notif'),
        title,
        body,
        level,
        read: false,
        createdAt: new Date().toISOString(),
      }
      setNotifications(prev => [notif, ...(prev || [])].slice(0, MAX_NOTIFICATIONS))
    })
    return off
  }, [setNotifications])

   
  const unreadCount = useMemo(
    () => safe.filter(n => !n.read).length,
    [safe],
  )

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications(prev =>
        (prev || []).map(n => n.id === id ? { ...n, read: true } : n)
      )
    },
    [setNotifications],
  )

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      (prev || []).map(n => ({ ...n, read: true }))
    )
  }, [setNotifications])

  const dismiss = useCallback(
    (id: string) => {
      setNotifications(prev => (prev || []).filter(n => n.id !== id))
    },
    [setNotifications],
  )

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [setNotifications])

  return {
    notifications: safe,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
  } as const
}
