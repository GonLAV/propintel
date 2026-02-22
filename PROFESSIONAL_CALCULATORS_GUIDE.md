# מערכת מחשבונים מקצועית לשמאות מקרקעין

## 📋 תוכן עניינים

1. [סקירה כללית](#overview)
2. [המחשבונים הזמינים](#calculators)
3. [עקרונות המערכת](#principles)
4. [בקרת איכות ואימות](#validation)
5. [מקורות משפטיים](#sources)
6. [דוגמאות שימוש](#examples)
7. [API Reference](#api)

---

## 🎯 סקירה כללית {#overview}

מערכת מחשבונים מקצועית לשמאי מקרקעין, בנויה על עקרונות של:

- **שקיפות מוחלטת** - כל נוסחה גלויה ומתועדת
- **דיוק מתמטי** - בדיקות רגרסיה אוטומטיות
- **עמידות משפטית** - כל מחשבון מתועד עם מקור רשמי
- **גמישות מקצועית** - יכולת override עם תיעוד

---

## 🧮 המחשבונים הזמינים {#calculators}

### 1. מחשבון התאמות להשוואת עסקאות

**מטרה:** ביצוע התאמות מפורטות בין נכס הנישום לעסקאות השוואה

**קלט:**
- מחיר בסיס (מעסקת השוואה)
- שטח הנכס
- רשימת התאמות (קומה, מצב, תוספות, וכו')

**פלט:**
- מחיר מותאם
- מחיר מותאם למ"ר
- פירוט מלא של כל התאמה (צעד אחר צעד)
- נוסחה מלאה
- נרטיב בעברית לדוח

**דוגמה:**
```typescript
import { AdjustmentCalculator } from '@/lib/calculators'

const result = AdjustmentCalculator.calculateAdjustments(
  2000000,  // מחיר בסיס
  100,      // שטח
  [
    AdjustmentCalculator.createFloorAdjustment(3, true),
    AdjustmentCalculator.createConditionAdjustment('good')
  ]
)

console.log(result.adjustedPrice)      // מחיר מותאם
console.log(result.formula)            // נוסחה מפורטת
console.log(result.narrativeHebrew)    // טקסט לדוח
```

**התאמות סטנדרטיות זמינות:**
- קומה (עם/בלי מעלית)
- מצב פיזי (גרוע / בינוני / טוב / מצוין / משופץ)
- זמן (הצמדה למדד)
- תוספות (חניה, מחסן, מרפסת)

---

### 2. מחשבון ממוצע משוקלל

**מטרה:** חישוב ממוצע משוקלל של עסקאות השוואה על פי קרבה, דמיון, אמינות ועדכניות

**קלט:**
- רשימת עסקאות השוואה (כל אחת עם מחיר, מרחק, דמיון, אמינות, תאריך)
- משקלות מותאמות אישית (אופציונלי)

**פלט:**
- ממוצע משוקלל
- חציון
- טווח (מינימום-מקסימום)
- סטיית תקן
- רמת ביטחון (גבוהה/בינונית/נמוכה)
- פירוט משקל כל עסקה
- נרטיב מפורט

**דוגמה:**
```typescript
import { WeightedAverageCalculator } from '@/lib/calculators'

const comparables = [
  {
    id: '1',
    address: 'רחוב הרצל 10',
    price: 2000000,
    pricePerSqm: 20000,
    area: 100,
    distance: 150,        // מטרים
    similarity: 90,       // אחוזים
    reliability: 95,      // אחוזים
    transactionDate: new Date('2024-01-15')
  },
  // עסקאות נוספות...
]

const result = WeightedAverageCalculator.calculate(comparables)

console.log(result.weightedAverage)     // ממוצע משוקלל
console.log(result.median)              // חציון
console.log(result.confidenceLevel)     // רמת ביטחון
console.log(result.narrativeHebrew)     // טקסט לדוח
```

**ניקוד אוטומטי:**
- **קרבה:** 100מ' = 1.0, 500מ' = 0.7, 2000מ' = 0.3
- **עדכניות:** 3 חודשים = 1.0, שנה = 0.7, שנתיים = 0.5
- **משקלות ברירת מחדל:** קרבה 30%, דמיון 35%, אמינות 20%, עדכניות 15%

---

### 3. מחשבון שיטת העלות

**מטרה:** חישוב שווי לפי עלות בנייה בניכוי פחת ובתוספת ערך קרקע

**קלט:**
- פרמטרי בנייה (סוג, איכות, שטח, קומות)
- פרמטרי פחת (גיל, פחת פיזי/תפקודי/כלכלי)
- ערך קרקע

**פלט:**
- שווי סופי
- עלות בנייה
- סה"כ פחת (מפורט לפי סוגים)
- לוח פחת מפורט לפי שנים
- נוסחה מלאה
- נרטיב

**דוגמה:**
```typescript
import { CostApproachCalculator } from '@/lib/calculators'

const constructionParams = {
  buildingType: 'residential',
  quality: 'standard',
  area: 200,
  floors: 2,
  finishLevel: 'standard'
}

const depreciationParams = {
  buildingAge: 15,
  effectiveAge: 12,
  totalLifespan: 75,
  physicalDeteriorationPercent: 0,
  functionalObsolescencePercent: 5,
  economicObsolescencePercent: 0
}

const landValue = {
  landArea: 300,
  pricePerSqm: 5000,
  totalLandValue: 1500000,
  source: 'עסקאות קרקע באזור',
  valuationDate: new Date()
}

const result = CostApproachCalculator.calculate(
  constructionParams,
  depreciationParams,
  landValue,
  'מחירון דקל 2024'
)

console.log(result.finalValue)              // שווי סופי
console.log(result.depreciationSchedule)    // לוח פחת
console.log(result.narrativeHebrew)         // טקסט לדוח
```

**עלויות בנייה סטנדרטיות (₪/מ"ר):**
- מגורים סטנדרטי: 6,000
- מגורים יוקרה: 12,000
- מסחרי סטנדרטי: 7,000
- תעשייה סטנדרטית: 5,000

---

### 4. מחשבון היוון (נכסים מניבים)

**מטרה:** חישוב שווי נכס מניב לפי הכנסה נטו מתפעול (NOI) ושיעור היוון (Cap Rate)

**קלט:**
- הכנסה שנתית ברוטו
- אחוז פינויים
- הוצאות תפעול מפורטות
- שיעור היוון

**פלט:**
- שווי נכס
- NOI מחושב
- פירוט הוצאות
- ניתוח תרחישים (אופטימי/בסיס/שמרני)
- ניתוח רגישות
- נוסחה ונרטיב

**דוגמה:**
```typescript
import { IncomeCapitalizationCalculator } from '@/lib/calculators'

const incomeParams = {
  grossAnnualIncome: 500000,
  vacancyRate: 5,
  operatingExpenses: 50000,
  propertyTax: 30000,
  insurance: 10000,
  maintenance: 25000,
  management: 15000,
  utilities: 5000,
  otherExpenses: 5000
}

const capRateParams = {
  marketCapRate: 6.0,
  riskAdjustment: 0.5,
  locationAdjustment: -0.2,
  conditionAdjustment: 0,
  finalCapRate: 6.3
}

const result = IncomeCapitalizationCalculator.calculate(
  incomeParams,
  capRateParams
)

console.log(result.propertyValue)           // שווי נכס
console.log(result.netOperatingIncome)      // NOI
console.log(result.scenarios)               // תרחישים
console.log(result.sensitivityAnalysis)     // ניתוח רגישות
```

**מדדים נוספים:**
- GRM (Gross Rent Multiplier)
- DSCR (Debt Service Coverage Ratio)
- Expense Ratio

---

### 5. מחשבון ריבוי יחידות

**מטרה:** פיצול שווי בניין ליחידות בודדות עם איזון אוטומטי

**קלט:**
- שווי בניין כולל
- רשימת יחידות (כל אחת עם שטח, קומה, מצב, תוספות)

**פלט:**
- שווי כל יחידה
- משקל כל יחידה
- איזון סופי (סכום היחידות = שווי הבניין)
- פירוט התאמות לכל יחידה
- טבלה מסודרת
- אימות תקינות

**דוגמה:**
```typescript
import { MultiUnitCalculator } from '@/lib/calculators'

const buildingParams = {
  totalBuildingValue: 10000000,
  totalArea: 800,
  baseValuePerSqm: 12500,
  units: [
    {
      id: '1',
      unitNumber: 'א1',
      floor: 0,
      area: 100,
      rooms: 4,
      hasFrontFacing: true,
      hasBalcony: true,
      balconyArea: 15,
      condition: 'good',
      specificFeatures: []
    },
    {
      id: '2',
      unitNumber: 'א2',
      floor: 1,
      area: 100,
      rooms: 4,
      hasFrontFacing: false,
      hasBalcony: true,
      balconyArea: 12,
      condition: 'good',
      specificFeatures: []
    },
    // יחידות נוספות...
  ]
}

const result = MultiUnitCalculator.calculate(buildingParams)

console.log(result.units)                   // שווי כל יחידה
console.log(result.reconciliation)          // אימות איזון
console.log(MultiUnitCalculator.createAllocationTable(result))  // טבלה
```

**משקלים:**
- קומה: קרקע 0.92, קומה 1 = 1.00, פנטהאוס 1.15
- מצב: גרוע 0.85, טוב 1.00, מצוין 1.10
- חזית: +5%
- מרפסת: +0.1% לכל מ"ר

---

## 🛡️ עקרונות המערכת {#principles}

### 1. שקיפות מוחלטת

**כל חישוב כולל:**
- נוסחה מפורשת
- הצבת ערכים
- תוצאה ביניים
- תוצאה סופית

**אין קופסאות שחורות** - הכל גלוי לשמאי.

---

### 2. בקרת איכות

**בדיקות רגרסיה אוטומטיות:**

כל מחשבון נבדק מול ערכים צפויים ידועים מראש:

```typescript
{
  testId: 'ADJ-002',
  description: 'התאמה בודדת +5%',
  inputData: {
    basePrice: 2000000,
    adjustments: [{ value: 5, type: 'percentage' }]
  },
  expectedOutput: 2100000,
  tolerance: 1
}
```

**אם יש סטייה מעבר לסובלנות → המערכת חוסמת שחרור**.

---

### 3. מקורות מקצועיים

כל נוסחה מתועדת עם:
- מקור משפטי (תקן שמאי, פסיקה)
- תקן מקצועי
- אסמכתא
- תאריך אימות אחרון

**דוגמה:**
```typescript
{
  calculatorId: 'adjustment-floor',
  formulaName: 'התאמת קומה',
  legalSource: 'תקן שמאי 19',
  professionalStandard: 'סעיף 4.2 - התאמות למיקום הנכס',
  reference: 'מכון השמאים בישראל, מהדורה 2023',
  lastVerified: new Date('2024-01-01')
}
```

---

### 4. גמישות מקצועית

**Override מבוקר:**

שמאי יכול לעקוף חישוב, אך:
- חובה להזין נימוק
- נרשם בלוג אוטומטית
- מתועד בדוח

זה מגן משפטית ומאפשר שיקול דעת מקצועי.

---

## ✅ בקרת איכות ואימות {#validation}

### הרצת בדיקות

```typescript
import { CalculatorValidationEngine } from '@/lib/calculators'

// הרצת כל הבדיקות
const results = CalculatorValidationEngine.runAllTests()

// הצגת דוח
const report = CalculatorValidationEngine.createValidationReport(results)
console.log(report)
```

### תוצאה לדוגמה

```
דוח בדיקות מחשבונים
====================================
תאריך: 15/01/2024 14:30
סה"כ בדיקות: 6
בדיקות שעברו: 6 ✓
בדיקות שנכשלו: 0 ✗

בדיקה: ADJ-001
סטטוס: ✓ הבדיקה עברה בהצלחה
ערך צפוי: 2,000,000
ערך בפועל: 2,000,000

...

✓ כל הבדיקות עברו בהצלחה. המחשבונים תקינים.
```

### Audit Log

כל חישוב נרשם אוטומטית:

```typescript
CalculatorValidationEngine.logCalculation({
  timestamp: new Date(),
  calculatorName: 'AdjustmentCalculator',
  operation: 'calculate',
  inputs: { basePrice: 2000000, area: 100 },
  outputs: { adjustedPrice: 2100000 },
  userId: 'user123',
  notes: 'שומה לבנק הפועלים'
})

// שליפת לוגים
const logs = CalculatorValidationEngine.getAuditLogs('AdjustmentCalculator')
```

---

## 📚 מקורות משפטיים {#sources}

### רשימת מקורות מלאה

```typescript
import { CalculatorSourceRegistry } from '@/lib/calculators'

// קבלת כל המקורות
const sources = CalculatorSourceRegistry.getAllSources()

// קבלת מקור ספציפי
const source = CalculatorSourceRegistry.getSource('adjustment-floor')

// ציטוט מלא
const citation = CalculatorSourceRegistry.createSourceCitation('adjustment-floor')
```

### מסמך מקורות מלא

```typescript
const doc = CalculatorSourceRegistry.createFullSourcesDocument()
console.log(doc)
```

**פלט:**
```
מסמך מקורות ונוסחאות מחשבונים
====================================
נכון לתאריך: 15/01/2024

כל המחשבונים במערכת מבוססים על מקורות מקצועיים מוכרים ותקנים רשמיים.

מחשבון: התאמת קומה
מזהה: adjustment-floor
מקור משפטי: תקן שמאי 19
תקן מקצועי: סעיף 4.2 - התאמות למיקום הנכס
אסמכתא: מכון השמאים בישראל, מהדורה 2023
תאריך אימות: 01/01/2024
מאומת על ידי: מערכת AppraisalPro
...
```

---

## 💡 דוגמאות שימוש {#examples}

### דוגמה מלאה: שומת דירה

```typescript
import {
  AdjustmentCalculator,
  WeightedAverageCalculator,
  type ComparableProperty
} from '@/lib/calculators'

// שלב 1: איסוף עסקאות השוואה
const comparables: ComparableProperty[] = [
  {
    id: '1',
    address: 'רחוב הרצל 10, תל אביב',
    price: 2100000,
    pricePerSqm: 21000,
    area: 100,
    distance: 150,
    similarity: 90,
    reliability: 95,
    transactionDate: new Date('2024-01-10')
  },
  {
    id: '2',
    address: 'רחוב ביאליק 5, תל אביב',
    price: 1950000,
    pricePerSqm: 19500,
    area: 100,
    distance: 300,
    similarity: 85,
    reliability: 90,
    transactionDate: new Date('2023-12-15')
  },
  {
    id: '3',
    address: 'רחוב דיזנגוף 20, תל אביב',
    price: 2200000,
    pricePerSqm: 22000,
    area: 100,
    distance: 500,
    similarity: 80,
    reliability: 85,
    transactionDate: new Date('2023-11-20')
  }
]

// שלב 2: התאמת כל עסקה
const adjustedComparables = comparables.map(comp => {
  const adjustments = [
    AdjustmentCalculator.createFloorAdjustment(3, true),
    AdjustmentCalculator.createConditionAdjustment('good'),
    AdjustmentCalculator.createTimeAdjustment(
      comp.transactionDate,
      new Date(),
      2.5  // שינוי מדד 2.5%
    )
  ]

  const adjusted = AdjustmentCalculator.calculateAdjustments(
    comp.price,
    comp.area,
    adjustments
  )

  return {
    ...comp,
    adjustedPrice: adjusted.adjustedPrice,
    adjustedPricePerSqm: adjusted.adjustedPricePerSqm
  }
})

// שלב 3: חישוב ממוצע משוקלל
const weightedResult = WeightedAverageCalculator.calculate(adjustedComparables)

console.log('=== תוצאות שומה ===')
console.log(`ממוצע משוקלל: ${weightedResult.weightedAverage.toLocaleString('he-IL')} ₪`)
console.log(`חציון: ${weightedResult.median.toLocaleString('he-IL')} ₪`)
console.log(`טווח: ${weightedResult.min.toLocaleString('he-IL')} - ${weightedResult.max.toLocaleString('he-IL')} ₪`)
console.log(`רמת ביטחון: ${weightedResult.confidenceLevel}`)
console.log('\n' + weightedResult.narrativeHebrew)
```

---

## 🔧 API Reference {#api}

### AdjustmentCalculator

#### `calculateAdjustments(basePrice, area, adjustments)`

חישוב התאמות להשוואת עסקאות.

**Parameters:**
- `basePrice: number` - מחיר הבסיס מעסקת ההשוואה
- `area: number` - שטח הנכס במ"ר
- `adjustments: AdjustmentFactor[]` - רשימת התאמות

**Returns:** `AdjustmentCalculation`

#### `createFloorAdjustment(floor, hasElevator)`

יצירת התאמת קומה אוטומטית.

**Parameters:**
- `floor: number` - מספר קומה
- `hasElevator: boolean` - האם יש מעלית

**Returns:** `AdjustmentFactor`

#### `createConditionAdjustment(condition)`

יצירת התאמת מצב פיזי.

**Parameters:**
- `condition: 'poor' | 'fair' | 'good' | 'veryGood' | 'excellent' | 'renovated'`

**Returns:** `AdjustmentFactor`

#### `createTimeAdjustment(transactionDate, valuationDate, indexChange)`

יצירת התאמת זמן (הצמדה למדד).

**Parameters:**
- `transactionDate: Date` - תאריך העסקה
- `valuationDate: Date` - תאריך השומה
- `indexChange: number` - שינוי מדד באחוזים

**Returns:** `AdjustmentFactor`

---

### WeightedAverageCalculator

#### `calculate(comparables, customWeights?)`

חישוב ממוצע משוקלל של עסקאות.

**Parameters:**
- `comparables: ComparableProperty[]` - רשימת עסקאות השוואה
- `customWeights?: Partial<WeightingFactor>` - משקלות מותאמות אישית (אופציונלי)

**Returns:** `WeightedAverageResult`

#### `createDetailedBreakdown(result)`

יצירת פירוט מפורט של השקלול.

**Parameters:**
- `result: WeightedAverageResult` - תוצאת חישוב

**Returns:** `string` - טקסט מפורט

---

### CostApproachCalculator

#### `calculate(constructionParams, depreciationParams, landValue, costSource?)`

חישוב שווי לפי שיטת העלות.

**Parameters:**
- `constructionParams: ConstructionCostParams` - פרמטרי בנייה
- `depreciationParams: DepreciationParams` - פרמטרי פחת
- `landValue: LandValue` - ערך קרקע
- `costSource?: string` - מקור המחירון (אופציונלי)

**Returns:** `CostApproachResult`

#### `createDepreciationReport(schedule)`

יצירת לוח פחת מפורט.

**Parameters:**
- `schedule: DepreciationBreakdown[]` - לוח פחת

**Returns:** `string` - דוח טקסט

---

### IncomeCapitalizationCalculator

#### `calculate(incomeParams, capRateParams)`

חישוב שווי לפי שיטת היוון.

**Parameters:**
- `incomeParams: IncomeParams` - פרמטרי הכנסה והוצאות
- `capRateParams: CapRateParams` - פרמטרי שיעור היוון

**Returns:** `IncomeCapitalizationResult`

#### `calculateCapRate(noi, propertyValue)`

חישוב Cap Rate מתוך NOI ושווי.

**Parameters:**
- `noi: number` - הכנסה נטו שנתית
- `propertyValue: number` - שווי הנכס

**Returns:** `number` - Cap Rate באחוזים

#### `createExpenseReport(breakdown)`

יצירת דוח הוצאות מפורט.

**Parameters:**
- `breakdown: ExpenseBreakdown[]` - פירוט הוצאות

**Returns:** `string` - דוח טקסט

---

### MultiUnitCalculator

#### `calculate(params)`

פיצול שווי בניין ליחידות.

**Parameters:**
- `params: BuildingParams` - פרמטרי בניין ויחידות

**Returns:** `MultiUnitResult`

#### `createAllocationTable(result)`

יצירת טבלת פיצול מסודרת.

**Parameters:**
- `result: MultiUnitResult` - תוצאת חישוב

**Returns:** `string` - טבלה בפורמט טקסט

#### `validateAllocation(result)`

אימות תקינות הפיצול.

**Parameters:**
- `result: MultiUnitResult` - תוצאת חישוב

**Returns:** `{ isValid: boolean, errors: string[], warnings: string[] }`

---

### CalculatorValidationEngine

#### `runAllTests()`

הרצת כל בדיקות הרגרסיה.

**Returns:** `ValidationResult[]`

#### `createValidationReport(results)`

יצירת דוח בדיקות.

**Parameters:**
- `results: ValidationResult[]` - תוצאות בדיקות

**Returns:** `string` - דוח טקסט

#### `logCalculation(log)`

רישום חישוב ללוג.

**Parameters:**
- `log: CalculatorAuditLog` - פרטי החישוב

**Returns:** `void`

#### `getAuditLogs(calculatorName?)`

שליפת לוגים.

**Parameters:**
- `calculatorName?: string` - סינון לפי מחשבון (אופציונלי)

**Returns:** `CalculatorAuditLog[]`

---

### CalculatorSourceRegistry

#### `getSource(calculatorId)`

קבלת מקור משפטי למחשבון.

**Parameters:**
- `calculatorId: string` - מזהה המחשבון

**Returns:** `CalculatorSource | undefined`

#### `getAllSources()`

קבלת כל המקורות.

**Returns:** `CalculatorSource[]`

#### `createSourceCitation(calculatorId)`

יצירת ציטוט מלא.

**Parameters:**
- `calculatorId: string` - מזהה המחשבון

**Returns:** `string` - ציטוט בפורמט טקסט

#### `createFullSourcesDocument()`

יצירת מסמך מקורות מלא.

**Returns:** `string` - מסמך בפורמט טקסט

---

## 🚀 הצעדים הבאים

### שילוב בדוחות PDF

המחשבונים מחזירים נרטיב בעברית מוכן להכללה בדוחות:

```typescript
const result = AdjustmentCalculator.calculateAdjustments(...)
const narrative = result.narrativeHebrew  // טקסט מוכן לדוח
```

### יצוא ל-Excel

כל התוצאות ניתנות ליצוא:

```typescript
const breakdown = result.breakdown
// המרה לפורמט Excel/CSV
```

### הרחבת מחשבונים

ניתן להוסיף מחשבונים נוספים:
- מס שבח
- היטל השבחה
- זכויות בנייה
- שטחים (תקן 9)

---

## 📞 תמיכה

לשאלות או בעיות:
- GitHub Issues
- תיעוד API
- דוגמאות נוספות במאגר

---

**גרסה:** 1.0.0  
**עדכון אחרון:** ינואר 2024  
**רישיון:** MIT
