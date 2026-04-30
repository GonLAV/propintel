CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL UNIQUE,
  email citext,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'lawyer', 'admin')),
  locale text NOT NULL DEFAULT 'he-IL',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE rental_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('handover', 'repair', 'deposit', 'contract')),
  address text NOT NULL,
  landlord_name text NOT NULL,
  landlord_phone text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'resolved', 'urgent')),
  next_action text NOT NULL,
  deadline_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_rental_cases_user_status ON rental_cases(user_id, status) WHERE deleted_at IS NULL;

CREATE TABLE evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES rental_cases(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('photo', 'note', 'document')),
  label text NOT NULL,
  storage_url text,
  content_hash text NOT NULL,
  captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_case ON evidence_items(case_id, captured_at DESC);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  case_id uuid REFERENCES rental_cases(id) ON DELETE SET NULL,
  action text NOT NULL,
  ip inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);