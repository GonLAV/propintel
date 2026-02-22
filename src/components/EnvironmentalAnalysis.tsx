import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Wind,
  SpeakerHigh,
  Tree,
  Bus,
  ShoppingCart,
  GraduationCap,
  Hospital,
  Park,
  Sparkle,
  MapPin,
  Warning
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface EnvironmentalAnalysisProps {
  address: {
    street: string
    city: string
    neighborhood: string
  }
}

interface Amenity {
  name: string
  type: string
  distance: number
  walkTime: number
}

export function EnvironmentalAnalysis({ address }: EnvironmentalAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    
    try {
      const promptText = `Analyze the environmental quality and amenities for this location:
      Address: ${address.street}, ${address.neighborhood}, ${address.city}
      
      Generate realistic data for Israeli context. Return JSON with:
      {
        "airQuality": {
          "score": number (1-100, 100 is best),
          "rating": "excellent" | "good" | "moderate" | "poor",
          "pm25": number (μg/m³),
          "description": string (in Hebrew)
        },
        "noiseLevel": {
          "score": number (1-100, 100 is quietest),
          "rating": "quiet" | "moderate" | "noisy",
          "averageDecibels": number,
          "description": string (in Hebrew)
        },
        "greenSpace": {
          "score": number (1-100),
          "nearestPark": string,
          "distance": number (meters),
          "description": string (in Hebrew)
        },
        "walkability": {
          "score": number (1-100),
          "walkScore": number,
          "bikeScore": number,
          "transitScore": number
        },
        "amenities": [
          {
            "name": string,
            "type": "school" | "hospital" | "shopping" | "transit" | "park" | "restaurant",
            "distance": number (meters),
            "walkTime": number (minutes)
          }
        ],
        "safetyScore": number (1-100),
        "overallScore": number (1-100),
        "highlights": string[] (3-4 key highlights in Hebrew),
        "concerns": string[] (1-2 concerns in Hebrew if any)
      }`

      const response = await window.spark.llm(promptText, 'gpt-4o', true)
      const data = JSON.parse(response)
      setAnalysis(data)
      toast.success('ניתוח סביבתי הושלם')
    } catch (_error) {
      toast.error('שגיאה בניתוח סביבתי')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success'
    if (score >= 60) return 'text-accent'
    if (score >= 40) return 'text-warning'
    return 'text-destructive'
  }

  const getScoreBadge = (rating: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      'excellent': { label: 'מצוין', className: 'bg-success text-success-foreground' },
      'good': { label: 'טוב', className: 'bg-accent text-accent-foreground' },
      'moderate': { label: 'בינוני', className: 'bg-warning text-warning-foreground' },
      'poor': { label: 'גרוע', className: 'bg-destructive text-destructive-foreground' },
      'quiet': { label: 'שקט', className: 'bg-success text-success-foreground' },
      'noisy': { label: 'רועש', className: 'bg-warning text-warning-foreground' },
    }
    return badges[rating] || { label: rating, className: 'bg-muted' }
  }

  const amenityIcons: Record<string, any> = {
    school: GraduationCap,
    hospital: Hospital,
    shopping: ShoppingCart,
    transit: Bus,
    park: Park,
    restaurant: ShoppingCart
  }

  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tree size={24} weight="duotone" className="text-primary" />
          ניתוח סביבתי ואיכות חיים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!analysis ? (
          <div className="py-12 text-center space-y-4">
            <Wind size={64} className="mx-auto text-muted-foreground/50" weight="duotone" />
            <div>
              <h3 className="text-xl font-semibold mb-2">נתח את איכות הסביבה</h3>
              <p className="text-muted-foreground mb-6">
                בדוק איכות אוויר, רעש, שטחים ירוקים ונגישות לשירותים
              </p>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-2 bg-linear-to-r from-primary to-accent hover:opacity-90 glow-primary"
              >
                {isAnalyzing ? (
                  <>מנתח...</>
                ) : (
                  <>
                    <Sparkle size={20} weight="fill" />
                    הפעל ניתוח סביבתי
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="glass-effect p-6 rounded-xl border border-primary/20 bg-linear-to-br from-primary/5 to-accent/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">ציון כולל</div>
                  <div className={`text-4xl font-mono font-bold ${getScoreColor(analysis.overallScore)}`}>
                    {analysis.overallScore}/100
                  </div>
                </div>
                <Badge className="bg-linear-to-r from-primary to-accent text-white text-lg px-4 py-2">
                  {analysis.overallScore >= 80 ? 'מעולה' : analysis.overallScore >= 60 ? 'טוב מאוד' : 'טוב'}
                </Badge>
              </div>
              <Progress value={analysis.overallScore} className="h-3" />
            </div>

            <Tabs defaultValue="quality" dir="rtl">
              <TabsList className="grid w-full grid-cols-3 glass-effect">
                <TabsTrigger value="quality">איכות סביבה</TabsTrigger>
                <TabsTrigger value="amenities">שירותים</TabsTrigger>
                <TabsTrigger value="mobility">ניידות</TabsTrigger>
              </TabsList>

              <TabsContent value="quality" className="space-y-4 mt-4">
                <Card className="glass-effect border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wind size={18} className="text-primary" />
                      איכות אוויר
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getScoreBadge(analysis.airQuality.rating).className}>
                        {getScoreBadge(analysis.airQuality.rating).label}
                      </Badge>
                      <span className={`text-2xl font-mono font-bold ${getScoreColor(analysis.airQuality.score)}`}>
                        {analysis.airQuality.score}/100
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-mono">{analysis.airQuality.pm25} μg/m³</span>
                        <span className="text-muted-foreground">PM2.5</span>
                      </div>
                    </div>
                    <p className="text-sm text-right text-muted-foreground">
                      {analysis.airQuality.description}
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-effect border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <SpeakerHigh size={18} className="text-accent" />
                      רמת רעש
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getScoreBadge(analysis.noiseLevel.rating).className}>
                        {getScoreBadge(analysis.noiseLevel.rating).label}
                      </Badge>
                      <span className={`text-2xl font-mono font-bold ${getScoreColor(analysis.noiseLevel.score)}`}>
                        {analysis.noiseLevel.score}/100
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-mono">{analysis.noiseLevel.averageDecibels} dB</span>
                        <span className="text-muted-foreground">ממוצע</span>
                      </div>
                    </div>
                    <p className="text-sm text-right text-muted-foreground">
                      {analysis.noiseLevel.description}
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-effect border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tree size={18} className="text-success" />
                      שטחים ירוקים
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ציון ירוק</span>
                      <span className={`text-2xl font-mono font-bold ${getScoreColor(analysis.greenSpace.score)}`}>
                        {analysis.greenSpace.score}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono">{analysis.greenSpace.distance}m</span>
                      <span className="text-muted-foreground">פארק קרוב</span>
                    </div>
                    <p className="text-sm text-right">
                      <span className="font-semibold">{analysis.greenSpace.nearestPark}</span>
                    </p>
                    <p className="text-sm text-right text-muted-foreground">
                      {analysis.greenSpace.description}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="amenities" className="space-y-3 mt-4">
                {analysis.amenities.map((amenity: Amenity, i: number) => {
                  const Icon = amenityIcons[amenity.type] || MapPin
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-effect p-4 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon size={20} className="text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{amenity.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {amenity.walkTime} דקות הליכה
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">{amenity.distance}m</div>
                      </div>
                    </motion.div>
                  )
                })}
              </TabsContent>

              <TabsContent value="mobility" className="space-y-4 mt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="glass-effect border-border/50">
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className={`text-3xl font-mono font-bold ${getScoreColor(analysis.walkability.walkScore)}`}>
                          {analysis.walkability.walkScore}
                        </div>
                        <div className="text-sm text-muted-foreground">ציון הליכה</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-effect border-border/50">
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className={`text-3xl font-mono font-bold ${getScoreColor(analysis.walkability.bikeScore)}`}>
                          {analysis.walkability.bikeScore}
                        </div>
                        <div className="text-sm text-muted-foreground">ציון אופניים</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-effect border-border/50">
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className={`text-3xl font-mono font-bold ${getScoreColor(analysis.walkability.transitScore)}`}>
                          {analysis.walkability.transitScore}
                        </div>
                        <div className="text-sm text-muted-foreground">ציון תחבורה</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="glass-effect border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">ניידות כללית</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-mono">{analysis.walkability.score}%</span>
                        <span className="text-muted-foreground">ציון נגישות</span>
                      </div>
                      <Progress value={analysis.walkability.score} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {analysis.highlights.length > 0 && (
              <Card className="glass-effect border-success/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-success">
                    <Sparkle size={18} weight="fill" />
                    נקודות חוזק
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {analysis.highlights.map((highlight: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {analysis.concerns && analysis.concerns.length > 0 && (
              <Card className="glass-effect border-warning/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-warning">
                    <Warning size={18} />
                    שיקולים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {analysis.concerns.map((concern: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handleAnalyze}
              variant="outline"
              className="w-full gap-2"
            >
              <Sparkle size={16} />
              נתח מחדש
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
