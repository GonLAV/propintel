# Dev Spec – Appraisal Engine (שמאי מקרקעין)

מסמך זה מתאר *איך לפתח* את מנוע השמאות והמסמכים על בסיס הקוד שכבר קיים.

## מטרות

- מנוע חישוב שמאי שקוף (traceable) עם נוסחאות, צעדים, והנחות.
- Decision Engine שממליץ על שיטה לפי סוג נכס/זמינות נתונים.
- Control Layer שמזהה חריגות ואיכות נתונים (confidence + warnings).
- תבניות מסמך (שומה/חוות דעת) שמרכיבות סעיפים אוטומטית.

## מצב קיים בקוד

- חישובים:
  - שיטת השוואה / שיטת עלות / שיטת היוון: [src/lib/valuationEngine.ts](src/lib/valuationEngine.ts)
- מערכת בדיקה UI: [src/components/ValuationEngineTester.tsx](src/components/ValuationEngineTester.tsx)
- יצוא PDF לתוצאות: [src/lib/pdfExport.ts](src/lib/pdfExport.ts)
- טבלאות מקדמים data-driven (JSON):
  - [src/lib/valuationTables.data.json](src/lib/valuationTables.data.json)
  - wrapper typed exports: [src/lib/valuationTables.ts](src/lib/valuationTables.ts)
- Decision Engine: [src/lib/valuationDecision.ts](src/lib/valuationDecision.ts)

## API מוצע (שכבת Engine)

### 1) Decision

- `recommendValuationMethod(property, context)`
  - קלט: Property + נתונים זמינים (עסקאות נבחרות/שכירות/ערך קרקע וכו')
  - פלט: method מומלץ + requiredInputs + warnings

### 2) Calculation

- `ValuationEngine.calculateComparableSalesApproach(property, comparables)`
- `ValuationEngine.calculateCostApproach(property, landValue, constructionCostPerSqm)`
- `ValuationEngine.calculateIncomeApproach(property, monthlyRent, vacancyRate, operatingExpenseRatio, capitalizationRate)`
- `ValuationEngine.reconcileValuations(results, weights?)` → `hybrid`

### 3) Control Layer

בכל `ValuationResult`:
- `confidence` (0–100)
- `qualityChecks?: ValuationQualityCheck[]`
  - דוגמאות: low sample, high variation, outlier, large adjustment, method divergence

## נוסחאות (התאמה למימוש)

### שיטת ההשוואה

- מחיר מתואם לעסקה:

$$\text{AdjustedPrice} = \text{SalePrice} \times (1 + \Sigma\text{Adjustments})$$

- שווי סופי משוקלל:

$$\text{Value} = \frac{\Sigma(\text{AdjustedPrice}_i \times \text{SimilarityWeight}_i)}{\Sigma\text{SimilarityWeight}_i}$$

### שיטת העלות

- עלות בנייה:

$$\text{BuildingCost} = \text{BuiltArea} \times \text{CostPerSqm}$$

- פחת:

$$\text{Depreciation} = \text{BuildingCost} \times \frac{\text{EffectiveAge}}{\text{EconomicLife}}$$

- שווי:

$$\text{Value} = \text{LandValue} + (\text{BuildingCost} - \text{Depreciation})$$

### שיטת ההיוון

- NOI:

$$\text{NOI} = (\text{MonthlyRent} \times 12) \times (1 - \text{VacancyRate}) \times (1 - \text{OpExRatio})$$

- שווי:

$$\text{Value} = \frac{\text{NOI}}{\text{CapRate}}$$

## טבלאות מקדמים (Calibration)

קובץ מקור: [src/lib/valuationTables.data.json](src/lib/valuationTables.data.json)

- `conditionMultipliers`
- `floor.adjustments`
- `featureValues`
- `location.distanceAdjustments`
- `sizeAdjustment`
- `ageAdjustment`

גישה מומלצת:
- **אין לשנות נוסחאות בקוד** אלא רק לכייל ערכים בקובץ הנתונים.
- כל שינוי בטבלאות צריך להיכנס ל־PR עם rationale ושינויי expected range.

## Document Generator (תכנון)

הפלט כבר קיים כ־PDF של תוצאות המנוע, אבל “שומה מלאה” דורשת:

### Sections
- פרטי שמאי
- מטרת שומה
- זיהוי הנכס
- תיאור פיזי
- תכנון וזכויות
- שוק ועסקאות
- שיטת שומה
- חישובים
- מסקנה
- הסתייגויות
- חתימה

### Design
- Template = רשימת סעיפים + rules להצגה
- כל סעיף מקבל `context` (property + valuation + comparables)
- Output HTML ראשון (ל־print), ואז PDF/Word בהמשך

## MVP לעומת Advanced (יישום מדורג)

### MVP
- יבוא עסקאות (CSV/JSON) ל־comparables
- Decision Engine + 3 שיטות
- Hybrid reconciliation (ידני: מריצים כמה שיטות ואז משלבים)
- Report generation בסיסי

### Advanced
- Residual/extraction לקרקע
- גרסאות למסמכים (Document versioning)
- Workflow אישור: draft → review → locked
- חיבור API למקורות עסקאות/מדדים

## Backlog (הכי חשוב לשלב הבא)

1) שכבת ולידציה ב־zod לקלטים (Property, Comparable, inputs לשיטות)
2) Import pipeline לעסקאות + נרמול נתונים
3) Persistence (DB או KV) לפי הסכימה ב־[DB_SCHEMA.md](DB_SCHEMA.md)
