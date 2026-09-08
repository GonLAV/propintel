'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppraiserShell } from '@/components/appraiser/shell'
import { Card, Button, ErrorNote } from '@/components/appraiser/ui'
import { apiGet, PROPERTY_TYPES } from '@/lib/appraiser-client'

type Property = {
  id: string
  address: string
  city: string
  property_type: string
  area_sqm: string | null
  rooms: string | null
  created_at: string
}

export default function PropertiesPage() {
  const router = useRouter()
  const [items, setItems] = useState<Property[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userLabel, setUserLabel] = useState<string>('')

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/appraiser/auth/me').then((r) => r.json())
      if (!me.user) {
        router.push('/appraiser/login')
        return
      }
      setUserLabel(`${me.user.full_name || me.user.email} · ${me.tenant?.name || ''}`)
      try {
        const data = await apiGet<{ items: Property[] }>('/properties?pageSize=50')
        setItems(data.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת נכסים')
      }
    })()
  }, [router])

  return (
    <AppraiserShell userLabel={userLabel}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">נכסים</h1>
        <Link href="/appraiser/properties/new">
          <Button>+ נכס חדש</Button>
        </Link>
      </div>

      <ErrorNote message={error} />

      {items === null && !error && <p className="text-white/50">טוען…</p>}

      {items?.length === 0 && (
        <Card className="p-8 text-center text-white/60">
          עדיין אין נכסים. <Link href="/appraiser/properties/new" className="text-teal-300 hover:underline">הוסיפו את הראשון</Link>.
        </Card>
      )}

      <div className="grid gap-3">
        {items?.map((p) => (
          <Link key={p.id} href={`/appraiser/properties/${p.id}`}>
            <Card className="flex items-center justify-between p-4 transition hover:border-teal-300/40">
              <div>
                <div className="font-medium text-white">{p.address}</div>
                <div className="text-sm text-white/50">
                  {p.city} · {PROPERTY_TYPES[p.property_type] || p.property_type}
                  {p.area_sqm ? ` · ${p.area_sqm} מ״ר` : ''}
                </div>
              </div>
              <span className="text-teal-300">›</span>
            </Card>
          </Link>
        ))}
      </div>
    </AppraiserShell>
  )
}
