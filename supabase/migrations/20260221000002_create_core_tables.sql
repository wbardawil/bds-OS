-- BDS OS: Core Tables
-- Organizations, users, practice ontology (areas, practices, metadata, maturity levels, dependencies)

-- Organizations: the company being assessed and upgraded
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  revenue_range text,
  employee_count integer,
  years_in_operation integer,
  lifecycle_stage lifecycle_stage,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Users: authenticated members of an organization
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'functional_lead',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Areas: the 8 practice areas forming the ontology backbone
CREATE TABLE areas (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0
);

-- Practices: the 82 practices distributed across 8 areas
-- These are versioned, non-user-editable reference data (the intellectual core of BDS OS)
CREATE TABLE practices (
  id serial PRIMARY KEY,
  area_id integer NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  version text NOT NULL DEFAULT '1.0',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Practice Metadata: financial and operational attributes per practice
-- Used by the OPI engine for capital allocation scoring
CREATE TABLE practice_metadata (
  id serial PRIMARY KEY,
  practice_id integer NOT NULL UNIQUE REFERENCES practices(id) ON DELETE CASCADE,
  pnl_impact integer NOT NULL CHECK (pnl_impact BETWEEN 1 AND 5),
  speed_to_impact integer NOT NULL CHECK (speed_to_impact BETWEEN 1 AND 5),
  dependency_score integer NOT NULL CHECK (dependency_score BETWEEN 1 AND 5),
  risk_floor boolean NOT NULL DEFAULT false,
  risk_floor_level integer CHECK (risk_floor_level IS NULL OR risk_floor_level BETWEEN 1 AND 5)
);

-- Maturity Levels: 5 levels per practice with rubric descriptors and evidence criteria
-- 82 practices × 5 levels = 410 rows
CREATE TABLE maturity_levels (
  id serial PRIMARY KEY,
  practice_id integer NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 5),
  descriptor text NOT NULL,
  evidence_criteria text NOT NULL,
  expiry_period_days integer,
  UNIQUE (practice_id, level)
);

-- Practice Dependencies: directed graph of practice interdependencies
-- If practice A depends on practice B, B should be active or at Level 3+ before A is prioritized
CREATE TABLE practice_dependencies (
  id serial PRIMARY KEY,
  practice_id integer NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  depends_on_practice_id integer NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'prerequisite',
  CHECK (practice_id != depends_on_practice_id)
);

-- Trigger to auto-update updated_at on organizations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
