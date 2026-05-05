-- 5 maturity levels per Lovable question_id.
-- Used by grade-evidence (descriptor + criteria) and the rubric tooltip in the UI.
--
-- SEED INTENTIONALLY EMPTY -- content lift; ~75 questions x 5 levels = 375 entries.
-- See docs/integration-plan.md open question 5.

CREATE TABLE public.maturity_rubrics (
  id serial PRIMARY KEY,
  question_id text NOT NULL REFERENCES public.practice_metadata(question_id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 5),
  descriptor text NOT NULL,
  evidence_criteria text NOT NULL,
  UNIQUE (question_id, level)
);

CREATE INDEX idx_maturity_rubrics_question ON public.maturity_rubrics(question_id);

ALTER TABLE public.maturity_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maturity_rubrics_read_all_authenticated"
ON public.maturity_rubrics FOR SELECT TO authenticated
USING (true);
