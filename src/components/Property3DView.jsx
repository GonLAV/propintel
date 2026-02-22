import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Cube, 
  Sun, 
  Eye, 
  Buildings, 
  Download,
  Play,
  Pause
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function Property3DView({ propertyData }) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const buildingRef = useRef(null)
  
  const [activeView, setActiveView] = useState('model')
  const [timeOfDay, setTimeOfDay] = useState(12)
  const [season, setSeason] = useState('summer')
  const [isAnimating, setIsAnimating] = useState(false)
  const [viewAngle, setViewAngle] = useState(45)
  const [sunExposure, setSunExposure] = useState(0)
  const [viewQuality, setViewQuality] = useState(0)

  const buildingHeight = propertyData?.buildingHeight || 15
  const plotWidth = propertyData?.plotWidth || 10
  const plotLength = propertyData?.plotLength || 12
  const floors = propertyData?.floors || 5

  useEffect(() => {
    if (!canvasRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d0d12)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(20, 15, 20)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    })
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0x404040, 1)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    const gridHelper = new THREE.GridHelper(50, 50, 0x333344, 0x222233)
    scene.add(gridHelper)

    const buildingGeometry = new THREE.BoxGeometry(plotWidth, buildingHeight, plotLength)
    const buildingMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a5aff,
      transparent: true,
      opacity: 0.9,
      emissive: 0x2a3aff,
      emissiveIntensity: 0.2
    })
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
    building.position.y = buildingHeight / 2
    building.castShadow = true
    building.receiveShadow = true
    scene.add(building)
    buildingRef.current = building

    const edgesGeometry = new THREE.EdgesGeometry(buildingGeometry)
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x88aaff, linewidth: 2 })
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
    building.add(edges)

    const groundGeometry = new THREE.PlaneGeometry(50, 50)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a24,
      roughness: 0.8,
      metalness: 0.2
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    for (let i = 0; i < 5; i++) {
      const x = (Math.random() - 0.5) * 40
      const z = (Math.random() - 0.5) * 40
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue

      const height = 8 + Math.random() * 12
      const contextBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(6 + Math.random() * 4, height, 6 + Math.random() * 4),
        new THREE.MeshPhongMaterial({
          color: 0x2a2a3a,
          transparent: true,
          opacity: 0.6
        })
      )
      contextBuilding.position.set(x, height / 2, z)
      contextBuilding.castShadow = true
      scene.add(contextBuilding)
    }

    let animationId
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      
      if (isAnimating && buildingRef.current) {
        buildingRef.current.rotation.y += 0.005
      }
      
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return
      const width = canvasRef.current.clientWidth
      const height = canvasRef.current.clientHeight
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    calculateSunExposure()
    calculateViewQuality()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [buildingHeight, plotWidth, plotLength, isAnimating])

  useEffect(() => {
    if (activeView === 'sun') {
      updateSunPosition()
    }
  }, [timeOfDay, season])

  const updateSunPosition = () => {
    if (!sceneRef.current) return

    const sunLight = sceneRef.current.children.find(
      child => child instanceof THREE.DirectionalLight
    )

    if (sunLight) {
      const hourAngle = ((timeOfDay - 12) / 12) * Math.PI
      const seasonOffset = season === 'summer' ? 0.4 : season === 'winter' ? -0.4 : 0
      
      sunLight.position.x = Math.sin(hourAngle) * 20
      sunLight.position.y = Math.cos(hourAngle) * 15 + 10 + seasonOffset * 5
      sunLight.position.z = 10
      
      const intensity = Math.max(0.2, Math.cos(hourAngle) + 0.5)
      sunLight.intensity = intensity

      const timeColor = timeOfDay < 8 || timeOfDay > 18 
        ? new THREE.Color(0xff8844) 
        : new THREE.Color(0xffffff)
      sunLight.color = timeColor
    }

    calculateSunExposure()
  }

  const calculateSunExposure = () => {
    const exposure = Math.max(0, Math.min(100, 
      (timeOfDay >= 6 && timeOfDay <= 18 ? 
        ((Math.cos(((timeOfDay - 12) / 6) * Math.PI) + 1) / 2) * 100 : 0) +
      (season === 'summer' ? 20 : season === 'winter' ? -10 : 5)
    ))
    setSunExposure(Math.round(exposure))
  }

  const calculateViewQuality = () => {
    const baseQuality = 60 + Math.random() * 25
    const floorBonus = floors * 2
    setViewQuality(Math.min(100, Math.round(baseQuality + floorBonus)))
  }

  const handleExport = () => {
    if (!rendererRef.current) return
    const dataURL = rendererRef.current.domElement.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = '3d-view.png'
    link.href = dataURL
    link.click()
    toast.success('תמונה נשמרה בהצלחה')
  }

  const handleAnimate = () => {
    setIsAnimating(!isAnimating)
  }

  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cube size={24} weight="duotone" className="text-primary" />
            תצוגה תלת־מימדית מתקדמת
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnimate}
              className="gap-2"
            >
              {isAnimating ? <Pause size={16} /> : <Play size={16} />}
              {isAnimating ? 'עצור' : 'סובב'}
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
      <CardContent className="space-y-6">
        <Tabs value={activeView} onValueChange={setActiveView} dir="rtl">
          <TabsList className="grid grid-cols-4 glass-effect">
            <TabsTrigger value="model" className="gap-2">
              <Buildings size={16} />
              מודל 3D
            </TabsTrigger>
            <TabsTrigger value="sun" className="gap-2">
              <Sun size={16} />
              שמש וצל
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-2">
              <Eye size={16} />
              ניתוח נוף
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <Eye size={16} />
              השוואה
            </TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-4 mt-4">
            <div className="relative rounded-xl overflow-hidden border border-border/50 bg-gradient-to-br from-background to-card">
              <canvas 
                ref={canvasRef} 
                className="w-full h-[500px]"
                style={{ display: 'block' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="glass-effect p-4 rounded-lg">
                <div className="text-muted-foreground mb-1">גובה בניין</div>
                <div className="text-2xl font-mono font-bold text-primary">{buildingHeight}m</div>
              </div>
              <div className="glass-effect p-4 rounded-lg">
                <div className="text-muted-foreground mb-1">מספר קומות</div>
                <div className="text-2xl font-mono font-bold text-accent">{floors}</div>
              </div>
              <div className="glass-effect p-4 rounded-lg">
                <div className="text-muted-foreground mb-1">שטח מגרש</div>
                <div className="text-2xl font-mono font-bold text-foreground">{plotWidth * plotLength}m²</div>
              </div>
              <div className="glass-effect p-4 rounded-lg">
                <div className="text-muted-foreground mb-1">כיוון מבנה</div>
                <div className="text-2xl font-mono font-bold text-foreground">{propertyData?.orientation || 'N'}°</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sun" className="space-y-4 mt-4">
            <div className="relative rounded-xl overflow-hidden border border-border/50 bg-gradient-to-br from-background to-card">
              <canvas 
                ref={canvasRef} 
                className="w-full h-[500px]"
                style={{ display: 'block' }}
              />
              <div className="absolute top-4 right-4 glass-effect p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sun size={20} className="text-accent" weight="fill" />
                  <span className="text-sm text-muted-foreground">חשיפה לשמש:</span>
                  <span className="text-lg font-mono font-bold text-accent">{sunExposure}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>שעה ביום</span>
                  <span className="font-mono text-primary">{timeOfDay}:00</span>
                </Label>
                <Slider
                  value={[timeOfDay]}
                  onValueChange={([v]) => setTimeOfDay(v)}
                  min={0}
                  max={24}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>עונה</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['winter', 'spring', 'summer', 'fall'].map((s) => (
                    <Button
                      key={s}
                      variant={season === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSeason(s)}
                    >
                      {s === 'winter' ? 'חורף' : s === 'spring' ? 'אביב' : s === 'summer' ? 'קיץ' : 'סתיו'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="glass-effect p-4 rounded-lg space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Sun size={18} className="text-accent" />
                  ניתוח חשיפה לשמש
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">שעות שמש ממוצעות ביום</span>
                    <span className="font-mono font-semibold">
                      {season === 'summer' ? '12-14' : season === 'winter' ? '8-10' : '10-12'} שעות
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">חשיפה בשעות השיא</span>
                    <span className="font-mono font-semibold text-accent">מעולה</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="view" className="space-y-4 mt-4">
            <div className="relative rounded-xl overflow-hidden border border-border/50 bg-gradient-to-br from-background to-card">
              <canvas 
                ref={canvasRef} 
                className="w-full h-[500px]"
                style={{ display: 'block' }}
              />
              <div className="absolute top-4 right-4 glass-effect p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Eye size={20} className="text-primary" weight="fill" />
                  <span className="text-sm text-muted-foreground">איכות נוף:</span>
                  <span className="text-lg font-mono font-bold text-primary">{viewQuality}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>זווית צפייה</span>
                  <span className="font-mono text-primary">{viewAngle}°</span>
                </Label>
                <Slider
                  value={[viewAngle]}
                  onValueChange={([v]) => setViewAngle(v)}
                  min={0}
                  max={360}
                  step={15}
                />
              </div>

              <div className="glass-effect p-4 rounded-lg space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Eye size={18} className="text-primary" />
                  ניתוח נוף מפורט
                </h4>
                <div className="grid gap-3">
                  <motion.div 
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className="text-sm">נוף פתוח צפונה</span>
                    <Badge className="bg-success text-success-foreground">מצוין</Badge>
                  </motion.div>
                  <motion.div 
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <span className="text-sm">חסימה חלקית דרומה</span>
                    <Badge variant="outline">בינוני</Badge>
                  </motion.div>
                  <motion.div 
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="text-sm">נוף לפארק ציבורי</span>
                    <Badge className="bg-accent text-accent-foreground">יתרון</Badge>
                  </motion.div>
                  <motion.div 
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-sm">רמת פרטיות</span>
                    <Badge className="bg-primary text-primary-foreground">גבוהה</Badge>
                  </motion.div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>תכנון נוכחי</Label>
                <div className="relative rounded-lg overflow-hidden border border-border/50 bg-gradient-to-br from-background to-card h-[240px] flex items-center justify-center">
                  <Buildings size={48} className="text-primary/30" />
                  <div className="absolute bottom-2 left-2 glass-effect px-2 py-1 rounded text-xs">
                    קיים
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>תכנון חלופי</Label>
                <div className="relative rounded-lg overflow-hidden border border-accent/50 bg-gradient-to-br from-background to-card h-[240px] flex items-center justify-center">
                  <Buildings size={48} className="text-accent/30" />
                  <div className="absolute bottom-2 left-2 glass-effect px-2 py-1 rounded text-xs">
                    מוצע
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-effect p-4 rounded-lg space-y-3">
              <h4 className="font-semibold">השוואת תכניות</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                  <span className="text-muted-foreground">חשיפה לשמש</span>
                  <div className="flex gap-3">
                    <span className="font-mono">85%</span>
                    <span className="font-mono text-accent">→ 92%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-2 bg-secondary/30 rounded">
                  <span className="text-muted-foreground">איכות נוף</span>
                  <div className="flex gap-3">
                    <span className="font-mono">{viewQuality}%</span>
                    <span className="font-mono text-accent">→ {Math.min(100, viewQuality + 8)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}