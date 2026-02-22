import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Property, Client, Invoice, PricingTemplate } from '@/lib/types'
import { PricingEngine, DEFAULT_PRICING_TEMPLATES } from '@/lib/pricingEngine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { 
  Receipt, 
  CurrencyDollar, 
  TrendUp, 
  Warning, 
  CheckCircle,
  Clock,
  X,
  Download,
  Sparkle,
  FileText,
  Plus
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface BusinessManagementProps {
  properties: Property[]
  clients: Client[]
}

export function BusinessManagement({ properties, clients }: BusinessManagementProps) {
  const [invoices, setInvoices] = useKV<Invoice[]>('invoices', [])
  const [pricingTemplates] = useKV<PricingTemplate[]>('pricing-templates', DEFAULT_PRICING_TEMPLATES)
  const [activeTab, setActiveTab] = useState('invoices')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)

  const stats = {
    totalRevenue: (invoices || []).filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0),
    monthlyRevenue: PricingEngine.calculateMonthlyRevenue(invoices || []),
    outstanding: PricingEngine.calculateOutstanding(invoices || []),
    overdueCount: PricingEngine.getOverdueInvoices(invoices || []).length
  }

  const handleCreateInvoice = (propertyId: string, clientId: string) => {
    const property = properties.find(p => p.id === propertyId)
    if (!property) return

    const basePrice = PricingEngine.calculatePrice('residential-appraisal', property)
    
    const lineItems = [
      PricingEngine.createLineItem(
        `שומת נכס - ${property.address.street}, ${property.address.city}`,
        'residential-appraisal',
        1,
        basePrice
      )
    ]

    const newInvoice = PricingEngine.createInvoice(propertyId, clientId, lineItems, {
      paymentTerms: 'תשלום תוך 30 יום',
      dueInDays: 30
    })

    setInvoices((current) => [...(current || []), newInvoice])
    toast.success('חשבונית נוצרה בהצלחה')
    setSelectedInvoice(newInvoice)
  }

  const handleUpdateStatus = (invoice: Invoice, paidAmount: number) => {
    const updated = PricingEngine.updateInvoiceStatus(invoice, paidAmount)
    setInvoices((current) =>
      (current || []).map(inv => inv.id === invoice.id ? updated : inv)
    )
    toast.success('סטטוס החשבונית עודכן')
    setSelectedInvoice(updated)
  }

  const handleExportInvoice = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId)
    const property = properties.find(p => p.id === invoice.propertyId)
    
    const content = generateInvoiceHTML(invoice, client, property)
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${invoice.invoiceNumber}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('חשבונית יוצאה בהצלחה')
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-4xl font-bold tracking-tight mb-2 bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          ניהול עסקי
        </h2>
        <p className="text-muted-foreground">חשבוניות, תמחור והכנסות</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<CurrencyDollar size={28} weight="duotone" />}
          title="הכנסות חודש נוכחי"
          value={`₪${stats.monthlyRevenue.toLocaleString()}`}
          color="from-accent to-accent/70"
        />
        <StatCard
          icon={<TrendUp size={28} weight="duotone" />}
          title="סה״כ הכנסות"
          value={`₪${stats.totalRevenue.toLocaleString()}`}
          color="from-primary to-primary/70"
        />
        <StatCard
          icon={<Clock size={28} weight="duotone" />}
          title="חובות פתוחים"
          value={`₪${stats.outstanding.toLocaleString()}`}
          color="from-warning to-warning/70"
        />
        <StatCard
          icon={<Warning size={28} weight="duotone" />}
          title="חשבוניות באיחור"
          value={stats.overdueCount}
          color="from-destructive to-destructive/70"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="glass-effect">
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt size={18} weight="duotone" />
            חשבוניות
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <CurrencyDollar size={18} weight="duotone" />
            מחירון
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendUp size={18} weight="duotone" />
            ניתוח עסקי
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">חשבוניות</h3>
            <Dialog open={isCreatingInvoice} onOpenChange={setIsCreatingInvoice}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Plus size={18} weight="bold" />
                  חשבונית חדשה
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-border max-w-2xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">יצירת חשבונית חדשה</DialogTitle>
                </DialogHeader>
                <CreateInvoiceForm
                  properties={properties}
                  clients={clients}
                  pricingTemplates={pricingTemplates || []}
                  onSubmit={handleCreateInvoice}
                  onCancel={() => setIsCreatingInvoice(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {(invoices || []).length === 0 ? (
              <Card className="glass-effect border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Receipt size={64} weight="duotone" className="text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">אין חשבוניות עדיין</p>
                  <Button
                    onClick={() => setIsCreatingInvoice(true)}
                    className="mt-4 gap-2"
                    variant="outline"
                  >
                    <Plus size={18} />
                    צור חשבונית ראשונה
                  </Button>
                </CardContent>
              </Card>
            ) : (
              (invoices || [])
                .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
                .map(invoice => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    client={clients.find(c => c.id === invoice.clientId)}
                    property={properties.find(p => p.id === invoice.propertyId)}
                    onSelect={() => setSelectedInvoice(invoice)}
                    onExport={() => handleExportInvoice(invoice)}
                    onUpdateStatus={(amount) => handleUpdateStatus(invoice, amount)}
                  />
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <PricingTemplatesView templates={pricingTemplates || []} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <BusinessAnalytics invoices={invoices || []} properties={properties} />
        </TabsContent>
      </Tabs>

      {selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          client={clients.find(c => c.id === selectedInvoice.clientId)}
          property={properties.find(p => p.id === selectedInvoice.propertyId)}
          onClose={() => setSelectedInvoice(null)}
          onExport={() => handleExportInvoice(selectedInvoice)}
          onUpdateStatus={(amount) => handleUpdateStatus(selectedInvoice, amount)}
        />
      )}
    </div>
  )
}

function StatCard({ icon, title, value, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      <Card className="glass-effect border-border overflow-hidden">
        <div className={`absolute inset-0 bg-linear-to-br ${color} opacity-5`} />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl bg-linear-to-br ${color} bg-opacity-10`}>
              {icon}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold font-mono">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function InvoiceCard({ invoice, client, property, onSelect, onExport, onUpdateStatus: _onUpdateStatus }: any) {
  const statusConfig = {
    'draft': { label: 'טיוטה', color: 'bg-muted text-muted-foreground', icon: FileText },
    'sent': { label: 'נשלחה', color: 'bg-primary/10 text-primary border-primary/20', icon: Clock },
    'paid': { label: 'שולם', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
    'overdue': { label: 'באיחור', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Warning },
    'cancelled': { label: 'בוטלה', color: 'bg-muted text-muted-foreground', icon: X }
  }

  const config = statusConfig[invoice.status]
  const StatusIcon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="glass-effect border-border cursor-pointer" onClick={onSelect}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold font-mono">{invoice.invoiceNumber}</h3>
                <Badge className={`gap-1.5 ${config.color}`}>
                  <StatusIcon size={14} weight="fill" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{client?.name}</p>
              <p className="text-xs text-muted-foreground">{property?.address.street}, {property?.address.city}</p>
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold font-mono">₪{invoice.totalAmount.toLocaleString()}</p>
              {invoice.balance > 0 && invoice.status !== 'cancelled' && (
                <p className="text-sm text-warning">יתרה: ₪{invoice.balance.toLocaleString()}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>הונפקה: {new Date(invoice.issueDate).toLocaleDateString('he-IL')}</span>
              <span>תשלום עד: {new Date(invoice.dueDate).toLocaleDateString('he-IL')}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onExport()
                }}
              >
                <Download size={16} />
                ייצוא
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CreateInvoiceForm({ properties, clients, pricingTemplates: _pricingTemplates, onSubmit, onCancel }: any) {
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedClient, setSelectedClient] = useState('')

  const handleSubmit = () => {
    if (!selectedProperty || !selectedClient) {
      toast.error('יש לבחור נכס ולקוח')
      return
    }
    onSubmit(selectedProperty, selectedClient)
    onCancel()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>לקוח</Label>
        <Select value={selectedClient} onValueChange={setSelectedClient} dir="rtl">
          <SelectTrigger className="bg-secondary/50">
            <SelectValue placeholder="בחר לקוח" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {clients.map((client: Client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name} - {client.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>נכס</Label>
        <Select value={selectedProperty} onValueChange={setSelectedProperty} dir="rtl">
          <SelectTrigger className="bg-secondary/50">
            <SelectValue placeholder="בחר נכס" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {properties.map((property: Property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.address.street}, {property.address.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>ביטול</Button>
        <Button onClick={handleSubmit} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
          <Sparkle size={18} weight="fill" />
          צור חשבונית
        </Button>
      </DialogFooter>
    </div>
  )
}

function InvoiceDetailsDialog({ invoice, client, property, onClose, onExport, onUpdateStatus }: any) {
  const [paymentAmount, setPaymentAmount] = useState(invoice.balance.toString())

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-border max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono">{invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">לקוח</Label>
              <p className="font-semibold">{client?.name}</p>
              <p className="text-sm text-muted-foreground">{client?.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">נכס</Label>
              <p className="font-semibold">{property?.address.street}</p>
              <p className="text-sm text-muted-foreground">{property?.address.city}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-semibold mb-3">פריטים</h4>
            <div className="space-y-2">
              {invoice.lineItems.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">כמות: {item.quantity} × ₪{item.unitPrice.toLocaleString()}</p>
                  </div>
                  <p className="font-bold font-mono">₪{item.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>סכום ביניים</span>
              <span className="font-mono">₪{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>מע״מ ({(invoice.taxRate * 100)}%)</span>
              <span className="font-mono">₪{invoice.taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-border pt-2">
              <span>סה״כ לתשלום</span>
              <span className="font-mono">₪{invoice.totalAmount.toLocaleString()}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <>
                <div className="flex justify-between text-success">
                  <span>שולם</span>
                  <span className="font-mono">₪{invoice.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-warning font-semibold">
                  <span>יתרה</span>
                  <span className="font-mono">₪{invoice.balance.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <div className="border-t border-border pt-4">
              <Label className="mb-2 block">רישום תשלום</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="סכום"
                  className="bg-secondary/50"
                />
                <Button
                  onClick={() => {
                    onUpdateStatus(parseFloat(paymentAmount))
                    onClose()
                  }}
                  className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
                >
                  <CheckCircle size={18} weight="fill" />
                  רשום תשלום
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>סגור</Button>
          <Button onClick={onExport} className="gap-2">
            <Download size={18} />
            ייצוא חשבונית
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PricingTemplatesView({ templates }: { templates: PricingTemplate[] }) {
  return (
    <div className="grid gap-4">
      {templates.filter(t => t.isActive).map(template => (
        <Card key={template.id} className="glass-effect border-border">
          <CardHeader>
            <CardTitle>{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">מחיר בסיס</p>
                <p className="text-2xl font-bold font-mono">₪{template.basePrice.toLocaleString()}</p>
              </div>
              {template.pricePerSqm && (
                <div className="space-y-1 text-left">
                  <p className="text-sm text-muted-foreground">תוספת למ"ר</p>
                  <p className="text-xl font-semibold font-mono">₪{template.pricePerSqm.toLocaleString()}</p>
                </div>
              )}
              {template.minimumPrice && (
                <div className="space-y-1 text-left">
                  <p className="text-sm text-muted-foreground">מחיר מינימום</p>
                  <p className="text-lg font-mono">₪{template.minimumPrice.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function BusinessAnalytics({ invoices, properties: _properties }: { invoices: Invoice[]; properties: Property[] }) {
  const _monthlyData = calculateMonthlyData(invoices)
  const serviceBreakdown = calculateServiceBreakdown(invoices)

  return (
    <div className="space-y-6">
      <Card className="glass-effect border-border">
        <CardHeader>
          <CardTitle>סטטיסטיקות כלליות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-secondary/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">סה״כ חשבוניות</p>
              <p className="text-3xl font-bold font-mono">{invoices.length}</p>
            </div>
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">חשבוניות ששולמו</p>
              <p className="text-3xl font-bold font-mono text-success">
                {invoices.filter(i => i.status === 'paid').length}
              </p>
            </div>
            <div className="text-center p-4 bg-warning/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">ממתינות לתשלום</p>
              <p className="text-3xl font-bold font-mono text-warning">
                {invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-semibold mb-3">פילוח לפי סוג שירות</h4>
            <div className="space-y-2">
              {Object.entries(serviceBreakdown).map(([service, data]: any) => (
                <div key={service} className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                  <span className="text-sm">{service}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{data.count} שומות</span>
                    <span className="font-bold font-mono">₪{data.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function calculateMonthlyData(invoices: Invoice[]) {
  const data: Record<string, number> = {}
  invoices.forEach(inv => {
    const month = new Date(inv.issueDate).toLocaleDateString('he-IL', { month: 'short', year: 'numeric' })
    data[month] = (data[month] || 0) + inv.totalAmount
  })
  return data
}

function calculateServiceBreakdown(invoices: Invoice[]) {
  const breakdown: Record<string, { count: number; total: number }> = {}
  
  invoices.forEach(inv => {
    inv.lineItems.forEach(item => {
      const service = item.description
      if (!breakdown[service]) {
        breakdown[service] = { count: 0, total: 0 }
      }
      breakdown[service].count += 1
      breakdown[service].total += item.amount
    })
  })
  
  return breakdown
}

function generateInvoiceHTML(invoice: Invoice, client?: Client, _property?: Property): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>חשבונית ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
    .invoice { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #6366f1; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-block { padding: 15px; background: #f9fafb; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .totals { margin-top: 20px; text-align: left; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .grand-total { font-size: 24px; font-weight: bold; border-top: 2px solid #6366f1; padding-top: 15px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>חשבונית מס</h1>
      <p style="margin: 5px 0; font-size: 18px; font-weight: 600;">${invoice.invoiceNumber}</p>
    </div>
    
    <div class="info">
      <div class="info-block">
        <h3 style="margin-top: 0;">פרטי לקוח</h3>
        <p><strong>${client?.name || 'לקוח'}</strong></p>
        <p>${client?.email || ''}</p>
        <p>${client?.phone || ''}</p>
      </div>
      <div class="info-block">
        <h3 style="margin-top: 0;">פרטי חשבונית</h3>
        <p>תאריך הנפקה: ${new Date(invoice.issueDate).toLocaleDateString('he-IL')}</p>
        <p>תאריך תשלום: ${new Date(invoice.dueDate).toLocaleDateString('he-IL')}</p>
        <p>תנאי תשלום: ${invoice.paymentTerms}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>תיאור</th>
          <th>כמות</th>
          <th>מחיר ליחידה</th>
          <th>סכום</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>₪${item.unitPrice.toLocaleString()}</td>
            <td>₪${item.amount.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>סכום ביניים:</span>
        <span>₪${invoice.subtotal.toLocaleString()}</span>
      </div>
      <div class="total-row">
        <span>מע"מ (${(invoice.taxRate * 100)}%):</span>
        <span>₪${invoice.taxAmount.toLocaleString()}</span>
      </div>
      <div class="total-row grand-total">
        <span>סה"כ לתשלום:</span>
        <span>₪${invoice.totalAmount.toLocaleString()}</span>
      </div>
    </div>

    ${invoice.notes ? `<div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;"><strong>הערות:</strong><p>${invoice.notes}</p></div>` : ''}
  </div>
</body>
</html>
  `
}
