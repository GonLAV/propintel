'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { postJSON } from '@/lib/api-client'

type AuthMode = 'login' | 'register'

type AuthResponse = {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState(mode === 'login' ? 'demo@propintel.com' : '')
  const [password, setPassword] = useState(mode === 'login' ? 'DemoPass123' : '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const result = await postJSON<AuthResponse>(`/api/auth/${mode}`, { name, email, password })

    setLoading(false)
    if (!result.ok || !result.data) {
      setError(result.error || 'Authentication failed')
      return
    }

    localStorage.setItem('propintel.user', JSON.stringify(result.data.user))
    const nextPath = new URLSearchParams(window.location.search).get('next')
    router.push(nextPath?.startsWith('/') ? nextPath : '/dashboard')
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-12">
      <div className="premium-noise" />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55 }} className="w-full max-w-md">
        <a href="/" className="mx-auto mb-8 flex w-max items-center gap-3 text-sm font-bold text-white">
          <span className="grid size-10 place-items-center rounded-full bg-white text-ink"><Sparkles className="size-4" /></span>
          PropIntel
        </a>

        <Card className="p-6 sm:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan">{isRegister ? 'Create workspace' : 'Welcome back'}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{isRegister ? 'Launch your premium valuation room.' : 'Sign in to your command center.'}</h1>
            <p className="mt-3 text-sm leading-6 text-white/56">{isRegister ? 'Set up a secure JWT session and start with mock data until the production API is connected.' : 'Use demo@propintel.com and DemoPass123 to explore instantly.'}</p>
          </div>

          <form className="mt-7 space-y-4" onSubmit={submit}>
            {isRegister && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white/68">Full name</span>
                <span className="flex h-12 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-4 focus-within:border-cyan/60">
                  <UserRound className="size-4 text-white/40" />
                  <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/32" value={name} onChange={(event) => setName(event.target.value)} placeholder="Maya Levin" required />
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/68">Email</span>
              <span className="flex h-12 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-4 focus-within:border-cyan/60">
                <Mail className="size-4 text-white/40" />
                <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/32" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@company.com" required />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/68">Password</span>
              <span className="flex h-12 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-4 focus-within:border-cyan/60">
                <LockKeyhole className="size-4 text-white/40" />
                <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/32" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Minimum 8 characters" required minLength={8} />
                <Eye className="size-4 text-white/30" />
              </span>
            </label>

            {error && <p className="rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">{error}</p>}

            <Button className="h-12 w-full" disabled={loading} type="submit">
              {loading ? 'Working...' : isRegister ? 'Create account' : 'Sign in'}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-white/50">
            {isRegister ? 'Already have an account?' : 'New to PropIntel?'}{' '}
            <a className="font-semibold text-white hover:text-cyan" href={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign in' : 'Create one'}
            </a>
          </div>
        </Card>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <LinkButton href="/" variant="secondary">Landing</LinkButton>
          <LinkButton href="/dashboard" variant="secondary">Dashboard preview</LinkButton>
        </div>
      </motion.div>
    </main>
  )
}
