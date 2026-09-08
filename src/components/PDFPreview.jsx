import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Download, X, MagnifyingGlassPlus, MagnifyingGlassMinus, ArrowsOut, ArrowsIn } from '@phosphor-icons/react'

const MM_TO_PX = 3.779

export function PDFPreview({ branding, onClose, onDownload }) {
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const previewRef = useRef(null)

  const handleZoomIn = () => setZoom(Math.min(zoom + 10, 200))
  const handleZoomOut = () => setZoom(Math.max(zoom - 10, 50))

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isFullscreen])

  const mmToPx = (mm) => mm * MM_TO_PX
  const headerHeight = branding?.header?.enabled ? branding.header.height : 0
  const footerHeight = branding?.footer?.enabled ? branding.footer.height : 0
  const a4WidthPx = mmToPx(210)
  const a4HeightPx = mmToPx(297)

  const scale = zoom / 100

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
            <div className="flex items-start justify-center p-8">
              <div
                ref={previewRef}
                className="bg-white shadow-2xl"
                style={{
                  width: `${a4WidthPx * scale}px`,
                  minHeight: `${a4HeightPx * scale}px`,
                  fontFamily: branding?.fonts?.body || 'system-ui',
                  transition: 'all 0.2s ease',
                }}
              >
                {branding?.header?.enabled && (
                  <div
                    className="flex items-center px-6"
                    style={{
                      height: `${mmToPx(headerHeight) * scale}px`,
                      backgroundColor: branding.colors?.headerBackground || '#f5f5f5',
                      color: branding.colors?.headerText || '#000',
                      borderBottom: branding.header.borderBottom ? '1px solid rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {branding.header.showLogo && branding.logo?.dataUrl && (
                      <div className="flex-shrink-0" style={{ marginLeft: '12px' }}>
                        <img
                          src={branding.logo.dataUrl}
                          alt="Company Logo"
                          style={{
                            maxHeight: `${mmToPx(headerHeight * 0.7) * scale}px`,
                            maxWidth: `${mmToPx(60) * scale}px`,
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                    )}
                    {branding.header.showCompanyName && (
                      <div className="flex-1 text-right">
                        <h1
                          style={{
                            fontSize: `${(branding.fonts?.headingSize || 16) * scale}pt`,
                            fontFamily: branding.fonts?.heading || 'system-ui',
                            color: branding.colors?.headerText || '#000',
                            fontWeight: 'bold',
                            margin: '0',
                            lineHeight: '1.2',
                          }}
                        >
                          {branding.companyName || 'Company Name'}
                        </h1>
                        {branding.header.showTagline && branding.companyTagline && (
                          <p
                            style={{
                              fontSize: `${(branding.fonts?.bodySize || 12) * 0.9 * scale}pt`,
                              margin: '0',
                              opacity: 0.9,
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
                  style={{
                    padding: `${mmToPx(branding?.pageLayout?.margins?.top || 10) * scale}px 
                             ${mmToPx(branding?.pageLayout?.margins?.right || 10) * scale}px 
                             ${mmToPx(branding?.pageLayout?.margins?.bottom || 10) * scale}px 
                             ${mmToPx(branding?.pageLayout?.margins?.left || 10) * scale}px`,
                  }}
                >
                  <div style={{ textAlign: 'right', marginBottom: `${32 * scale}px` }}>
                    <h2
                      style={{
                        fontSize: `${(branding.fonts?.headingSize || 16) * 1.5 * scale}pt`,
                        fontFamily: branding.fonts?.heading || 'system-ui',
                        color: branding.colors?.primary || '#1f2937',
                        fontWeight: 'bold',
                        marginBottom: `${16 * scale}px`,
                      }}
                    >
                      דוח שמאות נדל״ן
                    </h2>
                    <div style={{ fontSize: `${(branding.fonts?.bodySize || 12) * scale}pt`, lineHeight: '1.6' }}>
                      <p style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>מספר דוח:</span> VAL-2024-001
                      </p>
                      <p style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>תאריך:</span> {new Date().toLocaleDateString('he-IL')}
                      </p>
                      <p style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>מוכן עבור:</span> לקוח לדוגמה
                      </p>
                    </div>
                  </div>

                  {[
                    { title: 'פרטי הנכס', fields: ['כתובת: רחוב הדוגמה 123, תל אביב', 'סוג נכס: דירת מגורים', 'שטח: 120 מ״ר'] },
                    { title: 'תוצאות השמאות', fields: ['שווי משוער: ₪3,500,000'] }
                  ].map((section, idx) => (
                    <div key={idx} style={{ marginBottom: `${24 * scale}px` }}>
                      <h3
                        style={{
                          fontSize: `${(branding.fonts?.headingSize || 16) * scale}pt`,
                          fontFamily: branding.fonts?.heading || 'system-ui',
                          color: branding.colors?.primary || '#1f2937',
                          fontWeight: 'bold',
                          marginBottom: `${12 * scale}px`,
                          paddingBottom: `${8 * scale}px`,
                          borderBottom: `1px solid ${branding.colors?.primary || '#1f2937'}40`,
                        }}
                      >
                        {section.title}
                      </h3>
                      <div style={{ fontSize: `${(branding.fonts?.bodySize || 12) * scale}pt`, lineHeight: '1.6' }}>
                        {section.fields.map((field, fidx) => (
                          <p key={fidx} style={{ marginBottom: '8px' }}>{field}</p>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: `${48 * scale}px`, paddingTop: `${24 * scale}px`, borderTop: `1px solid ${branding.colors?.primary || '#1f2937'}40` }}>
                    <p style={{ fontSize: `${(branding.fonts?.bodySize || 12) * 0.85 * scale}pt`, color: '#666', margin: '0' }}>
                      <span style={{ fontWeight: 'bold' }}>הערה:</span> דוח זה הינו דוגמה להמחשה בלבד ואינו מהווה שומה רשמית.
                    </p>
                  </div>
                </div>

                {branding?.footer?.enabled && (
                  <div
                    style={{
                      height: `${mmToPx(footerHeight) * scale}px`,
                      backgroundColor: branding.colors?.footerBackground || '#f5f5f5',
                      color: branding.colors?.footerText || '#000',
                      borderTop: branding.footer.borderTop ? '1px solid rgba(0,0,0,0.1)' : 'none',
                      fontSize: `${(branding.fonts?.bodySize || 12) * 0.8 * scale}pt`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: `0 ${mmToPx(10) * scale}px`,
                      marginTop: 'auto',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      {branding.footer.showCompanyName && (
                        <p style={{ fontWeight: 'bold', margin: '0' }}>{branding.companyName}</p>
                      )}
                      {branding.footer.showContactInfo && (
                        <p style={{ margin: '0', opacity: 0.8, fontSize: 'smaller' }}>
                          {[branding.contactInfo?.phone, branding.contactInfo?.email, branding.contactInfo?.website]
                            .filter(Boolean)
                            .join(' | ')}
                        </p>
                      )}
                    </div>
                    {branding.footer.showPageNumbers && (
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ margin: '0' }}>עמוד 1 מתוך 1</p>
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