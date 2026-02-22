# Comparable Property Finder (Israel) — Minimal Production-Ready MVP

## 1) Architecture (minimal services)

```mermaid
flowchart LR
  U[Web/Mobile UI] --> G[API Gateway / Backend App]
  G --> N[Address Normalization Module]
  G --> C[Comparable Scoring Module]
  G --> V[Valuation Module]
  G --> DB[(PostgreSQL + PostGIS)]
  I[Batch ETL Job] --> N
  I --> DB
  D[Public Data Sources\n(data.gov.il, official feeds)] --> I
```

### Minimal services in v1
1. **Single backend service** (REST API + scoring + valuation + normalization)
2. **PostgreSQL + PostGIS** (single DB for app + geo)
3. **Batch ETL worker** (hourly/daily import from legal/public sources)

### Tradeoffs
- **Simplicity first**: monolith is fastest to build, easier ops, fewer failure points.
- **Scalability path**: split later into `ingestion`, `comparable-engine`, `valuation`, `reporting` once load grows.
- **Performance target**: keep p95 comparable retrieval < 2s using geo indexes + precomputed fields.

---

## 2) Database schema (MVP)

## 2.1 Core tables

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  raw_address TEXT NOT NULL,
  normalized_address TEXT NOT NULL,
  city TEXT,
  street TEXT,
  house_number TEXT,
  block TEXT,
  parcel TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geom GEOGRAPHY(POINT, 4326),
  property_type TEXT,
  area_sqm NUMERIC(8,2),
  floor_num INTEGER,
  total_floors INTEGER,
  building_age_years INTEGER,
  has_elevator BOOLEAN,
  has_parking BOOLEAN,
  has_balcony BOOLEAN,
  condition_score NUMERIC(4,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_properties_geom ON properties USING GIST (geom);
CREATE INDEX idx_properties_norm_addr ON properties (normalized_address);

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  source TEXT NOT NULL,
  source_record_id TEXT,
  sale_date DATE NOT NULL,
  sale_price_nis BIGINT NOT NULL,
  price_per_sqm NUMERIC(12,2),
  data_quality_score NUMERIC(4,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, source_record_id)
);

CREATE INDEX idx_tx_sale_date ON transactions(sale_date DESC);
CREATE INDEX idx_tx_property ON transactions(property_id);

CREATE TABLE comparable_runs (
  id UUID PRIMARY KEY,
  subject_property_id UUID NOT NULL REFERENCES properties(id),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE comparable_candidates (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES comparable_runs(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  distance_meters NUMERIC(10,2) NOT NULL,
  similarity_score NUMERIC(8,5) NOT NULL,
  adjustment_total_pct NUMERIC(7,5) DEFAULT 0,
  adjusted_price_nis BIGINT,
  is_outlier BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comp_run_score ON comparable_candidates(run_id, similarity_score DESC);

CREATE TABLE adjustment_overrides (
  id UUID PRIMARY KEY,
  comparable_candidate_id UUID NOT NULL REFERENCES comparable_candidates(id) ON DELETE CASCADE,
  appraiser_id TEXT NOT NULL,
  floor_adj_pct NUMERIC(7,5) DEFAULT 0,
  parking_adj_pct NUMERIC(7,5) DEFAULT 0,
  elevator_adj_pct NUMERIC(7,5) DEFAULT 0,
  balcony_adj_pct NUMERIC(7,5) DEFAULT 0,
  condition_adj_pct NUMERIC(7,5) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 2.2 Address normalization strategy (critical for Israel)
1. Keep both `raw_address` and `normalized_address`.
2. Normalize Hebrew variants and abbreviations (e.g., רח׳ → רחוב, שד׳ → שדרות).
3. Remove punctuation/noise, unify whitespace, standardize house numbers.
4. If available, enrich with block/parcel and geocode.
5. Use deterministic fingerprint for dedupe:
   - `normalized_address + city + rounded(lat/lng) + area bucket`.

---

## 3) Comparable algorithm (MVP)

## 3.1 Features
- Geo distance
- Property type
- Area (sqm)
- Floor
- Building age
- Elevator / parking / balcony
- Condition score (if present)
- Recency of transaction

## 3.2 Similarity scoring formula

Use weighted score $S \in [0,1]$:

$$
S = 0.35\cdot S_{geo} + 0.20\cdot S_{area} + 0.10\cdot S_{floor} + 0.10\cdot S_{age} + 0.10\cdot S_{type} + 0.10\cdot S_{features} + 0.05\cdot S_{recency}
$$

Where each subscore is normalized to $[0,1]$, for example:
- $S_{geo}=\max(0,1-\frac{distanceMeters}{3000})$
- $S_{area}=\max(0,1-\frac{|area_{subj}-area_{comp}|}{120})$
- $S_{type}=1$ if same type else $0.7$

## 3.3 Outlier filtering
- Compute adjusted comparable prices.
- Apply IQR rule:
  - Reject if $price < Q1 - 1.5\cdot IQR$ or $price > Q3 + 1.5\cdot IQR$.
- If fewer than 5 comparables, keep all but lower confidence.

---

## 4) API design (REST)

## 4.1 Property search (address input)
- `POST /api/v1/properties/search`
- Request: `{ "address": "ארלוזורוב 28 תל אביב" }`
- Response: top normalized matches with geocode and confidence.

## 4.2 Comparable retrieval
- `POST /api/v1/comparables/run`
- Request: `{ "subjectPropertyId": "...", "topK": 20 }`
- Response: `runId` + ranked comparables + similarity + initial adjustments.

## 4.3 Adjustment update
- `PATCH /api/v1/comparables/{candidateId}/adjustments`
- Request: slider values (floor/parking/elevator/balcony/condition + reason)
- Response: updated adjusted price + run summary.

## 4.4 Valuation calculation
- `POST /api/v1/valuations/calculate`
- Request: `{ "runId": "...", "strategy": "weighted-mean" }`
- Response:
  - `valueRange.low/mid/high`
  - `confidenceScore`
  - `comparablesUsed`
  - `outliersRejected`

---

## 5) UX flow (MVP)

1. **Address input**
   - User types address
   - System shows normalized candidates + match confidence
2. **Comparable list**
   - Top ranked transactions with distance, date, price, similarity
3. **Adjustment sliders**
   - Floor / elevator / parking / balcony / condition
   - Recalculate instantly
4. **Estimated value**
   - Show range (low-mid-high), not single number
   - Show confidence and outlier count

---

## 6) MVP simplifications (intentional)

### Intentionally avoid in v1
- No vector DB (use SQL + weighted formula first)
- No heavy ML model training pipeline
- No full report-generation automation
- No complex workflow engine/BPM
- No external scraping of proprietary sites

### Hardest technical parts
1. Israeli address normalization and entity resolution
2. Data quality consistency across sources
3. Reliable geocoding and duplicate prevention
4. Explainable adjustments accepted by appraisers

---

## 7) Step-by-step implementation plan

### Week 1-2
- Setup monolith backend + Postgres/PostGIS
- Implement property + transaction schema
- Build ETL importer from permitted/public sources

### Week 3-4
- Address normalization pipeline + geocoding + dedupe
- Property search endpoint
- Comparable scoring endpoint (top-K)

### Week 5-6
- Adjustment logic + override persistence
- Outlier filter + valuation range endpoint
- Add confidence score formula

### Week 7-8
- UI: address search, comparables table, sliders, value panel
- Latency tuning (indexes, query plans, caching)
- Basic audit log + monitoring (errors/latency)

### Exit criteria (MVP ready)
- p95 comparable retrieval < 2s
- Stable valuation range output
- Repeatable results for same inputs
- End-to-end usable by appraiser on real cases

---

## 8) Scope lock for v1.0 (review-enforced)

### In scope (must-have)
1. One region first (Tel Aviv metro) + `apartment` type only.
2. One valuation strategy only: `weighted-mean`.
3. Adjustable fields only: `floor`, `parking`, `condition`.
4. Mandatory audit record for every manual override.
5. Always return a valuation **range** (never single point).

### Out of scope (explicit non-goals)
- Vector DB and embedding-based retrieval.
- ML training pipelines and auto-recalibration.
- Fully automated report authoring.
- Multi-region and all property classes.
- Complex workflow engine / BPM orchestration.

---

## 9) Hidden complexity (senior review)

1. **Israeli address normalization is the core technical moat** and the largest delivery risk.
2. **Entity resolution** (`raw_address` vs `normalized_address`) will require ongoing rule tuning.
3. **Geocoding confidence** and fallback logic must be deterministic (no silent guesses).
4. **Outlier explainability** must be visible to appraiser (why excluded).
5. **Confidence score credibility** requires transparent rules, not opaque weighting.

---

## 10) Risk register + mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Address normalization failures | Wrong comparables | Scope to one region + fallback to manual selection |
| Duplicate transactions | Biased valuation | Source-level unique keys + fingerprint dedupe + review queue |
| Slow comparable queries | Bad UX | PostGIS indexes + top-K prefilter + query timeout budget |
| Sparse feature data | Unstable scoring | Nullable-safe scoring + field-coverage penalty |
| Disputed outlier exclusion | Trust issues | Show excluded list + explicit reason per candidate |

---

## 11) Data quality rubric (minimum for v1)

Define `data_quality_score` deterministically:

- +0.30 source is official transaction feed
- +0.20 geocode confidence >= 0.9
- +0.20 area + floor present
- +0.10 sale date exact (not estimated)
- +0.10 duplicate check passed
- +0.10 address normalized with high confidence

Clamp score to $[0,1]$ and expose in API/UI.

---

## 12) Further simplification without losing core value

1. Restrict search radius to one default (e.g., 1.5km) in v1.
2. Hard minimum comparables threshold before valuation output.
3. No async job orchestration for scoring; keep synchronous path only.
4. Skip advanced scenario simulation in v1.
5. Defer CRM/billing integration to v1.1.

---

## 13) Delivery blockers likely to delay schedule

1. Address normalization ruleset maturity.
2. Official data source schema drift and ETL breakage.
3. Ambiguous address search UX and user trust in match confidence.
4. Edge-case handling for missing/contradictory fields.

Mitigation: enforce a weekly “data correctness checkpoint” with real cases from appraisers.
