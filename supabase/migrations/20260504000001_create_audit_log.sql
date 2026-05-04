-- BDS OS: Audit Log
-- Captures who-changed-what for compliance and trend analysis.
-- Edge functions write entries on score-change approvals, evidence grading,
-- initiative status transitions, and any other state change worth replaying.
-- Entries are immutable: no UPDATE or DELETE policies for authenticated users.

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'status_change',
  'grade',
  'approve',
  'reject'
);

CREATE TYPE audit_resource_type AS ENUM (
  'round_response',
  'opi_score',
  'focus_portfolio',
  'initiative',
  'evidence',
  'score_change_request',
  'approval'
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  resource_type audit_resource_type NOT NULL,
  resource_id uuid NOT NULL,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_log_org_created ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_user_created ON audit_log(user_id, created_at DESC);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_own" ON audit_log
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "audit_log_insert_own" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
