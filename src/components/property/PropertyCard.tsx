import { motion } from 'framer-motion'
import type { Property, Client } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/labels'
import { formatILSCompact } from '@/lib/format'

export function PropertyCard({
  property,
  client,
  onClick
}: {
  property: Property
  client?: Client
  onClick: () => void
}) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className="group cursor-pointer rounded-xl bg-card border border-border p-6 transition-all hover:shadow-card-hover hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative overflow-hidden"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="relative flex items-start justify-between mb-4">
        <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${STATUS_COLORS[property.status]}`}>
          {STATUS_LABELS[property.status]}
        </div>
        {property.valuationData && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">שווי משוער</div>
            <div className="text-2xl font-mono font-bold text-primary">
              {formatILSCompact(property.valuationData.estimatedValue)}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <h3 className="text-xl font-bold mb-2 text-right group-hover:text-primary transition-colors">{property.address.street}</h3>
        <p className="text-sm text-muted-foreground mb-4 text-right">
          {property.address.neighborhood && `${property.address.neighborhood}, `}
          {property.address.city}
        </p>

        <div className="flex gap-3 text-sm text-muted-foreground mb-4 justify-end font-mono" dir="rtl">
          <span className="bg-secondary/50 px-2 py-1 rounded-md">{property.details.rooms} חד׳</span>
          <span className="bg-secondary/50 px-2 py-1 rounded-md">{property.details.builtArea} מ״ר</span>
          <span className="bg-secondary/50 px-2 py-1 rounded-md">קומה {property.details.floor}</span>
        </div>

        {client && (
          <div className="text-xs text-muted-foreground text-right pt-4 border-t border-border/50">
            לקוח: <span className="text-foreground font-medium">{client.name}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
