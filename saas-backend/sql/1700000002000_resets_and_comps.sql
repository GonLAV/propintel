-- Up Migration

-- ----------------------------------------------------------------------------
-- Password reset tokens (hashed at rest, single-use, expiring)
-- ----------------------------------------------------------------------------
CREATE TABLE password_resets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  ip           inet,
  user_agent   text,
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_resets_user    ON password_resets(user_id);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- ----------------------------------------------------------------------------
-- Comparable sales (used by the valuation engine; tenant-scoped market data)
-- ----------------------------------------------------------------------------
CREATE TABLE comparable_sales (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  city          text NOT NULL,
  property_type text NOT NULL
                CHECK (property_type IN ('apartment','house','office','retail','land','other')),
  area_sqm      numeric(10,2) NOT NULL,
  rooms         numeric(4,1),
  floor         integer,
  year_built    integer,
  sale_price    numeric(14,2) NOT NULL,
  currency      text NOT NULL DEFAULT 'ILS',
  sold_at       date NOT NULL,
  source        text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
CREATE INDEX idx_comps_tenant_city_type
  ON comparable_sales(tenant_id, city, property_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_comps_tenant_sold_at
  ON comparable_sales(tenant_id, sold_at DESC) WHERE deleted_at IS NULL;

-- Down Migration
DROP TABLE IF EXISTS comparable_sales;
DROP TABLE IF EXISTS password_resets;
