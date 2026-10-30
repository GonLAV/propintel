-- Up Migration
-- ----------------------------------------------------------------------------
-- Reports: optional bank addressee + bank file/loan reference number.
--
-- Market context (competitive research, 2026-10-30): Israeli banks keep a
-- closed panel of approved appraisers, and a mortgage appraisal is
-- conventionally addressed to the bank ("לכבוד: [בנק]") rather than just the
-- person who ordered it -- those are two distinct roles (orderer vs.
-- addressee), which the existing free-text client_name field couldn't
-- represent. No bank's specific internal layout/checklist was verified by
-- that research (no public API or submission portal was found for any
-- bank), so this does NOT encode per-bank formatting rules -- only the one
-- thing that generalizes across any bank: a proper addressee line and a
-- reference number for the bank's own filing. Same optional/nullable
-- pattern as client_name/purpose/principles_notes: an honest "not
-- specified" placeholder renders in the PDF when absent, never invented.
-- ----------------------------------------------------------------------------
ALTER TABLE reports ADD COLUMN bank_name text;
ALTER TABLE reports ADD COLUMN bank_reference text;

-- Down Migration
ALTER TABLE reports DROP COLUMN IF EXISTS bank_name;
ALTER TABLE reports DROP COLUMN IF EXISTS bank_reference;
