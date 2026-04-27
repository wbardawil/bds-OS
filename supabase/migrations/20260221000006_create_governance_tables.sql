-- BDS OS: Governance & Monitoring Tables
-- Meetings, KPIs, and adoption metrics for governance loops

-- Meetings: governance cadence tracking (weekly, monthly, quarterly)
CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type meeting_type NOT NULL,
  date date NOT NULL,
  notes text,
  decisions jsonb NOT NULL DEFAULT '[]',
  action_items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- KPIs: organization-level key performance indicators tracked over time
CREATE TABLE kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  value numeric NOT NULL,
  period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Adoption Metrics: per-practice operational health indicators
-- Delegation Index, Decision Cycle Time, Escalations
CREATE TABLE adoption_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  practice_id integer REFERENCES practices(id) ON DELETE SET NULL,
  delegation_index numeric(5,3),
  decision_cycle_time_hours numeric(8,2),
  escalations_per_month integer,
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
