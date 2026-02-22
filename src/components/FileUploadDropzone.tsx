import { useCallback, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  FilePdf,
  FileDoc,
  FileXls,
  FileImage,
  FileText,
  FileZip,
  File as FileIcon,
  X,
  CheckCircle,
  WarningCircle,
  CloudArrowUp
} from '@phosphor-icons/react'
import { cn, uid } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  data: string
  uploadProgress: number
  status: 'uploading' | 'complete' | 'error'
  preview?: string
}

interface FileUploadDropzoneProps {
  onFilesAdded: (files: UploadedFile[]) => void
  onFileRemoved: (fileId: string) => void
  uploadedFiles?: UploadedFile[]
  maxFiles?: number
  maxFileSize?: number
  acceptedFileTypes?: string[]
  className?: string
}

const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
]

const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'image/jpeg': 'תמונה',
  'image/png': 'תמונה',
  'image/gif': 'תמונה',
  'image/webp': 'תמונה',
  'text/plain': 'טקסט',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP'
}

export function FileUploadDropzone({
  onFilesAdded,
  onFileRemoved,
  uploadedFiles = [],
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  className
}: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FilePdf size={24} weight="duotone" className="text-destructive" />
    if (type.includes('word') || type.includes('document')) return <FileDoc size={24} weight="duotone" className="text-blue-500" />
    if (type.includes('excel') || type.includes('spreadsheet')) return <FileXls size={24} weight="duotone" className="text-green-500" />
    if (type.includes('image')) return <FileImage size={24} weight="duotone" className="text-purple-500" />
    if (type.includes('text')) return <FileText size={24} weight="duotone" className="text-muted-foreground" />
    if (type.includes('zip')) return <FileZip size={24} weight="duotone" className="text-warning" />
    return <FileIcon size={24} weight="duotone" className="text-muted-foreground" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const validateFile = (file: File): string | null => {
    if (!acceptedFileTypes.includes(file.type)) {
      return `סוג הקובץ ${file.type} אינו נתמך`
    }
    if (file.size > maxFileSize) {
      return `הקובץ גדול מדי (מקסימום ${formatFileSize(maxFileSize)})`
    }
    if (uploadedFiles.length >= maxFiles) {
      return `ניתן להעלות עד ${maxFiles} קבצים בלבד`
    }
    return null
  }

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const validFiles: UploadedFile[] = []

    for (const file of files) {
      const error = validateFile(file)
      if (error) {
        toast.error(error)
        continue
      }

      const fileId = uid('file')
      
      const reader = new FileReader()
      
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        data: '',
        uploadProgress: 0,
        status: 'uploading'
      }

      validFiles.push(uploadedFile)

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          uploadedFile.uploadProgress = progress
        }
      }

      reader.onload = (e) => {
        uploadedFile.data = e.target?.result as string
        uploadedFile.uploadProgress = 100
        uploadedFile.status = 'complete'
        
        if (file.type.startsWith('image/')) {
          uploadedFile.preview = uploadedFile.data
        }
      }

      reader.onerror = () => {
        uploadedFile.status = 'error'
        toast.error(`שגיאה בקריאת הקובץ ${file.name}`)
      }

      reader.readAsDataURL(file)
    }

    if (validFiles.length > 0) {
      onFilesAdded(validFiles)
      toast.success(`${validFiles.length} קבצים נוספו בהצלחה`)
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

   
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFiles(files)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedFiles.length, maxFiles])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFiles(files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const canAddMoreFiles = uploadedFiles.length < maxFiles

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          "border-2 border-dashed transition-all cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/10 shadow-lg scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-accent/5",
          !canAddMoreFiles && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={canAddMoreFiles ? handleDragEnter : undefined}
        onDragLeave={canAddMoreFiles ? handleDragLeave : undefined}
        onDragOver={canAddMoreFiles ? handleDragOver : undefined}
        onDrop={canAddMoreFiles ? handleDrop : undefined}
        onClick={canAddMoreFiles ? handleBrowseClick : undefined}
      >
        <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <motion.div
            animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <CloudArrowUp 
              size={64} 
              weight="duotone" 
              className={cn(
                "transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )}
            />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragging ? 'שחרר לצרוף הקבצים' : 'גרור ושחרר קבצים כאן'}
            </h3>
            <p className="text-sm text-muted-foreground">
              או לחץ לבחירת קבצים מהמחשב
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
            <Badge variant="outline">PDF</Badge>
            <Badge variant="outline">Word</Badge>
            <Badge variant="outline">Excel</Badge>
            <Badge variant="outline">תמונות</Badge>
            <Badge variant="outline">ZIP</Badge>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>מקסימום {maxFiles} קבצים • עד {formatFileSize(maxFileSize)} לקובץ</p>
            {uploadedFiles.length > 0 && (
              <p className="font-semibold">
                {uploadedFiles.length} מתוך {maxFiles} קבצים הועלו
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileInputChange}
        title="בחירת קבצים להעלאה"
        aria-label="בחירת קבצים להעלאה"
        className="hidden"
      />

      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileIcon size={16} weight="duotone" />
                קבצים מצורפים ({uploadedFiles.length})
              </h4>
              {uploadedFiles.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    uploadedFiles.forEach(file => onFileRemoved(file.id))
                    toast.success('כל הקבצים הוסרו')
                  }}
                  className="h-7 text-xs"
                >
                  הסר הכל
                </Button>
              )}
            </div>

            <div className="grid gap-2">
              {uploadedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
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
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">
                              {file.name}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {FILE_TYPE_LABELS[file.type] || file.type.split('/')[1].toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                            {file.status === 'uploading' && (
                              <div className="flex-1 max-w-[200px]">
                                <Progress value={file.uploadProgress} className="h-1" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {file.status === 'complete' && (
                            <CheckCircle size={18} className="text-success" weight="fill" />
                          )}
                          {file.status === 'error' && (
                            <WarningCircle size={18} className="text-destructive" weight="fill" />
                          )}
                          {file.status === 'uploading' && (
                            <div className="text-xs font-mono text-muted-foreground">
                              {file.uploadProgress}%
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onFileRemoved(file.id)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card className="glass-effect bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">סה"כ גודל:</span>
                  <span className={cn(
                    "font-mono",
                    uploadedFiles.reduce((sum, f) => sum + f.size, 0) > maxFileSize 
                      && "text-warning font-semibold"
                  )}>
                    {formatFileSize(uploadedFiles.reduce((sum, f) => sum + f.size, 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
