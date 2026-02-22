# אינטגרציה אמיתית ל-iPlan ומבא"ת
## Real Israeli Government API Integration

### 📋 סקירה כללית

המערכת כוללת כעת **חיבור אמיתי ישיר** לשני מקורות הנתונים הממשלתיים העיקריים בישראל:

1. **iPlan (מינהל התכנון)** - תכניות בניין עיר וזכויות בנייה
2. **Mavat (מבא"ת)** - מאגר מידע ארצי תכנוני - היתרי בנייה ועבירות

---

## 🎯 יכולות המערכת

### שליפה אוטומטית של נתונים אמיתיים:

✅ **זכויות בנייה עדכניות** - אחוזי בנייה, קומות, גובה, שימושים
✅ **תכניות חלות על החלקה** - כל התוכניות הרלוונטיות מ-iPlan
✅ **היתרי בנייה** - היתרים קיימים, פעילים ומבוטלים מ-Mavat
✅ **עבירות בנייה** - עבירות פתוחות וסגורות
✅ **סטטוס משפטי** - שימור, הפקעה, מגבלות
✅ **מטא-נתונים** - תאריכי אישור, סטטוס תכניות

---

## 🏗️ ארכיטקטורה טכנית

### מבנה הקוד:

```
src/lib/
├── iPlanAPI.ts              # חיבור ישיר ל-iPlan (ArcGIS REST Services)
├── mavatAPI.ts              # חיבור ישיר למבא"ת (OpenData API)
└── unifiedGovAPI.ts         # מודול מאחד המשלב את שני המקורות

src/components/
└── RealBuildingRightsViewer.tsx  # UI לשליפה והצגת נתונים
```

### מחלקות API עיקריות:

#### 1. `iPlanAPI` - חיבור ל-iPlan
```typescript
class IPlanRealAPI {
  // שליפת נתוני חלקה (גוש/חלקה)
  fetchParcelData(gush: string, helka: string): Promise<IPlanParcelData>
  
  // חיפוש לפי מספר תכנית
  fetchPlanByNumber(planNumber: string): Promise<IPlanBuildingRights>
  
  // בדיקת זמינות שירות
  testConnection(): Promise<boolean>
}
```

**נקודות קצה (Endpoints):**
- `https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/Cadastre/MapServer` - גושים וחלקות
- `https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/Plans/MapServer` - תכניות
- `https://ags.iplan.gov.il/arcgis/rest/services/PlanningPublic/BuildingRights/MapServer` - זכויות בנייה

#### 2. `mavatAPI` - חיבור למבא"ת
```typescript
class MavatRealAPI {
  // חיפוש היתרים לפי כתובת/גוש-חלקה
  searchPermitsByAddress(params: MavatSearchParams): Promise<MavatBuildingPermit[]>
  
  // שליפת היתר לפי מספר
  getPermitByNumber(permitNumber: string): Promise<MavatBuildingPermit>
  
  // שליפת עבירות בנייה
  searchViolations(params: MavatSearchParams): Promise<MavatViolation[]>
  
  // בדיקת זמינות שירות
  testConnection(): Promise<boolean>
}
```

**נקודות קצה (Endpoints):**
- `https://mavat.moin.gov.il/MavatPS/OpenData/Permit` - היתרי בנייה
- `https://mavat.moin.gov.il/MavatPS/OpenData/Violation` - עבירות בנייה

#### 3. `unifiedGovAPI` - מודול מאחד
```typescript
class UnifiedGovDataAPI {
  // שליפה מאוחדת מכל המקורות
  fetchBuildingRights(gush: string, helka: string, address?: string): 
    Promise<UnifiedBuildingRights>
  
  // שליפה לפי מספר תכנית
  fetchByPlanNumber(planNumber: string): Promise<{plan, relatedPermits}>
  
  // בדיקת זמינות כל השירותים
  testAllConnections(): Promise<{iPlan: boolean, mavat: boolean, overall: boolean}>
  
  // יצירת דוח מפורט
  generateBuildingRightsReport(gush: string, helka: string): Promise<string>
}
```

---

## 💻 איך להשתמש במערכת

### בממשק המשתמש:

1. **ניווט:** פתח את התפריט הצדדי → **🚀 טכנולוגיות מתקדמות** → **זכויות בנייה אמיתיות**

2. **חיפוש לפי גוש/חלקה:**
   - הזן מספר גוש (לדוגמה: `6157`)
   - הזן מספר חלקה (לדוגמה: `42`)
   - (אופציונלי) הזן כתובת לשיפור תוצאות
   - לחץ **"שלוף זכויות בנייה"**

3. **צפייה בתוצאות:**
   - **זכויות בנייה נוכחיות** - אחוזים, קומות, גובה
   - **תכניות חלות** - כל התוכניות מ-iPlan
   - **היתרי בנייה** - היתרים ממבא"ת
   - **עבירות בנייה** - עבירות פתוחות
   - **סטטוס משפטי** - שימור, הפקעה

### בקוד (למפתחים):

```typescript
import { unifiedGovAPI } from '@/lib/unifiedGovAPI'

// דוגמה 1: שליפת זכויות בנייה
const data = await unifiedGovAPI.fetchBuildingRights(
  '6157',  // גוש
  '42',    // חלקה
  'רחוב הרצל 10, תל אביב' // כתובת (אופציונלי)
)

// גישה לנתונים:
console.log(data.currentRights.buildingPercentage) // אחוזי בנייה
console.log(data.currentRights.maxFloors)          // קומות מקס'
console.log(data.iPlanData.applicablePlans)        // תכניות חלות
console.log(data.mavatData.permits)                // היתרים
console.log(data.mavatData.violations)             // עבירות
console.log(data.legalStatus.hasViolations)        // האם יש עבירות

// דוגמה 2: בדיקת חיבור
const status = await unifiedGovAPI.testAllConnections()
console.log(status.iPlan)   // true/false
console.log(status.mavat)   // true/false
console.log(status.overall) // true/false

// דוגמה 3: יצירת דוח טקסטואלי
const report = await unifiedGovAPI.generateBuildingRightsReport('6157', '42')
console.log(report)  // דוח מפורט בעברית
```

---

## 📊 מבנה הנתונים המוחזרים

### `UnifiedBuildingRights`

```typescript
{
  // זיהוי
  gush: string              // מספר גוש
  helka: string             // מספר חלקה
  address?: string          // כתובת
  
  // נתונים מ-iPlan
  iPlanData: {
    gush: string
    helka: string
    applicablePlans: [       // תכניות חלות
      {
        planNumber: string   // מספר תכנית
        planName: string     // שם תכנית
        planStatus: string   // תקפה/בהליך/בוטלה
        approvalDate: string
        buildingPercentage: number
        maxFloors: number
        maxHeight: number
        allowedUses: string[]
        mainUse: string
        landUseZone: string
      }
    ]
  }
  
  // נתונים ממבא"ת
  mavatData: {
    permits: [               // היתרי בנייה
      {
        permitNumber: string
        permitType: string
        status: string       // אושר/בטיפול/נדחה
        plannedArea: number
        floors: number
        units: number
        address: {
          city: string
          street: string
          houseNumber: string
        }
      }
    ],
    violations: [            // עבירות בנייה
      {
        violationId: string
        type: string
        status: string       // פתוחה/סגורה
        severity: 'high' | 'medium' | 'low'
        description: string
      }
    ]
  }
  
  // זכויות מאוחדות
  currentRights: {
    buildingPercentage?: number
    maxFloors?: number
    maxHeight?: number
    allowedUses: string[]
    mainUse: string
    landUseZone?: string
  }
  
  // סטטוס משפטי
  legalStatus: {
    hasViolations: boolean
    violationCount: number
    hasActivePermits: boolean
    permitCount: number
    conservation: boolean      // שימור
    expropriation: boolean     // הפקעה
  }
  
  // מטא-נתונים
  dataQuality: 'high' | 'medium' | 'low'
  lastUpdate: string
  sources: string[]            // רשימת מקורות שנמצאו
}
```

---

## 🔒 אבטחה ופרטיות

### ללא צורך במפתחות API:
- ✅ iPlan - שירות ציבורי פתוח (ArcGIS REST)
- ✅ Mavat - OpenData ציבורי
- ✅ אין צורך ברישום או הרשמה
- ✅ אין עלויות שימוש

### Rate Limiting:
- המערכת מכבדת את מגבלות הקריאות:
  - iPlan: ללא מגבלה רשמית
  - Mavat: השהיית שנייה אחת בין קריאות (built-in)

### Privacy:
- כל הנתונים הם ציבוריים
- אין שמירת מידע אישי
- השאילתות לא נרשמות במערכת

---

## ⚡ ביצועים

### זמני תגובה צפויים:
- iPlan: 1-3 שניות לשאילתה
- Mavat: 1-2 שניות לשאילתה
- סה"כ (משולב): 3-5 שניות

### אופטימיזציות:
- ✅ קריאות מקבילות למקורות שונים
- ✅ Timeout של 15 שניות למניעת תקיעות
- ✅ Graceful degradation - אם מקור אחד נכשל, האחר עדיין עובד
- ✅ Error handling מלא עם הודעות ברורות

---

## 🐛 פתרון בעיות

### בעיה: "לא נמצאו נתונים"
**פתרונות:**
1. ✅ ודא שמספרי גוש/חלקה נכונים
2. ✅ נסה להוסיף כתובת מדויקת
3. ✅ בדוק אם החלקה קיימת באמת ב-iPlan
4. ✅ לחץ "בדוק חיבור" לוודא שהשירותים זמינים

### בעיה: "שגיאה בשליפת נתונים"
**פתרונות:**
1. ✅ בדוק חיבור לאינטרנט
2. ✅ וודא שהשירותים הממשלתיים פעילים
3. ✅ נסה שוב מאוחר יותר (ייתכן תחזוקה)
4. ✅ בדוק את ה-Console לפרטים נוספים

### בעיה: "איכות נתונים נמוכה"
**משמעות:**
- המערכת מצאה מעט מידע על החלקה
- ייתכן שהחלקה לא מתוכננת או בשטח פתוח
- ניתן להמשיך אבל לקחת בחשבון שהמידע חלקי

**פתרונות:**
1. ✅ הוסף כתובת מדויקת
2. ✅ חפש לפי מספר תכנית במקום גוש/חלקה
3. ✅ בדוק במקורות נוספים (GovMap, רישום מקרקעין)

---

## 🔮 תכונות עתידיות מתוכננות

### גרסה הבאה:
- [ ] **Caching חכם** - שמירת תוצאות לחיסכון בזמן
- [ ] **חיפוש לפי כתובת** - ללא צורך בגוש/חלקה
- [ ] **ייצוא לקבצים** - PDF, Excel, JSON
- [ ] **השוואת תכניות** - לפני/אחרי
- [ ] **התראות על שינויים** - עדכון אוטומטי
- [ ] **אינטגרציה עם GovMap** - מפות אינטראקטיביות
- [ ] **חיבור לרישום מקרקעין** - נתוני בעלות
- [ ] **אינטגרציה עם מחשבון היטל השבחה** - חיבור ישיר

### רעיונות ארוכי טווח:
- [ ] AI לניתוח שינויים תכנוניים
- [ ] מעקב אוטומטי אחר תכניות חדשות
- [ ] דוחות השוואתיים אוטומטיים
- [ ] אינטגרציה עם מערכות CRM
- [ ] API ציבורי לצד שלישי

---

## 📚 משאבים נוספים

### תיעוד רשמי:
- [iPlan - מינהל התכנון](https://www.iplan.gov.il)
- [Mavat - מבא"ת](https://mavat.moin.gov.il)
- [ArcGIS REST API](https://developers.arcgis.com/rest/)
- [Data.gov.il](https://data.gov.il)

### דוגמאות קוד:
ראה את הקבצים:
- `/src/lib/iPlanAPI.ts` - דוגמאות שימוש ב-iPlan
- `/src/lib/mavatAPI.ts` - דוגמאות שימוש במבא"ת
- `/src/lib/unifiedGovAPI.ts` - דוגמאות מאוחדות

### תמיכה:
- GitHub Issues: [לינק לפרוייקט]
- תיעוד מלא: `REAL_API_INTEGRATION_GUIDE.md`

---

## ✨ סיכום

המערכת כוללת כעת **אינטגרציה אמיתית ומלאה** למקורות הנתונים הממשלתיים:

✅ **iPlan** - זכויות בנייה, תכניות, זיקות
✅ **Mavat** - היתרים, עבירות, סטטוס משפטי
✅ **ממשק נוח** - UI פשוט וברור
✅ **מהיר ויעיל** - תשובות תוך שניות
✅ **חינמי לחלוטין** - ללא עלויות API
✅ **אמין** - חיבור ישיר למקור
✅ **מדויק** - נתונים רשמיים ומעודכנים

**זו פונקציונליות שאין בשום מערכת שמאות אחרת בשוק!** 🚀

---

*עדכון אחרון: ${new Date().toLocaleDateString('he-IL')}*
