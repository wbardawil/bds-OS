// BDS OS — Engine 2: OPI (Operational Priority Index) Computation
//
// Formula:
//   OPI = [(Gap × W1) + (P&L × W2) + (Speed × W3) + (Dependency × W4) + (Risk × W5)] × Lifecycle_Mod
//
// Where:
//   Gap = importance_score − competency_score (clamped to 0–5)
//   P&L = practice_metadata.pnl_impact (1–5)
//   Speed = practice_metadata.speed_to_impact (1–5)
//   Dependency = practice_metadata.dependency_score (1–5)
//   Risk = risk_floor_triggered ? risk_floor_level : 0
//
// Phase Assignment:
//   Phase 1 (Proof):     OPI ≥ 3.5 OR risk_floor_triggered
//   Phase 2 (Structure): 2.0 ≤ OPI < 3.5
//   Phase 3 (Scale):     OPI < 2.0
//
// Priority Rank: descending OPI within each phase.

import type { OPIInput, OPIResult, LifecycleWeights } from '../types/opi.js';

/**
 * Compute OPI scores for a set of practice inputs.
 * Returns ranked results with phase assignments.
 */
export function computeOPI(
  inputs: OPIInput[],
  weights: LifecycleWeights,
  lifecycleMod: number,
): OPIResult[] {
  // Step 1: Compute raw OPI for each practice
  const rawResults: OPIResult[] = inputs.map((input) => {
    const gap = Math.max(0, Math.min(5, input.importance_score - input.competency_score));
    const riskFloorTriggered = input.risk_floor && input.risk_floor_level !== null
      && input.competency_score < input.risk_floor_level;

    const riskValue = riskFloorTriggered ? (input.risk_floor_level ?? 0) : 0;

    const weightedGap = gap * weights.w1_gap;
    const pnlScore = input.pnl_impact * weights.w2_pnl;
    const speedScore = input.speed_to_impact * weights.w3_speed;
    const dependencyScore = input.dependency_score * weights.w4_dependency;
    const riskScore = riskValue * weights.w5_risk;

    const rawOPI = (weightedGap + pnlScore + speedScore + dependencyScore + riskScore) * lifecycleMod;
    const finalOPI = Math.round(rawOPI * 1000) / 1000; // 3 decimal precision

    // Phase assignment
    let phaseNumber: 1 | 2 | 3;
    let phaseLabel: 'Proof' | 'Structure' | 'Scale';

    if (finalOPI >= 3.5 || riskFloorTriggered) {
      phaseNumber = 1;
      phaseLabel = 'Proof';
    } else if (finalOPI >= 2.0) {
      phaseNumber = 2;
      phaseLabel = 'Structure';
    } else {
      phaseNumber = 3;
      phaseLabel = 'Scale';
    }

    return {
      practice_id: input.practice_id,
      gap,
      weighted_gap: Math.round(weightedGap * 1000) / 1000,
      pnl_score: Math.round(pnlScore * 1000) / 1000,
      speed_score: Math.round(speedScore * 1000) / 1000,
      dependency_score: Math.round(dependencyScore * 1000) / 1000,
      risk_score: Math.round(riskScore * 1000) / 1000,
      lifecycle_mod: lifecycleMod,
      final_opi: finalOPI,
      phase_number: phaseNumber,
      phase_label: phaseLabel,
      priority_rank: 0, // assigned in step 2
      risk_floor_triggered: riskFloorTriggered,
    };
  });

  // Step 2: Rank within each phase (descending OPI)
  const phaseGroups: Map<number, OPIResult[]> = new Map();
  for (const result of rawResults) {
    const group = phaseGroups.get(result.phase_number) ?? [];
    group.push(result);
    phaseGroups.set(result.phase_number, group);
  }

  let globalRank = 1;
  for (const phase of [1, 2, 3]) {
    const group = phaseGroups.get(phase) ?? [];
    group.sort((a, b) => b.final_opi - a.final_opi);
    for (const result of group) {
      result.priority_rank = globalRank++;
    }
  }

  // Return sorted by priority rank
  return rawResults.sort((a, b) => a.priority_rank - b.priority_rank);
}
