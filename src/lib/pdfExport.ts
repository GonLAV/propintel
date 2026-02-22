import jsPDF from 'jspdf'
import type { ValuationResult } from './valuationEngine'
import type { Property, BrandingSettings } from './types'

export interface PDFExportOptions {
  includeCalculations?: boolean
  includeAssumptions?: boolean
  includeLimitations?: boolean
  includeMethodology?: boolean
  appraiserName?: string
  appraiserLicense?: string
  reportDate?: string
  reportNumber?: string
  branding?: BrandingSettings
}

export class ValuationPDFExporter {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number
  private lineHeight: number

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 20
    this.currentY = this.margin
    this.lineHeight = 7
  }

  private addNewPageIfNeeded(requiredSpace: number = 20) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage()
      this.currentY = this.margin
      return true
    }
    return false
  }

  private addHeader(title: string, subtitle?: string) {
    this.doc.setFillColor(99, 102, 241)
    this.doc.rect(0, 0, this.pageWidth, 40, 'F')
    
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, this.pageWidth / 2, 20, { align: 'center' })
    
    if (subtitle) {
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(subtitle, this.pageWidth / 2, 30, { align: 'center' })
    }
    
    this.currentY = 50
  }

  private addSectionTitle(title: string, color: [number, number, number] = [99, 102, 241]) {
    this.addNewPageIfNeeded(15)
    
    this.doc.setFillColor(...color)
    this.doc.rect(this.margin, this.currentY - 2, 5, 8, 'F')
    
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, this.margin + 8, this.currentY + 5)
    
    this.currentY += 12
  }

  private addText(text: string, fontSize: number = 11, bold: boolean = false) {
    this.addNewPageIfNeeded()
    
    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.setTextColor(0, 0, 0)
    
    const lines = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin)
    
    for (const line of lines) {
      this.addNewPageIfNeeded()
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += this.lineHeight
    }
  }

  private addKeyValue(key: string, value: string, valueColor?: [number, number, number]) {
    this.addNewPageIfNeeded()
    
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(key + ':', this.margin, this.currentY)
    
    this.doc.setFont('helvetica', 'bold')
    if (valueColor) {
      this.doc.setTextColor(...valueColor)
    } else {
      this.doc.setTextColor(0, 0, 0)
    }
    this.doc.text(value, this.margin + 60, this.currentY)
    
    this.currentY += this.lineHeight
  }

  private addBox(content: string, bgColor: [number, number, number] = [245, 245, 245]) {
    this.addNewPageIfNeeded(20)
    
    const lines = this.doc.splitTextToSize(content, this.pageWidth - 2 * this.margin - 10)
    const boxHeight = lines.length * this.lineHeight + 10
    
    this.doc.setFillColor(...bgColor)
    this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, boxHeight, 3, 3, 'F')
    
    this.currentY += 7
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(60, 60, 60)
    
    for (const line of lines) {
      this.doc.text(line, this.margin + 5, this.currentY)
      this.currentY += this.lineHeight
    }
    
    this.currentY += 5
  }

  private addTable(headers: string[], rows: string[][]) {
    const colWidth = (this.pageWidth - 2 * this.margin) / headers.length
    const rowHeight = 10
    
    this.addNewPageIfNeeded(rowHeight * (rows.length + 2))
    
    this.doc.setFillColor(99, 102, 241)
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, rowHeight, 'F')
    
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    
    headers.forEach((header, i) => {
      this.doc.text(header, this.margin + i * colWidth + 2, this.currentY + 7)
    })
    
    this.currentY += rowHeight
    
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont('helvetica', 'normal')
    
    rows.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        this.doc.setFillColor(250, 250, 250)
        this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, rowHeight, 'F')
      }
      
      row.forEach((cell, colIndex) => {
        this.doc.text(cell, this.margin + colIndex * colWidth + 2, this.currentY + 7)
      })
      
      this.currentY += rowHeight
    })
    
    this.currentY += 5
  }

  private addBulletList(items: string[], bulletColor: [number, number, number] = [99, 102, 241]) {
    items.forEach(item => {
      this.addNewPageIfNeeded()
      
      this.doc.setFillColor(...bulletColor)
      this.doc.circle(this.margin + 2, this.currentY - 1.5, 1.5, 'F')
      
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(60, 60, 60)
      
      const lines = this.doc.splitTextToSize(item, this.pageWidth - 2 * this.margin - 10)
      for (const line of lines) {
        this.doc.text(line, this.margin + 7, this.currentY)
        this.currentY += this.lineHeight
      }
    })
  }

  private addFooter(pageNumber: number, totalPages: number) {
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(150, 150, 150)
    
    const footerText = `AppraisalPro - Professional Valuation Report`
    this.doc.text(footerText, this.margin, this.pageHeight - 10)
    
    const pageText = `Page ${pageNumber} / ${totalPages}`
    this.doc.text(pageText, this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' })
  }

  exportValuationResult(
    result: ValuationResult,
    property: Property,
    options: PDFExportOptions = {}
  ): void {
    const methodNames: Record<string, string> = {
      'comparable-sales': 'Comparable Sales Approach',
      'cost-approach': 'Cost Approach',
      'income-approach': 'Income Approach',
      'hybrid': 'Reconciled (Hybrid)'
    }

    this.addHeader('Valuation Report', methodNames[result.method] || result.method)

    this.addSectionTitle('Report Information')
    this.addKeyValue('Report Number', options.reportNumber || `VAL-${Date.now()}`)
    this.addKeyValue('Report Date', options.reportDate || new Date().toLocaleDateString())
    if (options.appraiserName) {
      this.addKeyValue('Appraiser', options.appraiserName)
    }
    if (options.appraiserLicense) {
      this.addKeyValue('License Number', options.appraiserLicense)
    }
    this.currentY += 5

    this.addSectionTitle('Property Information')
    this.addKeyValue('Address', `${property.address.street}, ${property.address.city}`)
    this.addKeyValue('Type', property.type)
    this.addKeyValue('Built Area', `${property.details.builtArea} sqm`)
    this.addKeyValue('Rooms', property.details.rooms.toString())
    this.addKeyValue('Floor', `${property.details.floor}/${property.details.totalFloors || 'N/A'}`)
    this.addKeyValue('Build Year', property.details.buildYear?.toString() || 'N/A')
    this.addKeyValue('Condition', property.details.condition)
    this.currentY += 5

    this.addSectionTitle('Valuation Summary', [34, 197, 94])
    this.addKeyValue('Estimated Value', `ILS ${result.estimatedValue.toLocaleString()}`, [34, 197, 94])
    this.addKeyValue('Value Range', `ILS ${result.valueRange.min.toLocaleString()} - ILS ${result.valueRange.max.toLocaleString()}`)
    this.addKeyValue('Confidence Level', `${result.confidence}%`)
    this.addKeyValue('Valuation Method', methodNames[result.method] || result.method)
    this.currentY += 5

    if (options.includeMethodology !== false) {
      this.addSectionTitle('Methodology')
      this.addBox(result.methodology)
      this.currentY += 5
    }

    if (options.includeCalculations !== false && result.calculations.length > 0) {
      this.addSectionTitle('Calculation Steps')
      
      result.calculations.forEach((calc, index) => {
        this.addNewPageIfNeeded(40)
        
        this.doc.setFillColor(240, 240, 240)
        this.doc.roundedRect(this.margin, this.currentY, 10, 10, 2, 2, 'F')
        this.doc.setFontSize(12)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(99, 102, 241)
        this.doc.text((index + 1).toString(), this.margin + 5, this.currentY + 7, { align: 'center' })
        
        this.doc.setFontSize(12)
        this.doc.setTextColor(0, 0, 0)
        this.doc.text(calc.step, this.margin + 15, this.currentY + 7)
        
        this.currentY += 15
        
        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(80, 80, 80)
        const descLines = this.doc.splitTextToSize(calc.description, this.pageWidth - 2 * this.margin - 5)
        for (const line of descLines) {
          this.addNewPageIfNeeded()
          this.doc.text(line, this.margin + 5, this.currentY)
          this.currentY += 6
        }
        
        this.currentY += 3
        
        this.doc.setFillColor(250, 250, 255)
        const boxHeight = 8 + Object.keys(calc.inputs).length * 7 + 15
        this.addNewPageIfNeeded(boxHeight)
        this.doc.roundedRect(this.margin + 5, this.currentY, this.pageWidth - 2 * this.margin - 10, boxHeight, 2, 2, 'F')
        
        this.currentY += 5
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'italic')
        this.doc.setTextColor(100, 100, 100)
        this.doc.text(calc.formula, this.margin + 10, this.currentY)
        this.currentY += 8
        
        Object.entries(calc.inputs).forEach(([key, value]) => {
          this.doc.setFont('helvetica', 'normal')
          this.doc.setTextColor(80, 80, 80)
          this.doc.text(`${key}:`, this.margin + 10, this.currentY)
          this.doc.setFont('helvetica', 'bold')
          this.doc.text(String(value), this.margin + 80, this.currentY)
          this.currentY += 7
        })
        
        this.doc.setDrawColor(99, 102, 241)
        this.doc.setLineWidth(0.5)
        this.doc.line(this.margin + 10, this.currentY, this.pageWidth - this.margin - 10, this.currentY)
        this.currentY += 5
        
        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(0, 0, 0)
        this.doc.text('Result:', this.margin + 10, this.currentY)
        this.doc.setTextColor(34, 197, 94)
        this.doc.text(`ILS ${calc.result.toLocaleString()}`, this.margin + 80, this.currentY)
        
        this.currentY += 12
      })
      
      this.currentY += 5
    }

    this.addSectionTitle('Reconciliation')
    if (result.reconciliation) this.addBox(result.reconciliation)
    this.currentY += 5

    if (options.includeAssumptions !== false && result.assumptions.length > 0) {
      this.addSectionTitle('Assumptions')
      this.addBulletList(result.assumptions, [34, 197, 94])
      this.currentY += 5
    }

    if (options.includeLimitations !== false && result.limitations.length > 0) {
      this.addSectionTitle('Limitations', [245, 158, 11])
      this.addBulletList(result.limitations, [245, 158, 11])
      this.currentY += 5
    }

    this.addNewPageIfNeeded(30)
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 10
    
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'italic')
    this.doc.setTextColor(120, 120, 120)
    const disclaimer = 'This valuation report is prepared for informational purposes only. The estimated value is based on the information available at the time of valuation and market conditions may change. Professional appraisal should be conducted for legal or financial decisions.'
    const disclaimerLines = this.doc.splitTextToSize(disclaimer, this.pageWidth - 2 * this.margin)
    for (const line of disclaimerLines) {
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += 5
    }

    const totalPages = this.doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i)
      this.addFooter(i, totalPages)
    }
  }

  exportMultipleResults(
    results: Array<{ result: ValuationResult; property: Property }>,
    options: PDFExportOptions = {}
  ): void {
    this.addHeader('Comprehensive Valuation Report', 'Multi-Method Analysis')

    this.addSectionTitle('Executive Summary')
    
    if (results.length > 0 && results[0].property) {
      const property = results[0].property
      this.addKeyValue('Property', `${property.address.street}, ${property.address.city}`)
      this.addKeyValue('Report Date', options.reportDate || new Date().toLocaleDateString())
      this.currentY += 5
    }

    this.addSectionTitle('Valuation Methods Comparison', [99, 102, 241])
    
    const headers = ['Method', 'Estimated Value', 'Confidence', 'Range']
    const rows = results.map(({ result }) => {
      const methodNames: Record<string, string> = {
        'comparable-sales': 'Comparable Sales',
        'cost-approach': 'Cost Approach',
        'income-approach': 'Income Approach'
      }
      return [
        methodNames[result.method] || result.method,
        `ILS ${result.estimatedValue.toLocaleString()}`,
        `${result.confidence}%`,
        `${result.valueRange.min.toLocaleString()} - ${result.valueRange.max.toLocaleString()}`
      ]
    })
    
    this.addTable(headers, rows)
    this.currentY += 10

    if (results.length > 0) {
      const values = results.map(r => r.result.estimatedValue)
      const avgValue = values.reduce((a, b) => a + b, 0) / values.length
      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)
      
      this.addSectionTitle('Statistical Analysis', [34, 197, 94])
      this.addKeyValue('Average Value', `ILS ${Math.round(avgValue).toLocaleString()}`, [34, 197, 94])
      this.addKeyValue('Minimum Value', `ILS ${minValue.toLocaleString()}`)
      this.addKeyValue('Maximum Value', `ILS ${maxValue.toLocaleString()}`)
      this.addKeyValue('Value Spread', `ILS ${(maxValue - minValue).toLocaleString()}`)
      this.addKeyValue('Spread %', `${(((maxValue - minValue) / avgValue) * 100).toFixed(2)}%`)
      this.currentY += 10
    }

    results.forEach(({ result, property }, index) => {
      this.doc.addPage()
      this.currentY = this.margin
      
      this.exportValuationResult(result, property, {
        ...options,
        reportNumber: `${options.reportNumber || 'VAL'}-${index + 1}`
      })
    })

    const totalPages = this.doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i)
      this.addFooter(i, totalPages)
    }
  }

  save(filename: string = 'valuation-report.pdf'): void {
    this.doc.save(filename)
  }

  getBlob(): Blob {
    return this.doc.output('blob')
  }

  getDataUrl(): string {
    return this.doc.output('dataurlstring')
  }
}

export function exportSingleValuationToPDF(
  result: ValuationResult,
  property: Property,
  options?: PDFExportOptions
): void {
  const exporter = new ValuationPDFExporter()
  exporter.exportValuationResult(result, property, options)
  
  const methodNames: Record<string, string> = {
    'comparable-sales': 'comparable-sales',
    'cost-approach': 'cost-approach',
    'income-approach': 'income-approach'
  }
  
  const filename = `valuation-${methodNames[result.method] || 'report'}-${Date.now()}.pdf`
  exporter.save(filename)
}

export function exportMultipleValuationsToPDF(
  results: Array<{ result: ValuationResult; property: Property }>,
  options?: PDFExportOptions
): void {
  const exporter = new ValuationPDFExporter()
  exporter.exportMultipleResults(results, options)
  
  const filename = `valuation-comprehensive-report-${Date.now()}.pdf`
  exporter.save(filename)
}
