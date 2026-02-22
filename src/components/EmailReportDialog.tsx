import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import {
  EnvelopeSimple,
  PaperPlaneTilt,
  UserPlus,
  CheckCircle,
  Plus,
  X,
  Eye,
  Paperclip,
  FilePdf,
  FileText,
  Lock,
  FolderOpen,
  MagicWand
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { EmailAttachmentPreview } from '@/components/EmailAttachmentPreview'
import { FileUploadDropzone, type UploadedFile } from '@/components/FileUploadDropzone'
import { EmailTemplateManager, type EmailTemplate } from '@/components/EmailTemplateManager'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('EmailReportDialog')

interface EmailReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportTitle: string
  reportType: string
  recipientSuggestions?: string[]
  onSend: (emailData: EmailData) => Promise<void>
  attachments?: Array<{
    name: string
    size: number
    type: 'pdf' | 'csv' | 'excel'
    preview?: string
  }>
}

export interface EmailData {
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  message: string
  includePassword: boolean
  password?: string
  sendCopy: boolean
  scheduleDate?: Date
  selectedAttachments?: string[]
  customAttachments?: UploadedFile[]
}

interface SavedRecipient {
  email: string
  name: string
  type: 'client' | 'bank' | 'lawyer' | 'other'
  lastUsed: Date
}

export function EmailReportDialog({
  open,
  onOpenChange,
  reportTitle,
  reportType,
  recipientSuggestions = [],
  onSend,
  attachments = []
}: EmailReportDialogProps) {
  const [emailTemplates, _setEmailTemplates] = useKV<EmailTemplate[]>('email-templates', [])

  const [savedRecipients, setSavedRecipients] = useKV<SavedRecipient[]>('saved-recipients', [])
  const [_emailHistory, setEmailHistory] = useKV<any[]>('email-history', [])

  const [to, setTo] = useState<string[]>(recipientSuggestions)
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState(`דוח ${reportType} - ${reportTitle}`)
  const [message, setMessage] = useState('')
  const [includePassword, setIncludePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [sendCopy, setSendCopy] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [newRecipient, setNewRecipient] = useState('')
  const [newCc, setNewCc] = useState('')
  const [newBcc, setNewBcc] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [showPreview, setShowPreview] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>(
    attachments.map(a => a.name)
  )
  const [customAttachments, setCustomAttachments] = useState<UploadedFile[]>([])

  const applyTemplate = (template: EmailTemplate) => {
    const replacePlaceholders = (text: string) => {
      return text
        .replace(/{property}/g, reportTitle)
        .replace(/{reportType}/g, reportType)
        .replace(/{date}/g, new Date().toLocaleDateString('he-IL'))
    }

    setSubject(replacePlaceholders(template.subject))
    setMessage(replacePlaceholders(template.message))
    setSelectedTemplate(template.id)
    toast.success(`תבנית "${template.name}" הוחלה`)
  }

  const addRecipient = (email: string, type: 'to' | 'cc' | 'bcc') => {
    if (!email || !email.includes('@')) {
      toast.error('נא להזין כתובת אימייל תקינה')
      return
    }

    const emailLower = email.toLowerCase().trim()

    switch (type) {
      case 'to':
        if (!to.includes(emailLower)) {
          setTo([...to, emailLower])
          setNewRecipient('')
        }
        break
      case 'cc':
        if (!cc.includes(emailLower)) {
          setCc([...cc, emailLower])
          setNewCc('')
        }
        break
      case 'bcc':
        if (!bcc.includes(emailLower)) {
          setBcc([...bcc, emailLower])
          setNewBcc('')
        }
        break
    }
  }

  const removeRecipient = (email: string, type: 'to' | 'cc' | 'bcc') => {
    switch (type) {
      case 'to':
        setTo(to.filter(e => e !== email))
        break
      case 'cc':
        setCc(cc.filter(e => e !== email))
        break
      case 'bcc':
        setBcc(bcc.filter(e => e !== email))
        break
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let pwd = ''
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(pwd)
    toast.success('סיסמה נוצרה')
  }

  const toggleAttachment = (attachmentName: string) => {
    setSelectedAttachments(prev => {
      if (prev.includes(attachmentName)) {
        if (prev.length === 1) {
          toast.error('חייב לבחור לפחות קובץ אחד')
          return prev
        }
        return prev.filter(name => name !== attachmentName)
      } else {
        return [...prev, attachmentName]
      }
    })
  }

  const selectAllAttachments = () => {
    setSelectedAttachments(attachments.map(a => a.name))
    toast.success('כל הקבצים נבחרו')
  }

  const deselectAllAttachments = () => {
    if (attachments.length > 0) {
      setSelectedAttachments([attachments[0].name])
      toast.info('חייב לבחור לפחות קובץ אחד')
    }
  }

  const getFileIcon = (type: 'pdf' | 'csv' | 'excel') => {
    switch (type) {
      case 'pdf':
        return <FilePdf size={20} weight="duotone" className="text-destructive" />
      case 'csv':
        return <FileText size={20} weight="duotone" className="text-success" />
      case 'excel':
        return <FileText size={20} weight="duotone" className="text-success" />
      default:
        return <Paperclip size={20} weight="duotone" />
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSend = async () => {
    if (to.length === 0) {
      toast.error('נא להוסיף לפחות נמען אחד')
      return
    }

    if (!subject.trim()) {
      toast.error('נא להזין נושא להודעה')
      return
    }

    if (includePassword && !password.trim()) {
      toast.error('נא להזין סיסמה או ליצור סיסמה אוטומטית')
      return
    }

    if (selectedAttachments.length === 0 && customAttachments.length === 0) {
      toast.error('נא לבחור לפחות קובץ אחד לשליחה')
      return
    }

    const incompleteUploads = customAttachments.filter(f => f.status !== 'complete')
    if (incompleteUploads.length > 0) {
      toast.error('נא להמתין לסיום העלאת כל הקבצים')
      return
    }

    setIsSending(true)

    try {
      const emailData: EmailData = {
        to,
        cc,
        bcc,
        subject,
        message,
        includePassword,
        password: includePassword ? password : undefined,
        sendCopy,
        selectedAttachments,
        customAttachments: customAttachments.filter(f => f.status === 'complete')
      }

      await onSend(emailData)

      setEmailHistory((current) => [
        {
          date: new Date().toISOString(),
          to,
          subject,
          reportTitle,
          reportType,
          status: 'sent',
          attachmentCount: selectedAttachments.length + customAttachments.length
        },
        ...(current || []).slice(0, 49)
      ])

      to.forEach(email => {
        setSavedRecipients((current) => {
          const existing = (current || []).find(r => r.email === email)
          if (existing) {
            return (current || []).map(r =>
              r.email === email ? { ...r, lastUsed: new Date() } : r
            )
          } else {
            return [
              ...(current || []),
              {
                email,
                name: email.split('@')[0],
                type: 'other' as const,
                lastUsed: new Date()
              }
            ]
          }
        })
      })

      toast.success('הדוח נשלח בהצלחה!')
      onOpenChange(false)
    } catch (error) {
      log.error('Error sending email:', error)
      toast.error('שגיאה בשליחת האימייל')
    } finally {
      setIsSending(false)
    }
  }

  const recentRecipients = savedRecipients
    ?.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    .slice(0, 5)

  const defaultAttachments = attachments.length > 0 ? attachments : [
    {
      name: `${reportTitle}.pdf`,
      size: 1024 * 500,
      type: 'pdf' as const,
    }
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EnvelopeSimple size={24} weight="duotone" className="text-primary" />
            שליחת דוח באימייל
          </DialogTitle>
          <DialogDescription>
            שלח את הדוח "{reportTitle}" ישירות למיילים המבוקשים
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">תבניות הודעה</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateManager(true)}
                  className="gap-2"
                >
                  <FolderOpen size={16} />
                  נהל תבניות
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {emailTemplates && emailTemplates.length > 0 ? (
                  emailTemplates.slice(0, 6).map(template => (
                    <Button
                      key={template.id}
                      variant={selectedTemplate === template.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="justify-start h-auto py-2 px-3"
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-xs font-semibold">{template.name}</span>
                        {template.useCount > 0 && (
                          <span className="text-[10px] opacity-70">
                            {template.useCount} שימושים
                          </span>
                        )}
                      </div>
                    </Button>
                  ))
                ) : (
                  <div className="col-span-2 lg:col-span-3 text-center py-4 text-sm text-muted-foreground">
                    אין תבניות. לחץ על "נהל תבניות" ליצירת תבניות.
                  </div>
                )}
              </div>
              {emailTemplates && emailTemplates.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateManager(true)}
                  className="w-full gap-2"
                >
                  <MagicWand size={16} />
                  הצג עוד {emailTemplates.length - 6} תבניות
                </Button>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="to">אל: *</Label>
              <div className="flex gap-2">
                <Input
                  id="to"
                  type="email"
                  placeholder="example@email.com"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addRecipient(newRecipient, 'to')
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => addRecipient(newRecipient, 'to')}
                >
                  <Plus size={18} />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {to.map(email => (
                  <Badge key={email} variant="secondary" className="gap-2 pl-2 pr-3">
                    {email}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-destructive/20"
                      onClick={() => removeRecipient(email, 'to')}
                    >
                      <X size={12} />
                    </Button>
                  </Badge>
                ))}
              </div>

              {recentRecipients && recentRecipients.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">נמענים אחרונים:</Label>
                  <div className="flex flex-wrap gap-2">
                    {recentRecipients.map(recipient => (
                      <Button
                        key={recipient.email}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (!to.includes(recipient.email)) {
                            setTo([...to, recipient.email])
                          }
                        }}
                      >
                        <UserPlus size={14} className="ml-1" />
                        {recipient.email}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(!showCc)}
              >
                {showCc ? 'הסתר' : 'הוסף'} עותק (CC)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(!showBcc)}
              >
                {showBcc ? 'הסתר' : 'הוסף'} עותק נסתר (BCC)
              </Button>
            </div>

            <AnimatePresence>
              {showCc && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <Label htmlFor="cc">עותק (CC):</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cc"
                      type="email"
                      placeholder="cc@email.com"
                      value={newCc}
                      onChange={(e) => setNewCc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addRecipient(newCc, 'cc')
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => addRecipient(newCc, 'cc')}
                    >
                      <Plus size={18} />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cc.map(email => (
                      <Badge key={email} variant="outline" className="gap-2 pl-2 pr-3">
                        {email}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => removeRecipient(email, 'cc')}
                        >
                          <X size={12} />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              {showBcc && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <Label htmlFor="bcc">עותק נסתר (BCC):</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bcc"
                      type="email"
                      placeholder="bcc@email.com"
                      value={newBcc}
                      onChange={(e) => setNewBcc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addRecipient(newBcc, 'bcc')
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => addRecipient(newBcc, 'bcc')}
                    >
                      <Plus size={18} />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bcc.map(email => (
                      <Badge key={email} variant="outline" className="gap-2 pl-2 pr-3">
                        {email}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => removeRecipient(email, 'bcc')}
                        >
                          <X size={12} />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="subject">נושא: *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="נושא ההודעה"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="message">הודעה:</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="תוכן ההודעה (אופציונלי)"
                rows={8}
                className="resize-none"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip size={20} weight="duotone" className="text-primary" />
                  <Label className="text-base font-semibold">דוחות ממערכת</Label>
                  <Badge variant="secondary" className="mr-2">
                    {selectedAttachments.length} מתוך {attachments.length}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllAttachments}
                    disabled={selectedAttachments.length === attachments.length}
                  >
                    בחר הכל
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllAttachments}
                    disabled={selectedAttachments.length === 1 && attachments.length === 1}
                  >
                    נקה הכל
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {defaultAttachments.map((attachment, index) => {
                  const isSelected = selectedAttachments.includes(attachment.name)
                  const _totalSelectedSize = defaultAttachments
                    .filter(a => selectedAttachments.includes(a.name))
                    .reduce((sum, a) => sum + a.size, 0)

                  return (
                    <Card
                      key={index}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary/50",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border opacity-60 hover:opacity-100"
                      )}
                      onClick={() => toggleAttachment(attachment.name)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleAttachment(attachment.name)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="shrink-0">
                            {getFileIcon(attachment.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "text-sm font-semibold truncate",
                                !isSelected && "text-muted-foreground"
                              )}>
                                {attachment.name}
                              </p>
                              {includePassword && (
                                <Lock size={12} className="text-warning shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.size)} • {attachment.type.toUpperCase()}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle size={18} className="text-primary shrink-0" weight="fill" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {selectedAttachments.length > 0 && (
                <Card className="glass-effect bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">סה"כ גודל דוחות ממערכת:</span>
                      <span className={cn(
                        "font-mono",
                        defaultAttachments
                          .filter(a => selectedAttachments.includes(a.name))
                          .reduce((sum, a) => sum + a.size, 0) > 10 * 1024 * 1024 
                          && "text-warning font-semibold"
                      )}>
                        {formatFileSize(
                          defaultAttachments
                            .filter(a => selectedAttachments.includes(a.name))
                            .reduce((sum, a) => sum + a.size, 0)
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Paperclip size={20} weight="duotone" className="text-accent" />
                צרף קבצים נוספים
                <Badge variant="outline" className="mr-2 font-normal">
                  אופציונלי
                </Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                גרור ושחרר קבצים נוספים לצירוף להודעה (מסמכים, תמונות, דוחות)
              </p>
              
              <FileUploadDropzone
                uploadedFiles={customAttachments}
                onFilesAdded={(files) => {
                  setCustomAttachments(prev => [...prev, ...files])
                }}
                onFileRemoved={(fileId) => {
                  setCustomAttachments(prev => prev.filter(f => f.id !== fileId))
                }}
                maxFiles={10}
                maxFileSize={10 * 1024 * 1024}
              />
            </div>

            <Separator />

            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="password"
                    checked={includePassword}
                    onCheckedChange={(checked) => setIncludePassword(checked as boolean)}
                  />
                  <Label htmlFor="password" className="cursor-pointer">
                    הגן על הדוח בסיסמה
                  </Label>
                </div>
                {includePassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                  >
                    צור סיסמה
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {includePassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="הזן סיסמה"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      הסיסמה תישלח בהודעה נפרדת לנמענים
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendCopy"
                  checked={sendCopy}
                  onCheckedChange={(checked) => setSendCopy(checked as boolean)}
                />
                <Label htmlFor="sendCopy" className="cursor-pointer">
                  שלח עותק אלי
                </Label>
              </div>
            </div>

            {(selectedAttachments.length > 0 || customAttachments.length > 0) && (
              <Card className="glass-effect bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between font-semibold">
                      <span>סיכום קבצים לשליחה</span>
                      <Badge variant="default">
                        {selectedAttachments.length + customAttachments.filter(f => f.status === 'complete').length} קבצים
                      </Badge>
                    </div>
                    <Separator className="bg-primary/20" />
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>דוחות ממערכת:</span>
                      <span className="font-mono">
                        {formatFileSize(
                          defaultAttachments
                            .filter(a => selectedAttachments.includes(a.name))
                            .reduce((sum, a) => sum + a.size, 0)
                        )}
                      </span>
                    </div>
                    {customAttachments.filter(f => f.status === 'complete').length > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>קבצים נוספים:</span>
                        <span className="font-mono">
                          {formatFileSize(
                            customAttachments
                              .filter(f => f.status === 'complete')
                              .reduce((sum, f) => sum + f.size, 0)
                          )}
                        </span>
                      </div>
                    )}
                    <Separator className="bg-primary/20" />
                    <div className="flex items-center justify-between font-semibold">
                      <span>סה"כ גודל:</span>
                      <span className={cn(
                        "font-mono",
                        (defaultAttachments
                          .filter(a => selectedAttachments.includes(a.name))
                          .reduce((sum, a) => sum + a.size, 0) + 
                          customAttachments
                            .filter(f => f.status === 'complete')
                            .reduce((sum, f) => sum + f.size, 0)) > 20 * 1024 * 1024 
                          && "text-warning"
                      )}>
                        {formatFileSize(
                          defaultAttachments
                            .filter(a => selectedAttachments.includes(a.name))
                            .reduce((sum, a) => sum + a.size, 0) + 
                          customAttachments
                            .filter(f => f.status === 'complete')
                            .reduce((sum, f) => sum + f.size, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(true)}
            className="gap-2"
          >
            <Eye size={18} />
            תצוגה מקדימה
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleSend} disabled={isSending || to.length === 0}>
            <PaperPlaneTilt size={18} className="ml-2" weight="fill" />
            {isSending ? 'שולח...' : 'שלח דוח'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <EmailAttachmentPreview
      open={showPreview}
      onOpenChange={setShowPreview}
      emailData={{
        to,
        cc,
        bcc,
        subject,
        message,
        includePassword,
        password
      }}
      attachments={defaultAttachments.filter(a => selectedAttachments.includes(a.name))}
      customAttachments={customAttachments.filter(f => f.status === 'complete')}
      reportTitle={reportTitle}
    />

    <EmailTemplateManager
      open={showTemplateManager}
      onOpenChange={setShowTemplateManager}
      onSelectTemplate={(template) => {
        applyTemplate(template)
        setShowTemplateManager(false)
      }}
    />
  </>
  )
}
