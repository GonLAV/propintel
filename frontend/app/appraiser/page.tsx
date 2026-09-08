'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppraiserIndexPage() {
  const router = useRouter()
  useEffect(() => {
    (async () => {
      const me = await fetch('/api/appraiser/auth/me').then((r) => r.json())
      router.replace(me.user ? '/appraiser/properties' : '/appraiser/login')
    })()
  }, [router])
  return null
}
