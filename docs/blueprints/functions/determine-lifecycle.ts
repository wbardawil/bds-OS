// Edge function: determine-lifecycle
// Input:  POST { company_id }
// Output: { company_id, lifecycle_stage, signals }
//
// Reads:  companies (industry, revenue_range, employee_count, years_in_operation)
// Writes: companies.lifecycle_stage
//
// Logic mirrors src/engines/lifecycle.ts exactly:
//   - parse revenue_range to a numeric midpoint
//   - independently classify by revenue and by employee count
//   - return the higher-stage signal
//
// PORT TARGET: strategy-spark-86/supabase/functions/determine-lifecycle/index.ts.
// Vendor src/engines/lifecycle.ts to supabase/functions/_shared/ on port.

import { createClient } from '@supabase/supabase-js';
import { determineLifecycleStage } from '../../src/engines/lifecycle.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { company_id } = await req.json();
    if (!company_id) return json({ error: 'company_id required' }, 400);

    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: c, error: ce } = await userClient
      .from('companies')
      .select('id, revenue_range, employee_count, years_in_operation, lifecycle_stage')
      .eq('id', company_id)
      .single();
    if (ce || !c) return json({ error: 'company not found or no access' }, 403);

    const stage = determineLifecycleStage({
      revenue_range: c.revenue_range,
      employee_count: c.employee_count,
    });

    const { error: ue } = await service
      .from('companies')
      .update({ lifecycle_stage: stage })
      .eq('id', company_id);
    if (ue) return json({ error: ue.message }, 500);

    // No audit_log entry yet — audit_resource_type enum doesn't include
    // a 'company' value. If lifecycle changes need to be audited, extend the
    // enum in a follow-up migration (M7+).

    return json({
      company_id,
      lifecycle_stage: stage,
      signals: {
        revenue_range: c.revenue_range,
        employee_count: c.employee_count,
        years_in_operation: c.years_in_operation,
        previous_stage: c.lifecycle_stage,
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
