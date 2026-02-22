import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilePdf, CheckCircle, Info } from '@phosphor-icons/react'
import { ValuationPDFExporter } from '@/lib/pdfExport'
import type { ValuationResult } from '@/lib/valuationEngine'
import type { Property } from '@/lib/types'

export function PDFExportDemo() {
  const sampleProperty: Property = {
    id: 'demo-1',
    clientId: 'client-demo',
    status: 'completed',
    address: {
      street: '123 Main Street',
      city: 'Tel Aviv',
      neighborhood: 'Center',
      postalCode: '12345'
    },
    type: 'apartment',
    details: {
      builtArea: 100,
      totalArea: 100,
      rooms: 4,
      bedrooms: 3,
      bathrooms: 2,
      floor: 5,
      totalFloors: 10,
      buildYear: 2015,
      condition: 'good',
      parking: 1,
      storage: true,
      balcony: true,
      elevator: true,
      accessible: false
    },
    features: ['elevator', 'parking', 'storage', 'balcony'],
    description: 'Beautiful 4-room apartment',
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const sampleResult: ValuationResult = {
    method: 'comparable-sales',
    estimatedValue: 3250000,
    valueRange: {
      min: 3100000,
      max: 3400000
    },
    confidence: 85,
    methodology: 'This valuation uses the Comparable Sales Approach, analyzing recent sales of similar properties in the area. The method compares the subject property with three comparable sales, making adjustments for differences in size, condition, location, and features.',
    calculations: [
      {
        step: 'Base Price Calculation',
        description: 'Calculate average price per square meter from comparable sales',
        formula: 'Avg Price/SQM = Σ(Comparable Prices) / Σ(Comparable Areas)',
        inputs: {
          'Comparable 1': 'ILS 2,850,000 / 82 sqm',
          'Comparable 2': 'ILS 3,100,000 / 90 sqm',
          'Comparable 3': 'ILS 2,950,000 / 87 sqm'
        },
        result: 34500
      },
      {
        step: 'Subject Property Base Value',
        description: 'Apply average price per square meter to subject property area',
        formula: 'Base Value = Avg Price/SQM × Subject Area',
        inputs: {
          'Price per SQM': 'ILS 34,500',
          'Subject Area': '100 sqm'
        },
        result: 3450000
      },
      {
        step: 'Adjustments',
        description: 'Apply adjustments for property-specific factors',
        formula: 'Adjusted Value = Base Value × (1 + Σ Adjustment Factors)',
        inputs: {
          'Floor Premium': '+3%',
          'Condition': '-2%',
          'Location': '-4%'
        },
        result: 3250000
      }
    ],
    reconciliation: 'Based on the comparable sales analysis, the estimated value of ILS 3,250,000 represents a fair market value for the subject property. This value falls within the expected range and is supported by recent market transactions. The confidence level of 85% reflects the quality and recency of the comparable data.',
    assumptions: [
      'Property is in current "as-is" condition',
      'Market conditions remain stable',
      'No hidden defects or issues',
      'Comparable sales are verified and accurate',
      'Normal marketing time of 3-6 months'
    ],
    limitations: [
      'Subject to physical inspection',
      'Based on available market data as of report date',
      'Does not account for future market changes',
      'Assumes no major renovations needed',
      'Subject to verification of legal status'
    ]
  }

  const generateSamplePDF = () => {
    const exporter = new ValuationPDFExporter()
    exporter.exportValuationResult(sampleResult, sampleProperty, {
      includeCalculations: true,
      includeAssumptions: true,
      includeLimitations: true,
      includeMethodology: true,
      appraiserName: 'John Doe, MAI',
      appraiserLicense: 'LICENSE-12345',
      reportDate: new Date().toLocaleDateString('en-US'),
      reportNumber: 'DEMO-2024-001'
    })
    exporter.save('sample-valuation-report.pdf')
  }

  return (
    <Card className="p-6 glass-effect">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <FilePdf size={32} weight="duotone" className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">PDF Export Demo</h3>
          <p className="text-muted-foreground">
            Generate a sample valuation report PDF to see the professional output format
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Sample Property</div>
            <div className="font-semibold">4-Room Apartment, Tel Aviv</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Valuation Method</div>
            <Badge variant="outline" className="gap-1">
              <CheckCircle size={14} weight="fill" className="text-success" />
              Comparable Sales
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Estimated Value</div>
            <div className="font-mono font-bold text-primary">ILS 3,250,000</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Confidence</div>
            <div className="font-mono font-semibold">85%</div>
          </div>
        </div>

        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Info size={20} weight="fill" className="text-accent shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong>What's included:</strong> Complete property details, valuation summary, 
              methodology explanation, step-by-step calculations, reconciliation, assumptions, 
              and limitations. Professional formatting with multiple pages.
            </div>
          </div>
        </div>
      </div>

      <Button onClick={generateSamplePDF} className="w-full gap-2" size="lg">
        <FilePdf size={20} weight="duotone" />
        Generate Sample PDF Report
      </Button>
    </Card>
  )
}
