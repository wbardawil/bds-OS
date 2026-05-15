-- Execution units inside a focus portfolio. Status follows strict workflow:
--   backlog -> planned -> in_progress -> evidence_ready ->
--   ai_pre_graded -> pending_verification -> approved.

CREATE TYPE public.initiative_status AS ENUM (
  'backlog', 'planned', 'in_progress', 'evidence_ready',
  'ai_pre_graded', 'pending_verification', 'approved'
);

CREATE TABLE public.initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  focus_portfolio_id uuid REFERENCES public.focus_portfolios(id) ON DELETE SET NULL,
  question_id text NOT NULL REFERENCES public.practice_metadata(question_id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status public.initiative_status NOT NULL DEFAULT 'backlog',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_initiatives_company_status ON public.initiatives(company_id, status);
CREATE INDEX idx_initiatives_question ON public.initiatives(question_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER initiatives_touch_updated_at
  BEFORE UPDATE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "initiatives_select_member"
ON public.initiatives FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','member']::public.company_role[]));

CREATE POLICY "initiatives_modify_admin"
ON public.initiatives FOR ALL TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]))
WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]));

CREATE TABLE public.artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text,
  type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_artifacts_initiative ON public.artifacts(initiative_id);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artifacts_select_via_initiative"
ON public.artifacts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.initiatives i
  WHERE i.id = artifacts.initiative_id
    AND public.has_company_role(auth.uid(), i.company_id, ARRAY['owner','admin','member']::public.company_role[])
));

CREATE POLICY "artifacts_insert_via_initiative"
ON public.artifacts FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.initiatives i
  WHERE i.id = artifacts.initiative_id
    AND public.has_company_role(auth.uid(), i.company_id, ARRAY['owner','admin','member']::public.company_role[])
));
