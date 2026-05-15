-- One row per Lovable question_id (e.g. 'sp_1', 'ma_3').
-- Drives OPI's P&L, speed, dependency, and risk inputs.
--
-- SEED INTENTIONALLY EMPTY -- values require human curation per question.
-- See docs/integration-plan.md open question 4. ~75 rows expected once seeded.

CREATE TABLE public.practice_metadata (
  question_id text PRIMARY KEY,
  category text NOT NULL,
  pnl_impact integer NOT NULL CHECK (pnl_impact BETWEEN 1 AND 5),
  speed_to_impact integer NOT NULL CHECK (speed_to_impact BETWEEN 1 AND 5),
  dependency_score integer NOT NULL CHECK (dependency_score BETWEEN 1 AND 5),
  risk_floor boolean NOT NULL DEFAULT false,
  risk_floor_level integer CHECK (risk_floor_level IS NULL OR risk_floor_level BETWEEN 1 AND 5),
  CHECK (NOT risk_floor OR risk_floor_level IS NOT NULL)
);

CREATE INDEX idx_practice_metadata_category ON public.practice_metadata(category);

ALTER TABLE public.practice_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_metadata_read_all_authenticated"
ON public.practice_metadata FOR SELECT TO authenticated
USING (true);
