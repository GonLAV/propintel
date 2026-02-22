import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import type { RentalTransaction } from '@/lib/rentalTypes'
import { parseCSVRentalData, generateMockRentalData } from '@/lib/rentalEngine'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Upload, 
  Database, 
  Download, 
  Trash, 
  FileCsv,
  TrendUp,
  MapPin,
  Calendar,
  CurrencyCircleDollar,
  House,
  CheckCircle,
  XCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function RentalDataManager() {
  const [rentalData, setRentalData] = useKV<RentalTransaction[]>('rental-transactions', [])
  const [filterCity, setFilterCity] = useState<string>('all')
  const [filterPropertyType, setFilterPropertyType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      try {
        const parsed = parseCSVRentalData(content)
        setRentalData((current) => [...(current || []), ...parsed])
        toast.success(`${parsed.length} עסקאות שכירות נוספו בהצלחה`)
      } catch (_error) {
        toast.error('שגיאה בקריאת הקובץ')
      }
    }
    reader.readAsText(file)
  }

  const handleGenerateMockData = () => {
    const mockData = generateMockRentalData()
    setRentalData((current) => [...(current || []), ...mockData])
    toast.success(`${mockData.length} עסקאות דמה נוספו למערכת`)
  }

  const handleClearData = () => {
    if (confirm('האם אתה בטוח שברצונך למחוק את כל נתוני השכירות?')) {
      setRentalData([])
      toast.success('כל נתוני השכירות נמחקו')
    }
  }

  const handleExportCSV = () => {
    const data = rentalData || []
    if (data.length === 0) {
      toast.error('אין נתונים לייצוא')
      return
    }

    const headers = [
      'כתובת', 'עיר', 'שכונה', 'רחוב', 'קומה', 'סוג נכס', 'חדרים', 'שטח',
      'שכר דירה', 'תאריך שכירות', 'מרוהט', 'מעלית', 'חניה', 'מצב', 'מקור'
    ]
    
    const rows = data.map(t => [
      t.address,
      t.city,
      t.neighborhood,
      t.street,
      t.floor || '',
      t.propertyType,
      t.rooms || '',
      t.area,
      t.monthlyRent,
      new Date(t.rentalDate).toLocaleDateString('he-IL'),
      t.furnished ? 'כן' : 'לא',
      t.hasElevator ? 'כן' : 'לא',
      t.hasParking ? 'כן' : 'לא',
      t.condition,
      t.source
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rental-data-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast.success('הנתונים יוצאו בהצלחה')
  }

  const filteredData = (rentalData || []).filter(transaction => {
    if (filterCity !== 'all' && transaction.city !== filterCity) return false
    if (filterPropertyType !== 'all' && transaction.propertyType !== filterPropertyType) return false
    if (searchTerm && !transaction.address.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const uniqueCities = Array.from(new Set((rentalData || []).map(t => t.city))).sort()

  const statistics = {
    total: rentalData?.length || 0,
    avgRent: rentalData?.length ? Math.round(rentalData.reduce((sum, t) => sum + t.monthlyRent, 0) / rentalData.length) : 0,
    avgRentPerSqm: rentalData?.length ? Math.round(rentalData.reduce((sum, t) => sum + (t.monthlyRent / t.area), 0) / rentalData.length) : 0,
    verified: rentalData?.filter(t => t.verified).length || 0
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ניהול נתוני שכירות</h1>
          <p className="text-muted-foreground mt-1">
            ייבוא, ניהול וניתוח עסקאות שכירות לצורך שומות והשוואות
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="ml-2" />
            ייצוא CSV
          </Button>
          <Button variant="destructive" onClick={handleClearData}>
            <Trash className="ml-2" />
            מחק הכל
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>סה"כ עסקאות</CardDescription>
            <CardTitle className="text-3xl">{statistics.total.toLocaleString('he-IL')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database size={16} />
              במאגר
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>שכירות ממוצעת</CardDescription>
            <CardTitle className="text-3xl">₪{statistics.avgRent.toLocaleString('he-IL')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CurrencyCircleDollar size={16} />
              לחודש
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>₪ למ"ר ממוצע</CardDescription>
            <CardTitle className="text-3xl">₪{statistics.avgRentPerSqm.toLocaleString('he-IL')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <House size={16} />
              למ"ר/חודש
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>עסקאות מאומתות</CardDescription>
            <CardTitle className="text-3xl">{statistics.verified.toLocaleString('he-IL')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle size={16} />
              {rentalData?.length ? Math.round((statistics.verified / rentalData.length) * 100) : 0}% מהכל
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="data">נתוני עסקאות</TabsTrigger>
          <TabsTrigger value="import">ייבוא נתונים</TabsTrigger>
          <TabsTrigger value="sources">מקורות נתונים</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>סינון ונתונים</CardTitle>
              <CardDescription>חיפוש וסינון עסקאות שכירות</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>חיפוש כתובת</Label>
                  <Input
                    placeholder="הקלד כתובת..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>עיר</Label>
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="כל הערים" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הערים</SelectItem>
                      {uniqueCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>סוג נכס</Label>
                  <Select value={filterPropertyType} onValueChange={setFilterPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="כל הסוגים" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הסוגים</SelectItem>
                      <SelectItem value="apartment">דירה</SelectItem>
                      <SelectItem value="house">בית פרטי</SelectItem>
                      <SelectItem value="commercial">מסחרי</SelectItem>
                      <SelectItem value="office">משרד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                מציג {filteredData.length.toLocaleString('he-IL')} מתוך {(rentalData?.length || 0).toLocaleString('he-IL')} עסקאות
              </div>

              <ScrollArea className="h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>כתובת</TableHead>
                      <TableHead>עיר</TableHead>
                      <TableHead>שכונה</TableHead>
                      <TableHead>חדרים</TableHead>
                      <TableHead>שטח</TableHead>
                      <TableHead>שכירות</TableHead>
                      <TableHead>₪/מ"ר</TableHead>
                      <TableHead>תאריך</TableHead>
                      <TableHead>מצב</TableHead>
                      <TableHead>סטטוס</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          אין נתונים להצגה
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-muted-foreground" />
                              {transaction.address}
                            </div>
                          </TableCell>
                          <TableCell>{transaction.city}</TableCell>
                          <TableCell>{transaction.neighborhood}</TableCell>
                          <TableCell>{transaction.rooms || '-'}</TableCell>
                          <TableCell>{transaction.area} מ"ר</TableCell>
                          <TableCell className="font-bold">
                            ₪{transaction.monthlyRent.toLocaleString('he-IL')}
                          </TableCell>
                          <TableCell>
                            ₪{Math.round(transaction.monthlyRent / transaction.area).toLocaleString('he-IL')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar size={14} />
                              {new Date(transaction.rentalDate).toLocaleDateString('he-IL')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.condition}</Badge>
                          </TableCell>
                          <TableCell>
                            {transaction.verified ? (
                              <Badge variant="default" className="bg-success">
                                <CheckCircle size={14} className="ml-1" />
                                מאומת
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle size={14} className="ml-1" />
                                לא מאומת
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload />
                  ייבוא מקובץ CSV
                </CardTitle>
                <CardDescription>
                  העלה קובץ CSV עם נתוני עסקאות שכירות
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <FileCsv size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">גרור קובץ או לחץ לבחירה</p>
                      <p className="text-xs text-muted-foreground">CSV, Excel (עד 10MB)</p>
                    </div>
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">עמודות נדרשות:</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• כתובת / עיר / שכונה</div>
                    <div>• שטח (מ"ר)</div>
                    <div>• שכר דירה (₪)</div>
                    <div>• תאריך שכירות</div>
                    <div>• חדרים (אופציונלי)</div>
                    <div>• קומה (אופציונלי)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database />
                  נתוני דמו
                </CardTitle>
                <CardDescription>
                  צור נתוני שכירות לדוגמא לצורך בדיקה
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-6 text-center space-y-4">
                  <TrendUp size={48} className="mx-auto text-primary" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">ייצור 100 עסקאות דמה</p>
                    <p className="text-xs text-muted-foreground">
                      עסקאות ריאליסטיות מערים שונות בארץ
                    </p>
                  </div>
                  <Button onClick={handleGenerateMockData} className="w-full">
                    צור נתוני דמו
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">הנתונים כוללים:</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• כתובות אקראיות בערים מרכזיות</div>
                    <div>• מחירי שכירות ריאליסטיים</div>
                    <div>• פרטי נכסים מלאים</div>
                    <div>• תאריכים ב-6 חודשים אחרונים</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>מקורות נתונים חיצוניים</CardTitle>
              <CardDescription>
                חיבור ל-API ממשלתיים ומקורות נתונים חיצוניים (דורש הרשאות)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Database className="text-primary" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">רשות המסים - נתוני שכירות</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      חיבור ישיר למאגר נתוני השכירות של רשות המסים
                    </p>
                    <Badge variant="secondary">מצריך הרשאות API</Badge>
                  </div>
                  <Button variant="outline" disabled>
                    התחבר
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Database className="text-primary" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">משרד הבינוי והשיכון - מחירי שכירות</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      נתוני מחירי שכירות ממשלתיים לפי אזורים
                    </p>
                    <Badge variant="secondary">מצריך הרשאות API</Badge>
                  </div>
                  <Button variant="outline" disabled>
                    התחבר
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Database className="text-primary" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">מד"ב (מדינת ישראל - דירות ברשות)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      עסקאות שכירות מדווחות ומאומתות
                    </p>
                    <Badge variant="secondary">מצריך הרשאות API</Badge>
                  </div>
                  <Button variant="outline" disabled>
                    התחבר
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-6">
                <p className="text-sm text-muted-foreground">
                  <strong>הערה:</strong> חיבור למקורות נתונים חיצוניים דורש מפתחות API והרשאות ממשלתיות.
                  לקבלת גישה, פנה לגורם הרלוונטי במשרד הממשלה המתאים.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
