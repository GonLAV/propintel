export interface RentalYieldInputs {
  propertyValue: number
  monthlyRent: number
  annualRent?: number
  operatingExpenses?: number
  vacancyRate?: number
  propertyTaxRate?: number
  maintenanceRate?: number
  managementFeeRate?: number
}

export interface RentalYieldResults {
  grossYield: number
  netYield: number
  monthlyRent: number
  annualRent: number
  annualExpenses: number
  netAnnualIncome: number
  grossMonthlyIncome: number
  netMonthlyIncome: number
  capRate: number
  cashOnCashReturn: number
  breakdownExpenses: {
    vacancy: number
    propertyTax: number
    maintenance: number
    managementFee: number
    other: number
    total: number
  }
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  recommendation: string
  benchmarks: {
    marketAverage: number
    aboveMarket: boolean
    percentageDiff: number
  }
}

export class RentalYieldCalculator {
  private static readonly DEFAULT_VACANCY_RATE = 0.05
  private static readonly DEFAULT_PROPERTY_TAX_RATE = 0.01
  private static readonly DEFAULT_MAINTENANCE_RATE = 0.015
  private static readonly DEFAULT_MANAGEMENT_FEE_RATE = 0.08

  private static readonly MARKET_BENCHMARKS = {
    residential: 0.04,
    commercial: 0.06,
    office: 0.055,
    land: 0.03
  }

  static calculateYield(inputs: RentalYieldInputs): RentalYieldResults {
    const annualRent = inputs.annualRent || inputs.monthlyRent * 12
    const monthlyRent = inputs.monthlyRent
    
    const vacancyRate = inputs.vacancyRate ?? this.DEFAULT_VACANCY_RATE
    const propertyTaxRate = inputs.propertyTaxRate ?? this.DEFAULT_PROPERTY_TAX_RATE
    const maintenanceRate = inputs.maintenanceRate ?? this.DEFAULT_MAINTENANCE_RATE
    const managementFeeRate = inputs.managementFeeRate ?? this.DEFAULT_MANAGEMENT_FEE_RATE

    const vacancyLoss = annualRent * vacancyRate
    const propertyTax = inputs.propertyValue * propertyTaxRate
    const maintenance = inputs.propertyValue * maintenanceRate
    const managementFee = annualRent * managementFeeRate
    const otherExpenses = inputs.operatingExpenses || 0

    const totalExpenses = vacancyLoss + propertyTax + maintenance + managementFee + otherExpenses
    
    const netAnnualIncome = annualRent - totalExpenses
    const grossYield = (annualRent / inputs.propertyValue) * 100
    const netYield = (netAnnualIncome / inputs.propertyValue) * 100
    const capRate = netYield

    const grossMonthlyIncome = annualRent / 12
    const netMonthlyIncome = netAnnualIncome / 12

    const cashOnCashReturn = netYield

    const quality = this.determineQuality(netYield)
    const recommendation = this.generateRecommendation(netYield, grossYield, quality)
    
    const marketAverage = this.MARKET_BENCHMARKS.residential
    const aboveMarket = netYield > marketAverage * 100
    const percentageDiff = ((netYield - marketAverage * 100) / (marketAverage * 100)) * 100

    return {
      grossYield,
      netYield,
      monthlyRent,
      annualRent,
      annualExpenses: totalExpenses,
      netAnnualIncome,
      grossMonthlyIncome,
      netMonthlyIncome,
      capRate,
      cashOnCashReturn,
      breakdownExpenses: {
        vacancy: vacancyLoss,
        propertyTax,
        maintenance,
        managementFee,
        other: otherExpenses,
        total: totalExpenses
      },
      quality,
      recommendation,
      benchmarks: {
        marketAverage: marketAverage * 100,
        aboveMarket,
        percentageDiff
      }
    }
  }

  private static determineQuality(netYield: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (netYield >= 6) return 'excellent'
    if (netYield >= 4) return 'good'
    if (netYield >= 2.5) return 'fair'
    return 'poor'
  }

  private static generateRecommendation(netYield: number, grossYield: number, quality: string): string {
    if (quality === 'excellent') {
      return 'תשואה מצוינת - הנכס מניב החזר גבוה ביחס לערכו. מומלץ להשקעה או החזקה ארוכת טווח.'
    } else if (quality === 'good') {
      return 'תשואה טובה - הנכס מניב החזר סביר. מתאים להשקעה לטווח בינוני-ארוך.'
    } else if (quality === 'fair') {
      return 'תשואה בינונית - הנכס מניב החזר נמוך יחסית. יש לבחון אפשרויות להגדלת ההכנסה או הפחתת ההוצאות.'
    } else {
      return 'תשואה נמוכה - הנכס מניב החזר חלש. מומלץ לשקול מכירה או שיפורים משמעותיים להגדלת ההכנסה.'
    }
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  static formatPercentage(value: number, decimals = 2): string {
    return `${value.toFixed(decimals)}%`
  }

  static estimateMarketRent(propertyValue: number, targetYield = 0.04): number {
    return (propertyValue * targetYield) / 12
  }

  static estimatePropertyValue(monthlyRent: number, targetYield = 0.04): number {
    const annualRent = monthlyRent * 12
    return annualRent / targetYield
  }
}
