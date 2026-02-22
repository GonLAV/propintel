import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { MultiUnitBuilding, BuildingUnit } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
// Tabs not used here
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Buildings, Plus, Lightning, FileText, Download, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function MultiUnitManager() {
  const [buildings, setBuildings] = useKV<MultiUnitBuilding[]>('multi-unit-buildings', [])
  const [selectedBuilding, setSelectedBuilding] = useState<MultiUnitBuilding | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newBuilding, setNewBuilding] = useState<Partial<MultiUnitBuilding>>({
    buildingDetails: {
      totalFloors: 4,
      totalUnits: 16,
      buildYear: 2020,
      constructionType: 'בטון מזוין',
      roofType: 'רעפים',
      commonAreas: ['מדרגות', 'חניון משותף']
    }
  })

  const handleCreateBuilding = () => {
    if (!newBuilding.address) {
      toast.error('נא להזין כתובת הבניין')
      return
    }

    const building: MultiUnitBuilding = {
      id: crypto.randomUUID(),
      address: newBuilding.address,
      buildingDetails: newBuilding.buildingDetails!,
      units: [],
      commonData: {
        landValue: 0,
        constructionCost: 0,
        depreciation: 0,
        buildingRights: {
          currentUsage: 0,
          allowedUsage: 0,
          remainingRights: 0,
          zoningDesignation: '',
          restrictions: []
        },
        utilities: [
          { type: 'water', status: 'connected' },
          { type: 'electricity', status: 'connected' },
          { type: 'gas', status: 'connected' },
          { type: 'sewage', status: 'connected' },
          { type: 'internet', status: 'available' }
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setBuildings(current => [...(current || []), building])
    setIsCreateDialogOpen(false)
    setNewBuilding({
      buildingDetails: {
        totalFloors: 4,
        totalUnits: 16,
        buildYear: 2020,
        constructionType: 'בטון מזוין',
        roofType: 'רעפים',
        commonAreas: ['מדרגות', 'חניון משותף']
      }
    })
    toast.success('בניין נוצר בהצלחה')
  }

  const handleGenerateUnits = (buildingId: string) => {
    const building = buildings?.find(b => b.id === buildingId)
    if (!building) return

    const floors = building.buildingDetails.totalFloors
    const unitsPerFloor = Math.ceil(building.buildingDetails.totalUnits / floors)
    const units: BuildingUnit[] = []

    for (let floor = 0; floor < floors; floor++) {
      for (let unit = 0; unit < unitsPerFloor; unit++) {
        if (units.length >= building.buildingDetails.totalUnits) break

        const unitNumber = `${floor + 1}${unit + 1}`
        const exposure = ['north', 'south', 'east', 'west'][unit % 4] as any

        units.push({
          id: crypto.randomUUID(),
          unitNumber,
          floor: floor + 1,
          type: 'apartment',
          builtArea: 80 + Math.floor(Math.random() * 40),
          rooms: 3 + Math.floor(Math.random() * 2),
          bedrooms: 2 + Math.floor(Math.random() * 2),
          bathrooms: 1 + Math.floor(Math.random() * 1),
          balcony: Math.random() > 0.3,
          balconyArea: Math.random() > 0.3 ? 8 + Math.floor(Math.random() * 8) : undefined,
          parking: Math.random() > 0.4 ? 1 : 0,
          storage: Math.random() > 0.5,
          condition: 'good',
          exposure,
          individualAdjustments: [],
          status: 'pending'
        })
      }
    }

    setBuildings(current =>
      (current || []).map(b =>
        b.id === buildingId
          ? { ...b, units, updatedAt: new Date().toISOString() }
          : b
      )
    )

    toast.success(`${units.length} יחידות נוצרו בהצלחה`)
  }

  const handleBulkValuation = async (buildingId: string) => {
    const building = buildings?.find(b => b.id === buildingId)
    if (!building || building.units.length === 0) return

    toast.info('מפעיל שומה מרובה...')

    setTimeout(() => {
      setBuildings(current =>
        (current || []).map(b => {
          if (b.id === buildingId) {
            const baseValue = 1500000
            const valuedUnits = b.units.map(unit => {
              const floorAdjustment = (unit.floor - 1) * 0.02
              const areaAdjustment = (unit.builtArea - 100) * 0.001
              const parkingValue = unit.parking ? 0.05 : 0
              const balconyValue = unit.balcony ? 0.03 : 0

              const totalAdjustment = 1 + floorAdjustment + areaAdjustment + parkingValue + balconyValue
              const estimatedValue = Math.round(baseValue * totalAdjustment)

              return {
                ...unit,
                valuationResult: {
                  estimatedValue,
                  confidence: 0.85,
                  method: 'comparable-sales' as const
                },
                status: 'valued' as const
              }
            })

            const totalValue = valuedUnits.reduce((sum, u) => sum + (u.valuationResult?.estimatedValue || 0), 0)

            return {
              ...b,
              units: valuedUnits,
              masterValuation: {
                totalValue,
                valuePerSqm: Math.round(totalValue / valuedUnits.reduce((sum, u) => sum + u.builtArea, 0)),
                methodology: 'שיטת השוואה עם התאמות ייחודיות לכל יחידה',
                calculatedAt: new Date().toISOString()
              },
              updatedAt: new Date().toISOString()
            }
          }
          return b
        })
      )

      toast.success('שומה מרובה הושלמה בהצלחה')
    }, 2000)
  }

  const handleGenerateReports = (buildingId: string) => {
    const building = buildings?.find(b => b.id === buildingId)
    if (!building) return

    const reportedUnits = building.units.filter(u => u.valuationResult)
    if (reportedUnits.length === 0) {
      toast.error('אין יחידות מוערכות')
      return
    }

    setBuildings(current =>
      (current || []).map(b => {
        if (b.id === buildingId) {
          return {
            ...b,
            units: b.units.map(u =>
              u.valuationResult
                ? {
                    ...u,
                    reportId: crypto.randomUUID(),
                    status: 'reported' as const
                  }
                : u
            ),
            updatedAt: new Date().toISOString()
          }
        }
        return b
      })
    )

    toast.success(`${reportedUnits.length} דוחות נוצרו בהצלחה`)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Buildings size={32} weight="duotone" className="text-primary" />
            בניין פעם אחת - שומות בלי סוף
          </h2>
          <p className="text-muted-foreground mt-2">
            הזנת בניין אחת • יצירת עשרות שומות • התאמות ייחודיות לכל דירה
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="lg">
              <Plus size={20} weight="bold" />
              בניין חדש
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>יצירת בניין ריבוי יחידות</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>רחוב *</Label>
                  <Input
                    value={newBuilding.address?.street || ''}
                    onChange={e => setNewBuilding({
                      ...newBuilding,
                      address: { ...newBuilding.address!, street: e.target.value }
                    })}
                    placeholder="רחוב הרצל 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>עיר *</Label>
                  <Input
                    value={newBuilding.address?.city || ''}
                    onChange={e => setNewBuilding({
                      ...newBuilding,
                      address: { ...newBuilding.address!, city: e.target.value }
                    })}
                    placeholder="תל אביב"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>קומות *</Label>
                  <Input
                    type="number"
                    value={newBuilding.buildingDetails?.totalFloors || 4}
                    onChange={e => setNewBuilding({
                      ...newBuilding,
                      buildingDetails: {
                        ...newBuilding.buildingDetails!,
                        totalFloors: parseInt(e.target.value) || 4
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>יחידות *</Label>
                  <Input
                    type="number"
                    value={newBuilding.buildingDetails?.totalUnits || 16}
                    onChange={e => setNewBuilding({
                      ...newBuilding,
                      buildingDetails: {
                        ...newBuilding.buildingDetails!,
                        totalUnits: parseInt(e.target.value) || 16
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>שנת בנייה *</Label>
                  <Input
                    type="number"
                    value={newBuilding.buildingDetails?.buildYear || 2020}
                    onChange={e => setNewBuilding({
                      ...newBuilding,
                      buildingDetails: {
                        ...newBuilding.buildingDetails!,
                        buildYear: parseInt(e.target.value) || 2020
                      }
                    })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={handleCreateBuilding}>
                  יצירת בניין
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {(!buildings || buildings.length === 0) ? (
          <Card className="p-12 text-center glass-effect">
            <Buildings size={64} weight="duotone" className="mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground">אין בניינים עדיין</p>
            <p className="text-sm text-muted-foreground mt-2">צור בניין ראשון כדי להתחיל</p>
          </Card>
        ) : (
          buildings.map(building => (
            <Card key={building.id} className="p-6 glass-effect">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    {building.address.street}, {building.address.city}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{building.buildingDetails.totalFloors} קומות</span>
                    <span>•</span>
                    <span>{building.buildingDetails.totalUnits} יחידות</span>
                    <span>•</span>
                    <span>נבנה {building.buildingDetails.buildYear}</span>
                  </div>
                  {building.masterValuation && (
                    <div className="mt-3 flex items-center gap-4">
                      <Badge className="bg-success/20 text-success text-base px-3 py-1">
                        שווי כולל: ₪{building.masterValuation.totalValue.toLocaleString()}
                      </Badge>
                      <Badge variant="outline">
                        ₪{building.masterValuation.valuePerSqm.toLocaleString()}/מ"ר
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {building.units.length === 0 ? (
                    <Button className="gap-2" onClick={() => handleGenerateUnits(building.id)}>
                      <Lightning size={18} weight="fill" />
                      יצירת יחידות
                    </Button>
                  ) : (
                    <>
                      {!building.masterValuation && (
                        <Button className="gap-2" onClick={() => handleBulkValuation(building.id)}>
                          <Lightning size={18} weight="fill" />
                          שומה מרובה
                        </Button>
                      )}
                      {building.masterValuation && (
                        <>
                          <Button variant="outline" className="gap-2" onClick={() => handleGenerateReports(building.id)}>
                            <FileText size={18} />
                            יצירת דוחות
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <Download size={18} />
                            ייצוא הכל
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="icon" onClick={() => setSelectedBuilding(building)}>
                        <Eye size={18} />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {building.units.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <p className="text-sm text-muted-foreground">יחידות</p>
                    <p className="text-2xl font-bold">{building.units.length}</p>
                  </Card>
                  <Card className="p-4 bg-warning/5 border-warning/20">
                    <p className="text-sm text-muted-foreground">ממתינות</p>
                    <p className="text-2xl font-bold text-warning">
                      {building.units.filter(u => u.status === 'pending').length}
                    </p>
                  </Card>
                  <Card className="p-4 bg-accent/5 border-accent/20">
                    <p className="text-sm text-muted-foreground">מוערכות</p>
                    <p className="text-2xl font-bold text-accent">
                      {building.units.filter(u => u.status === 'valued').length}
                    </p>
                  </Card>
                  <Card className="p-4 bg-success/5 border-success/20">
                    <p className="text-sm text-muted-foreground">דוחות</p>
                    <p className="text-2xl font-bold text-success">
                      {building.units.filter(u => u.status === 'reported').length}
                    </p>
                  </Card>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {selectedBuilding && (
        <Dialog open={!!selectedBuilding} onOpenChange={() => setSelectedBuilding(null)}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {selectedBuilding.address.street}, {selectedBuilding.address.city}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>יחידה</TableHead>
                    <TableHead>קומה</TableHead>
                    <TableHead>שטח</TableHead>
                    <TableHead>חדרים</TableHead>
                    <TableHead>חניה</TableHead>
                    <TableHead>מרפסת</TableHead>
                    <TableHead>שווי מוערך</TableHead>
                    <TableHead>סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBuilding.units.map(unit => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                      <TableCell>{unit.floor}</TableCell>
                      <TableCell>{unit.builtArea} מ"ר</TableCell>
                      <TableCell>{unit.rooms}</TableCell>
                      <TableCell>{unit.parking ? '✓' : '✗'}</TableCell>
                      <TableCell>{unit.balcony ? '✓' : '✗'}</TableCell>
                      <TableCell>
                        {unit.valuationResult
                          ? `₪${unit.valuationResult.estimatedValue.toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            unit.status === 'reported'
                              ? 'default'
                              : unit.status === 'valued'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {unit.status === 'pending' && 'ממתין'}
                          {unit.status === 'valued' && 'מוערך'}
                          {unit.status === 'reported' && 'דוח מוכן'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
