import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Download, X, MagnifyingGlassPlus, MagnifyingGlassMinus, ArrowsOut, ArrowsIn } from '@phosphor-icons/react'
import type { BrandingSettings } from '@/lib/types'

interface PDFPreviewProps {
  branding: BrandingSettings
  onClose?: () => void
  onDownload?: () => void
}

export function PDFPreview({ branding, onClose, onDownload }: PDFPreviewProps) {
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = () => setZoom(Math.min(zoom + 10, 200))
  const handleZoomOut = () => setZoom(Math.max(zoom - 10, 50))

  const _a4AspectRatio = 297 / 210

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isFullscreen])

  const headerHeight = branding.header.enabled ? branding.header.height : 0
  const footerHeight = branding.footer.enabled ? branding.footer.height : 0

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'relative'}`}>
      <Card className={`${isFullscreen ? 'h-full rounded-none' : 'glass-effect border-border/50'}`}>
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>תצוגה מקדימה - PDF</CardTitle>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {zoom}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                <MagnifyingGlassMinus size={18} weight="duotone" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                <MagnifyingGlassPlus size={18} weight="duotone" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="gap-2"
              >
                {isFullscreen ? (
                  <>
                    <ArrowsIn size={18} weight="duotone" />
                    <span className="hidden sm:inline">צמצם</span>
                  </>
                ) : (
                  <>
                    <ArrowsOut size={18} weight="duotone" />
                    <span className="hidden sm:inline">הגדל</span>
                  </>
                )}
              </Button>
              <Separator orientation="vertical" className="h-6" />
              {onDownload && (
                <Button onClick={onDownload} size="sm" className="gap-2">
                  <Download size={18} weight="duotone" />
                  <span className="hidden sm:inline">הורד PDF</span>
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X size={20} weight="duotone" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className={`${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[800px]'} bg-muted/30`}>
            <div className="flex items-center justify-center p-8">
              <div
                ref={previewRef}
                className="bg-white shadow-2xl"
                style={{
                  width: `${(210 * zoom) / 100}mm`,
                  minHeight: `${(297 * zoom) / 100}mm`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  fontFamily: branding.fonts.body,
                }}
              >
                {branding.header.enabled && (
                  <div
                    className="flex items-center px-6"
                    style={{
                      height: `${headerHeight}mm`,
                      backgroundColor: branding.colors.headerBackground,
                      color: branding.colors.headerText,
                      borderBottom: branding.header.borderBottom ? '1px solid rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {branding.header.showLogo && branding.logo && (
                      <div className="shrink-0" style={{ marginLeft: '12px' }}>
                        <img
                          src={branding.logo.dataUrl}
                          alt="Company Logo"
                          style={{
                            maxHeight: `${headerHeight * 0.7}mm`,
                            maxWidth: '60mm',
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                    )}
                    {branding.header.showCompanyName && (
                      <div className="flex-1 text-right">
                        <h1
                          className="font-bold leading-tight"
                          style={{
                            fontSize: `${branding.fonts.headingSize}pt`,
                            fontFamily: branding.fonts.heading,
                            color: branding.colors.headerText,
                          }}
                        >
                          {branding.companyName}
                        </h1>
                        {branding.header.showTagline && branding.companyTagline && (
                          <p
                            className="text-sm opacity-90"
                            style={{
                              fontSize: `${branding.fonts.bodySize * 0.9}pt`,
                            }}
                          >
                            {branding.companyTagline}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="px-8 py-6"
                  style={{
                    marginTop: `${branding.pageLayout.margins.top}mm`,
                    marginBottom: `${branding.pageLayout.margins.bottom}mm`,
                    marginLeft: `${branding.pageLayout.margins.left}mm`,
                    marginRight: `${branding.pageLayout.margins.right}mm`,
                  }}
                >
                  <div className="text-right mb-8">
                    <h2
                      className="font-bold mb-4"
                      style={{
                        fontSize: `${branding.fonts.headingSize * 1.5}pt`,
                        fontFamily: branding.fonts.heading,
                        color: branding.colors.primary,
                      }}
                    >
                      דוח שמאות נדל״ן
                    </h2>
                    <div
                      style={{
                        fontSize: `${branding.fonts.bodySize}pt`,
                        lineHeight: '1.6',
                      }}
                    >
                      <p className="mb-2">
                        <span className="font-semibold">מספר דוח:</span> VAL-2024-001
                      </p>
                      <p className="mb-2">
                        <span className="font-semibold">תאריך:</span> {new Date().toLocaleDateString('he-IL')}
                      </p>
                      <p className="mb-2">
                        <span className="font-semibold">מוכן עבור:</span> לקוח לדוגמה
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3
                      className="font-bold mb-3 pb-2 border-b"
                      style={{
                        fontSize: `${branding.fonts.headingSize}pt`,
                        fontFamily: branding.fonts.heading,
                        color: branding.colors.primary,
                        borderColor: branding.colors.primary + '40',
                      }}
                    >
                      פרטי הנכס
                    </h3>
                    <div
                      className="space-y-2"
                      style={{
                        fontSize: `${branding.fonts.bodySize}pt`,
                        lineHeight: '1.6',
                      }}
                    >
                      <p>
                        <span className="font-semibold">כתובת:</span> רחוב הדוגמה 123, תל אביב
                      </p>
                      <p>
                        <span className="font-semibold">סוג נכס:</span> דירת מגורים
                      </p>
                      <p>
                        <span className="font-semibold">שטח:</span> 120 מ״ר
                      </p>
                      <p>
                        <span className="font-semibold">חדרים:</span> 4 חדרים
                      </p>
                      <p>
                        <span className="font-semibold">קומה:</span> 3 מתוך 5
                      </p>
                      <p>
                        <span className="font-semibold">שנת בניה:</span> 2015
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3
                      className="font-bold mb-3 pb-2 border-b"
                      style={{
                        fontSize: `${branding.fonts.headingSize}pt`,
                        fontFamily: branding.fonts.heading,
                        color: branding.colors.primary,
                        borderColor: branding.colors.primary + '40',
                      }}
                    >
                      תוצאות השמאות
                    </h3>
                    <div
                      className="p-4 rounded"
                      style={{
                        backgroundColor: branding.colors.accent + '20',
                        border: `2px solid ${branding.colors.accent}`,
                      }}
                    >
                      <p
                        className="text-center font-bold"
                        style={{
                          fontSize: `${branding.fonts.headingSize * 1.2}pt`,
                          color: branding.colors.accent,
                        }}
                      >
                        שווי משוער: ₪3,500,000
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3
                      className="font-bold mb-3 pb-2 border-b"
                      style={{
                        fontSize: `${branding.fonts.headingSize}pt`,
                        fontFamily: branding.fonts.heading,
                        color: branding.colors.primary,
                        borderColor: branding.colors.primary + '40',
                      }}
                    >
                      שיטת חישוב
                    </h3>
                    <p
                      style={{
                        fontSize: `${branding.fonts.bodySize}pt`,
                        lineHeight: '1.8',
                      }}
                    >
                      השווי נקבע בהתאם לשיטת ההשוואה, תוך בחינת נתוני עסקאות דומות באזור. הערכה זו מבוססת על ניתוח
                      מקיף של השוק המקומי, מאפייני הנכס הפיזיים והתכנוניים, וכן תנאי השוק הנוכחיים. נלקחו בחשבון
                      גורמים כגון מיקום, מצב הנכס, קומה, וזכויות בנייה.
                    </p>
                  </div>

                  <div className="mb-6">
                    <h3
                      className="font-bold mb-3 pb-2 border-b"
                      style={{
                        fontSize: `${branding.fonts.headingSize}pt`,
                        fontFamily: branding.fonts.heading,
                        color: branding.colors.primary,
                        borderColor: branding.colors.primary + '40',
                      }}
                    >
                      עסקאות דומות
                    </h3>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr
                          style={{
                            backgroundColor: branding.colors.primary,
                            color: 'white',
                          }}
                        >
                          <th
                            className="p-2 text-right"
                            style={{ fontSize: `${branding.fonts.bodySize * 0.9}pt` }}
                          >
                            כתובת
                          </th>
                          <th
                            className="p-2 text-center"
                            style={{ fontSize: `${branding.fonts.bodySize * 0.9}pt` }}
                          >
                            שטח
                          </th>
                          <th
                            className="p-2 text-center"
                            style={{ fontSize: `${branding.fonts.bodySize * 0.9}pt` }}
                          >
                            מחיר
                          </th>
                          <th
                            className="p-2 text-center"
                            style={{ fontSize: `${branding.fonts.bodySize * 0.9}pt` }}
                          >
                            תאריך
                          </th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: `${branding.fonts.bodySize}pt` }}>
                        <tr className="border-b">
                          <td className="p-2">רחוב דוגמה 120</td>
                          <td className="p-2 text-center">115 מ״ר</td>
                          <td className="p-2 text-center">₪3,400,000</td>
                          <td className="p-2 text-center">01/2024</td>
                        </tr>
                        <tr className="border-b bg-gray-50">
                          <td className="p-2">שדרות הדוגמה 45</td>
                          <td className="p-2 text-center">125 מ״ר</td>
                          <td className="p-2 text-center">₪3,600,000</td>
                          <td className="p-2 text-center">02/2024</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">רחוב המדגם 78</td>
                          <td className="p-2 text-center">118 מ״ר</td>
                          <td className="p-2 text-center">₪3,450,000</td>
                          <td className="p-2 text-center">03/2024</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-12 pt-6 border-t" style={{ borderColor: branding.colors.primary + '40' }}>
                    <p
                      className="text-sm text-gray-600"
                      style={{ fontSize: `${branding.fonts.bodySize * 0.85}pt` }}
                    >
                      <span className="font-semibold">הערה:</span> דוח זה הינו דוגמה להמחשה בלבד ואינו מהווה שומה רשמית.
                      השווי המשוער עשוי להשתנות בהתאם לתנאי השוק ולנתונים נוספים שיתקבלו.
                    </p>
                  </div>
                </div>

                {branding.footer.enabled && (
                  <div
                    className="flex items-center justify-between px-8 mt-auto"
                    style={{
                      height: `${footerHeight}mm`,
                      backgroundColor: branding.colors.footerBackground,
                      color: branding.colors.footerText,
                      borderTop: branding.footer.borderTop ? '1px solid rgba(0,0,0,0.1)' : 'none',
                      fontSize: `${branding.fonts.bodySize * 0.8}pt`,
                    }}
                  >
                    <div className="text-right">
                      {branding.footer.showCompanyName && (
                        <p className="font-semibold">{branding.companyName}</p>
                      )}
                      {branding.footer.showContactInfo && (
                        <p className="text-xs opacity-80">
                          {[
                            branding.contactInfo.phone,
                            branding.contactInfo.email,
                            branding.contactInfo.website,
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </p>
                      )}
                    </div>
                    {branding.footer.showPageNumbers && (
                      <div className="text-left">
                        <p>עמוד 1 מתוך 1</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
