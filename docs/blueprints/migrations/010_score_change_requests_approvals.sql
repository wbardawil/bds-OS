-- Formal request to upgrade a question's maturity level. Requires senior approval.

CREATE TYPE public.score_change_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');

CREATE TABLE public.score_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES public.practice_metadata(question_id) ON DELETE RESTRICT,
  round_id uuid NOT NULL REFERENCES public.evaluation_rounds(id) ON DELETE CASCADE,
  current_level integer NOT NULL CHECK (current_level BETWEEN 1 AND 5),
  proposed_level integer NOT NULL CHECK (proposed_level BETWEEN 1 AND 5),
  evidence_ids uuid[] NOT NULL DEFAULT '{}',
  ai_grade jsonb,
  status public.score_change_status NOT NULL DEFAULT 'pending',
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (proposed_level > current_level)
);

CREATE INDEX idx_scr_company_status ON public.score_change_requests(company_id, status);

ALTER TABLE public.score_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scr_select_member"
ON public.score_change_requests FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','member']::public.company_role[]));

CREATE POLICY "scr_insert_member"
ON public.score_change_requests FOR INSERT TO authenticated
WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','member']::public.company_role[]));

CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_change_request_id uuid NOT NULL REFERENCES public.score_change_requests(id) ON DELETE CASCADE,
  approved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select_via_scr"
ON public.approvals FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.score_change_requests s
  WHERE s.id = approvals.score_change_request_id
    AND public.has_company_role(auth.uid(), s.company_id, ARRAY['owner','admin','member']::public.company_role[])
));

CREATE POLICY "approvals_insert_admin"
ON public.approvals FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.score_change_requests s
  WHERE s.id = approvals.score_change_request_id
    AND public.has_company_role(auth.uid(), s.company_id, ARRAY['owner','admin']::public.company_role[])
));
