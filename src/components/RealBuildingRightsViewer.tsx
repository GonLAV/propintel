import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MagnifyingGlass, 
  CheckCircle, 
  WarningCircle, 
  Info,
  Buildings,
  File,
  Warning,
  CheckSquare,
  Database
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { unifiedGovAPI, type UnifiedBuildingRights } from '@/lib/unifiedGovAPI'
import { GovAPIStatus } from './GovAPIStatus'
import { createLogger } from '@/lib/logger'

const log = createLogger('RealBuildingRightsViewer')

export function RealBuildingRightsViewer() {
  const [gush, setGush] = useState('')
  const [helka, setHelka] = useState('')
  const [address, setAddress] = useState('')
  const [planNumber, setPlanNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<UnifiedBuildingRights | null>(null)

  const handleSearchByParcel = async () => {
    if (!gush || !helka) {
      toast.error('יש להזין גוש וחלקה')
      return
    }

    setLoading(true)
    try {
      const result = await unifiedGovAPI.fetchBuildingRights(gush, helka, address || undefined)
      setData(result)
      
      if (result.sources.length === 0) {
        toast.warning('לא נמצאו נתונים ממקורות ממשלתיים')
      } else {
        toast.success(`נמצאו נתונים מ-${result.sources.length} מקורות`)
      }
    } catch (error) {
      log.error(error)
      toast.error('שגיאה בשליפת נתונים')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setLoading(true)
    try {
      const status = await unifiedGovAPI.testAllConnections()
      
      if (status.overall) {
        toast.success(
          `חיבור תקין:\niPlan: ${status.iPlan ? '✓' : '✗'}\nמבא"ת: ${status.mavat ? '✓' : '✗'}`
        )
      } else {
        toast.error('אין חיבור לשירותים ממשלתיים')
      }
    } catch (_error) {
      toast.error('שגיאה בבדיקת חיבור')
    } finally {
      setLoading(false)
    }
  }

  const getDataQualityBadge = (quality: string) => {
    switch (quality) {
      case 'high':
        return <Badge className="bg-success text-success-foreground">איכות גבוהה</Badge>
      case 'medium':
        return <Badge className="bg-warning text-warning-foreground">איכות בינונית</Badge>
      case 'low':
        return <Badge variant="destructive">איכות נמוכה</Badge>
      default:
        return <Badge variant="outline">לא ידוע</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-6 h-6" />
                שליפת זכויות בנייה אמיתיות
              </CardTitle>
              <CardDescription>
                חיבור ישיר ל-iPlan ומבא"ת הממשלתיים לשליפה אוטומטית של זכויות בנייה
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              המערכת מתחברת ישירות ל-iPlan (מינהל התכנון) ומבא"ת (מאגר מידע ארצי תכנוני) 
              לשליפת נתונים אמיתיים. השירותים הממשלתיים זמינים ללא צורך במפתח API.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="parcel" dir="rtl">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="parcel">חיפוש לפי גוש/חלקה</TabsTrigger>
              <TabsTrigger value="plan">חיפוש לפי תכנית</TabsTrigger>
            </TabsList>

            <TabsContent value="parcel" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gush">גוש</Label>
                  <Input
                    id="gush"
                    placeholder="לדוגמה: 6157"
                    value={gush}
                    onChange={(e) => setGush(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="helka">חלקה</Label>
                  <Input
                    id="helka"
                    placeholder="לדוגמה: 42"
                    value={helka}
                    onChange={(e) => setHelka(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">כתובת (אופציונלי)</Label>
                <Input
                  id="address"
                  placeholder="לדוגמה: רחוב הרצל 10, תל אביב"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSearchByParcel} disabled={loading} className="flex-1">
                  <MagnifyingGlass className="w-4 h-4 ml-2" />
                  {loading ? 'מושך נתונים...' : 'שלוף זכויות בנייה'}
                </Button>
                <Button onClick={handleTestConnection} variant="outline" disabled={loading}>
                  בדוק חיבור
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="planNumber">מספר תכנית</Label>
                <Input
                  id="planNumber"
                  placeholder="לדוגמה: 415-0792036"
                  value={planNumber}
                  onChange={(e) => setPlanNumber(e.target.value)}
                />
              </div>

              <Button onClick={() => toast.info('בקרוב...')} disabled={loading} className="w-full">
                <File className="w-4 h-4 ml-2" />
                שלוף תכנית
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>תוצאות חיפוש</CardTitle>
              {getDataQualityBadge(data.dataQuality)}
            </div>
            <CardDescription>
              גוש {data.gush}, חלקה {data.helka}
              {data.address && ` • ${data.address}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                {/* מקורות נתונים */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    מקורות נתונים
                  </h3>
                  <div className="flex gap-2">
                    {data.sources.map(source => (
                      <Badge key={source} variant="outline">{source}</Badge>
                    ))}
                    {data.sources.length === 0 && (
                      <Badge variant="outline">אין נתונים</Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* זכויות בנייה נוכחיות */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Buildings className="w-4 h-4" />
                    זכויות בנייה נוכחיות
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {data.currentRights.buildingPercentage && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">אחוזי בנייה</div>
                        <div className="text-2xl font-bold">{data.currentRights.buildingPercentage}%</div>
                      </div>
                    )}
                    {data.currentRights.maxFloors && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">קומות מקסימליות</div>
                        <div className="text-2xl font-bold">{data.currentRights.maxFloors}</div>
                      </div>
                    )}
                    {data.currentRights.maxHeight && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">גובה מקסימלי</div>
                        <div className="text-2xl font-bold">{data.currentRights.maxHeight} מ'</div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">שימוש עיקרי</div>
                      <div className="text-lg font-semibold">{data.currentRights.mainUse}</div>
                    </div>
                  </div>

                  {data.currentRights.allowedUses.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs text-muted-foreground">שימושים מותרים</div>
                      <div className="flex flex-wrap gap-2">
                        {data.currentRights.allowedUses.map(use => (
                          <Badge key={use} variant="secondary">{use}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.currentRights.landUseZone && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs text-muted-foreground">אזור שימוש</div>
                      <Badge variant="outline">{data.currentRights.landUseZone}</Badge>
                    </div>
                  )}
                </div>

                <Separator />

                {/* תכניות חלות (מ-iPlan) */}
                {data.iPlanData?.applicablePlans && data.iPlanData.applicablePlans.length > 0 && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <File className="w-4 h-4" />
                        תכניות חלות (iPlan)
                      </h3>
                      <div className="space-y-3">
                        {data.iPlanData.applicablePlans.map((plan, i) => (
                          <Card key={i}>
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold">{plan.planNumber}</div>
                                  <Badge variant="outline">{plan.planStatus}</Badge>
                                </div>
                                {plan.planName && (
                                  <div className="text-sm text-muted-foreground">{plan.planName}</div>
                                )}
                                {plan.approvalDate && (
                                  <div className="text-xs text-muted-foreground">
                                    תאריך אישור: {new Date(plan.approvalDate).toLocaleDateString('he-IL')}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* היתרי בנייה (ממבא"ת) */}
                {data.mavatData.permits.length > 0 && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" />
                        היתרי בנייה (מבא"ת)
                      </h3>
                      <div className="space-y-3">
                        {data.mavatData.permits.map((permit, i) => (
                          <Card key={i}>
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold">היתר {permit.permitNumber}</div>
                                  <Badge variant={permit.status === 'אושר' ? 'default' : 'outline'}>
                                    {permit.status}
                                  </Badge>
                                </div>
                                <div className="text-sm">{permit.permitType}</div>
                                {permit.description && (
                                  <div className="text-sm text-muted-foreground">{permit.description}</div>
                                )}
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  {permit.plannedArea && (
                                    <div>
                                      <span className="text-muted-foreground">שטח: </span>
                                      {permit.plannedArea} מ"ר
                                    </div>
                                  )}
                                  {permit.floors && (
                                    <div>
                                      <span className="text-muted-foreground">קומות: </span>
                                      {permit.floors}
                                    </div>
                                  )}
                                  {permit.units && (
                                    <div>
                                      <span className="text-muted-foreground">יח"ד: </span>
                                      {permit.units}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* עבירות בנייה */}
                {data.mavatData.violations.length > 0 && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-destructive">
                        <Warning className="w-4 h-4" />
                        עבירות בנייה (מבא"ת)
                      </h3>
                      <div className="space-y-3">
                        {data.mavatData.violations.map((violation, i) => (
                          <Alert key={i} variant="destructive">
                            <WarningCircle className="w-4 h-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                <div className="font-semibold">{violation.type}</div>
                                <div className="text-sm">סטטוס: {violation.status}</div>
                                <div className="text-sm">חומרה: {violation.severity}</div>
                                {violation.description && (
                                  <div className="text-sm">{violation.description}</div>
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* סטטוס משפטי */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">סטטוס משפטי</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      {data.legalStatus.hasViolations ? (
                        <WarningCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-success" />
                      )}
                      <div>
                        <div className="text-sm">עבירות בנייה</div>
                        <div className="text-xs text-muted-foreground">
                          {data.legalStatus.hasViolations 
                            ? `${data.legalStatus.violationCount} עבירות` 
                            : 'אין עבירות'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {data.legalStatus.hasActivePermits ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Info className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="text-sm">היתרים פעילים</div>
                        <div className="text-xs text-muted-foreground">
                          {data.legalStatus.hasActivePermits 
                            ? `${data.legalStatus.permitCount} היתרים` 
                            : 'אין היתרים פעילים'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {data.legalStatus.conservation ? (
                        <Info className="w-5 h-5 text-warning" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="text-sm">שימור</div>
                        <div className="text-xs text-muted-foreground">
                          {data.legalStatus.conservation ? 'נכס בשימור' : 'לא בשימור'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {data.legalStatus.expropriation ? (
                        <WarningCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="text-sm">הפקעה</div>
                        <div className="text-xs text-muted-foreground">
                          {data.legalStatus.expropriation ? 'יש הפקעה' : 'אין הפקעה'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* מטא-נתונים */}
                <div className="pt-4 border-t text-xs text-muted-foreground">
                  עדכון אחרון: {new Date(data.lastUpdate).toLocaleString('he-IL')}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
        </div>
        
        <div className="lg:col-span-1">
          <GovAPIStatus />
        </div>
      </div>
    </div>
  )
}
