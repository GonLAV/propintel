import type { Property, Comparable } from '@/lib/types'

export interface BulkValuationResult {
  propertyId: string
  property: Property
  status: 'pending' | 'processing' | 'completed' | 'error'
  estimatedValue?: number
  valueRange?: { min: number; max: number }
  confidence?: number
  method?: string
  comparables?: Comparable[]
  error?: string
  processingTime?: number
}

export interface PortfolioStats {
  totalValue: number
  avgValue: number
  avgConfidence: number
  totalProperties: number
  completedProperties: number
  valueRange: { min: number; max: number }
  propertyTypes: Record<string, number>
  avgPricePerSqm: number
}

export function exportToCSV(results: BulkValuationResult[], portfolioStats: PortfolioStats | null) {
  const completedResults = results.filter(r => r.status === 'completed' && r.estimatedValue)
  
  if (completedResults.length === 0) {
    throw new Error('אין תוצאות להצגה')
  }

  const headers = [
    'מזהה נכס',
    'כתובת',
    'עיר',
    'שכונה',
    'רחוב',
    'מיקוד',
    'סוג נכס',
    'שטח בנוי (מ"ר)',
    'מספר חדרים',
    'קומה',
    'שנת בנייה',
    'מצב',
    'שווי משוער (₪)',
    'שווי מינימלי (₪)',
    'שווי מקסימלי (₪)',
    'מחיר למ"ר (₪)',
    'רמת ביטחון (%)',
    'שיטת שומה',
    'מספר נכסים דומים',
    'זמן עיבוד (ms)',
    'תאריך שומה'
  ]

  const rows = completedResults.map(result => {
    const prop = result.property
    const pricePerSqm = result.estimatedValue && prop.details.builtArea > 0 
      ? result.estimatedValue / prop.details.builtArea 
      : 0

    return [
      prop.id,
      `${prop.address.street}, ${prop.address.city}`,
      prop.address.city,
      prop.address.neighborhood || '',
      prop.address.street,
      prop.address.postalCode || '',
      getPropertyTypeLabel(prop.type),
      prop.details.builtArea,
      prop.details.rooms,
      prop.details.floor,
      prop.details.buildYear,
      getConditionLabel(prop.details.condition),
      result.estimatedValue || 0,
      result.valueRange?.min || 0,
      result.valueRange?.max || 0,
      Math.round(pricePerSqm),
      result.confidence || 0,
      getMethodLabel(result.method || ''),
      result.comparables?.length || 0,
      result.processingTime || 0,
      new Date().toLocaleDateString('he-IL')
    ]
  })

  const summaryRows: (string | number)[][] = []
  if (portfolioStats) {
    summaryRows.push([])
    summaryRows.push(['=== סטטיסטיקות תיק ==='])
    summaryRows.push(['שווי כולל (₪)', portfolioStats.totalValue])
    summaryRows.push(['שווי ממוצע (₪)', Math.round(portfolioStats.avgValue)])
    summaryRows.push(['ביטחון ממוצע (%)', Math.round(portfolioStats.avgConfidence)])
    summaryRows.push(['מחיר ממוצע למ"ר (₪)', Math.round(portfolioStats.avgPricePerSqm)])
    summaryRows.push(['מספר נכסים', portfolioStats.totalProperties])
    summaryRows.push(['שווי מינימלי (₪)', portfolioStats.valueRange.min])
    summaryRows.push(['שווי מקסימלי (₪)', portfolioStats.valueRange.max])
    summaryRows.push([])
    summaryRows.push(['=== התפלגות סוגי נכסים ==='])
    Object.entries(portfolioStats.propertyTypes).forEach(([type, count]) => {
      summaryRows.push([getPropertyTypeLabel(type), count])
    })
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => formatCSVCell(cell)).join(',')),
    ...summaryRows.map(row => row.map(cell => formatCSVCell(cell)).join(','))
  ].join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `bulk_valuation_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToExcel(results: BulkValuationResult[], portfolioStats: PortfolioStats | null) {
  const completedResults = results.filter(r => r.status === 'completed' && r.estimatedValue)
  
  if (completedResults.length === 0) {
    throw new Error('אין תוצאות להצגה')
  }

  const worksheetData: (string | number)[][] = []

  worksheetData.push(['דוח שומה מרובת נכסים'])
  worksheetData.push([`תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}`])
  worksheetData.push([])

  if (portfolioStats) {
    worksheetData.push(['סטטיסטיקות תיק'])
    worksheetData.push(['שווי כולל (₪)', portfolioStats.totalValue])
    worksheetData.push(['שווי ממוצע (₪)', Math.round(portfolioStats.avgValue)])
    worksheetData.push(['ביטחון ממוצע (%)', Math.round(portfolioStats.avgConfidence)])
    worksheetData.push(['מחיר ממוצע למ"ר (₪)', Math.round(portfolioStats.avgPricePerSqm)])
    worksheetData.push(['מספר נכסים', portfolioStats.totalProperties])
    worksheetData.push([])
  }

  const headers = [
    'מזהה נכס',
    'כתובת מלאה',
    'עיר',
    'שכונה',
    'סוג נכס',
    'שטח (מ"ר)',
    'חדרים',
    'קומה',
    'שנת בנייה',
    'מצב',
    'שווי משוער',
    'שווי מינימום',
    'שווי מקסימום',
    'מחיר למ"ר',
    'ביטחון %',
    'שיטה',
    'נכסים דומים'
  ]
  worksheetData.push(headers)

  completedResults.forEach(result => {
    const prop = result.property
    const pricePerSqm = result.estimatedValue && prop.details.builtArea > 0 
      ? result.estimatedValue / prop.details.builtArea 
      : 0

    worksheetData.push([
      prop.id,
      `${prop.address.street}, ${prop.address.city}`,
      prop.address.city,
      prop.address.neighborhood || '',
      getPropertyTypeLabel(prop.type),
      prop.details.builtArea,
      prop.details.rooms,
      prop.details.floor,
      prop.details.buildYear,
      getConditionLabel(prop.details.condition),
      result.estimatedValue || 0,
      result.valueRange?.min || 0,
      result.valueRange?.max || 0,
      Math.round(pricePerSqm),
      result.confidence || 0,
      getMethodLabel(result.method || ''),
      result.comparables?.length || 0
    ])
  })

  const htmlTable = createHTMLTable(worksheetData)
  const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `bulk_valuation_${new Date().toISOString().split('T')[0]}.xls`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportDetailedCSV(results: BulkValuationResult[]) {
  const completedResults = results.filter(r => r.status === 'completed' && r.estimatedValue)
  
  if (completedResults.length === 0) {
    throw new Error('אין תוצאות להצגה')
  }

  const allRows: (string | number)[][] = []

  completedResults.forEach((result, index) => {
    const prop = result.property
    const pricePerSqm = result.estimatedValue && prop.details.builtArea > 0 
      ? result.estimatedValue / prop.details.builtArea 
      : 0

    if (index > 0) {
      allRows.push([])
      allRows.push([])
    }

    allRows.push([`=== נכס ${index + 1}: ${prop.address.street}, ${prop.address.city} ===`])
    allRows.push([])
    
    allRows.push(['פרטי הנכס'])
    allRows.push(['מזהה', prop.id])
    allRows.push(['כתובת', prop.address.street])
    allRows.push(['עיר', prop.address.city])
    allRows.push(['שכונה', prop.address.neighborhood || ''])
    allRows.push(['סוג נכס', getPropertyTypeLabel(prop.type)])
    allRows.push(['שטח בנוי (מ"ר)', prop.details.builtArea])
    allRows.push(['מספר חדרים', prop.details.rooms])
    allRows.push(['קומה', prop.details.floor])
    allRows.push(['שנת בנייה', prop.details.buildYear])
    allRows.push(['מצב', getConditionLabel(prop.details.condition)])
    allRows.push([])
    
    allRows.push(['תוצאות השומה'])
    allRows.push(['שווי משוער (₪)', result.estimatedValue || 0])
    allRows.push(['שווי מינימלי (₪)', result.valueRange?.min || 0])
    allRows.push(['שווי מקסימלי (₪)', result.valueRange?.max || 0])
    allRows.push(['מחיר למ"ר (₪)', Math.round(pricePerSqm)])
    allRows.push(['רמת ביטחון (%)', result.confidence || 0])
    allRows.push(['שיטת שומה', getMethodLabel(result.method || '')])
    allRows.push(['זמן עיבוד (ms)', result.processingTime || 0])
    allRows.push([])

    if (result.comparables && result.comparables.length > 0) {
      allRows.push(['נכסים דומים'])
      allRows.push(['כתובת', 'מחיר מקורי', 'מחיר מותאם', 'שטח', 'מרחק (km)', 'דמיון (%)', 'תאריך מכירה'])
      
      result.comparables.forEach(comp => {
        allRows.push([
          comp.address,
          comp.salePrice,
          comp.adjustedPrice,
          comp.builtArea,
          comp.distance,
          comp.similarityScore || 0,
          comp.saleDate
        ])
      })
    }
  })

  const csvContent = allRows.map(row => row.map(cell => formatCSVCell(cell)).join(',')).join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `bulk_valuation_detailed_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function formatCSVCell(cell: string | number): string {
  if (typeof cell === 'number') {
    return cell.toString()
  }
  
  const cellStr = String(cell)
  if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
    return `"${cellStr.replace(/"/g, '""')}"`
  }
  return cellStr
}

function createHTMLTable(data: (string | number)[][]): string {
  const rows = data.map(row => {
    const cells = row.map((cell, _index) => {
      const isNumeric = typeof cell === 'number'
      const style = isNumeric ? ' style="mso-number-format:\\@"' : ''
      return `<td${style}>${cell}</td>`
    }).join('')
    return `<tr>${cells}</tr>`
  }).join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name=ProgId content=Excel.Sheet>
      <style>
        table { border-collapse: collapse; width: 100%; direction: rtl; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        th { background-color: #f2f2f2; font-weight: bold; }
      </style>
    </head>
    <body>
      <table dir="rtl">
        ${rows}
      </table>
    </body>
    </html>
  `
}

function getPropertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'apartment': 'דירה',
    'house': 'בית',
    'penthouse': 'פנטהאוז',
    'garden-apartment': 'דירת גן',
    'duplex': 'דופלקס',
    'studio': 'סטודיו',
    'commercial': 'מסחרי',
    'land': 'קרקע'
  }
  return labels[type] || type
}

function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    'new': 'חדש',
    'excellent': 'מצוין',
    'good': 'טוב',
    'fair': 'בינוני',
    'poor': 'דורש שיפוץ',
    'renovation-required': 'דורש שיפוץ כולל'
  }
  return labels[condition] || condition
}

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    'comparable-sales': 'השוואת מכירות',
    'cost-approach': 'גישת העלות',
    'income-approach': 'גישת ההיוון',
    'auto': 'אוטומטי'
  }
  return labels[method] || method
}
