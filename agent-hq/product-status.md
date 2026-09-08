# PropIntel — מצב מוצר וחוב טכני (חי)

> מקור: נגזר מ-`PRODUCT_ARCHITECTURE_AUDIT.md` (2026-01-03) + סקירת קוד. **אהליאב** מתחזק את הקובץ הזה — מסמן פריט כ-`[x]` כשנסגר בפועל (עם קומיט/PR), לא כשמתוכנן.

---

## ⚠️ ממצא חמור — ציטוטים מומצאים ל"תקן שמאי 19" בקוד הישן (`src/`) — 2026-09-08 (כלב)

תוך כדי מחקר על סטנדרטים אמיתיים לדוח שומה (ראו `agent-hq/report-standards.md`), כלב קרא את **הטקסט הרשמי המלא** של תקן שמאי 19 (PDF, gov.il) והשווה מול ציטוטים קיימים בקוד:

- `src/lib/calculators/adjustmentCalculator.ts:235,262` — מצטט `'תקן שמאי 19 - סעיף 4.2'` כמקור ל"התאמת קומה". **בפועל, סעיף 4.2 האמיתי בתקן עוסק בזהות מזמין השומה — לא קשור בכלל.**
- `calculatorValidation.ts:315-365` — מצטט `'תקן שמאי 19 - סעיף 5.1'` כמקור ל"מצב פיזי". **סעיף כזה לא קיים; סעיף 5 האמיתי הוא "סטיה מהתקן".**
- מקור מצוטט `'מכון השמאים בישראל'` — **גוף כזה לא אותר**; הגוף הרשמי הוא מועצת שמאי המקרקעין / הוועדה לתקינה שמאית (משרד המשפטים).
- **תקן 19 עצמו מחריג במפורש שומות משכנתא למגורים** ("התקן לא יחול על שומות לדירות מגורים... לצורך קבלת הלוואה לדיור") — כך שגם השימוש בשם התקן הזה, לא רק במספרי הסעיפים, עשוי להיות שגוי עבור רוב לקוחות PropIntel.

**למה זה חמור:** ה-PRD מתאר את "Professional Calculation System" הזה במפורש כ"כל מחשבון מתועד עם מקור חוקי (Appraiser Standard 19-22)" — כלומר **המוצר כרגע מציג לשמאי מוסמך ציטוטים משפטיים-מקצועיים שאינם אמיתיים, כעובדה**. זה לא רק באג דיוק — זה סיכון אמינות/משפטי ממשי למוצר מקצועי.

**סטטוס:** [ ] לא תוקן. דורש בדיקה שיטתית של **כל** הציטוטים ל"תקן שמאי" ברחבי `src/lib/calculators/` מול הטקסט הרשמי (תקן 19 + תקן 1.1, שני המקורות מתועדים ב-`report-standards.md`), לא רק שני המקומות שנבדקו כאן.

## חיבור מנוע השומה ל-API — 2026-09-08 (אהליאב)

**המשך ישיר לתיקון הקריטי למטה.** אחרי שהאישור ל-"MVP מדהים" ניתן, נבדק אם אפשר להריץ שומה אמיתית מקצה לקצה דרך ה-API. גילוי: `saas-backend` **כבר כולל מנוע שומה עצמאי ומלא** (`services/valuationEngine.js` — comparables/cost/income/reconciled, כולל התאמות, ציוני ביטחון, ופירוק חישוב מלא) עם routes/controllers/repositories מחוברים — **לא היה צריך "לחבר" את מנוע ה-TypeScript הישן מ-`src/lib/`, יש כאן מימוש מקביל שכבר עובד.**

**אבל נמצא חור אמיתי:** לשיטת `comparables` (ולכן גם `reconciled`) אין שום דרך להזין עסקאות-השוואה — `comparables.repository.js#insert` היה קיים, אבל **בלי controller/validator/route**. כלומר שיטת השומה המרכזית (שוק שמאות מבוסס-השוואה) לא הייתה שמישה כלל דרך ה-API.

**תוקן:** נוסף `/api/v1/comparables` (GET+POST) — validator, service, controller, route — לפי אותה קונבנציה בדיוק כמו `/properties`. תועד ב-`openapi.json`.

**אומת מקצה לקצה על DB/Redis אמיתיים:** register→property→5 comparables→valuation. תוצאה אמיתית: שומת-השוואה ₪2,124,047 (ביטחון 0.812, 5 עסקאות), שומה משוקללת (reconciled) ₪1,956,052. נוספה בדיקת רגרסיה אמיתית (`tests/integration/valuation.e2e.test.js`) — 34/34 בדיקות עוברות, lint נקי.

**עודכן 2026-09-08 — תוקן:** שיטת ה-`cost` שדרגה. הוספה טכניקת **abstraction/allocation** מקצועית ומוכרת: כשיש ≥3 עסקאות-השוואה מקומיות, ערך הקרקע לא נלקח יותר מטבלה ארצית שטוחה — הוא נגזר מהפרש בין המחיר החציוני המתואם בשוק (מאותן עסקאות) לבין עלות הבנייה המופחתת. זה נתון אמיתי מהדאטה של אותו tenant, לא ניחוש. **תוצאה על אותו נכס:** ₪905,250 → **₪1,147,969** (ביטחון 0.6→0.68). עדיין נמוך מ-comparables (₪2.12M) בכוונה — cost approach אמור להישאר שיטה עצמאית, לא הד לשיטת ההשוואה — אבל כבר לא מוטה כלפי מטה בגלל טבלה ארצית לא-רלוונטית. `landValueSource` ('market-abstraction'/'national-default') חשוף בפלט לשקיפות. פחות מ-3 עסקאות באזור → נופל חזרה לטבלה הארצית (ומסומן ככזה). 2 בדיקות יחידה חדשות + כל 36 הבדיקות עוברות.

## תיקון קריטי — 2026-09-08 (אהליאב)

**המשתמש/ת ביקש/ה לבנות "MVP מדהים" — נבדק בפועל מה עובד ב-`saas-backend/`, לא רק תועד מהמסמכים.** התוצאה: התשתית בשלה משמעותית ממה שה-README/roadmap הישנים משקפים (auth מלא, JWT, multi-tenant, migrations אמיתיות, audit trail בצד שרת — כל הדברים ש"חסרים" ב-`src/` הישן, **כבר קיימים כאן**). אבל נמצא באג שחוסם MVP לגמרי:

- **`register()` (הרשמת דייר חדש) נכשל תמיד ב-500.** `withTransaction` יצר tenant+user על connection אחד (ה-transaction client), אבל `issueRefreshToken` הכניס את ה-refresh token דרך ה-pool הגלובלי — connection **אחר**, שעדיין לא רואה את ה-user (לא קומיט). Foreign key violation בכל הרשמה.
- **תוקן:** `refreshTokens.repository.js#insert` מקבל עכשיו `client` מפורש (כמו `users`/`tenants` repos), ו-`auth.service.js` מעביר את ה-transaction client ב-`register()`.
- **אומת בפועל:** הרצתי Postgres+Redis אמיתיים, migrations, register→login→`/me` מקצה לקצה — עובד. 32/32 בדיקות עוברות (כולל 2 חדשות).
- **פער-בדיקות שגילה את זה:** קובץ ה-"אינטגרציה" הקיים (`auth.test.js`) **ממוקמָק DB לגמרי** — אף פעם לא נגע ב-Postgres אמיתי, ולכן לא תפס את הבאג. נוסף `tests/integration/auth.e2e.test.js` — DB/Redis אמיתיים, מדלג בעדינות אם אין Postgres זמין. אומת שהוא **נכשל** על הקוד הישן (revert זמני) ו**עובר** על התיקון.
- **CI תוקן במקביל:** `ci-cd.yml` הריץ Postgres/Redis אמיתיים ב-job של `saas-backend` אבל **מעולם לא הריץ migrations** — כלומר הבדיקות המקצועיות תמיד רצו על DB ריק/לא-קיים ולא היו יכולות לתפוס באג כזה גם אם היה קובץ בדיקה. נוסף שלב `Migrate` לפני `Test`.

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

## מה כן עובד ב-`saas-backend/` (אומת בפועל, 2026-09-08 — לא מהמסמכים)

- **Auth מלא**: register/login/refresh/logout/`me`, JWT (access+refresh, refresh-token rotation עם family-revocation על reuse), bcrypt, rate limiting (Redis-backed).
- **Multi-tenant אמיתי**: tenant/user/property/valuation/report/comparable_sales/audit_logs/password_resets — כל הסכימה ב-migrations אמיתיות (3 קבצי SQL), רצה נקי.
- **Audit trail בצד שרת קיים כבר** (`writeAudit`, טבלת `audit_logs`) — זה בדיוק מה שסומן כחסר ב-`src/` הישן; **לא חסר כאן**.
- **הצעד הבא ההגיוני ל"MVP מדהים":** לחבר את מנוע השומה (`src/lib/valuationEngine.ts` וכו') ואת ה-frontend ל-API הזה, במקום להמשיך לבנות עליו במקביל לאפליקציה הישנה. זו בדיוק ההכרעה שסומנה למטה תחת "פתוח להכרעה" — עכשיו יש עוד סיבה טובה להכריע: ה-backend כאן עובד ומוכן יותר משנראה.

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
