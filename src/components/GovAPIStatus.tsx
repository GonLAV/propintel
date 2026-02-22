import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, ArrowClockwise } from '@phosphor-icons/react'
import { iPlanAPI } from '@/lib/iPlanAPI'
import { mavatAPI } from '@/lib/mavatAPI'

export function GovAPIStatus() {
  const [iPlanStatus, setIPlanStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [mavatStatus, setMavatStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkAPIs = async () => {
    setIPlanStatus('checking')
    setMavatStatus('checking')

    const [iPlanOk, mavatOk] = await Promise.all([
      iPlanAPI.testConnection(),
      mavatAPI.testConnection()
    ])

    setIPlanStatus(iPlanOk ? 'online' : 'offline')
    setMavatStatus(mavatOk ? 'online' : 'offline')
    setLastCheck(new Date())
  }

  useEffect(() => {
    checkAPIs()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="w-3 h-3 ml-1" />
            מחובר
          </Badge>
        )
      case 'offline':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 ml-1" />
            לא זמין
          </Badge>
        )
      default:
        return <Badge variant="outline">בודק...</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">סטטוס שירותים ממשלתיים</CardTitle>
            <CardDescription className="text-xs">
              {lastCheck && `עדכון: ${lastCheck.toLocaleTimeString('he-IL')}`}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={checkAPIs}>
            <ArrowClockwise className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">iPlan (מינהל התכנון)</div>
          {getStatusBadge(iPlanStatus)}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm">Mavat (מבא"ת)</div>
          {getStatusBadge(mavatStatus)}
        </div>
      </CardContent>
    </Card>
  )
}
