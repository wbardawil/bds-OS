// Edge function: select-focus-portfolio
// Input:  POST { company_id, round_id, quarter }
// Output: { portfolio_id, lifecycle_stage, wip_cap, selected: [...] }
//
// Reads:  opi_scores (must already be computed), companies (lifecycle_stage)
// Writes: focus_portfolios (upsert by company+round+quarter),
//         initiatives (one stub per newly-selected question), audit_log
//
// Selection logic:
//   1. risk_floor_triggered -> forced in (override), capped at wip_cap.max
//   2. Phase 1 by priority_rank -> fill until wip_cap.max
//   3. If selected < wip_cap.min, fill from Phase 2 by priority_rank, capped at max
//
// PORT TARGET: strategy-spark-86/supabase/functions/select-focus-portfolio/index.ts.

import { createClient } from '@supabase/supabase-js';
import { WIP_LIMITS } from '../../src/constants/wip-limits.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { company_id, round_id, quarter } = await req.json();
    if (!company_id || !round_id || !quarter) {
      return json({ error: 'company_id, round_id, quarter required' }, 400);
    }

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

    const { data: company } = await userClient
      .from('companies').select('lifecycle_stage').eq('id', company_id).single();
    if (!company?.lifecycle_stage) return json({ error: 'lifecycle_stage missing; run determine-lifecycle' }, 400);

    const stage = company.lifecycle_stage as keyof typeof WIP_LIMITS;
    const limits = WIP_LIMITS[stage];

    const { data: scores } = await userClient
      .from('opi_scores')
      .select('question_id, phase_number, priority_rank, risk_floor_triggered, final_opi')
      .eq('round_id', round_id)
      .order('priority_rank', { ascending: true });
    if (!scores || scores.length === 0) {
      return json({ error: 'no opi_scores for round; run compute-opi first' }, 400);
    }

    type Pick = { question_id: string; reason: string; final_opi: number; phase: number };
    const selected: Pick[] = [];
    const seen = new Set<string>();

    // Tier 1: risk floor overrides
    for (const s of scores) {
      if (s.risk_floor_triggered && selected.length < limits.max_active_practices) {
        selected.push({ question_id: s.question_id, reason: 'risk_floor_override', final_opi: s.final_opi, phase: s.phase_number });
        seen.add(s.question_id);
      }
    }
    // Tier 2: phase 1
    for (const s of scores) {
      if (seen.has(s.question_id)) continue;
      if (s.phase_number === 1 && selected.length < limits.max_active_practices) {
        selected.push({ question_id: s.question_id, reason: 'phase_1_priority', final_opi: s.final_opi, phase: 1 });
        seen.add(s.question_id);
      }
    }
    // Tier 3: phase 2 fill (only if under min)
    if (selected.length < limits.min_active_practices) {
      for (const s of scores) {
        if (seen.has(s.question_id)) continue;
        if (s.phase_number === 2 && selected.length < limits.max_active_practices) {
          selected.push({ question_id: s.question_id, reason: 'phase_2_fill', final_opi: s.final_opi, phase: 2 });
          seen.add(s.question_id);
        }
        if (selected.length >= limits.min_active_practices) break;
      }
    }

    const { data: portfolio, error: pe } = await service.from('focus_portfolios').upsert({
      company_id,
      round_id,
      quarter,
      lifecycle_stage: stage,
      wip_cap: limits.max_active_practices,
      active_question_ids: selected.map((s) => s.question_id),
      selection_rationale: selected,
    }, { onConflict: 'company_id,round_id,quarter' }).select().single();
    if (pe) return json({ error: pe.message }, 500);

    // Auto-create initiative stubs for newly selected questions
    const { data: existing } = await service
      .from('initiatives')
      .select('question_id')
      .eq('company_id', company_id)
      .in('question_id', selected.map((s) => s.question_id));
    const existingSet = new Set((existing ?? []).map((e) => e.question_id));
    const newStubs = selected
      .filter((s) => !existingSet.has(s.question_id))
      .map((s) => ({
        company_id,
        focus_portfolio_id: portfolio.id,
        question_id: s.question_id,
        title: `Lift ${s.question_id}`,
        status: 'backlog' as const,
      }));
    if (newStubs.length) await service.from('initiatives').insert(newStubs);

    await service.from('audit_log').insert({
      company_id,
      action: 'create',
      resource_type: 'focus_portfolio',
      resource_id: portfolio.id,
      metadata: { quarter, selected_count: selected.length, new_initiative_stubs: newStubs.length },
    });

    return json({
      portfolio_id: portfolio.id,
      lifecycle_stage: stage,
      wip_cap: limits.max_active_practices,
      wip_min: limits.min_active_practices,
      selected,
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
