// BDS OS — Edge Function: Create Organization
// POST { name, industry?, revenue_range?, employee_count?, years_in_operation? }
// First-time setup for a freshly signed-up user: creates an organization and
// makes the caller its admin. Caller must be authenticated and must NOT already
// belong to an organization. Org metadata (revenue range, employee count) feeds
// determine-lifecycle later.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);

    const supabase = createServiceClient();
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) return errorResponse('Invalid token', 401);
    const user = authData.user;

    const { data: existing } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) return errorResponse('User already belongs to an organization', 409);

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return errorResponse('Organization name is required');

    const industry = typeof body.industry === 'string' ? body.industry.trim() : null;
    const revenueRange = typeof body.revenue_range === 'string' ? body.revenue_range.trim() : null;
    const employeeCount =
      typeof body.employee_count === 'number' && Number.isFinite(body.employee_count)
        ? Math.max(0, Math.floor(body.employee_count))
        : null;
    const yearsInOperation =
      typeof body.years_in_operation === 'number' && Number.isFinite(body.years_in_operation)
        ? Math.max(0, Math.floor(body.years_in_operation))
        : null;

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        industry,
        revenue_range: revenueRange,
        employee_count: employeeCount,
        years_in_operation: yearsInOperation,
      })
      .select()
      .single();

    if (orgError) return errorResponse(`Failed to create organization: ${orgError.message}`);

    const displayName =
      (user.user_metadata?.name as string | undefined) ?? user.email ?? 'Admin';

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        organization_id: org.id,
        name: displayName,
        email: user.email,
        role: 'admin',
      });

    if (userError) {
      // Best-effort rollback so the orphaned org doesn't linger
      await supabase.from('organizations').delete().eq('id', org.id);
      return errorResponse(`Failed to create user: ${userError.message}`);
    }

    return jsonResponse({
      organization_id: org.id,
      organization_name: org.name,
      user_id: user.id,
      role: 'admin',
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
