import { motion } from 'framer-motion'
import type { Client, Property } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Buildings } from '@phosphor-icons/react'
import { PropertyDetail } from '@/components/PropertyDetail'
import { PropertyForm } from '@/components/PropertyForm'
import { PropertyCard } from '@/components/property/PropertyCard'

export function PropertiesTab({
  properties,
  clients,
  selectedProperty,
  isCreatingProperty,
  onSelectProperty,
  onCreateNew,
  onBackToList,
  onStartEditing,
  onSaveProperty,
  onDeleteProperty
}: {
  properties: Property[]
  clients: Client[]
  selectedProperty: Property | null
  isCreatingProperty: boolean
  onSelectProperty: (property: Property) => void
  onCreateNew: () => void
  onBackToList: () => void
  onStartEditing: (property: Property) => void
  onSaveProperty: (property: Property) => void
  onDeleteProperty: (id: string) => void
}) {
  if (selectedProperty || isCreatingProperty) {
    if (selectedProperty && !isCreatingProperty) {
      return (
        <PropertyDetail
          property={selectedProperty}
          clients={clients}
          allProperties={properties}
          onBack={onBackToList}
          onEdit={onStartEditing}
          onSave={onSaveProperty}
          onDelete={onDeleteProperty}
        />
      )
    }

    return (
      <PropertyForm
        property={selectedProperty}
        clients={clients}
        onSave={onSaveProperty}
        onCancel={onBackToList}
      />
    )
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <PageHeader
        title="כל הנכסים"
        description={properties.length > 0 ? `${properties.length} נכסים במערכת` : undefined}
        actions={
          <Button onClick={onCreateNew} className="gap-2">
            <Plus size={18} weight="bold" />
            נכס חדש
          </Button>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          icon={<Buildings size={36} weight="duotone" />}
          title="אין נכסים עדיין"
          description="הוסף את הנכס הראשון שלך כדי להתחיל בתהליך השמאות"
          action={
            <Button onClick={onCreateNew} className="gap-2">
              <Plus size={18} weight="bold" />
              הוסף נכס ראשון
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property, i) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <PropertyCard
                property={property}
                client={clients.find(c => c.id === property.clientId)}
                onClick={() => onSelectProperty(property)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
