import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  FilePdf,
  Eye,
  FileText,
  Paperclip,
  Lock,
  Info,
  CheckCircle,
  EnvelopeSimple,
  User,
  FileDoc,
  FileXls,
  FileImage,
  FileZip
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { UploadedFile } from '@/components/FileUploadDropzone'

interface EmailAttachmentPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailData: {
    to: string[]
    cc: string[]
    bcc: string[]
    subject: string
    message: string
    includePassword: boolean
    password?: string
  }
  attachments: AttachmentInfo[]
  customAttachments?: UploadedFile[]
  reportTitle: string
}

interface AttachmentInfo {
  name: string
  size: number
  type: 'pdf' | 'csv' | 'excel'
  preview?: string
  isPasswordProtected?: boolean
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileIcon = (type: string) => {
  if (type.includes('pdf') || type === 'pdf') {
    return <FilePdf size={24} weight="duotone" className="text-destructive" />
  }
  if (type.includes('csv') || type === 'csv') {
    return <FileText size={24} weight="duotone" className="text-success" />
  }
  if (type.includes('excel') || type.includes('spreadsheet') || type === 'excel') {
    return <FileXls size={24} weight="duotone" className="text-success" />
  }
  if (type.includes('word') || type.includes('document')) {
    return <FileDoc size={24} weight="duotone" className="text-blue-500" />
  }
  if (type.includes('image')) {
    return <FileImage size={24} weight="duotone" className="text-purple-500" />
  }
  if (type.includes('zip')) {
    return <FileZip size={24} weight="duotone" className="text-warning" />
  }
  return <Paperclip size={24} weight="duotone" />
}

export function EmailAttachmentPreview({
  open,
  onOpenChange,
  emailData,
  attachments,
  customAttachments = [],
  reportTitle: _reportTitle
}: EmailAttachmentPreviewProps) {
  const [selectedPreview, setSelectedPreview] = useState<AttachmentInfo | UploadedFile | null>(null)
  
  const totalAttachments = attachments.length + customAttachments.filter(f => f.status === 'complete').length
  const totalSize = attachments.reduce((sum, a) => sum + a.size, 0) + 
                   customAttachments.filter(f => f.status === 'complete').reduce((sum, f) => sum + f.size, 0)

  const hasPasswordProtection = emailData.includePassword || attachments.some(a => a.isPasswordProtected)
  const totalRecipients = emailData.to.length + emailData.cc.length + emailData.bcc.length

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye size={24} weight="duotone" className="text-primary" />
              תצוגה מקדימה - מה הנמענים יקבלו
            </DialogTitle>
            <DialogDescription>
              בדוק את התוכן המדויק שיישלח ל-{totalRecipients} נמענים
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email" className="gap-2">
                <EnvelopeSimple size={18} />
                הודעת האימייל
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2">
                <Paperclip size={18} />
                קבצים מצורפים ({totalAttachments})
              </TabsTrigger>
              <TabsTrigger value="recipients" className="gap-2">
                <User size={18} />
                נמענים ({totalRecipients})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  <Card className="glass-effect border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">כותרת האימייל</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-semibold text-muted-foreground min-w-[60px]">נושא:</span>
                          <span className="text-sm flex-1">{emailData.subject}</span>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-semibold text-muted-foreground min-w-[60px]">אל:</span>
                          <div className="flex flex-wrap gap-1 flex-1">
                            {emailData.to.map(email => (
                              <Badge key={email} variant="secondary" className="text-xs">
                                {email}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {emailData.cc.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-semibold text-muted-foreground min-w-[60px]">עותק:</span>
                            <div className="flex flex-wrap gap-1 flex-1">
                              {emailData.cc.map(email => (
                                <Badge key={email} variant="outline" className="text-xs">
                                  {email}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {emailData.bcc.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-semibold text-muted-foreground min-w-[60px]">עותק נסתר:</span>
                            <div className="flex flex-wrap gap-1 flex-1">
                              {emailData.bcc.map(email => (
                                <Badge key={email} variant="outline" className="text-xs">
                                  {email}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-effect">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">תוכן ההודעה</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-card rounded-lg border p-4">
                        {emailData.message ? (
                          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                            {emailData.message}
                          </pre>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            אין תוכן הודעה
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {hasPasswordProtection && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="glass-effect border-warning/30 bg-warning/5">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <Lock size={20} className="text-warning mt-0.5" />
                            <div className="space-y-1 flex-1">
                              <p className="text-sm font-semibold text-warning-foreground">
                                הקבצים מוגנים בסיסמה
                              </p>
                              {emailData.includePassword && emailData.password && (
                                <p className="text-sm text-muted-foreground">
                                  הסיסמה: <code className="font-mono bg-muted px-2 py-0.5 rounded">{emailData.password}</code>
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                הנמענים יצטרכו להזין סיסמה כדי לפתוח את הקבצים
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {attachments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <FilePdf size={16} weight="duotone" className="text-primary" />
                        דוחות ממערכת ({attachments.length})
                      </h3>
                      <div className="grid gap-3">
                        {attachments.map((attachment, index) => (
                          <Card
                            key={index}
                            className={cn(
                              "glass-effect cursor-pointer transition-all hover:border-primary/50",
                              selectedPreview?.name === attachment.name && "border-primary ring-1 ring-primary/20"
                            )}
                            onClick={() => setSelectedPreview(attachment)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="shrink-0">
                                  {getFileIcon(attachment.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold truncate">
                                      {attachment.name}
                                    </p>
                                    {attachment.isPasswordProtected && (
                                      <Lock size={14} className="text-warning shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(attachment.size)} • {attachment.type.toUpperCase()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedPreview(attachment)
                                  }}
                                >
                                  <Eye size={16} />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {customAttachments.filter(f => f.status === 'complete').length > 0 && (
                    <div>
                      <Separator className="my-4" />
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Paperclip size={16} weight="duotone" className="text-accent" />
                        קבצים נוספים ({customAttachments.filter(f => f.status === 'complete').length})
                      </h3>
                      <div className="grid gap-3">
                        {customAttachments.filter(f => f.status === 'complete').map((file) => (
                          <Card
                            key={file.id}
                            className={cn(
                              "glass-effect cursor-pointer transition-all hover:border-primary/50",
                              selectedPreview && 'id' in selectedPreview && selectedPreview.id === file.id && "border-primary ring-1 ring-primary/20"
                            )}
                            onClick={() => setSelectedPreview(file)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="shrink-0">
                                  {getFileIcon(file.type)}
                                </div>
                                {file.preview && (
                                  <div className="shrink-0 w-12 h-12 rounded overflow-hidden border border-border">
                                    <img 
                                      src={file.preview} 
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedPreview(file)
                                  }}
                                >
                                  <Eye size={16} />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <Card className="glass-effect bg-muted/30">
                    <CardContent className="p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">סה"כ קבצים:</span>
                          <Badge variant="secondary">{totalAttachments}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">סה"כ גודל:</span>
                          <span className="font-mono">{formatFileSize(totalSize)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="recipients" className="mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  <Card className="glass-effect">
                    <CardHeader>
                      <CardTitle className="text-base">סיכום משלוח</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-semibold">נמענים ראשיים</span>
                          <Badge variant="default">{emailData.to.length}</Badge>
                        </div>
                        {emailData.cc.length > 0 && (
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-semibold">עותק (CC)</span>
                            <Badge variant="secondary">{emailData.cc.length}</Badge>
                          </div>
                        )}
                        {emailData.bcc.length > 0 && (
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-semibold">עותק נסתר (BCC)</span>
                            <Badge variant="outline">{emailData.bcc.length}</Badge>
                          </div>
                        )}
                        <Separator />
                        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                          <span className="text-sm font-bold">סה"כ נמענים</span>
                          <Badge variant="default" className="text-base px-3 py-1">
                            {totalRecipients}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground px-1">נמענים ראשיים</h4>
                    {emailData.to.map((email, index) => (
                      <Card key={email} className="glass-effect">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{email}</p>
                              <p className="text-xs text-muted-foreground">יקבל את הדוח המלא</p>
                            </div>
                            <CheckCircle size={18} className="text-success" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {emailData.cc.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground px-1">עותק (CC)</h4>
                      {emailData.cc.map((email) => (
                        <Card key={email} className="glass-effect border-dashed">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                                <EnvelopeSimple size={16} />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{email}</p>
                                <p className="text-xs text-muted-foreground">יקבל עותק (גלוי לכולם)</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {emailData.bcc.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground px-1">עותק נסתר (BCC)</h4>
                      {emailData.bcc.map((email) => (
                        <Card key={email} className="glass-effect border-dashed opacity-75">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Lock size={16} />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{email}</p>
                                <p className="text-xs text-muted-foreground">יקבל עותק (נסתר מנמענים אחרים)</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <Card className="glass-effect bg-accent/5 border-accent/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Info size={20} className="text-accent shrink-0 mt-0.5" />
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p><strong>נמענים ראשיים (To):</strong> יראו את כל הנמענים הראשיים ואת ה-CC</p>
                          <p><strong>עותק (CC):</strong> יראו את כל הנמענים, אבל מסומן כעותק</p>
                          <p><strong>עותק נסתר (BCC):</strong> לא יראו את הנמענים האחרים ואף אחד לא יראה אותם</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
