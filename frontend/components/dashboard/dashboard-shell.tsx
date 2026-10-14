'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Bell, BrainCircuit, Building2, Cog, FileText, LayoutDashboard, LogOut, MapPinned, Search, Sparkles } from 'lucide-react'
import { logoutSession } from '@/lib/api-client'
import { isDashboardNavActive } from '@/lib/navigation'
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
  const [hash, setHash] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash)
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    setHash(window.location.hash)
  }, [pathname])

  async function signOut() {
    setSigningOut(true)
    setSignOutError(null)
    const result = await logoutSession()
    setSigningOut(false)

    if (!result.ok) {
      setSignOutError(result.error || 'Sign out failed. Your session is still active.')
      return
    }

    localStorage.removeItem('propintel.user')
    router.replace('/login')
    router.refresh()
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = searchQuery.trim().toLowerCase()
    if (!normalized) return

    const match = sidebar.find((item) => item.label.toLowerCase().includes(normalized))
    if (match) {
      router.push(match.href)
      setSearchQuery('')
      setSearchStatus(`Opening ${match.label}.`)
      return
    }

    setSearchStatus('No matching dashboard section was found.')
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-ink pb-40 text-white lg:pb-0">
      <div className="premium-noise" />
      <div className="grid min-h-screen min-w-0 lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl lg:block">
          <Link href="/" className="flex items-center gap-3 text-sm font-bold">
            <span className="grid size-10 place-items-center rounded-full bg-white text-ink"><Sparkles className="size-4" /></span>
            PropIntel
          </Link>

          <nav className="mt-10 space-y-1">
            {sidebar.map((item) => {
              const active = isDashboardNavActive(item.href, pathname, hash)
              return (
                <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/56 transition hover:bg-white/10 hover:text-white', active && 'bg-white/12 text-white')}>
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-10 rounded-[1.5rem] border border-cyan/20 bg-cyan/10 p-4">
            <p className="text-sm font-semibold text-white">Demo allowance</p>
            <p className="mt-2 text-xs leading-5 text-white/58">Illustrative usage: 2,372 valuation runs remaining. Protected demo APIs are enabled.</p>
          </div>

          <button onClick={signOut} disabled={signingOut} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/56 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60">
            <LogOut className="size-4" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </aside>

        <section className="relative min-w-0 overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-2xl md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan">Command center</p>
              <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight md:text-3xl">Real estate intelligence dashboard</h1>
              <p className="mt-2 text-xs font-semibold text-amber">Demo workspace — all portfolio records, metrics, alerts, and activity are illustrative fixtures.</p>
            </div>
            <div className="relative flex min-w-0 flex-wrap items-center gap-2">
              <form onSubmit={submitSearch} className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-sm text-white md:w-64 md:flex-none">
                <label htmlFor="dashboard-search" className="sr-only">Search dashboard sections</label>
                <input
                  id="dashboard-search"
                  name="dashboard-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  list="dashboard-search-options"
                  placeholder="Search sections"
                  autoComplete="off"
                  spellCheck="false"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/42"
                />
                <datalist id="dashboard-search-options">
                  {sidebar.map((item) => <option key={item.href} value={item.label} />)}
                </datalist>
                <button type="submit" className="rounded-full p-1 text-white/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan/60" aria-label="Open matching dashboard section">
                  <Search className="size-4" />
                </button>
              </form>
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70"
                aria-label={notificationsOpen ? 'Close demo notifications' : 'Open demo notifications'}
                aria-expanded={notificationsOpen}
              >
                <Bell className="size-4" />
              </button>
              <button onClick={signOut} disabled={signingOut} className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 disabled:cursor-wait disabled:opacity-60 lg:hidden" aria-label={signingOut ? 'Signing out' : 'Sign out'}>
                <LogOut className="size-4" />
              </button>
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan to-mint text-sm font-bold text-ink" aria-label="Demo owner profile">PO</div>
              {notificationsOpen ? (
                <div className="absolute right-0 top-14 z-30 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/12 bg-ink p-4 shadow-premium" role="region" aria-label="Demo notifications">
                  <p className="text-sm font-semibold text-white">Demo notifications</p>
                  <p className="mt-1 text-xs text-amber">Illustrative only; no live notification service is connected.</p>
                  <ul className="mt-3 space-y-2 text-sm text-white/60">
                    <li className="rounded-xl bg-white/[0.05] p-3">Example: valuation confidence requires review.</li>
                    <li className="rounded-xl bg-white/[0.05] p-3">Example: planning fixture comparison completed.</li>
                  </ul>
                </div>
              ) : null}
            </div>
          </header>

          <p className="sr-only" role="status" aria-live="polite">{searchStatus}</p>
          <div aria-live="assertive" aria-atomic="true">
            {signOutError ? <p role="alert" className="mb-4 rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">{signOutError}</p> : null}
          </div>

          {children}
        </section>
      </div>

      <nav className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-4 gap-1 rounded-[1.25rem] border border-white/12 bg-ink/88 p-2 shadow-premium backdrop-blur-2xl sm:inset-x-3 sm:bottom-3 lg:hidden" aria-label="Dashboard navigation">
        {sidebar.map((item) => {
          const active = isDashboardNavActive(item.href, pathname, hash)
          return (
            <Link key={item.href} href={item.href} className={cn('flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium text-white/46 transition hover:bg-white/10 hover:text-white', active && 'bg-white/12 text-white')} aria-current={active ? 'page' : undefined}>
              <item.icon className="size-4" />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </main>
  )
}
