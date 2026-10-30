-- Up Migration
-- ----------------------------------------------------------------------------
-- Team invites. Competitive research + manual QA (Caleb/Nachshon,
-- 2026-10-29/30) both independently found the same gap: there was no way
-- to add a second user to a tenant at all -- users.service.js had no
-- create/invite function, even though the role model (owner/admin/member/
-- viewer) and the users.status CHECK already included 'pending', clearly
-- anticipating this.
--
-- Design: an invite IS a users row from the start (status='pending', no
-- password_hash yet) rather than a separate table -- it already shows up
-- in the existing GET /users list/team view for free, and reuses the
-- existing uq_users_tenant_email constraint to reject inviting an email
-- already on the team. The hashed token lives on that same row, same
-- "hash at rest" pattern as refresh_tokens/password_resets.
-- ----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN invite_token_hash text;
ALTER TABLE users ADD COLUMN invite_expires_at timestamptz;

CREATE UNIQUE INDEX uq_users_invite_token_hash
  ON users(invite_token_hash) WHERE invite_token_hash IS NOT NULL;

-- Down Migration
DROP INDEX IF EXISTS uq_users_invite_token_hash;
ALTER TABLE users DROP COLUMN IF EXISTS invite_token_hash;
ALTER TABLE users DROP COLUMN IF EXISTS invite_expires_at;
