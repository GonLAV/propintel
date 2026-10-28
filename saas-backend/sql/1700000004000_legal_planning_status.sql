-- Up Migration
-- ----------------------------------------------------------------------------
-- Properties: legal rights status (מצב משפטי) and planning status (מצב תכנוני)
-- — both required report sections per תקן 1.1 §4/5.8 (verified against the
-- official PDF, agent-hq/report-standards.md), currently always rendered as
-- an honest "not collected" gap note. Free text: the appraiser transcribes
-- the relevant facts from the land registry extract (נסח טאבו) and the
-- planning authority themselves.
-- ----------------------------------------------------------------------------
ALTER TABLE properties ADD COLUMN legal_rights_notes    text;
ALTER TABLE properties ADD COLUMN planning_status_notes text;

-- Down Migration
ALTER TABLE properties DROP COLUMN IF EXISTS planning_status_notes;
ALTER TABLE properties DROP COLUMN IF EXISTS legal_rights_notes;
