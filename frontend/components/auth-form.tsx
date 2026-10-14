'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { postJSON } from '@/lib/api-client'
import { getSafeInternalPath } from '@/lib/navigation'

type AuthResponse = {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export function AuthForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const result = await postJSON<AuthResponse>('/api/auth/login', { email, password })

    setLoading(false)
    if (!result.ok || !result.data) {
      setError(result.error || 'Authentication failed')
      return
    }

    const nextPath = new URLSearchParams(window.location.search).get('next')
    router.push(getSafeInternalPath(nextPath, window.location.origin))
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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan">Welcome back</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Sign in to your command center.</h1>
            <p className="mt-3 text-sm leading-6 text-white/56">Sign in with the owner account configured by your administrator. Public registration is not available.</p>
          </div>

          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/68">Email</span>
              <span className="flex h-12 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-4 focus-within:border-cyan/60">
                <Mail className="size-4 text-white/40" />
                <input
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/32"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  spellCheck="false"
                  aria-invalid={Boolean(error)}
                  placeholder="you@company.com"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/68">Password</span>
              <span className="flex h-12 items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] px-4 focus-within:border-cyan/60">
                <LockKeyhole className="size-4 text-white/40" />
                <input
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/32"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  spellCheck="false"
                  aria-invalid={Boolean(error)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="rounded-full p-1 text-white/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan/60"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <Eye className="size-4" />
                </button>
              </span>
            </label>

            <div aria-live="polite" aria-atomic="true">
              {error && <p role="alert" className="rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">{error}</p>}
            </div>

            <Button className="h-12 w-full" disabled={loading} type="submit">
              {loading ? 'Signing in…' : 'Sign in'}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-white/50">
            Accounts and roles are managed by the deployment administrator.
          </div>
        </Card>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <LinkButton href="/" variant="secondary">Landing</LinkButton>
          <LinkButton href="/dashboard" variant="secondary">Open dashboard</LinkButton>
        </div>
      </motion.div>
    </main>
  )
}
