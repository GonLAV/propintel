import { useState, useEffect } from 'react'
import type { PropertyType } from '@/lib/types'
import {
  PROPERTY_TYPE_PRESETS,
  AREA_PRICE_RANGES,
  getPropertyTypePreset,
  getPriceRangeForProperty,
  estimatePropertyValue,
  getAllCities
} from '@/lib/propertyPresets'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  TrendUp, 
  TrendDown, 
  MapPin, 
  Info,
  Sparkle,
  Check
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface PropertyTypePresetsSelectorProps {
  selectedType?: PropertyType
  selectedCity?: string
  selectedNeighborhood?: string
  builtArea?: number
  onApplyPreset?: (data: {
    type: PropertyType
    typicalRooms: number
    estimatedValue?: {
      min: number
      max: number
      avg: number
    }
    pricePerSqm?: {
      min: number
      max: number
      avg: number
    }
  }) => void
  className?: string
}

export function PropertyTypePresetsSelector({
  selectedType,
  selectedCity,
  selectedNeighborhood,
  builtArea,
  onApplyPreset,
  className
}: PropertyTypePresetsSelectorProps) {
  const [viewMode, setViewMode] = useState<'types' | 'areas'>('types')
  const [selectedPresetType, setSelectedPresetType] = useState<PropertyType | undefined>(selectedType)
  const [_selectedAreaId, setSelectedAreaId] = useState<string | undefined>()
  const [filterCity, setFilterCity] = useState<string | undefined>(selectedCity)

  useEffect(() => {
    if (selectedCity) {
      const matchingArea = AREA_PRICE_RANGES.find(
        area => area.city === selectedCity && 
        (!selectedNeighborhood || area.neighborhood === selectedNeighborhood)
      )
      if (matchingArea) {
        setSelectedAreaId(matchingArea.areaId)
      }
    }
  }, [selectedCity, selectedNeighborhood])

  const handleSelectType = (type: PropertyType) => {
    setSelectedPresetType(type)
    const preset = getPropertyTypePreset(type)
    
    if (preset && onApplyPreset) {
      const avgRooms = Math.round((preset.typicalRooms.min + preset.typicalRooms.max) / 2)
      
      let estimatedValue
      let pricePerSqm
      
      if (builtArea && builtArea > 0 && selectedCity) {
        const estimate = estimatePropertyValue(type, builtArea, selectedCity, selectedNeighborhood)
        if (estimate) {
          estimatedValue = estimate
          const priceRange = getPriceRangeForProperty(type, selectedCity, selectedNeighborhood)
          if (priceRange) {
            pricePerSqm = {
              min: priceRange.pricePerSqmMin,
              max: priceRange.pricePerSqmMax,
              avg: priceRange.pricePerSqmAvg
            }
          }
        }
      }
      
      onApplyPreset({
        type,
        typicalRooms: avgRooms,
        estimatedValue,
        pricePerSqm
      })
    }
  }

  const filteredAreas = filterCity
    ? AREA_PRICE_RANGES.filter(area => area.city === filterCity)
    : AREA_PRICE_RANGES

  const cities = getAllCities()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('he-IL').format(value)
  }

  return (
    <Card className={cn("glass-effect", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkle className="text-primary" weight="fill" />
              פריסטים של סוגי נכס ומחירים
            </CardTitle>
            <CardDescription>
              בחר סוג נכס ואזור לקבלת הערכת מחיר מבוססת נתונים
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'types' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('types')}
            >
              סוגי נכס
            </Button>
            <Button
              variant={viewMode === 'areas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('areas')}
            >
              אזורים
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {viewMode === 'types' ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PROPERTY_TYPE_PRESETS.map(preset => {
                const isSelected = selectedPresetType === preset.type
                const priceRange = selectedCity 
                  ? getPriceRangeForProperty(preset.type, selectedCity, selectedNeighborhood)
                  : null

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectType(preset.type)}
                    className={cn(
                      "relative p-4 rounded-lg border-2 transition-all text-right hover:scale-105",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 left-2">
                        <Check className="text-primary" weight="bold" />
                      </div>
                    )}
                    
                    <div className="text-3xl mb-2">{preset.icon}</div>
                    <div className="font-semibold text-sm mb-1">{preset.nameHe}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {preset.typicalSizeRange.min}-{preset.typicalSizeRange.max} מ"ר
                    </div>
                    
                    {priceRange && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="text-xs font-medium text-primary">
                          {formatNumber(priceRange.pricePerSqmAvg)} ₪/מ"ר
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {priceRange.trend === 'rising' ? (
                            <TrendUp className="text-success" size={12} weight="bold" />
                          ) : priceRange.trend === 'declining' ? (
                            <TrendDown className="text-destructive" size={12} weight="bold" />
                          ) : null}
                          <span className={cn(
                            "text-xs font-medium",
                            priceRange.trend === 'rising' ? "text-success" : 
                            priceRange.trend === 'declining' ? "text-destructive" : 
                            "text-muted-foreground"
                          )}>
                            {priceRange.trendPercent > 0 ? '+' : ''}{priceRange.trendPercent}%
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {selectedPresetType && (
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-3">
                  <Info className="text-primary mt-1 shrink-0" size={20} />
                  <div className="space-y-2 flex-1">
                    <div className="font-semibold">
                      {PROPERTY_TYPE_PRESETS.find(p => p.type === selectedPresetType)?.nameHe}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {PROPERTY_TYPE_PRESETS.find(p => p.type === selectedPresetType)?.descriptionHe}
                    </div>
                    
                    {builtArea && builtArea > 0 && selectedCity && (
                      <>
                        <Separator className="my-3" />
                        {(() => {
                          const estimate = estimatePropertyValue(
                            selectedPresetType,
                            builtArea,
                            selectedCity,
                            selectedNeighborhood
                          )
                          const priceRange = getPriceRangeForProperty(
                            selectedPresetType,
                            selectedCity,
                            selectedNeighborhood
                          )
                          
                          if (estimate && priceRange) {
                            return (
                              <div className="space-y-3">
                                <div>
                                  <div className="text-sm font-medium mb-1">הערכת שווי</div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-primary">
                                      {formatCurrency(estimate.avg)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      (ממוצע)
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    טווח: {formatCurrency(estimate.min)} - {formatCurrency(estimate.max)}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm font-medium mb-1">מחיר למ"ר</div>
                                  <div className="text-lg font-semibold text-foreground">
                                    {formatNumber(priceRange.pricePerSqmAvg)} ₪/מ"ר
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {priceRange.trend === 'rising' ? (
                                      <TrendUp className="text-success" size={16} weight="bold" />
                                    ) : priceRange.trend === 'declining' ? (
                                      <TrendDown className="text-destructive" size={16} weight="bold" />
                                    ) : null}
                                    <span className={cn(
                                      "text-sm font-medium",
                                      priceRange.trend === 'rising' ? "text-success" : 
                                      priceRange.trend === 'declining' ? "text-destructive" : 
                                      "text-muted-foreground"
                                    )}>
                                      מגמה: {priceRange.trend === 'rising' ? 'עולה' : priceRange.trend === 'declining' ? 'יורדת' : 'יציבה'} ({priceRange.trendPercent > 0 ? '+' : ''}{priceRange.trendPercent}%)
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  מבוסס על {priceRange.sampleSize} עסקאות | עדכון אחרון: {new Date(priceRange.lastUpdated).toLocaleDateString('he-IL')}
                                </div>
                              </div>
                            )
                          }
                          
                          return (
                            <div className="text-sm text-muted-foreground">
                              אין מידע על מחירים באזור זה עבור סוג נכס זה
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <Label>סנן לפי עיר</Label>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="כל הערים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הערים</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {filteredAreas.map(area => (
                  <Card key={area.areaId} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <MapPin className="text-primary mt-1" size={20} weight="fill" />
                          <div>
                            <CardTitle className="text-base">{area.areaNameHe}</CardTitle>
                            <CardDescription className="text-xs">
                              {area.city} {area.neighborhood && `• ${area.neighborhood}`}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(area.priceRanges).map(([type, data]) => {
                          const preset = getPropertyTypePreset(type as PropertyType)
                          if (!preset) return null
                          
                          return (
                            <div
                              key={type}
                              className="p-2 rounded border border-border bg-card"
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-lg">{preset.icon}</span>
                                <span className="text-xs font-medium">{preset.nameHe}</span>
                              </div>
                              <div className="text-sm font-semibold text-primary">
                                {formatNumber(data.pricePerSqmAvg)} ₪/מ"ר
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                {data.trend === 'rising' ? (
                                  <TrendUp className="text-success" size={12} weight="bold" />
                                ) : data.trend === 'declining' ? (
                                  <TrendDown className="text-destructive" size={12} weight="bold" />
                                ) : null}
                                <span className={cn(
                                  "text-xs",
                                  data.trend === 'rising' ? "text-success" : 
                                  data.trend === 'declining' ? "text-destructive" : 
                                  "text-muted-foreground"
                                )}>
                                  {data.trendPercent > 0 ? '+' : ''}{data.trendPercent}%
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
