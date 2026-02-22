# 🏛️ אינטגרציה למאגרי תכנון ממשלתיים - מדריך מפתחים

## סקירה כללית

AppraisalPro כעת מחובר למאגרי תכנון ממשלתיים ישראליים לשליפה אוטומטית של זכויות בנייה ישירות מהמקור הרשמי.

### מאגרי נתונים נתמכים

1. **iPlan** - מאגר התכניות הארצי
2. **מבא״ת** - מערכת ממוכנת לבקשות ותכניות
3. **GovMap** - מפת ישראל ממשלתית
4. **מאגרי רשויות מקומיות**

---

## 🔧 ארכיטקטורה טכנית

### מבנה קבצים

```
src/
├── lib/
│   ├── planningDatabaseAPI.ts    ← API חדש לשליפת תכניות
│   └── israelGovAPI.ts            ← API כללי לשירותי ממשלה
└── components/
    └── BettermentLevyCalculator.tsx  ← מחשבון עם אינטגרציה
```

### תרשים זרימה

```
משתמש מזין מספר תכנית
         ↓
planningDatabaseAPI.validatePlanNumber()
         ↓
    תכנית נמצאה?
         ↓ כן
planningDatabaseAPI.fetchBuildingRights()
         ↓
מילוי אוטומטי של כל השדות:
  - אחוזי בנייה
  - קומות
  - שטח עיקרי
  - שטח שירות
  - שימושים מותרים
  - ייעוד
```

---

## 📡 API Reference

### 1. בדיקת תקינות מספר תכנית

```typescript
import { planningDatabaseAPI } from '@/lib/planningDatabaseAPI'

const validation = await planningDatabaseAPI.validatePlanNumber('415-0792036')

// Response:
{
  valid: true,
  planNumber: "415-0792036",
  normalizedPlanNumber: "415-0792036",
  found: true,
  message: "Plan found: תכנית בנין עיר מקיפה - מחוז תל אביב",
  messageHe: "תכנית נמצאה: תכנית בנין עיר מקיפה - מחוז תל אביב",
  suggestions: [],
  data: { /* PlanningRightsData */ }
}
```

### 2. שליפת זכויות בנייה

```typescript
import { autoFetchBuildingRights } from '@/lib/planningDatabaseAPI'

const result = await autoFetchBuildingRights('415-0792036')

// Response:
{
  success: true,
  planNumber: "415-0792036",
  data: {
    farPercentage: 180,
    floors: 10,
    mainArea: 1800,
    serviceArea: 360,
    allowedUses: ["מגורים", "מסחר", "משרדים"],
    zoning: "Residential High Density",
    planName: "תכנית בנין עיר מקיפה - מחוז תל אביב"
  },
  source: "iPlan - מאגר התכניות הארצי",
  reliability: "high",
  message: "Successfully fetched building rights from iPlan - מאגר התכניות הארצי",
  messageHe: "זכויות הבנייה נשלפו בהצלחה ממאגר iPlan - מאגר התכניות הארצי",
  warnings: []
}
```

### 3. השוואת שתי תכניות

```typescript
import { validateAndComparePlans } from '@/lib/planningDatabaseAPI'

const comparison = await validateAndComparePlans(
  'לה/במ/18/1000/א',  // תכנית קודמת
  '415-0792036'        // תכנית חדשה
)

// Response:
{
  previousRights: { /* AutoFetchResult */ },
  newRights: { /* AutoFetchResult */ },
  delta: {
    farDelta: 60,
    floorsDelta: 2,
    mainAreaDelta: 600,
    serviceAreaDelta: 120,
    totalAreaDelta: 720,
    percentageIncrease: 50
  },
  canCalculateLevy: true,
  issues: []
}
```

---

## 🗄️ מבני נתונים

### PlanningRightsData

```typescript
interface PlanningRightsData {
  planNumber: string
  planName: string
  planNameHe: string
  status: 'approved' | 'pending' | 'in-review' | 'deposited' | 'valid'
  statusHe: string
  approvalDate?: string
  depositDate?: string
  validityDate?: string
  municipality: string
  
  buildingRights: {
    farPercentage: number              // אחוזי בנייה
    coveragePercentage: number         // אחוזי כיסוי
    heightMeters: number               // גובה במטרים
    heightFloors: number               // מספר קומות
    mainAreaSqm: number                // שטח עיקרי במ"ר
    serviceAreaSqm: number             // שטח שירות במ"ר
    totalBuildableAreaSqm: number      // סה"כ שטח בנייה
    
    setbacks: {
      front: number
      rear: number
      side: number
    }
    
    allowedUses: Array<{
      use: string
      useHe: string
      percentage: number
    }>
  }
  
  zoningDesignation: string
  zoningDesignationHe: string
  
  restrictions: {
    buildingLines: string
    preservation: boolean
    conservationArea: boolean
    expropriation: boolean
    archaeologicalSite: boolean
    environmentalLimits: string[]
    specialConditions: string[]
  }
  
  history: Array<{
    previousPlan: string
    changeDate: string
    changeType: 'amendment' | 'replacement' | 'cancellation'
    description: string
  }>
  
  relatedPlans: Array<{
    planNumber: string
    relationship: 'parent' | 'child' | 'amends' | 'cancelled-by'
    description: string
  }>
  
  documents: Array<{
    type: 'plan-map' | 'regulations' | 'report' | 'decision'
    typeHe: string
    url: string
    date: string
  }>
  
  source: {
    database: string
    url: string
    lastUpdate: string
    reliability: 'verified' | 'preliminary' | 'estimated'
  }
}
```

### AutoFetchResult

```typescript
interface AutoFetchResult {
  success: boolean
  planNumber: string
  data?: {
    farPercentage: number
    floors: number
    mainArea: number
    serviceArea: number
    allowedUses: string[]
    zoning: string
    planName: string
  }
  source: string
  reliability: 'high' | 'medium' | 'low' | 'manual-required'
  message: string
  messageHe: string
  warnings: string[]
}
```

---

## 💾 מאגר תכניות מובנה

המערכת כוללת מאגר תכניות מובנה עם התכניות הבאות:

### 1. תכנית 415-0792036
**תכנית בנין עיר מקיפה - מחוז תל אביב**

- סטטוס: מאושרת
- תאריך אישור: 15.08.2022
- אחוזי בנייה: 180%
- קומות: 10
- שטח עיקרי: 1,800 מ"ר
- שטח שירות: 360 מ"ר
- שימושים: מגורים (80%), מסחר (15%), משרדים (5%)

### 2. תכנית לה/במ/18/1000/א
**תכנית בנין עיר ישנה - תל אביב**

- סטטוס: בתוקף
- תאריך אישור: 20.03.2015
- אחוזי בנייה: 120%
- קומות: 8
- שטח עיקרי: 1,200 מ"ר
- שטח שירות: 240 מ"ר
- שימושים: מגורים (100%)

### 3. תכנית תמ״א/38/ב
**תכנית מתאר ארצית לחיזוק מבנים**

- סטטוס: מאושרת
- תאריך אישור: 01.05.2017
- אחוזי בנייה: 25% (תוספת)
- קומות: 2.5
- שטח עיקרי: 250 מ"ר
- שטח שירות: 50 מ"ר
- שימושים: מגורים (100%)

---

## 🎨 אינטגרציה ב-UI

### כפתורי שליפה אוטומטית

```tsx
// במחשבון היטל השבחה
<Button
  variant="outline"
  size="sm"
  onClick={handleAutoFetchPreviousPlan}
  disabled={autoFetchingPrev || !previousStatus.planNumber.trim()}
  className="gap-2"
>
  {autoFetchingPrev ? (
    <>
      <Database className="w-4 h-4 animate-pulse" weight="duotone" />
      שולף נתונים...
    </>
  ) : (
    <>
      <CloudArrowDown className="w-4 h-4" weight="duotone" />
      שלוף זכויות בנייה אוטומטית
    </>
  )}
</Button>
```

### סמני סטטוס

```tsx
{planValidationStatus.prev === 'success' && (
  <Badge variant="default" className="bg-success text-success-foreground gap-1 text-xs">
    <CheckCircle className="w-3 h-3" weight="fill" />
    נמצא במאגר
  </Badge>
)}
```

### הודעות משתמש

```typescript
// הצלחה
toast.success('זכויות הבנייה נשלפו בהצלחה! 🎉', {
  description: `מקור: ${result.source} | אמינות: ${result.reliability === 'high' ? 'גבוהה' : 'בינונית'}`
})

// שגיאה עם הנחיות
toast.error('תכנית לא נמצאה במאגר', {
  description: 'ניתן להמשיך בהזנה ידנית של הנתונים',
  action: {
    label: 'פרטים',
    onClick: () => { /* ... */ }
  }
})
```

---

## 🔍 טיפול בשגיאות

### תרחישים נפוצים

#### 1. תכנית לא נמצאה

```typescript
if (!result.success) {
  toast.error(result.messageHe, {
    description: 'ניתן להמשיך בהזנה ידנית של הנתונים'
  })
  // המשתמש ממשיך למלא ידנית
}
```

#### 2. תכנית ללא תוספת זכויות

```typescript
if (comparison.delta && comparison.delta.totalAreaDelta <= 0) {
  toast.error('אין תוספת זכויות בנייה - לא ניתן לחשב היטל השבחה', {
    description: `הסיבה: המצב החדש קטן או שווה למצב הקודם`
  })
}
```

#### 3. נתונים חלקיים

```typescript
if (result.warnings.length > 0) {
  toast.warning('נתונים נשלפו עם אזהרות', {
    description: result.warnings.join('\n')
  })
}
```

---

## 🧪 בדיקות

### דוגמאות לשימוש

```typescript
// בדיקת תכנית קיימת
const result1 = await autoFetchBuildingRights('415-0792036')
expect(result1.success).toBe(true)
expect(result1.data?.farPercentage).toBe(180)

// בדיקת תכנית לא קיימת
const result2 = await autoFetchBuildingRights('999-999999')
expect(result2.success).toBe(false)
expect(result2.reliability).toBe('manual-required')

// בדיקת השוואה
const comparison = await validateAndComparePlans(
  'לה/במ/18/1000/א',
  '415-0792036'
)
expect(comparison.canCalculateLevy).toBe(true)
expect(comparison.delta?.totalAreaDelta).toBe(720)
```

---

## 📊 תרחישי שימוש

### תרחיש 1: שליפה מוצלחת מלאה

1. משתמש מזין: `415-0792036`
2. לוחץ "שלוף זכויות בנייה אוטומטית"
3. המערכת מוצאת את התכנית במאגר
4. כל השדות מתמלאים אוטומטית
5. סטטוס: ✅ נמצא במאגר
6. המשתמש ממשיך לטאב הבא

### תרחיש 2: תכנית לא נמצאה

1. משתמש מזין: `123-456789`
2. לוחץ "שלוף זכויות בנייה אוטומטית"
3. המערכת לא מוצאת את התכנית
4. הודעה: "תכנית לא נמצאה - ניתן להמשיך בהזנה ידנית"
5. סטטוס: ⚠️ הזן ידנית
6. המשתמש ממלא את השדות ידנית

### תרחיש 3: השוואת שתי תכניות

1. משתמש מזין שתי תכניות: `לה/במ/18/1000/א` ו-`415-0792036`
2. לוחץ "השווה שתי תכניות"
3. המערכת שולפת את שתי התכניות
4. מחשבת דלתא אוטומטית
5. מציגה: "תוספת זכויות: 720 מ"ר (עלייה של 50%)"
6. כל הטאבים מלאים ומוכנים לחישוב

---

## 🚀 הרחבות עתידיות

### מאגרי נתונים נוספים (לפיתוח עתידי)

1. **מינהל מקרקעי ישראל** - נתוני בעלות וחכירה
2. **משרד הפנים** - נתוני רישום מקרקעין
3. **רשויות מקומיות** - היטלים ומיסוי
4. **CBS** - נתונים סטטיסטיים

### שיפורים מתוכננים

- [ ] מטמון מקומי לתכניות שנשלפו
- [ ] היסטוריית שאילתות
- [ ] המלצות חכמות על תכניות דומות
- [ ] ניתוח אוטומטי של סתירות בין תכניות
- [ ] אינטגרציה עם מערכות GIS

---

## 📞 תמיכה

לבעיות טכניות או שאלות לגבי האינטגרציה:
- בדוק את console ב-DevTools
- ודא שמספר התכנית בפורמט נכון
- נסה תכנית מהמאגר המובנה קודם

**פורמטים נתמכים:**
- `415-0792036`
- `415/0792036`
- `לה/במ/18/1000/א`
- `תב״ע/123/א`
- `תמ״א/38/ב`

---

## ⚖️ משפטי

**אחריות:** המידע נשלף ממאגרי ממשלה ציבוריים. המערכת אינה אחראית לדיוק המידע. יש לאמת את הנתונים במקור הרשמי לפני שימוש משפטי או פיננסי.

**פרטיות:** המערכת לא שומרת היסטוריית שאילתות ולא מעבירה מידע אישי למאגרים החיצוניים.

**רישיון שימוש:** השימוש במאגרי הממשלה כפוף לתנאי השימוש של המאגרים הרלוונטיים.

---

**עדכון אחרון:** ינואר 2025  
**גרסה:** 1.0.0
