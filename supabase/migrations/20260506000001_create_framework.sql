-- BDS OS: Framework Tables (the operating + monitoring layer)
--
-- Adds the canonical 8-pillar framework, customer-pillar mapping, templates,
-- practices, metrics + values, dashboards + widgets, alerts, decisions, chat
-- history, feedback, and PMF responses on top of Lovable's existing schema
-- (companies, company_members, evaluation_rounds, round_responses, profiles, leads).
--
-- This migration assumes Lovable's tables exist; it does not create or modify them.

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE lifecycle_stage AS ENUM ('startup', 'growth', 'scale', 'mature');

CREATE TYPE round_mode AS ENUM ('quick', 'full');

CREATE TYPE widget_type AS ENUM (
  'number', 'sparkline', 'line_chart', 'bar_chart', 'radar', 'gauge', 'list', 'table', 'vega_spec'
);

CREATE TYPE metric_source AS ENUM (
  'manual', 'webhook', 'connector_stripe', 'connector_hubspot', 'connector_quickbooks',
  'connector_xero', 'connector_salesforce', 'connector_other', 'derived'
);

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'resolved', 'snoozed');

CREATE TYPE decision_status AS ENUM ('proposed', 'approved', 'rejected', 'superseded');

CREATE TYPE role_lens AS ENUM (
  'ceo', 'coo', 'cfo', 'cro', 'chro', 'cio', 'cmo', 'legal', 'manager', 'viewer'
);

-- ============================================================================
-- EXTEND EXISTING TABLES
-- ============================================================================

-- Companies — add lifecycle + metadata used by determine-lifecycle and OPI weights.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS lifecycle_stage lifecycle_stage,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS revenue_range text,
  ADD COLUMN IF NOT EXISTS employee_count integer,
  ADD COLUMN IF NOT EXISTS years_in_operation integer;

-- Evaluation rounds — distinguish public quick assessment from full team assessment.
ALTER TABLE evaluation_rounds
  ADD COLUMN IF NOT EXISTS mode round_mode NOT NULL DEFAULT 'quick';

-- Company members — role lens drives default Control Tower tile selection.
-- Distinct from the existing 'role' column (owner/admin/member) which controls permissions.
ALTER TABLE company_members
  ADD COLUMN IF NOT EXISTS role_lens role_lens;

-- Auth users — platform admin flag for the /admin ops surface.
-- Done via a separate user-attributes table since auth.users is managed by Supabase.
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================================
-- FRAMEWORK FOUNDATION
-- ============================================================================

-- Universal pillars — locked at the platform level, MECE foundation.
CREATE TABLE universal_pillars (
  id smallint PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  sort_order smallint NOT NULL,
  CHECK (sort_order BETWEEN 1 AND 8)
);

-- Customer pillars — per-company, mapped to a universal pillar.
-- A customer can rename, merge, split, hide, or add — but every customer pillar
-- maps to one universal pillar (or to "Other" if they declare it doesn't fit).
CREATE TABLE customer_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  universal_pillar_id smallint REFERENCES universal_pillars(id) ON DELETE RESTRICT,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_other boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (is_other OR universal_pillar_id IS NOT NULL)
);

CREATE INDEX idx_customer_pillars_company ON customer_pillars(company_id);
CREATE INDEX idx_customer_pillars_universal ON customer_pillars(universal_pillar_id);

-- Templates — system-managed industry templates (smb-default, hospital, university, fund).
-- Customers clone a template into their own customer_pillars + practices + metrics on signup.
CREATE TABLE templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  industry text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PRACTICES
-- ============================================================================

-- Question sets — a customer's set of practices (cloned from a template, then editable).
CREATE TABLE question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_template_id text REFERENCES templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_customised boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_sets_company ON question_sets(company_id);

-- Practices — the practice statements scored in an assessment.
-- Tagged to a customer pillar (which maps to a universal pillar).
CREATE TABLE practices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id uuid REFERENCES question_sets(id) ON DELETE CASCADE,
  template_id text REFERENCES templates(id) ON DELETE CASCADE,
  customer_pillar_id uuid REFERENCES customer_pillars(id) ON DELETE SET NULL,
  universal_pillar_id smallint REFERENCES universal_pillars(id),
  external_id text,
  statement text NOT NULL,
  description text,
  is_system_level boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  source_practice_id uuid REFERENCES practices(id) ON DELETE SET NULL,
  is_customised boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (question_set_id IS NOT NULL OR template_id IS NOT NULL)
);

CREATE INDEX idx_practices_question_set ON practices(question_set_id);
CREATE INDEX idx_practices_template ON practices(template_id);
CREATE INDEX idx_practices_customer_pillar ON practices(customer_pillar_id);
CREATE INDEX idx_practices_universal_pillar ON practices(universal_pillar_id);
CREATE INDEX idx_practices_external ON practices(external_id);

-- Maturity rubrics — 5 levels per practice, with descriptor + evidence criteria.
CREATE TABLE maturity_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
  descriptor text NOT NULL,
  evidence_criteria text NOT NULL,
  expiry_period_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practice_id, level)
);

CREATE INDEX idx_maturity_rubrics_practice ON maturity_rubrics(practice_id);

-- ============================================================================
-- METRICS (KPIs)
-- ============================================================================

-- Metric sets — a customer's set of KPIs (cloned from a template).
CREATE TABLE metric_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_template_id text REFERENCES templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_metric_sets_company ON metric_sets(company_id);

-- Metrics — KPI definitions per company, tagged to a customer pillar.
CREATE TABLE metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_set_id uuid REFERENCES metric_sets(id) ON DELETE CASCADE,
  template_id text REFERENCES templates(id) ON DELETE CASCADE,
  customer_pillar_id uuid REFERENCES customer_pillars(id) ON DELETE SET NULL,
  universal_pillar_id smallint REFERENCES universal_pillars(id),
  external_id text,
  name text NOT NULL,
  description text,
  unit text,
  target_value numeric,
  threshold_red numeric,
  threshold_yellow numeric,
  source metric_source NOT NULL DEFAULT 'manual',
  source_config jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (metric_set_id IS NOT NULL OR template_id IS NOT NULL)
);

CREATE INDEX idx_metrics_set ON metrics(metric_set_id);
CREATE INDEX idx_metrics_template ON metrics(template_id);
CREATE INDEX idx_metrics_customer_pillar ON metrics(customer_pillar_id);
CREATE INDEX idx_metrics_universal_pillar ON metrics(universal_pillar_id);

-- Metric values — append-only time series.
CREATE TABLE metric_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id uuid NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  value numeric NOT NULL,
  period text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source metric_source NOT NULL DEFAULT 'manual',
  source_payload jsonb,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_metric_values_metric_observed ON metric_values(metric_id, observed_at DESC);
CREATE INDEX idx_metric_values_company_observed ON metric_values(company_id, observed_at DESC);

-- ============================================================================
-- DASHBOARDS + WIDGETS
-- ============================================================================

CREATE TABLE dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  role_default role_lens,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboards_company ON dashboards(company_id);
CREATE INDEX idx_dashboards_company_role ON dashboards(company_id, role_default);

CREATE TABLE widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  type widget_type NOT NULL,
  title text,
  metric_id uuid REFERENCES metrics(id) ON DELETE SET NULL,
  vega_spec jsonb,
  config jsonb,
  position_x integer NOT NULL DEFAULT 0,
  position_y integer NOT NULL DEFAULT 0,
  width integer NOT NULL DEFAULT 1,
  height integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_widgets_dashboard ON widgets(dashboard_id);
CREATE INDEX idx_widgets_metric ON widgets(metric_id);

-- ============================================================================
-- ALERTS
-- ============================================================================

CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_id uuid REFERENCES metrics(id) ON DELETE CASCADE,
  practice_id uuid REFERENCES practices(id) ON DELETE CASCADE,
  severity alert_severity NOT NULL,
  status alert_status NOT NULL DEFAULT 'open',
  title text NOT NULL,
  detail text,
  context jsonb,
  fired_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (metric_id IS NOT NULL OR practice_id IS NOT NULL)
);

CREATE INDEX idx_alerts_company_status ON alerts(company_id, status);
CREATE INDEX idx_alerts_company_fired ON alerts(company_id, fired_at DESC);

-- ============================================================================
-- DECISIONS (decision log)
-- ============================================================================

CREATE TABLE decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status decision_status NOT NULL DEFAULT 'proposed',
  proposed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rationale text,
  data_links jsonb,
  superseded_by uuid REFERENCES decisions(id) ON DELETE SET NULL,
  proposed_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  metadata jsonb
);

CREATE INDEX idx_decisions_company_status ON decisions(company_id, status);
CREATE INDEX idx_decisions_company_proposed ON decisions(company_id, proposed_at DESC);

-- Decision votes — capture who voted what (supports dissent / abstain).
CREATE TABLE decision_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote text NOT NULL,
  comment text,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (decision_id, voter_id)
);

-- ============================================================================
-- CHAT (Julius-lite, source-cited)
-- ============================================================================

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  vega_spec jsonb,
  citations jsonb,
  tokens_input integer,
  tokens_output integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conv ON chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_company ON chat_messages(company_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at DESC);

-- ============================================================================
-- FEEDBACK + PMF SURVEY
-- ============================================================================

CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  screen text,
  category text,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedback_company_created ON feedback(company_id, created_at DESC);
CREATE INDEX idx_feedback_unreviewed ON feedback(created_at DESC) WHERE reviewed_at IS NULL;

CREATE TABLE pmf_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  disappointment text NOT NULL CHECK (disappointment IN ('very_disappointed', 'somewhat_disappointed', 'not_disappointed', 'na')),
  primary_benefit text,
  who_benefits_most text,
  improvement text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pmf_company_created ON pmf_responses(company_id, created_at DESC);

-- ============================================================================
-- AUTO-UPDATE updated_at TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customer_pillars_updated_at BEFORE UPDATE ON customer_pillars
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_question_sets_updated_at BEFORE UPDATE ON question_sets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_dashboards_updated_at BEFORE UPDATE ON dashboards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
