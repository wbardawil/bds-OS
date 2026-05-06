-- BDS OS: Framework RLS policies
--
-- Tenant isolation: every row that belongs to a company is gated by membership
-- in that company. We use a helper function that checks the calling user's
-- membership in the target company, derived from company_members.

-- ============================================================================
-- HELPER: is_member_of(company_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_member_of(_company_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE company_id = _company_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_of(_company_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE company_id = _company_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- REFERENCE TABLES — readable by anyone authenticated
-- ============================================================================

ALTER TABLE universal_pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY universal_pillars_read ON universal_pillars
  FOR SELECT TO authenticated USING (true);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_read ON templates
  FOR SELECT TO authenticated USING (true);

-- Template-owned practices and metrics (where question_set_id and metric_set_id
-- are both NULL and template_id is set) are seed reference data.
-- Read access is granted via the practices / metrics policies below.

-- ============================================================================
-- PILLARS (per-company)
-- ============================================================================

ALTER TABLE customer_pillars ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_pillars_select ON customer_pillars
  FOR SELECT TO authenticated USING (is_member_of(company_id));
CREATE POLICY customer_pillars_insert ON customer_pillars
  FOR INSERT TO authenticated WITH CHECK (is_admin_of(company_id));
CREATE POLICY customer_pillars_update ON customer_pillars
  FOR UPDATE TO authenticated USING (is_admin_of(company_id));
CREATE POLICY customer_pillars_delete ON customer_pillars
  FOR DELETE TO authenticated USING (is_admin_of(company_id));

-- ============================================================================
-- QUESTION SETS + PRACTICES + RUBRICS
-- ============================================================================

ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY question_sets_select ON question_sets
  FOR SELECT TO authenticated USING (is_member_of(company_id));
CREATE POLICY question_sets_admin_write ON question_sets
  FOR ALL TO authenticated
    USING (is_admin_of(company_id))
    WITH CHECK (is_admin_of(company_id));

-- Practices: readable if (a) they're template-owned reference data, OR
-- (b) the user is a member of the company that owns the question_set.
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
CREATE POLICY practices_select ON practices
  FOR SELECT TO authenticated USING (
    template_id IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM question_sets qs
      WHERE qs.id = practices.question_set_id AND is_member_of(qs.company_id)
    )
  );
CREATE POLICY practices_admin_write ON practices
  FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM question_sets qs
        WHERE qs.id = practices.question_set_id AND is_admin_of(qs.company_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM question_sets qs
        WHERE qs.id = practices.question_set_id AND is_admin_of(qs.company_id)
      )
    );

-- Maturity rubrics: readable if the practice is readable.
ALTER TABLE maturity_rubrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY maturity_rubrics_select ON maturity_rubrics
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM practices p
      WHERE p.id = maturity_rubrics.practice_id
        AND (
          p.template_id IS NOT NULL
          OR EXISTS (
            SELECT 1 FROM question_sets qs
            WHERE qs.id = p.question_set_id AND is_member_of(qs.company_id)
          )
        )
    )
  );
CREATE POLICY maturity_rubrics_admin_write ON maturity_rubrics
  FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM practices p
        JOIN question_sets qs ON qs.id = p.question_set_id
        WHERE p.id = maturity_rubrics.practice_id AND is_admin_of(qs.company_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM practices p
        JOIN question_sets qs ON qs.id = p.question_set_id
        WHERE p.id = maturity_rubrics.practice_id AND is_admin_of(qs.company_id)
      )
    );

-- ============================================================================
-- METRICS + VALUES
-- ============================================================================

ALTER TABLE metric_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY metric_sets_select ON metric_sets
  FOR SELECT TO authenticated USING (is_member_of(company_id));
CREATE POLICY metric_sets_admin_write ON metric_sets
  FOR ALL TO authenticated
    USING (is_admin_of(company_id))
    WITH CHECK (is_admin_of(company_id));

ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY metrics_select ON metrics
  FOR SELECT TO authenticated USING (
    template_id IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM metric_sets ms
      WHERE ms.id = metrics.metric_set_id AND is_member_of(ms.company_id)
    )
  );
CREATE POLICY metrics_admin_write ON metrics
  FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM metric_sets ms
        WHERE ms.id = metrics.metric_set_id AND is_admin_of(ms.company_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM metric_sets ms
        WHERE ms.id = metrics.metric_set_id AND is_admin_of(ms.company_id)
      )
    );

ALTER TABLE metric_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY metric_values_select ON metric_values
  FOR SELECT TO authenticated USING (is_member_of(company_id));
CREATE POLICY metric_values_insert ON metric_values
  FOR INSERT TO authenticated WITH CHECK (is_member_of(company_id));
-- No update/delete: append-only.

-- ============================================================================
-- DASHBOARDS + WIDGETS
-- ============================================================================

ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY dashboards_select ON dashboards
  FOR SELECT TO authenticated USING (is_member_of(company_id));
CREATE POLICY dashboards_member_write ON dashboards
  FOR ALL TO authenticated
    USING (is_member_of(company_id))
    WITH CHECK (is_member_of(company_id));

ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY widgets_select ON widgets
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM dashboards d
      WHERE d.id = widgets.dashboard_id AND is_member_of(d.company_id)
    )
  );
CREATE POLICY widgets_member_write ON widgets
  FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM dashboards d
        WHERE d.id = widgets.dashboard_id AND is_member_of(d.company_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM dashboards d
        WHERE d.id = widgets.dashboard_id AND is_member_of(d.company_id)
      )
    );

-- ============================================================================
-- ALERTS
-- ============================================================================

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY alerts_select ON alerts
  FOR SELECT TO authenticated USING (is_member_of(company_id));
CREATE POLICY alerts_member_write ON alerts
  FOR ALL TO authenticated
    USING (is_member_of(company_id))
    WITH CHECK (is_member_of(company_id));

-- ============================================================================
-- DECISIONS
-- ============================================================================

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY decisions_select ON decisions
  FOR SELECT TO authenticated USING (is_member_of(company_id));
CREATE POLICY decisions_member_write ON decisions
  FOR ALL TO authenticated
    USING (is_member_of(company_id))
    WITH CHECK (is_member_of(company_id));

ALTER TABLE decision_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY decision_votes_select ON decision_votes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM decisions d
      WHERE d.id = decision_votes.decision_id AND is_member_of(d.company_id)
    )
  );
CREATE POLICY decision_votes_member_write ON decision_votes
  FOR ALL TO authenticated
    USING (
      voter_id = auth.uid() AND EXISTS (
        SELECT 1 FROM decisions d
        WHERE d.id = decision_votes.decision_id AND is_member_of(d.company_id)
      )
    )
    WITH CHECK (
      voter_id = auth.uid() AND EXISTS (
        SELECT 1 FROM decisions d
        WHERE d.id = decision_votes.decision_id AND is_member_of(d.company_id)
      )
    );

-- ============================================================================
-- CHAT
-- ============================================================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_messages_select ON chat_messages
  FOR SELECT TO authenticated USING (
    is_member_of(company_id) AND user_id = auth.uid()
  );
CREATE POLICY chat_messages_insert ON chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    is_member_of(company_id) AND user_id = auth.uid()
  );
-- Messages are immutable once written.

-- ============================================================================
-- FEEDBACK + PMF
-- ============================================================================

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_select_own ON feedback
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR (company_id IS NOT NULL AND is_admin_of(company_id))
    OR is_platform_admin()
  );
CREATE POLICY feedback_insert ON feedback
  FOR INSERT TO authenticated WITH CHECK (
    company_id IS NULL OR is_member_of(company_id)
  );

ALTER TABLE pmf_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY pmf_responses_select ON pmf_responses
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR is_platform_admin()
  );
CREATE POLICY pmf_responses_insert ON pmf_responses
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

-- ============================================================================
-- PLATFORM ADMINS
-- ============================================================================

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_admins_self ON platform_admins
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_platform_admin());
-- Inserts/deletes are service-role only (don't expose via PostgREST).
