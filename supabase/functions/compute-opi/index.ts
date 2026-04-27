// BDS OS — Edge Function: Compute OPI
// POST { round_id, org_id }
// Computes OPI scores for all 82 practices in an assessment round.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse, CORS_HEADERS } from '../shared/cors.ts';

// Import engine logic (bundled at deploy time)
// In production these would be bundled; here we inline the core logic.

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { round_id, organization_id } = await req.json();
    if (!round_id || !organization_id) {
      return errorResponse('Missing round_id or organization_id');
    }

    const supabase = createServiceClient();

    // 1. Fetch organization to determine lifecycle stage
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('lifecycle_stage, revenue_range, employee_count')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) return errorResponse('Organization not found', 404);

    // 2. Fetch round responses
    const { data: responses, error: respError } = await supabase
      .from('round_responses')
      .select('practice_id, importance_score, competency_score')
      .eq('round_id', round_id)
      .eq('organization_id', organization_id);

    if (respError) return errorResponse(`Failed to fetch responses: ${respError.message}`);
    if (!responses || responses.length === 0) return errorResponse('No responses found for this round');

    // 3. Fetch practice metadata
    const { data: metadata, error: metaError } = await supabase
      .from('practice_metadata')
      .select('practice_id, pnl_impact, speed_to_impact, dependency_score, risk_floor, risk_floor_level');

    if (metaError) return errorResponse(`Failed to fetch metadata: ${metaError.message}`);

    // 4. Fetch lifecycle weights for this stage
    const lifecycleStage = org.lifecycle_stage ?? 'startup';
    const { data: weights, error: weightsError } = await supabase
      .from('lifecycle_weights')
      .select('w1_gap, w2_pnl, w3_speed, w4_dependency, w5_risk')
      .eq('lifecycle_stage', lifecycleStage)
      .single();

    if (weightsError || !weights) return errorResponse('Lifecycle weights not configured');

    // 5. Build OPI inputs by joining responses with metadata
    const metadataMap = new Map(metadata!.map((m: any) => [m.practice_id, m]));
    const lifecycleModifiers: Record<string, number> = {
      startup: 1.2, growth: 1.1, scale: 1.0, mature: 0.9,
    };
    const lifecycleMod = lifecycleModifiers[lifecycleStage] ?? 1.0;

    const opiResults: any[] = [];
    for (const resp of responses) {
      const meta = metadataMap.get(resp.practice_id);
      if (!meta) continue;

      const gap = Math.max(0, Math.min(5, resp.importance_score - resp.competency_score));
      const riskFloorTriggered = meta.risk_floor && meta.risk_floor_level !== null
        && resp.competency_score < meta.risk_floor_level;
      const riskValue = riskFloorTriggered ? (meta.risk_floor_level ?? 0) : 0;

      const weightedGap = gap * weights.w1_gap;
      const pnlScore = meta.pnl_impact * weights.w2_pnl;
      const speedScore = meta.speed_to_impact * weights.w3_speed;
      const dependencyScore = meta.dependency_score * weights.w4_dependency;
      const riskScore = riskValue * weights.w5_risk;

      const finalOpi = Math.round(
        (weightedGap + pnlScore + speedScore + dependencyScore + riskScore) * lifecycleMod * 1000,
      ) / 1000;

      let phaseNumber: number;
      if (finalOpi >= 3.5 || riskFloorTriggered) {
        phaseNumber = 1;
      } else if (finalOpi >= 2.0) {
        phaseNumber = 2;
      } else {
        phaseNumber = 3;
      }

      opiResults.push({
        practice_id: resp.practice_id,
        gap, weighted_gap: weightedGap, pnl_score: pnlScore,
        speed_score: speedScore, dependency_score: dependencyScore,
        risk_score: riskScore, lifecycle_mod: lifecycleMod,
        final_opi: finalOpi, phase_number: phaseNumber,
        risk_floor_triggered: riskFloorTriggered,
      });
    }

    // 6. Rank within phases
    const phaseGroups = new Map<number, typeof opiResults>();
    for (const r of opiResults) {
      const group = phaseGroups.get(r.phase_number) ?? [];
      group.push(r);
      phaseGroups.set(r.phase_number, group);
    }

    let globalRank = 1;
    for (const phase of [1, 2, 3]) {
      const group = phaseGroups.get(phase) ?? [];
      group.sort((a: any, b: any) => b.final_opi - a.final_opi);
      for (const r of group) {
        r.priority_rank = globalRank++;
      }
    }

    // 7. Upsert into opi_scores
    const upsertRows = opiResults.map((r) => ({
      round_id,
      organization_id,
      practice_id: r.practice_id,
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
      computed_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from('opi_scores')
      .upsert(upsertRows, { onConflict: 'round_id,organization_id,practice_id' });

    if (upsertError) return errorResponse(`Failed to save OPI scores: ${upsertError.message}`);

    // 8. Return ranked results
    const phaseSummary = {
      proof: opiResults.filter((r) => r.phase_number === 1).length,
      structure: opiResults.filter((r) => r.phase_number === 2).length,
      scale: opiResults.filter((r) => r.phase_number === 3).length,
    };

    return jsonResponse({
      organization_id,
      round_id,
      lifecycle_stage: lifecycleStage,
      lifecycle_mod: lifecycleMod,
      total_practices: opiResults.length,
      phase_summary: phaseSummary,
      scores: opiResults.sort((a: any, b: any) => a.priority_rank - b.priority_rank),
      computed_at: new Date().toISOString(),
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
