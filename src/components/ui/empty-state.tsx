/**
 * EmptyState — A polished zero-state placeholder.
 *
 * Use whenever a list, table or panel has no data yet.
 * Supports an optional icon, title, description, and action button.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Phosphor icon or emoji rendered above the title */
  icon?: ReactNode
  /** Primary message — keep it short */
  title: string
  /** Optional supporting copy */
  description?: string
  /** Optional CTA button */
  action?: ReactNode
  /** Extra wrapper classes */
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-14 px-8 text-center',
        'rounded-2xl bg-black/[0.015] border border-dashed border-black/[0.06]',
        'dark:bg-white/[0.02] dark:border-white/[0.08]',
        className,
      )}
    >
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-[14px] text-black/40 leading-relaxed text-balance dark:text-white/45">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
