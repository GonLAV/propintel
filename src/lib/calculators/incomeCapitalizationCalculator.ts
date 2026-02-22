export interface IncomeParams {
  grossAnnualIncome: number
  vacancyRate: number
  operatingExpenses: number
  propertyTax: number
  insurance: number
  maintenance: number
  management: number
  utilities: number
  otherExpenses: number
}

export interface CapRateParams {
  marketCapRate: number
  riskAdjustment: number
  locationAdjustment: number
  conditionAdjustment: number
  finalCapRate: number
}

export interface IncomeScenario {
  name: string
  nameHebrew: string
  grossIncome: number
  noi: number
  capRate: number
  value: number
  description: string
}

export interface IncomeCapitalizationResult {
  grossIncome: number
  effectiveGrossIncome: number
  totalExpenses: number
  netOperatingIncome: number
  capRate: number
  propertyValue: number
  scenarios: IncomeScenario[]
  sensitivityAnalysis: SensitivityAnalysis
  formula: string
  narrativeHebrew: string
  expenseBreakdown: ExpenseBreakdown[]
}

export interface ExpenseBreakdown {
  category: string
  categoryHebrew: string
  amount: number
  percentage: number
}

export interface SensitivityAnalysis {
  capRateRange: { rate: number; value: number }[]
  incomeRange: { income: number; value: number }[]
  expenseRange: { expense: number; value: number }[]
}

export class IncomeCapitalizationCalculator {
  static calculate(
    incomeParams: IncomeParams,
    capRateParams: CapRateParams
  ): IncomeCapitalizationResult {
    const grossIncome = incomeParams.grossAnnualIncome
    
    const vacancyLoss = (grossIncome * incomeParams.vacancyRate) / 100
    const effectiveGrossIncome = grossIncome - vacancyLoss

    const totalExpenses = 
      incomeParams.operatingExpenses +
      incomeParams.propertyTax +
      incomeParams.insurance +
      incomeParams.maintenance +
      incomeParams.management +
      incomeParams.utilities +
      incomeParams.otherExpenses

    const netOperatingIncome = effectiveGrossIncome - totalExpenses

    const capRate = capRateParams.finalCapRate
    const propertyValue = (netOperatingIncome / capRate) * 100

    const scenarios = this.generateScenarios(
      grossIncome,
      totalExpenses,
      incomeParams.vacancyRate,
      capRate
    )

    const sensitivityAnalysis = this.performSensitivityAnalysis(
      grossIncome,
      totalExpenses,
      incomeParams.vacancyRate,
      capRate
    )

    const expenseBreakdown = this.createExpenseBreakdown(incomeParams, effectiveGrossIncome)

    const formula = this.generateFormula(
      effectiveGrossIncome,
      totalExpenses,
      netOperatingIncome,
      capRate,
      propertyValue
    )

    const narrativeHebrew = this.generateNarrative(
      grossIncome,
      effectiveGrossIncome,
      totalExpenses,
      netOperatingIncome,
      capRate,
      propertyValue,
      scenarios
    )

    return {
      grossIncome,
      effectiveGrossIncome,
      totalExpenses,
      netOperatingIncome,
      capRate,
      propertyValue,
      scenarios,
      sensitivityAnalysis,
      formula,
      narrativeHebrew,
      expenseBreakdown
    }
  }

  private static generateScenarios(
    grossIncome: number,
    totalExpenses: number,
    vacancyRate: number,
    baseCapRate: number
  ): IncomeScenario[] {
    const scenarios: IncomeScenario[] = []

    const optimisticIncome = grossIncome * 1.1
    const optimisticVacancy = Math.max(0, vacancyRate - 2)
    const optimisticEGI = optimisticIncome * (1 - optimisticVacancy / 100)
    const optimisticNOI = optimisticEGI - totalExpenses * 0.95
    const optimisticCapRate = baseCapRate - 0.5
    const optimisticValue = (optimisticNOI / optimisticCapRate) * 100

    scenarios.push({
      name: 'Optimistic',
      nameHebrew: 'אופטימי',
      grossIncome: optimisticIncome,
      noi: optimisticNOI,
      capRate: optimisticCapRate,
      value: optimisticValue,
      description: 'תרחיש אופטימי - הכנסה מוגברת, הוצאות מופחתות, Cap Rate נמוך'
    })

    const baseEGI = grossIncome * (1 - vacancyRate / 100)
    const baseNOI = baseEGI - totalExpenses
    const baseValue = (baseNOI / baseCapRate) * 100

    scenarios.push({
      name: 'Base',
      nameHebrew: 'בסיס',
      grossIncome,
      noi: baseNOI,
      capRate: baseCapRate,
      value: baseValue,
      description: 'תרחיש בסיס - תנאים נוכחיים'
    })

    const conservativeIncome = grossIncome * 0.95
    const conservativeVacancy = vacancyRate + 3
    const conservativeEGI = conservativeIncome * (1 - conservativeVacancy / 100)
    const conservativeNOI = conservativeEGI - totalExpenses * 1.05
    const conservativeCapRate = baseCapRate + 0.5
    const conservativeValue = (conservativeNOI / conservativeCapRate) * 100

    scenarios.push({
      name: 'Conservative',
      nameHebrew: 'שמרני',
      grossIncome: conservativeIncome,
      noi: conservativeNOI,
      capRate: conservativeCapRate,
      value: conservativeValue,
      description: 'תרחיש שמרני - הכנסה מופחתת, הוצאות מוגברות, Cap Rate גבוה'
    })

    return scenarios
  }

  private static performSensitivityAnalysis(
    grossIncome: number,
    totalExpenses: number,
    vacancyRate: number,
    baseCapRate: number
  ): SensitivityAnalysis {
    const capRateRange: { rate: number; value: number }[] = []
    for (let rate = baseCapRate - 2; rate <= baseCapRate + 2; rate += 0.5) {
      const egi = grossIncome * (1 - vacancyRate / 100)
      const noi = egi - totalExpenses
      const value = (noi / rate) * 100
      capRateRange.push({ rate, value })
    }

    const incomeRange: { income: number; value: number }[] = []
    for (let pct = -20; pct <= 20; pct += 5) {
      const income = grossIncome * (1 + pct / 100)
      const egi = income * (1 - vacancyRate / 100)
      const noi = egi - totalExpenses
      const value = (noi / baseCapRate) * 100
      incomeRange.push({ income, value })
    }

    const expenseRange: { expense: number; value: number }[] = []
    for (let pct = -20; pct <= 20; pct += 5) {
      const expense = totalExpenses * (1 + pct / 100)
      const egi = grossIncome * (1 - vacancyRate / 100)
      const noi = egi - expense
      const value = (noi / baseCapRate) * 100
      expenseRange.push({ expense, value })
    }

    return {
      capRateRange,
      incomeRange,
      expenseRange
    }
  }

  private static createExpenseBreakdown(
    params: IncomeParams,
    effectiveGrossIncome: number
  ): ExpenseBreakdown[] {
    const breakdown: ExpenseBreakdown[] = []

    const addExpense = (category: string, categoryHebrew: string, amount: number) => {
      if (amount > 0) {
        breakdown.push({
          category,
          categoryHebrew,
          amount,
          percentage: (amount / effectiveGrossIncome) * 100
        })
      }
    }

    addExpense('Operating Expenses', 'הוצאות תפעול', params.operatingExpenses)
    addExpense('Property Tax', 'ארנונה', params.propertyTax)
    addExpense('Insurance', 'ביטוח', params.insurance)
    addExpense('Maintenance', 'תחזוקה', params.maintenance)
    addExpense('Management', 'ניהול', params.management)
    addExpense('Utilities', 'שירותים', params.utilities)
    addExpense('Other', 'אחר', params.otherExpenses)

    return breakdown
  }

  private static generateFormula(
    effectiveGrossIncome: number,
    totalExpenses: number,
    netOperatingIncome: number,
    capRate: number,
    propertyValue: number
  ): string {
    return (
      `חישוב שיטת היוון:\n\n` +
      `1. הכנסה אפקטיבית ברוטו (EGI):\n` +
      `   ${effectiveGrossIncome.toLocaleString('he-IL')} ₪\n\n` +
      `2. הוצאות תפעול כוללות:\n` +
      `   ${totalExpenses.toLocaleString('he-IL')} ₪\n\n` +
      `3. הכנסה נטו מתפעול (NOI):\n` +
      `   NOI = EGI - הוצאות\n` +
      `   NOI = ${effectiveGrossIncome.toLocaleString('he-IL')} - ${totalExpenses.toLocaleString('he-IL')}\n` +
      `   NOI = ${netOperatingIncome.toLocaleString('he-IL')} ₪\n\n` +
      `4. שיעור היוון (Cap Rate):\n` +
      `   ${capRate}%\n\n` +
      `5. שווי הנכס:\n` +
      `   שווי = NOI / Cap Rate\n` +
      `   שווי = ${netOperatingIncome.toLocaleString('he-IL')} / ${capRate}%\n` +
      `   שווי = ${propertyValue.toLocaleString('he-IL')} ₪`
    )
  }

  private static generateNarrative(
    grossIncome: number,
    effectiveGrossIncome: number,
    totalExpenses: number,
    netOperatingIncome: number,
    capRate: number,
    propertyValue: number,
    scenarios: IncomeScenario[]
  ): string {
    const lines: string[] = []

    lines.push('שיטת ההיוון (Income Capitalization)')
    lines.push('='.repeat(60))
    lines.push('')
    lines.push('שווי הנכס חושב בשיטת ההיוון, המבוססת על הכנסה נטו מתפעול ושיעור היוון שוק.')
    lines.push('')

    lines.push('1. ניתוח הכנסות:')
    lines.push(`   הכנסה ברוטו שנתית: ${grossIncome.toLocaleString('he-IL')} ₪`)
    lines.push(`   הכנסה אפקטיבית (לאחר פינויים): ${effectiveGrossIncome.toLocaleString('he-IL')} ₪`)
    lines.push('')

    lines.push('2. ניתוח הוצאות:')
    lines.push(`   הוצאות תפעול כוללות: ${totalExpenses.toLocaleString('he-IL')} ₪`)
    const expenseRatio = (totalExpenses / effectiveGrossIncome) * 100
    lines.push(`   יחס הוצאות (Expense Ratio): ${expenseRatio.toFixed(1)}%`)
    lines.push('')

    lines.push('3. הכנסה נטו מתפעול (NOI):')
    lines.push(`   NOI = ${netOperatingIncome.toLocaleString('he-IL')} ₪`)
    lines.push('')

    lines.push('4. שיעור היוון:')
    lines.push(`   Cap Rate = ${capRate}%`)
    lines.push(`   (מבוסס על ניתוח עסקאות שוק דומות והתאמות סיכון)`)
    lines.push('')

    lines.push('5. שווי מחושב:')
    lines.push(`   ${propertyValue.toLocaleString('he-IL')} ₪`)
    lines.push('')

    lines.push('6. ניתוח תרחישים:')
    scenarios.forEach(scenario => {
      lines.push(`   • ${scenario.nameHebrew}: ${scenario.value.toLocaleString('he-IL')} ₪`)
      lines.push(`     (NOI: ${scenario.noi.toLocaleString('he-IL')}, Cap Rate: ${scenario.capRate}%)`)
    })

    const valueRange = scenarios.map(s => s.value)
    const minValue = Math.min(...valueRange)
    const maxValue = Math.max(...valueRange)
    
    lines.push('')
    lines.push(`טווח ערכים: ${minValue.toLocaleString('he-IL')} - ${maxValue.toLocaleString('he-IL')} ₪`)

    return lines.join('\n')
  }

  static calculateCapRate(
    netOperatingIncome: number,
    propertyValue: number
  ): number {
    return (netOperatingIncome / propertyValue) * 100
  }

  static calculateGrossRentMultiplier(
    propertyValue: number,
    grossAnnualIncome: number
  ): number {
    return propertyValue / grossAnnualIncome
  }

  static calculateDebtServiceCoverage(
    netOperatingIncome: number,
    annualDebtService: number
  ): number {
    return netOperatingIncome / annualDebtService
  }

  static createExpenseReport(breakdown: ExpenseBreakdown[]): string {
    const lines: string[] = []
    
    lines.push('פירוט הוצאות תפעול')
    lines.push('='.repeat(80))
    lines.push('')
    lines.push('קטגוריה'.padEnd(30) + 'סכום'.padStart(20) + 'אחוז מהכנסה'.padStart(15))
    lines.push('-'.repeat(80))

    let total = 0
    breakdown.forEach(item => {
      const row = 
        item.categoryHebrew.padEnd(30) +
        `${item.amount.toLocaleString('he-IL')} ₪`.padStart(20) +
        `${item.percentage.toFixed(2)}%`.padStart(15)
      lines.push(row)
      total += item.amount
    })

    lines.push('-'.repeat(80))
    lines.push('סה"כ'.padEnd(30) + `${total.toLocaleString('he-IL')} ₪`.padStart(20))

    return lines.join('\n')
  }
}
