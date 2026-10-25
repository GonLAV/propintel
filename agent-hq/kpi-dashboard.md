# PropIntel — לוח בריאות (KPI שלב-מוקדם)

> **חשוב:** אין עדיין משתמשים משלמים/לידים חיים, ולכן אין עדיין KPI עסקי אמיתי (המרה, churn, CAC וכו'). הלוח הזה עוקב אחרי **בריאות המוצר/הקוד** — מה שכן אפשר למדוד היום. כשיהיו משתמשים אמיתיים, נוסיף פה מדדי שימוש/עסק.

---

## מדדי בריאות קוד (מעודכן ע"י אהליאב בכל סבב עבודה)

| מדד | ערך אחרון | תאריך מדידה | מגמה |
|---|---|---|---|
| שגיאות lint (`npm run lint`) | **0 errors, 1 warning** (לא-קשור, `frontend/app/appraiser/register/page.tsx`) | 2026-10-25 | 🟢 **שופר (68→1).** 17 הקבצים שהוקצו ל-GitHub Copilot לפני חודשיים — ה-PR מעולם לא נוצר — נוקו ישירות ע"י הצוות (קומיט `d057698`): 67 האזהרות תוקנו באמת, לא הושתקו (2 מקרים בלבד עם `eslint-disable` ממוקד + הסבר, כששורש-הבעיה מצריך עריכת קבצים מחוץ-לתחום). `product-status.md` עודכן לסגור את הפריט. |
| בדיקות (`npm run test`) | **24/24 עוברות, 4 קבצי בדיקה** (`valuationEngine`, `aiComparableEngine`, `mvpComparableScoring`, `aiReportGenerator`) | 2026-10-25 | ➡ יציב (24/24→24/24, אותם קבצים) |
| כיסוי בדיקות | לא נמדד עדיין (`npm run test:coverage` לא הורץ) | — | — |
| פריטי חוב טכני פתוחים (`product-status.md`) | 10 פתוחים / 2 סגורים | 2026-09-08 | לא נמדד מחדש בסבב הזה (לא היה בתחום המדידה שהתבקשה) |
| סטטוס CI (build/lint/test) | ראו GitHub Actions | — | לא נמדד בסבב הזה |
| תלויות (`npm audit`) — `src/` הישן | **0** (תוקן 2026-10-25, קומיט `108b1f9`) | 2026-10-25 | 🟢 **תוקן (17→0).** `npm audit fix` לא-שובר תיקן 16/17; ה-17 (`zod`) דרש מעבר major (3→4) — נבדק תאימות בפועל לכל 7 הקבצים שמשתמשים ב-`zod` בקוד-ייצור, ונמצא+תוקן באג-תאימות אמיתי (`z.record(valueSchema)` חד-ארגומנט לא עובר type-check ב-v4, אף שרץ-נכון ברנטיים — תוקן ל-`z.record(z.string(), valueSchema)`). אומת: `npm audit` 0, `tsc --noEmit` נקי (מלבד שגיאה קיימת-מראש לא-קשורה שאומתה דרך `git stash`), lint זהה לבייסליין, 24/24 בדיקות. **ממצא-לוואי לא-קשור:** ה-build הישן (`vite build`) כבר שבור מסיבה נפרדת ולא-קשורה לתיקון הזה (ראו `roadmap.md`, יומן החלטות 2026-10-25) — לא תוקן, מחוץ לתחום. |
| תלויות (`npm audit`) — `saas-backend` + `frontend` | **0 + 0** (תוקן 2026-10-25, קומיט `aad30fe`) | 2026-10-25 | 🟢 **תוקן (5→0, 7→0).** היה רגרסיה מ-0 (09-09) על אותן גרסאות נעולות; תוקן בפועל (לא הושתק) — ראו "עדכון 2026-10-25 (אהליאב)" מתחת. |

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

### עדכון 2026-10-25 (אהליאב) — תיקון חוזר של `npm audit` ב-saas-backend + frontend

**תוקן בפועל (לא רק הושתק), באותה שיטה כמו ב-09-09.** `src/` הישן **לא נגעתי** — נשאר במפורש בחוץ לסבב הזה.

- **saas-backend**: 5 פגיעויות (4 high, 1 critical) → **0**. `npm audit fix` (לא-force) תיקן 4 מה-5 (`body-parser`, `brace-expansion`, `compression`, `proxy-addr` — ה-critical של IP spoofing). הנותר (`zod`, high) לא היה לו תיקון לא-שובר: **כל** שרשרת ה-3.x (עד 3.25.76, הגרסה המותקנת) פגיעה; התיקון היחיד הקיים הוא מעבר ל-4.6.7 (מעבר major). לפני שעשיתי את זה: בדקתי בסקריפט נפרד (zod@4.6.7 מותקן בסביבת בדיקה מבודדת) את **כל** דפוסי השימוש בפועל בקוד (`z.object/.string/.number/.enum/.coerce/.record(valueSchema)/.refine/.email/.toLowerCase/.strict()`, וצורת `ZodError.issues`) — כולם עברו זהה. עודכן `zod` ל-`^4.6.7` ב-`package.json`. **אומת:** `npm audit` 0, lint נקי (0 problems), סוויטת הבדיקות המלאה **45/45 עוברות** (Postgres+Redis+migrations+Chromium אמיתיים, לא מדולל), ובדיקת עשן חיה על שרת רץ: הרשמה→יצירת נכס (עברית, `areaSqm`, `metadata` כ-`z.record(z.any())`)→`GET /properties` — כל השלבים הצליחו עם המבנה הנכון.
- **frontend**: 7 פגיעויות (1 critical, 3 high, 3 moderate) → **0**. `npm audit fix` (לא-force) תיקן את `next` (**ל-16.4.3** — בתוך הטווח הקיים `^16.3.4`, **בלי** צורך ב-`npm install next@latest` הפעם; לא היה פער lockfile/install כמו ב-09-09), `sharp`, `source-map-js`. הנותרים: `postcss-selector-parser`/`tailwindcss` (moderate) ו-`zod` (high) — שניהם סימן `npm audit fix` כ"`--force`, Will install Xxx, breaking change". **נמנעתי מהשדרוג השובר של `tailwindcss` (3.4→4.x):** הוספתי override ל-`postcss-selector-parser@^7.1.6` (הטווח הפגיע היה `<7.1.6`) בלי לשדרג את `tailwindcss` עצמו — `npm ls` מאשר `tailwindcss@3.4.19` נשאר, `postcss-selector-parser@7.1.7 overridden`. `zod` — אותו מעבר ל-4.6.7 עם אותה בדיקת-תאימות (כולל `.transform()`+`.safeParse()`, דפוס ה-routes כאן). **אומת:** `npm audit` 0, `tsc --noEmit` 0 שגיאות, `vitest` **8/8 עוברות**, `next build` עובר (**30 routes**, זהה לבייסליין), `npm run security:scan` עובר ("Security check passed"), `npm run security:audit` עובר (היה נכשל לפני התיקון), lint מהשורש זהה לבייסליין (68 problems, 0 errors — אותה אזהרה הידועה ב-`appraiser/register/page.tsx` + 67 המוקצים ל-Copilot, אין רגרסיה חדשה), ובדיקת עשן חיה על שרת `next dev` בפועל: `/`, `/login`, `/appraiser/login` (200, כותרת עברית נכונה), `/dashboard` (307 — redirect מצופה ללא auth), `/api/health` (200).

**מסקנה:** אותו דפוס בדיוק מ-09-09 — `npm audit fix` הלא-שובר פותר את רוב הרשימה, ו-major bump (כש-npm מכריח) נבדק תאימות־קוד-בפועל לפני שמבוצע, לא רק "הרצתי ותיקווה". שני הקודבייסים חזרו ל-0 פגיעויות, בלי שינוי שלא נבדק.

**הערת שקיפות על תהליך המדידה:** בסביבת המדידה הזו לא היו מותקנים/מופעלים כברירת מחדל Postgres, Redis ו-Chromium (ל-Playwright/PDF export). הפעלתי את כולם מקומית כדי למדוד את חבילת הבדיקות המלאה של saas-backend כמו שהיא (לא דרך סביבה חסרה) — לפני שהורדתי Chromium, 4 בדיקות PDF-export נכשלו עם `storage_url: null`; אחרי התקנתו, **45/45 עוברות**, כלומר **אין רגרסיה אמיתית בקוד** — זו הייתה מגבלת סביבת-המדידה שלי, לא באג.

### עדכון 2026-10-25 (המשך) — `npm audit` תוקן גם ב-`src/` הישן (17→0)

בעקבות אישור המשתמש/ת ("תעבדו ותבנו כל מה שאפשר") — תוקן גם הקודבייס הישן, לא רק saas-backend/frontend. פירוט בטבלה למעלה. **חשוב:** זה תיקון-אבטחה (maintenance), לא השקעה ארכיטקטונית ב-`src/` — לכן לא נחשב כחוסם ע"י הכרעת-גורל-הקודבייסים הפתוחה. קומיט `108b1f9`.

**ממצא-לוואי שלא טופל בכוונה:** תוך כדי התיקון התגלה של-`src/` יש build שבור (`vite build`) מסיבה נפרדת ולא-קשורה — `vite.config.js`/`postcss.config.js` ישנים מסתירים את ה-config האמיתי, וגם באג-ייצוא נפרד ב-`notifications.ts`/`utils.js`. לא תוקן (עומק מעבר לתחום-אבטחה), תועד ב-`roadmap.md`.

## מדדי מוצר-עתידיים (יופעלו כשיהיו משתמשים)

- מספר שמאים רשומים
- שיעור המרה טיוטה→דוח שנשלח
- זמן ממוצע להכנת דוח
- Retention חודשי
- NPS / שביעות רצון

---

## עדכון אחרון

**2026-10-25 (אהליאב)** — תיקון בפועל (לא רק מדידה) של רגרסיית `npm audit` שאלעזר מצא באותו יום ב-`saas-backend` (5→0) וב-`frontend` (7→0), באותה שיטה כמו 09-09: `npm audit fix` לא-שובר קודם, ובדיקת-תאימות-קוד-בפועל לפני כל שדרוג major שנשאר (`zod` 3→4 בשני הקודבייסים; נמנעתי מ-`tailwindcss` 3→4 ע"י override ממוקד ל-`postcss-selector-parser`). אומת: lint נקי, `saas-backend` 45/45 בדיקות + עשן חי על שרת אמיתי (Postgres+Redis+migrations), `frontend` 8/8 בדיקות + `tsc --noEmit` נקי + `next build` 30 routes + `security:scan`/`security:audit` עוברים + עשן חי על `next dev`. `src/` הישן **לא נגעתי** — נשאר במפורש מחוץ לתחום (17 הפגיעויות שלו ממתינות למעקב נפרד). פירוט מלא מעלה.

**2026-10-25** — מדידה חדשה של אלעזר, חודש לאחר ה-baseline (2026-09-08/09), לאימות שהלוח לא stale. **תוצאה: lint/test/build/typecheck יציבים לגמרי בשלושת הקודבייסים** (ראו פירוט מעלה) — אין רגרסיית קוד. **הדגל האדום היחיד: `npm audit` החמיר בשלושתם** (legacy: 11→17; saas-backend: 0→5; frontend: 0→7, כולל critical חדש בכל אחד) — אך זה נובע מדיסקלוזורים חדשים על גרסאות נעולות שלא השתנו, לא מקוד שנכתב. `product-status.md` (חוב טכני, 10/2) ו-CI status לא נמדדו מחדש בסבב הזה — לא היו בתחום הבקשה.

**2026-09-08** — מדידה ראשונה: `npm ci` (573 חבילות), lint (69 בעיות), test (24/24). **עודכן באותו יום:** ה-error היחיד תוקן (ראו למעלה) — כעת 0 errors/67 warnings. 67 האזהרות הנותרות הוקצו ל-GitHub Copilot (17 קבצים, ראו `product-status.md`). פגיעויות `npm audit` (11, כולל 5 high) נוספו כפריט חדש ב-`product-status.md` — טרם נבדקו לעומק.
