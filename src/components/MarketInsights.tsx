import type { Property } from '@/lib/types'
import { generateMockMarketTrends } from '@/lib/mockData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendUp, TrendDown, ChartBar, MapPin, Lightning } from '@phosphor-icons/react'

interface MarketInsightsProps {
  properties: Property[]
}

export function MarketInsights({ properties }: MarketInsightsProps) {
  const trends = useMemo(() => generateMockMarketTrends(), [])
  
  const stats = useMemo(() => {
    const valuedProperties = properties.filter(p => p.valuationData)
    const avgValue = valuedProperties.length > 0
      ? valuedProperties.reduce((sum, p) => sum + (p.valuationData?.estimatedValue || 0), 0) / valuedProperties.length
      : 0
    
    const avgPricePerSqm = valuedProperties.length > 0
      ? valuedProperties.reduce((sum, p) => {
          const value = p.valuationData?.estimatedValue || 0
          const area = p.details.builtArea
          return sum + (value / area)
        }, 0) / valuedProperties.length
      : 0
    
    const byCity = valuedProperties.reduce((acc, p) => {
      const city = p.address.city
      if (!acc[city]) acc[city] = []
      acc[city].push(p)
      return acc
    }, {} as Record<string, Property[]>)
    
    return {
      avgValue,
      avgPricePerSqm,
      byCity,
      totalValued: valuedProperties.length
    }
  }, [properties])

  const recentTrends = trends.slice(-12)
  const maxPrice = Math.max(...recentTrends.map(t => t.avgPricePerSqm))
  const priceChange = recentTrends.length > 1 
    ? ((recentTrends[recentTrends.length - 1].avgPricePerSqm - recentTrends[0].avgPricePerSqm) / recentTrends[0].avgPricePerSqm) * 100 
    : 0
  
  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div>
        <h2 className="text-4xl font-bold tracking-tight mb-2 bg-linear-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">ניתוח שוק</h2>
        <p className="text-muted-foreground">תובנות מתקדמות על מגמות השוק</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="glass-effect border-border/50 relative overflow-hidden group hover:scale-105 transition-transform">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3 relative">
              <CardTitle className="text-sm font-semibold text-muted-foreground text-right flex items-center gap-2 justify-end">
                <Lightning size={16} weight="duotone" className="text-primary" />
                ממוצע שווי נכס
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold font-mono text-right bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                ₪{(stats.avgValue / 1000000).toFixed(2)}M
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-effect border-border/50 relative overflow-hidden group hover:scale-105 transition-transform">
            <div className="absolute inset-0 bg-linear-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3 relative">
              <CardTitle className="text-sm font-semibold text-muted-foreground text-right flex items-center gap-2 justify-end">
                <ChartBar size={16} weight="duotone" className="text-accent" />
                ממוצע מחיר למ״ר
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold font-mono text-right bg-linear-to-r from-accent to-warning bg-clip-text text-transparent">
                ₪{Math.round(stats.avgPricePerSqm).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-effect border-border/50 relative overflow-hidden group hover:scale-105 transition-transform">
            <div className="absolute inset-0 bg-linear-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3 relative">
              <CardTitle className="text-sm font-semibold text-muted-foreground text-right flex items-center gap-2 justify-end">
                <TrendUp size={16} weight="duotone" className="text-success" />
                נכסים בניתוח
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold font-mono text-right text-foreground">
                {stats.totalValued}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-effect border-border/50 relative overflow-hidden group hover:scale-105 transition-transform">
            <div className="absolute inset-0 bg-linear-to-br from-warning/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-3 relative">
              <CardTitle className="text-sm font-semibold text-muted-foreground text-right flex items-center gap-2 justify-end">
                <MapPin size={16} weight="duotone" className="text-warning" />
                ערים
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold font-mono text-right text-foreground">
                {Object.keys(stats.byCity).length}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                  priceChange >= 0 
                    ? 'bg-success/20 text-success border border-success/30' 
                    : 'bg-destructive/20 text-destructive border border-destructive/30'
                }`}>
                  {priceChange >= 0 ? <TrendUp size={16} weight="bold" /> : <TrendDown size={16} weight="bold" />}
                  {Math.abs(priceChange).toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <CardTitle className="text-2xl">מגמת מחירים</CardTitle>
                <p className="text-sm text-muted-foreground">מחיר ממוצע למ״ר - 12 חודשים אחרונים</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-end gap-2 p-4" dir="ltr">
              {recentTrends.map((trend, index) => {
                const height = (trend.avgPricePerSqm / maxPrice) * 100
                const isRecent = index >= recentTrends.length - 3
                
                return (
                  <motion.div 
                    key={trend.period} 
                    className="flex-1 flex flex-col items-center gap-3"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                  >
                    <div className="relative w-full group">
                      <div
                        className={`w-full rounded-t-lg transition-all relative overflow-hidden ${
                          isRecent 
                            ? 'bg-linear-to-t from-primary to-accent shadow-lg shadow-primary/20' 
                            : 'bg-linear-to-t from-primary/40 to-accent/40'
                        } hover:scale-105 cursor-pointer`}
                        style={{ height: `${Math.max(height * 2.4, 20)}px` }}
                      >
                        <div className="absolute inset-0 bg-linear-to-t from-transparent to-white/10" />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-20 left-1/2 -translate-x-1/2 glass-effect border border-border/50 rounded-lg px-4 py-3 text-xs whitespace-nowrap shadow-2xl z-10 transition-opacity">
                        <div className="font-bold font-mono text-base text-primary">₪{trend.avgPricePerSqm.toLocaleString()}</div>
                        <div className="text-muted-foreground mt-1">{trend.sales} מכירות</div>
                        <div className="text-muted-foreground text-[10px]">{trend.avgDaysOnMarket} ימים בשוק</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {trend.period.split('-')[1]}/{trend.period.split('-')[0].slice(2)}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <CardTitle className="text-right text-2xl">פילוח לפי ערים</CardTitle>
            <p className="text-sm text-muted-foreground text-right">ניתוח מפורט של שווי נכסים בכל עיר</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byCity)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([city, cityProperties], i) => {
                  const avgCityValue = cityProperties.reduce((sum, p) => sum + (p.valuationData?.estimatedValue || 0), 0) / cityProperties.length
                  const avgCityPricePerSqm = cityProperties.reduce((sum, p) => {
                    const value = p.valuationData?.estimatedValue || 0
                    const area = p.details.builtArea
                    return sum + (value / area)
                  }, 0) / cityProperties.length
                  
                  return (
                    <motion.div 
                      key={city} 
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30 hover:bg-secondary/50 hover:border-primary/20 transition-all group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex gap-8 items-center">
                        <div className="text-center min-w-[80px]">
                          <div className="text-xs text-muted-foreground mb-1">נכסים</div>
                          <div className="text-xl font-bold font-mono bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            {cityProperties.length}
                          </div>
                        </div>
                        <div className="h-12 w-px bg-border/50" />
                        <div className="text-center min-w-[140px]">
                          <div className="text-xs text-muted-foreground mb-1">ממוצע מחיר למ״ר</div>
                          <div className="text-xl font-bold font-mono bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                            ₪{Math.round(avgCityPricePerSqm).toLocaleString()}
                          </div>
                        </div>
                        <div className="h-12 w-px bg-border/50" />
                        <div className="text-center min-w-[140px]">
                          <div className="text-xs text-muted-foreground mb-1">ממוצע שווי</div>
                          <div className="text-xl font-bold font-mono bg-linear-to-r from-success to-warning bg-clip-text text-transparent">
                            ₪{(avgCityValue / 1000000).toFixed(2)}M
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold group-hover:text-primary transition-colors flex items-center gap-2">
                          <MapPin size={20} weight="duotone" className="text-primary" />
                          {city}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
