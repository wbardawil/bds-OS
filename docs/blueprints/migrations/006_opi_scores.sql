-- Computed by the compute-opi edge function after a round closes.
-- Phase: 1 = Proof (final_opi >= 3.5 OR risk_floor_triggered),
--        2 = Structure (2.0 <= final_opi < 3.5),
--        3 = Scale     (final_opi < 2.0).

CREATE TABLE public.opi_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.evaluation_rounds(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_id text NOT NULL REFERENCES public.practice_metadata(question_id) ON DELETE RESTRICT,
  gap numeric(5,3) NOT NULL,
  weighted_gap numeric(5,3) NOT NULL,
  pnl_score numeric(5,3) NOT NULL,
  speed_score numeric(5,3) NOT NULL,
  dependency_score numeric(5,3) NOT NULL,
  risk_score numeric(5,3) NOT NULL,
  lifecycle_mod numeric(4,3) NOT NULL,
  final_opi numeric(5,3) NOT NULL,
  phase_number integer NOT NULL CHECK (phase_number BETWEEN 1 AND 3),
  priority_rank integer NOT NULL,
  risk_floor_triggered boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, question_id)
);

CREATE INDEX idx_opi_scores_company_round ON public.opi_scores(company_id, round_id);
CREATE INDEX idx_opi_scores_round_phase ON public.opi_scores(round_id, phase_number, priority_rank);

ALTER TABLE public.opi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opi_scores_select_member"
ON public.opi_scores FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','member']::public.company_role[]));
-- INSERT/UPDATE deliberately not exposed; compute-opi uses service role.
