// BDS OS — Edge Function: Get Delegated Assignment
//
// POST { token }
// No auth header — token IS the auth, matching submit-delegated-response.
// Returns the assignment metadata + scoped practices + their rubrics so the
// /delegated/:token UI can render without exposing any other company data.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

const HARD_EXPIRY_DAYS = 30;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!token) return errorResponse('Missing token');

    const { data: assignment, error: assignError } = await supabase
      .from('practice_assignments')
      .select(
        'id, round_id, company_id, practice_id, customer_pillar_id, assignee_email, assignee_name, message, due_at, completed_at, created_at',
      )
      .eq('share_token', token)
      .maybeSingle();

    if (assignError || !assignment) return errorResponse('Assignment not found', 404);
    if (assignment.completed_at) return errorResponse('Assignment already submitted', 410);

    const ageMs = Date.now() - new Date(assignment.created_at).getTime();
    if (ageMs > HARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
      return errorResponse('Assignment expired', 410);
    }

    // Pull scoped practices.
    let practices: any[] = [];
    if (assignment.practice_id) {
      const { data } = await supabase
        .from('practices')
        .select('id, external_id, statement, description, customer_pillar_id, universal_pillar_id, sort_order')
        .eq('id', assignment.practice_id);
      practices = data ?? [];
    } else if (assignment.customer_pillar_id) {
      const { data } = await supabase
        .from('practices')
        .select('id, external_id, statement, description, customer_pillar_id, universal_pillar_id, sort_order')
        .eq('customer_pillar_id', assignment.customer_pillar_id)
        .eq('is_active', true)
        .order('sort_order');
      practices = data ?? [];
    }

    // Pull the maturity rubrics for these practices.
    const practiceIds = practices.map((p) => p.id);
    const { data: rubrics } = await supabase
      .from('maturity_rubrics')
      .select('practice_id, level, descriptor, evidence_criteria')
      .in('practice_id', practiceIds.length > 0 ? practiceIds : ['00000000-0000-0000-0000-000000000000'])
      .order('level');

    // Pull the scope's pillar label (for the header).
    let pillarLabel: string | null = null;
    if (assignment.customer_pillar_id) {
      const { data: pillar } = await supabase
        .from('customer_pillars')
        .select('label')
        .eq('id', assignment.customer_pillar_id)
        .single();
      pillarLabel = pillar?.label ?? null;
    }

    // Inviter name + company name (so the UI can show "Inviter at Company invited you").
    let inviterName: string | null = null;
    if ((assignment as any).assigned_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', (assignment as any).assigned_by)
        .maybeSingle();
      inviterName = profile?.full_name ?? null;
    }
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', assignment.company_id)
      .single();

    return jsonResponse({
      assignment: {
        id: assignment.id,
        round_id: assignment.round_id,
        company_id: assignment.company_id,
        company_name: company?.name ?? null,
        inviter_name: inviterName,
        assignee_email: assignment.assignee_email,
        assignee_name: assignment.assignee_name,
        message: assignment.message,
        due_at: assignment.due_at,
        scope: {
          type: assignment.practice_id ? 'practice' : 'pillar_block',
          pillar_label: pillarLabel,
        },
      },
      practices: practices.map((p) => ({
        id: p.id,
        external_id: p.external_id,
        statement: p.statement,
        description: p.description,
        sort_order: p.sort_order,
      })),
      rubrics: (rubrics ?? []).map((r) => ({
        practice_id: r.practice_id,
        level: r.level,
        descriptor: r.descriptor,
        evidence_criteria: r.evidence_criteria,
      })),
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
