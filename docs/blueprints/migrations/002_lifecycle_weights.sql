-- W1..W5 must sum to 1.000 per stage. Modifier multiplies the weighted sum.
-- Source of truth: bds-os src/constants/lifecycle-weights.ts.

CREATE TABLE public.lifecycle_weights (
  id serial PRIMARY KEY,
  lifecycle_stage public.lifecycle_stage NOT NULL UNIQUE,
  w1_gap numeric(4,3) NOT NULL CHECK (w1_gap BETWEEN 0 AND 1),
  w2_pnl numeric(4,3) NOT NULL CHECK (w2_pnl BETWEEN 0 AND 1),
  w3_speed numeric(4,3) NOT NULL CHECK (w3_speed BETWEEN 0 AND 1),
  w4_dependency numeric(4,3) NOT NULL CHECK (w4_dependency BETWEEN 0 AND 1),
  w5_risk numeric(4,3) NOT NULL CHECK (w5_risk BETWEEN 0 AND 1),
  modifier numeric(4,3) NOT NULL,
  CHECK (w1_gap + w2_pnl + w3_speed + w4_dependency + w5_risk = 1.000)
);

ALTER TABLE public.lifecycle_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lifecycle_weights_read_all_authenticated"
ON public.lifecycle_weights FOR SELECT TO authenticated
USING (true);

INSERT INTO public.lifecycle_weights
  (lifecycle_stage, w1_gap, w2_pnl, w3_speed, w4_dependency, w5_risk, modifier)
VALUES
  ('startup', 0.350, 0.200, 0.250, 0.100, 0.100, 1.200),
  ('growth',  0.250, 0.300, 0.200, 0.125, 0.125, 1.100),
  ('scale',   0.200, 0.250, 0.150, 0.200, 0.200, 1.000),
  ('mature',  0.150, 0.200, 0.100, 0.250, 0.300, 0.900);
