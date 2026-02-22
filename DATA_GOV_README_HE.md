# 🇮🇱 Data.gov.il - שמאות אמיתית וממשלתית

## מה זה?

מערכת שמאות מקצועית שמתחברת **ישירות** ל-API הרשמי של data.gov.il ושולפת עסקאות נדל"ן אמיתיות מרשם המקרקעין הממשלתי.

**לא mock. לא סימולציה. נתונים אמיתיים מהממשלה.**

---

## איך זה עובד?

### 1️⃣ פונקציית API לוקאלית
```typescript
// קוד פשוט שקורא ישירות ל-API הממשלתי
const transactions = await fetchTransactionsFromDataGov({
  city: "תל אביב-יפו",
  street: "רוטשילד",  // אופציונלי
  limit: 100
})
```

**API Endpoint האמיתי:**
```
https://data.gov.il/api/3/action/datastore_search
Resource ID: 8f714b7f-c35c-4b40-a0e7-547b675eee0e
```

### 2️⃣ ניקוי ואיחוד נתונים
```typescript
// מנקה נתונים שגויים ומנרמל ערכים
const cleanTransactions = normalizeTransactions(rawData)

// כללי ניקוי:
// ✅ מסיר רשומות ללא מחיר או שטח
// ✅ מסיר מחירים לא הגיוניים (<₪1k או >₪200k למ"ר)
// ✅ מנרמל ערכים מסטרינג למספר
// ✅ יוצר ID ייחודי לכל עסקה
```

**לפני/אחרי:**
```
Raw:   150 עסקאות מה-API
        ↓ ניקוי
Clean: 105 עסקאות תקינות ✅
```

### 3️⃣ חישוב שמאות מקצועי
```typescript
const valuation = calculateBasicValuation(cleanTransactions, 95)

// מה קורה פה?
// 1. שולף מחיר למ"ר מכל עסקה
// 2. מחשב MEDIAN (לא ממוצע!) - עמיד בפני ערכים קיצוניים
// 3. מחשב סטיית תקן
// 4. קובע טווח ערכים (median ± 1σ)
// 5. מחשב רמת ודאות (low/medium/high)
```

**למה MEDIAN ולא ממוצע?**
```
מחירים: [20k, 22k, 23k, 24k, 100k]  ← ערך קיצוני אחד
ממוצע:  37.8k ❌ (גבוה מדי!)
חציון:  23k   ✅ (נכון!)
```

### 4️⃣ Schema מובנה לשמירה
```typescript
const appraisalRecord = createAppraisalRecord({
  propertyId: "prop_123",
  property: {
    city: "תל אביב-יפו",
    street: "רוטשילד",
    area: 95,
    rooms: 3.5,
    floor: 3
  },
  marketData: {
    source: 'data.gov.il',  // ✅ ממשלתי
    sampleSize: 105,
    avgPricePerSqm: 25000,
    medianPricePerSqm: 24500,
    dataQuality: 85,  // %
    transactions: cleanTransactions
  },
  valuation: {
    estimatedValue: 2327500,  // ₪
    pricePerSqm: 24500,
    valueRange: { min: 2200000, max: 2450000 },
    confidence: 'high',
    method: 'comparative'
  }
})
```

**יתרונות Schema:**
- ✅ שקיפות מלאה - כל נתון מתועד
- ✅ Audit Trail - כל שינוי נרשם
- ✅ ניתן לביקורת - כל החישובים גלויים
- ✅ תקני משפטי - מתאים לדוחות רשמיים

### 5️⃣ Prompt AI מקצועי
```typescript
const prompt = generateAppraisalPrompt({
  propertyDetails: { city, street, area, rooms, floor },
  transactions: cleanTransactions,
  valuationResult: valuation
})

const analysis = await window.spark.llm(prompt, 'gpt-4o')
```

**Prompt זה לא צעצוע. זה prompt שמאי אמיתי:**

```
אתה שמאי מקרקעין מוסמך בישראל עם 15 שנות ניסיון.

כללים חשובים:
❌ אל תשתמש בידע חיצוני
❌ אל תנחש מחירים
✅ הסבר כל שלב
✅ ציין מגבלות

נכס:
- כתובת: רוטשילד 45, תל אביב-יפו
- שטח: 95 מ"ר
- חדרים: 3.5
- קומה: 3

עסקאות להשוואה (105 עסקאות מ-data.gov.il):
[רשימת 10 העסקאות הטובות ביותר עם כל הפרטים]

ניתוח סטטיסטי:
- הערכת שווי (חציון): ₪2,327,500
- מחיר למ"ר (חציון): ₪24,500
- טווח: ₪2,200,000 - ₪2,450,000
- רמת ודאות: גבוהה

החזר:
1. הערכת שווי סופית + נימוק
2. מחיר למ"ר מומלץ
3. התאמות נדרשות (קומה, מצב וכו')
4. רמת ודאות ולמה
5. המלצות להמשך
```

---

## איך משתמשים?

### דרך ה-UI
1. לך ל: **סיידבר → שומות → 🇮🇱 Data.gov.il - שמאות ממשלתית**
2. מלא פרטים:
   - עיר (חובה)
   - רחוב (אופציונלי)
   - שטח (חובה)
   - חדרים/קומה (אופציונלי)
3. לחץ **"שלוף נתונים וחשב שומה"**
4. המתן 5-10 שניות ⏳
5. צפה בתוצאות ב-4 טאבים:
   - **פרטי נכס** - טופס הזנה
   - **תוצאות** - הערכת שווי + פירוט
   - **עסקאות** - כל העסקאות מ-data.gov.il
   - **ניתוח AI** - ניתוח מקצועי בעברית
6. אופציונלי: לחץ **"צור ניתוח AI מקצועי"**
7. ייצא ל-CSV אם צריך

### דרך קוד
```typescript
import { performCompleteValuation } from '@/lib/dataGovAPI'
import { createAppraisalRecord } from '@/lib/appraisalSchema'

// 1. הרץ שמאות מלאה
const result = await performCompleteValuation({
  city: 'תל אביב-יפו',
  street: 'רוטשילד',
  targetArea: 95
})

// 2. צור רשומת שמאות
const record = createAppraisalRecord({
  propertyId: 'prop_123',
  property: { city: 'תל אביב-יפו', street: 'רוטשילד', area: 95 },
  marketData: {
    source: 'data.gov.il',
    transactions: result.transactions,
    sampleSize: result.transactions.length,
    avgPricePerSqm: 25000,
    medianPricePerSqm: 24500,
    dataQuality: 85
  },
  valuation: result.valuation
})

// 3. הוסף ניתוח AI
const prompt = generateAppraisalPrompt({ ... })
const analysis = await window.spark.llm(prompt, 'gpt-4o')
const finalRecord = addAIAnalysis(record, analysis, 'system')

console.log(finalRecord)
```

---

## מה הרווחת?

### ✅ אין תלות בענן
- הכל רץ בדפדפן
- אין צורך ב-Azure/AWS/etc
- אין עלויות חודשיות

### ✅ הכל שקוף
- רואים את כל העסקאות
- רואים את החישובים
- רואים את המתודולוגיה
- רואים את ה-Audit Trail

### ✅ מוכן לגדילה
- Schema מובנה
- Audit Trail מובנה
- Export ל-CSV/JSON
- קל להוסיף PDF

### ✅ לגיטימי ומקצועי
- נתונים ממשלתיים
- מתודולוגיה שמאית תקנית
- ניתן לביקורת
- מתאים לדוחות רשמיים

---

## קבצים חשובים

```
/src/lib/dataGovAPI.ts          - אינטגרציה עם data.gov.il
/src/lib/appraisalSchema.ts     - Schema + Audit Trail
/src/components/DataGovValuation.tsx  - UI Component
/DATA_GOV_INTEGRATION.md        - דוקומנטציה מלאה באנגלית
```

---

## דוגמאות תוצאה

### Valuation Result
```json
{
  "estimatedValue": 2327500,
  "pricePerSqm": 24500,
  "valueRange": {
    "min": 2200000,
    "max": 2450000
  },
  "sampleSize": 105,
  "confidence": "high",
  "method": "comparative",
  "dataQuality": 85
}
```

### Appraisal Record (קיצור)
```json
{
  "id": "appraisal_1234567890_abc123",
  "status": "completed",
  "property": {
    "city": "תל אביב-יפו",
    "street": "רוטשילד",
    "area": 95,
    "rooms": 3.5,
    "floor": 3
  },
  "marketData": {
    "source": "data.gov.il",
    "sampleSize": 105,
    "dataQuality": 85
  },
  "valuation": {
    "estimatedValue": 2327500,
    "confidence": "high",
    "aiAnalysis": "ניתוח מקצועי ב-300-500 מילים..."
  },
  "auditTrail": [
    { "timestamp": "2024-01-15T10:30:00Z", "action": "created", "user": "system" },
    { "timestamp": "2024-01-15T10:35:00Z", "action": "ai_analysis_added", "user": "system" }
  ]
}
```

---

## Troubleshooting

### לא נמצאו עסקאות
**פתרון:**
1. נסה בלי שם רחוב (רק עיר)
2. בדוק איות העיר
3. נסה שם עיר מלא ("תל אביב-יפו" לא "תל אביב")

### רמת ודאות נמוכה
**סיבות:**
- פחות מ-5 עסקאות
- שונות גבוהה במחירים
- איכות נתונים נמוכה

**פתרון:**
- הרחב חיפוש (הסר רחוב)
- הוסף עסקאות ידניות
- תעד מגבלות בדוח

---

## הבא בתור?

### מומלץ להוסיף:
1. **PDF Export** - דוחות מקצועיים
2. **Batch Valuation** - כמה נכסים בבת אחת
3. **Historical Trends** - מחירים לאורך זמן
4. **Heat Maps** - מפות חום גיאוגרפיות

---

**גרסה:** 1.0.0
**סטטוס:** ✅ מוכן לשימוש
**תאריך:** ינואר 2024
