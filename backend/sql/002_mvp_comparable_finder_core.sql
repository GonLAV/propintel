-- MVP Comparable Finder core schema (Israel)
-- Postgres 16 + PostGIS

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================================
-- 1) Core entities: building / property / event tables
-- =========================================================

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY,
  normalized_address TEXT NOT NULL,
  city TEXT NOT NULL,
  year_built INTEGER,
  floors INTEGER,
  geom GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buildings_geom ON buildings USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_buildings_norm_addr_trgm ON buildings USING GIN (normalized_address gin_trgm_ops);

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY,
  building_id UUID REFERENCES buildings(id),
  raw_address TEXT NOT NULL,
  normalized_address TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT,
  house_number TEXT,
  unit_identifier TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  geom GEOGRAPHY(POINT, 4326),
  property_type TEXT NOT NULL DEFAULT 'apartment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_geom ON properties USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_properties_norm_addr_trgm ON properties USING GIN (normalized_address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_city_street_no ON properties(city, street, house_number);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  price_nis BIGINT NOT NULL CHECK (price_nis > 0),
  transaction_date DATE NOT NULL,
  area_sqm NUMERIC(8,2),
  floor_num INTEGER,
  rooms NUMERIC(4,2),
  source TEXT NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_property ON transactions(property_id);

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  price_nis BIGINT,
  area_sqm NUMERIC(8,2),
  floor_num INTEGER,
  rooms NUMERIC(4,2),
  listing_date DATE,
  status TEXT,
  source TEXT NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_property ON listings(property_id);
CREATE INDEX IF NOT EXISTS idx_listings_date ON listings(listing_date DESC);

CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  condition_label TEXT,
  renovation_level TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_observations_property ON observations(property_id, created_at DESC);

-- =========================================================
-- 2) Raw ingestion + staging + dedupe/version support
-- =========================================================

CREATE TABLE IF NOT EXISTS raw_transactions (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_record_id TEXT,
  payload JSONB NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, source_record_id)
);

CREATE TABLE IF NOT EXISTS raw_listings (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_record_id TEXT,
  payload JSONB NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, source_record_id)
);

CREATE TABLE IF NOT EXISTS staging_entities (
  id UUID PRIMARY KEY,
  source_table TEXT NOT NULL CHECK (source_table IN ('raw_transactions', 'raw_listings')),
  raw_id BIGINT NOT NULL,
  raw_address TEXT,
  normalized_address TEXT,
  city TEXT,
  street TEXT,
  house_number TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  geom GEOGRAPHY(POINT, 4326),
  parsed_fields JSONB,
  address_match_quality NUMERIC(5,4) DEFAULT 0,
  completeness_score NUMERIC(5,4) DEFAULT 0,
  dedupe_fingerprint TEXT,
  status TEXT NOT NULL DEFAULT 'cleaned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staging_status ON staging_entities(status);
CREATE INDEX IF NOT EXISTS idx_staging_fingerprint ON staging_entities(dedupe_fingerprint);
CREATE INDEX IF NOT EXISTS idx_staging_geom ON staging_entities USING GIST (geom);

CREATE TABLE IF NOT EXISTS entity_versions (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, version_num)
);

-- =========================================================
-- 3) Comparable run state for UI/API
-- =========================================================

CREATE TABLE IF NOT EXISTS comparable_runs (
  id UUID PRIMARY KEY,
  subject_property_id UUID NOT NULL REFERENCES properties(id),
  created_by TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'weighted-mean',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comparable_candidates (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES comparable_runs(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  distance_meters NUMERIC(10,2) NOT NULL,
  geo_similarity NUMERIC(7,5) NOT NULL,
  area_similarity NUMERIC(7,5) NOT NULL,
  floor_similarity NUMERIC(7,5) NOT NULL,
  room_similarity NUMERIC(7,5) NOT NULL,
  building_similarity NUMERIC(7,5) NOT NULL,
  total_similarity_score NUMERIC(7,5) NOT NULL,
  adjustment_total_pct NUMERIC(7,5) NOT NULL DEFAULT 0,
  adjusted_price_nis BIGINT,
  outlier_flag BOOLEAN NOT NULL DEFAULT false,
  outlier_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidates_run_score ON comparable_candidates(run_id, total_similarity_score DESC);

CREATE TABLE IF NOT EXISTS adjustment_overrides (
  id UUID PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES comparable_candidates(id) ON DELETE CASCADE,
  appraiser_id TEXT NOT NULL,
  floor_adj_pct NUMERIC(7,5) DEFAULT 0,
  parking_adj_pct NUMERIC(7,5) DEFAULT 0,
  elevator_adj_pct NUMERIC(7,5) DEFAULT 0,
  balcony_adj_pct NUMERIC(7,5) DEFAULT 0,
  condition_adj_pct NUMERIC(7,5) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adj_overrides_candidate ON adjustment_overrides(candidate_id, created_at DESC);
