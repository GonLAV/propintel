# MVP טכני מיידי — DB חי + נירמול כתובות + Ingestion Pipeline

מסמך זה ממפה ישירות ליישום שכבר נוסף בקוד.

## קבצים שנוספו

- סכמת DB מלאה ל-MVP:
  - [backend/sql/002_mvp_comparable_finder_core.sql](../../backend/sql/002_mvp_comparable_finder_core.sql)
- מנוע נירמול כתובות ישראלי:
  - [src/lib/israeliAddressNormalization.ts](../../src/lib/israeliAddressNormalization.ts)
- Pipeline Ingestion בשלבים (raw → clean → dedupe + confidence):
  - [src/lib/mvpIngestionPipeline.ts](../../src/lib/mvpIngestionPipeline.ts)
- בסיס אלגוריתם קומפרבלים + IQR + valuation range:
  - [src/lib/mvpComparableScoring.ts](../../src/lib/mvpComparableScoring.ts)
- בדיקות:
  - [src/lib/mvpComparableScoring.test.ts](../../src/lib/mvpComparableScoring.test.ts)

---

## 1) מה הסכמה מכסה

- הפרדה בין ישות פיזית (`buildings`, `properties`) לבין אירועים (`transactions`, `listings`, `observations`)
- שכבת raw ingestion (`raw_transactions`, `raw_listings`)
- שכבת staging לניקוי/איכות/דדופ (`staging_entities`)
- versioning (`entity_versions`)
- persisted comparable runs (`comparable_runs`, `comparable_candidates`, `adjustment_overrides`)

---

## 2) נירמול כתובות ישראלי (v1)

במודול [src/lib/israeliAddressNormalization.ts](../../src/lib/israeliAddressNormalization.ts):

- ניקוי קיצורים (רח׳/שד׳)
- הסרת noise (דירה/קומה/כניסה)
- פירוק רכיבים: עיר/רחוב/מספר/כניסה/דירה
- canonical street aliases (למשל ויצמן/וייצמן)
- fuzzy score משולב (Levenshtein + trigram)
- dedupe fingerprint לנכס

---

## 3) Pipeline Ingestion (מימוש יישומי)

במודול [src/lib/mvpIngestionPipeline.ts](../../src/lib/mvpIngestionPipeline.ts):

1. Validation של raw
2. normalize address
3. completeness scoring
4. confidence scoring
5. fingerprint dedupe
6. output: `cleaned`, `duplicates`, `errors`

נוסחת confidence:

$$
confidence = 0.35\cdot source + 0.25\cdot recency + 0.25\cdot address + 0.15\cdot completeness - 0.1\cdot outlierRisk
$$

---

## 4) בסיס אלגוריתם קומפרבלים

במודול [src/lib/mvpComparableScoring.ts](../../src/lib/mvpComparableScoring.ts):

- feature scoring לפי:
  - distance
  - area
  - floor
  - rooms
  - building age
- weighted score
- outlier filtering לפי IQR על מחיר למ"ר
- valuation range (`low/mid/high`) עם weighted-mean

---

## 5) איך להתחיל מייד (טכני)

1. להריץ migration SQL בסביבת Postgres/PostGIS
2. לחבר ETL שמכניס ל-raw tables
3. להריץ pipeline normalize + dedupe
4. לבצע property resolution
5. לחשב comparables + valuation API

---

## 5.1 API ingestion חי (נוסף ב-backend)

נתיבים:

- `POST /api/v1/ingestion/run`
- `GET /api/v1/ingestion/runs`
- `GET /api/v1/ingestion/:runId`

דוגמת payload:

```json
{
  "createdBy": "etl-worker",
  "transactions": [
    {
      "source": "official-gov-feed",
      "sourceRecordId": "tx-1001",
      "address": "רח׳ ויצמן 12, תל אביב",
      "city": "תל אביב-יפו",
      "transactionDate": "2025-11-10",
      "price": 2780000,
      "area": 96,
      "floor": 5,
      "rooms": 4,
      "lat": 32.08,
      "lon": 34.78
    }
  ],
  "listings": []
}
```

התגובה כוללת:
- רשומות `cleaned`
- רשומות `duplicates`
- שגיאות `errors`
- `summary` עם ממוצע confidence

---

## 6) גבולות v1 מומלצים

- אזור: תל אביב והסביבה בלבד
- סוג נכס: דירות בלבד
- strategy יחיד: `weighted-mean`
- overrides מוגבלים: `floor`, `parking`, `condition`

כך אפשר להגיע ל-MVP שמיש מהר, בלי להסתבך בפיצ'רים כבדים מוקדם מדי.
