# Product Architecture Audit (Appraisal Platform)

תאריך: 2026‑01‑03
מצב ריפו: main

## תקציר הנהלה
האפליקציה בנויה סביב פרונטאנד React + Vite עם ספריית Spark ו־Tailwind, כאשר רוב הלוגיקה העסקית מרוכזת ב־`src/lib/*`. קיימת שכבת אינטגרציות ממשלתיות וייצוא PDF, לצד שימוש ב־`useKV` לאחסון לקוח. יש סרבר מינימלי ב־Express לצרכים עתידיים. הבידול בין שכבות קיים אך יש נקודות ערבוב (UI מבצע קריאות AI/בניית פרומפטים, ו־any נפוץ), מה שמקשה על תחזוקה והחלפת ספקים.

ההמלצה: לחזק את ההפרדה לשכבות ע"י יצירת Service Layer עבור AI/מקורות נתונים והעברת כל החישובים והאינטגרציות אל `src/lib/services/*`, להשאיר ה־UI כשכבת תצוגה בלבד, ולהרחיב בדיקות לוגיקה.

---

## שכבות ארכיטקטורה

- UI / Presentation:
  - קומפוננטים תחת [src/components](src/components) (לדוגמה: [AdvancedMarketComparison.tsx](src/components/AdvancedMarketComparison.tsx), [ReportGenerator.tsx](src/components/ReportGenerator.tsx), [TransactionsMap.tsx](src/components/TransactionsMap.tsx)).
  - אחסון לקוח: `useKV` ב־Spark להיסטוריה/סטייט.
  - בעיה חוזרת: קריאות `window.spark.llm(...)` נעשות מתוך קומפוננטים (ראה [AdvancedMarketComparison.tsx#L93](src/components/AdvancedMarketComparison.tsx#L93), [ReportGenerator.tsx#L116](src/components/ReportGenerator.tsx#L116), [AIValuation.tsx](src/components/AIValuation.tsx)).

- Business Logic / Domain:
  - לוגיקת שמאות: [src/lib/valuationEngine.ts](src/lib/valuationEngine.ts), [src/lib/professionalAVM.ts](src/lib/professionalAVM.ts), [src/lib/valuationDecision.ts](src/lib/valuationDecision.ts).
  - טבלאות/סקמות: [src/lib/valuationTables.ts](src/lib/valuationTables.ts), [src/lib/valuationSchemas.ts](src/lib/valuationSchemas.ts), [src/lib/types.ts](src/lib/types.ts).
  - בדיקות: [src/lib/valuationEngine.test.ts](src/lib/valuationEngine.test.ts) — עברו מקומית בהצלחה.

- Data / Persistence:
  - מקומיים: [src/lib/csvImport.ts](src/lib/csvImport.ts), [src/lib/comparablesImport.ts](src/lib/comparablesImport.ts), [src/lib/bulkExportUtils.ts](src/lib/bulkExportUtils.ts).
  - ייצוא PDF: [src/lib/pdfExport.ts](src/lib/pdfExport.ts), [src/lib/bulkPdfExport.ts](src/lib/bulkPdfExport.ts).
  - אחסון לקוח (KV) בקומפוננטים; אין מסד נתונים שרתי פעיל כרגע.

- Integrations / External APIs:
  - ממשלתיים: [src/lib/dataGovAPI.ts](src/lib/dataGovAPI.ts), [src/lib/nadlanGovAPI.ts](src/lib/nadlanGovAPI.ts), [src/lib/iPlanAPI.ts](src/lib/iPlanAPI.ts), [src/lib/mavatAPI.ts](src/lib/mavatAPI.ts), [src/lib/unifiedGovAPI.ts](src/lib/unifiedGovAPI.ts), [src/lib/realIsraeliGovDataAPI.ts](src/lib/realIsraeliGovDataAPI.ts).
  - AI: קריאות ישירות מ־UI אל `window.spark.llm(...)` (פיזור בקומפוננטים רבים).

- Infrastructure / DevOps:
  - פרונט: `npm run dev`, `npm run build`, `npm run preview`.
  - סרבר: [backend/server.mjs](backend/server.mjs) ריצה ב־3001 עם `/health` ו־`/`.
  - בדיקות: Vitest (`npm run test`).
  - Lint: ESLint (`npm run lint`) — כרגע הרבה שגיאות בעיקר `no-explicit-any` ו־unused.

---

## מיפוי קומפוננטים (תמצית)

- UI מסכים עיקריים: Dashboard, ClientPortal, ReportGenerator, Valuation calculators (Residential/Commercial/Land/Income), GISN viewers, TransactionsMap, BulkValuation, StandardizedReports.
- לוגיקה שמאית: ValuationEngine, ProfessionalAVM, Calculators תחת [src/lib/calculators](src/lib/calculators).
- אינטגרציות נתונים: Nadlan/IPlan/Mavat/DataGov/RealGov.

רשימה מלאה: עיין בתוכן [src/components](src/components) ו-[src/lib](src/lib) כפי שמופיע לעיל.

---

## בדיקת תלות ו־Coupling

- נקודות ערבוב שכבות:
  - UI קורא AI ישירות: [AdvancedMarketComparison.tsx#L93](src/components/AdvancedMarketComparison.tsx#L93), [ReportGenerator.tsx#L116](src/components/ReportGenerator.tsx#L116), [AIValuation.tsx].
  - UI מייצר פרומפטים ומעצב JSON — מומלץ להעביר ל־Service.
- שימוש נרחב ב־`any` ב־UI וב־lib פוגע בבידוד הלוגיקה והאכפתיות לטיפוסים.
- הצעה: ליצור Service Layer (מפורט בהמלצות) ולהפוך הקומפוננטים לצרכנים של שירותים בלבד.

---

## בדיקת זרימת נתונים (Data Flow)

דוגמת זרימה — עסקאות ממשלתיות → שומה → UI → יצוא:
- מקור: [src/lib/nadlanGovAPI.ts](src/lib/nadlanGovAPI.ts) / [src/lib/realIsraeliGovDataAPI.ts](src/lib/realIsraeliGovDataAPI.ts).
- עיבוד: [src/lib/valuationEngine.ts](src/lib/valuationEngine.ts) / [src/lib/professionalAVM.ts](src/lib/professionalAVM.ts).
- הצגה: קומפוננטים כמו [TransactionsMap.tsx](src/components/TransactionsMap.tsx), [ValuationEngineTester.tsx](src/components/ValuationEngineTester.tsx).
- יצוא: [src/lib/pdfExport.ts](src/lib/pdfExport.ts), [src/lib/bulkPdfExport.ts](src/lib/bulkPdfExport.ts).

בדיקות/Logging:
- אין שכבת Audit שרתית; קיימים קומפוננטים ל־AuditTrail ([src/components/AuditTrail.tsx](src/components/AuditTrail.tsx)), אך לא רישום אירועים בשרת.
- מומלץ להוסיף Event Logger בשירותים ולתעד מקור/זמן/גרסה לכל נתון.

Metadata:
- ב־`types.ts` קיימים טיפוסים, אך כדאי להוסיף שדות מקור (`source`), תאריך (`timestamp`), ורמת אמינות (`confidence`) לכל ישות נתונים מרכזית.

---

## בדיקת כללי עסק (Business Rules)

- הכללים העיקריים מרוכזים ב־`src/lib/*` — חיובי.
- הוספת כלל חדשה: אפשרית, אך נדרשת הקפדה על טיפוסים והפרדת אחריות.
- בדיקות:
  - קיימות בדיקות ל־ValuationEngine ([src/lib/valuationEngine.test.ts](src/lib/valuationEngine.test.ts)) — עברו בהצלחה.
  - מומלץ להוסיף בדיקות ל־ProfessionalAVM ו־Calculators ספציפיים.

---

## בדיקת APIs ושכבות חיצוניות

- קריאות API מפוזרות: חלקן דרך `src/lib/*`, חלקן (AI) ישירות מ־UI.
- המלצה: Service Layer אחיד להחלפת ספקים ללא השפעה על UI/Domain.

---

## בדיקת UX / UI

- עקביות מרכיבי UI (שימוש ב־shadcn/Radix): קיימת — חיובי.
- זרימת משתמשים: עשירה, אך מומלץ לפשט ולמנוע לוגיקה/פרומפטים מתוך UI.
- עקרון: ה־UI מציג, השירותים מחשבים/מתממשקים.

---

## C4 Model — תיאור טקסטואלי

- Context: מערכת שמאות/AVM עם אינטגרציות ממשלתיות ו־AI.
- Containers:
  - Frontend (React/Vite/Spark).
  - Backend (Express, עתידי: DB + APIs).
- Components:
  - UI Modules (קומפוננטים), Domain Engines (valuation/professionalAVM), Integrations (Gov APIs, PDF).
- Code:
  - טיפוסים/סקמות ב־`types.ts`, `valuationSchemas.ts`; שירותים מומלצים (ראו המלצות) עבור AI/נתונים.

---

## ליקויים עיקריים (ממצאים)

1. קריאות AI ישירות ב־UI → ערבוב שכבות.
2. שימוש רב ב־`any` → מוריד בטחון טייפי ובדיקה סטטית.
3. Audit Trail ברמת UI בלבד → חסר רישום אירועים שרתי.
4. חוסר Service Layer אחיד ל־APIים → קושי בהחלפת ספקים.

---

## המלצות (Prioritized)

1. Service Layer (גבוה עדות):
   - ליצור תיקייה `src/services/` עם:
     - `aiService.ts`: ממשק `AIService` + מימוש Spark; איסור עובדות חיצוניות בפרומפטים; JSON strict.
     - `govDataService.ts`: איחוד מקורות (nadlan/dataGov/iPlan/mavat/realGov) בממשק אחיד.
     - `valuationService.ts`: עטיפת קריאות למנועים ופלט אחיד לטיפוסים.
   - הקומפוננטים יקראו רק לשירותים.

2. Typing & Schemas:
   - להחליף `any` בטיפוסים מ־`types.ts`/Zod סקמות.
   - לחזק `jsonMode=true` ו־parser/validator בשירותים.

3. Audit & Logging:
   - להוסיף `eventLogger` בשירותים (client-side כבסיס; שרתי בהמשך) עם שדות: `event`, `source`, `timestamp`, `version`, `userId`.
   - לתעד מקורות נתונים במטא־דאטה.

4. Tests Expansion:
   - בדיקות ל־`professionalAVM.ts`, calculators, ו־service layer.

5. Infra:
   - להכין מסלול CI (`lint`, `build`, `test`).
   - בהמשך: DB ו־API אמיתיים לסשנים/דוחות/פרובננס.

---

## תכנית הטמעה הדרגתית

- שבוע 1: יצירת `src/services/*` והעברת קריאות AI/ממשל לשירותים עבור 2–3 מסכים מרכזיים (ReportGenerator, AdvancedMarketComparison).
- שבוע 2: טיפוסי נתונים ו־Zod validation בשירותים; הוספת Audit בסיסי.
- שבוע 3: בדיקות יחידה/אינטגרציה לכללי העסק המרכזיים.

---

## צ'קליסט לבקרה (לשימוש חוזר)

- UI:
  - [ ] הקומפוננט לא מבצע חישוב עסקי
  - [ ] אין קריאות ישירות ל־AI/API — רק דרך שירותים
  - [ ] טיפוסים ללא `any`

- Domain:
  - [ ] הכלל ממומש ב־`src/lib/*`
  - [ ] קיימות בדיקות

- Data:
  - [ ] לזרימה יש Metadata + Logging
  - [ ] ייצוא/ייבוא עומד בסכמה

- Integrations:
  - [ ] שכבת שירות יחידה
  - [ ] קל להחליף ספק

- Infra:
  - [ ] `lint`, `test`, `build` ב־CI
  - [ ] `/health` פעיל

---

## נספחים

- קבצים רלוונטיים:
  - UI: ראה [src/components](src/components)
  - לוגיקה עסקית: ראה [src/lib](src/lib)
  - סרבר: [backend/server.mjs](backend/server.mjs)
  - בדיקות: [src/lib/valuationEngine.test.ts](src/lib/valuationEngine.test.ts)

