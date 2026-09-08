'use client'

import { Menu, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { navItems } from '@/lib/data'
import { LinkButton } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="fixed left-0 right-0 top-0 z-50 px-4 pt-4"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/12 bg-ink/65 px-4 py-3 shadow-premium backdrop-blur-2xl">
        <a href="#top" className="flex items-center gap-3 text-sm font-bold tracking-wide text-white">
          <span className="grid size-9 place-items-center rounded-full bg-white text-ink">
            <Sparkles className="size-4" />
          </span>
          PropIntel
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm font-medium text-white/68 transition hover:bg-white/10 hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LinkButton href="/login" variant="ghost">Sign in</LinkButton>
          <LinkButton href="/register">Start free</LinkButton>
        </div>

        <button className="grid size-10 place-items-center rounded-full bg-white/10 md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <div className={cn('mx-auto mt-3 hidden max-w-6xl rounded-3xl border border-white/12 bg-ink/90 p-4 backdrop-blur-xl md:hidden', open && 'block')}>
        <nav className="grid gap-2">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-medium text-white/72 hover:bg-white/10 hover:text-white">
              {item.label}
            </a>
          ))}
          <LinkButton href="/login" variant="secondary" className="mt-2">Sign in</LinkButton>
          <LinkButton href="/register">Start free</LinkButton>
        </nav>
      </div>
    </motion.header>
  )
}
