import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Database, CheckCircle, Warning, Clock, TrendUp, MapPin, Spinner, Play, Pause } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useKV } from '@github/spark/hooks'
import { marketDataSync, createDefaultSyncConfig, type MarketDataSyncConfig, type SyncResult } from '@/lib/marketDataSync'
import { createLogger } from '@/lib/logger'

const log = createLogger('MarketDataSync')

export function MarketDataSync() {
  const [syncConfig, setSyncConfig] = useKV<MarketDataSyncConfig>('market-data-sync-config', createDefaultSyncConfig())
  const [syncHistory, setSyncHistory] = useKV<SyncResult[]>('market-data-sync-history', [])
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<SyncResult | null>(null)
  const [syncProgress, setSyncProgress] = useState(0)

  useEffect(() => {
    if (syncHistory && syncHistory.length > 0) {
      setLastSync(syncHistory[0])
    }
  }, [syncHistory])

  const handleManualSync = async () => {
    if (!syncConfig) {
      toast.error('לא נמצא תצורת סנכרון')
      return
    }

    setSyncing(true)
    setSyncProgress(0)

    try {
      toast.info('מתחיל סנכרון נתוני שוק...', {
        description: `מתחבר ל-${syncConfig.regions.length} אזורים`
      })

      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const result = await marketDataSync.performSync(syncConfig)

      clearInterval(progressInterval)
      setSyncProgress(100)

      setSyncHistory(current => [result, ...(current || [])].slice(0, 50))

      const updatedConfig = {
        ...syncConfig,
        lastSync: result.timestamp,
        nextSync: calculateNextSync(syncConfig.syncInterval)
      }
      setSyncConfig(updatedConfig)

      if (result.status === 'success') {
        toast.success(`סנכרון הושלם בהצלחה! 🎉`, {
          description: `נמצאו ${result.newRecords} רשומות חדשות מתוך ${result.totalFetched} סה״כ`,
          duration: 5000
        })
      } else if (result.status === 'partial') {
        toast.warning('סנכרון הושלם עם שגיאות חלקיות', {
          description: `${result.newRecords} רשומות חדשות | ${result.errors} שגיאות`,
          duration: 5000
        })
      } else {
        toast.error('הסנכרון נכשל', {
          description: result.errorMessages?.join(', ')
        })
      }
    } catch (error) {
      log.error('Sync error:', error)
      toast.error('שגיאה בסנכרון נתוני שוק', {
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה'
      })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncProgress(0), 2000)
    }
  }

  const toggleSync = (enabled: boolean) => {
    if (!syncConfig) return

    setSyncConfig({
      ...syncConfig,
      enabled
    })

    if (enabled) {
      toast.success('סנכרון אוטומטי הופעל')
    } else {
      toast.info('סנכרון אוטומטי הושבת')
    }
  }

  const calculateNextSync = (interval: MarketDataSyncConfig['syncInterval']): string => {
    const now = new Date()

    switch (interval) {
      case 'hourly':
        now.setHours(now.getHours() + 1)
        break
      case 'daily':
        now.setDate(now.getDate() + 1)
        now.setHours(2, 0, 0, 0)
        break
      case 'weekly':
        now.setDate(now.getDate() + 7)
        now.setHours(2, 0, 0, 0)
        break
      default:
        return ''
    }

    return now.toISOString()
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="container mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-3 rounded-xl">
              <Database className="w-8 h-8 text-primary" weight="duotone" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-l from-primary to-accent bg-clip-text text-transparent">
                סנכרון נתוני שוק אוטומטי
              </h1>
              <p className="text-muted-foreground">
                שליפה אוטומטית של עסקאות ממאגרי נדל״ן ממשלתיים
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-sync" className="text-sm font-medium cursor-pointer">
                סנכרון אוטומטי
              </Label>
              <Switch
                id="auto-sync"
                checked={syncConfig?.enabled ?? false}
                onCheckedChange={toggleSync}
              />
            </div>
          </div>
        </div>

        <Alert className="bg-primary/10 border-primary/30">
          <Database className="h-5 w-5 text-primary" weight="duotone" />
          <AlertTitle className="text-base font-bold">🚀 אינטגרציה עם מאגרי ממשלה</AlertTitle>
          <AlertDescription className="mt-3 space-y-2">
            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">
                המערכת מחוברת למאגרי נתונים ממשלתיים לשליפה אוטומטית של עסקאות:
              </p>
              <ul className="space-y-1 list-disc list-inside text-muted-foreground mr-4">
                <li>רשם המקרקעין (Land Registry)</li>
                <li>רשות המיסים (Tax Authority)</li>
                <li>מערכת מידענט (Meidanet Platform)</li>
                <li>מאגרי פרסומים מקומיים</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-effect p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">סטטוס סנכרון</h3>
                {syncConfig?.enabled ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="w-3 h-3" weight="fill" />
                    פעיל
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Pause className="w-3 h-3" weight="fill" />
                    מושבת
                  </Badge>
                )}
              </div>

              <Separator />

              {lastSync ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">סנכרון אחרון:</span>
                    <span className="font-mono text-xs">{formatDate(lastSync.timestamp)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">רשומות חדשות:</span>
                    <span className="font-mono font-semibold text-success">{lastSync.newRecords}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">סה״כ נמשך:</span>
                    <span className="font-mono">{lastSync.totalFetched}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">משך:</span>
                    <span className="font-mono">{formatDuration(lastSync.duration)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-2" weight="duotone" />
                  <p className="text-sm text-muted-foreground">עדיין לא בוצע סנכרון</p>
                </div>
              )}

              <Button
                className="w-full gap-2"
                onClick={handleManualSync}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <Spinner className="w-4 h-4 animate-spin" weight="bold" />
                    מסנכרן...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" weight="fill" />
                    הרץ סנכרון כעת
                  </>
                )}
              </Button>

              <AnimatePresence>
                {syncing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Progress value={syncProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {syncProgress}%
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          <Card className="glass-effect p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" weight="duotone" />
                אזורי חיפוש
              </h3>

              <Separator />

              <div className="space-y-3">
                {syncConfig?.regions.map((region, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{region.nameHe}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {region.coordinates.latitude.toFixed(4)}, {region.coordinates.longitude.toFixed(4)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          רדיוס: {region.radiusKm} ק״מ
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        פעיל
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="glass-effect p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendUp className="w-5 h-5 text-success" weight="duotone" />
                איכות נתונים
              </h3>

              <Separator />

              {lastSync ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">מאומתים:</span>
                      <span className="font-mono text-success">{lastSync.dataQuality.verified}</span>
                    </div>
                    <Progress 
                      value={lastSync.totalFetched > 0 ? (lastSync.dataQuality.verified / lastSync.totalFetched) * 100 : 0} 
                      className="h-1.5 bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">שלמים:</span>
                      <span className="font-mono text-primary">{lastSync.dataQuality.complete}</span>
                    </div>
                    <Progress 
                      value={lastSync.totalFetched > 0 ? (lastSync.dataQuality.complete / lastSync.totalFetched) * 100 : 0} 
                      className="h-1.5 bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">לא מאומתים:</span>
                      <span className="font-mono text-warning">{lastSync.dataQuality.unverified}</span>
                    </div>
                    <Progress 
                      value={lastSync.totalFetched > 0 ? (lastSync.dataQuality.unverified / lastSync.totalFetched) * 100 : 0} 
                      className="h-1.5 bg-muted"
                    />
                  </div>

                  <Separator className="my-3" />

                  <div className="p-3 bg-linear-to-br from-success/20 to-primary/20 border border-success/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">ציון איכות כולל</span>
                      <span className="text-2xl font-bold text-success">
                        {lastSync.totalFetched > 0 
                          ? Math.round((lastSync.dataQuality.complete / lastSync.totalFetched) * 100)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <TrendUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" weight="duotone" />
                  <p className="text-sm text-muted-foreground">אין נתוני איכות</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {syncHistory && syncHistory.length > 0 && (
          <Card className="glass-effect p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" weight="duotone" />
              היסטוריית סנכרונים
            </h3>

            <div className="space-y-2">
              {syncHistory.slice(0, 10).map((sync, _index) => (
                <div key={sync.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {sync.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-success" weight="fill" />
                          ) : sync.status === 'partial' ? (
                            <Warning className="w-5 h-5 text-warning" weight="fill" />
                          ) : (
                            <Warning className="w-5 h-5 text-destructive" weight="fill" />
                          )}
                          <span className="font-medium">{formatDate(sync.timestamp)}</span>
                        </div>
                        <Badge variant={sync.status === 'success' ? 'default' : sync.status === 'partial' ? 'secondary' : 'destructive'}>
                          {sync.status === 'success' ? 'הצלחה' : sync.status === 'partial' ? 'חלקי' : 'כשל'}
                        </Badge>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span>רשומות חדשות: <strong className="text-success">{sync.newRecords}</strong></span>
                        <span>סה״כ: <strong>{sync.totalFetched}</strong></span>
                        <span>שגיאות: <strong className={sync.errors > 0 ? 'text-destructive' : ''}>{sync.errors}</strong></span>
                        <span>משך: <strong>{formatDuration(sync.duration)}</strong></span>
                      </div>
                      {sync.errorMessages && sync.errorMessages.length > 0 && (
                        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                          {sync.errorMessages.join(' | ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
