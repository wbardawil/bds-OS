-- Distinguishes the public funnel's quick scan from the full team assessment.
-- 'full' is the default since existing rounds are full-mode team assessments.

CREATE TYPE public.assessment_mode AS ENUM ('quick', 'full');

ALTER TABLE public.evaluation_rounds
  ADD COLUMN mode public.assessment_mode NOT NULL DEFAULT 'full';

COMMENT ON COLUMN public.evaluation_rounds.mode IS
  'quick = abbreviated public-funnel assessment; full = deep team assessment used for OPI.';
