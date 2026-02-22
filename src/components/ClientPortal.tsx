import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { Client, Property, Report, UpdateRequest, ClientActivity } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  FileText, 
  Download, 
  Eye, 
  PaperPlaneTilt, 
  ChatText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Warning,
  ArrowCounterClockwise,
  MagnifyingGlass,
  SortAscending,
  Sparkle,
  Bell,
  House,
  User,
  SignOut
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'
import { uid } from '@/lib/utils'

interface ClientPortalProps {
  clients: Client[]
  properties: Property[]
  onBackToAdmin: () => void
}

export function ClientPortal({ clients, properties, onBackToAdmin }: ClientPortalProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [reports, _setReports] = useKV<Report[]>('client-portal-reports', [])
  const [updateRequests, setUpdateRequests] = useKV<UpdateRequest[]>('client-portal-requests', [])
  const [activities, setActivities] = useKV<ClientActivity[]>('client-portal-activities', [])
  const [activeTab, setActiveTab] = useState('reports')
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'property'>('date')

  const handleLogin = () => {
    const client = clients.find(c => c.email.toLowerCase() === loginEmail.toLowerCase())
    if (client) {
      setSelectedClient(client)
      setIsAuthenticated(true)
      logActivity(client.id, 'login', 'התחברות לפורטל לקוח')
      toast.success(`ברוך הבא, ${client.name}!`)
    } else {
      toast.error('אימייל לא נמצא במערכת')
    }
  }

  const handleLogout = () => {
    if (selectedClient) {
      logActivity(selectedClient.id, 'login', 'התנתקות מפורטל לקוח')
    }
    setIsAuthenticated(false)
    setSelectedClient(null)
    setLoginEmail('')
  }

  const logActivity = (clientId: string, type: ClientActivity['type'], description: string, metadata?: Record<string, any>) => {
    const newActivity: ClientActivity = {
      id: uid('activity'),
      clientId,
      type,
      description,
      metadata,
      timestamp: new Date().toISOString()
    }
    setActivities((current) => [newActivity, ...(current || [])])
  }

  const clientReports = (reports || []).filter(r => r.clientId === selectedClient?.id)
  const clientProperties = (properties || []).filter(p => selectedClient?.properties.includes(p.id))
  const clientRequests = (updateRequests || []).filter(r => r.clientId === selectedClient?.id)
  const clientActivities = (activities || []).filter(a => a.clientId === selectedClient?.id).slice(0, 10)

  const filteredReports = clientReports.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    properties.find(p => p.id === r.propertyId)?.address.street.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    } else if (sortBy === 'status') {
      return a.status.localeCompare(b.status)
    } else {
      const propA = properties.find(p => p.id === a.propertyId)
      const propB = properties.find(p => p.id === b.propertyId)
      return (propA?.address.street || '').localeCompare(propB?.address.street || '')
    }
  })

  if (!isAuthenticated) {
    return <LoginScreen email={loginEmail} setEmail={setLoginEmail} onLogin={handleLogin} onBack={onBackToAdmin} />
  }

  if (!selectedClient) return null

  return (
    <div className="min-h-screen bg-background">
      <ClientPortalHeader client={selectedClient} onLogout={handleLogout} />
      
      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                פורטל לקוח
              </h1>
              <p className="text-muted-foreground">צפייה בדוחות ובקשת עדכונים</p>
            </div>
            <Button 
              onClick={() => setShowRequestDialog(true)} 
              size="lg" 
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground glow-accent"
            >
              <PaperPlaneTilt size={20} weight="fill" />
              בקשת עדכון
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <StatsCard
              icon={<FileText size={24} weight="duotone" />}
              title="דוחות זמינים"
              value={clientReports.length}
              color="from-primary to-primary/70"
            />
            <StatsCard
              icon={<House size={24} weight="duotone" />}
              title="נכסים"
              value={clientProperties.length}
              color="from-accent to-accent/70"
            />
            <StatsCard
              icon={<ChatText size={24} weight="duotone" />}
              title="בקשות פתוחות"
              value={clientRequests.filter(r => r.status !== 'completed' && r.status !== 'rejected').length}
              color="from-success to-success/70"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="glass-effect p-1.5">
              <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText size={18} weight="duotone" />
                דוחות
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ChatText size={18} weight="duotone" />
                בקשות עדכון
              </TabsTrigger>
              <TabsTrigger value="properties" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <House size={18} weight="duotone" />
                הנכסים שלי
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Clock size={18} weight="duotone" />
                פעילות
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="mt-6 space-y-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder="חיפוש דוחות..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SortAscending size={18} className="ml-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">תאריך</SelectItem>
                    <SelectItem value="status">סטטוס</SelectItem>
                    <SelectItem value="property">נכס</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {sortedReports.map((report, index) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      property={properties.find(p => p.id === report.propertyId)}
                      index={index}
                      onView={(r) => {
                        setSelectedReport(r)
                        logActivity(selectedClient.id, 'view-report', `צפייה בדוח: ${r.title}`, { reportId: r.id })
                      }}
                      onDownload={(r) => {
                        logActivity(selectedClient.id, 'download-report', `הורדת דוח: ${r.title}`, { reportId: r.id })
                        toast.success('הדוח הורד בהצלחה')
                      }}
                    />
                  ))}
                </AnimatePresence>
                {sortedReports.length === 0 && (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <FileText size={64} weight="duotone" className="text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        {searchQuery ? 'לא נמצאו דוחות התואמים לחיפוש' : 'אין דוחות זמינים כרגע'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <RequestsTab
                requests={clientRequests}
                properties={clientProperties}
                reports={clientReports}
                onUpdateRequest={(request) => {
                  setUpdateRequests((current) => {
                    const arr = current || []
                    const index = arr.findIndex(r => r.id === request.id)
                    if (index >= 0) {
                      const updated = [...arr]
                      updated[index] = request
                      return updated
                    }
                    return arr
                  })
                }}
              />
            </TabsContent>

            <TabsContent value="properties" className="mt-6">
              <PropertiesTab properties={clientProperties} />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <ActivityTab activities={clientActivities} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <RequestDialog
        open={showRequestDialog}
        onClose={() => setShowRequestDialog(false)}
        properties={clientProperties}
        reports={clientReports}
        onSubmit={(request) => {
          const newRequest: UpdateRequest = {
            ...request,
            id: uid('req'),
            clientId: selectedClient.id,
            status: 'pending',
            requestedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          setUpdateRequests((current) => [newRequest, ...(current || [])])
          logActivity(selectedClient.id, 'create-request', `בקשת עדכון חדשה: ${request.title}`, { requestId: newRequest.id })
          setShowRequestDialog(false)
          toast.success('הבקשה נשלחה בהצלחה!')
        }}
      />

      {selectedReport && (
        <ReportViewDialog
          report={selectedReport}
          property={properties.find(p => p.id === selectedReport.propertyId)}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  )
}

function LoginScreen({ email, setEmail, onLogin, onBack }: { 
  email: string
  setEmail: (v: string) => void
  onLogin: () => void
  onBack: () => void
}) {
  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative"
      >
        <Card className="glass-effect border-border/50 shadow-2xl">
          <CardHeader className="space-y-4 text-center pb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-accent flex items-center justify-center glow-primary">
              <User size={32} weight="duotone" className="text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">פורטל לקוח</CardTitle>
              <CardDescription className="text-base mt-2">
                הזן את כתובת האימייל שלך כדי להיכנס
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                className="text-lg h-12"
              />
            </div>
            <Button 
              onClick={onLogin} 
              className="w-full h-12 text-lg bg-linear-to-r from-primary to-accent hover:opacity-90 glow-primary"
              disabled={!email}
            >
              כניסה לפורטל
            </Button>
            <Button 
              onClick={onBack} 
              variant="ghost" 
              className="w-full"
            >
              חזרה לממשק מנהל
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          נתקלת בבעיה? צור קשר עם השמאי שלך
        </p>
      </motion.div>
    </div>
  )
}

function ClientPortalHeader({ client, onLogout }: { client: Client; onLogout: () => void }) {
  return (
    <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center glow-primary">
            <House size={24} weight="duotone" className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AppraisalPro</h1>
            <p className="text-sm text-muted-foreground">פורטל לקוח</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          </Button>
          
          <Separator orientation="vertical" className="h-8" />
          
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={client.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {client.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-xs text-muted-foreground">{client.email}</p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onLogout} title="התנתק">
            <SignOut size={20} />
          </Button>
        </div>
      </div>
    </header>
  )
}

function StatsCard({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-effect border-border/50 hover:border-primary/50 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-linear-to-br ${color} text-white`}>
              {icon}
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-3xl font-bold font-mono">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ReportCard({ 
  report, 
  property, 
  index,
  onView, 
  onDownload 
}: { 
  report: Report
  property?: Property
  index: number
  onView: (r: Report) => void
  onDownload: (r: Report) => void
}) {
  const statusConfig = {
    'draft': { label: 'טיוטה', color: 'bg-muted text-muted-foreground', icon: <Clock size={16} /> },
    'pending-review': { label: 'ממתין לאישור', color: 'bg-warning text-warning-foreground', icon: <Warning size={16} weight="fill" /> },
    'completed': { label: 'הושלם', color: 'bg-success text-success-foreground', icon: <CheckCircle size={16} weight="fill" /> },
    'delivered': { label: 'נמסר', color: 'bg-primary text-primary-foreground', icon: <CheckCircle size={16} weight="fill" /> }
  }

  const status = statusConfig[report.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      layout
    >
      <Card className="glass-effect border-border/50 hover:border-primary/50 transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText size={24} weight="duotone" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{report.title}</h3>
                  {property && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <House size={16} />
                      {property.address.street}, {property.address.city}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock size={16} />
                  {formatDistanceToNow(new Date(report.generatedAt), { addSuffix: true, locale: he })}
                </span>
                <Badge className={status.color} variant="secondary">
                  <span className="flex items-center gap-1.5">
                    {status.icon}
                    {status.label}
                  </span>
                </Badge>
                <span className="uppercase text-xs font-mono">{report.format}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => onView(report)}
                className="opacity-70 group-hover:opacity-100 transition-opacity"
                title="צפייה"
              >
                <Eye size={18} />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => onDownload(report)}
                className="opacity-70 group-hover:opacity-100 transition-opacity"
                title="הורדה"
              >
                <Download size={18} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RequestsTab({ 
  requests, 
  properties, 
  reports: _reports,
  onUpdateRequest: _onUpdateRequest 
}: { 
  requests: UpdateRequest[]
  properties: Property[]
  reports: Report[]
  onUpdateRequest: (request: UpdateRequest) => void
}) {
  const priorityConfig = {
    'low': { label: 'נמוכה', color: 'bg-muted text-muted-foreground' },
    'medium': { label: 'בינונית', color: 'bg-warning/20 text-warning-foreground' },
    'high': { label: 'גבוהה', color: 'bg-destructive/20 text-destructive' },
    'urgent': { label: 'דחופה', color: 'bg-destructive text-destructive-foreground' }
  }

  const statusConfig = {
    'pending': { label: 'ממתין', color: 'bg-muted text-muted-foreground', icon: <Clock size={16} /> },
    'in-review': { label: 'בבדיקה', color: 'bg-warning text-warning-foreground', icon: <Eye size={16} /> },
    'in-progress': { label: 'בטיפול', color: 'bg-primary text-primary-foreground', icon: <ArrowCounterClockwise size={16} /> },
    'completed': { label: 'הושלם', color: 'bg-success text-success-foreground', icon: <CheckCircle size={16} weight="fill" /> },
    'rejected': { label: 'נדחה', color: 'bg-destructive text-destructive-foreground', icon: <XCircle size={16} weight="fill" /> }
  }

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <Card className="glass-effect border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChatText size={64} weight="duotone" className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">אין בקשות עדכון כרגע</p>
          </CardContent>
        </Card>
      ) : (
        requests.map((request, index) => {
          const property = properties.find(p => p.id === request.propertyId)
          const priority = priorityConfig[request.priority]
          const status = statusConfig[request.status]

          return (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass-effect border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{request.title}</CardTitle>
                      {property && (
                        <CardDescription className="flex items-center gap-2">
                          <House size={16} />
                          {property.address.street}, {property.address.city}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge className={priority.color} variant="secondary">
                        {priority.label}
                      </Badge>
                      <Badge className={status.color} variant="secondary">
                        <span className="flex items-center gap-1.5">
                          {status.icon}
                          {status.label}
                        </span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                  </div>

                  {request.response && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Sparkle size={16} weight="fill" className="text-primary" />
                        תגובת השמאי:
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{request.response}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>נשלח {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: he })}</span>
                    {request.completedAt && (
                      <span>הושלם {formatDistanceToNow(new Date(request.completedAt), { addSuffix: true, locale: he })}</span>
                    )}
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

function PropertiesTab({ properties }: { properties: Property[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {properties.length === 0 ? (
        <Card className="glass-effect border-border/50 md:col-span-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <House size={64} weight="duotone" className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">אין נכסים רשומים</p>
          </CardContent>
        </Card>
      ) : (
        properties.map((property, index) => (
          <motion.div
            key={property.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass-effect border-border/50 hover:border-primary/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg">{property.address.street}</CardTitle>
                <CardDescription>{property.address.city}, {property.address.neighborhood}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">שטח</p>
                    <p className="font-mono font-semibold">{property.details.builtArea} מ״ר</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">חדרים</p>
                    <p className="font-mono font-semibold">{property.details.rooms}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">קומה</p>
                    <p className="font-mono font-semibold">{property.details.floor} מתוך {property.details.totalFloors}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">מצב</p>
                    <p className="text-sm">{property.details.condition}</p>
                  </div>
                </div>

                {property.valuationData && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground mb-2">שווי משוער</p>
                    <p className="text-2xl font-mono font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                      ₪{property.valuationData.estimatedValue.toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  )
}

function ActivityTab({ activities }: { activities: ClientActivity[] }) {
  const activityIcons = {
    'login': <User size={20} weight="duotone" />,
    'view-report': <Eye size={20} weight="duotone" />,
    'download-report': <Download size={20} weight="duotone" />,
    'create-request': <PaperPlaneTilt size={20} weight="duotone" />,
    'message': <ChatText size={20} weight="duotone" />,
    'update-request': <ArrowCounterClockwise size={20} weight="duotone" />
  }

  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <CardTitle>פעילות אחרונה</CardTitle>
        <CardDescription>היסטוריית הפעולות שלך בפורטל</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Clock size={64} weight="duotone" className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">אין פעילות עדיין</p>
              </div>
            ) : (
              activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                    {activityIcons[activity.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: he })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function RequestDialog({ 
  open, 
  onClose, 
  properties, 
  reports,
  onSubmit 
}: { 
  open: boolean
  onClose: () => void
  properties: Property[]
  reports: Report[]
  onSubmit: (request: Omit<UpdateRequest, 'id' | 'clientId' | 'status' | 'requestedAt' | 'updatedAt'>) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<UpdateRequest['priority']>('medium')
  const [propertyId, setPropertyId] = useState('')
  const [reportId, setReportId] = useState('')

  const handleSubmit = () => {
    if (!title || !description) {
      toast.error('אנא מלא את כל השדות הנדרשים')
      return
    }

    onSubmit({
      title,
      description,
      priority,
      propertyId: propertyId || properties[0]?.id || '',
      reportId: reportId || undefined
    })

    setTitle('')
    setDescription('')
    setPriority('medium')
    setPropertyId('')
    setReportId('')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] glass-effect">
        <DialogHeader>
          <DialogTitle className="text-2xl">בקשת עדכון חדשה</DialogTitle>
          <DialogDescription>
            שלח בקשה לשמאי שלך לעדכון או שינוי בדוח
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="property">נכס</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger id="property">
                <SelectValue placeholder="בחר נכס" />
              </SelectTrigger>
              <SelectContent>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.address.street}, {property.address.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report">דוח (אופציונלי)</Label>
            <Select value={reportId} onValueChange={setReportId}>
              <SelectTrigger id="report">
                <SelectValue placeholder="בחר דוח" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">אין דוח ספציפי</SelectItem>
                {reports.map(report => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">כותרת הבקשה</Label>
            <Input
              id="title"
              placeholder="לדוגמה: עדכון שווי נכס"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור הבקשה</Label>
            <Textarea
              id="description"
              placeholder="פרט את בקשתך..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">עדיפות</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as UpdateRequest['priority'])}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">נמוכה</SelectItem>
                <SelectItem value="medium">בינונית</SelectItem>
                <SelectItem value="high">גבוהה</SelectItem>
                <SelectItem value="urgent">דחופה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button 
            onClick={handleSubmit}
            className="bg-linear-to-r from-primary to-accent hover:opacity-90"
          >
            <PaperPlaneTilt size={18} weight="fill" className="ml-2" />
            שלח בקשה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReportViewDialog({ 
  report, 
  property, 
  onClose 
}: { 
  report: Report
  property?: Property
  onClose: () => void
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] glass-effect">
        <DialogHeader>
          <DialogTitle className="text-2xl">{report.title}</DialogTitle>
          {property && (
            <DialogDescription className="flex items-center gap-2">
              <House size={16} />
              {property.address.street}, {property.address.city}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div>
                <p className="text-sm text-muted-foreground mb-1">סטטוס</p>
                <Badge>{report.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">פורמט</p>
                <p className="font-mono">{report.format.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">נוצר ב</p>
                <p className="text-sm">{new Date(report.generatedAt).toLocaleDateString('he-IL')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">שמאי</p>
                <p className="text-sm">{report.appraiserName}</p>
              </div>
            </div>

            {report.sections.filter(s => s.enabled).map(section => (
              <div key={section.id} className="space-y-2">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                  <p className="whitespace-pre-wrap text-sm">{section.content || 'תוכן לא זמין'}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>סגור</Button>
          <Button className="gap-2">
            <Download size={18} />
            הורדה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
