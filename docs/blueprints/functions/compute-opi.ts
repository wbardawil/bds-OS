// Edge function: compute-opi
// Input:  POST { round_id: string, company_id: string }
// Output: { round_id, lifecycle_stage, lifecycle_mod, total, phase_summary, missing_metadata, scores }
//
// Reads:  evaluation_rounds, round_responses, companies (lifecycle_stage),
//         lifecycle_weights, practice_metadata
// Writes: opi_scores (delete-then-insert per round_id), audit_log
//
// Auth: caller must be a member of company_id. Service role used for writes.
//
// PORT TARGET: strategy-spark-86/supabase/functions/compute-opi/index.ts.
// On port, copy src/engines/opi.ts, src/adapters/lovable-jsonb-to-opi-input.ts,
// src/constants/lifecycle-weights.ts to supabase/functions/_shared/ and rewrite
// the imports below.

import { createClient } from '@supabase/supabase-js';
import { computeOPI } from '../../src/engines/opi.ts';
import {
  flattenCategoryScores,
  aggregateRespondents,
  toOPIInputs,
} from '../../src/adapters/lovable-jsonb-to-opi-input.ts';
import { LIFECYCLE_MODIFIERS } from '../../src/constants/lifecycle-weights.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { round_id, company_id } = await req.json();
    if (!round_id || !company_id) {
      return json({ error: 'round_id and company_id required' }, 400);
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

    // 1. Membership check (RLS on the read enforces it)
    const { data: company, error: ce } = await userClient
      .from('companies')
      .select('id, lifecycle_stage')
      .eq('id', company_id)
      .single();
    if (ce || !company) return json({ error: 'company not found or no access' }, 403);
    if (!company.lifecycle_stage) {
      return json({ error: 'company.lifecycle_stage is null; run determine-lifecycle first' }, 400);
    }

    // 2. Pull responses
    const { data: responses, error: re } = await userClient
      .from('round_responses')
      .select('category_scores')
      .eq('round_id', round_id);
    if (re) return json({ error: re.message }, 500);
    if (!responses || responses.length === 0) {
      return json({ error: 'no responses for round' }, 400);
    }

    // 3. Pull weights + metadata
    const [weightRowRes, metaRes] = await Promise.all([
      service.from('lifecycle_weights').select('*').eq('lifecycle_stage', company.lifecycle_stage).single(),
      service.from('practice_metadata').select('*'),
    ]);
    const weightRow = weightRowRes.data;
    const metadata = metaRes.data;
    if (!weightRow || !metadata) return json({ error: 'lifecycle_weights or practice_metadata missing' }, 500);

    // 4. Aggregate respondents + adapt to engine input
    const perRespondent = responses.map((r) => flattenCategoryScores(r.category_scores ?? {}));
    const aggregated = aggregateRespondents(perRespondent);
    const { inputs, idMap, missingMetadata } = toOPIInputs(aggregated, metadata);

    if (inputs.length === 0) {
      return json({ error: 'no questions had both responses and metadata', missing_metadata: missingMetadata }, 400);
    }

    // 5. Compute
    const weights = {
      w1_gap: Number(weightRow.w1_gap),
      w2_pnl: Number(weightRow.w2_pnl),
      w3_speed: Number(weightRow.w3_speed),
      w4_dependency: Number(weightRow.w4_dependency),
      w5_risk: Number(weightRow.w5_risk),
    };
    const mod = weightRow.modifier !== undefined && weightRow.modifier !== null
      ? Number(weightRow.modifier)
      : (LIFECYCLE_MODIFIERS as Record<string, number>)[company.lifecycle_stage] ?? 1;

    const results = computeOPI(inputs, weights, mod);

    // 6. Persist (replace previous compute for this round)
    await service.from('opi_scores').delete().eq('round_id', round_id);
    const rows = results.map((r) => ({
      round_id,
      company_id,
      question_id: idMap.get(r.practice_id),
      gap: r.gap,
      weighted_gap: r.weighted_gap,
      pnl_score: r.pnl_score,
      speed_score: r.speed_score,
      dependency_score: r.dependency_score,
      risk_score: r.risk_score,
      lifecycle_mod: r.lifecycle_mod,
      final_opi: r.final_opi,
      phase_number: r.phase_number,
      priority_rank: r.priority_rank,
      risk_floor_triggered: r.risk_floor_triggered,
    }));
    const { error: ie } = await service.from('opi_scores').insert(rows);
    if (ie) return json({ error: ie.message }, 500);

    await service.from('audit_log').insert({
      company_id,
      action: 'create',
      resource_type: 'opi_score',
      resource_id: null,
      metadata: { round_id, count: rows.length, missing_metadata: missingMetadata },
    });

    const phaseSummary = { proof: 0, structure: 0, scale: 0 };
    for (const r of results) {
      if (r.phase_number === 1) phaseSummary.proof++;
      else if (r.phase_number === 2) phaseSummary.structure++;
      else phaseSummary.scale++;
    }

    return json({
      round_id,
      company_id,
      lifecycle_stage: company.lifecycle_stage,
      lifecycle_mod: mod,
      total: results.length,
      phase_summary: phaseSummary,
      missing_metadata: missingMetadata,
      scores: results,
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
