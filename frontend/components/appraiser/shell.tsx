'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export function AppraiserShell({ children, userLabel }: { children: ReactNode; userLabel?: string }) {
  const router = useRouter()

  async function signOut() {
    await fetch('/api/appraiser/auth/logout', { method: 'POST' })
    router.push('/appraiser/login')
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/appraiser/properties" className="text-lg font-semibold text-white">
          PropIntel <span className="text-teal-300">לשמאים</span>
        </Link>
        {userLabel && (
          <div className="flex items-center gap-3 text-sm text-white/60">
            <span>{userLabel}</span>
            <button onClick={signOut} className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/10">
              יציאה
            </button>
          </div>
        )}
      </header>
      {children}
    </div>
  )
}
