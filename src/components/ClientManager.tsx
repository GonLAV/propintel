import type { Client, Property } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { formatILSCompact } from '@/lib/format'
import { Envelope, Phone, BuildingOffice, TrendUp, CheckCircle, Users, Plus } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface ClientManagerProps {
  clients: Client[]
  properties: Property[]
  onUpdateClients: (clients: Client[]) => void
  onSelectProperty: (property: Property) => void
}

export function ClientManager({ clients, properties, onSelectProperty }: ClientManagerProps) {
  if (clients.length === 0) {
    return (
      <div>
        <PageHeader title="ניהול לקוחות" description="כל הלקוחות והנכסים שלהם" />
        <EmptyState
          icon={<Users size={32} weight="duotone" />}
          title="אין לקוחות עדיין"
          description="הוסף את הלקוח הראשון שלך כדי להתחיל לנהל נכסים ושומות."
          action={
            <Button className="gap-2">
              <Plus size={18} weight="bold" />
              הוסף לקוח
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <PageHeader title="ניהול לקוחות" description="כל הלקוחות והנכסים שלהם" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client, i) => {
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
    </motion.div>
  )
}
