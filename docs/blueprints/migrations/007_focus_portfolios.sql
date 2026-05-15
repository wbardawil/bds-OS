-- WIP-capped active practice set per quarter, written by select-focus-portfolio.
-- WIP caps come from src/constants/wip-limits.ts at runtime, not the table.

CREATE TABLE public.focus_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES public.evaluation_rounds(id) ON DELETE CASCADE,
  quarter text NOT NULL,
  lifecycle_stage public.lifecycle_stage NOT NULL,
  wip_cap integer NOT NULL,
  active_question_ids text[] NOT NULL,
  selection_rationale jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, round_id, quarter)
);

CREATE INDEX idx_focus_portfolios_company_quarter ON public.focus_portfolios(company_id, quarter);

ALTER TABLE public.focus_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "focus_portfolios_select_member"
ON public.focus_portfolios FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','member']::public.company_role[]));
-- INSERT/UPDATE via service role (select-focus-portfolio).
