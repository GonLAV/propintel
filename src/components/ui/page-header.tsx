/**
 * PageHeader — Consistent top-of-page header for every tab/view.
 *
 * Provides a uniform layout with title, optional subtitle, and actions slot.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Page title */
  title: string
  /** Subtitle or description */
  description?: string
  /** Optional icon displayed before the title */
  icon?: ReactNode
  /** Right-aligned actions (buttons, etc.) */
  actions?: ReactNode
  /** Optional breadcrumb or back button above the title */
  breadcrumb?: ReactNode
  /** Extra wrapper classes */
  className?: string
}

export function PageHeader({ title, description, icon, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-7', className)}>
      {breadcrumb && <div className="mb-3">{breadcrumb}</div>}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex items-start gap-4">
          {icon && (
            <div className="mt-1 shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-[#1d1d1f] sm:text-[2.25rem] leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-black/45">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
