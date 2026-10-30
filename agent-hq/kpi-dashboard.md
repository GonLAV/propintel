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

### עדכון 2026-10-29 — Baseline (אלעזר): לפני סבב "מוכנות למשתמש אמיתי"

> המשתמש/ת ביקש/ה מכל הצוות לדחוף את המוצר לקראת מוכנות-למשתמש-אמיתי, וכמה סוכני-בנייה עומדים להתחיל לעבוד במקביל. מדידה נקייה **לפני** שזה מתחיל, כדי שיהיה "לפני" אמיתי להשוואה. סבב הבנייה שכבר קרה (npm audit fixes, סעיף זכויות-משפטיות/סטטוס-תכנוני, סעיף "עקרונות, גורמים ושיקולים", תיקון באג חישוב אמיתי בהתאמת-גודל ב-comparables) **כן** נכלל במדידה הזו.
>
> **הערת שקיפות:** Postgres+Redis לא היו פעילים בתחילת המדידה — הפעלתי (`service postgresql start`, `service redis-server start`), אימתתי `pg_isready`/`redis-cli ping` אחרי. `npm run migrate` → "No migrations to run!" (הסכימה מעודכנת, אין פריט ממתין). Chromium (ל-Playwright/PDF-export) מותקן מראש בסביבה הזו (`/opt/pw-browsers`) — לא נדרשה פעולה. לא נגעתי בקוד, ב-`package.json`/lockfile, או ב-git — רק קריאה/הרצה, ועדכון הקובץ הזה.

| מדד | saas-backend | frontend |
|---|---|---|
| Lint / Typecheck | **0 problems** (יציב, זהה ל-10-25) | `tsc --noEmit`: **0 errors** (יציב) |
| בדיקות | **46/46 עוברות**, 11 קבצי בדיקה (היה 45/45 ב-10-25 — **+1**) | **8/8 עוברות**, קובץ בדיקה אחד (יציב, זהה ל-10-25) |
| Build | — | **production build עובר, 36 routes** (היה 30 ב-10-25 — **+6**) |
| `npm audit` | 🔴 **8 פגיעויות (6 low, 2 moderate)** — היה **0** | **0 פגיעויות** (יציב) |
| `npm run security:scan` | — | **עובר** ("Security check passed") |
| `npm run security:audit` | — | **עובר, 0 פגיעויות** (יציב) |

**הדגל האדום של הסבב הזה: `npm audit` ב-saas-backend חזר לפגיעויות (0→8: 6 low, 2 moderate).** בדקתי לפני שמדווחת — **זו לא רגרסיית קוד**: `npm ls qs` מאשר שה-override הממוקד מ-10-25 עדיין במקום בדיוק (`qs@6.16.0 overridden`, בכל 3 מסלולי התלות: express, body-parser, supertest). מה שקרה: דיסקלוזורים חדשים על **אותן גרסאות נעולות** — אותה תבנית בדיוק כמו הרגרסיה שתועדה ב-10-25:
- `qs@6.16.0` (moderate, DoS, `GHSA-6pq8-jhm2-2vcw`) — הטווח הפגיע המדווח כעת (`6.7.0 - 6.16.0`) **כולל** את הגרסה שננעלה בכוונה ב-10-25 כתיקון. ה-override הקיים כבר לא מספיק.
- `deepmerge@4.3.1` (6 פגיעויות low, prototype poisoning, `GHSA-gcqx-w48m-w2h4`) — תלות-פיתוח בלבד, מגיעה דרך `jest-config`→`@jest/core`→`jest`. ה-`npm audit fix --force` שה-npm מציע ידרג `jest` בחזרה לגרסה `25.1.0` — שדרוג-לאחור שובר, לא רלוונטי כפתרון.

**מסירה לאהליאב — לא תיקנתי:** qs דורש בדיקת-override מעודכן (גרסה מעל 6.16.0, אם קיימת תיקון זמין, או לבדוק אם גרסת express עדכנית-יותר כבר לא תלויה ב-qs הפגיע); deepmerge הוא dev-only (לא מגיע ל-production) — עדיפות נמוכה יותר אך לא אפס.

**שני שינויים נוספים — לא דגל אדום, תוצר-לוואי צפוי של הסבב שכבר קרה, מתועד כדי שהבייסליין הבא (אחרי סבב "מוכנות למשתמש") לא יתבלבל בינם לבין שינוי חדש:**
- saas-backend: 45→**46** בדיקות עוברות. קובץ `tests/integration/appraiser-review-fields.e2e.test.js` נראה הכי קשור לסעיפים החדשים בדוח — **לא אימתתי ב-git log** (מחוץ לתחום המשימה הזו), זו השערה סבירה בלבד ולא עובדה מאומתת.
- frontend: 30→**36** routes. תואם ישירות למה שנצפה ב-output של ה-build: נוספו `/dashboard/planning` + `/api/planning/compare` + `/api/planning/memo` (זכויות-משפטיות/סטטוס-תכנוני), `/dashboard/deal-twin` + `/api/intelligence/deal-twin`, ו-`/dashboard/settings`. **לתשומת לב הצוות (לא מכריעה):** קובץ-הבדיקות של frontend נשאר קובץ אחד / 8 בדיקות — בלי גידול מקביל לגידול ב-routes. לא בדקתי אם זה מכוון (כיסוי בשיטה אחרת) או פער בכיסוי.

`product-status.md` (חוב טכני) ו-CI status לא נמדדו מחדש בסבב הזה — לא היו בתחום הבקשה. `customer-knowledge.md` עדיין ריק — נשארתי במדדי בריאות-קוד בלבד, כצפוי.

### עדכון 2026-10-30 — מדידה חדשה (אלעזר): אחרי סבב "מוכנות למשתמש אמיתי"

> סבב הבנייה שה-baseline הקודם (2026-10-29) נמדד *לפניו* ("comparable-sale delete", סיכום-התאמות דינמי בדוח, תיקון-visibility ליומן reset-token, עריכת מספר-רישוי, סיבות-כשל-שומה אמיתיות, PDF ל-2 עמודים, flagging להרשמה-כפולה, תרגום עברי לנתיבי-שגיאה, mobile nav, תאריכים RTL, grid מובייל, ובעיקר silent access-token refresh + תיקון race-condition ב-refresh-token-rotation) — נמדד כאן *אחריו*. לא הנחתי שהתיאור של הסבב נכון; מדדתי בעצמי לפני כתיבת השורה הזו.
>
> **הערת שקיפות:** Postgres+Redis לא היו פעילים בתחילת המדידה — הפעלתי (`service postgresql start`, `service redis-server start`), אימתתי (`pg_lsclusters`→online, `redis-cli ping`→PONG). role/db `test` (`postgres://test:test@localhost:5432/test`) כבר קיימים; `DATABASE_URL=... npm run migrate` → "No migrations to run!". לא נגעתי בקוד, ב-`package.json`/lockfile, או ב-git — רק קריאה/הרצה, ועדכון הקובץ הזה.

| מדד | saas-backend | frontend |
|---|---|---|
| Lint | **0 problems** (יציב) | `tsc --noEmit`: **0 errors** (יציב). `npx eslint .` (קונפיג-שורש של המונורפו — אין סקריפט lint ייעודי ב-frontend): **0 errors, 0 warnings**, 93 קבצים — שורה חדשה בהשוואה הזו, לא נמדדה כנפרדת קודם, יוצאת נקייה |
| בדיקות | **62/62 עוברות**, 14 קבצי בדיקה (היה 46/46, 11 קבצים ב-10-29 — 🟢 **+16 בדיקות, +3 קבצים**) | **8/8 עוברות** (יציב) |
| Build | — | **production build עובר, 37 routes** (baseline דיווח 36 — ראו הערה למטה: כנראה ספירה שגויה, לא שינוי אמיתי) |
| `npm audit` (`--audit-level=moderate`) | 🟢 **6 פגיעויות (כולן low)** — היה **8 (6 low, 2 moderate)** ב-10-29 | **0 פגיעויות** (יציב) |
| `npm run security:scan` | — | **עובר** ("Security check passed") |
| `npm run security:audit` | — | **עובר, 0 פגיעויות** (יציב) |

**אין רגרסיה בשום מדד, בשני הקודבייסים.** זה שונה מהשתיים-ברצף שקדמו (10-25 ו-10-29), ששתיהן דיווחו דגל-אדום ב-`npm audit`.

**מה שאושר כאמיתי מהסבב שתואר:** גידול הבדיקות ב-saas-backend (46→62, קבצי-בדיקה 11→14) תואם לכמות ולסוג הפיצ'רים שתוארו. ספציפית בדקתי שתיקון ה-race-condition ב-refresh-token-rotation לא נשאר "נבדק ידנית ונשכח": `tests/integration/auth.e2e.test.js` מכיל `describe('refresh-token rotation race', ...)` עם מקרה-בדיקה בשם `concurrent refreshes of the same token all succeed, and the session survives` — רגרסיה אוטומטית קבועה, לא רק תיעוד של בדיקה חד-פעמית. frontend: build/typecheck/eslint/test/security כולם ירוקים.

**הבהרה על שורת ה-`npm audit` של saas-backend — לא לייחס לסבב הזה:** השיפור (8→6, שני ה-moderate נעלמו) **אינו** תוצאה של אחד מהפיצ'רים שתוארו למעלה. בדקתי בגיט: קומיט `90f2565` ("fix: resolve new saas-backend npm audit regression (express, qs)") תיקן בדיוק את זה ב-2026-10-29 19:58 UTC — **אחרי** שה-baseline של אלעזר נכתב (קומיט `ebb3534`), אבל **לפני** שהתחילו קומיטי-הפיצ'רים של הסבב (`18cc638` ואילך). כלומר: הפגיעות שה-baseline דיווח עליה נסגרה ברקע, בנפרד, לפני שעבודת-הפיצ'רים שתוארה כאן בכלל התחילה. הנותרים (6 low) הם `deepmerge`→`jest-config`→`jest` — תלות-פיתוח בלבד (לא ב-`dependencies`, לא מגיעה ל-production); המסלול היחיד לתיקון הוא `npm audit fix --force` שמדרדר `jest` ל-25.1.0 (שדרוג-לאחור שובר) — לא תיקון סביר, ומתועד כסיכון-מתקבל בגוף קומיט `90f2565` עצמו. לא תיקנתי כלום בסבב הזה — רק מדדתי ואימתתי שהמספר תואם.

**הערה על ספירת ה-routes (36→37) — כנראה לא שינוי אמיתי:** בדקתי לפני דיווח: `git diff --name-status`/`git ls-tree` על `frontend/app` בין קומיט ה-baseline (`ebb3534`) ל-HEAD מראים **0 קבצי `page.tsx`/`route.ts` נוספו או הוסרו** (33 זהים משני הצדדים). מבנה ה-routes ב-Next נגזר ממיקומי קבצי `app/` ולא מתוכנם, כך שה-37 שנמדדים כעת היו צריכים להיות נכונים גם ב-10-29. **המסקנה הסבירה: 36 ב-10-29 היה ספירה לא-מדויקת, לא פיצ'ר-routing חדש** — אין כאן טענה שהתבדתה, רק דיוק-מדידה.

`product-status.md` ו-CI status לא נמדדו מחדש בסבב הזה (לא בתחום הבקשה, כמו בסבב הקודם). `customer-knowledge.md` עדיין ריק בכוונה — נשארתי במדדי בריאות-קוד בלבד.

## מדדי מוצר-עתידיים (יופעלו כשיהיו משתמשים)

- מספר שמאים רשומים
- שיעור המרה טיוטה→דוח שנשלח
- זמן ממוצע להכנת דוח
- Retention חודשי
- NPS / שביעות רצון

---

## עדכון אחרון

**2026-10-30 (אלעזר)** — מדידה אחרי סבב "מוכנות למשתמש אמיתי" שתואר ב-baseline הקודם (2026-10-29: comparable-sale delete, סיכום-התאמות דינמי בדוח, תיקון-visibility ל-reset-token, עריכת מספר-רישוי, סיבות-כשל-שומה אמיתיות, PDF ל-2 עמודים, flagging להרשמה-כפולה, תרגום עברי, mobile/RTL polish, ובעיקר silent token-refresh + תיקון race-condition). **אין רגרסיה בשום מדד** בשני הקודבייסים — שונה משתי המדידות הקודמות ברצף (10-25, 10-29) ששתיהן מצאו דגל-אדום ב-audit. saas-backend: lint **0 problems** (יציב), **62/62 בדיקות** (היה 46/46 — **+16**, 11→14 קבצים, תואם לכמות הפיצ'רים; אימתתי שלתיקון ה-race-condition יש רגרסיה-טסט קבועה ולא רק בדיקה ידנית חד-פעמית), `npm audit` **6 (כולן low, dev-only)** — היה 8 (6 low+2 moderate), אך זה **לא** מהסבב הזה: תיקון נפרד (קומיט `90f2565`, 2026-10-29 19:58 UTC) שקרה בין כתיבת ה-baseline להתחלת קומיטי-הפיצ'רים. frontend: `tsc --noEmit` **0 שגיאות** (יציב), `npx eslint .` **0 errors/0 warnings** (93 קבצים — מדידה ראשונה בשורה הזו בהשוואה, נקי), **8/8 בדיקות** (יציב), build עובר ב-**37 routes** (baseline דיווח 36 — בדקתי בגיט: 0 קבצי route נוספו/הוסרו, כנראה ספירה שגויה בעבר ולא שינוי אמיתי), `security:scan`/`security:audit` יציבים (עובר / 0 פגיעויות). Postgres+Redis לא היו פעילים בתחילת המדידה — הופעלו ואומתו; role/db `test` קיימים, אין migrations ממתינות. לא נגעתי בקוד או ב-git — רק ב-`kpi-dashboard.md`. פירוט מלא מעלה.

**2026-10-29 (אלעזר)** — Baseline נקי של `saas-backend`+`frontend` לפני סבב-הבנייה החדש ("מוכנות למשתמש אמיתי"), כשכמה סוכני-בנייה עומדים להתחיל לעבוד במקביל. **lint/typecheck/test יציבים** בשני הקודבייסים: saas-backend 0 problems, 46/46 בדיקות (+1 לעומת 10-25 — תוצר-לוואי צפוי של הסבב שכבר קרה, לא נבדק מול git log); frontend 0 errors, 8/8 בדיקות, build עובר ב-36 routes (+6, תואם לפיצ'רים שכבר נוספו: planning + deal-twin + settings). **דגל אדום: `npm audit` ב-saas-backend חזר מ-0 ל-8 פגיעויות** (6 low, 2 moderate) — דיסקלוזורים חדשים על גרסאות נעולות שלא השתנו (אותה תבנית בדיוק כמו ב-10-25, לא קוד שנכתב; אומת ש-`qs` override מ-10-25 עדיין במקום) — מסרתי לאהליאב, **לא תיקנתי**. frontend `npm audit`/`security:scan`/`security:audit` יציבים (0/עובר/עובר). Postgres+Redis לא היו פעילים בתחילת המדידה — הופעלו (`service postgresql start`/`service redis-server start`), אומתו, ואין migrations ממתינות. לא נגעתי בקוד או ב-git — רק ב-`kpi-dashboard.md`. פירוט מלא מעלה.

**2026-10-25 (אהליאב)** — תיקון בפועל (לא רק מדידה) של רגרסיית `npm audit` שאלעזר מצא באותו יום ב-`saas-backend` (5→0) וב-`frontend` (7→0), באותה שיטה כמו 09-09: `npm audit fix` לא-שובר קודם, ובדיקת-תאימות-קוד-בפועל לפני כל שדרוג major שנשאר (`zod` 3→4 בשני הקודבייסים; נמנעתי מ-`tailwindcss` 3→4 ע"י override ממוקד ל-`postcss-selector-parser`). אומת: lint נקי, `saas-backend` 45/45 בדיקות + עשן חי על שרת אמיתי (Postgres+Redis+migrations), `frontend` 8/8 בדיקות + `tsc --noEmit` נקי + `next build` 30 routes + `security:scan`/`security:audit` עוברים + עשן חי על `next dev`. `src/` הישן **לא נגעתי** — נשאר במפורש מחוץ לתחום (17 הפגיעויות שלו ממתינות למעקב נפרד). פירוט מלא מעלה.

**2026-10-25** — מדידה חדשה של אלעזר, חודש לאחר ה-baseline (2026-09-08/09), לאימות שהלוח לא stale. **תוצאה: lint/test/build/typecheck יציבים לגמרי בשלושת הקודבייסים** (ראו פירוט מעלה) — אין רגרסיית קוד. **הדגל האדום היחיד: `npm audit` החמיר בשלושתם** (legacy: 11→17; saas-backend: 0→5; frontend: 0→7, כולל critical חדש בכל אחד) — אך זה נובע מדיסקלוזורים חדשים על גרסאות נעולות שלא השתנו, לא מקוד שנכתב. `product-status.md` (חוב טכני, 10/2) ו-CI status לא נמדדו מחדש בסבב הזה — לא היו בתחום הבקשה.

**2026-09-08** — מדידה ראשונה: `npm ci` (573 חבילות), lint (69 בעיות), test (24/24). **עודכן באותו יום:** ה-error היחיד תוקן (ראו למעלה) — כעת 0 errors/67 warnings. 67 האזהרות הנותרות הוקצו ל-GitHub Copilot (17 קבצים, ראו `product-status.md`). פגיעויות `npm audit` (11, כולל 5 high) נוספו כפריט חדש ב-`product-status.md` — טרם נבדקו לעומק.
