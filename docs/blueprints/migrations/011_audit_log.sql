-- Append-only history. Immutable: no UPDATE/DELETE policies.
-- Edge functions write entries on score-change approvals, evidence grading,
-- initiative status transitions, and other state changes worth replaying.

CREATE TYPE public.audit_action AS ENUM (
  'create', 'update', 'delete', 'status_change', 'grade', 'approve', 'reject'
);

CREATE TYPE public.audit_resource_type AS ENUM (
  'round_response', 'opi_score', 'focus_portfolio', 'initiative',
  'evidence', 'score_change_request', 'approval', 'invitation'
);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.audit_action NOT NULL,
  resource_type public.audit_resource_type NOT NULL,
  resource_id uuid,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_company_created ON public.audit_log(company_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_user_created ON public.audit_log(user_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_member"
ON public.audit_log FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','member']::public.company_role[]));

CREATE POLICY "audit_log_insert_member"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','member']::public.company_role[]));
-- No UPDATE or DELETE policies. Entries are immutable.
