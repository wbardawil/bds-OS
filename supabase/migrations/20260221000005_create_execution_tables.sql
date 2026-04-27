-- BDS OS: Initiative & Kanban Execution Tables
-- Each active practice becomes a lane with initiatives, artifacts, evidence, and score change requests

-- Initiatives: the units of execution within a practice
-- Status follows strict Kanban progression:
--   backlog → planned → in_progress → evidence_ready → ai_pre_graded → pending_verification → approved
CREATE TABLE initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  practice_id integer NOT NULL REFERENCES practices(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status initiative_status NOT NULL DEFAULT 'backlog',
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on initiatives
CREATE TRIGGER update_initiatives_updated_at
  BEFORE UPDATE ON initiatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Artifacts: deliverables produced during initiative execution
CREATE TABLE artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Evidence: proof bundles linked to initiatives, graded by AI and verified by humans
-- No score changes without: evidence bundle + AI grading rationale + senior approval
CREATE TABLE evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES artifacts(id) ON DELETE SET NULL,
  description text NOT NULL,
  quality_score numeric(5,2),
  ai_grading_rationale text,
  ai_confidence numeric(4,3),
  level_proposal integer CHECK (level_proposal IS NULL OR level_proposal BETWEEN 1 AND 5),
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Score Change Requests: formal requests to upgrade a practice's maturity level
-- Gated by evidence, AI grading, and senior verification
CREATE TABLE score_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  practice_id integer NOT NULL REFERENCES practices(id) ON DELETE RESTRICT,
  round_id uuid NOT NULL REFERENCES assessment_rounds(id) ON DELETE CASCADE,
  current_level integer NOT NULL CHECK (current_level BETWEEN 1 AND 5),
  proposed_level integer NOT NULL CHECK (proposed_level BETWEEN 1 AND 5),
  evidence_ids uuid[] NOT NULL DEFAULT '{}',
  ai_grade jsonb,
  status score_change_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewer_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (proposed_level > current_level)
);

-- Approvals: the senior verification decision on a score change request
CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_change_request_id uuid NOT NULL REFERENCES score_change_requests(id) ON DELETE CASCADE,
  approved_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
