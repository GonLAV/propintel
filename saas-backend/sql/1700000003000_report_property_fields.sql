-- Up Migration
-- ----------------------------------------------------------------------------
-- Reports: who ordered the appraisal + why (distinct from `method`, which is
-- the calculation approach). Both belong to the report, not the property —
-- the same property can be appraised for different clients/purposes over time.
-- ----------------------------------------------------------------------------
ALTER TABLE reports ADD COLUMN client_name text;
ALTER TABLE reports ADD COLUMN purpose     text;

-- ----------------------------------------------------------------------------
-- Properties: legal parcel identifiers (גוש/חלקה/תת-חלקה) and the site-visit
-- date (מועד קובע), which a real appraisal must be able to state separately
-- from the report-generation timestamp.
-- ----------------------------------------------------------------------------
ALTER TABLE properties ADD COLUMN block      text;
ALTER TABLE properties ADD COLUMN parcel     text;
ALTER TABLE properties ADD COLUMN sub_parcel text;
ALTER TABLE properties ADD COLUMN visit_date date;

-- ----------------------------------------------------------------------------
-- Users: appraiser license number (מספר רישיון שמאי) — a property of the
-- individual appraiser, not the tenant/office, so it lives on users.
-- ----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN license_number text;

-- Down Migration
ALTER TABLE users DROP COLUMN IF EXISTS license_number;
ALTER TABLE properties DROP COLUMN IF EXISTS visit_date;
ALTER TABLE properties DROP COLUMN IF EXISTS sub_parcel;
ALTER TABLE properties DROP COLUMN IF EXISTS parcel;
ALTER TABLE properties DROP COLUMN IF EXISTS block;
ALTER TABLE reports DROP COLUMN IF EXISTS purpose;
ALTER TABLE reports DROP COLUMN IF EXISTS client_name;
