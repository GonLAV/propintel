'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppraiserShell } from '@/components/appraiser/shell'
import { Card, ErrorNote } from '@/components/appraiser/ui'
import { apiGet, formatILS, VALUATION_METHODS } from '@/lib/appraiser-client'

type Report = {
  id: string
  title: string
  format: string
  created_at: string
  property: { id: string; address: string; city: string } | null
  valuation_summary: { method: string; estimatedValue: number | null; currency: string } | null
}

export default function ReportsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Report[] | null>(null)
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
        const data = await apiGet<{ items: Report[] }>('/reports?pageSize=100')
        setItems(data.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'שגיאה בטעינת הדוחות')
      }
    })()
  }, [router])

  return (
    <AppraiserShell userLabel={userLabel}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">דוחות</h1>
        <p className="mt-1 text-white/50">כל הדוחות שהופקו, מכל התיקים.</p>
      </div>

      <ErrorNote message={error} />

      {items === null && !error && <p className="text-white/50">טוען…</p>}

      {items?.length === 0 && (
        <Card className="p-8 text-center text-white/60">
          עדיין לא הופק אף דוח. אפשר להפיק דוח מתוך עמוד נכס, אחרי חישוב שומה.
        </Card>
      )}

      <div className="grid gap-3">
        {items?.map((r) => (
          <Card key={r.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium text-white">{r.title}</div>
              <div className="mt-1 text-sm text-white/50">
                {r.property ? (
                  <Link href={`/appraiser/properties/${r.property.id}`} className="hover:text-teal-300 hover:underline">
                    {r.property.address}, {r.property.city}
                  </Link>
                ) : (
                  'נכס לא ידוע'
                )}
                {r.valuation_summary && (
                  <>
                    {' · '}
                    {VALUATION_METHODS[r.valuation_summary.method] || r.valuation_summary.method}
                    {' · '}
                    {formatILS(r.valuation_summary.estimatedValue)}
                  </>
                )}
              </div>
              <div className="mt-1 text-xs text-white/35">
                {new Date(r.created_at).toLocaleDateString('he-IL')} · {r.format.toUpperCase()}
              </div>
            </div>
            {r.format === 'pdf' ? (
              <a
                href={`/api/appraiser/reports/${r.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                פתיחת PDF
              </a>
            ) : (
              <span className="text-xs text-white/30">אין PDF</span>
            )}
          </Card>
        ))}
      </div>
    </AppraiserShell>
  )
}
