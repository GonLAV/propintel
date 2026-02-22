# מה שמאי באמת צריך — תכנית End-to-End למוצר מנצח

## 1) Workflow מלא לשמאי (הגדרת מוצר)

1. קבלת תיק
2. איסוף מידע נכס
3. מציאת קומפרבלים
4. ביקור נכס
5. ניתוח שווי
6. כתיבת דוח
7. ניהול לקוחות ותיקים
8. מעקב שווי עתידי

מוצר שמאות מנצח חייב לכסות את כל השרשרת, לא רק חלקים.

---

## 2) עקרונות ניצחון

- **דאטה נקי ואמין** (חשוב יותר מכל מודל AI)
- **מהירות חיפוש קומפרבלים** (SLA בשניות)
- **ביקור נכס חכם** (צילום, קול, צ׳קליסט, אופליין)
- **דוח אוטומטי מבוסס עובדות בלבד**
- **Monitoring אחרי הדוח** ליצירת הכנסה חוזרת

---

## 3) ארכיטקטורה מומלצת (8 שכבות)

## 3.1 Data Aggregation Engine
### מה עושה
- עסקאות אמת
- מודעות
- GIS/תכנון
- נתוני שכונה
- תכניות עתידיות

### טכנית
- ETL + near-real-time ingestion
- Address normalization ישראלי
- Geocoding + spatial indexing
- Deduplication + freshness score

## 3.2 Property Graph + Database
### ישויות
- `Property`
- `Building`
- `Transaction`
- `Planning`
- `Neighborhood`

### טכנולוגיה
- PostgreSQL + PostGIS
- Elastic לחיפוש טקסטואלי
- Graph relations לנכסים קשורים

## 3.3 Comparable AI Engine
- Feature engineering מלא לנכס
- Embeddings + Vector DB
- Similarity search (KNN)
- Adjustment calculator (rules + ML)

## 3.4 Smart Site Visit Module
- צילום, מדידה, checklist דינמי
- Voice notes + transcription
- Offline-first
- Image condition detection + anomaly detection

## 3.5 Valuation Engine
- Weighted comparable valuation
- Outlier detection
- Hedonic pricing
- Confidence score
- Scenario simulation

## 3.6 AI Report Generator
- Prompt orchestration
- Template engine (בנק/בית משפט)
- Fact grounding
- Numeric validation
- Versioning + signature

## 3.7 Workflow + CRM לשמאי
- ניהול תיקים
- סטטוסים ו-SLA
- לקוחות
- מסמכים
- חיוב ובילינג

## 3.8 Monitoring Engine (Killer)
- התראות שינוי שווי
- עסקאות חדשות בסביבה
- טריגרים לעבודה חוזרת

---

## 4) KPI/SLA מוצר

- חיפוש קומפרבלים: p95 < 2 שניות
- טיוטת דוח: p95 < 8 שניות
- זמן הכנת דוח מלא: קיצור של 40%-60%
- דיוק/יציבות שווי: ירידה בסטיית הערכה
- שיעור אימוץ משתמשים בשטח: >70%

---

## 5) Tech Stack מומלץ

## Backend
- Node.js / Python
- Postgres + PostGIS
- Redis
- Elastic

## AI
- LLM orchestration עם guardrails
- Vision model לניתוח תמונות
- מודל רגרסיה ל-adjustments
- Vector DB (pgvector / external)

## Mobile
- React Native / Flutter
- Offline-first sync

## Infra
- Event-driven pipelines
- Feature flags
- Multi-tenant
- Audit logs

---

## 6) מפת דרכים ישימה (90-120 יום)

## שלב א׳ (0-30 יום)
- הקשחת ingestion + normalization + dedup
- איחוד מודל נתונים Property/Transaction/Planning
- SLA בסיסי לחיפוש קומפרבלים

## שלב ב׳ (30-60 יום)
- מנוע קומפרבלים מלא + הסברים
- מנוע התאמות עם override + audit
- UI סליידרים ועדכון שווי מיידי

## שלב ג׳ (60-90 יום)
- Report Generator מבוסס grounding
- Validation gate + approval חובה
- PDF court-ready + versioning/signature

## שלב ד׳ (90-120 יום)
- Monitoring Engine
- התראות שווי + עסקאות חדשות
- טריגרים ל-renewal ולעבודות חוזרות

---

## 7) מה ה-Moat האמיתי

1. **Address normalization ישראלי איכותי**
2. **Dedup + entity resolution**
3. **Explainable adjustments** ברמת שמאי
4. **Workflow מלא בקצה לקצה** (לא רק מידע)
5. **Monitoring מתמשך** שמייצר הכנסה חוזרת

---

## 8) TODO מוצר קצר (ביצועי)

- [ ] לאחד Data Freshness Score בכל מקור
- [ ] להוסיף איכות נתון לכל comparable
- [ ] להוסיף confidence decomposition לתצוגת UI
- [ ] להוסיף offline queue מסודר לביקור נכס
- [ ] לחבר התראות ניטור לאירועים אמיתיים
- [ ] להוסיף dashboard KPI למנהלים
