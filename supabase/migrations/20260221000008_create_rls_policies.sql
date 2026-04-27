-- BDS OS: Row Level Security Policies
-- All data is scoped to the user's organization via auth.uid() → users.organization_id

-- Helper function: get the current user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Reference Data (read-only for all authenticated users)
-- ============================================================

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "areas_read_all" ON areas
  FOR SELECT TO authenticated USING (true);

ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practices_read_all" ON practices
  FOR SELECT TO authenticated USING (true);

ALTER TABLE practice_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practice_metadata_read_all" ON practice_metadata
  FOR SELECT TO authenticated USING (true);

ALTER TABLE maturity_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maturity_levels_read_all" ON maturity_levels
  FOR SELECT TO authenticated USING (true);

ALTER TABLE practice_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "practice_dependencies_read_all" ON practice_dependencies
  FOR SELECT TO authenticated USING (true);

ALTER TABLE lifecycle_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lifecycle_weights_read_all" ON lifecycle_weights
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Organization-scoped Data (read/write scoped to user's org)
-- ============================================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizations_select_own" ON organizations
  FOR SELECT TO authenticated
  USING (id = get_user_organization_id());
CREATE POLICY "organizations_update_own" ON organizations
  FOR UPDATE TO authenticated
  USING (id = get_user_organization_id());

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_org" ON users
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- Assessment Rounds
ALTER TABLE assessment_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_rounds_select_own" ON assessment_rounds
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "assessment_rounds_insert_own" ON assessment_rounds
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- Round Responses
ALTER TABLE round_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "round_responses_select_own" ON round_responses
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "round_responses_insert_own" ON round_responses
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "round_responses_update_own" ON round_responses
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

-- OPI Scores
ALTER TABLE opi_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opi_scores_select_own" ON opi_scores
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- Focus Portfolios
ALTER TABLE focus_portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "focus_portfolios_select_own" ON focus_portfolios
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- Initiatives
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "initiatives_select_own" ON initiatives
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "initiatives_insert_own" ON initiatives
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "initiatives_update_own" ON initiatives
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

-- Artifacts (scoped through initiative)
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artifacts_select_own" ON artifacts
  FOR SELECT TO authenticated
  USING (initiative_id IN (
    SELECT id FROM initiatives WHERE organization_id = get_user_organization_id()
  ));
CREATE POLICY "artifacts_insert_own" ON artifacts
  FOR INSERT TO authenticated
  WITH CHECK (initiative_id IN (
    SELECT id FROM initiatives WHERE organization_id = get_user_organization_id()
  ));

-- Evidence (scoped through initiative)
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_select_own" ON evidence
  FOR SELECT TO authenticated
  USING (initiative_id IN (
    SELECT id FROM initiatives WHERE organization_id = get_user_organization_id()
  ));
CREATE POLICY "evidence_insert_own" ON evidence
  FOR INSERT TO authenticated
  WITH CHECK (initiative_id IN (
    SELECT id FROM initiatives WHERE organization_id = get_user_organization_id()
  ));

-- Score Change Requests
ALTER TABLE score_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "score_change_requests_select_own" ON score_change_requests
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "score_change_requests_insert_own" ON score_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "score_change_requests_update_own" ON score_change_requests
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id());

-- Approvals (scoped through score_change_requests)
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approvals_select_own" ON approvals
  FOR SELECT TO authenticated
  USING (score_change_request_id IN (
    SELECT id FROM score_change_requests WHERE organization_id = get_user_organization_id()
  ));
CREATE POLICY "approvals_insert_own" ON approvals
  FOR INSERT TO authenticated
  WITH CHECK (score_change_request_id IN (
    SELECT id FROM score_change_requests WHERE organization_id = get_user_organization_id()
  ));

-- Meetings
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_select_own" ON meetings
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "meetings_insert_own" ON meetings
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- KPIs
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpis_select_own" ON kpis
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "kpis_insert_own" ON kpis
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());

-- Adoption Metrics
ALTER TABLE adoption_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adoption_metrics_select_own" ON adoption_metrics
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());
CREATE POLICY "adoption_metrics_insert_own" ON adoption_metrics
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id());
