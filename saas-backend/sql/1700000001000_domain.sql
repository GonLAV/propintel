-- Up Migration
-- ----------------------------------------------------------------------------
-- Properties (subject of an appraisal)
-- ----------------------------------------------------------------------------
CREATE TABLE properties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_ref  text,                              -- gush/helka or client ref
  address       text NOT NULL,
  city          text NOT NULL,
  property_type text NOT NULL
                CHECK (property_type IN ('apartment','house','office','retail','land','other')),
  area_sqm      numeric(10,2),
  rooms         numeric(4,1),
  floor         integer,
  year_built    integer,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  created_by    uuid
);
CREATE INDEX idx_properties_tenant      ON properties(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_tenant_city ON properties(tenant_id, city) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_external    ON properties(tenant_id, external_ref)
  WHERE deleted_at IS NULL AND external_ref IS NOT NULL;
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Valuations
-- ----------------------------------------------------------------------------
CREATE TABLE valuations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id    uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  method         text NOT NULL
                 CHECK (method IN ('comparables','cost','income','reconciled')),
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','completed','failed')),
  estimated_value numeric(14,2),
  currency       text NOT NULL DEFAULT 'ILS',
  confidence     numeric(4,3),                    -- 0..1
  inputs         jsonb NOT NULL DEFAULT '{}'::jsonb,
  result         jsonb NOT NULL DEFAULT '{}'::jsonb,
  error          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  created_by     uuid
);
CREATE INDEX idx_valuations_tenant_property
  ON valuations(tenant_id, property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_valuations_status ON valuations(status) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_valuations_updated BEFORE UPDATE ON valuations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Reports (snapshot of a valuation, ready for export)
-- ----------------------------------------------------------------------------
CREATE TABLE reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  valuation_id  uuid NOT NULL REFERENCES valuations(id) ON DELETE CASCADE,
  title         text NOT NULL,
  format        text NOT NULL DEFAULT 'json'
                CHECK (format IN ('json','markdown','pdf')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage_url   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  created_by    uuid
);
CREATE INDEX idx_reports_tenant_valuation
  ON reports(tenant_id, valuation_id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS valuations;
DROP TABLE IF EXISTS properties;
