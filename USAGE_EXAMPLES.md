# דוגמאות שימוש - אינטגרציה עם iPlan ומבא"ת

## דוגמאות גוש/חלקה אמיתיים לבדיקה

### תל אביב
```
גוש: 6157
חלקה: 42
כתובת: רחוב דיזנגוף 50, תל אביב-יפו
```

```
גוש: 7011
חלקה: 28
כתובת: רחוב הרצל 10, תל אביב-יפו
```

### ירושלים
```
גוש: 30073
חלקה: 15
כתובת: רחוב יפו 97, ירושלים
```

### חיפה
```
גוש: 10950
חלקה: 12
כתובת: שדרות בן גוריון 5, חיפה
```

### רמלה
```
גוש: 4123
חלקה: 67
כתובת: רחוב הרצל 20, רמלה
```

---

## דוגמאות מספרי תכניות

### תכניות מרכזיות
- `415-0792036` - רמלה (תכנית עדכנית)
- `תא/2650` - תל אביב תכנית מתאר
- `לה/במ/18/1000/א` - תכנית אזורית

---

## דוגמאות קוד

### 1. שליפה בסיסית

```typescript
import { unifiedGovAPI } from '@/lib/unifiedGovAPI'

// שליפת זכויות בנייה
const data = await unifiedGovAPI.fetchBuildingRights('6157', '42')

console.log(data.currentRights.buildingPercentage) // 200
console.log(data.currentRights.maxFloors)          // 5
console.log(data.currentRights.mainUse)            // "מגורים"
```

### 2. שימוש בתוצאות

```typescript
const data = await unifiedGovAPI.fetchBuildingRights('6157', '42', 'רחוב הרצל 10, תל אביב')

// בדיקת איכות נתונים
if (data.dataQuality === 'low') {
  console.warn('איכות נתונים נמוכה - המשך בזהירות')
}

// בדיקת עבירות בנייה
if (data.legalStatus.hasViolations) {
  console.error(`נמצאו ${data.legalStatus.violationCount} עבירות בנייה!`)
  data.mavatData.violations.forEach(v => {
    console.log(`- ${v.type}: ${v.status} (חומרה: ${v.severity})`)
  })
}

// בדיקת היתרים פעילים
if (data.legalStatus.hasActivePermits) {
  console.log(`נמצאו ${data.legalStatus.permitCount} היתרים פעילים`)
  data.mavatData.permits.forEach(p => {
    console.log(`- ${p.permitNumber}: ${p.permitType} (${p.status})`)
  })
}

// תכניות חלות
if (data.iPlanData) {
  console.log('תכניות חלות:')
  data.iPlanData.applicablePlans.forEach(plan => {
    console.log(`- ${plan.planNumber}: ${plan.planName}`)
    console.log(`  סטטוס: ${plan.planStatus}`)
    if (plan.buildingPercentage) {
      console.log(`  אחוזי בנייה: ${plan.buildingPercentage}%`)
    }
  })
}
```

### 3. יצירת דוח טקסט

```typescript
const report = await unifiedGovAPI.generateBuildingRightsReport(
  '6157', 
  '42', 
  'רחוב הרצל 10, תל אביב'
)

console.log(report)
// מדפיס דוח מפורט בעברית עם כל המידע
```

### 4. בדיקת חיבור

```typescript
const status = await unifiedGovAPI.testAllConnections()

if (!status.overall) {
  console.error('אין חיבור לשירותים ממשלתיים')
  console.log(`iPlan: ${status.iPlan ? '✓' : '✗'}`)
  console.log(`Mavat: ${status.mavat ? '✓' : '✗'}`)
}
```

### 5. שימוש עם try/catch

```typescript
try {
  const data = await unifiedGovAPI.fetchBuildingRights('6157', '42')
  
  // עבוד עם הנתונים
  console.log('זכויות בנייה:', data.currentRights)
  
} catch (error) {
  console.error('שגיאה בשליפת נתונים:', error)
  // חזור לנתונים מקומיים או הצג הודעת שגיאה למשתמש
}
```

### 6. שימוש ישיר ב-iPlan API

```typescript
import { iPlanAPI } from '@/lib/iPlanAPI'

// שליפה ישירה מ-iPlan
const parcelData = await iPlanAPI.fetchParcelData('6157', '42')

if (parcelData) {
  console.log('תכניות חלות:', parcelData.applicablePlans.length)
  
  parcelData.applicablePlans.forEach(plan => {
    console.log(plan.planNumber, plan.buildingPercentage)
  })
}

// חיפוש תכנית ספציפית
const plan = await iPlanAPI.fetchPlanByNumber('415-0792036')
if (plan) {
  console.log('נמצאה תכנית:', plan.planName)
  console.log('זכויות:', plan.buildingPercentage, '%')
}
```

### 7. שימוש ישיר ב-Mavat API

```typescript
import { mavatAPI } from '@/lib/mavatAPI'

// חיפוש היתרים
const permits = await mavatAPI.searchPermitsByAddress({
  gush: '6157',
  helka: '42'
})

console.log(`נמצאו ${permits.length} היתרים`)

permits.forEach(permit => {
  console.log(`היתר ${permit.permitNumber}:`)
  console.log(`  סטטוס: ${permit.status}`)
  console.log(`  שטח: ${permit.plannedArea} מ"ר`)
})

// חיפוש עבירות
const violations = await mavatAPI.searchViolations({
  city: 'תל אביב-יפו',
  street: 'דיזנגוף',
  houseNumber: '50'
})

if (violations.length > 0) {
  console.warn(`נמצאו ${violations.length} עבירות בנייה!`)
}
```

---

## טיפים לשימוש

### 1. תמיד בדוק איכות נתונים
```typescript
if (data.dataQuality === 'high') {
  // נתונים מלאים ואמינים
} else if (data.dataQuality === 'medium') {
  // נתונים חלקיים - המשך בזהירות
} else {
  // נתונים דלים - שקול מקורות נוספים
}
```

### 2. השתמש במקורות כהתייחסות
```typescript
console.log('מקורות נתונים:', data.sources)
// ['iPlan', 'Mavat-Permits', 'Mavat-Violations']

if (!data.sources.includes('iPlan')) {
  console.warn('לא נמצאו נתוני iPlan - ייתכן שהחלקה לא קיימת')
}
```

### 3. טפל בשגיאות בחן
```typescript
try {
  const data = await unifiedGovAPI.fetchBuildingRights(gush, helka)
  
  if (data.sources.length === 0) {
    // לא נמצאו נתונים, אבל אין שגיאה טכנית
    showWarning('לא נמצאו נתונים עבור גוש/חלקה זה')
  } else {
    processData(data)
  }
  
} catch (error) {
  // שגיאה טכנית - בעיית רשת, timeout וכו'
  showError('שגיאה בחיבור לשירותים הממשלתיים')
}
```

### 4. חכה לתוצאות
```typescript
// הצג אינדיקטור טעינה
setLoading(true)

try {
  const data = await unifiedGovAPI.fetchBuildingRights(gush, helka)
  setResults(data)
} finally {
  setLoading(false)
}
```

---

## שאלות נפוצות

### ש: כמה זמן לוקח שאילתה?
**ת:** בדרך כלל 3-5 שניות. iPlan + Mavat יחד.

### ש: האם צריך מפתח API?
**ת:** לא! השירותים ציבוריים וחינמיים.

### ש: מה קורה אם השירות לא זמין?
**ת:** המערכת תחזיר נתונים חלקיים או תודיע שלא נמצאו נתונים.

### ש: האם אפשר לשמור תוצאות?
**ת:** כן, אפשר לשמור ב-useKV או לייצא לקובץ.

### ש: איך יודעים אם הנתונים עדכניים?
**ת:** שדה `lastUpdate` מציין מתי הנתונים נשלפו. iPlan/Mavat מתעדכנים יומית.

---

## בעיות נפוצות ופתרונות

### "לא נמצאו נתונים"
- ✅ בדוק שמספרי גוש/חלקה נכונים
- ✅ נסה להוסיף כתובת
- ✅ בדוק ב-iPlan ידנית שהחלקה קיימת

### "שגיאת רשת"
- ✅ בדוק חיבור לאינטרנט
- ✅ נסה שוב (ייתכן עומס זמני)
- ✅ בדוק אם השירותים הממשלתיים במתוזקה

### "זמן קצוב"
- ✅ זה נורמלי לפעמים - פשוט נסה שוב
- ✅ בדוק שהחלקה לא מורכבת מדי

---

*לתיעוד מלא ראה: `IPLAN_MAVAT_INTEGRATION.md`*
