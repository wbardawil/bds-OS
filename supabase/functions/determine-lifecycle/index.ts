// BDS OS — Edge Function: Determine Lifecycle Stage
// POST { org_id }
// Computes lifecycle stage from revenue + employee count and updates the organization.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

const REVENUE_MIDPOINTS: Record<string, number> = {
  'pre-revenue': 0,
  '0-100k': 50_000,
  '100k-500k': 300_000,
  '500k-1m': 750_000,
  '1m-5m': 3_000_000,
  '5m-10m': 7_500_000,
  '10m-25m': 17_500_000,
  '25m-50m': 37_500_000,
  '50m-100m': 75_000_000,
  '100m+': 150_000_000,
};

type LifecycleStage = 'startup' | 'growth' | 'scale' | 'mature';

function determineStage(revenueRange: string | null, employeeCount: number | null): LifecycleStage {
  const revenue = REVENUE_MIDPOINTS[(revenueRange ?? '').toLowerCase().replace(/\s/g, '')] ?? 0;
  const employees = employeeCount ?? 0;

  const stageOrder: LifecycleStage[] = ['startup', 'growth', 'scale', 'mature'];

  let revenueStage: LifecycleStage = 'startup';
  if (revenue >= 50_000_000) revenueStage = 'mature';
  else if (revenue >= 10_000_000) revenueStage = 'scale';
  else if (revenue >= 1_000_000) revenueStage = 'growth';

  let employeeStage: LifecycleStage = 'startup';
  if (employees > 200) employeeStage = 'mature';
  else if (employees >= 50) employeeStage = 'scale';
  else if (employees >= 10) employeeStage = 'growth';

  return stageOrder[Math.max(stageOrder.indexOf(revenueStage), stageOrder.indexOf(employeeStage))];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { organization_id } = await req.json();
    if (!organization_id) return errorResponse('Missing organization_id');

    const supabase = createServiceClient();

    // Fetch org
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, revenue_range, employee_count, lifecycle_stage')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) return errorResponse('Organization not found', 404);

    // Compute lifecycle stage
    const newStage = determineStage(org.revenue_range, org.employee_count);
    const previousStage = org.lifecycle_stage;

    // Update if changed
    if (newStage !== previousStage) {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ lifecycle_stage: newStage })
        .eq('id', organization_id);

      if (updateError) return errorResponse(`Failed to update: ${updateError.message}`);
    }

    return jsonResponse({
      organization_id,
      previous_stage: previousStage,
      current_stage: newStage,
      changed: newStage !== previousStage,
      inputs: {
        revenue_range: org.revenue_range,
        employee_count: org.employee_count,
      },
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
