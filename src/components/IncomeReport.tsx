/* eslint no-unexpected-multiline: off */
import { useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { DownloadSimple, CurrencyDollar, CalendarBlank, Plus } from '@phosphor-icons/react'
import { uid } from '@/lib/utils'

type IncomeType = 'invoice' | 'payment' | 'refund'

interface IncomeRecord {
  id: string
  type: IncomeType
  amount: number
  date: string
  clientName?: string
  projectName?: string
}

function formatILS(value: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(value)
}

export function IncomeReport() {
  const [records, setRecords] = useKV<IncomeRecord[]>('income-records', [])
  const [type, setType] = useState<IncomeType>('invoice')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState('')

  const totals = useMemo(() => {
    const list = records || []
    const income = list.filter(r => r.type !== 'refund').reduce((sum, r) => sum + r.amount, 0)
    const refunds = list.filter(r => r.type === 'refund').reduce((sum, r) => sum + r.amount, 0)
    const net = income - refunds
    return { income, refunds, net }
  }, [records])

  const monthly = useMemo(() => {
    const map = new Map<string, number>()
    const listForMonthly = records || []
    listForMonthly.forEach(r => {
      const key = r.date.slice(0,7)
      map.set(key, (map.get(key) || 0) + (r.type === 'refund' ? -r.amount : r.amount))
    })
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0]))
  }, [records])

  const addRecord = () => {
    const value = parseFloat(amount)
    if (!value || value <= 0) return
    const item: IncomeRecord = {
      id: uid('income'),
      type,
      amount: value,
      date,
      clientName: clientName || undefined,
      projectName: projectName || undefined
    }
    setRecords((cur) => [ ...(cur || []), item ])
    setAmount('')
  }

  const exportCSV = () => {
    const header = ['id','type','amount','date','client','project','note']
    const body = (records || []).map(r => [r.id, r.type, r.amount.toString(), r.date, r.clientName || '', r.projectName || '', ''])
    const rows = [header, ...body]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'income-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <CurrencyDollar className="w-6 h-6 text-primary" weight="duotone" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">דוח הכנסות</h1>
          <p className="text-muted-foreground">רישום הכנסות/תשלומים ויצוא CSV מהיר</p>
        </div>
      </div>

      {/* Add record */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-2">
            <Label>סוג</Label>
            <div className="flex gap-2 flex-wrap">
              {(['invoice','payment','refund'] as IncomeType[]).map(t => (
                <Button key={t} variant={t === type ? 'default' : 'outline'} size="sm" onClick={() => setType(t)}>
                  {t === 'invoice' ? 'חשבונית' : t === 'payment' ? 'תשלום' : 'החזר'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">סכום (₪)</Label>
            <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">תאריך</Label>
            <div className="relative">
              <CalendarBlank className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pr-9" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">לקוח (אופציונלי)</Label>
            <Input id="client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">פרויקט (אופציונלי)</Label>
            <Input id="project" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Button onClick={addRecord}>
            <Plus className="w-4 h-4 ml-2" /> הוסף רשומה
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <DownloadSimple className="w-4 h-4 ml-2" /> יצוא CSV
          </Button>
        </div>
      </Card>

      {/* Totals */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-card border">
            <p className="text-sm text-muted-foreground">סה"כ הכנסות</p>
            <p className="text-2xl font-bold">{formatILS(totals.income)}</p>
          </div>
          <div className="p-4 rounded-lg bg-card border">
            <p className="text-sm text-muted-foreground">סה"כ החזרים</p>
            <p className="text-2xl font-bold">{formatILS(totals.refunds)}</p>
          </div>
          <div className="p-4 rounded-lg bg-card border">
            <p className="text-sm text-muted-foreground">נטו</p>
            <p className="text-2xl font-bold">{formatILS(totals.net)}</p>
          </div>
        </div>
      </Card>

      {/* Monthly */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">התפלגות חודשית</h3>
        <div className="space-y-2">
          {monthly.length === 0 ? (
            <div className="text-muted-foreground">אין נתונים</div>
          ) : (
            monthly.map(([month, sum]) => (
              <div key={month} className="flex items-center justify-between p-2 rounded border bg-card">
                <span>{month}</span>
                <Badge variant="secondary">{formatILS(sum)}</Badge>
              </div>
            ))
          )}
        </div>
        <Separator className="my-4" />
        <h3 className="text-lg font-semibold mb-2">רשומות</h3>
        {(records || []).length === 0 ? (
          <div className="text-muted-foreground">אין רשומות</div>
        ) : (
          <div className="space-y-2">
            {(records || []).map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded border bg-card">
                <div className="flex items-center gap-3">
                  <Badge variant={r.type === 'refund' ? 'destructive' : 'secondary'}>
                    {r.type === 'invoice' ? 'חשבונית' : r.type === 'payment' ? 'תשלום' : 'החזר'}
                  </Badge>
                  <span className="font-mono">{formatILS(r.type === 'refund' ? -r.amount : r.amount)}</span>
                  <span className="text-muted-foreground text-sm">{r.date}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {[r.clientName, r.projectName].filter(Boolean).join(' • ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default IncomeReport
