-- BDS OS: Practice assignments (delegation) + partial-completion support
--
-- Supports the two Lovable features:
--   1. Send a block (entire pillar's practices) to a third party for scoring
--   2. Send a single practice to a specific person for scoring
--   3. Partial completion (save and resume) — already supported by
--      round_responses.completed_at being nullable; this migration just
--      formalises the convention and adds a helper view.
--
-- A practice_assignments row targets either a specific practice OR an entire
-- pillar (block). The assignee accesses their queue via a share_token URL,
-- mirroring Lovable's existing anonymous-responder pattern at /round/:code.

-- ============================================================================
-- TABLE: practice_assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS practice_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES evaluation_rounds(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- One of these must be set; not both. CHECK enforces it.
  practice_id uuid REFERENCES practices(id) ON DELETE CASCADE,
  customer_pillar_id uuid REFERENCES customer_pillars(id) ON DELETE CASCADE,

  -- Who's being asked to score. Email is required so we can send the link;
  -- assignee_user_id is set once they've signed up / signed in.
  assignee_email text NOT NULL,
  assignee_name text,
  assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Share token: lets the assignee access their assignment via a URL without
  -- a full account. Same pattern as Lovable's /round/:code anonymous responders.
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Optional: who delegated, when due, when completed
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  message text,
  due_at timestamptz,
  reminded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CHECK ((practice_id IS NOT NULL)::int + (customer_pillar_id IS NOT NULL)::int = 1)
);

CREATE INDEX IF NOT EXISTS idx_practice_assignments_round ON practice_assignments(round_id);
CREATE INDEX IF NOT EXISTS idx_practice_assignments_company ON practice_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_practice_assignments_assignee ON practice_assignments(assignee_email, completed_at);
CREATE INDEX IF NOT EXISTS idx_practice_assignments_token ON practice_assignments(share_token);

-- ============================================================================
-- VIEW: assignment_progress
-- For showing the admin "who's done with their delegated questions"
-- ============================================================================

CREATE OR REPLACE VIEW assignment_progress AS
SELECT
  pa.round_id,
  pa.company_id,
  pa.id AS assignment_id,
  pa.assignee_email,
  pa.assignee_name,
  pa.message,
  pa.due_at,
  pa.completed_at,
  pa.created_at,
  CASE
    WHEN pa.completed_at IS NOT NULL THEN 'complete'
    WHEN pa.due_at IS NOT NULL AND pa.due_at < now() THEN 'overdue'
    WHEN pa.reminded_at IS NOT NULL THEN 'reminded'
    ELSE 'pending'
  END AS status,
  pa.practice_id,
  pa.customer_pillar_id,
  CASE
    WHEN pa.practice_id IS NOT NULL THEN 'practice'
    ELSE 'pillar_block'
  END AS scope_type
FROM practice_assignments pa;

-- ============================================================================
-- RLS for practice_assignments
-- ============================================================================

ALTER TABLE practice_assignments ENABLE ROW LEVEL SECURITY;

-- Members of the company can SELECT their company's assignments (admins use this for the queue UI).
CREATE POLICY practice_assignments_select_member ON practice_assignments
  FOR SELECT TO authenticated USING (is_member_of(company_id));

-- Admins can INSERT / UPDATE assignments (delegate, edit, mark reminded).
CREATE POLICY practice_assignments_admin_write ON practice_assignments
  FOR ALL TO authenticated
    USING (is_admin_of(company_id))
    WITH CHECK (is_admin_of(company_id));

-- The assignee themselves can SELECT and UPDATE their own assignment row
-- (so they can mark completed, see message, etc.) once authenticated.
-- Anonymous-token access goes through an edge function with service-role —
-- not exposed via PostgREST.
CREATE POLICY practice_assignments_assignee_self ON practice_assignments
  FOR ALL TO authenticated
    USING (assignee_user_id = auth.uid())
    WITH CHECK (assignee_user_id = auth.uid());

-- ============================================================================
-- Convention note for partial-completion (no schema change needed)
-- ============================================================================
--
-- round_responses.completed_at IS NULL = the response is in-progress (partial).
-- round_responses.completed_at IS NOT NULL = the response is submitted/final.
--
-- The category_scores jsonb can contain partial answers while completed_at is null.
-- The frontend should:
--   - On every input change: upsert the row with the latest jsonb (completed_at remains null)
--   - On final submit: update completed_at = now()
-- This pattern lets users save and resume. No new column required.
