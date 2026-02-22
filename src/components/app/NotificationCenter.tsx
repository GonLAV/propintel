/**
 * NotificationCenter — Bell icon + dropdown showing platform notifications.
 */

import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCircle, Trash, Warning, WarningCircle, Info, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useNotifications, type Notification } from '@/core/notifications'

const LEVEL_ICON: Record<Notification['level'], typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: Warning,
  error: WarningCircle,
}

const LEVEL_COLOR: Record<Notification['level'], string> = {
  info: 'text-blue-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss, clearAll } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-lg"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`התראות${unreadCount > 0 ? ` (${unreadCount} חדשות)` : ''}`}
      >
        <Bell size={18} weight={unreadCount > 0 ? 'fill' : 'regular'} />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-2 w-80 bg-card border rounded-xl shadow-xl z-50',
            'animate-in fade-in-0 slide-in-from-top-2 duration-200',
          )}
          style={{ left: 0 }}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">התראות</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllAsRead}>
                  <Check size={12} /> סמן הכל כנקרא
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearAll} aria-label="נקה הכל">
                  <Trash size={14} />
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Bell size={28} className="mx-auto mb-2 opacity-30" weight="duotone" />
                אין התראות
              </div>
            ) : (
              <div className="py-1">
                {notifications.map(notif => {
                  const Icon = LEVEL_ICON[notif.level]
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors cursor-pointer',
                        !notif.read && 'bg-primary/5',
                      )}
                      onClick={() => markAsRead(notif.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') markAsRead(notif.id) }}
                    >
                      <Icon size={18} weight="fill" className={cn('shrink-0 mt-0.5', LEVEL_COLOR[notif.level])} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn('text-sm truncate', !notif.read && 'font-semibold')}>
                            {notif.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); dismiss(notif.id) }}
                            aria-label="מחק התראה"
                          >
                            <X size={10} />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                        <time className="text-[10px] text-muted-foreground/60 mt-1 block">
                          {new Date(notif.createdAt).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </time>
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
