/**
 * BeforeAfterComparison — Photo comparison slider for renovation tracking.
 * ────────────────────────────────────────────────────────────────────────
 * • Upload before/after photos
 * • Interactive slider for visual comparison
 * • Property impact assessment
 */

import { useState, useCallback, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import {
  Image, UploadSimple, Plus, Trash, Note,
  ArrowLeft, ArrowRight,
  CurrencyDollar,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { uid } from '@/lib/utils'
import { motion } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────
interface ComparisonPair {
  id: string
  propertyAddress: string
  room: string
  beforePhoto: string
  afterPhoto: string
  beforeDate: string
  afterDate: string
  description: string
  estimatedImpact: number // ₪ value change
  createdAt: string
}

const ROOM_LABELS = [
  'סלון', 'מטבח', 'חדר שינה', 'אמבטיה', 'מרפסת',
  'חצר', 'חזית', 'גג', 'חניה', 'כניסה', 'אחר',
]

export function BeforeAfterComparison() {
  const [pairs, setPairs] = useKV<ComparisonPair[]>('before-after-pairs', [])
  const [activePair, setActivePair] = useState<ComparisonPair | null>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)
  const safe = pairs || []

  // ── Create new pair ─────────────────────────────────────────────
  const createPair = useCallback(() => {
    setActivePair({
      id: uid('ba'),
      propertyAddress: '',
      room: 'סלון',
      beforePhoto: '',
      afterPhoto: '',
      beforeDate: '',
      afterDate: new Date().toISOString().slice(0, 10),
      description: '',
      estimatedImpact: 0,
      createdAt: new Date().toISOString(),
    })
  }, [])

  // ── Save ────────────────────────────────────────────────────────
  const savePair = useCallback(() => {
    if (!activePair) return
    setPairs(prev => {
      const arr = prev || []
      const idx = arr.findIndex(p => p.id === activePair.id)
      if (idx >= 0) {
        const copy = [...arr]
        copy[idx] = activePair
        return copy
      }
      return [...arr, activePair]
    })
  }, [activePair, setPairs])

  // ── Photo upload handler ────────────────────────────────────────
  const handlePhotoUpload = useCallback((type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setActivePair(prev => prev ? {
        ...prev,
        [type === 'before' ? 'beforePhoto' : 'afterPhoto']: dataUrl,
      } : prev)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  // ── Slider interaction ──────────────────────────────────────────
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(pct)
  }, [])

  const handleMouseDown = useCallback(() => setIsDragging(true), [])
  const handleMouseUp = useCallback(() => setIsDragging(false), [])
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) handleSliderMove(e.clientX)
  }, [isDragging, handleSliderMove])
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleSliderMove(e.touches[0].clientX)
  }, [handleSliderMove])

  // ── Delete ──────────────────────────────────────────────────────
  const _deletePair = useCallback((id: string) => {
    setPairs(prev => (prev || []).filter(p => p.id !== id))
  }, [setPairs])

  // ── List view ───────────────────────────────────────────────────
  if (!activePair) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="השוואת לפני / אחרי"
          description="צילום נכס לפני שיפוץ → השוואה אוטומטית למצב הנוכחי"
          icon={<Image size={28} weight="duotone" />}
        />

        <div className="flex justify-end">
          <Button onClick={createPair} className="gap-2">
            <Plus size={16} weight="bold" /> השוואה חדשה
          </Button>
        </div>

        {safe.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Image size={48} className="mx-auto mb-4 text-muted-foreground/40" weight="duotone" />
              <p className="text-muted-foreground">אין השוואות עדיין. לחץ על "השוואה חדשה" להתחיל.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {safe.map(pair => (
              <Card
                key={pair.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => { setActivePair(pair); setSliderPosition(50) }}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && (setActivePair(pair), setSliderPosition(50))}
              >
                <div className="grid grid-cols-2 h-32">
                  {pair.beforePhoto ? (
                    <img src={pair.beforePhoto} alt="לפני" className="w-full h-full object-cover" />
                  ) : (
                    <div className="bg-secondary flex items-center justify-center text-xs text-muted-foreground">לפני</div>
                  )}
                  {pair.afterPhoto ? (
                    <img src={pair.afterPhoto} alt="אחרי" className="w-full h-full object-cover" />
                  ) : (
                    <div className="bg-secondary flex items-center justify-center text-xs text-muted-foreground">אחרי</div>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate">{pair.propertyAddress || 'ללא כתובת'}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">{pair.room}</Badge>
                    {pair.estimatedImpact > 0 && (
                      <span className="text-emerald-600 font-medium">+₪{pair.estimatedImpact.toLocaleString()}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Active comparison editor ────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="השוואת לפני / אחרי"
        description={activePair.propertyAddress || 'השוואה חדשה'}
        icon={<Image size={28} weight="duotone" />}
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => { savePair(); setActivePair(null) }}>חזור לרשימה</Button>
        <Button onClick={savePair}>שמור</Button>
      </div>

      {/* Slider comparison */}
      {activePair.beforePhoto && activePair.afterPhoto && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">השוואה אינטראקטיבית</CardTitle>
            <CardDescription>גרור את הפס כדי לראות את ההבדל</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={containerRef}
              className="relative w-full h-80 rounded-xl overflow-hidden cursor-col-resize select-none"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              onClick={(e) => handleSliderMove(e.clientX)}
              role="slider"
              aria-label="השוואת לפני אחרי"
              aria-valuetext={`${Math.round(sliderPosition)} אחוז`}
              tabIndex={0}
            >
              {/* After (full background) */}
              <img
                src={activePair.afterPhoto}
                alt="אחרי"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Before (clipped) */}
              <motion.div
                className="absolute inset-0 overflow-hidden"
                animate={{ width: `${sliderPosition}%` }}
                transition={{ duration: 0.08, ease: 'linear' }}
              >
                <img
                  src={activePair.beforePhoto}
                  alt="לפני"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </motion.div>

              {/* Slider line */}
              <motion.div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 -translate-x-1/2"
                animate={{ left: `${sliderPosition}%` }}
                transition={{ duration: 0.08, ease: 'linear' }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 h-10 w-10 rounded-full bg-white shadow-xl flex items-center justify-center">
                  <ArrowLeft size={12} className="text-muted-foreground" />
                  <ArrowRight size={12} className="text-muted-foreground" />
                </div>
              </motion.div>

              {/* Labels */}
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg z-20">לפני</div>
              <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg z-20">אחרי</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Before photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight size={16} /> לפני
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              title="בחירת תמונת לפני"
              aria-label="בחירת תמונת לפני"
              className="hidden"
              onChange={e => handlePhotoUpload('before', e)}
            />
            {activePair.beforePhoto ? (
              <div className="relative group">
                <img src={activePair.beforePhoto} alt="לפני" className="w-full h-48 object-cover rounded-xl" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setActivePair(prev => prev ? { ...prev, beforePhoto: '' } : prev)}
                >
                  <Trash size={12} />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-48 flex-col gap-2"
                onClick={() => beforeInputRef.current?.click()}
              >
                <UploadSimple size={24} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">העלה צילום "לפני"</span>
              </Button>
            )}
            <div className="mt-3">
              <label className="text-xs font-medium">תאריך צילום</label>
              <Input
                type="date"
                value={activePair.beforeDate}
                onChange={e => setActivePair(prev => prev ? { ...prev, beforeDate: e.target.value } : prev)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* After photo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeft size={16} /> אחרי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              title="בחירת תמונת אחרי"
              aria-label="בחירת תמונת אחרי"
              className="hidden"
              onChange={e => handlePhotoUpload('after', e)}
            />
            {activePair.afterPhoto ? (
              <div className="relative group">
                <img src={activePair.afterPhoto} alt="אחרי" className="w-full h-48 object-cover rounded-xl" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setActivePair(prev => prev ? { ...prev, afterPhoto: '' } : prev)}
                >
                  <Trash size={12} />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-48 flex-col gap-2"
                onClick={() => afterInputRef.current?.click()}
              >
                <UploadSimple size={24} className="text-muted-foreground" />
                <span className="text-sm text-muted-foreground">העלה צילום "אחרי"</span>
              </Button>
            )}
            <div className="mt-3">
              <label className="text-xs font-medium">תאריך צילום</label>
              <Input
                type="date"
                value={activePair.afterDate}
                onChange={e => setActivePair(prev => prev ? { ...prev, afterDate: e.target.value } : prev)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Note size={18} /> פרטים
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">כתובת הנכס</label>
            <Input
              placeholder="רחוב, עיר"
              value={activePair.propertyAddress}
              onChange={e => setActivePair(prev => prev ? { ...prev, propertyAddress: e.target.value } : prev)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">חדר / אזור</label>
            <div className="flex flex-wrap gap-1.5">
              {ROOM_LABELS.map(r => (
                <Badge
                  key={r}
                  variant={activePair.room === r ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => setActivePair(prev => prev ? { ...prev, room: r } : prev)}
                >
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">תיאור השינוי</label>
            <Textarea
              placeholder="מה נעשה? שיפוץ מטבח, צביעה, תיקון רטיבות..."
              rows={3}
              value={activePair.description}
              onChange={e => setActivePair(prev => prev ? { ...prev, description: e.target.value } : prev)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1">
              <CurrencyDollar size={14} /> השפעה משוערת על השווי (₪)
            </label>
            <Input
              type="number"
              placeholder="50,000"
              value={activePair.estimatedImpact || ''}
              onChange={e => setActivePair(prev => prev ? { ...prev, estimatedImpact: +e.target.value } : prev)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
