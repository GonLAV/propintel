import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Palette,
  Image as ImageIcon,
  TextAa,
  Layout,
  FloppyDisk,
  Eye,
  UploadSimple,
  Trash,
  Info
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { BrandingSettings as BrandingSettingsType } from '@/lib/types'
import { getFontsByCategory } from '@/lib/fonts'

const defaultBranding: BrandingSettingsType = {
  id: 'default',
  companyName: 'AppraisalPro',
  companyTagline: 'מקצועיות ומדויקות בשמאות נדל"ן',
  colors: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    headerBackground: '#1E1B4B',
    headerText: '#FFFFFF',
    footerBackground: '#F3F4F6',
    footerText: '#4B5563'
  },
  fonts: {
    heading: 'Helvetica',
    body: 'Helvetica',
    headingSize: 16,
    bodySize: 11
  },
  header: {
    enabled: true,
    height: 40,
    showLogo: true,
    showCompanyName: true,
    showTagline: false,
    borderBottom: true
  },
  footer: {
    enabled: true,
    height: 30,
    showPageNumbers: true,
    showCompanyName: true,
    showContactInfo: true,
    borderTop: true
  },
  contactInfo: {
    phone: '+972-50-123-4567',
    email: 'info@appraisalpro.co.il',
    website: 'www.appraisalpro.co.il'
  },
  pageLayout: {
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    },
    pageSize: 'a4',
    orientation: 'portrait'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isDefault: true
}

export function BrandingSettings() {
  const [branding, setBranding] = useKV<BrandingSettingsType>('branding-settings', defaultBranding)
  const [hasChanges, setHasChanges] = useState(false)

  if (!branding) return null

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('נא להעלות קובץ תמונה בלבד')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('גודל הקובץ חייב להיות פחות מ-2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        setBranding((current) => {
          const base = current || defaultBranding
          return {
            ...base,
            logo: {
              dataUrl: event.target?.result as string,
              width: img.width,
              height: img.height,
              position: base.logo?.position || 'left',
              size: base.logo?.size || 'medium'
            },
            updatedAt: new Date().toISOString()
          }
        })
        setHasChanges(true)
        toast.success('הלוגו הועלה בהצלחה')
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setBranding((current) => {
      const base = current || defaultBranding
      const updated = { ...base }
      delete updated.logo
      updated.updatedAt = new Date().toISOString()
      return updated
    })
    setHasChanges(true)
    toast.success('הלוגו הוסר')
  }

  const handleSave = () => {
    setBranding((current) => {
      const base = current || defaultBranding
      return {
        ...base,
        updatedAt: new Date().toISOString()
      }
    })
    setHasChanges(false)
    toast.success('הגדרות המיתוג נשמרו בהצלחה')
  }

  const handleReset = () => {
    setBranding(defaultBranding)
    setHasChanges(false)
    toast.success('הגדרות המיתוג אופסו לברירת מחדל')
  }

  const updateBranding = (updates: Partial<BrandingSettingsType>) => {
    setBranding((current) => {
      if (!current) return defaultBranding
      return {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString()
      }
    })
    setHasChanges(true)
  }

  const updateColors = (color: keyof BrandingSettingsType['colors'], value: string) => {
    setBranding((current) => {
      if (!current) return defaultBranding
      return {
        ...current,
        colors: {
          ...current.colors,
          [color]: value
        },
        updatedAt: new Date().toISOString()
      }
    })
    setHasChanges(true)
  }

  const updateHeader = (updates: Partial<BrandingSettingsType['header']>) => {
    setBranding((current) => {
      if (!current) return defaultBranding
      return {
        ...current,
        header: {
          ...current.header,
          ...updates
        },
        updatedAt: new Date().toISOString()
      }
    })
    setHasChanges(true)
  }

  const updateFooter = (updates: Partial<BrandingSettingsType['footer']>) => {
    setBranding((current) => {
      if (!current) return defaultBranding
      return {
        ...current,
        footer: {
          ...current.footer,
          ...updates
        },
        updatedAt: new Date().toISOString()
      }
    })
    setHasChanges(true)
  }

  const updateContactInfo = (updates: Partial<BrandingSettingsType['contactInfo']>) => {
    setBranding((current) => {
      if (!current) return defaultBranding
      return {
        ...current,
        contactInfo: {
          ...current.contactInfo,
          ...updates
        },
        updatedAt: new Date().toISOString()
      }
    })
    setHasChanges(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            הגדרות מיתוג
          </h2>
          <p className="text-muted-foreground mt-1">
            התאם אישית את המראה של דוחות PDF עם לוגו, צבעים וכותרות עליונות/תחתונות
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <Info size={14} className="ml-1" />
              שינויים לא שמורים
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} size="sm">
            איפוס
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
            <FloppyDisk size={18} weight="duotone" />
            שמור שינויים
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" dir="rtl" className="space-y-6">
        <TabsList className="glass-effect">
          <TabsTrigger value="general" className="gap-2">
            <Layout size={18} weight="duotone" />
            כללי
          </TabsTrigger>
          <TabsTrigger value="logo" className="gap-2">
            <ImageIcon size={18} weight="duotone" />
            לוגו
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-2">
            <Palette size={18} weight="duotone" />
            צבעים
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-2">
            <TextAa size={18} weight="duotone" />
            טיפוגרפיה
          </TabsTrigger>
          <TabsTrigger value="header-footer" className="gap-2">
            <Layout size={18} weight="duotone" />
            כותרת עליונה/תחתונה
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>פרטי החברה</CardTitle>
                <CardDescription>מידע בסיסי שיופיע בכל הדוחות</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">שם החברה</Label>
                  <Input
                    id="company-name"
                    value={branding.companyName}
                    onChange={(e) => updateBranding({ companyName: e.target.value })}
                    placeholder="שם החברה"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">סלוגן</Label>
                  <Input
                    id="tagline"
                    value={branding.companyTagline || ''}
                    onChange={(e) => updateBranding({ companyTagline: e.target.value })}
                    placeholder="סלוגן החברה"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון</Label>
                    <Input
                      id="phone"
                      value={branding.contactInfo.phone || ''}
                      onChange={(e) => updateContactInfo({ phone: e.target.value })}
                      placeholder="+972-50-123-4567"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">אימייל</Label>
                    <Input
                      id="email"
                      type="email"
                      value={branding.contactInfo.email || ''}
                      onChange={(e) => updateContactInfo({ email: e.target.value })}
                      placeholder="info@company.co.il"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">אתר</Label>
                    <Input
                      id="website"
                      value={branding.contactInfo.website || ''}
                      onChange={(e) => updateContactInfo({ website: e.target.value })}
                      placeholder="www.company.co.il"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license">מספר רישיון</Label>
                    <Input
                      id="license"
                      value={branding.contactInfo.licenseNumber || ''}
                      onChange={(e) => updateContactInfo({ licenseNumber: e.target.value })}
                      placeholder="123456"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">כתובת</Label>
                  <Textarea
                    id="address"
                    value={branding.contactInfo.address || ''}
                    onChange={(e) => updateContactInfo({ address: e.target.value })}
                    placeholder="רחוב 123, עיר, מיקוד"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>פריסת עמוד</CardTitle>
                <CardDescription>הגדרות עמוד ושוליים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>גודל עמוד</Label>
                    <Select
                      value={branding.pageLayout.pageSize}
                      onValueChange={(value: 'a4' | 'letter' | 'legal') =>
                        updateBranding({
                          pageLayout: { ...branding.pageLayout, pageSize: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4</SelectItem>
                        <SelectItem value="letter">Letter</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>כיוון</Label>
                    <Select
                      value={branding.pageLayout.orientation}
                      onValueChange={(value: 'portrait' | 'landscape') =>
                        updateBranding({
                          pageLayout: { ...branding.pageLayout, orientation: value }
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">אנכי</SelectItem>
                        <SelectItem value="landscape">אופקי</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>שוליים עליונים (mm)</Label>
                    <Input
                      type="number"
                      value={branding.pageLayout.margins.top}
                      onChange={(e) =>
                        updateBranding({
                          pageLayout: {
                            ...branding.pageLayout,
                            margins: { ...branding.pageLayout.margins, top: Number(e.target.value) }
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>שוליים תחתונים (mm)</Label>
                    <Input
                      type="number"
                      value={branding.pageLayout.margins.bottom}
                      onChange={(e) =>
                        updateBranding({
                          pageLayout: {
                            ...branding.pageLayout,
                            margins: { ...branding.pageLayout.margins, bottom: Number(e.target.value) }
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>שוליים שמאליים (mm)</Label>
                    <Input
                      type="number"
                      value={branding.pageLayout.margins.left}
                      onChange={(e) =>
                        updateBranding({
                          pageLayout: {
                            ...branding.pageLayout,
                            margins: { ...branding.pageLayout.margins, left: Number(e.target.value) }
                          }
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>שוליים ימניים (mm)</Label>
                    <Input
                      type="number"
                      value={branding.pageLayout.margins.right}
                      onChange={(e) =>
                        updateBranding({
                          pageLayout: {
                            ...branding.pageLayout,
                            margins: { ...branding.pageLayout.margins, right: Number(e.target.value) }
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="logo" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>לוגו החברה</CardTitle>
                <CardDescription>העלה לוגו שיופיע בכותרת העליונה של הדוחות</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {branding.logo ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                      <img
                        src={branding.logo.dataUrl}
                        alt="Company Logo"
                        className="max-h-32 object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleRemoveLogo} className="flex-1 gap-2">
                        <Trash size={18} weight="duotone" />
                        הסר לוגו
                      </Button>
                      <Button variant="outline" onClick={() => document.getElementById('logo-upload-replace')?.click()} className="flex-1 gap-2">
                        <UploadSimple size={18} weight="duotone" />
                        החלף לוגו
                      </Button>
                      <input
                        id="logo-upload-replace"
                        type="file"
                        accept="image/*"
                        title="החלפת לוגו חברה"
                        aria-label="החלפת לוגו חברה"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>מיקום לוגו</Label>
                        <Select
                          value={branding.logo.position}
                          onValueChange={(value: 'left' | 'center' | 'right') =>
                            setBranding((current) => {
                              if (!current) return defaultBranding
                              return {
                                ...current,
                                logo: current.logo ? { ...current.logo, position: value } : undefined
                              }
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">שמאל</SelectItem>
                            <SelectItem value="center">מרכז</SelectItem>
                            <SelectItem value="right">ימין</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>גודל לוגו</Label>
                        <Select
                          value={branding.logo.size}
                          onValueChange={(value: 'small' | 'medium' | 'large') =>
                            setBranding((current) => {
                              if (!current) return defaultBranding
                              return {
                                ...current,
                                logo: current.logo ? { ...current.logo, size: value } : undefined
                              }
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">קטן</SelectItem>
                            <SelectItem value="medium">בינוני</SelectItem>
                            <SelectItem value="large">גדול</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('logo-upload-primary')?.click()}
                  >
                    <UploadSimple size={48} weight="duotone" className="text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-1">העלה לוגו</p>
                    <p className="text-sm text-muted-foreground mb-4">PNG, JPG עד 2MB</p>
                    <Button variant="outline">
                      בחר קובץ
                    </Button>
                    <input
                      id="logo-upload-primary"
                      type="file"
                      accept="image/*"
                      title="העלאת לוגו חברה"
                      aria-label="העלאת לוגו חברה"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>צבעי מיתוג</CardTitle>
                <CardDescription>התאם את צבעי החברה שיופיעו בדוחות</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">צבע ראשי</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={branding.colors.primary}
                        onChange={(e) => updateColors('primary', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={branding.colors.primary}
                        onChange={(e) => updateColors('primary', e.target.value)}
                        placeholder="#000000"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">צבע משני</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={branding.colors.secondary}
                        onChange={(e) => updateColors('secondary', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={branding.colors.secondary}
                        onChange={(e) => updateColors('secondary', e.target.value)}
                        placeholder="#000000"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent-color">צבע הדגשה</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={branding.colors.accent}
                        onChange={(e) => updateColors('accent', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        value={branding.colors.accent}
                        onChange={(e) => updateColors('accent', e.target.value)}
                        placeholder="#000000"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-4">כותרת עליונה</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="header-bg">רקע כותרת</Label>
                      <div className="flex gap-2">
                        <Input
                          id="header-bg"
                          type="color"
                          value={branding.colors.headerBackground}
                          onChange={(e) => updateColors('headerBackground', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={branding.colors.headerBackground}
                          onChange={(e) => updateColors('headerBackground', e.target.value)}
                          placeholder="#000000"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="header-text">טקסט כותרת</Label>
                      <div className="flex gap-2">
                        <Input
                          id="header-text"
                          type="color"
                          value={branding.colors.headerText}
                          onChange={(e) => updateColors('headerText', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={branding.colors.headerText}
                          onChange={(e) => updateColors('headerText', e.target.value)}
                          placeholder="#000000"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-4">כותרת תחתונה</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="footer-bg">רקע כותרת תחתונה</Label>
                      <div className="flex gap-2">
                        <Input
                          id="footer-bg"
                          type="color"
                          value={branding.colors.footerBackground}
                          onChange={(e) => updateColors('footerBackground', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={branding.colors.footerBackground}
                          onChange={(e) => updateColors('footerBackground', e.target.value)}
                          placeholder="#000000"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="footer-text">טקסט כותרת תחתונה</Label>
                      <div className="flex gap-2">
                        <Input
                          id="footer-text"
                          type="color"
                          value={branding.colors.footerText}
                          onChange={(e) => updateColors('footerText', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={branding.colors.footerText}
                          onChange={(e) => updateColors('footerText', e.target.value)}
                          placeholder="#000000"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>הגדרות פונט</CardTitle>
                <CardDescription>בחר פונטים וגדלים לדוחות עם תצוגה מקדימה חיה</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>פונט כותרות</Label>
                    <Select
                      value={branding.fonts.heading}
                      onValueChange={(value) =>
                        updateBranding({
                          fonts: { ...branding.fonts, heading: value }
                        })
                      }
                    >
                      <SelectTrigger className="font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-96">
                        {Object.entries(getFontsByCategory()).map(([category, fonts]) => (
                          fonts.length > 0 && (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0 z-10">
                                {category}
                              </div>
                              {fonts.map((font) => (
                                <SelectItem 
                                  key={font.value} 
                                  value={font.value} 
                                  className="font-medium"
                                >
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold">{font.name}</span>
                                    <span className="text-xs text-muted-foreground">{font.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          )
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>פונט תוכן</Label>
                    <Select
                      value={branding.fonts.body}
                      onValueChange={(value) =>
                        updateBranding({
                          fonts: { ...branding.fonts, body: value }
                        })
                      }
                    >
                      <SelectTrigger className="font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-96">
                        {Object.entries(getFontsByCategory()).map(([category, fonts]) => (
                          fonts.length > 0 && (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0 z-10">
                                {category}
                              </div>
                              {fonts.map((font) => (
                                <SelectItem 
                                  key={font.value} 
                                  value={font.value} 
                                  className="font-medium"
                                >
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold">{font.name}</span>
                                    <span className="text-xs text-muted-foreground">{font.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </div>
                          )
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">צירופי פונטים מומלצים</Label>
                    <Badge variant="outline" className="text-xs">לחץ להחלה</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBranding({
                        fonts: { ...branding.fonts, heading: 'Merriweather', body: 'Source Sans 3' }
                      })}
                      className="h-auto flex-col items-start p-3 gap-1"
                    >
                      <div className="font-semibold text-xs">Editorial Classic</div>
                      <div className="text-xs text-muted-foreground text-right">Merriweather + Source Sans 3</div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBranding({
                        fonts: { ...branding.fonts, heading: 'Playfair Display', body: 'Source Sans 3' }
                      })}
                      className="h-auto flex-col items-start p-3 gap-1"
                    >
                      <div className="font-semibold text-xs">Luxury Report</div>
                      <div className="text-xs text-muted-foreground text-right">Playfair Display + Source Sans</div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBranding({
                        fonts: { ...branding.fonts, heading: 'IBM Plex Serif', body: 'IBM Plex Sans' }
                      })}
                      className="h-auto flex-col items-start p-3 gap-1"
                    >
                      <div className="font-semibold text-xs">Corporate Pro</div>
                      <div className="text-xs text-muted-foreground text-right">IBM Plex Serif + IBM Plex Sans</div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBranding({
                        fonts: { ...branding.fonts, heading: 'Lora', body: 'Open Sans' }
                      })}
                      className="h-auto flex-col items-start p-3 gap-1"
                    >
                      <div className="font-semibold text-xs">Modern Readable</div>
                      <div className="text-xs text-muted-foreground text-right">Lora + Open Sans</div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBranding({
                        fonts: { ...branding.fonts, heading: 'Roboto Slab', body: 'Inter' }
                      })}
                      className="h-auto flex-col items-start p-3 gap-1"
                    >
                      <div className="font-semibold text-xs">Tech Forward</div>
                      <div className="text-xs text-muted-foreground text-right">Roboto Slab + Inter</div>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBranding({
                        fonts: { ...branding.fonts, heading: 'EB Garamond', body: 'Source Sans 3' }
                      })}
                      className="h-auto flex-col items-start p-3 gap-1"
                    >
                      <div className="font-semibold text-xs">Timeless Legal</div>
                      <div className="text-xs text-muted-foreground text-right">EB Garamond + Source Sans</div>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>גודל כותרות: {branding.fonts.headingSize}pt</Label>
                    <Slider
                      value={[branding.fonts.headingSize]}
                      onValueChange={([value]) =>
                        updateBranding({
                          fonts: { ...branding.fonts, headingSize: value }
                        })
                      }
                      min={12}
                      max={24}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>גודל תוכן: {branding.fonts.bodySize}pt</Label>
                    <Slider
                      value={[branding.fonts.bodySize]}
                      onValueChange={([value]) =>
                        updateBranding({
                          fonts: { ...branding.fonts, bodySize: value }
                        })
                      }
                      min={8}
                      max={16}
                      step={1}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Eye size={20} weight="duotone" className="text-primary" />
                    <Label className="text-base font-semibold">תצוגה מקדימה</Label>
                  </div>
                  
                  <Card className="bg-linear-to-br from-muted/30 to-muted/10 border-primary/20">
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <div className="text-foreground font-semibold text-xl">
                          דוח שמאות מקרקעין
                        </div>
                        <div className="text-foreground/80 text-sm leading-6">
                          The quick brown fox jumps over the lazy dog. שמאות נדל"ן מקצועית ומדויקת לכל סוגי הנכסים.
                        </div>
                      </div>

                      <Separator className="opacity-50" />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-xs">פונט כותרות</div>
                          <div className="font-semibold text-foreground">
                            {branding.fonts.heading}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground text-xs">פונט תוכן</div>
                          <div className="font-medium text-foreground">
                            {branding.fonts.body}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                        <div className="space-y-3">
                          <div className="text-foreground font-semibold text-lg">
                            נכס למגורים - דירת 4 חדרים
                          </div>
                          <div className="text-foreground/70 text-sm leading-7">
                            הנכס ממוקם ברחוב הרצל 123, תל אביב, בקומה 3 מתוך 5. הדירה משופצת ומוארת, 
                            כוללת מרפסת פתוחה עם נוף פנורמי, מעלית וחניה. שטח הנכס: 95 מ"ר.
                          </div>
                          <div className="flex gap-4 text-xs">
                            <div className="text-muted-foreground">
                              שווי משוער: ₪2,450,000
                            </div>
                            <div className="text-muted-foreground">
                              מחיר למ"ר: ₪25,789
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="header-footer" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>כותרת עליונה</CardTitle>
                <CardDescription>התאם אישית את הכותרת העליונה של הדוחות</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="header-enabled">הצג כותרת עליונה</Label>
                    <p className="text-sm text-muted-foreground">הוסף כותרת עליונה לכל דפי הדוח</p>
                  </div>
                  <Switch
                    id="header-enabled"
                    checked={branding.header.enabled}
                    onCheckedChange={(checked) => updateHeader({ enabled: checked })}
                  />
                </div>

                {branding.header.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>גובה כותרת: {branding.header.height}mm</Label>
                      <Slider
                        value={[branding.header.height]}
                        onValueChange={([value]) => updateHeader({ height: value })}
                        min={20}
                        max={80}
                        step={5}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <Label htmlFor="header-logo">הצג לוגו</Label>
                        <Switch
                          id="header-logo"
                          checked={branding.header.showLogo}
                          onCheckedChange={(checked) => updateHeader({ showLogo: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <Label htmlFor="header-company">הצג שם חברה</Label>
                        <Switch
                          id="header-company"
                          checked={branding.header.showCompanyName}
                          onCheckedChange={(checked) => updateHeader({ showCompanyName: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <Label htmlFor="header-tagline">הצג סלוגן</Label>
                        <Switch
                          id="header-tagline"
                          checked={branding.header.showTagline}
                          onCheckedChange={(checked) => updateHeader({ showTagline: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <Label htmlFor="header-border">גבול תחתון</Label>
                        <Switch
                          id="header-border"
                          checked={branding.header.borderBottom}
                          onCheckedChange={(checked) => updateHeader({ borderBottom: checked })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="header-custom">טקסט מותאם אישית</Label>
                      <Input
                        id="header-custom"
                        value={branding.header.customText || ''}
                        onChange={(e) => updateHeader({ customText: e.target.value })}
                        placeholder="טקסט נוסף לכותרת"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-effect border-border/50">
              <CardHeader>
                <CardTitle>כותרת תחתונה</CardTitle>
                <CardDescription>התאם אישית את הכותרת התחתונה של הדוחות</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="footer-enabled">הצג כותרת תחתונה</Label>
                    <p className="text-sm text-muted-foreground">הוסף כותרת תחתונה לכל דפי הדוח</p>
                  </div>
                  <Switch
                    id="footer-enabled"
                    checked={branding.footer.enabled}
                    onCheckedChange={(checked) => updateFooter({ enabled: checked })}
                  />
                </div>

                {branding.footer.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>גובה כותרת תחתונה: {branding.footer.height}mm</Label>
                      <Slider
                        value={[branding.footer.height]}
                        onValueChange={([value]) => updateFooter({ height: value })}
                        min={15}
                        max={60}
                        step={5}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <Label htmlFor="footer-page-numbers">מספרי עמודים</Label>
                        <Switch
                          id="footer-page-numbers"
                          checked={branding.footer.showPageNumbers}
                          onCheckedChange={(checked) => updateFooter({ showPageNumbers: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <Label htmlFor="footer-company-name">שם חברה</Label>
                        <Switch
                          id="footer-company-name"
                          checked={branding.footer.showCompanyName}
                          onCheckedChange={(checked) => updateFooter({ showCompanyName: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <Label htmlFor="footer-contact">פרטי קשר</Label>
                        <Switch
                          id="footer-contact"
                          checked={branding.footer.showContactInfo}
                          onCheckedChange={(checked) => updateFooter({ showContactInfo: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                        <Label htmlFor="footer-border">גבול עליון</Label>
                        <Switch
                          id="footer-border"
                          checked={branding.footer.borderTop}
                          onCheckedChange={(checked) => updateFooter({ borderTop: checked })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="footer-custom">טקסט מותאם אישית</Label>
                      <Input
                        id="footer-custom"
                        value={branding.footer.customText || ''}
                        onChange={(e) => updateFooter({ customText: e.target.value })}
                        placeholder="טקסט נוסף לכותרת תחתונה"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      <Card className="glass-effect border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Info size={24} weight="duotone" className="text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">הגדרות המיתוג יחולו על כל הדוחות החדשים</h4>
              <p className="text-sm text-muted-foreground">
                השינויים שתבצע יחולו אוטומטית על כל דוחות ה-PDF שתייצא מעכשיו והלאה. דוחות קיימים לא ישתנו.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
