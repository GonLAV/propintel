'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Bell, BrainCircuit, Building2, Cog, FileText, LayoutDashboard, LogOut, MapPinned, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const sidebar = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard#assets', label: 'Assets', icon: Building2 },
  { href: '/dashboard#reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/planning', label: 'Planning', icon: MapPinned },
  { href: '/dashboard/deal-twin', label: 'Twin', icon: BrainCircuit },
  { href: '/dashboard#analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Cog },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    localStorage.removeItem('propintel.user')
    router.push('/login')
  }

  return (
    <main className="min-h-screen bg-ink pb-24 text-white lg:pb-0">
      <div className="premium-noise" />
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl lg:block">
          <Link href="/" className="flex items-center gap-3 text-sm font-bold">
            <span className="grid size-10 place-items-center rounded-full bg-white text-ink"><Sparkles className="size-4" /></span>
            PropIntel
          </Link>

          <nav className="mt-10 space-y-1">
            {sidebar.map((item) => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/56 transition hover:bg-white/10 hover:text-white', active && 'bg-white/12 text-white')}>
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-10 rounded-[1.5rem] border border-cyan/20 bg-cyan/10 p-4">
            <p className="text-sm font-semibold text-white">Scale plan</p>
            <p className="mt-2 text-xs leading-5 text-white/58">2,372 valuation runs left this month. API access enabled.</p>
          </div>

          <button onClick={signOut} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/56 transition hover:bg-white/10 hover:text-white">
            <LogOut className="size-4" />
            Sign out
          </button>
        </aside>

        <section className="relative p-4 md:p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan">Command center</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Real estate intelligence dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white/42 md:flex">
                <Search className="size-4" />
                Search assets, reports, teams
              </div>
              <button className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70">
                <Bell className="size-4" />
              </button>
              <button onClick={signOut} className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 lg:hidden" aria-label="Sign out">
                <LogOut className="size-4" />
              </button>
              <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-cyan to-mint text-sm font-bold text-ink">ML</div>
            </div>
          </header>

          {children}
        </section>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-7 gap-1 rounded-[1.25rem] border border-white/12 bg-ink/88 p-2 shadow-premium backdrop-blur-2xl lg:hidden">
        {sidebar.map((item) => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className={cn('flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium text-white/46 transition hover:bg-white/10 hover:text-white', active && 'bg-white/12 text-white')}>
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </main>
  )
}
