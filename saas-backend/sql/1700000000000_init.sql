-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Tenants
-- ----------------------------------------------------------------------------
CREATE TABLE tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text   NOT NULL,
  slug        citext NOT NULL UNIQUE,
  status      text   NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'suspended')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  created_by  uuid
);
CREATE INDEX idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Users
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           citext NOT NULL,
  password_hash   text,
  full_name       text,
  phone_encrypted text,
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner','admin','member','viewer')),
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','disabled','pending')),
  oauth_provider  text,
  oauth_subject   text,
  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  created_by      uuid
);
CREATE UNIQUE INDEX uq_users_tenant_email
  ON users(tenant_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_tenant ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_oauth
  ON users(oauth_provider, oauth_subject) WHERE oauth_subject IS NOT NULL;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Refresh tokens (hashed at rest, family-tracked for rotation/reuse detection)
-- ----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash      text NOT NULL UNIQUE,
  family_id       uuid NOT NULL,
  replaced_by_id  uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  user_agent      text,
  ip              inet,
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_user    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_family  ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_expires ON refresh_tokens(expires_at);

-- ----------------------------------------------------------------------------
-- Audit log
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          bigserial PRIMARY KEY,
  tenant_id   uuid,
  user_id     uuid,
  action      text NOT NULL,
  entity      text,
  entity_id   text,
  ip          inet,
  user_agent  text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user_created   ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action_created ON audit_logs(action, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
DROP FUNCTION IF EXISTS set_updated_at();
