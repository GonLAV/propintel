import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  EnvelopeSimple,
  CheckCircle,
  XCircle,
  Clock,
  MagnifyingGlass,
  Trash,
  ArrowCounterClockwise
} from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface EmailHistoryItem {
  date: string
  to: string[]
  subject: string
  reportTitle: string
  reportType: string
  status: 'sent' | 'failed' | 'pending'
  cc?: string[]
  bcc?: string[]
}

export function EmailHistory() {
  const [emailHistory, setEmailHistory] = useKV<EmailHistoryItem[]>('email-history', [])
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHistory = emailHistory?.filter(item => {
    const query = searchQuery.toLowerCase()
    return (
      item.subject.toLowerCase().includes(query) ||
      item.reportTitle.toLowerCase().includes(query) ||
      item.to.some(email => email.toLowerCase().includes(query))
    )
  })

  const clearHistory = () => {
    if (confirm('האם למחוק את כל היסטוריית השליחה?')) {
      setEmailHistory([])
      toast.success('ההיסטוריה נמחקה')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={20} weight="fill" className="text-success" />
      case 'failed':
        return <XCircle size={20} weight="fill" className="text-destructive" />
      case 'pending':
        return <Clock size={20} weight="fill" className="text-warning" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'נשלח'
      case 'failed':
        return 'נכשל'
      case 'pending':
        return 'ממתין'
      default:
        return status
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <EnvelopeSimple size={24} weight="duotone" className="text-primary" />
              היסטוריית שליחת דוחות
            </CardTitle>
            <CardDescription>
              מעקב אחר כל הדוחות שנשלחו באימייל
            </CardDescription>
          </div>
          {emailHistory && emailHistory.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash size={16} className="ml-2" />
              נקה היסטוריה
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="חפש לפי נמען, נושא או נכס..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {!filteredHistory || filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <EnvelopeSimple size={48} className="mx-auto mb-4 opacity-50" />
            <p>אין דוחות שנשלחו</p>
            {searchQuery && (
              <p className="text-sm mt-2">נסה לחפש משהו אחר</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {filteredHistory.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <Badge variant="secondary" className="text-xs">
                              {getStatusText(item.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.date), {
                                addSuffix: true,
                                locale: he
                              })}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-semibold">{item.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.reportType} • {item.reportTitle}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">אל:</span>
                              <div className="flex flex-wrap gap-1">
                                {item.to.map((email, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {email}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {item.cc && item.cc.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">CC:</span>
                                <div className="flex flex-wrap gap-1">
                                  {item.cc.map((email, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {email}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {item.status === 'failed' && (
                            <Button variant="outline" size="sm">
                              <ArrowCounterClockwise size={16} className="ml-1" />
                              שלח שוב
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}

        {emailHistory && emailHistory.length > 0 && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-success">
                  {emailHistory.filter(i => i.status === 'sent').length}
                </div>
                <div className="text-xs text-muted-foreground">נשלחו בהצלחה</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  {emailHistory.filter(i => i.status === 'pending').length}
                </div>
                <div className="text-xs text-muted-foreground">ממתינים</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">
                  {emailHistory.filter(i => i.status === 'failed').length}
                </div>
                <div className="text-xs text-muted-foreground">נכשלו</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
