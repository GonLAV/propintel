import type { Property, Comparable, ValuationResult } from './types'

export interface ReportSection {
  id: string
  title: string
  content: string
  order: number
  enabled: boolean
}

export interface ReportTemplate {
  id: string
  name: string
  sections: ReportSection[]
  createdAt: string
}

/**
 * Generates sections for a professional appraisal report.
 * This is a template builder that produces sections from property + valuations + comparables.
 */
export class ReportGenerator {
  static generateStandardSections(
    property: Property,
    valuations: ValuationResult[],
    comparables: Comparable[]
  ): ReportSection[] {
    const sections: ReportSection[] = []
    let order = 0

    // 1. Executive Summary
    sections.push({
      id: 'summary',
      title: 'תקציר ניהולי',
      content: this.generateExecutiveSummary(property, valuations),
      order: order++,
      enabled: true
    })

    // 2. Property Identification
    sections.push({
      id: 'property-id',
      title: 'זיהוי הנכס',
      content: this.generatePropertyIdentification(property),
      order: order++,
      enabled: true
    })

    // 3. Physical Description
    sections.push({
      id: 'physical-desc',
      title: 'תיאור פיזי',
      content: this.generatePhysicalDescription(property),
      order: order++,
      enabled: true
    })

    // 4. Market Analysis
    if (comparables.length > 0) {
      sections.push({
        id: 'market-analysis',
        title: 'ניתוח שוק',
        content: this.generateMarketAnalysis(comparables),
        order: order++,
        enabled: true
      })
    }

    // 5. Comparable Properties
    if (comparables.length > 0) {
      sections.push({
        id: 'comparables-table',
        title: 'טבלת עסקאות להשוואה',
        content: this.generateComparablesTable(comparables),
        order: order++,
        enabled: true
      })
    }

    // 6. Valuation Methodology
    if (valuations.length > 0) {
      sections.push({
        id: 'methodology',
        title: 'שיטת השומה',
        content: this.generateMethodology(valuations),
        order: order++,
        enabled: true
      })
    }

    // 7. Valuation Results
    if (valuations.length > 0) {
      sections.push({
        id: 'valuation-results',
        title: 'תוצאות השומה',
        content: this.generateValuationResults(valuations),
        order: order++,
        enabled: true
      })
    }

    // 8. Conclusions
    sections.push({
      id: 'conclusions',
      title: 'מסקנות',
      content: this.generateConclusions(property, valuations),
      order: order++,
      enabled: true
    })

    // 9. Assumptions & Limitations
    if (valuations.length > 0) {
      sections.push({
        id: 'assumptions',
        title: 'הנחות יסוד והסתייגויות',
        content: this.generateAssumptionsAndLimitations(valuations),
        order: order++,
        enabled: true
      })
    }

    return sections
  }

  private static generateExecutiveSummary(property: Property, valuations: ValuationResult[]): string {
    const avgValue =
      valuations.length > 0
        ? Math.round(valuations.reduce((sum, v) => sum + v.estimatedValue, 0) / valuations.length)
        : 0

    const confidence =
      valuations.length > 0 ? Math.round(valuations.reduce((sum, v) => sum + v.confidence, 0) / valuations.length) : 0

    return `
<p>דוח שומה מקצועי לנכס הממוקם ב${property.address.street}, ${property.address.city}.</p>

<p><strong>שווי מוערך:</strong> ₪${avgValue.toLocaleString()}</p>

<p><strong>טווח ערכים:</strong> בהתאם לשיטות השומה השונות.</p>

<p><strong>רמת ביטחון:</strong> ${confidence}%</p>

<p>השומה בוצעה בהתאם לתקנים המקצועיים של המקצוע ועל בסיס מידע כמעט עדכני.</p>
    `.trim()
  }

  private static generatePropertyIdentification(property: Property): string {
    return `
<table>
  <tr>
    <td><strong>כתובת:</strong></td>
    <td>${property.address.street}, ${property.address.city}</td>
  </tr>
  <tr>
    <td><strong>שכונה:</strong></td>
    <td>${property.address.neighborhood}</td>
  </tr>
  <tr>
    <td><strong>סוג נכס:</strong></td>
    <td>${property.type}</td>
  </tr>
  <tr>
    <td><strong>מט"ח/חובה:</strong></td>
    <td>N/A (לא צוין בנתונים)</td>
  </tr>
</table>
    `.trim()
  }

  private static generatePhysicalDescription(property: Property): string {
    return `
<p><strong>שטח בנוי:</strong> ${property.details.builtArea} מ"ר</p>
<p><strong>חדרים:</strong> ${property.details.rooms} חדרים (${property.details.bedrooms} חדרי שינה, ${property.details.bathrooms} חדרי אמבטיה)</p>
<p><strong>קומה:</strong> קומה ${property.details.floor} מתוך ${property.details.totalFloors || '?'}</p>
<p><strong>שנת בנייה:</strong> ${property.details.buildYear}</p>
<p><strong>מצב הנכס:</strong> ${property.details.condition}</p>
<p><strong>מאפיינים:</strong> ${[
      property.details.elevator ? 'מעלית' : null,
      property.details.parking > 0 ? `${property.details.parking} מקומות חניה` : null,
      property.details.storage ? 'מחסן' : null,
      property.details.balcony ? 'מרפסת' : null
    ]
      .filter(Boolean)
      .join(', ')}</p>
    `.trim()
  }

  private static generateMarketAnalysis(comparables: Comparable[]): string {
    const selected = comparables.filter(c => c.selected)
    const avgPrice = selected.length > 0 ? selected.reduce((sum, c) => sum + c.salePrice, 0) / selected.length : 0
    const avgPriceSqm = selected.length > 0 ? selected.reduce((sum, c) => sum + c.pricePerSqm, 0) / selected.length : 0

    return `
<p>ניתוח שוק מבוסס על ${selected.length} עסקאות דומות בסביבת הנכס.</p>
<p><strong>מחיר ממוצע:</strong> ₪${Math.round(avgPrice).toLocaleString()}</p>
<p><strong>מחיר ממוצע למ"ר:</strong> ₪${Math.round(avgPriceSqm).toLocaleString()}</p>
<p>העסקאות נבחרו על בסיס דמיון במאפיינים עיקריים והקרבות גיאוגרפית.</p>
    `.trim()
  }

  private static generateComparablesTable(comparables: Comparable[]): string {
    const selected = comparables.filter(c => c.selected)

    const rows = selected
      .map(
        c => `
      <tr>
        <td>${c.address}</td>
        <td>₪${c.salePrice.toLocaleString()}</td>
        <td>${c.builtArea} מ"ר</td>
        <td>₪${Math.round(c.pricePerSqm).toLocaleString()}</td>
        <td>${(c.adjustments.total * 100).toFixed(1)}%</td>
      </tr>
    `
      )
      .join('')

    return `
<table border="1" cellpadding="8" cellspacing="0">
  <thead>
    <tr>
      <th>כתובת</th>
      <th>מחיר</th>
      <th>שטח</th>
      <th>מחיר למ"ר</th>
      <th>התאמה כוללת</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
    `.trim()
  }

  private static generateMethodology(valuations: ValuationResult[]): string {
    const methods = valuations.map(v => v.methodology).join('\n\n')
    return `<p>${methods}</p>`.trim()
  }

  private static generateValuationResults(valuations: ValuationResult[]): string {
    const results = valuations
      .map(
        v => `
      <p>
        <strong>${v.method.toUpperCase()}:</strong> ₪${v.estimatedValue.toLocaleString()} 
        (טווח: ₪${v.valueRange.min.toLocaleString()} - ₪${v.valueRange.max.toLocaleString()}, ביטחון: ${v.confidence}%)
      </p>
    `
      )
      .join('')

    return results.trim()
  }

  private static generateConclusions(property: Property, valuations: ValuationResult[]): string {
    const avgValue =
      valuations.length > 0
        ? Math.round(valuations.reduce((sum, v) => sum + v.estimatedValue, 0) / valuations.length)
        : 0

    return `
<p>על בסיס ניתוח השוק וחישובים שערכנו, שווי הנכס הממוקם ב${property.address.street} נאמד ב<strong>₪${avgValue.toLocaleString()}</strong>.</p>

<p>שווי זה משקף את מצב הנכס, מיקומו, ותנאי השוק בתאריך השומה.</p>
    `.trim()
  }

  private static generateAssumptionsAndLimitations(valuations: ValuationResult[]): string {
    const assumptions = Array.from(new Set(valuations.flatMap(v => v.assumptions)))
    const limitations = Array.from(new Set(valuations.flatMap(v => v.limitations)))

    const assumptionsList = assumptions.map(a => `<li>${a}</li>`).join('')
    const limitationsList = limitations.map(l => `<li>${l}</li>`).join('')

    return `
<h4>הנחות יסוד:</h4>
<ul>
  ${assumptionsList}
</ul>

<h4>הסתייגויות:</h4>
<ul>
  ${limitationsList}
</ul>
    `.trim()
  }
}
