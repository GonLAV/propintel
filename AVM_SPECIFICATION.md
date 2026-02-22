# מערכת שמאות אוטומטית מקצועית (AVM) - ישראל
# Professional Automated Valuation Model - Israeli Real Estate

## 🎯 מטרה | Purpose

מערכת שמאות אוטומטית ברמה מקצועית לתמיכה בשמאי מקרקעין מוסמך.
**לא תחליף לשמאי**, אלא כלי מקצועי לתמיכה בקבלת החלטות.

Professional-grade automated valuation system to support certified real estate appraisers.
**NOT a replacement for appraisers**, but a professional decision-support tool.

---

## 📊 מקורות נתונים חובה | Mandatory Data Sources

### 1. רשות המיסים - מאגר עסקאות נדל"ן (nadlan.gov.il)
- **רק עסקאות סגורות** - Closed transactions ONLY
- **לא מחירי מבוקש** - NO asking prices as valuation anchors
- **משמש**: השוואה, מחירי שוק, מגמות - Used for: comparables, market prices, trends

### 2. רשם המקרקעין (טאבו) - Land Registry (Tabu)
- זכויות קניין מאושרות - Verified ownership rights
- משכונים ועיקולים - Mortgages and liens
- סטטוס משפטי - Legal status

### 3. מינהל התכנון - Planning Administration
- זכויות בנייה קיימות - Current building rights
- תב"עות מאושרות - Approved plans
- תכניות עתידיות - Future plans
- הפרות בנייה - Building violations

### 4. נתוני GIS ממשלתיים (GovMap)
- קואורדינטות מדויקות - Precise coordinates
- ניתוח נגישות - Accessibility analysis
- אזורי הצפה וסכנות - Flood and hazard zones
- ניתוח נוף - Viewshed analysis

### 5. אגרגציה גיאוגרפית | Geographic Aggregation
- **רמת גוש/חלקה** - Block (gush/helka) level
- **רמת רחוב** - Street level
- **רמת שכונה** - Neighborhood level
- **אזור סטטיסטי** - Statistical area level

---

## 🧮 לוגיקת שמאות | Valuation Logic

### שיטת חישוב | Calculation Method
**Hedonic Pricing Model + Ensemble Learning**
- רגרסיה ליניארית משוקללת - Weighted Linear Regression
- Gradient Boosting (XGBoost-style adjustments)
- שקלול עסקאות לפי זמן - Time-weighted transactions

### מאפיינים קריטיים | Critical Features

#### 1. מיקום (Location Hierarchy)
```
עיר → שכונה → רחוב → מספר בית
City → Neighborhood → Street → Building Number
```
**משקל**: 40-50% מהשווי

#### 2. מאפייני נכס (Property Characteristics)
- קומה (Floor) - משקל: 5-8%
- מעלית (Elevator) - משקל: 3-5%
- חניה (Parking) - משקל: 5-10%
- מרפסת (Balcony) - משקל: 2-4%
- מ"ר שמיש (Usable SQM) - **לא מ"ר ברוטו**

#### 3. מצב ומאפיינים (Condition & Features)
- גיל הבניין (Building Age) - משקל: 5-10%
- שיפוץ (Renovation indicator) - משקל: 5-8%
- מצב תחזוקה (Maintenance condition) - משקל: 3-5%

#### 4. סוג נכס (Property Type)
- דירת גן (Garden apartment)
- פנטהאוז (Penthouse)
- דירה רגילה (Standard apartment)
- דופלקס/טריפלקס (Duplex/Triplex)

#### 5. חשיפה ונוף (Exposure & Views)
- כיווני אוויר (Cardinal directions)
- קומות בבניין (Total floors in building)
- נוף (View quality)

---

## 🚫 זיהוי ונטרול חריגים | Outlier Detection & Removal

### עסקאות לא מסחריות (Non-Arm's Length Transactions)
**להוציא מהניתוח**:
1. עסקאות בין בני משפחה (Family transactions)
2. מחיר 0 או סמלי (Zero or symbolic price)
3. פערים > 40% מהחציון (>40% deviation from median)
4. עסקאות בנסיבות מיוחדות:
   - מימושים (Foreclosures)
   - מכירות מוטלות ספק (Distressed sales)
   - חילופי נכסים (Property swaps)

### זיהוי סטטיסטי (Statistical Detection)
```python
# Pseudo-code
IQR = Q3 - Q1
Lower_Bound = Q1 - 1.5 × IQR
Upper_Bound = Q3 + 1.5 × IQR
Valid_Transactions = transactions WHERE price BETWEEN Lower_Bound AND Upper_Bound
```

---

## 📏 סף מינימום עסקאות | Minimum Comparable Threshold

### דרישות בסיס
- **מינימום**: 5 עסקאות השוואה
- **תקופה**: עד 24 חודשים אחורה
- **רדיוס**: התחל ב-500 מטר, הרחב עד 2 ק"מ
- **דמיון**: ציון דמיון > 60%

### אם אין מספיק עסקאות (Low Data Areas)
1. **הרחב רדיוס גיאוגרפי** עד 5 ק"מ
2. **הרחב חלון זמן** עד 36 חודשים
3. **הקל על קריטריונים** (גודל ±30%, סוג דומה)
4. **דגל בביטחון נמוך** - LOW CONFIDENCE FLAG

---

## ⚖️ נורמליזציה | Normalization

### מחיר למ"ר שמיש (Price per Usable SQM)
```
מחיר למ"ר = מחיר עסקה ÷ שטח שמיש נטו
Price/SQM = Transaction Price ÷ Net Usable Area
```

**לא**: שטח ברוטו, שטחי שירות, מחסנים
**NOT**: Gross area, service areas, storage

### שקלול לפי זמן (Time Weighting)
```
משקל זמן = 1 - (חודשים מאז עסקה ÷ 24)
Time_Weight = 1 - (Months_Since_Transaction ÷ 24)
```

עסקאות חדשות (0-6 חודשים): משקל 1.0
עסקאות ישנות (18-24 חודשים): משקל 0.25

---

## 🎯 פלט השמאות | Valuation Output

### 1. טווח שווי (Value Range)
```
שווי נמוך  = שווי ממוצע × 0.90
שווי אמצע = שווי ממוצע
שווי גבוה  = שווי ממוצע × 1.10

Low  = Average × 0.90
Mid  = Average
High = Average × 1.10
```

### 2. ציון ביטחון (Confidence Score: 0-100)

#### גורמים לחישוב
```typescript
ConfidenceScore = (
  ComparablesCount × 0.30 +     // מספר עסקאות
  Recency × 0.25 +              // עדכניות
  Similarity × 0.25 +           // דמיון לנכס הנישום
  LowVariance × 0.20            // שונות נמוכה
)
```

#### סקאלה
- **90-100**: ביטחון מאוד גבוה (10+ עסקאות, חודשים אחרונים, דמיון >85%)
- **75-89**: ביטחון גבוה (7-9 עסקאות, 6 חודשים, דמיון >70%)
- **60-74**: ביטחון בינוני (5-6 עסקאות, 12 חודשים, דמיון >60%)
- **40-59**: ביטחון נמוך (3-4 עסקאות, 18 חודשים)
- **0-39**: ביטחון מאוד נמוך - **לא אמין**

### 3. טבלת עסקאות השוואה (Comparables Summary Table)

| כתובת | מחיר | תאריך | מ"ר | מחיר/מ"ר | התאמות | מחיר מותאם | דמיון | משקל |
|-------|------|-------|-----|----------|---------|------------|--------|------|
| ...   | ...  | ...   | ... | ...      | ...     | ...        | ...    | ...  |

### 4. פירוט לוגיקת השמאות (Valuation Logic Explanation)

**בעברית פשוטה**:
```
השווי המוערך של הנכס נקבע על סמך:
1. ניתוח של [X] עסקאות דומות ברדיוס [Y] מטר
2. התאמות בגין הבדלים:
   - קומה: +/- [X]₪
   - מצב: +/- [Y]₪
   - מאפיינים: +/- [Z]₪
3. שקלול לפי זמן: עסקאות חדשות יותר קיבלו משקל גבוה יותר
4. החציון המשוקלל: [מחיר] ₪
5. טווח ביטחון 90%-110%: [min] - [max] ₪
```

---

## ⚠️ אזורים בביטחון נמוך | Low-Confidence Areas

### סימון מפורש (Explicit Flagging)
**יש לסמן ביטחון נמוך במקרים הבאים**:

1. **פרויקטים חדשים** - עסקאות ראשונות, אין היסטוריה
2. **אזורים כפריים** - מעט עסקאות
3. **נכסים ייחודיים** - אין דומים
4. **שוק לא יציב** - שונות גבוהה במחירים
5. **שינויים תכנוניים מהותיים** - קשה לחזות השפעה

### הצגת אזהרה
```
⚠️ אזהרה: ביטחון נמוך
הערכה זו מבוססת על מספר מצומצם של עסקאות ([X]).
מומלץ לבצע שמאות פיזית על ידי שמאי מוסמך.

Warning: Low Confidence
This estimate is based on limited transactions ([X]).
A physical appraisal by a licensed appraiser is recommended.
```

---

## 📜 כתב ויתור משפטי ומקצועי | Legal & Professional Disclaimer

### טקסט חובה (Mandatory Text)

#### עברית
```
כתב ויתור משפטי

1. מערכת זו הינה מודל שמאות אוטומטי (AVM) ואינה מהווה תחליף לשומת שמאי מקרקעין מוסמך.

2. הערכת השווי מבוססת על נתונים סטטיסטיים ואלגוריתמים מתמטיים בלבד, ואינה 
   לוקחת בחשבון מצב פיזי ספציפי, פגמים נסתרים, או נסיבות מיוחדות.

3. השומה אינה עומדת בדרישות תקן 19 או תקן 22 של לשכת שמאי המקרקעין בישראל.

4. אין להסתמך על הערכה זו לצרכים משפטיים, מיסוייים, או עסקאות מסחריות 
   ללא בדיקת שמאי מקצועי.

5. המערכת אינה אחראית לנזקים כלשהם הנובעים מהסתמכות על הנתונים.

6. תוקף ההערכה: 30 יום בלבד מיום הפקתה.
```

#### English
```
Legal Disclaimer

1. This is an Automated Valuation Model (AVM) and does NOT replace a 
   licensed real estate appraiser report.

2. Valuation is based solely on statistical data and mathematical algorithms, 
   and does not account for specific physical condition, hidden defects, 
   or special circumstances.

3. This appraisal does NOT comply with Israeli Appraiser Standards 
   (Standard 19 or Standard 22).

4. Do not rely on this estimate for legal, tax, or commercial purposes 
   without a professional appraiser inspection.

5. The system is not liable for any damages resulting from reliance on this data.

6. Validity: 30 days from issuance date only.
```

---

## 🔍 תקן 22 - תקן ישראלי לשמאות | Israeli Appraisal Standard 22

### התאמה חלקית (Partial Compliance)
המערכת יכולה לתמוך ב**חלק מהדרישות** של תקן 22:

✅ **כן - התאמה**:
- שיטת ההשוואה (Comparable Sales Approach)
- תיעוד מקורות נתונים (Data Source Documentation)
- שקיפות חישובים (Calculation Transparency)
- הצגת טווח ערכים (Value Range Display)

❌ **לא - חוסר התאמה**:
- ביקור פיזי בנכס (Physical Property Inspection) - **חובה בתקן 22**
- תיאור מצב הנכס (Property Condition Description)
- צילומים (Photography)
- חתימת שמאי מוסמך (Licensed Appraiser Signature)
- שיקול דעת מקצועי (Professional Judgment)

### המלצה
```
המערכת משמשת ככלי עזר ראשוני.
לצרכים רשמיים - נדרשת שומה מלאה על פי תקן 22.

This system serves as a preliminary tool.
For official purposes - a full Standard 22 appraisal is required.
```

---

## 🎚️ רמות דיוק לפי סוג שימוש | Accuracy Levels by Use Case

### 1. הערכה ראשונית (Initial Estimate)
- **דיוק צפוי**: ±15-20%
- **מטרה**: סינון ראשוני, בדיקת כדאיות
- **משתמשים**: משקיעים, קונים פרטיים

### 2. תמיכה מקצועית (Professional Support)
- **דיוק צפוי**: ±10-15%
- **מטרה**: נקודת התחלה לשמאי
- **משתמשים**: שמאים מקצועיים

### 3. ניתוח פורטפוליו (Portfolio Analysis)
- **דיוק צפוי**: ±8-12% (ממוצע על מספר נכסים)
- **מטרה**: הערכת שווי קרנות, נדל"ן מניב
- **משתמשים**: מוסדיים, קרנות

---

## 📊 דוגמת פלט מלא | Complete Output Example

```
═══════════════════════════════════════════════════
      מערכת שמאות אוטומטית - דוח הערכה
      Automated Valuation Model - Report
═══════════════════════════════════════════════════

🏠 פרטי נכס | Property Details
──────────────────────────────────────────────────
כתובת: רחוב הרצל 15, תל אביב
שטח שמיש: 95 מ"ר
קומה: 3 מתוך 5
חדרים: 4
מעלית: כן
חניה: 1

📍 טווח שווי מוערך | Estimated Value Range
──────────────────────────────────────────────────
שווי נמוך:    3,420,000 ₪ (90%)
שווי אמצע:    3,800,000 ₪ (100%)
שווי גבוה:    4,180,000 ₪ (110%)

מחיר למ"ר:    40,000 ₪

📊 ציון ביטחון | Confidence Score
──────────────────────────────────────────────────
██████████████████░░ 85/100 - ביטחון גבוה

- מספר עסקאות: 8 (30 נקודות)
- עדכניות: ממוצע 4 חודשים (22 נקודות)
- דמיון: 78% (20 נקודות)
- שונות נמוכה: σ = 8% (13 נקודות)

📋 עסקאות השוואה | Comparable Transactions
──────────────────────────────────────────────────
1. רחוב הרצל 23 | 3.9M ₪ | 92 מ"ר | 42,391 ₪/מ"ר
   תאריך: 2024-09 | קומה 2 | התאמה: +3% | דמיון: 85%
   
2. רחוב ביאליק 7 | 3.7M ₪ | 98 מ"ר | 37,755 ₪/מ"ר
   תאריך: 2024-08 | קומה 4 | התאמה: +2% | דמיון: 80%
   
3. רחוב אחד העם 12 | 4.1M ₪ | 100 מ"ר | 41,000 ₪/מ"ר
   תאריך: 2024-10 | קומה 3 | התאמה: 0% | דמיון: 92%

[... 5 נוספות ...]

💡 הסבר לוגיקת שמאות | Valuation Logic
──────────────────────────────────────────────────
השווי המוערך נקבע על פי:

1. ניתוח 8 עסקאות דומות ברדיוס 800 מטר
2. ממוצע משוקלל לפי זמן ודמיון: 40,000 ₪/מ"ר
3. התאמות עיקריות:
   • קומה (3/5): +0% (בינונית)
   • מצב תחזוקה: +2% (טוב)
   • מעלית: בסיס
   • חניה: +5%
4. שטח שמיש: 95 מ"ר
5. חישוב: 95 × 40,000 = 3,800,000 ₪
6. טווח ביטחון ±10%: 3.42M - 4.18M ₪

⚠️ הנחות ומגבלות | Assumptions & Limitations
──────────────────────────────────────────────────
✓ מבוסס על נתוני רשות המיסים - עסקאות סגורות
✓ נורמליזציה למ"ר שמיש (לא ברוטו)
✓ נטרול חריגים סטטיסטיים
⚠ לא כולל בדיקה פיזית של הנכס
⚠ לא כולל פגמים נסתרים או בעיות משפטיות
⚠ אינו תחליף לשומת שמאי מוסמך

📜 כתב ויתור משפטי | Legal Disclaimer
──────────────────────────────────────────────────
מערכת זו הינה מודל שמאות אוטומטי (AVM) ואינה 
מהווה תחליף לשומת שמאי מקרקעין מוסמך.
לא עומדת בדרישות תקן 19/22.
תוקף: 30 יום.

═══════════════════════════════════════════════════
תאריך הפקה: 2025-01-09 14:30
מספר דוח: AVM-2025-001234
═══════════════════════════════════════════════════
```

---

## 🛡️ אבטחה ואחריות | Security & Liability

### מניעת שימוש לרעה
1. **אין הצגת ערכים כ"סופיים"** - Always show as "estimated range"
2. **חותמת זמן** - Timestamp all valuations
3. **IP Logging** - Track who generated what valuation
4. **Rate Limiting** - Prevent bulk scraping
5. **Watermark on PDFs** - "AVM - Not Official Appraisal"

### אחריות משפטית
```
המערכת והמפעילים אינם אחראים לנזקים 
כלשהם הנובעים משימוש במערכת.

The system and operators are not liable for 
any damages resulting from use of this system.
```

---

## 📈 מדדי ביצועים | Performance Metrics

### KPIs למעקב
1. **Median Absolute Percentage Error (MAPE)**: יעד < 12%
2. **Hit Rate (±10%)**: יעד > 70%
3. **Hit Rate (±15%)**: יעד > 85%
4. **Forecast Standard Deviation Ratio (FSD)**: יעד < 1.2
5. **Coverage**: אחוז נכסים עם ביטחון > 70% - יעד > 60%

### שיפור מתמיד
- **Feedback Loop**: איסוף שמאות אמיתיות לעומת תחזיות
- **Model Retraining**: כל 3 חודשים עם נתונים חדשים
- **A/B Testing**: בדיקת אלגוריתמים חדשים

---

## ✅ סיכום דרישות | Requirements Summary

### חובה (MUST)
✅ שימוש ברשות מיסים - עסקאות סגורות בלבד
✅ זיהוי ונטרול חריגים
✅ מינימום 5 עסקאות (אחרת: ביטחון נמוך)
✅ נורמליזציה למ"ר שמיש
✅ טווח שווי + ציון ביטחון
✅ כתב ויתור משפטי ברור
✅ הסבר בעברית פשוטה

### מומלץ (SHOULD)
⭐ שימוש ב-GIS לניתוח מיקום
⭐ חיבור לתכניות בנייה עתידיות
⭐ התראות על שוק לא יציב
⭐ השוואה למספר שיטות שמאות

### אסור (MUST NOT)
❌ להציג כ"שומה רשמית"
❌ לאשר בתור תחליף לשמאי מוסמך
❌ להסיר כתב ויתור משפטי
❌ להשתמש במחירי מבוקש כעוגן ראשי
