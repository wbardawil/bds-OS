-- BDS OS: Assessment Tables
-- Captures importance + competency scoring per practice per assessment round

-- Assessment Rounds: a named scoring session for an organization
CREATE TABLE assessment_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Round Responses: individual importance + competency scores per practice
-- These are the primary inputs to the OPI computation engine
CREATE TABLE round_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES assessment_rounds(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  practice_id integer NOT NULL REFERENCES practices(id) ON DELETE RESTRICT,
  importance_score integer NOT NULL CHECK (importance_score BETWEEN 1 AND 5),
  competency_score integer NOT NULL CHECK (competency_score BETWEEN 1 AND 5),
  responded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, organization_id, practice_id)
);
