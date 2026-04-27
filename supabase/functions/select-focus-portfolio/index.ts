// BDS OS — Edge Function: Select Focus Portfolio
// POST { org_id, round_id, quarter }
// Selects the WIP-limited set of active practices and auto-generates initiative stubs.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

type LifecycleStage = 'startup' | 'growth' | 'scale' | 'mature';

const WIP_LIMITS: Record<LifecycleStage, { min: number; max: number }> = {
  startup: { min: 3, max: 5 },
  growth: { min: 5, max: 7 },
  scale: { min: 6, max: 9 },
  mature: { min: 7, max: 9 },
};

const DELIVERY_OPERATIONS_AREA_ID = 7;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { organization_id, round_id, quarter } = await req.json();
    if (!organization_id || !round_id || !quarter) {
      return errorResponse('Missing organization_id, round_id, or quarter');
    }

    const supabase = createServiceClient();

    // 1. Fetch org lifecycle stage
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('lifecycle_stage')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) return errorResponse('Organization not found', 404);
    const lifecycleStage: LifecycleStage = org.lifecycle_stage ?? 'startup';
    const maxActive = WIP_LIMITS[lifecycleStage].max;

    // 2. Fetch OPI scores for this round
    const { data: opiScores, error: opiError } = await supabase
      .from('opi_scores')
      .select('practice_id, final_opi, phase_number, risk_floor_triggered, priority_rank')
      .eq('round_id', round_id)
      .eq('organization_id', organization_id)
      .order('priority_rank', { ascending: true });

    if (opiError) return errorResponse(`Failed to fetch OPI scores: ${opiError.message}`);
    if (!opiScores || opiScores.length === 0) return errorResponse('No OPI scores found. Run compute-opi first.');

    // 3. Fetch practice → area mapping
    const { data: practices, error: practError } = await supabase
      .from('practices')
      .select('id, area_id, name');

    if (practError) return errorResponse(`Failed to fetch practices: ${practError.message}`);
    const practiceAreaMap = new Map(practices!.map((p: any) => [p.id, p.area_id]));
    const practiceNameMap = new Map(practices!.map((p: any) => [p.id, p.name]));

    // 4. Fetch dependencies
    const { data: deps } = await supabase
      .from('practice_dependencies')
      .select('practice_id, depends_on_practice_id');

    // 5. Select portfolio
    const selected: Array<{ practice_id: number; reason: string; final_opi: number; phase: number }> = [];
    const selectedIds = new Set<number>();
    const areaCount = new Map<number, number>();

    function addPractice(practiceId: number, reason: string, opi: number, phase: number) {
      if (selectedIds.has(practiceId)) return;
      selectedIds.add(practiceId);
      const areaId = practiceAreaMap.get(practiceId) ?? 0;
      areaCount.set(areaId, (areaCount.get(areaId) ?? 0) + 1);
      selected.push({ practice_id: practiceId, reason, final_opi: opi, phase });
    }

    function wouldExceedConcentration(practiceId: number): boolean {
      const areaId = practiceAreaMap.get(practiceId) ?? 0;
      const current = areaCount.get(areaId) ?? 0;
      return (current + 1) / (selected.length + 1) > 0.6;
    }

    // Rule 1: Risk floor overrides
    for (const score of opiScores) {
      if (score.risk_floor_triggered) {
        addPractice(score.practice_id, 'risk_floor_override', score.final_opi, score.phase_number);
      }
    }

    // Rule 2: Phase 1 practices
    const phase1 = opiScores.filter((s: any) => s.phase_number === 1 && !s.risk_floor_triggered);
    for (const score of phase1) {
      if (selected.length >= maxActive) break;
      if (wouldExceedConcentration(score.practice_id)) continue;
      addPractice(score.practice_id, 'phase_1_priority', score.final_opi, score.phase_number);
    }

    // Rule 3: Phase 2 fill
    const phase2 = opiScores.filter((s: any) => s.phase_number === 2);
    for (const score of phase2) {
      if (selected.length >= maxActive) break;
      if (wouldExceedConcentration(score.practice_id)) continue;
      addPractice(score.practice_id, 'phase_2_fill', score.final_opi, score.phase_number);
    }

    // Rule 4: Ensure at least 1 Delivery & Operations practice
    const hasDelivery = selected.some((s) => practiceAreaMap.get(s.practice_id) === DELIVERY_OPERATIONS_AREA_ID);
    if (!hasDelivery) {
      const deliveryCandidates = opiScores
        .filter((s: any) => practiceAreaMap.get(s.practice_id) === DELIVERY_OPERATIONS_AREA_ID && !selectedIds.has(s.practice_id));
      if (deliveryCandidates.length > 0) {
        const best = deliveryCandidates[0];
        if (selected.length >= maxActive) {
          // Replace lowest non-risk-floor practice
          for (let i = selected.length - 1; i >= 0; i--) {
            if (selected[i].reason !== 'risk_floor_override') {
              const removed = selected.splice(i, 1)[0];
              selectedIds.delete(removed.practice_id);
              const areaId = practiceAreaMap.get(removed.practice_id) ?? 0;
              areaCount.set(areaId, (areaCount.get(areaId) ?? 0) - 1);
              break;
            }
          }
        }
        addPractice(best.practice_id, 'execution_requirement', best.final_opi, best.phase_number);
      }
    }

    // 6. Save focus portfolio
    const activePracticeIds = selected.map((s) => s.practice_id);

    const { error: insertError } = await supabase
      .from('focus_portfolios')
      .insert({
        organization_id,
        round_id,
        quarter,
        lifecycle_stage: lifecycleStage,
        max_active: maxActive,
        active_practice_ids: activePracticeIds,
      });

    if (insertError) return errorResponse(`Failed to save portfolio: ${insertError.message}`);

    // 7. Auto-generate initiative stubs for each active practice
    const initiativeStubs = activePracticeIds.map((practiceId) => ({
      organization_id,
      practice_id: practiceId,
      title: `${quarter} — ${practiceNameMap.get(practiceId) ?? 'Practice'} Initiative`,
      description: `Auto-generated initiative for ${practiceNameMap.get(practiceId)} in ${quarter}`,
      status: 'backlog',
    }));

    const { error: initError } = await supabase
      .from('initiatives')
      .insert(initiativeStubs);

    if (initError) return errorResponse(`Failed to create initiatives: ${initError.message}`);

    // 8. Return portfolio
    return jsonResponse({
      organization_id,
      round_id,
      quarter,
      lifecycle_stage: lifecycleStage,
      max_active: maxActive,
      selected_practices: selected.map((s) => ({
        practice_id: s.practice_id,
        practice_name: practiceNameMap.get(s.practice_id) ?? '',
        selection_reason: s.reason,
        final_opi: s.final_opi,
        phase_number: s.phase,
      })),
      initiatives_created: initiativeStubs.length,
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
