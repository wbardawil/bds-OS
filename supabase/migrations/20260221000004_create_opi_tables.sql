-- BDS OS: OPI (Operational Priority Index) Tables
-- Stores lifecycle-stage-specific weights and computed OPI scores

-- Lifecycle Weights: OPI weight profiles per lifecycle stage
-- W1–W5 must sum to 1.0 for each stage
-- These weights determine how the OPI formula prioritizes different factors
CREATE TABLE lifecycle_weights (
  id serial PRIMARY KEY,
  lifecycle_stage lifecycle_stage NOT NULL UNIQUE,
  w1_gap numeric(4,3) NOT NULL CHECK (w1_gap BETWEEN 0 AND 1),
  w2_pnl numeric(4,3) NOT NULL CHECK (w2_pnl BETWEEN 0 AND 1),
  w3_speed numeric(4,3) NOT NULL CHECK (w3_speed BETWEEN 0 AND 1),
  w4_dependency numeric(4,3) NOT NULL CHECK (w4_dependency BETWEEN 0 AND 1),
  w5_risk numeric(4,3) NOT NULL CHECK (w5_risk BETWEEN 0 AND 1),
  CHECK (w1_gap + w2_pnl + w3_speed + w4_dependency + w5_risk = 1.000)
);

-- OPI Scores: computed priority scores for each practice per assessment round
-- Formula: OPI = [(Gap × W1) + (P&L × W2) + (Speed × W3) + (Dependency × W4) + (Risk × W5)] × Lifecycle_Mod
CREATE TABLE opi_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES assessment_rounds(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  practice_id integer NOT NULL REFERENCES practices(id) ON DELETE RESTRICT,
  gap numeric(5,3) NOT NULL,
  weighted_gap numeric(5,3) NOT NULL,
  pnl_score numeric(5,3) NOT NULL,
  speed_score numeric(5,3) NOT NULL,
  dependency_score numeric(5,3) NOT NULL,
  risk_score numeric(5,3) NOT NULL,
  lifecycle_mod numeric(4,3) NOT NULL DEFAULT 1.000,
  final_opi numeric(5,3) NOT NULL,
  phase_number integer NOT NULL CHECK (phase_number BETWEEN 1 AND 3),
  priority_rank integer NOT NULL,
  risk_floor_triggered boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, organization_id, practice_id)
);

-- Focus Portfolios: the WIP-limited set of active practices per quarter
-- Created by the Adaptive Focus Portfolio engine after OPI computation
CREATE TABLE focus_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES assessment_rounds(id) ON DELETE CASCADE,
  quarter text NOT NULL,
  lifecycle_stage lifecycle_stage NOT NULL,
  max_active integer NOT NULL,
  active_practice_ids integer[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
