import jsPDF from 'jspdf'
import type { Property } from './types'

export interface BulkValuationResult {
  propertyId: string
  property: Property
  status: 'pending' | 'processing' | 'completed' | 'error'
  estimatedValue?: number
  valueRange?: { min: number; max: number }
  confidence?: number
  method?: string
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

export function exportBulkValuationPDF(results: BulkValuationResult[], stats: PortfolioStats) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0
    }).format(value)
  }

  const getPropertyTypeLabel = (type: string) => {
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

  const addHeader = () => {
    doc.setFillColor(101, 84, 192)
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.text('דוח ניתוח תיק השקעות', pageWidth / 2, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(`תאריך: ${new Date().toLocaleDateString('he-IL')}`, pageWidth / 2, 30, { align: 'center' })
  }

  const addFooter = (pageNum: number) => {
    doc.setTextColor(128, 128, 128)
    doc.setFontSize(10)
    doc.text(`עמוד ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
  }

  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 20) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  addHeader()
  yPos = 50

  doc.setTextColor(51, 51, 51)
  doc.setFontSize(18)
  doc.text('סיכום מנהלים', margin, yPos)
  yPos += 15

  const summaryData = [
    { label: 'סה"כ נכסים בתיק', value: stats.totalProperties.toString() },
    { label: 'שווי כולל', value: formatCurrency(stats.totalValue) },
    { label: 'שווי ממוצע לנכס', value: formatCurrency(stats.avgValue) },
    { label: 'ביטחון ממוצע', value: `${Math.round(stats.avgConfidence)}%` },
    { label: 'מחיר ממוצע למ"ר', value: formatCurrency(stats.avgPricePerSqm) },
    { label: 'טווח שווי', value: `${formatCurrency(stats.valueRange.min)} - ${formatCurrency(stats.valueRange.max)}` }
  ]

  doc.setFontSize(11)
  summaryData.forEach(item => {
    doc.setFont('helvetica', 'normal')
    doc.text(item.label + ':', pageWidth - margin - 70, yPos, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(item.value, pageWidth - margin - 75, yPos, { align: 'left' })
    yPos += 7
  })

  yPos += 10

  doc.setFontSize(16)
  doc.text('התפלגות סוגי נכסים', margin, yPos)
  yPos += 10

  doc.setFontSize(11)
  Object.entries(stats.propertyTypes).forEach(([type, count]) => {
    doc.setFont('helvetica', 'normal')
    doc.text(getPropertyTypeLabel(type) + ':', pageWidth - margin - 50, yPos, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(count.toString(), pageWidth - margin - 55, yPos, { align: 'left' })
    yPos += 7
  })

  checkPageBreak(30)
  yPos += 10

  doc.setFontSize(18)
  doc.text('פירוט נכסים', margin, yPos)
  yPos += 10

  results.forEach((result, index) => {
    checkPageBreak(50)

    doc.setFillColor(245, 245, 250)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 40, 'F')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(101, 84, 192)
    doc.text(`נכס ${index + 1}`, margin + 5, yPos + 7)

    doc.setTextColor(51, 51, 51)
    doc.setFont('helvetica', 'normal')
    
    const address = `${result.property.address.street}, ${result.property.address.city}`
    doc.text(address, pageWidth - margin - 5, yPos + 7, { align: 'right' })

    doc.setFontSize(10)
    doc.text(`סוג: ${getPropertyTypeLabel(result.property.type)}`, pageWidth - margin - 5, yPos + 14, { align: 'right' })
    doc.text(`שטח: ${result.property.details.builtArea} מ"ר`, pageWidth - margin - 5, yPos + 20, { align: 'right' })
    doc.text(`חדרים: ${result.property.details.rooms}`, pageWidth - margin - 5, yPos + 26, { align: 'right' })

    if (result.estimatedValue) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(34, 139, 34)
      doc.text(formatCurrency(result.estimatedValue), margin + 5, yPos + 20)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`ביטחון: ${result.confidence}%`, margin + 5, yPos + 27)
      doc.text(`מחיר למ"ר: ${formatCurrency(result.estimatedValue / result.property.details.builtArea)}`, margin + 5, yPos + 33)
    }

    yPos += 45
  })

  checkPageBreak(30)
  yPos += 10

  doc.setFillColor(245, 245, 250)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F')
  
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('הגבלת אחריות:', pageWidth - margin - 5, yPos + 7, { align: 'right' })
  doc.text('דוח זה נועד למטרות מידע בלבד ואינו מהווה חוות דעת שמאית רשמית.', pageWidth - margin - 5, yPos + 13, { align: 'right' })
  doc.text('השווים המוצגים הינם אומדנים בלבד ועשויים להשתנות בהתאם לתנאי השוק.', pageWidth - margin - 5, yPos + 19, { align: 'right' })

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(i)
  }

  const fileName = `portfolio_report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
