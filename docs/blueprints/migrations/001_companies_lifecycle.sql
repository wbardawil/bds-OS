-- Adds lifecycle_stage and the inputs determine-lifecycle reads.
-- Drives OPI lifecycle modifier and weight selection.

CREATE TYPE public.lifecycle_stage AS ENUM ('startup', 'growth', 'scale', 'mature');

ALTER TABLE public.companies
  ADD COLUMN lifecycle_stage public.lifecycle_stage,
  ADD COLUMN industry text,
  ADD COLUMN revenue_range text,
  ADD COLUMN employee_count integer,
  ADD COLUMN years_in_operation integer;

COMMENT ON COLUMN public.companies.lifecycle_stage IS
  'Computed by the determine-lifecycle edge function from revenue_range + employee_count + years_in_operation. NULL until first run.';
