# PropIntel — מצב מוצר וחוב טכני (חי)

> מקור: נגזר מ-`PRODUCT_ARCHITECTURE_AUDIT.md` (2026-01-03) + סקירת קוד. **אהליאב** מתחזק את הקובץ הזה — מסמן פריט כ-`[x]` כשנסגר בפועל (עם קומיט/PR), לא כשמתוכנן.

---

## ארכיטקטורה — שני קודבייסים

| | מיקום | סטטוס |
|---|---|---|
| אפליקציית Spark/Vite (המקורית) | `src/`, `backend/server.mjs` | עשירה בפיצ'רים, אחסון לקוח (`useKV`), אין DB שרתי חי |
| SaaS חדש (multi-tenant) | `saas-backend/`, `frontend/` | בבנייה — Postgres+Redis+JWT+RBAC לפי `README_SAAS_MVP.md` |

**החלטה פתוחה:** מה גורל שתי המערכות לטווח ארוך (מיזוג / הגירה הדרגתית / שתי מערכות מקבילות בכוונה)? מסומן ב"פתוח להכרעה" — אהליאב לא מכריע לבד, זו הכרעת מוצר.

---

## חוב טכני — מ-PRODUCT_ARCHITECTURE_AUDIT.md

### 1. Service Layer (עדיפות גבוהה)
- [ ] `src/services/aiService.ts` — עטיפת קריאות `window.spark.llm(...)` שכרגע מפוזרות בקומפוננטות (`AdvancedMarketComparison.tsx:93`, `ReportGenerator.tsx:116`, `AIValuation.tsx`).
- [ ] `src/services/govDataService.ts` — איחוד nadlan/dataGov/iPlan/mavat/realGov מאחורי ממשק אחיד.
- [ ] `src/services/valuationService.ts` — עטיפת מנועי השומה, פלט אחיד.
- [ ] קומפוננטות UI קוראות רק לשירותים — לא מבצעות חישוב/בניית-פרומפט בעצמן.

### 2. טיפוסים ו-Validation
- [ ] הסרת `any` נרחב (UI + `src/lib`) — במיוחד ב-integration files.
- [ ] Zod validation אחיד בשירותים (יש כבר `valuationSchemas.ts` — להרחיב לכל השירותים).

### 3. Audit Trail
- [ ] אין רישום אירועים בצד שרת כרגע — רק קומפוננטת UI (`AuditTrail.tsx`).
- [ ] להוסיף `eventLogger` בשירותים: `event`, `source`, `timestamp`, `version`, `userId`.

### 4. בדיקות
- [x] `src/lib/valuationEngine.test.ts`, `aiComparableEngine.test.ts`, `mvpComparableScoring.test.ts`, `aiReportGenerator.test.ts` — כל 24 הבדיקות עוברות (נבדק 2026-09-08).
- [ ] בדיקות ל-`professionalAVM.ts` וה-calculators הספציפיים (Adjustment/Weighted-Average/Cost-Approach/Income-Capitalization/Multi-Unit) — עדיין אין.
- [ ] בדיקות לשכבת השירותים החדשה (כשתיבנה).
- [ ] כיסוי בדיקות באחוזים — `npm run test:coverage` טרם הורץ.

### 5. תלויות (חדש — 2026-09-08, מ-`npm audit`)
- [ ] **11 פגיעויות: 2 low, 4 moderate, 5 high.** טרם נבדק אילו הן ב-dev-dependencies בלבד (סיכון נמוך) לעומת תלויות ייצור (סיכון גבוה). **לפני `npm audit fix` — לבדוק breaking changes**, לא להריץ עיוור.

### 6. Infra / CI
- [x] CI לבדיקות איכות בסיסיות (production quality gates, security scanning — לפי git log).
- [ ] `lint` נקי — נמדד 2026-09-08: **69 בעיות (1 error, 68 warnings)**. רוב האזהרות הן `no-unused-vars`/`react-refresh` קלות לתיקון; ה-error היחיד (`no-empty-pattern`, `src/lib/PageNotFound.jsx:6`) הוא באג אמיתי קטן, לא סגנון.
- [ ] `node_modules` לא היה מותקן בסביבת הפיתוח הזו — `npm ci` הריץ בהצלחה (573 חבילות). אם זה קורה גם בסביבות אחרות, כדאי לוודא שה-README מנחה `npm ci` כצעד ראשון.
- [ ] `npm audit`: 11 פגיעויות (2 low, 4 moderate, 5 high) — לא סווגו עדיין (dev-only מול production-impacting).

---

## מה כן עובד (MVP-ready, לפי IMPLEMENTATION_ROADMAP.md)

- מנוע שומה: השוואה / עלות / היוון + Hybrid Reconciliation + Decision Engine.
- Zod schemas לישויות הליבה.
- CSV/JSON import עם validation.
- Report Generator + PDF export (jsPDF) + branding.
- אינטגרציות ממשלתיות: data.gov.il, nadlan.gov.il (production-grade לפי PRD).

---

## עבודה מוקצית ל-GitHub Copilot (2026-09-08)

כדי לעבוד במקביל לסוכני Claude בלי התנגשות, הוקצו ל-Copilot **67 אזהרות ה-lint שנותרו** (0 errors, כל השגיאות האמיתיות כבר תוקנו). רשימת קבצים סגורה — 17 קבצים תחת `src/`:

```
src/components/AutomatedReports.jsx
src/components/BettermentLevyCalculator.jsx
src/components/BulkValuation.jsx
src/components/OCRHelper.jsx
src/components/OfficeValuationCalculator.jsx
src/components/Property3DView.jsx
src/components/cases/CaseTimeline.jsx
src/components/dashboard/RecentActivity.jsx
src/components/property-management/IncomeExpenseTracker.jsx
src/components/property-management/TenantManager.jsx
src/components/ui/badge.jsx
src/components/ui/button.jsx
src/components/ui/form.jsx
src/components/ui/navigation-menu.jsx
src/components/ui/sidebar.jsx
src/components/ui/toggle.jsx
src/lib/AuthContext.jsx
```

**גבול מוסכם:** Copilot לא נוגע ב-`agent-hq/` וב-`Plugin/` (תחום הסוכנים). Claude לא נוגע ברשימת 17 הקבצים האלה עד שה-PR של Copilot נסגר, כדי למנוע קונפליקטים. סטטוס: [ ] טרם בוצע.

## עדכון אחרון

**2026-09-08** — נוצר לראשונה על ידי אהליאב, מתוך `PRODUCT_ARCHITECTURE_AUDIT.md`. בוצעה מדידה ראשונה בפועל (lint+test, ראו `kpi-dashboard.md`). עדיין לא בוצע תיקון קוד בפועל — הפריט המומלץ הבא: תיקון שגיאת ה-lint היחידה (`no-empty-pattern`), משימה קטנה ובטוחה לפתוח בה.
