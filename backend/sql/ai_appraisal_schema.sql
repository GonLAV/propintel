-- AI Comparable + Report Generator schema (PostgreSQL 16)
-- Requirements: PostGIS + pgvector

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================
-- Core entities
-- =========================================================

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY,
  canonical_address TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  property_type TEXT NOT NULL,
  area_sqm NUMERIC(8,2) NOT NULL,
  floor_num INTEGER,
  total_floors INTEGER,
  building_age_years INTEGER,
  condition_score NUMERIC(4,2),
  has_elevator BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false,
  has_balcony BOOLEAN DEFAULT false,
  has_view BOOLEAN DEFAULT false,
  noise_level NUMERIC(4,2),
  renovation_state TEXT,
  planning_potential_score NUMERIC(4,2),
  geom GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_city_type ON properties(city, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_geom ON properties USING GIST (geom);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  source TEXT NOT NULL,
  source_record_id TEXT,
  sale_date DATE NOT NULL,
  sale_price_nis BIGINT NOT NULL,
  deed_number TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_sale_date ON transactions(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_price ON transactions(sale_price_nis);

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  source TEXT NOT NULL,
  list_price_nis BIGINT,
  listed_at TIMESTAMPTZ,
  status TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_entities (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  plan_id TEXT,
  zoning_code TEXT,
  rights_summary TEXT,
  betterment_risk_score NUMERIC(4,2),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS macro_indicators (
  id BIGSERIAL PRIMARY KEY,
  indicator_date DATE NOT NULL,
  cpi NUMERIC(10,4),
  boi_rate NUMERIC(10,4),
  mortgage_index NUMERIC(10,4),
  region TEXT,
  UNIQUE(indicator_date, region)
);

-- =========================================================
-- Vector search
-- =========================================================

CREATE TABLE IF NOT EXISTS property_vectors (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  embedding vector(14) NOT NULL,
  model_version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for ANN search (pgvector)
CREATE INDEX IF NOT EXISTS idx_property_vectors_hnsw
  ON property_vectors USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 96);

-- =========================================================
-- Comparable runs & adjustments
-- =========================================================

CREATE TABLE IF NOT EXISTS comparable_runs (
  id UUID PRIMARY KEY,
  subject_property_id UUID NOT NULL REFERENCES properties(id),
  strategy TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  elapsed_ms INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS comparable_candidates (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES comparable_runs(id) ON DELETE CASCADE,
  comparable_property_id UUID NOT NULL REFERENCES properties(id),
  transaction_id UUID REFERENCES transactions(id),
  similarity_score NUMERIC(8,6) NOT NULL,
  distance_meters NUMERIC(10,2),
  adjustment_json JSONB,
  adjusted_price_nis BIGINT,
  weight NUMERIC(8,6),
  selected BOOLEAN DEFAULT true,
  explainability_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comparable_candidates_run ON comparable_candidates(run_id);

CREATE TABLE IF NOT EXISTS adjustment_overrides (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES comparable_runs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES comparable_candidates(id) ON DELETE CASCADE,
  appraiser_id TEXT NOT NULL,
  patch_json JSONB NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- Report generation entities
-- =========================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  sha256 TEXT,
  parsed_text TEXT,
  parsed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_facts (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  fact_key TEXT NOT NULL,
  fact_value TEXT,
  confidence NUMERIC(5,4) NOT NULL,
  page_num INTEGER,
  is_conflicting BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  file_url TEXT NOT NULL,
  captured_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS image_findings (
  id UUID PRIMARY KEY,
  image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  condition_score NUMERIC(4,2),
  renovation_level TEXT,
  findings_json JSONB,
  evidence_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  comparable_run_id UUID REFERENCES comparable_runs(id),
  template_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'he',
  status TEXT NOT NULL DEFAULT 'draft',
  valuation_low BIGINT,
  valuation_mid BIGINT,
  valuation_high BIGINT,
  confidence_score NUMERIC(5,2),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL,
  grounded_facts JSONB,
  section_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_versions (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  version_num INTEGER NOT NULL,
  pdf_url TEXT,
  hash_sha256 TEXT,
  signature_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, version_num)
);

-- =========================================================
-- Security & audit
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_role TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_events(actor_id, created_at DESC);
