# Data.gov.il Integration Guide
## Real Israeli Government API for Property Valuation

> **🇮🇱 100% Legitimate | 100% Transparent | 100% Professional**
> 
> This system connects to the official data.gov.il API maintained by the Israeli Ministry of Justice, pulling real estate transaction data directly from the government land registry.

---

## Table of Contents
1. [Overview](#overview)
2. [API Integration](#api-integration)
3. [Data Flow](#data-flow)
4. [Professional Methodology](#professional-methodology)
5. [Usage Guide](#usage-guide)
6. [Code Examples](#code-examples)

---

## Overview

### What is This?
A production-grade property valuation system that:
- ✅ Connects to **real** government APIs (not mocks)
- ✅ Uses **transparent** calculation methodology
- ✅ Provides **defensible** appraisals with audit trails
- ✅ Integrates **AI analysis** for professional insights

### Why This Matters
Previous systems used synthetic/mock data. This system:
- Pulls **actual transactions** from government databases
- Follows **professional appraisal standards**
- Creates **legally defensible** documentation
- Enables **regulatory compliance**

---

## API Integration

### Official Endpoint
```
https://data.gov.il/api/3/action/datastore_search
```

### Resource ID
```
8f714b7f-c35c-4b40-a0e7-547b675eee0e
```
This resource contains real estate transaction records from the Israeli land registry.

### Request Structure
```typescript
const url = new URL('https://data.gov.il/api/3/action/datastore_search')
url.searchParams.append('resource_id', '8f714b7f-c35c-4b40-a0e7-547b675eee0e')
url.searchParams.append('limit', '100')
url.searchParams.append('filters', JSON.stringify({
  city: "תל אביב-יפו",
  street: "רוטשילד"  // optional
}))

const response = await fetch(url.toString())
const data = await response.json()
```

### Response Format
```json
{
  "success": true,
  "result": {
    "records": [
      {
        "_id": 12345,
        "dealAmount": "2500000",
        "dealDate": "2024-01-15",
        "city": "תל אביב-יפו",
        "street": "רוטשילד",
        "houseNumber": "45",
        "area": "95",
        "rooms": "3.5",
        "floor": "3",
        "assetType": "דירה",
        "dealNature": "רגיל",
        "propertyStatus": "חדש"
      }
    ],
    "total": 150
  }
}
```

---

## Data Flow

### 1. Fetch from API
```typescript
const rawData = await fetchTransactionsFromDataGov({
  city: "תל אביב-יפו",
  street: "רוטשילד",  // optional
  limit: 100
})
```

### 2. Clean & Normalize
```typescript
const cleanData = normalizeTransactions(rawData)
```

**Normalization Rules:**
- ✅ Remove records with missing `dealAmount` or `area`
- ✅ Remove records where price ≤ 0 or area ≤ 0
- ✅ Remove outliers: price/sqm < ₪1,000 or > ₪200,000
- ✅ Parse numeric values from strings
- ✅ Generate unique IDs for each transaction

**Before/After Example:**
```
Raw: 150 records
↓ Remove missing data (-30)
↓ Remove invalid prices (-10)
↓ Remove outliers (-5)
Clean: 105 valid transactions ✅
```

### 3. Calculate Valuation
```typescript
const valuation = calculateBasicValuation(cleanData, targetArea)
```

**Calculation Methodology:**
1. Extract price per sqm from all transactions
2. Calculate **median** (not average - resistant to outliers)
3. Calculate standard deviation
4. Determine value range (median ± 1 std dev)
5. Score confidence based on sample size & variance
6. Score data quality based on field completeness

### 4. Create Appraisal Record
```typescript
const record = createAppraisalRecord({
  propertyId: "prop_123",
  property: { city, street, area, rooms, floor },
  marketData: {
    source: 'data.gov.il',
    transactions: cleanData,
    sampleSize: cleanData.length,
    avgPricePerSqm,
    medianPricePerSqm,
    dataQuality: 85
  },
  valuation: {
    estimatedValue: 2375000,
    pricePerSqm: 25000,
    valueRange: { min: 2250000, max: 2500000 },
    confidence: 'high',
    method: 'comparative',
    dataQuality: 85
  },
  metadata: {
    appraiser: "שמעון כהן",
    client: "ישראל ישראלי"
  }
})
```

### 5. Optional: AI Analysis
```typescript
const prompt = generateAppraisalPrompt({
  propertyDetails,
  transactions: cleanData.slice(0, 10),  // Top 10 comps
  valuationResult: valuation
})

const analysis = await window.spark.llm(prompt, 'gpt-4o')

const finalRecord = addAIAnalysis(record, analysis, 'system')
```

---

## Professional Methodology

### Why Median (Not Average)?
**Average** is affected by outliers:
```
Prices: [20k, 22k, 23k, 24k, 100k]  ← One outlier
Average: 37.8k ❌ (Too high!)
Median:  23k   ✅ (Accurate)
```

**Median** is resistant to outliers and represents true market center.

### Confidence Scoring

| Sample Size | Coefficient of Variation | Confidence |
|-------------|--------------------------|------------|
| < 5         | Any                      | Low        |
| 5-9         | > 30%                    | Low        |
| 5-9         | 15-30%                   | Medium     |
| ≥ 10        | > 15%                    | Medium     |
| ≥ 10        | < 15%                    | High       |

**Coefficient of Variation (CV) = StdDev / Mean**

Low CV = Consistent market
High CV = Volatile market or bad data

### Data Quality Score

```
Quality = (
  (Transactions with rooms / Total) × 30% +
  (Transactions with floor / Total) × 30% +
  (Transactions with street / Total) × 40%
)
```

**Example:**
- 100 transactions
- 80 have rooms data → 80% × 30 = 24 points
- 90 have floor data → 90% × 30 = 27 points
- 95 have street data → 95% × 40 = 38 points
- **Total Quality: 89%** ✅

---

## Usage Guide

### Step 1: Navigate to Tool
Sidebar → שומות → 🇮🇱 Data.gov.il - שמאות ממשלתית

### Step 2: Enter Property Details
- **עיר (City)**: Required - e.g., "תל אביב-יפו"
- **רחוב (Street)**: Optional - e.g., "רוטשילד"
- **שטח (Area)**: Required - in square meters
- **חדרים (Rooms)**: Optional - e.g., 3.5
- **קומה (Floor)**: Optional - e.g., 3

### Step 3: Fetch & Calculate
Click **"שלוף נתונים וחשב שומה"**

System will:
1. Connect to data.gov.il ⏳
2. Fetch transactions 📥
3. Clean data 🧹
4. Calculate valuation 🧮
5. Create appraisal record 📋

### Step 4: Review Results
Switch to **"תוצאות"** tab to see:
- Estimated value (₪)
- Price per sqm (₪/m²)
- Confidence level (Low/Medium/High)
- Value range (min-max)
- Sample size
- Data quality score

### Step 5: View Transactions
Switch to **"עסקאות"** tab to see:
- All fetched transactions
- Full details per transaction
- Verified government source badge

### Step 6: Generate AI Analysis (Optional)
Click **"צור ניתוח AI מקצועי"**

AI will:
1. Analyze property details
2. Review comparable transactions
3. Apply professional methodology
4. Generate Hebrew analysis (300-500 words)
5. Provide recommendations

### Step 7: Export Data
- **CSV Export**: All transactions in spreadsheet format
- **PDF Report**: Coming soon

---

## Code Examples

### Example 1: Basic Valuation
```typescript
import { performCompleteValuation } from '@/lib/dataGovAPI'

const result = await performCompleteValuation({
  city: 'תל אביב-יפו',
  street: 'רוטשילד',
  targetArea: 95,
  propertyDetails: {
    rooms: 3.5,
    floor: 3,
    assetType: 'דירה'
  }
})

console.log(`Estimated Value: ₪${result.valuation.estimatedValue.toLocaleString()}`)
console.log(`Confidence: ${result.valuation.confidence}`)
console.log(`Transactions: ${result.transactions.length}`)
```

### Example 2: With Appraisal Record
```typescript
import { createAppraisalRecord, exportAppraisalToCSV } from '@/lib/appraisalSchema'

const record = createAppraisalRecord({
  propertyId: 'prop_123',
  property: {
    city: 'תל אביב-יפו',
    street: 'רוטשילד',
    area: 95,
    rooms: 3.5,
    floor: 3
  },
  marketData: {
    source: 'data.gov.il',
    fetchedAt: new Date().toISOString(),
    sampleSize: result.transactions.length,
    avgPricePerSqm: 25000,
    medianPricePerSqm: 24500,
    dataQuality: 85,
    transactions: result.transactions
  },
  valuation: result.valuation
})

// Export to CSV
const csv = exportAppraisalToCSV(record)
console.log(csv)
```

### Example 3: With AI Analysis
```typescript
import { generateAppraisalPrompt } from '@/lib/dataGovAPI'
import { addAIAnalysis } from '@/lib/appraisalSchema'

const prompt = generateAppraisalPrompt({
  propertyDetails: {
    city: 'תל אביב-יפו',
    street: 'רוטשילד',
    area: 95,
    rooms: 3.5,
    floor: 3
  },
  transactions: result.transactions,
  valuationResult: result.valuation
})

const analysis = await window.spark.llm(prompt, 'gpt-4o')

const finalRecord = addAIAnalysis(record, analysis, 'system')

console.log(finalRecord.valuation.aiAnalysis)
```

### Example 4: Adding Adjustments
```typescript
import { addAppraisalAdjustment, calculateAdjustedValue } from '@/lib/appraisalSchema'

let record = createAppraisalRecord(/* ... */)

// Add floor adjustment
record = addAppraisalAdjustment(
  record,
  {
    factor: 'קומה גבוהה',
    description: 'קומה 8 מתוך 10 - נוף טוב',
    impact: 5,  // +5%
    reason: 'נוף לים, אור טבעי מעולה'
  },
  'appraiser_name'
)

// Add condition adjustment
record = addAppraisalAdjustment(
  record,
  {
    factor: 'מצב הנכס',
    description: 'שופץ לאחרונה',
    impact: 3,  // +3%
    reason: 'שיפוץ מלא בשנתיים האחרונות'
  },
  'appraiser_name'
)

const adjustedValue = calculateAdjustedValue(record)
console.log(`Base: ₪${record.valuation.estimatedValue.toLocaleString()}`)
console.log(`Adjusted: ₪${adjustedValue.toLocaleString()}`)
console.log(`Total Impact: +${record.valuation.adjustments?.reduce((sum, adj) => sum + adj.impact, 0)}%`)
```

---

## API Response Examples

### Successful Response
```json
{
  "success": true,
  "result": {
    "records": [
      {
        "_id": 123456,
        "dealAmount": "2500000",
        "dealDate": "2024-01-15",
        "city": "תל אביב-יפו",
        "street": "רוטשילד",
        "houseNumber": "45",
        "area": "95",
        "rooms": "3.5",
        "floor": "3",
        "totalFloors": "5",
        "assetType": "דירה",
        "dealNature": "רגיל",
        "propertyStatus": "משופץ"
      }
    ],
    "total": 150,
    "_links": {
      "start": "...",
      "next": "..."
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "__type": "Validation Error",
    "message": "Invalid resource_id"
  }
}
```

---

## Troubleshooting

### No Transactions Found
**Problem**: API returns 0 transactions
**Solutions**:
1. Try broader city name (e.g., "תל אביב-יפו" not "תל אביב")
2. Remove street filter to get city-wide data
3. Check spelling of city name
4. Increase limit parameter

### Low Confidence Score
**Problem**: Confidence = "low"
**Reasons**:
1. Sample size < 5 transactions
2. High variance in prices (volatile market)
3. Poor data quality (missing fields)

**Solutions**:
1. Expand search (remove street filter)
2. Add manual comparables
3. Document limitations in report

### Data Quality < 60%
**Problem**: Many transactions missing key fields
**Impact**: Less reliable valuation
**Solutions**:
1. Use only complete transactions (filter in code)
2. Supplement with manual research
3. Document data limitations

---

## Security & Compliance

### Data Privacy
- ✅ All data from public government API
- ✅ No PII stored without consent
- ✅ Audit trail for all actions

### Legal Compliance
- ✅ Official government data source
- ✅ Transparent methodology
- ✅ Professional standards adherence
- ✅ Complete audit trail

### Rate Limiting
- Default: 100 transactions per request
- Respectful usage of government API
- No excessive polling

---

## Future Enhancements

### Planned Features
1. **PDF Export** - Professional reports
2. **Batch Processing** - Multiple properties
3. **Historical Trends** - Price over time
4. **Advanced Filters** - Property type, age, etc.
5. **Geographic Analysis** - Heat maps

### API Expansion
1. **Planning Data** (iPlan/Mavat)
2. **Tax Records** (Tax Authority)
3. **GIS Data** (GovMap)

---

## Support & Resources

### Official API Documentation
- [data.gov.il](https://data.gov.il)
- [API Guide](https://data.gov.il/api/3/)

### Internal Documentation
- `/src/lib/dataGovAPI.ts` - API integration
- `/src/lib/appraisalSchema.ts` - Data structures
- `/src/components/DataGovValuation.tsx` - UI component

### Contact
For technical support, contact the development team.

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production Ready ✅
