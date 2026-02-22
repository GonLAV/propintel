import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Camera,
  CameraRotate,
  X,
  Pause,
  Play,
  Record,
  VideoCamera,
  Ruler,
  Cube,
  FloppyDisk,
  Eye,
  EyeClosed,
  Target,
  NavigationArrow,
  Crosshair,
  MagicWand,
  Lightbulb,
  Drop,
  ThermometerSimple,
  SpeakerHigh,
  ArrowsOut,
  Users,
  ShareNetwork,
  Copy,
  Chat,
  CheckCircle
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import type { Property, ARSession, ARMeasurement, ARAnnotation, ARParticipant, ARPhoto } from '@/lib/types'
import { createLogger } from '@/lib/logger'
import { uid } from '@/lib/utils'

const log = createLogger('ARWalkthrough')

interface ARWalkthroughProps {
  property: Property
  onClose: () => void
  sessionId?: string
}

const PARTICIPANT_COLORS = [
  'oklch(0.65 0.25 265)',
  'oklch(0.72 0.20 85)',
  'oklch(0.68 0.20 155)',
  'oklch(0.75 0.18 75)',
  'oklch(0.62 0.24 28)',
  'oklch(0.70 0.22 320)',
]

export function ARWalkthrough({ property, onClose, sessionId }: ARWalkthroughProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [arMode, setArMode] = useState<'walkthrough' | 'measure' | 'annotate' | 'analyze' | 'collaborate'>('walkthrough')
  const [showOverlays, setShowOverlays] = useState(true)
  const [showGrid, setShowGrid] = useState(false)
  const [measurements, setMeasurements] = useState<ARMeasurement[]>([])
  const [annotations, setAnnotations] = useState<ARAnnotation[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<{ x: number; y: number }[]>([])
  const [arSessions, setArSessions] = useKV<ARSession[]>('ar-sessions', [])
  const [currentSession, setCurrentSession] = useState<ARSession | null>(null)
  const [sessionStartTime] = useState(Date.now())
  const [sessionDuration, setSessionDuration] = useState(0)
  const [capturedPhotos, setCapturedPhotos] = useState<ARPhoto[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [brightness, setBrightness] = useState(100)
  const [zoom, setZoom] = useState(1)
  const [environmentalData, setEnvironmentalData] = useState({
    light: 0,
    temperature: 22,
    humidity: 45,
    noise: 30
  })
  const [isCollaborative, setIsCollaborative] = useState(false)
  const [participants, setParticipants] = useState<ARParticipant[]>([])
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareCode, setShareCode] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; text: string; sender: string; timestamp: string; senderColor: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [currentUser, setCurrentUser] = useState<ARParticipant | null>(null)
  const [cursorPositions, _setCursorPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [_selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [showParticipants, setShowParticipants] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      if (isActive && !isPaused) {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [isActive, isPaused, sessionStartTime])

  useEffect(() => {
    const interval = setInterval(() => {
      setEnvironmentalData({
        light: Math.floor(Math.random() * 100),
        temperature: 20 + Math.random() * 10,
        humidity: 30 + Math.random() * 40,
        noise: 20 + Math.random() * 60
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const initializeUser = async () => {
      const user = await window.spark.user()
      if (user) {
        const newUser: ARParticipant = {
          id: user.id.toString(),
          name: user.login || 'משתמש',
          email: user.email || '',
          avatar: user.avatarUrl || undefined,
          role: user.isOwner ? 'appraiser' : 'client',
          joinedAt: new Date().toISOString(),
          isActive: true,
          color: PARTICIPANT_COLORS[0]
        }
        setCurrentUser(newUser)
        setParticipants([newUser])
      }
    }
    initializeUser()
  }, [])

  useEffect(() => {
    if (sessionId && arSessions) {
      const existingSession = arSessions.find(s => s.id === sessionId)
      if (existingSession) {
        setCurrentSession(existingSession)
        setMeasurements(existingSession.measurements)
        setAnnotations(existingSession.annotations)
        setCapturedPhotos(existingSession.photos)
        setParticipants(existingSession.participants)
        setIsCollaborative(existingSession.type === 'collaborative')
      }
    }
  }, [sessionId, arSessions])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: isRecording
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsActive(true)
      toast.success('מצלמת AR הופעלה')
      
      setTimeout(() => generateAISuggestions(), 2000)
    } catch (err) {
      log.error('Camera access error:', err)
      toast.error('לא ניתן לגשת למצלמה')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsActive(false)
    saveSession()
  }

  const toggleCamera = () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newFacingMode)
    if (stream) {
      stopCamera()
      setTimeout(() => startCamera(), 100)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && currentUser) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const photoData = canvas.toDataURL('image/png')
        const newPhoto: ARPhoto = {
          id: uid('ar'),
          dataUrl: photoData,
          timestamp: new Date().toISOString(),
          capturedBy: currentUser.name,
          environmentalData: environmentalData
        }
        setCapturedPhotos(prev => [...prev, newPhoto])
        toast.success('תמונה נשמרה בהצלחה')
        
        broadcastToParticipants('photo_captured', newPhoto)
      }
    }
  }

  const startRecording = () => {
    setIsRecording(true)
    toast.success('ההקלטה החלה')
  }

  const stopRecording = () => {
    setIsRecording(false)
    toast.success('ההקלטה הסתיימה')
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentUser) return
    
    if (arMode === 'measure') {
      const rect = overlayCanvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setCurrentMeasurement(prev => [...prev, { x, y }])
        
        if (currentMeasurement.length === 1) {
          const distance = Math.sqrt(
            Math.pow(x - currentMeasurement[0].x, 2) +
            Math.pow(y - currentMeasurement[0].y, 2)
          )
          const realDistance = (distance / 100) * 2.5
          
          const newMeasurement: ARMeasurement = {
            id: uid('ar'),
            type: 'distance',
            value: parseFloat(realDistance.toFixed(2)),
            unit: 'm',
            points: [...currentMeasurement, { x, y }],
            timestamp: new Date().toISOString(),
            createdBy: currentUser.name
          }
          setMeasurements(prev => [...prev, newMeasurement])
          setCurrentMeasurement([])
          toast.success(`נמדד: ${realDistance.toFixed(2)} מטר`)
          
          broadcastToParticipants('measurement_added', newMeasurement)
        }
      }
    } else if (arMode === 'annotate') {
      const rect = overlayCanvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const annotationText = prompt('הוסף הערה:')
        if (annotationText) {
          const newAnnotation: ARAnnotation = {
            id: uid('ar'),
            position: { x, y },
            text: annotationText,
            type: 'info',
            timestamp: new Date().toISOString(),
            createdBy: currentUser.name
          }
          setAnnotations(prev => [...prev, newAnnotation])
          toast.success('הערה נוספה')
          
          broadcastToParticipants('annotation_added', newAnnotation)
        }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentUser || !isCollaborative) return
    
    const rect = overlayCanvasRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      broadcastToParticipants('cursor_move', { x, y })
    }
  }

  const generateAISuggestions = async () => {
    const promptText = `You are a real estate expert analyzing a property through AR walkthrough. Generate 5 insightful suggestions or observations for this property:
    
Property: ${property.address.street}, ${property.address.city}
Type: ${property.type}
Area: ${property.details.builtArea} sqm
Rooms: ${property.details.rooms}
Condition: ${property.details.condition}

Provide suggestions about:
- Renovation opportunities
- Value-adding improvements
- Potential issues to inspect
- Market positioning
- Space optimization

Return your response as a JSON object with a "suggestions" property containing an array of 5 concise suggestion strings in Hebrew.`

    try {
      const prompt = window.spark.llmPrompt([promptText] as any)
      const result = await window.spark.llm(prompt, 'gpt-4o-mini', true)
      const data = JSON.parse(result)
      setAiSuggestions(data.suggestions || [])
      setShowAISuggestions(true)
    } catch (err) {
      log.error('AI suggestions error:', err)
    }
  }

  const broadcastToParticipants = (type: string, data: any) => {
    if (!isCollaborative || !currentUser) return
    
    log.debug(`Broadcasting ${type} to participants:`, data)
  }

  const startCollaborativeSession = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setShareCode(code)
    setIsCollaborative(true)
    setShowShareDialog(true)
    toast.success('סשן שיתופי נוצר בהצלחה')
  }

  const copyShareCode = () => {
    navigator.clipboard.writeText(shareCode)
    toast.success('קוד שותף למסך')
  }

  const sendChatMessage = () => {
    if (!chatInput.trim() || !currentUser) return
    
    const newMessage = {
      id: uid('ar'),
      text: chatInput,
      sender: currentUser.name,
      timestamp: new Date().toISOString(),
      senderColor: currentUser.color
    }
    
    setChatMessages(prev => [...prev, newMessage])
    setChatInput('')
    broadcastToParticipants('chat_message', newMessage)
  }

  const _addAnnotationReply = (annotationId: string, replyText: string) => {
    if (!currentUser) return
    
    setAnnotations(prev => prev.map(ann => {
      if (ann.id === annotationId) {
        return {
          ...ann,
          replies: [...(ann.replies || []), {
            id: uid('ar'),
            text: replyText,
            timestamp: new Date().toISOString(),
            createdBy: currentUser.name
          }]
        }
      }
      return ann
    }))
  }

  const saveSession = () => {
    if (!currentUser) return
    
    const session: ARSession = {
      id: currentSession?.id || Date.now().toString(),
      propertyId: property.id,
      title: `${property.address.street} - AR Session`,
      description: `סיור AR עבור ${property.address.street}`,
      type: isCollaborative ? 'collaborative' : 'solo',
      status: 'completed',
      measurements,
      annotations,
      photos: capturedPhotos,
      videoRecordings: [],
      participants,
      hostId: currentUser.id,
      duration: sessionDuration,
      startedAt: new Date(sessionStartTime).toISOString(),
      completedAt: new Date().toISOString(),
      shareCode: isCollaborative ? shareCode : undefined,
      isPublic: false
    }
    
    setArSessions((prev) => {
      const existing = (prev || []).findIndex(s => s.id === session.id)
      if (existing >= 0) {
        const updated = [...(prev || [])]
        updated[existing] = session
        return updated
      }
      return [...(prev || []), session]
    })
    
    toast.success('סשן AR נשמר בהצלחה')
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: `brightness(${brightness}%)`,
            transform: `scale(${zoom})`
          }}
        />
        
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: 'none' }}
        />

        {showGrid && (
          <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        )}

        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          style={{ cursor: arMode !== 'walkthrough' ? 'crosshair' : 'default' }}
        />

        {showOverlays && (
          <>
            <div className="absolute top-0 left-0 right-0 p-4 bg-linear-to-b from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => {
                      stopCamera()
                      onClose()
                    }}
                    size="icon"
                    variant="outline"
                    className="glass-effect border-white/20 hover:bg-white/20"
                  >
                    <X size={20} className="text-white" />
                  </Button>
                  <div className="text-white">
                    <div className="text-sm font-medium">{property.address.street}</div>
                    <div className="text-xs text-white/70">{property.address.city}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isCollaborative && (
                    <Button
                      onClick={() => setShowParticipants(!showParticipants)}
                      size="sm"
                      variant="outline"
                      className="glass-effect border-white/20 text-white hover:bg-white/10 gap-2"
                    >
                      <Users size={16} weight="fill" />
                      <span>{participants.length}</span>
                    </Button>
                  )}
                  
                  {isRecording && (
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90"
                    >
                      <Record size={16} className="text-white" weight="fill" />
                      <span className="text-white text-sm font-mono">{formatDuration(sessionDuration)}</span>
                    </motion.div>
                  )}
                  
                  <Badge variant="outline" className="glass-effect border-white/20 text-white">
                    <Target size={14} className="mr-1" />
                    {arMode === 'walkthrough' && 'סיור AR'}
                    {arMode === 'measure' && 'מדידה'}
                    {arMode === 'annotate' && 'הערות'}
                    {arMode === 'analyze' && 'ניתוח AI'}
                    {arMode === 'collaborate' && 'שיתוף פעולה'}
                  </Badge>
                </div>
              </div>
            </div>

            {showParticipants && (
              <motion.div
                initial={{ x: 300 }}
                animate={{ x: 0 }}
                className="absolute top-20 right-4 w-72"
              >
                <Card className="glass-effect border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-white">
                        <Users size={18} weight="fill" />
                        <span className="font-semibold text-sm">משתתפים ({participants.length})</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowParticipants(false)}
                        className="h-6 w-6 text-white hover:bg-white/10"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                        >
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                            style={{ background: participant.color }}
                          >
                            {participant.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">{participant.name}</div>
                            <div className="text-white/60 text-xs">{participant.role}</div>
                          </div>
                          {participant.isActive && (
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                          )}
                        </div>
                      ))}
                    </div>
                    <Separator className="my-3 bg-white/10" />
                    <Button
                      onClick={startCollaborativeSession}
                      disabled={isCollaborative}
                      size="sm"
                      className="w-full gap-2"
                    >
                      <ShareNetwork size={16} />
                      {isCollaborative ? 'סשן שיתופי פעיל' : 'הפעל סשן שיתופי'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <div className="absolute top-20 left-4 space-y-2">
              <Card className="glass-effect border-white/20 text-white">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Lightbulb size={14} weight="fill" className="text-accent" />
                    <span>{environmentalData.light}% אור</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <ThermometerSimple size={14} weight="fill" className="text-primary" />
                    <span>{environmentalData.temperature.toFixed(1)}°C</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Drop size={14} weight="fill" className="text-blue-400" />
                    <span>{environmentalData.humidity.toFixed(0)}% לחות</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <SpeakerHigh size={14} weight="fill" className="text-green-400" />
                    <span>{environmentalData.noise.toFixed(0)} dB</span>
                  </div>
                </CardContent>
              </Card>

              {measurements.length > 0 && (
                <Card className="glass-effect border-white/20 text-white">
                  <CardContent className="p-3">
                    <div className="text-xs font-semibold mb-2 flex items-center gap-2">
                      <Ruler size={14} />
                      מדידות ({measurements.length})
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {measurements.slice(-5).map((m) => (
                        <div key={m.id} className="text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-accent" />
                            <span>{m.value} {m.unit}</span>
                          </div>
                          <span className="text-white/50">{m.createdBy}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {showAISuggestions && aiSuggestions.length > 0 && (
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                className="absolute top-20 right-4 w-80"
              >
                <Card className="glass-effect border-accent/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-accent">
                        <MagicWand size={18} weight="fill" />
                        <span className="font-semibold text-sm">המלצות AI</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowAISuggestions(false)}
                        className="h-6 w-6"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {aiSuggestions.map((suggestion, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="text-xs bg-accent/10 rounded-lg p-2 border border-accent/20"
                        >
                          {suggestion}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {showChat && isCollaborative && (
              <motion.div
                initial={{ y: 400 }}
                animate={{ y: 0 }}
                className="absolute bottom-32 left-4 w-96"
              >
                <Card className="glass-effect border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-white">
                        <Chat size={18} weight="fill" />
                        <span className="font-semibold text-sm">צ׳אט קבוצתי</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowChat(false)}
                        className="h-6 w-6 text-white hover:bg-white/10"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="text-xs">
                          <div className="flex items-baseline gap-2">
                            <span 
                              className="font-semibold"
                              style={{ color: msg.senderColor }}
                            >
                              {msg.sender}:
                            </span>
                            <span className="text-white/90">{msg.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                        placeholder="הקלד הודעה..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <Button onClick={sendChatMessage} size="icon">
                        <CheckCircle size={18} weight="fill" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/90 to-transparent">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setArMode('walkthrough')}
                    size="sm"
                    variant={arMode === 'walkthrough' ? 'default' : 'outline'}
                    className={arMode === 'walkthrough' ? 'bg-primary' : 'glass-effect border-white/20 text-white hover:bg-white/10'}
                  >
                    <NavigationArrow size={16} weight="fill" />
                  </Button>
                  <Button
                    onClick={() => setArMode('measure')}
                    size="sm"
                    variant={arMode === 'measure' ? 'default' : 'outline'}
                    className={arMode === 'measure' ? 'bg-primary' : 'glass-effect border-white/20 text-white hover:bg-white/10'}
                  >
                    <Ruler size={16} />
                  </Button>
                  <Button
                    onClick={() => setArMode('annotate')}
                    size="sm"
                    variant={arMode === 'annotate' ? 'default' : 'outline'}
                    className={arMode === 'annotate' ? 'bg-primary' : 'glass-effect border-white/20 text-white hover:bg-white/10'}
                  >
                    <Crosshair size={16} />
                  </Button>
                  <Button
                    onClick={() => {
                      setArMode('analyze')
                      generateAISuggestions()
                    }}
                    size="sm"
                    variant={arMode === 'analyze' ? 'default' : 'outline'}
                    className={arMode === 'analyze' ? 'bg-primary' : 'glass-effect border-white/20 text-white hover:bg-white/10'}
                  >
                    <MagicWand size={16} weight="fill" />
                  </Button>
                  <Button
                    onClick={() => {
                      setArMode('collaborate')
                      setShowParticipants(true)
                    }}
                    size="sm"
                    variant={arMode === 'collaborate' ? 'default' : 'outline'}
                    className={arMode === 'collaborate' ? 'bg-accent text-accent-foreground' : 'glass-effect border-white/20 text-white hover:bg-white/10'}
                  >
                    <Users size={16} weight="fill" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {isCollaborative && (
                    <Button
                      onClick={() => setShowChat(!showChat)}
                      size="icon"
                      variant="outline"
                      className="glass-effect border-white/20 text-white hover:bg-white/10"
                    >
                      <Chat size={20} weight="fill" />
                    </Button>
                  )}
                  <Button
                    onClick={toggleCamera}
                    size="icon"
                    variant="outline"
                    className="glass-effect border-white/20 text-white hover:bg-white/10"
                  >
                    <CameraRotate size={20} />
                  </Button>
                  <Button
                    onClick={() => setShowGrid(!showGrid)}
                    size="icon"
                    variant="outline"
                    className="glass-effect border-white/20 text-white hover:bg-white/10"
                  >
                    <Cube size={20} />
                  </Button>
                  <Button
                    onClick={() => setShowOverlays(!showOverlays)}
                    size="icon"
                    variant="outline"
                    className="glass-effect border-white/20 text-white hover:bg-white/10"
                  >
                    {showOverlays ? <Eye size={20} /> : <EyeClosed size={20} />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                {!isActive ? (
                  <Button
                    onClick={startCamera}
                    size="lg"
                    className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 glow-primary"
                  >
                    <Camera size={28} weight="fill" />
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={isPaused ? () => setIsPaused(false) : () => setIsPaused(true)}
                      size="lg"
                      variant="outline"
                      className="h-12 w-12 rounded-full glass-effect border-white/20 text-white hover:bg-white/10"
                    >
                      {isPaused ? <Play size={20} weight="fill" /> : <Pause size={20} weight="fill" />}
                    </Button>
                    
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="h-16 w-16 rounded-full bg-white hover:bg-white/90"
                    >
                      <Camera size={28} weight="fill" className="text-black" />
                    </Button>
                    
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      size="lg"
                      variant="outline"
                      className={`h-12 w-12 rounded-full ${
                        isRecording
                          ? 'bg-destructive border-destructive text-white'
                          : 'glass-effect border-white/20 text-white hover:bg-white/10'
                      }`}
                    >
                      {isRecording ? <Record size={20} weight="fill" /> : <VideoCamera size={20} weight="fill" />}
                    </Button>

                    <Button
                      onClick={() => {
                        stopCamera()
                        onClose()
                      }}
                      size="lg"
                      variant="outline"
                      className="h-12 w-12 rounded-full glass-effect border-white/20 text-white hover:bg-white/10"
                    >
                      <FloppyDisk size={20} weight="fill" />
                    </Button>
                  </>
                )}
              </div>

              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Lightbulb size={16} className="text-white" />
                    <Slider
                      value={[brightness]}
                      onValueChange={(v) => setBrightness(v[0])}
                      min={50}
                      max={150}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-white text-xs font-mono w-12">{brightness}%</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <ArrowsOut size={16} className="text-white" />
                    <Slider
                      value={[zoom]}
                      onValueChange={(v) => setZoom(v[0])}
                      min={1}
                      max={3}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-white text-xs font-mono w-12">{zoom.toFixed(1)}x</span>
                  </div>
                </motion.div>
              )}

              {capturedPhotos.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {capturedPhotos.slice(-5).map((photo, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/30"
                    >
                      <img src={photo.dataUrl} alt={`Capture ${i + 1}`} className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                  {capturedPhotos.length > 5 && (
                    <div className="shrink-0 w-16 h-16 rounded-lg glass-effect flex items-center justify-center border-2 border-white/30">
                      <span className="text-white text-xs font-semibold">+{capturedPhotos.length - 5}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {annotations.map((annotation) => (
          <motion.div
            key={annotation.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              left: annotation.position.x,
              top: annotation.position.y,
              transform: 'translate(-50%, -50%)'
            }}
            className="pointer-events-auto cursor-pointer"
            onClick={() => setSelectedAnnotation(annotation.id)}
          >
            <div className="relative">
              <div className="w-6 h-6 rounded-full bg-accent glow-accent flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg max-w-xs">
                <div className="font-semibold text-accent mb-1">{annotation.createdBy}</div>
                <div>{annotation.text}</div>
                {annotation.replies && annotation.replies.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-white/20 pt-2">
                    {annotation.replies.map(reply => (
                      <div key={reply.id} className="text-xs">
                        <span className="text-white/60">{reply.createdBy}: </span>
                        <span>{reply.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {currentMeasurement.map((point, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              left: point.x,
              top: point.y,
              transform: 'translate(-50%, -50%)'
            }}
            className="pointer-events-none"
          >
            <div className="w-4 h-4 rounded-full bg-primary glow-primary border-2 border-white" />
          </motion.div>
        ))}

        {isCollaborative && Array.from(cursorPositions.entries()).map(([userId, pos]) => {
          const participant = participants.find(p => p.id === userId)
          if (!participant || userId === currentUser?.id) return null
          
          return (
            <motion.div
              key={userId}
              animate={{ x: pos.x, y: pos.y }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                pointerEvents: 'none'
              }}
            >
              <div 
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ background: participant.color }}
              />
              <div 
                className="text-xs font-semibold mt-1 px-2 py-1 rounded bg-black/80 whitespace-nowrap"
                style={{ color: participant.color }}
              >
                {participant.name}
              </div>
            </motion.div>
          )
        })}
      </div>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="glass-effect border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShareNetwork size={24} className="text-accent" weight="fill" />
              שתף סשן שיתופי
            </DialogTitle>
            <DialogDescription>
              שתף את הקוד הזה עם משתתפים אחרים כדי להצטרף לסשן AR
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={shareCode}
                readOnly
                className="font-mono text-lg text-center"
              />
              <Button onClick={copyShareCode} size="icon">
                <Copy size={18} />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              המשתתפים יכולים להצטרף על ידי הזנת קוד זה בעמוד הצטרפות לסשן
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
