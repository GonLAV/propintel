import { useState } from 'react'
import type { Client, Property } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { formatILSCompact } from '@/lib/format'
import { Envelope, Phone, BuildingOffice, TrendUp, CheckCircle, Users, Plus, PencilSimple, Trash } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { uid } from '@/lib/utils'

interface ClientManagerProps {
  clients: Client[]
  properties: Property[]
  onUpdateClients: (clients: Client[]) => void
  onSelectProperty: (property: Property) => void
}

const emptyClient = {
  name: '',
  email: '',
  phone: '',
  company: '',
  notes: '',
}

export function ClientManager({ clients, properties, onUpdateClients, onSelectProperty }: ClientManagerProps) {
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [draft, setDraft] = useState(emptyClient)
  const [visibleClientCount, setVisibleClientCount] = useState(24)

  const openCreate = () => {
    setEditingClient(null)
    setDraft(emptyClient)
    setIsDialogOpen(true)
  }

  const openEdit = (client: Client) => {
    setEditingClient(client)
    setDraft({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company || '',
      notes: client.notes,
    })
    setIsDialogOpen(true)
  }

  const saveClient = () => {
    if (!draft.name.trim() || !draft.email.trim() || !draft.phone.trim()) {
      toast.error('שם, אימייל וטלפון הם שדות חובה')
      return
    }
    const duplicateEmail = clients.some(
      client => client.id !== editingClient?.id && client.email.toLowerCase() === draft.email.trim().toLowerCase(),
    )
    if (duplicateEmail) {
      toast.error('כבר קיים לקוח עם כתובת אימייל זו')
      return
    }

    const next: Client = {
      id: editingClient?.id || uid('client'),
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      company: draft.company.trim() || undefined,
      notes: draft.notes.trim(),
      createdAt: editingClient?.createdAt || new Date().toISOString(),
      properties: editingClient?.properties || [],
    }
    onUpdateClients(editingClient
      ? clients.map(client => client.id === next.id ? next : client)
      : [...clients, next])
    setIsDialogOpen(false)
    toast.success(editingClient ? 'הלקוח עודכן' : 'הלקוח נוסף')
  }

  const deleteClient = (client: Client) => {
    if (properties.some(property => property.clientId === client.id)) {
      toast.error('לא ניתן למחוק לקוח המקושר לנכסים. יש להעביר או למחוק את הנכסים תחילה.')
      return
    }
    if (!window.confirm(`למחוק את ${client.name}?`)) return
    onUpdateClients(clients.filter(item => item.id !== client.id))
    toast.success('הלקוח נמחק')
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center justify-between gap-4">
        <Button className="gap-2" onClick={openCreate}>
          <Plus size={18} weight="bold" />
          הוסף לקוח
        </Button>
        <PageHeader title="ניהול לקוחות" description="כל הלקוחות והנכסים שלהם" />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users size={32} weight="duotone" />}
          title="אין לקוחות עדיין"
          description="הוסף את הלקוח הראשון שלך כדי להתחיל לנהל נכסים ושומות."
          action={
            <Button className="gap-2" onClick={openCreate}>
              <Plus size={18} weight="bold" />
              הוסף לקוח
            </Button>
          }
        />
      ) : (
      <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clients.slice(0, visibleClientCount).map((client, i) => {
          const clientProperties = properties.filter(p => p.clientId === client.id)
          const completedCount = clientProperties.filter(p => p.status === 'completed' || p.status === 'sent').length
          const totalValue = clientProperties.reduce((sum, p) => sum + (p.valuationData?.estimatedValue || 0), 0)
          
          return (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="glass-effect border-border/50 hover:scale-[1.02] transition-transform group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-2">
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 w-fit">
                        {clientProperties.length} נכסים
                      </Badge>
                      {completedCount > 0 && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30 w-fit">
                          <CheckCircle size={12} weight="fill" className="ml-1" />
                          {completedCount} הושלמו
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{client.name}</CardTitle>
                      {client.company && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                          <BuildingOffice size={14} weight="duotone" />
                          {client.company}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(client)} className="gap-1">
                      <PencilSimple size={15} />
                      עריכה
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteClient(client)} className="gap-1">
                      <Trash size={15} />
                      מחיקה
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm" dir="rtl">
                      <Envelope size={16} weight="duotone" className="text-primary" />
                      <a href={`mailto:${client.email}`} className="hover:text-primary transition-colors text-muted-foreground">
                        {client.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm" dir="rtl">
                      <Phone size={16} weight="duotone" className="text-accent" />
                      <a href={`tel:${client.phone}`} className="hover:text-accent transition-colors text-muted-foreground">
                        {client.phone}
                      </a>
                    </div>
                  </div>
                  
                  {totalValue > 0 && (
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <span className="text-xs text-muted-foreground">סך שווי נכסים</span>
                        <TrendUp size={14} weight="duotone" className="text-success" />
                      </div>
                      <div className="text-right text-xl font-mono font-bold bg-linear-to-r from-success to-accent bg-clip-text text-transparent">
                        {formatILSCompact(totalValue)}
                      </div>
                    </div>
                  )}
                  
                  {clientProperties.length > 0 && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 text-right">נכסים אחרונים</p>
                      <div className="space-y-1.5">
                        {clientProperties.slice(0, 3).map((property) => (
                          <motion.button
                            key={property.id}
                            onClick={() => onSelectProperty(property)}
                            className="w-full text-right p-2.5 rounded-lg hover:bg-secondary/50 transition-all text-sm border border-transparent hover:border-primary/20"
                            whileHover={{ x: -4 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="font-semibold text-foreground">{property.address.street}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 justify-end">
                              <span>{property.address.city}</span>
                              {property.valuationData && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-primary">
                                    {formatILSCompact(property.valuationData.estimatedValue)}
                                  </span>
                                </>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {client.notes && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-xs text-muted-foreground text-right italic leading-relaxed">
                        {client.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
      {visibleClientCount < clients.length && (
        <Button variant="outline" className="w-full" onClick={() => setVisibleClientCount(count => count + 24)}>
          טען עוד לקוחות ({clients.length - visibleClientCount} נותרו)
        </Button>
      )}
      </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'עריכת לקוח' : 'לקוח חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">שם *</Label>
              <Input id="client-name" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">אימייל *</Label>
              <Input id="client-email" type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">טלפון *</Label>
              <Input id="client-phone" type="tel" value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-company">חברה</Label>
              <Input id="client-company" value={draft.company} onChange={event => setDraft({ ...draft, company: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-notes">הערות</Label>
              <Textarea id="client-notes" value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ביטול</Button>
            <Button onClick={saveClient}>שמירה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
