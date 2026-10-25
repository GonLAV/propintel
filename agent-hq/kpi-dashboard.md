# PropIntel — לוח בריאות (KPI שלב-מוקדם)

> **חשוב:** אין עדיין משתמשים משלמים/לידים חיים, ולכן אין עדיין KPI עסקי אמיתי (המרה, churn, CAC וכו'). הלוח הזה עוקב אחרי **בריאות המוצר/הקוד** — מה שכן אפשר למדוד היום. כשיהיו משתמשים אמיתיים, נוסיף פה מדדי שימוש/עסק.

---

## מדדי בריאות קוד (מעודכן ע"י אהליאב בכל סבב עבודה)

| מדד | ערך אחרון | תאריך מדידה | מגמה |
|---|---|---|---|
| שגיאות lint (`npm run lint`) | **0 errors, 67 warnings** (זהה ל-2026-09-08 — 17 הקבצים המוקצים ל-Copilot) | 2026-10-25 | ➡ יציב (67→67). **הערת מתודולוגיה:** `eslint .` מהשורש סורק גם את `frontend/` בדרך; בפועל הפלט הגולמי מציג "68 problems" כי יש אזהרת `no-unused-vars` חדשה בקובץ אחד ב-`frontend/app/appraiser/register/page.tsx` — לא קשור לקוד הישן (`src/`) ולא ל-17 הקבצים שבאחריות Copilot. ה-67 הרלוונטי ל-baseline זהה בדיוק. |
| בדיקות (`npm run test`) | **24/24 עוברות, 4 קבצי בדיקה** (`valuationEngine`, `aiComparableEngine`, `mvpComparableScoring`, `aiReportGenerator`) | 2026-10-25 | ➡ יציב (24/24→24/24, אותם קבצים) |
| כיסוי בדיקות | לא נמדד עדיין (`npm run test:coverage` לא הורץ) | — | — |
| פריטי חוב טכני פתוחים (`product-status.md`) | 10 פתוחים / 2 סגורים | 2026-09-08 | לא נמדד מחדש בסבב הזה (לא היה בתחום המדידה שהתבקשה) |
| סטטוס CI (build/lint/test) | ראו GitHub Actions | — | לא נמדד בסבב הזה |
| תלויות (`npm audit`) | **17 פגיעויות (1 low, 6 moderate, 9 high, 1 critical)** — עדיין `npm audit fix` לא הורץ | 2026-10-25 | 🔴 **החמיר (11→17, ונוסף critical ראשון).** לא נובע משינוי קוד — אין commit חדש ב-`src/`/תלויותיו מאז 09-08. הסיבה: דיסקלוזורים חדשים (CVE) שהתגלו בחודש האחרון על **אותן גרסאות נעולות** בדיוק (`zod`, `qs`, `postcss`, `vite`, `js-yaml`, `nanoid`, `brace-expansion`, `dompurify`, `esbuild`, `fflate`, `body-parser`, `@humanfs/node`, `@vitest/mocker`). עדיין לא סווג dev-only מול production-impacting. |

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

### עדכון 2026-10-25 — מדידה חדשה (אלעזר): בדיקת עדכניות הלוח, חודש לאחר ה-baseline

> חלף חודש מהמדידה הקודמת. בדקתי בפועל (לא הנחתי שהלוח עדיין נכון) — להלן השוואה ישירה.

| מדד | saas-backend | frontend |
|---|---|---|
| Lint | **0 problems** (יציב) | `tsc --noEmit`: **0 errors** (יציב) |
| בדיקות | **45/45 עוברות** (יציב, זהה ל-09-09) | **8/8 עוברות** (יציב) |
| Build | — | **production build עובר, 30 routes** (יציב, זהה למדידת 09-09) |
| `npm audit` | 🔴 **5 פגיעויות (4 high, 1 critical)** — היה **0** | 🔴 **7 פגיעויות (3 moderate, 3 high, 1 critical)** — היה **0** |
| `npm run security:scan` | — | **עובר** ("Security check passed") |
| `npm run security:audit` | — | 🔴 **נכשל** (exit 1) — אותן 7 הפגיעויות מה-`npm audit` (הסקריפט מריץ `npm audit --audit-level=moderate`) |

**הדגל האדום המרכזי של הסבב הזה: שני ה-`npm audit` שתוקנו ואומתו ב-0 ב-2026-09-09 חזרו לפגיעויות.** זו **לא** רגרסיית קוד — לא נגענו ב-`package.json`/`package-lock.json` מאז קומיט `d556ea0`, וה-lockfile זהה. הסיבה: דיסקלוזורים חדשים (CVE) שהתפרסמו בחודש שחלף, על **אותן גרסאות נעולות בדיוק** שהיו "נקיות" ברגע המדידה הקודמת:
- **saas-backend** (5): `body-parser` (high, DoS), `brace-expansion` (high, DoS), `compression` (high, DoS), `proxy-addr` (**critical** — IP spoofing דרך IPv4-mapped IPv6), `zod` (high, memory exhaustion).
- **frontend** (7): `next` (**critical** — RCE דרך `next/og` ImageResponse, ועוד 10 מזהי CVE נוספים על `next` כולל cache poisoning ו-SSRF), `postcss-selector-parser`/`tailwindcss` (moderate), `sharp` (high), `source-map-js` (high), `zod` (high).

**המשמעות התפעולית:** "0 פגיעויות" אחרי `npm audit fix` הוא תמונת-מצב לרגע המדידה בלבד, לא מצב קבוע — מסד הנתונים של npm ממשיך לצמוח גם בלי שינוי קוד. **המלצה לצוות (לא מכריע/מתקן על ידי):** להריץ `npm audit` באופן מחזורי (לא רק אחרי "סגירת פריט"), ובמיוחד לבדוק את `next` ב-saas כי ה-critical כולל RCE בפרודקשן.

**הערת שקיפות על תהליך המדידה:** בסביבת המדידה הזו לא היו מותקנים/מופעלים כברירת מחדל Postgres, Redis ו-Chromium (ל-Playwright/PDF export). הפעלתי את כולם מקומית כדי למדוד את חבילת הבדיקות המלאה של saas-backend כמו שהיא (לא דרך סביבה חסרה) — לפני שהורדתי Chromium, 4 בדיקות PDF-export נכשלו עם `storage_url: null`; אחרי התקנתו, **45/45 עוברות**, כלומר **אין רגרסיה אמיתית בקוד** — זו הייתה מגבלת סביבת-המדידה שלי, לא באג.

## מדדי מוצר-עתידיים (יופעלו כשיהיו משתמשים)

- מספר שמאים רשומים
- שיעור המרה טיוטה→דוח שנשלח
- זמן ממוצע להכנת דוח
- Retention חודשי
- NPS / שביעות רצון

---

## עדכון אחרון

**2026-10-25** — מדידה חדשה של אלעזר, חודש לאחר ה-baseline (2026-09-08/09), לאימות שהלוח לא stale. **תוצאה: lint/test/build/typecheck יציבים לגמרי בשלושת הקודבייסים** (ראו פירוט מעלה) — אין רגרסיית קוד. **הדגל האדום היחיד: `npm audit` החמיר בשלושתם** (legacy: 11→17; saas-backend: 0→5; frontend: 0→7, כולל critical חדש בכל אחד) — אך זה נובע מדיסקלוזורים חדשים על גרסאות נעולות שלא השתנו, לא מקוד שנכתב. `product-status.md` (חוב טכני, 10/2) ו-CI status לא נמדדו מחדש בסבב הזה — לא היו בתחום הבקשה.

**2026-09-08** — מדידה ראשונה: `npm ci` (573 חבילות), lint (69 בעיות), test (24/24). **עודכן באותו יום:** ה-error היחיד תוקן (ראו למעלה) — כעת 0 errors/67 warnings. 67 האזהרות הנותרות הוקצו ל-GitHub Copilot (17 קבצים, ראו `product-status.md`). פגיעויות `npm audit` (11, כולל 5 high) נוספו כפריט חדש ב-`product-status.md` — טרם נבדקו לעומק.
