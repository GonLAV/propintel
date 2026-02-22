import { useState } from 'react'
import type { Property, Client, Comparable } from '@/lib/types'
import { generateMockComparables } from '@/lib/mockData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  ArrowRight,
  PencilSimple,
  Trash,
  FileText,
  MagnifyingGlass,
  MapPin,
  House,
  Elevator,
  Car,
  Package,
  CheckCircle,
  Sparkle,
  Camera,
  Database
} from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AIValuation } from './AIValuation'
import { Property3DView } from './Property3DView'
import { FloorPlanDesigner } from './FloorPlanDesigner'
import { InvestmentAnalysis } from './InvestmentAnalysis'
import { EnvironmentalAnalysis } from './EnvironmentalAnalysis'
import { ARWalkthrough } from './ARWalkthrough'
import { ARSessionsViewer } from './ARSessionsViewer'
import { AdvancedMarketComparison } from './AdvancedMarketComparison'
import { ReportGenerator } from './ReportGenerator'
import { AutoValuationEngine } from './AutoValuationEngine'

interface PropertyDetailProps {
  property: Property
  clients: Client[]
  allProperties: Property[]
  onBack: () => void
  onEdit: (property: Property) => void
  onSave: (property: Property) => void
  onDelete: (id: string) => void
}

export function PropertyDetail({ property, clients, onBack, onEdit, onSave, onDelete }: PropertyDetailProps) {
  const [activeTab, setActiveTab] = useState('details')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showARWalkthrough, setShowARWalkthrough] = useState(false)
  const [comparables] = useState<Comparable[]>(generateMockComparables())
  
  const client = clients.find(c => c.id === property.clientId)

  const handleDelete = () => {
    onDelete(property.id)
    toast.success('הנכס נמחק בהצלחה')
  }

  const handleGenerateReport = () => {
    toast.success('הדוח נוצר בהצלחה')
  }

  const propertyTypeLabels = {
    'apartment': 'דירה',
    'house': 'בית פרטי',
    'penthouse': 'פנטהאוז',
    'garden-apartment': 'דירת גן',
    'duplex': 'דופלקס',
    'studio': 'סטודיו',
    'commercial': 'מסחרי',
    'land': 'קרקע'
  }

  const conditionLabels = {
    'new': 'חדש',
    'excellent': 'מצוין',
    'good': 'טוב',
    'fair': 'סביר',
    'poor': 'גרוע',
    'renovation-needed': 'דרוש שיפוץ'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowRight size={18} />
            חזרה
          </Button>
          <Button variant="outline" onClick={() => onEdit(property)} className="gap-2">
            <PencilSimple size={18} />
            עריכה
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="gap-2">
            <Trash size={18} />
            מחיקה
          </Button>
          <Button 
            onClick={() => setShowARWalkthrough(true)} 
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground glow-accent"
          >
            <Camera size={18} weight="fill" />
            סיור AR
          </Button>
          <Button onClick={handleGenerateReport} className="gap-2">
            <FileText size={18} weight="bold" />
            ייצוא דוח
          </Button>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold">{property.address.street}</h2>
          <p className="text-muted-foreground">
            {property.address.neighborhood}, {property.address.city}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12">
          <TabsTrigger value="details">פרטי נכס</TabsTrigger>
          <TabsTrigger value="valuation">שומה</TabsTrigger>
          <TabsTrigger value="ai-valuation" className="gap-2">
            <Sparkle size={14} weight="fill" />
            AI שומה
          </TabsTrigger>
          <TabsTrigger value="auto-valuation" className="gap-2">
            <Database size={14} weight="bold" />
            שמאות אוטומטית
          </TabsTrigger>
          <TabsTrigger value="comparables">נכסים דומים</TabsTrigger>
          <TabsTrigger value="advanced-search" className="gap-2">
            <MagnifyingGlass size={14} weight="bold" />
            חיפוש מתקדם
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText size={14} weight="bold" />
            ייצוא דוח
          </TabsTrigger>
          <TabsTrigger value="ar-sessions" className="gap-2">
            <Camera size={14} weight="fill" />
            סיורי AR
          </TabsTrigger>
          <TabsTrigger value="3d-view">תצוגה 3D</TabsTrigger>
          <TabsTrigger value="floor-plan">תוכנית קומה</TabsTrigger>
          <TabsTrigger value="investment">ניתוח השקעה</TabsTrigger>
          <TabsTrigger value="environment">ניתוח סביבתי</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-right text-base">מידע כללי</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="סוג נכס" value={propertyTypeLabels[property.type]} />
                <InfoRow label="מצב" value={conditionLabels[property.details.condition]} />
                <InfoRow label="שנת בנייה" value={property.details.buildYear.toString()} />
                <InfoRow label="לקוח" value={client?.name || 'לא ידוע'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right text-base">מידות ומבנה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="שטח בנוי" value={`${property.details.builtArea} מ״ר`} mono />
                {property.details.totalArea && (
                  <InfoRow label="שטח כולל" value={`${property.details.totalArea} מ״ר`} mono />
                )}
                <InfoRow label="חדרים" value={property.details.rooms.toString()} mono />
                <InfoRow label="חדרי שינה" value={property.details.bedrooms.toString()} mono />
                <InfoRow label="חדרי רחצה" value={property.details.bathrooms.toString()} mono />
                <InfoRow label="קומה" value={`${property.details.floor} / ${property.details.totalFloors}`} mono />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-right text-base">תכונות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FeatureRow icon={<Elevator size={18} />} label="מעלית" active={property.details.elevator} />
                <FeatureRow icon={<Car size={18} />} label="חניות" value={property.details.parking} />
                <FeatureRow icon={<Package size={18} />} label="מחסן" active={property.details.storage} />
                <FeatureRow icon={<House size={18} />} label="מרפסת" active={property.details.balcony} />
                <FeatureRow icon={<CheckCircle size={18} />} label="נגיש" active={property.details.accessible} />
              </CardContent>
            </Card>
          </div>

          {property.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-right">תיאור הנכס</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-right leading-relaxed">{property.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="valuation" className="space-y-6 mt-6">
          {property.valuationData ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-right">שווי משוער</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <div className="text-5xl font-bold font-mono text-primary mb-2">
                        ₪{(property.valuationData.estimatedValue / 1000000).toFixed(2)}M
                      </div>
                      <div className="text-muted-foreground mb-4">
                        טווח: ₪{(property.valuationData.valueRange.min / 1000000).toFixed(2)}M - ₪{(property.valuationData.valueRange.max / 1000000).toFixed(2)}M
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">מחיר למ״ר: </span>
                        <span className="font-mono font-semibold">
                          ₪{Math.round(property.valuationData.estimatedValue / property.details.builtArea).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-right">רמת ביטחון</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-6">
                      <div className="text-4xl font-bold text-accent mb-2">
                        {property.valuationData.confidence}%
                      </div>
                      <Progress value={property.valuationData.confidence} className="h-2" />
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      מבוסס על {property.valuationData.comparables.length} נכסי השוואה
                    </div>
                  </CardContent>
                </Card>
              </div>

              {property.valuationData.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-right">הערות שמאי</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-right">{property.valuationData.notes}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MagnifyingGlass size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">טרם בוצעה שומה</h3>
                <p className="text-muted-foreground mb-4">השתמש בכרטיסיה "AI שומה" לביצוע שומה מתקדמת</p>
                <Button className="gap-2" onClick={() => setActiveTab('ai-valuation')}>
                  <Sparkle size={18} weight="fill" />
                  עבור לשומת AI
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-valuation" className="mt-6">
          <AIValuation
            property={property}
            onUpdateValuation={(valuationData) => {
              const updatedProperty = { ...property, valuationData }
              onSave(updatedProperty)
              toast.success('השומה עודכנה בהצלחה')
            }}
          />
        </TabsContent>

        <TabsContent value="auto-valuation" className="mt-6">
          <AutoValuationEngine
            property={property}
            onValuationComplete={(result) => {
              const valuationData = {
                estimatedValue: result.estimatedValue,
                valueRange: result.valueRange,
                confidence: result.confidenceScore,
                method: 'hybrid' as const,
                comparables: [],
                notes: `שמאות אוטומטית מבוססת נתונים ממשלתיים - ציון איכות נתונים: ${result.dataQuality}%`
              }
              const updatedProperty = { ...property, valuationData }
              onSave(updatedProperty)
              toast.success('השמאות האוטומטית הושלמה ונשמרה')
            }}
          />
        </TabsContent>

        <TabsContent value="comparables" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button 
                  className="gap-2"
                  onClick={() => setActiveTab('advanced-search')}
                >
                  <MagnifyingGlass size={18} />
                  חיפוש מתקדם
                </Button>
                <CardTitle className="text-right">נכסים דומים</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comparables.map((comp) => (
                  <div key={comp.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <Badge variant={comp.selected ? 'default' : 'outline'}>
                          {comp.selected ? 'נבחר' : 'לא נבחר'}
                        </Badge>
                        <div className="flex gap-2 items-center text-sm text-muted-foreground">
                          <MapPin size={14} />
                          {comp.distance} ק״מ
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">{comp.address}</div>
                        <div className="text-sm text-muted-foreground">
                          {comp.rooms} חד׳ • {comp.builtArea} מ״ר • קומה {comp.floor}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">מחיר מכירה</div>
                        <div className="font-mono font-semibold text-sm">
                          ₪{(comp.salePrice / 1000000).toFixed(2)}M
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">התאמות</div>
                        <div className={`font-mono font-semibold text-sm ${comp.adjustments.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comp.adjustments.total >= 0 ? '+' : ''}₪{(comp.adjustments.total / 1000).toFixed(0)}K
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">מחיר מותאם</div>
                        <div className="font-mono font-semibold text-sm text-primary">
                          ₪{(comp.adjustedPrice / 1000000).toFixed(2)}M
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">מחיר למ״ר</div>
                        <div className="font-mono font-semibold text-sm">
                          ₪{comp.pricePerSqm.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground text-right">
                      נמכר ב-{new Date(comp.saleDate).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced-search" className="mt-6">
          <AdvancedMarketComparison
            property={property}
            onSelectComparables={(selectedComps) => {
              toast.success(`${selectedComps.length} נכסים נשמרו`)
              setActiveTab('comparables')
            }}
          />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <ReportGenerator
            property={property}
            client={client}
            comparables={comparables}
          />
        </TabsContent>

        <TabsContent value="3d-view" className="mt-6">
          <Property3DView
            propertyData={{
              floors: property.details.totalFloors,
              buildingHeight: property.details.totalFloors * 3,
              plotWidth: 10,
              plotLength: 12,
              orientation: 0,
              neighborhood: property.address.neighborhood
            }}
          />
        </TabsContent>

        <TabsContent value="floor-plan" className="mt-6">
          <FloorPlanDesigner
            onSave={(_rooms) => {
              toast.success('תוכנית קומה נשמרה לנכס')
            }}
          />
        </TabsContent>

        <TabsContent value="ar-sessions" className="mt-6">
          <ARSessionsViewer
            property={property}
            onBack={() => setActiveTab('details')}
            onStartSession={() => setShowARWalkthrough(true)}
            onJoinSession={(_sessionId) => {
              setShowARWalkthrough(true)
              toast.success('מצטרף לסשן...')
            }}
          />
        </TabsContent>

        <TabsContent value="investment" className="mt-6">
          <InvestmentAnalysis
            propertyValue={property.valuationData?.estimatedValue || property.details.builtArea * 25000}
            neighborhood={property.address.neighborhood}
            propertyType={property.type}
          />
        </TabsContent>

        <TabsContent value="environment" className="mt-6">
          <EnvironmentalAnalysis
            address={property.address}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">האם למחוק את הנכס?</DialogTitle>
            <DialogDescription className="text-right">
              פעולה זו תמחק לצמיתות את הנכס {property.address.street}. לא ניתן לבטל פעולה זו.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              מחק נכס
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showARWalkthrough && (
        <ARWalkthrough 
          property={property} 
          onClose={() => setShowARWalkthrough(false)} 
        />
      )}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className={mono ? 'font-mono font-semibold' : 'font-medium'}>{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  )
}

function FeatureRow({ icon, label, active, value }: { 
  icon: React.ReactNode
  label: string
  active?: boolean
  value?: number
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {value !== undefined ? (
          <span className="font-mono font-semibold">{value}</span>
        ) : (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {active && <CheckCircle size={12} weight="fill" />}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
    </div>
  )
}
