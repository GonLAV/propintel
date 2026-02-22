import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Square,
  Plus,
  Minus,
  ArrowsOutSimple,
  Ruler,
  FlowArrow,
  Sparkle,
  Download
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { uid } from '@/lib/utils'

interface Room {
  id: string
  type: string
  width: number
  length: number
  x: number
  y: number
  color: string
}

interface FloorPlanDesignerProps {
  onSave?: (rooms: Room[]) => void
}

export function FloorPlanDesigner({ onSave }: FloorPlanDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [tool, setTool] = useState<'select' | 'add-room' | 'measure'>('select')
  const [totalArea, setTotalArea] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const roomTypes = [
    { type: 'living', label: 'סלון', color: '#6b7aff' },
    { type: 'kitchen', label: 'מטבח', color: '#ffb366' },
    { type: 'bedroom', label: 'חדר שינה', color: '#66d9a6' },
    { type: 'bathroom', label: 'חדר רחצה', color: '#66c2ff' },
    { type: 'balcony', label: 'מרפסת', color: '#ffd966' },
    { type: 'storage', label: 'אחסון', color: '#999999' },
  ]

   
  useEffect(() => {
    drawFloorPlan()
    calculateTotalArea()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, selectedRoom])

  const drawFloorPlan = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#16161f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const gridSize = 20
    ctx.strokeStyle = '#2a2a3a'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    rooms.forEach((room) => {
      const isSelected = room.id === selectedRoom

      ctx.fillStyle = room.color + (isSelected ? 'aa' : '66')
      ctx.fillRect(room.x, room.y, room.width, room.length)

      ctx.strokeStyle = isSelected ? '#ffb366' : room.color
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.strokeRect(room.x, room.y, room.width, room.length)

      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Inter'
      ctx.textAlign = 'center'
      const roomLabel = roomTypes.find(t => t.type === room.type)?.label || room.type
      ctx.fillText(roomLabel, room.x + room.width / 2, room.y + room.length / 2 - 8)
      
      ctx.font = '10px JetBrains Mono'
      const area = ((room.width / 20) * (room.length / 20)).toFixed(1)
      ctx.fillText(`${area}m²`, room.x + room.width / 2, room.y + room.length / 2 + 8)

      if (isSelected) {
        const handleSize = 8
        ctx.fillStyle = '#ffb366'
        ctx.fillRect(room.x - handleSize / 2, room.y - handleSize / 2, handleSize, handleSize)
        ctx.fillRect(room.x + room.width - handleSize / 2, room.y - handleSize / 2, handleSize, handleSize)
        ctx.fillRect(room.x - handleSize / 2, room.y + room.length - handleSize / 2, handleSize, handleSize)
        ctx.fillRect(room.x + room.width - handleSize / 2, room.y + room.length - handleSize / 2, handleSize, handleSize)
      }
    })
  }

  const calculateTotalArea = () => {
    const total = rooms.reduce((sum, room) => {
      return sum + ((room.width / 20) * (room.length / 20))
    }, 0)
    setTotalArea(Math.round(total * 10) / 10)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (tool === 'add-room') {
      const newRoom: Room = {
        id: uid('room'),
        type: 'living',
        width: 100,
        length: 80,
        x: Math.round(x / 20) * 20,
        y: Math.round(y / 20) * 20,
        color: roomTypes[0].color
      }
      setRooms([...rooms, newRoom])
      setSelectedRoom(newRoom.id)
      setTool('select')
      toast.success('חדר נוסף בהצלחה')
    } else if (tool === 'select') {
      const clickedRoom = rooms.find(room => 
        x >= room.x && x <= room.x + room.width &&
        y >= room.y && y <= room.y + room.length
      )
      setSelectedRoom(clickedRoom?.id || null)
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedRoom || tool !== 'select') return
    
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDragging(true)
    setDragStart({ x, y })
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedRoom) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const dx = x - dragStart.x
    const dy = y - dragStart.y

    setRooms(rooms.map(room => {
      if (room.id === selectedRoom) {
        return {
          ...room,
          x: Math.max(0, Math.min(canvas.width - room.width, Math.round((room.x + dx) / 20) * 20)),
          y: Math.max(0, Math.min(canvas.height - room.length, Math.round((room.y + dy) / 20) * 20))
        }
      }
      return room
    }))

    setDragStart({ x, y })
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(false)
  }

  const handleDeleteRoom = () => {
    if (!selectedRoom) return
    setRooms(rooms.filter(r => r.id !== selectedRoom))
    setSelectedRoom(null)
    toast.success('חדר נמחק')
  }

  const handleRoomTypeChange = (type: string) => {
    if (!selectedRoom) return
    const roomType = roomTypes.find(t => t.type === type)
    if (!roomType) return

    setRooms(rooms.map(room => {
      if (room.id === selectedRoom) {
        return { ...room, type: roomType.type, color: roomType.color }
      }
      return room
    }))
  }

  const handleRoomResize = (dimension: 'width' | 'length', delta: number) => {
    if (!selectedRoom) return
    setRooms(rooms.map(room => {
      if (room.id === selectedRoom) {
        return {
          ...room,
          [dimension]: Math.max(40, room[dimension] + delta * 20)
        }
      }
      return room
    }))
  }

  const handleGenerateAILayout = async () => {
    const promptText = `Generate an optimal apartment floor plan layout. Create 4-5 rooms with realistic dimensions and positions.
    Return a JSON object with a "rooms" array where each room has:
    - type: one of [living, kitchen, bedroom, bathroom, balcony]
    - width: number (in pixels, 80-200)
    - length: number (in pixels, 60-160)
    - x: number (0-500)
    - y: number (0-400)
    
    Make sure rooms don't overlap and create a functional layout.`

    try {
      toast.loading('AI מייצר תוכנית קומה...', { id: 'ai-layout' })
      const response = await window.spark.llm(promptText, 'gpt-4o-mini', true)
      const data = JSON.parse(response)
      
      const generatedRooms: Room[] = data.rooms.map((r: any, _i: number) => ({
        id: uid('room'),
        type: r.type,
        width: r.width,
        length: r.length,
        x: r.x,
        y: r.y,
        color: roomTypes.find(t => t.type === r.type)?.color || '#6b7aff'
      }))

      setRooms(generatedRooms)
      toast.success('תוכנית קומה נוצרה בהצלחה!', { id: 'ai-layout' })
    } catch (_error) {
      toast.error('שגיאה ביצירת תוכנית', { id: 'ai-layout' })
    }
  }

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const dataURL = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = 'floor-plan.png'
    link.href = dataURL
    link.click()
    toast.success('תוכנית קומה נשמרה')
  }

  const handleSave = () => {
    if (onSave) {
      onSave(rooms)
    }
    toast.success('תוכנית נשמרה בהצלחה')
  }

  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Square size={24} weight="duotone" className="text-primary" />
            מעצב תוכנית קומה
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAILayout}
              className="gap-2 bg-linear-to-r from-primary/10 to-accent/10 border-primary/30"
            >
              <Sparkle size={16} weight="fill" />
              AI ייצר
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download size={16} />
              ייצוא
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={tool === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('select')}
            className={tool === 'select' ? 'bg-primary' : ''}
          >
            <ArrowsOutSimple size={16} className="mr-1" />
            בחר
          </Button>
          <Button
            variant={tool === 'add-room' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('add-room')}
            className={tool === 'add-room' ? 'bg-primary' : ''}
          >
            <Plus size={16} className="mr-1" />
            הוסף חדר
          </Button>
          <Button
            variant={tool === 'measure' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('measure')}
            className={tool === 'measure' ? 'bg-primary' : ''}
          >
            <Ruler size={16} className="mr-1" />
            מדידה
          </Button>
          {selectedRoom && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteRoom}
            >
              <Minus size={16} className="mr-1" />
              מחק
            </Button>
          )}
        </div>

        <div className="relative rounded-xl overflow-hidden border border-border/50">
          <canvas
            ref={canvasRef}
            width={700}
            height={500}
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="w-full cursor-crosshair"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="glass-effect p-4 rounded-lg">
            <div className="text-muted-foreground text-sm mb-1">שטח כולל</div>
            <div className="text-2xl font-mono font-bold text-primary">
              {totalArea}m²
            </div>
          </div>
          <div className="glass-effect p-4 rounded-lg">
            <div className="text-muted-foreground text-sm mb-1">מספר חדרים</div>
            <div className="text-2xl font-mono font-bold text-accent">
              {rooms.length}
            </div>
          </div>
          <div className="glass-effect p-4 rounded-lg">
            <div className="text-muted-foreground text-sm mb-1">חדרי שינה</div>
            <div className="text-2xl font-mono font-bold text-foreground">
              {rooms.filter(r => r.type === 'bedroom').length}
            </div>
          </div>
        </div>

        {selectedRoom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect p-4 rounded-lg space-y-4"
          >
            <h4 className="font-semibold">עריכת חדר</h4>
            
            <div className="space-y-2">
              <Label>סוג חדר</Label>
              <div className="grid grid-cols-3 gap-2">
                {roomTypes.map((rt) => (
                  <Button
                    key={rt.type}
                    variant={rooms.find(r => r.id === selectedRoom)?.type === rt.type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleRoomTypeChange(rt.type)}
                    className="text-xs"
                  >
                    {rt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>רוחב</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoomResize('width', -1)}
                  >
                    <Minus size={14} />
                  </Button>
                  <div className="flex-1 text-center py-1 px-2 bg-secondary rounded font-mono text-sm">
                    {((rooms.find(r => r.id === selectedRoom)?.width || 0) / 20).toFixed(1)}m
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoomResize('width', 1)}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>אורך</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoomResize('length', -1)}
                  >
                    <Minus size={14} />
                  </Button>
                  <div className="flex-1 text-center py-1 px-2 bg-secondary rounded font-mono text-sm">
                    {((rooms.find(r => r.id === selectedRoom)?.length || 0) / 20).toFixed(1)}m
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoomResize('length', 1)}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1 gap-2 bg-linear-to-r from-primary to-accent hover:opacity-90 glow-primary">
            <FlowArrow size={18} weight="bold" />
            שמור תוכנית
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
