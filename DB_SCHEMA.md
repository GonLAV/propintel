# DB Schema (Appraisal Platform)

מטרה: סכימה פרקטית שמאפשרת להתחיל לפתח Backend/DB מחר, בלי לנעול לטכנולוגיה ספציפית.
הסכימה בנויה כך שתתמוך ב־MVP (שיטות שומה + מסמכים + יבוא עסקאות) וגם בגרסה מתקדמת (Audit, הרשאות, גרסאות למסמכים).

> הערה: בקוד ה־frontend קיימים כבר טיפוסים ב־[src/lib/types.ts](src/lib/types.ts). הסכימה כאן היא מיפוי DB מתואם אליהם.

## ישויות מרכזיות

- **clients** – לקוחות + פרטי קשר
- **properties** – נכסים + נתוני בסיס
- **property_features** – תכונות/מאפיינים (many-to-many / tags)
- **comparables** – עסקאות להשוואה (אפשר לייבא/לשמור פר מקור)
- **property_comparables** – קישור בין נכס לבין עסקאות נבחרות + מצב בחירה
- **valuations** – תוצאת שומה לפי שיטה (כולל hybrid)
- **valuation_calculations** – פירוט צעדי חישוב (לשקיפות משפטית)
- **reports** – מסמכי שומה/חוות דעת
- **report_sections** – סעיפים דינמיים
- **attachments** – קבצים/תמונות/נספחים
- **branding_settings** – מיתוג PDF לפי משתמש/ארגון
- **audit_log** – רישום פעולות (מומלץ למשרד שמאות)

## PostgreSQL DDL מוצע

```sql
-- Clients
create table clients (
  id uuid primary key,
  name text not null,
  email text not null,
  phone text not null,
  company text,
  avatar_url text,
  notes text,
  created_at timestamptz not null default now()
);
create unique index clients_email_uq on clients (lower(email));

-- Properties
create type property_type as enum (
  'apartment','house','penthouse','garden-apartment','duplex','studio','commercial','land'
);
create type property_status as enum ('draft','in-progress','completed','sent');
create type property_condition as enum ('new','excellent','good','fair','poor','renovation-needed');

create table properties (
  id uuid primary key,
  client_id uuid not null references clients(id) on delete restrict,
  status property_status not null default 'draft',

  -- Address
  street text not null,
  city text not null,
  neighborhood text not null,
  postal_code text,

  type property_type not null,

  -- Details
  built_area numeric(10,2) not null,
  total_area numeric(10,2),
  rooms numeric(4,1) not null,
  bedrooms int not null,
  bathrooms int not null,
  floor int not null,
  total_floors int,
  build_year int,
  condition property_condition not null,
  parking int not null default 0,
  storage boolean not null default false,
  balcony boolean not null default false,
  elevator boolean not null default false,
  accessible boolean not null default false,

  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_client_id_idx on properties (client_id);
create index properties_city_neighborhood_idx on properties (city, neighborhood);

-- Property features/tags
create table property_features (
  property_id uuid not null references properties(id) on delete cascade,
  feature text not null,
  primary key (property_id, feature)
);

-- Comparables (transactions)
create table comparables (
  id uuid primary key,
  source text,                 -- "gov", "manual", "ml", וכו'
  external_id text,            -- מזהה במקור (אם יש)
  address text not null,
  type property_type not null,
  sale_price numeric(14,2) not null,
  sale_date date not null,
  built_area numeric(10,2) not null,
  rooms numeric(4,1) not null,
  floor int,
  distance_km numeric(6,3),
  similarity_score numeric(5,2),

  created_at timestamptz not null default now()
);
create index comparables_sale_date_idx on comparables (sale_date);
create index comparables_type_idx on comparables (type);

-- Link: property ↔ selected comparables
create table property_comparables (
  property_id uuid not null references properties(id) on delete cascade,
  comparable_id uuid not null references comparables(id) on delete restrict,
  selected boolean not null default true,

  -- frozen adjustments at time of valuation (optional but recommended)
  adjustment_location numeric(6,4) not null default 0,
  adjustment_size numeric(6,4) not null default 0,
  adjustment_condition numeric(6,4) not null default 0,
  adjustment_floor numeric(6,4) not null default 0,
  adjustment_age numeric(6,4) not null default 0,
  adjustment_features numeric(6,4) not null default 0,
  adjustment_total numeric(6,4) not null default 0,

  adjusted_price numeric(14,2),
  price_per_sqm numeric(14,2),

  primary key (property_id, comparable_id)
);

-- Valuations
create type valuation_method as enum ('comparable-sales','cost-approach','income-approach','hybrid');

create table valuations (
  id uuid primary key,
  property_id uuid not null references properties(id) on delete cascade,
  method valuation_method not null,

  estimated_value numeric(14,2) not null,
  range_min numeric(14,2) not null,
  range_max numeric(14,2) not null,
  confidence int not null,

  methodology text,
  reconciliation text,

  assumptions jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  quality_checks jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);
create index valuations_property_id_idx on valuations (property_id);
create index valuations_property_method_idx on valuations (property_id, method);

-- Valuation calculation steps (for traceability)
create table valuation_calculations (
  id uuid primary key,
  valuation_id uuid not null references valuations(id) on delete cascade,
  step text not null,
  description text,
  formula text,
  inputs jsonb not null default '{}'::jsonb,
  result numeric(14,2) not null,
  order_index int not null
);
create index valuation_calculations_valuation_id_idx on valuation_calculations (valuation_id);

-- Reports
create type report_format as enum ('pdf','word','html');
create type report_template as enum ('standard','detailed','summary','bank');
create type report_status as enum ('draft','pending-review','completed','delivered');

create table reports (
  id uuid primary key,
  property_id uuid not null references properties(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,

  title text not null,
  format report_format not null,
  template report_template not null,
  status report_status not null default 'draft',

  appraiser_name text,
  appraiser_license text,

  notes text,
  watermark boolean not null default false,

  generated_at timestamptz,
  delivered_at timestamptz,
  download_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_property_id_idx on reports (property_id);

create table report_sections (
  id uuid primary key,
  report_id uuid not null references reports(id) on delete cascade,
  title text not null,
  content text not null,
  type text not null,          -- 'text'|'table'|'chart'|'image'|'list'
  order_index int not null,
  required boolean not null default false,
  enabled boolean not null default true
);
create index report_sections_report_id_idx on report_sections (report_id);

-- Attachments
create table attachments (
  id uuid primary key,
  property_id uuid references properties(id) on delete cascade,
  report_id uuid references reports(id) on delete cascade,
  kind text not null,          -- 'photo'|'appendix'|'signature' וכו'
  filename text not null,
  mime_type text,
  url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Branding settings (per user/org)
create table branding_settings (
  id uuid primary key,
  owner_id uuid not null,      -- user/org id לפי מערכת ההרשאות שלך
  settings jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index branding_settings_owner_uq on branding_settings (owner_id);

-- Audit log
create table audit_log (
  id uuid primary key,
  actor_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  diff jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity_type, entity_id);
```

## Notes (יישום מהיר)

- MVP יכול להתחיל עם: `clients`, `properties`, `comparables`, `property_comparables`, `valuations`, `reports`.
- אם אין עדיין Backend: אפשר לממש שכבת persistence מקומית (KV/IndexedDB) עם אותו shape ואז להחליף ל־DB אמיתי.
- מומלץ לשמור גם **valuation_calculations** כדי לתת שקיפות משפטית מלאה (trace לכל שורה בשומה).
