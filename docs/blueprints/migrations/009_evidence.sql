-- Evidence bundle attached to an initiative; AI-graded by grade-evidence.
-- No score change happens without: evidence + AI grading + senior approval.

CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  artifact_id uuid REFERENCES public.artifacts(id) ON DELETE SET NULL,
  description text NOT NULL,
  quality_score numeric(5,2),
  ai_grading_rationale text,
  ai_confidence numeric(4,3),
  level_proposal integer CHECK (level_proposal IS NULL OR level_proposal BETWEEN 1 AND 5),
  graded_at timestamptz,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_initiative ON public.evidence(initiative_id);

ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_select_via_initiative"
ON public.evidence FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.initiatives i
  WHERE i.id = evidence.initiative_id
    AND public.has_company_role(auth.uid(), i.company_id, ARRAY['owner','admin','member']::public.company_role[])
));

CREATE POLICY "evidence_insert_via_initiative"
ON public.evidence FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.initiatives i
  WHERE i.id = evidence.initiative_id
    AND public.has_company_role(auth.uid(), i.company_id, ARRAY['owner','admin','member']::public.company_role[])
));
-- AI grading fields (quality_score, ai_*, level_proposal, graded_at) written
-- by grade-evidence (service role). No UPDATE policy for authenticated users.
