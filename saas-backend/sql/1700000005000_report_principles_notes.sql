-- Up Migration
-- ----------------------------------------------------------------------------
-- Reports: appraiser's own professional narrative for the "עקרונות, גורמים
-- ושיקולים" section (תקן 1.1 §5.10 — "the appraiser documents the principles
-- and considerations behind the valuation, at a level of detail the
-- appraiser determines"). Additive to a factual summary the system derives
-- automatically from the actual valuation breakdown.
-- ----------------------------------------------------------------------------
ALTER TABLE reports ADD COLUMN principles_notes text;

-- Down Migration
ALTER TABLE reports DROP COLUMN IF EXISTS principles_notes;
