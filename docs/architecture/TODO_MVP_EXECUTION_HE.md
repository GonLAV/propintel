# TODO List — MVP Comparable Finder (Israel)

## מצב כללי
- [x] סכמת DB ל-MVP נוספה
- [x] מנוע נירמול כתובות (v1) נוסף
- [x] ingestion pipeline נוסף
- [x] בסיס scoring + outlier filtering נוסף
- [x] ingestion API נוסף ל-backend
- [x] UI לניהול ingestion מתוך המערכת
- [x] חיבור persistence durable ל-ingestion runs (קובץ JSON מקומי)
- [ ] Smoke tests end-to-end

---

## Sprint 1 — Data Foundation (שבוע 1)
- [ ] להריץ migration: `002_mvp_comparable_finder_core.sql` בסביבת DB
- [ ] להגדיר ENV ל-DB ב-backend (`DATABASE_URL`)
- [ ] לבנות שכבת DB adapter עבור tables:
  - [ ] `raw_transactions`
  - [ ] `raw_listings`
  - [ ] `staging_entities`
  - [ ] `entity_versions`
- [ ] לחבר `POST /api/v1/ingestion/run` לשמירה בפועל ל-Postgres
- [x] להוסיף endpoint בריאות DB (`/api/v1/health/db`) — כרגע בודק persistence layer מקומי

Acceptance:
- [ ] ingestion רץ ושומר raw + cleaned + duplicates ל-DB
- [ ] אין loss של payload גולמי

---

## Sprint 2 — Address + Resolution (שבוע 2)
- [ ] להרחיב מילון alias לרחובות (20–50 alias ראשוניים)
- [ ] להוסיף city-level rules לנירמול (ת"א/תל אביב-יפו וכו')
- [ ] להוסיף fuzzy matching threshold policy:
  - [ ] `>= 0.9` auto-match
  - [ ] `0.75–0.9` review queue
  - [ ] `< 0.75` no-match
- [ ] לבנות property resolution job:
  - [ ] match ל-`properties`
  - [ ] יצירת `properties`/`buildings` כשאין התאמה
- [ ] להוסיף dedupe audit trail

Acceptance:
- [ ] לפחות 85% match rate על dataset בדיקה קטן
- [ ] duplicates מסומנים עקבי לפי fingerprint

---

## Sprint 3 — Comparable Engine API (שבוע 3)
- [ ] לחבר scoring מול נתוני DB אמיתיים
- [ ] להוסיף query ל-topK לפי geo + filtering בסיסי
- [ ] לשמור `comparable_runs` + `comparable_candidates`
- [ ] להוסיף `PATCH` ל-adjustments עם audit מלא
- [ ] להוסיף outlier reason לכל מועמד שנפסל

Acceptance:
- [ ] ריצת comparable מחזירה תוצאות עקביות
- [ ] כל override נרשם עם `appraiser_id` + `reason`

---

## Sprint 4 — Valuation + UI (שבוע 4)
- [ ] לחבר valuation endpoint לנתוני run persisted
- [ ] להוסיף confidence breakdown שקוף ב-API
- [ ] לבנות מסך UI לניהול ingestion:
  - [ ] textarea/json upload
  - [ ] כפתור `Run Ingestion`
  - [ ] טבלאות `cleaned / duplicates / errors`
- [ ] לחבר ה-UI למסך Comparable Studio ל-run אמיתי מה-DB

Acceptance:
- [ ] שמאי יכול לבצע flow מלא מתוך UI
- [ ] מוצג range + confidence + outliers

---

## Hardening (שבוע 5)
- [ ] להוסיף rate limit ל-endpoints כבדים
- [ ] להוסיף timeouts + retry policy ל-ingestion
- [ ] להוסיף metrics בסיסיים:
  - [ ] `ingestion_duration_ms`
  - [ ] `address_match_rate`
  - [ ] `duplicate_ratio`
  - [ ] `comparable_query_p95`
- [ ] להריץ בדיקת עומס בסיסית

Acceptance:
- [ ] comparable query p95 < 2s על dataset בדיקה
- [ ] אין שגיאות קריטיות ב-smoke test

---

## Backlog (v1.1)
- [ ] הרחבה לאזורים נוספים מעבר לת"א
- [ ] תמיכה בסוגי נכסים נוספים
- [ ] מנוע monitoring לשינויי שווי והתראות
- [ ] report automation מתקדם
