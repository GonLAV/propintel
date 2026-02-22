import { useState } from 'react'
import type { Property, Client, PropertyType, PropertyCondition } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowRight, FloppyDisk, Sparkle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { PropertyTypePresetsSelector } from '@/components/PropertyTypePresetsSelector'

interface PropertyFormProps {
  property: Property | null
  clients: Client[]
  onSave: (property: Property) => void
  onCancel: () => void
}

export function PropertyForm({ property, clients, onSave, onCancel }: PropertyFormProps) {
  const [formData, setFormData] = useState<Partial<Property>>(
    property || {
      status: 'draft',
      address: { street: '', city: '', neighborhood: '', postalCode: '' },
      type: 'apartment',
      details: {
        builtArea: 0,
        rooms: 0,
        bedrooms: 0,
        bathrooms: 0,
        floor: 0,
        totalFloors: 0,
        buildYear: new Date().getFullYear(),
        condition: 'good',
        parking: 0,
        storage: false,
        balcony: false,
        elevator: false,
        accessible: false
      },
      features: [],
      description: '',
      photos: []
    }
  )

  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)

  const handleGenerateDescription = async () => {
    if (!formData.address?.street || !formData.details) return
    
    setIsGeneratingDescription(true)
    try {
      const promptText = `צור תיאור מקצועי של נכס נדל"ן בעברית עבור:
כתובת: ${formData.address.street}, ${formData.address.neighborhood || ''}, ${formData.address.city || ''}
סוג: ${formData.type}
גודל: ${formData.details.builtArea} מ"ר
חדרים: ${formData.details.rooms}
קומה: ${formData.details.floor} מתוך ${formData.details.totalFloors}
מצב: ${formData.details.condition}
שנת בנייה: ${formData.details.buildYear}
תכונות: ${formData.details.balcony ? 'מרפסת, ' : ''}${formData.details.elevator ? 'מעלית, ' : ''}${formData.details.parking ? `${formData.details.parking} חניות, ` : ''}${formData.details.storage ? 'מחסן' : ''}

צור תיאור בן 2-3 משפטים, מקצועי ומושך, המדגיש את היתרונות העיקריים של הנכס.`
      
      const description = await window.spark.llm(promptText)
      setFormData({ ...formData, description })
      toast.success('התיאור נוצר בהצלחה')
    } catch (_error) {
      toast.error('שגיאה ביצירת התיאור')
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.address?.street || !formData.address?.city || !formData.clientId) {
      toast.error('אנא מלא את כל השדות החובה')
      return
    }

    const propertyToSave: Property = {
      id: property?.id || `prop-${Date.now()}`,
      clientId: formData.clientId!,
      status: formData.status || 'draft',
      address: formData.address!,
      type: formData.type || 'apartment',
      details: formData.details!,
      features: formData.features || [],
      description: formData.description || '',
      photos: formData.photos || [],
      createdAt: property?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      valuationData: property?.valuationData
    }

    onSave(propertyToSave)
    toast.success(property ? 'הנכס עודכן בהצלחה' : 'הנכס נוצר בהצלחה')
  }

  const handleApplyPreset = (presetData: {
    type: PropertyType
    typicalRooms: number
    estimatedValue?: { min: number; max: number; avg: number }
    pricePerSqm?: { min: number; max: number; avg: number }
  }) => {
    setFormData({
      ...formData,
      type: presetData.type,
      details: {
        ...formData.details!,
        rooms: presetData.typicalRooms
      },
      valuationData: presetData.estimatedValue ? {
        estimatedValue: presetData.estimatedValue.avg,
        valueRange: {
          min: presetData.estimatedValue.min,
          max: presetData.estimatedValue.max
        },
        confidence: 0.75,
        method: 'comparable-sales',
        comparables: [],
        notes: `הערכה אוטומטית מבוססת פריסטים של ${formData.address?.city || 'אזור'}`
      } : formData.valuationData
    })
    
    toast.success('הפריסט הוחל בהצלחה')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
            <ArrowRight size={18} />
            ביטול
          </Button>
          <Button type="submit" className="gap-2">
            <FloppyDisk size={18} weight="bold" />
            שמור
          </Button>
        </div>
        <h2 className="text-2xl font-bold">{property ? 'עריכת נכס' : 'נכס חדש'}</h2>
      </div>

      <PropertyTypePresetsSelector
        selectedType={formData.type}
        selectedCity={formData.address?.city}
        selectedNeighborhood={formData.address?.neighborhood}
        builtArea={formData.details?.builtArea}
        onApplyPreset={handleApplyPreset}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-right">פרטים בסיסיים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2" dir="rtl">
              <Label htmlFor="client">לקוח *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2" dir="rtl">
              <Label htmlFor="street">רחוב *</Label>
              <Input
                id="street"
                value={formData.address?.street || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address!, street: e.target.value }
                })}
                className="text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="city">עיר *</Label>
                <Input
                  id="city"
                  value={formData.address?.city || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address!, city: e.target.value }
                  })}
                  className="text-right"
                />
              </div>
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="neighborhood">שכונה</Label>
                <Input
                  id="neighborhood"
                  value={formData.address?.neighborhood || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address!, neighborhood: e.target.value }
                  })}
                  className="text-right"
                />
              </div>
            </div>

            <div className="space-y-2" dir="rtl">
              <Label htmlFor="type">סוג נכס</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as PropertyType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">דירה</SelectItem>
                  <SelectItem value="house">בית פרטי</SelectItem>
                  <SelectItem value="penthouse">פנטהאוז</SelectItem>
                  <SelectItem value="garden-apartment">דירת גן</SelectItem>
                  <SelectItem value="duplex">דופלקס</SelectItem>
                  <SelectItem value="studio">סטודיו</SelectItem>
                  <SelectItem value="commercial">מסחרי</SelectItem>
                  <SelectItem value="land">קרקע</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-right">מפרט טכני</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="builtArea">שטח בנוי (מ״ר)</Label>
                <Input
                  id="builtArea"
                  type="number"
                  value={formData.details?.builtArea || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    details: { ...formData.details!, builtArea: Number(e.target.value) }
                  })}
                  className="text-right font-mono"
                />
              </div>
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="totalArea">שטח כולל (מ״ר)</Label>
                <Input
                  id="totalArea"
                  type="number"
                  value={formData.details?.totalArea || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    details: { ...formData.details!, totalArea: Number(e.target.value) }
                  })}
                  className="text-right font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="rooms">חדרים</Label>
                <Input
                  id="rooms"
                  type="number"
                  step="0.5"
                  value={formData.details?.rooms || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    details: { ...formData.details!, rooms: Number(e.target.value) }
                  })}
                  className="text-right font-mono"
                />
              </div>
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="bedrooms">חדרי שינה</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.details?.bedrooms || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    details: { ...formData.details!, bedrooms: Number(e.target.value) }
                  })}
                  className="text-right font-mono"
                />
              </div>
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="bathrooms">חדרי רחצה</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  value={formData.details?.bathrooms || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    details: { ...formData.details!, bathrooms: Number(e.target.value) }
                  })}
                  className="text-right font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="floor">קומה</Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.details?.floor || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    details: { ...formData.details!, floor: Number(e.target.value) }
                  })}
                  className="text-right font-mono"
                />
              </div>
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="totalFloors">מתוך קומות</Label>
                <Input
                  id="totalFloors"
                  type="number"
                  value={formData.details?.totalFloors || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    details: { ...formData.details!, totalFloors: Number(e.target.value) }
                  })}
                  className="text-right font-mono"
                />
              </div>
              <div className="space-y-2" dir="rtl">
                <Label htmlFor="buildYear">שנת בנייה</Label>
                <Input
                  id="buildYear"
                  type="number"
                  value={formData.details?.buildYear || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    details: { ...formData.details!, buildYear: Number(e.target.value) }
                  })}
                  className="text-right font-mono"
                />
              </div>
            </div>

            <div className="space-y-2" dir="rtl">
              <Label htmlFor="condition">מצב</Label>
              <Select
                value={formData.details?.condition}
                onValueChange={(value) => setFormData({
                  ...formData,
                  details: { ...formData.details!, condition: value as PropertyCondition }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">חדש</SelectItem>
                  <SelectItem value="excellent">מצוין</SelectItem>
                  <SelectItem value="good">טוב</SelectItem>
                  <SelectItem value="fair">סביר</SelectItem>
                  <SelectItem value="poor">גרוע</SelectItem>
                  <SelectItem value="renovation-needed">דרוש שיפוץ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-right">תכונות ומאפיינים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between" dir="rtl">
              <Label htmlFor="balcony">מרפסת</Label>
              <Switch
                id="balcony"
                checked={formData.details?.balcony}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  details: { ...formData.details!, balcony: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between" dir="rtl">
              <Label htmlFor="elevator">מעלית</Label>
              <Switch
                id="elevator"
                checked={formData.details?.elevator}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  details: { ...formData.details!, elevator: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between" dir="rtl">
              <Label htmlFor="storage">מחסן</Label>
              <Switch
                id="storage"
                checked={formData.details?.storage}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  details: { ...formData.details!, storage: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between" dir="rtl">
              <Label htmlFor="accessible">נגיש</Label>
              <Switch
                id="accessible"
                checked={formData.details?.accessible}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  details: { ...formData.details!, accessible: checked }
                })}
              />
            </div>
          </div>

          <div className="space-y-2" dir="rtl">
            <Label htmlFor="parking">מספר חניות</Label>
            <Input
              id="parking"
              type="number"
              value={formData.details?.parking || 0}
              onChange={(e) => setFormData({
                ...formData,
                details: { ...formData.details!, parking: Number(e.target.value) }
              })}
              className="text-right font-mono max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateDescription}
              disabled={isGeneratingDescription}
              className="gap-2"
            >
              <Sparkle size={16} weight="fill" />
              {isGeneratingDescription ? 'מייצר...' : 'ייצר תיאור AI'}
            </Button>
            <CardTitle className="text-right">תיאור הנכס</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="תיאור מפורט של הנכס..."
            className="min-h-32 text-right"
            dir="rtl"
          />
        </CardContent>
      </Card>
    </form>
  )
}
