# PropIntel — לוח בריאות (KPI שלב-מוקדם)

> **חשוב:** אין עדיין משתמשים משלמים/לידים חיים, ולכן אין עדיין KPI עסקי אמיתי (המרה, churn, CAC וכו'). הלוח הזה עוקב אחרי **בריאות המוצר/הקוד** — מה שכן אפשר למדוד היום. כשיהיו משתמשים אמיתיים, נוסיף פה מדדי שימוש/עסק.

---

## מדדי בריאות קוד (מעודכן ע"י אהליאב בכל סבב עבודה)

| מדד | ערך אחרון | תאריך מדידה | מגמה |
|---|---|---|---|
| שגיאות lint (`npm run lint`) | **0 errors, 67 warnings** — ה-error היחיד (`no-empty-pattern`, `PageNotFound.jsx:6`) תוקן ע"י אהליאב (קומיט `c488038`) | 2026-09-08 | ⬇ שופר (69→67, כולל תיקון ה-error) |
| בדיקות (`npm run test`) | **24/24 עוברות, 4 קבצי בדיקה** (`valuationEngine`, `aiComparableEngine`, `mvpComparableScoring`, `aiReportGenerator`) | 2026-09-08 | יציב |
| כיסוי בדיקות | לא נמדד עדיין (`npm run test:coverage` לא הורץ) | — | — |
| פריטי חוב טכני פתוחים (`product-status.md`) | 10 פתוחים / 2 סגורים | 2026-09-08 | — |
| סטטוס CI (build/lint/test) | ראו GitHub Actions | — | — |
| תלויות (`npm audit`) | 11 פגיעויות (2 low, 4 moderate, 5 high) — לא נבדק לעומק, `npm audit fix` לא הורץ | 2026-09-08 | — |

## saas-backend + frontend — מדידה ראשונה (אלעזר, 2026-09-08 ~10:26-10:28 UTC)

> קודבייס נפרד מ-`src/` הישן — אין עדיין baseline קודם להשוואה, אלה המדידות הראשונות.

| מדד | saas-backend | frontend |
|---|---|---|
| Lint | 0 problems | `tsc --noEmit`: 0 errors |
| בדיקות | 36/36 (בזמן המדידה — עלה ל-39/39 אחרי שאהליאב סיים PDF export) | 8/8 |
| Build | — | production build עובר, 29 routes |
| `npm audit` | **0** (תוקן — ראו למטה) | **0** (תוקן — ראו למטה) |

**הערה:** saas-backend נערך במקביל למדידה (אהליאב עבד על PDF export) — המספרים תקפים לרגע המדידה, לא final. לא נמצאה רגרסיה.

### עדכון 2026-09-09 — סגירת פריט #1 מישיבת הצוות (npm audit)

- **saas-backend**: 7 פגיעויות → **0**. תיקון: `overrides: {"qs": "^6.16.0"}`. אומת עצמאית: `npm ci` נקי, `npm audit` 0, סוויטת הבדיקות המלאה 45/45 עוברות, lint נקי, ושרת אמיתי רץ עם בדיקת עשן חיה (הרשמה → יצירת נכס → `GET /properties` עם פרמטר `q` בעברית → `GET /reports` עם סינון `propertyId`) — כולם 200 עם נתונים נכונים.
- **frontend**: 7 פגיעויות (כולל `next` ברמת **critical**!) → **0**. הסיבה לפער מהמדידה הקודמת (6): התגלה שה-lockfile היה "תקוע" על `next@16.2.4` הפגיע בעוד ש-`node_modules` בפועל כבר הכיל `16.3.4` — פער lockfile/install. תוקן: `npm install next@latest` (מסנכרן ל-`^16.3.4`) + `npm audit fix` (מטפל בתלויות טרנזיטיביות: browserslist, nanoid, postcss, postcss-selector-parser, baseline-browser-mapping) — ללא `--force`, בלי שדרוגי-שבירה. אומת: `tsc --noEmit` נקי, `next build` עובר (30 routes), `vitest` 8/8, סקריפטי האבטחה הפנימיים (`security:scan`+`security:audit`) עוברים, ובדיקת עשן חיה של שרת ה-dev (`/appraiser/login` מחזיר 200 תחת Next 16.3.4 בפועל).
- קומיט: `d556ea0`, נדחף ל-`claude/plugins-folder-hooks-541i5v`.

## מדדי מוצר-עתידיים (יופעלו כשיהיו משתמשים)

- מספר שמאים רשומים
- שיעור המרה טיוטה→דוח שנשלח
- זמן ממוצע להכנת דוח
- Retention חודשי
- NPS / שביעות רצון

---

## עדכון אחרון

**2026-09-08** — מדידה ראשונה: `npm ci` (573 חבילות), lint (69 בעיות), test (24/24). **עודכן באותו יום:** ה-error היחיד תוקן (ראו למעלה) — כעת 0 errors/67 warnings. 67 האזהרות הנותרות הוקצו ל-GitHub Copilot (17 קבצים, ראו `product-status.md`). פגיעויות `npm audit` (11, כולל 5 high) נוספו כפריט חדש ב-`product-status.md` — טרם נבדקו לעומק.
