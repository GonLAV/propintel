import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Client, Property, Report, UpdateRequest } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  Eye,
  PaperPlaneTilt,
  XCircle,
  ArrowCounterClockwise,
  Sparkle,
  Link as LinkIcon
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'

const log = createLogger('ClientPortalManagement')
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

interface ClientPortalManagementProps {
  clients: Client[]
  properties: Property[]
  onSelectProperty: (property: Property) => void
}

export function ClientPortalManagement({ clients, properties, onSelectProperty }: ClientPortalManagementProps) {
  const [reports, setReports] = useKV<Report[]>('client-portal-reports', [])
  const [updateRequests, setUpdateRequests] = useKV<UpdateRequest[]>('client-portal-requests', [])
  const [selectedRequest, setSelectedRequest] = useState<UpdateRequest | null>(null)
  const [responseText, setResponseText] = useState('')
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('requests')

  const pendingRequests = (updateRequests || []).filter(r => 
    r.status === 'pending' || r.status === 'in-review' || r.status === 'in-progress'
  )
  const completedRequests = (updateRequests || []).filter(r => 
    r.status === 'completed' || r.status === 'rejected'
  )

  const handleUpdateRequestStatus = (requestId: string, status: UpdateRequest['status'], response?: string) => {
    setUpdateRequests((current) => {
      const arr = current || []
      return arr.map(r => 
        r.id === requestId 
          ? { 
              ...r, 
              status, 
              response: response || r.response,
              updatedAt: new Date().toISOString(),
              completedAt: (status === 'completed' || status === 'rejected') ? new Date().toISOString() : r.completedAt
            }
          : r
      )
    })
  }

  const handleOpenResponse = (request: UpdateRequest) => {
    setSelectedRequest(request)
    setResponseText(request.response || '')
    setShowResponseDialog(true)
  }

  const handleSubmitResponse = () => {
    if (!selectedRequest || !responseText) {
      toast.error('אנא הזן תגובה')
      return
    }

    handleUpdateRequestStatus(selectedRequest.id, 'completed', responseText)
    setShowResponseDialog(false)
    setSelectedRequest(null)
    setResponseText('')
    toast.success('התגובה נשלחה ללקוח בהצלחה')
  }

  const handleGenerateAIResponse = async () => {
    if (!selectedRequest) return

    const property = properties.find(p => p.id === selectedRequest.propertyId)
    const client = clients.find(c => c.id === selectedRequest.clientId)
    
    try {
      const promptText = `אתה שמאי נדל"ן מקצועי. צור תגובה מקצועית בעברית לבקשת העדכון הבאה:

כותרת: ${selectedRequest.title}
תיאור: ${selectedRequest.description}
${property ? `נכס: ${property.address.street}, ${property.address.city}` : ''}
${client ? `לקוח: ${client.name}` : ''}

צור תגובה מקצועית, ברורה ומועילה שמסבירה איך תטפל בבקשה או מה הצעדים הבאים.`

      const response = await toast.promise(
        window.spark.llm(promptText, 'gpt-4o-mini'),
        {
          loading: 'מייצר תגובה...',
          success: 'תגובה נוצרה בהצלחה!',
          error: 'שגיאה ביצירת תגובה'
        }
      )
      
      if (typeof response === 'string') {
        setResponseText(response)
      }
    } catch (error) {
      log.error('Error generating response:', error)
    }
  }

  const copyPortalLink = () => {
    const url = window.location.origin + '?portal=true'
    navigator.clipboard.writeText(url)
    toast.success('הקישור הועתק ללוח')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            ניהול פורטל לקוחות
          </h2>
          <p className="text-muted-foreground">נהל דוחות ובקשות עדכון מלקוחות</p>
        </div>
        <Button onClick={copyPortalLink} variant="outline" className="gap-2">
          <LinkIcon size={18} />
          העתק קישור לפורטל
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard
          icon={<FileText size={24} weight="duotone" />}
          title="דוחות שפורסמו"
          value={(reports || []).length}
          color="from-primary to-primary/70"
        />
        <StatsCard
          icon={<Clock size={24} weight="duotone" />}
          title="בקשות ממתינות"
          value={pendingRequests.length}
          color="from-warning to-warning/70"
        />
        <StatsCard
          icon={<CheckCircle size={24} weight="duotone" />}
          title="בקשות שטופלו"
          value={completedRequests.length}
          color="from-success to-success/70"
        />
        <StatsCard
          icon={<Users size={24} weight="duotone" />}
          title="לקוחות פעילים"
          value={clients.length}
          color="from-accent to-accent/70"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-effect p-1.5">
          <TabsTrigger value="requests" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <PaperPlaneTilt size={18} weight="duotone" />
            בקשות עדכון ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText size={18} weight="duotone" />
            דוחות מפורסמים
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CheckCircle size={18} weight="duotone" />
            בקשות שטופלו
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6 space-y-4">
          {pendingRequests.length === 0 ? (
            <Card className="glass-effect border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle size={64} weight="duotone" className="text-success mb-4" />
                <p className="text-muted-foreground text-center">כל הבקשות טופלו! אין בקשות ממתינות</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request, index) => (
              <RequestManagementCard
                key={request.id}
                request={request}
                client={clients.find(c => c.id === request.clientId)}
                property={properties.find(p => p.id === request.propertyId)}
                index={index}
                onUpdateStatus={handleUpdateRequestStatus}
                onRespond={handleOpenResponse}
                onViewProperty={(p) => p && onSelectProperty(p)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ReportsManagementTab
            reports={reports || []}
            clients={clients}
            properties={properties}
            onUpdateReport={(report) => {
              setReports((current) => {
                const arr = current || []
                const index = arr.findIndex(r => r.id === report.id)
                if (index >= 0) {
                  const updated = [...arr]
                  updated[index] = report
                  return updated
                }
                return [...arr, report]
              })
            }}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-4">
          {completedRequests.length === 0 ? (
            <Card className="glass-effect border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Clock size={64} weight="duotone" className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">אין בקשות שטופלו עדיין</p>
              </CardContent>
            </Card>
          ) : (
            completedRequests.map((request, index) => (
              <CompletedRequestCard
                key={request.id}
                request={request}
                client={clients.find(c => c.id === request.clientId)}
                property={properties.find(p => p.id === request.propertyId)}
                index={index}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="sm:max-w-[700px] glass-effect">
          <DialogHeader>
            <DialogTitle className="text-2xl">תגובה לבקשת עדכון</DialogTitle>
            {selectedRequest && (
              <DialogDescription>{selectedRequest.title}</DialogDescription>
            )}
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-sm font-medium mb-2">תיאור הבקשה:</p>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="response">התגובה שלך</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAIResponse}
                    className="gap-2"
                  >
                    <Sparkle size={16} weight="fill" />
                    צור תגובה AI
                  </Button>
                </div>
                <Textarea
                  id="response"
                  placeholder="כתוב את התגובה ללקוח..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>ביטול</Button>
            <Button onClick={handleSubmitResponse} className="bg-linear-to-r from-primary to-accent">
              <CheckCircle size={18} weight="fill" className="ml-2" />
              שלח תגובה וסמן כהושלם
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatsCard({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Card className="glass-effect border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-linear-to-br ${color} text-white`}>
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-3xl font-bold font-mono">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RequestManagementCard({ 
  request, 
  client, 
  property,
  index,
  onUpdateStatus,
  onRespond,
  onViewProperty
}: {
  request: UpdateRequest
  client?: Client
  property?: Property
  index: number
  onUpdateStatus: (id: string, status: UpdateRequest['status']) => void
  onRespond: (request: UpdateRequest) => void
  onViewProperty: (property?: Property) => void
}) {
  const priorityConfig = {
    'low': { label: 'נמוכה', color: 'bg-muted text-muted-foreground' },
    'medium': { label: 'בינונית', color: 'bg-warning/20 text-warning-foreground' },
    'high': { label: 'גבוהה', color: 'bg-destructive/20 text-destructive' },
    'urgent': { label: 'דחופה', color: 'bg-destructive text-destructive-foreground' }
  }

  const statusConfig = {
    'pending': { label: 'ממתין', color: 'bg-muted text-muted-foreground' },
    'in-review': { label: 'בבדיקה', color: 'bg-warning text-warning-foreground' },
    'in-progress': { label: 'בטיפול', color: 'bg-primary text-primary-foreground' }
  }

  const priority = priorityConfig[request.priority]
  const status = statusConfig[request.status as keyof typeof statusConfig]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-effect border-border/50 hover:border-primary/50 transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{request.title}</CardTitle>
              <div className="space-y-2 text-sm text-muted-foreground">
                {client && (
                  <p className="flex items-center gap-2">
                    <Users size={16} />
                    {client.name} ({client.email})
                  </p>
                )}
                {property && (
                  <p className="flex items-center gap-2">
                    <FileText size={16} />
                    {property.address.street}, {property.address.city}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className={priority.color} variant="secondary">
                {priority.label}
              </Badge>
              <Badge className={status.color} variant="secondary">
                {status.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm whitespace-pre-wrap">{request.description}</p>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>נשלח {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: he })}</span>
          </div>

          <div className="flex gap-2 pt-4 border-t border-border/50">
            {property && (
              <Button variant="outline" size="sm" onClick={() => onViewProperty(property)}>
                <Eye size={16} className="ml-2" />
                צפה בנכס
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onUpdateStatus(request.id, 'in-review')}
              disabled={request.status === 'in-review'}
            >
              <Clock size={16} className="ml-2" />
              סמן בבדיקה
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onUpdateStatus(request.id, 'in-progress')}
              disabled={request.status === 'in-progress'}
            >
              <ArrowCounterClockwise size={16} className="ml-2" />
              התחל טיפול
            </Button>
            <Button 
              size="sm"
              onClick={() => onRespond(request)}
              className="bg-linear-to-r from-primary to-accent"
            >
              <CheckCircle size={16} weight="fill" className="ml-2" />
              הוסף תגובה
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CompletedRequestCard({ 
  request, 
  client, 
  property: _property,
  index
}: {
  request: UpdateRequest
  client?: Client
  property?: Property
  index: number
}) {
  const isCompleted = request.status === 'completed'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="glass-effect border-border/50 opacity-80">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2 flex items-center gap-2">
                {request.title}
                {isCompleted ? (
                  <CheckCircle size={20} weight="fill" className="text-success" />
                ) : (
                  <XCircle size={20} weight="fill" className="text-destructive" />
                )}
              </CardTitle>
              <CardDescription>
                {client?.name} • {formatDistanceToNow(new Date(request.completedAt!), { addSuffix: true, locale: he })}
              </CardDescription>
            </div>
            <Badge className={isCompleted ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
              {isCompleted ? 'הושלם' : 'נדחה'}
            </Badge>
          </div>
        </CardHeader>
        {request.response && (
          <CardContent>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium mb-2">תגובתך:</p>
              <p className="text-sm whitespace-pre-wrap">{request.response}</p>
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  )
}

function ReportsManagementTab({ 
  reports, 
  clients, 
  properties,
  onUpdateReport
}: {
  reports: Report[]
  clients: Client[]
  properties: Property[]
  onUpdateReport: (report: Report) => void
}) {
  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <Card className="glass-effect border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText size={64} weight="duotone" className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">אין דוחות מפורסמים עדיין</p>
            <p className="text-sm text-muted-foreground mt-2">דוחות יופיעו כאן לאחר שתייצא אותם ללקוחות</p>
          </CardContent>
        </Card>
      ) : (
        reports.map((report, index) => {
          const client = clients.find(c => c.id === report.clientId)
          const property = properties.find(p => p.id === report.propertyId)

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass-effect border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{report.title}</CardTitle>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {client && <p>לקוח: {client.name}</p>}
                        {property && <p>נכס: {property.address.street}, {property.address.city}</p>}
                      </div>
                    </div>
                    <Badge>{report.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      נוצר {formatDistanceToNow(new Date(report.generatedAt), { addSuffix: true, locale: he })}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onUpdateReport({ ...report, status: 'delivered' })
                          toast.success('הדוח סומן כנמסר')
                        }}
                        disabled={report.status === 'delivered'}
                      >
                        סמן כנמסר
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })
      )}
    </div>
  )
}
