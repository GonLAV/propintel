import type { Property, ServiceType, PricingTemplate, Invoice, InvoiceLineItem } from './types'

export const DEFAULT_PRICING_TEMPLATES: PricingTemplate[] = [
  {
    id: '1',
    name: 'שומת דירת מגורים סטנדרטית',
    serviceType: 'residential-appraisal',
    basePrice: 2500,
    pricePerSqm: 10,
    minimumPrice: 2500,
    maximumPrice: 8000,
    description: 'שומה מלאה לדירת מגורים עד 150 מ"ר',
    isActive: true
  },
  {
    id: '2',
    name: 'שומת נכס מסחרי',
    serviceType: 'commercial-appraisal',
    basePrice: 5000,
    pricePerSqm: 15,
    minimumPrice: 5000,
    maximumPrice: 25000,
    description: 'שומה מלאה לנכס מסחרי או משרדי',
    isActive: true
  },
  {
    id: '3',
    name: 'שומת קרקע',
    serviceType: 'land-appraisal',
    basePrice: 4000,
    pricePerSqm: 5,
    minimumPrice: 4000,
    maximumPrice: 50000,
    description: 'שומת קרקע או מגרש לבנייה',
    isActive: true
  },
  {
    id: '4',
    name: 'שומת שכירות',
    serviceType: 'rental-appraisal',
    basePrice: 1500,
    minimumPrice: 1500,
    maximumPrice: 3000,
    description: 'הערכת שווי שכירות חודשית',
    isActive: true
  },
  {
    id: '5',
    name: 'שומה מורכבת',
    serviceType: 'complex-appraisal',
    basePrice: 8000,
    minimumPrice: 8000,
    description: 'שומה מורכבת - נכס מיוחד, נכסים מרובים, או דרישות מיוחדות',
    isActive: true
  },
  {
    id: '6',
    name: 'ייעוץ שמאי',
    serviceType: 'consultation',
    basePrice: 500,
    description: 'שעת ייעוץ שמאית',
    isActive: true
  },
  {
    id: '7',
    name: 'סיור במקום',
    serviceType: 'site-inspection',
    basePrice: 300,
    description: 'ביקור נוסף באתר',
    isActive: true
  },
  {
    id: '8',
    name: 'דוח נוסף',
    serviceType: 'additional-report',
    basePrice: 800,
    description: 'הכנת דוח נוסף',
    isActive: true
  },
  {
    id: '9',
    name: 'טיפול דחוף',
    serviceType: 'rush-fee',
    basePrice: 1000,
    description: 'תוספת דחיפות - מסירה עד 48 שעות',
    isActive: true
  }
]

export class PricingEngine {
  
  static calculatePrice(
    serviceType: ServiceType,
    property?: Property,
    template?: PricingTemplate
  ): number {
    const pricingTemplate = template || DEFAULT_PRICING_TEMPLATES.find(t => t.serviceType === serviceType)
    
    if (!pricingTemplate) {
      return 0
    }

    let price = pricingTemplate.basePrice

    if (property && pricingTemplate.pricePerSqm) {
      const area = property.details.builtArea || 0
      const areaCharge = area * pricingTemplate.pricePerSqm
      price = pricingTemplate.basePrice + areaCharge
    }

    if (pricingTemplate.minimumPrice && price < pricingTemplate.minimumPrice) {
      price = pricingTemplate.minimumPrice
    }

    if (pricingTemplate.maximumPrice && price > pricingTemplate.maximumPrice) {
      price = pricingTemplate.maximumPrice
    }

    if (property) {
      price += this.calculateComplexityAdjustment(property)
    }

    return Math.round(price)
  }

  private static calculateComplexityAdjustment(property: Property): number {
    let adjustment = 0

    if (property.type === 'penthouse') adjustment += 500
    if (property.type === 'garden-apartment') adjustment += 300
    if (property.type === 'duplex') adjustment += 400

    if (property.details.builtArea > 200) adjustment += 1000
    if (property.details.builtArea > 300) adjustment += 1500

    if (property.details.buildYear < 1960) adjustment += 500
    
    const featureCount = property.features?.length || 0
    if (featureCount > 10) adjustment += 300

    if (property.details.condition === 'renovation-needed') adjustment += 400

    return adjustment
  }

  static createInvoice(
    propertyId: string,
    clientId: string,
    lineItems: InvoiceLineItem[],
    options: {
      taxRate?: number
      paymentTerms?: string
      notes?: string
      dueInDays?: number
    } = {}
  ): Invoice {
    const taxRate = options.taxRate ?? 0.17
    const dueInDays = options.dueInDays ?? 30

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = Math.round(subtotal * taxRate)
    const totalAmount = subtotal + taxAmount

    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + dueInDays)

    const invoiceNumber = this.generateInvoiceNumber()

    return {
      id: crypto.randomUUID(),
      propertyId,
      clientId,
      invoiceNumber,
      status: 'draft',
      issueDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      paymentTerms: options.paymentTerms || `תשלום תוך ${dueInDays} ימים`,
      notes: options.notes,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  }

  static createLineItem(
    description: string,
    serviceType: ServiceType,
    quantity: number,
    unitPrice: number
  ): InvoiceLineItem {
    return {
      id: crypto.randomUUID(),
      description,
      serviceType,
      quantity,
      unitPrice,
      amount: quantity * unitPrice
    }
  }

  static updateInvoiceStatus(invoice: Invoice, paidAmount: number): Invoice {
    const newPaidAmount = invoice.paidAmount + paidAmount
    const balance = invoice.totalAmount - newPaidAmount

    let status: Invoice['status'] = 'sent'
    if (balance <= 0) {
      status = 'paid'
    } else if (new Date(invoice.dueDate) < new Date()) {
      status = 'overdue'
    }

    return {
      ...invoice,
      paidAmount: newPaidAmount,
      balance: Math.max(balance, 0),
      status,
      paidAt: balance <= 0 ? new Date().toISOString() : invoice.paidAt,
      updatedAt: new Date().toISOString()
    }
  }

  private static generateInvoiceNumber(): string {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `INV-${year}-${random}`
  }

  static calculateMonthlyRevenue(invoices: Invoice[]): number {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    
    return invoices
      .filter(inv => new Date(inv.issueDate) >= firstDay && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + inv.totalAmount, 0)
  }

  static calculateOutstanding(invoices: Invoice[]): number {
    return invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.balance, 0)
  }

  static getOverdueInvoices(invoices: Invoice[]): Invoice[] {
    const now = new Date()
    return invoices.filter(inv => 
      inv.status !== 'paid' && 
      inv.status !== 'cancelled' &&
      new Date(inv.dueDate) < now
    )
  }

  static generatePaymentLink(invoice: Invoice): string {
    return `https://payment.appraisalpro.co.il/pay/${invoice.id}`
  }
}
