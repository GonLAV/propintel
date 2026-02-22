import { useState } from 'react'
import { motion } from 'framer-motion'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Camera,
  Ruler,
  Crosshair,
  Users,
  Clock,
  Calendar,
  Copy,
  ArrowLeft,
  Trash,
  Eye,
  Download,
  UserPlus,
  CheckCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { ARSession, Property } from '@/lib/types'

interface ARSessionsViewerProps {
  property: Property
  onBack: () => void
  onStartSession: () => void
  onJoinSession: (sessionId: string) => void
}

export function ARSessionsViewer({ property, onBack: _onBack, onStartSession, onJoinSession }: ARSessionsViewerProps) {
  const [arSessions, setArSessions] = useKV<ARSession[]>('ar-sessions', [])
  const [selectedSession, setSelectedSession] = useState<ARSession | null>(null)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'solo' | 'collaborative'>('all')

  const propertySessions = (arSessions || [])
    .filter(s => s.propertyId === property.id)
    .filter(s => filterType === 'all' || s.type === filterType)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק סשן זה?')) {
      setArSessions((prev) => (prev || []).filter(s => s.id !== sessionId))
      setSelectedSession(null)
      toast.success('הסשן נמחק בהצלחה')
    }
  }

  const handleJoinSession = () => {
    const session = (arSessions || []).find(s => s.shareCode === joinCode)
    if (session) {
      onJoinSession(session.id)
      setShowJoinDialog(false)
      setJoinCode('')
    } else {
      toast.error('קוד סשן לא תקין')
    }
  }

  const copyShareCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('קוד הועתק ללוח')
  }

  const exportSession = (session: ARSession) => {
    const data = JSON.stringify(session, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ar-session-${session.id}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('הסשן יוצא בהצלחה')
  }

  if (selectedSession) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <Button onClick={() => setSelectedSession(null)} variant="outline" className="gap-2">
            <ArrowLeft size={18} />
            חזור לרשימת סשנים
          </Button>
          <div className="flex items-center gap-2">
            <Button onClick={() => exportSession(selectedSession)} variant="outline" className="gap-2">
              <Download size={18} />
              ייצוא
            </Button>
            <Button onClick={() => handleDeleteSession(selectedSession.id)} variant="destructive" className="gap-2">
              <Trash size={18} />
              מחק
            </Button>
          </div>
        </div>

        <Card className="glass-effect">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{selectedSession.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedSession.description}</p>
              </div>
              <Badge variant={selectedSession.type === 'collaborative' ? 'default' : 'secondary'}>
                {selectedSession.type === 'collaborative' ? 'שיתופי' : 'יחיד'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-effect p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock size={16} />
                  משך
                </div>
                <div className="text-2xl font-mono font-bold">{formatDuration(selectedSession.duration)}</div>
              </div>
              <div className="glass-effect p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Camera size={16} />
                  תמונות
                </div>
                <div className="text-2xl font-mono font-bold">{selectedSession.photos.length}</div>
              </div>
              <div className="glass-effect p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Ruler size={16} />
                  מדידות
                </div>
                <div className="text-2xl font-mono font-bold">{selectedSession.measurements.length}</div>
              </div>
              <div className="glass-effect p-4 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Crosshair size={16} />
                  הערות
                </div>
                <div className="text-2xl font-mono font-bold">{selectedSession.annotations.length}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Calendar size={20} />
                פרטי סשן
              </h3>
              <div className="glass-effect p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">תאריך התחלה:</span>
                  <span className="font-mono">{formatDate(selectedSession.startedAt)}</span>
                </div>
                {selectedSession.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">תאריך סיום:</span>
                    <span className="font-mono">{formatDate(selectedSession.completedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">סטטוס:</span>
                  <Badge variant={selectedSession.status === 'completed' ? 'default' : 'secondary'}>
                    {selectedSession.status === 'active' && 'פעיל'}
                    {selectedSession.status === 'paused' && 'מושהה'}
                    {selectedSession.status === 'completed' && 'הושלם'}
                    {selectedSession.status === 'archived' && 'בארכיון'}
                  </Badge>
                </div>
                {selectedSession.shareCode && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">קוד שיתוף:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-accent">{selectedSession.shareCode}</span>
                      <Button size="icon" variant="ghost" onClick={() => copyShareCode(selectedSession.shareCode || '')}>
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedSession.participants.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users size={20} />
                  משתתפים ({selectedSession.participants.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedSession.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="glass-effect p-3 rounded-lg flex items-center gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ background: participant.color }}
                      >
                        {participant.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-xs text-muted-foreground">{participant.role}</div>
                      </div>
                      {participant.id === selectedSession.hostId && (
                        <Badge variant="outline">מארח</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSession.measurements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Ruler size={20} />
                  מדידות
                </h3>
                <div className="glass-effect p-4 rounded-lg space-y-2 max-h-64 overflow-y-auto">
                  {selectedSession.measurements.map((measurement) => (
                    <div key={measurement.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-mono font-bold">{measurement.value} {measurement.unit}</span>
                        <span className="text-muted-foreground">({measurement.type})</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{measurement.createdBy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSession.annotations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Crosshair size={20} />
                  הערות
                </h3>
                <div className="glass-effect p-4 rounded-lg space-y-3 max-h-64 overflow-y-auto">
                  {selectedSession.annotations.map((annotation) => (
                    <div key={annotation.id} className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={annotation.type === 'issue' ? 'destructive' : 'default'} className="text-xs">
                              {annotation.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{annotation.createdBy}</span>
                          </div>
                          <p className="text-sm">{annotation.text}</p>
                        </div>
                      </div>
                      {annotation.replies && annotation.replies.length > 0 && (
                        <div className="ml-6 space-y-2 border-l-2 border-border pl-3">
                          {annotation.replies.map((reply) => (
                            <div key={reply.id} className="text-xs">
                              <span className="font-semibold text-accent">{reply.createdBy}: </span>
                              <span className="text-muted-foreground">{reply.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSession.photos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Camera size={20} />
                  תמונות שצולמו
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedSession.photos.map((photo, i) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer glass-effect"
                    >
                      <img src={photo.dataUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" variant="outline">
                          <Eye size={16} />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/70 px-2 py-1 rounded">
                        {photo.capturedBy}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">סיורי AR</h2>
          <p className="text-muted-foreground">{property.address.street}, {property.address.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowJoinDialog(true)} variant="outline" className="gap-2">
            <UserPlus size={18} />
            הצטרף לסשן
          </Button>
          <Button onClick={onStartSession} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground glow-accent">
            <Camera size={20} weight="fill" />
            התחל סשן חדש
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => setFilterType('all')}
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
        >
          הכל ({(arSessions || []).filter(s => s.propertyId === property.id).length})
        </Button>
        <Button
          onClick={() => setFilterType('solo')}
          variant={filterType === 'solo' ? 'default' : 'outline'}
          size="sm"
        >
          יחיד ({(arSessions || []).filter(s => s.propertyId === property.id && s.type === 'solo').length})
        </Button>
        <Button
          onClick={() => setFilterType('collaborative')}
          variant={filterType === 'collaborative' ? 'default' : 'outline'}
          size="sm"
        >
          שיתופי ({(arSessions || []).filter(s => s.propertyId === property.id && s.type === 'collaborative').length})
        </Button>
      </div>

      {propertySessions.length === 0 ? (
        <Card className="glass-effect">
          <CardContent className="p-12 text-center">
            <Camera size={64} className="mx-auto mb-4 text-muted-foreground" weight="duotone" />
            <h3 className="text-xl font-semibold mb-2">אין סשנים עדיין</h3>
            <p className="text-muted-foreground mb-6">התחל סשן AR חדש כדי לתעד את הנכס</p>
            <Button onClick={onStartSession} className="gap-2 bg-primary">
              <Camera size={20} weight="fill" />
              התחל סשן ראשון
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {propertySessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="glass-effect cursor-pointer transition-all hover:scale-[1.02] hover:glow-primary group"
                onClick={() => setSelectedSession(session)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant={session.type === 'collaborative' ? 'default' : 'secondary'}>
                      {session.type === 'collaborative' ? (
                        <><Users size={14} className="mr-1" /> שיתופי</>
                      ) : (
                        'יחיד'
                      )}
                    </Badge>
                    <Badge variant="outline">
                      {session.status === 'active' && 'פעיל'}
                      {session.status === 'paused' && 'מושהה'}
                      {session.status === 'completed' && 'הושלם'}
                      {session.status === 'archived' && 'בארכיון'}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                    {session.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {formatDate(session.startedAt)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      {formatDuration(session.duration)}
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs font-mono">
                    <div className="bg-secondary/50 px-2 py-1 rounded">
                      <Camera size={12} className="inline mr-1" />
                      {session.photos.length}
                    </div>
                    <div className="bg-secondary/50 px-2 py-1 rounded">
                      <Ruler size={12} className="inline mr-1" />
                      {session.measurements.length}
                    </div>
                    <div className="bg-secondary/50 px-2 py-1 rounded">
                      <Crosshair size={12} className="inline mr-1" />
                      {session.annotations.length}
                    </div>
                  </div>

                  {session.type === 'collaborative' && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users size={14} />
                        {session.participants.length} משתתפים
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={24} className="text-primary" />
              הצטרף לסשן שיתופי
            </DialogTitle>
            <DialogDescription>
              הזן את קוד הסשן שקיבלת מהמארח
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="הזן קוד סשן..."
              className="font-mono text-lg text-center"
              maxLength={6}
            />
            <Button onClick={handleJoinSession} className="w-full gap-2">
              <CheckCircle size={18} />
              הצטרף לסשן
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
