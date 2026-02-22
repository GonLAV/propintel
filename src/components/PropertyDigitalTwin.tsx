import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, FileText, Image, Cube, Camera, TrendUp, MapPin, Download, Share } from '@phosphor-icons/react'
import { Property } from '@/lib/types'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface PropertyDigitalTwinProps {
  property: Property
  onExport?: () => void
}

interface TimelineEvent {
  id: string
  type: 'created' | 'valuation' | 'inspection' | 'document' | 'ar_session' | 'update' | 'ownership_change'
  title: string
  description: string
  date: Date
  user: string
  metadata?: Record<string, any>
}

export function PropertyDigitalTwin({ property, onExport }: PropertyDigitalTwinProps) {
  const [activeTab, setActiveTab] = useState('timeline')

  const digitalTwinId = `DT-${property.id.substring(0, 6).toUpperCase()}`

  const timelineEvents: TimelineEvent[] = [
    {
      id: '1',
      type: 'created',
      title: 'נכס נוצר במערכת',
      description: 'פרופיל התאום הדיגיטלי נוצר',
      date: new Date(property.createdAt || Date.now()),
      user: 'מערכת'
    },
    {
      id: '2',
      type: 'inspection',
      title: 'ביקור שטח',
      description: 'ביצוע בדיקה פיזית של הנכס',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      user: 'שמאי ראשי'
    },
    {
      id: '3',
      type: 'valuation',
      title: 'שומה מקצועית',
      description: `שווי נקבע: ${property.valuationData?.estimatedValue?.toLocaleString('he-IL')}₪`,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      user: 'שמאי ראשי',
      metadata: { value: property.valuationData?.estimatedValue }
    },
    {
      id: '4',
      type: 'document',
      title: 'דוח שמאות הופק',
      description: 'דוח מקיף נוצר ונשלח ללקוח',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      user: 'מערכת'
    },
    {
      id: '5',
      type: 'ar_session',
      title: 'סיור AR',
      description: '12 מדידות, 8 הערות, 15 תמונות',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      user: 'שמאי מתמחה'
    }
  ]

  const stats = [
    { label: 'שומות שבוצעו', value: '3', icon: FileText, color: 'text-primary' },
    { label: 'ביקורי שטח', value: '5', icon: MapPin, color: 'text-accent' },
    { label: 'סיורי AR', value: '2', icon: Camera, color: 'text-success' },
    { label: 'תמונות', value: '47', icon: Image, color: 'text-warning' },
    { label: 'מודלים תלת מימד', value: '1', icon: Cube, color: 'text-chart-2' },
    { label: 'עדכוני שוק', value: '12', icon: TrendUp, color: 'text-chart-3' }
  ]

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created': return Clock
      case 'valuation': return TrendUp
      case 'inspection': return MapPin
      case 'document': return FileText
      case 'ar_session': return Camera
      case 'update': return Clock
      case 'ownership_change': return Share
    }
  }

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created': return 'bg-muted'
      case 'valuation': return 'bg-primary/20 border-primary'
      case 'inspection': return 'bg-accent/20 border-accent'
      case 'document': return 'bg-success/20 border-success'
      case 'ar_session': return 'bg-warning/20 border-warning'
      case 'update': return 'bg-muted'
      case 'ownership_change': return 'bg-chart-2/20 border-chart-2'
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="glass-effect border-border/50 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
                תאום דיגיטלי
              </h2>
              <Badge variant="outline" className="font-mono text-xs border-primary/30 bg-primary/10">
                {digitalTwinId}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              פרופיל דיגיטלי מלא עם היסטוריה, מסמכים ונתונים מצטברים
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Share size={16} weight="duotone" />
              שתף
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
              <Download size={16} weight="duotone" />
              ייצא
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="glass-effect border-border/30 p-4 hover:scale-105 transition-transform">
                <div className="flex flex-col gap-2">
                  <Icon size={24} weight="duotone" className={stat.color} />
                  <div className="font-mono text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </Card>
            )
          })}
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-effect">
          <TabsTrigger value="timeline" className="gap-2">
            <Clock size={16} weight="duotone" />
            היסטוריה
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText size={16} weight="duotone" />
            מסמכים
          </TabsTrigger>
          <TabsTrigger value="valuations" className="gap-2">
            <TrendUp size={16} weight="duotone" />
            שומות
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-2">
            <Image size={16} weight="duotone" />
            מדיה
          </TabsTrigger>
          <TabsTrigger value="3d" className="gap-2">
            <Cube size={16} weight="duotone" />
            מודלים תלת מימד
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Card className="glass-effect border-border/50">
            <ScrollArea className="h-[600px]">
              <div className="p-6 space-y-4">
                {timelineEvents.map((event, index) => {
                  const Icon = getEventIcon(event.type)
                  return (
                    <div key={event.id} className="relative">
                      {index < timelineEvents.length - 1 && (
                        <div className="absolute right-[19px] top-10 w-px h-[calc(100%+16px)] bg-border/30" />
                      )}
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${getEventColor(event.type)} relative z-10`}>
                          <Icon size={20} weight="duotone" />
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="font-semibold">{event.title}</h4>
                            <time className="text-xs text-muted-foreground font-mono">
                              {format(event.date, 'dd/MM/yyyy HH:mm', { locale: he })}
                            </time>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {event.user}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card className="glass-effect border-border/50 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 glass-effect rounded-lg border border-border/30 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText size={24} weight="duotone" className="text-primary" />
                  <div>
                    <h4 className="font-semibold">דוח שמאות מקיף.pdf</h4>
                    <p className="text-xs text-muted-foreground">2.3 MB • 15/01/2024</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download size={16} />
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 glass-effect rounded-lg border border-border/30 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText size={24} weight="duotone" className="text-accent" />
                  <div>
                    <h4 className="font-semibold">שומת בנק.pdf</h4>
                    <p className="text-xs text-muted-foreground">1.8 MB • 10/01/2024</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download size={16} />
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 glass-effect rounded-lg border border-border/30 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText size={24} weight="duotone" className="text-success" />
                  <div>
                    <h4 className="font-semibold">תכנית קומה.pdf</h4>
                    <p className="text-xs text-muted-foreground">856 KB • 05/01/2024</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download size={16} />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="valuations" className="mt-6">
          <Card className="glass-effect border-border/50 p-6">
            <div className="space-y-4">
              <div className="p-4 glass-effect rounded-lg border border-primary/30">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">שומה נוכחית</h4>
                    <p className="text-xs text-muted-foreground">15/01/2024</p>
                  </div>
                  <Badge className="bg-success/20 text-success border-success">אקטיבי</Badge>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">שיטת השוואה</div>
                    <div className="font-mono text-lg font-bold text-primary">
                      ₪{property.valuationData?.estimatedValue?.toLocaleString('he-IL') || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">שיטת עלות</div>
                    <div className="font-mono text-lg font-bold">
                      ₪{((property.valuationData?.estimatedValue || 0) * 1.05).toLocaleString('he-IL')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">שיטת היוון</div>
                    <div className="font-mono text-lg font-bold">
                      ₪{((property.valuationData?.estimatedValue || 0) * 0.98).toLocaleString('he-IL')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 glass-effect rounded-lg border border-border/30 opacity-60">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">שומה קודמת</h4>
                    <p className="text-xs text-muted-foreground">10/09/2023</p>
                  </div>
                  <Badge variant="outline">היסטורי</Badge>
                </div>
                <Separator className="my-3" />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">שווי</div>
                    <div className="font-mono text-lg font-bold">
                      ₪{((property.valuationData?.estimatedValue || 0) * 0.92).toLocaleString('he-IL')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">שינוי</div>
                    <div className="font-mono text-lg font-bold text-success">
                      +8.7%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">פער</div>
                    <div className="font-mono text-lg font-bold text-accent">
                      ₪{((property.valuationData?.estimatedValue || 0) * 0.08).toLocaleString('he-IL')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-6">
          <Card className="glass-effect border-border/50 p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-square glass-effect rounded-lg border border-border/30 flex items-center justify-center hover:border-primary/50 transition-colors cursor-pointer group">
                  <Image size={48} weight="duotone" className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="3d" className="mt-6">
          <Card className="glass-effect border-border/50 p-6">
            <div className="aspect-video glass-effect rounded-lg border border-border/30 flex flex-col items-center justify-center">
              <Cube size={64} weight="duotone" className="text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">מודל תלת מימד</h3>
              <p className="text-sm text-muted-foreground mb-4">גרסה אחרונה: 15/01/2024</p>
              <Button className="gap-2">
                <Cube size={16} weight="duotone" />
                פתח תצוגה תלת מימדית
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
