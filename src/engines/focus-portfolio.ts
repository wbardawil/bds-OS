// BDS OS — Engine 3: Adaptive Focus Portfolio
// Selects the WIP-limited set of active practices from ranked OPI scores.
//
// Selection Rules (in order):
//   1. Include all risk_floor_triggered practices (overrides WIP limit)
//   2. Add Phase 1 (Proof) practices, highest OPI first
//   3. Fill remaining slots from Phase 2 (Structure)
//   4. Enforce: at least 1 execution-heavy practice (Delivery & Operations area)
//   5. Enforce: no more than 60% of active practices from any single area
//   6. Respect dependency order (if A depends on B, B must be active or at Level 3+)
//   7. Cap at WIP limit for lifecycle stage

import type { LifecycleStage, PracticeDependency } from '../types/database.js';
import type { OPIResult, PracticeSelectionRationale, FocusPortfolioResult } from '../types/opi.js';
import { WIP_LIMITS } from '../constants/wip-limits.js';

// Area ID for Delivery & Operations (execution-heavy practices)
const DELIVERY_OPERATIONS_AREA_ID = 7;

export interface FocusPortfolioInput {
  opi_scores: OPIResult[];
  lifecycle_stage: LifecycleStage;
  practice_area_map: Map<number, number>; // practice_id → area_id
  dependencies: PracticeDependency[];
  current_levels: Map<number, number>; // practice_id → current competency level
  organization_id: string;
  round_id: string;
  quarter: string;
}

export function selectFocusPortfolio(input: FocusPortfolioInput): FocusPortfolioResult {
  const { opi_scores, lifecycle_stage, practice_area_map, dependencies, current_levels } = input;
  const wipLimit = WIP_LIMITS[lifecycle_stage];
  const maxActive = wipLimit.max_active_practices;

  const selected: PracticeSelectionRationale[] = [];
  const selectedIds = new Set<number>();
  const areaCount = new Map<number, number>();

  function getAreaId(practiceId: number): number {
    return practice_area_map.get(practiceId) ?? 0;
  }

  function addPractice(practiceId: number, reason: PracticeSelectionRationale['reason'], score: OPIResult) {
    if (selectedIds.has(practiceId)) return;
    selectedIds.add(practiceId);
    const areaId = getAreaId(practiceId);
    areaCount.set(areaId, (areaCount.get(areaId) ?? 0) + 1);
    selected.push({
      practice_id: practiceId,
      reason,
      final_opi: score.final_opi,
      phase_number: score.phase_number,
    });
  }

  function wouldExceedAreaConcentration(practiceId: number): boolean {
    const areaId = getAreaId(practiceId);
    const currentCount = areaCount.get(areaId) ?? 0;
    const totalAfterAdd = selected.length + 1;
    return (currentCount + 1) / totalAfterAdd > 0.6;
  }

  function hasDependenciesMet(practiceId: number): boolean {
    const deps = dependencies.filter((d) => d.practice_id === practiceId);
    return deps.every((dep) => {
      const depLevel = current_levels.get(dep.depends_on_practice_id) ?? 0;
      return selectedIds.has(dep.depends_on_practice_id) || depLevel >= 3;
    });
  }

  // Rule 1: Include ALL risk_floor_triggered practices (overrides WIP limit)
  const riskFloorPractices = opi_scores.filter((s) => s.risk_floor_triggered);
  for (const score of riskFloorPractices) {
    addPractice(score.practice_id, 'risk_floor_override', score);
  }

  // Rule 2: Add Phase 1 (Proof) practices, highest OPI first
  const phase1 = opi_scores
    .filter((s) => s.phase_number === 1 && !s.risk_floor_triggered)
    .sort((a, b) => b.final_opi - a.final_opi);

  for (const score of phase1) {
    if (selected.length >= maxActive) break;
    if (!hasDependenciesMet(score.practice_id)) continue;
    if (wouldExceedAreaConcentration(score.practice_id)) continue;
    addPractice(score.practice_id, 'phase_1_priority', score);
  }

  // Rule 3: Fill remaining from Phase 2 (Structure)
  const phase2 = opi_scores
    .filter((s) => s.phase_number === 2)
    .sort((a, b) => b.final_opi - a.final_opi);

  for (const score of phase2) {
    if (selected.length >= maxActive) break;
    if (!hasDependenciesMet(score.practice_id)) continue;
    if (wouldExceedAreaConcentration(score.practice_id)) continue;
    addPractice(score.practice_id, 'phase_2_fill', score);
  }

  // Rule 4: Ensure at least 1 execution-heavy practice (Delivery & Operations)
  const hasExecutionPractice = selected.some(
    (s) => getAreaId(s.practice_id) === DELIVERY_OPERATIONS_AREA_ID,
  );

  if (!hasExecutionPractice) {
    const executionCandidates = opi_scores
      .filter((s) => getAreaId(s.practice_id) === DELIVERY_OPERATIONS_AREA_ID && !selectedIds.has(s.practice_id))
      .sort((a, b) => b.final_opi - a.final_opi);

    if (executionCandidates.length > 0) {
      // Replace the lowest-ranked non-risk-floor practice if at WIP limit
      if (selected.length >= maxActive) {
        const replaceableIndex = [...selected]
          .reverse()
          .findIndex((s) => s.reason !== 'risk_floor_override');

        if (replaceableIndex >= 0) {
          const actualIndex = selected.length - 1 - replaceableIndex;
          const removed = selected[actualIndex];
          selectedIds.delete(removed.practice_id);
          const removedAreaId = getAreaId(removed.practice_id);
          areaCount.set(removedAreaId, (areaCount.get(removedAreaId) ?? 0) - 1);
          selected.splice(actualIndex, 1);
        }
      }
      addPractice(executionCandidates[0].practice_id, 'dependency_inclusion', executionCandidates[0]);
    }
  }

  // Rule 6: Pull in missing dependencies
  for (const sel of [...selected]) {
    const deps = dependencies.filter((d) => d.practice_id === sel.practice_id);
    for (const dep of deps) {
      if (selectedIds.has(dep.depends_on_practice_id)) continue;
      const depLevel = current_levels.get(dep.depends_on_practice_id) ?? 0;
      if (depLevel >= 3) continue;

      const depScore = opi_scores.find((s) => s.practice_id === dep.depends_on_practice_id);
      if (depScore) {
        addPractice(dep.depends_on_practice_id, 'dependency_inclusion', depScore);
      }
    }
  }

  return {
    organization_id: input.organization_id,
    round_id: input.round_id,
    quarter: input.quarter,
    lifecycle_stage,
    max_active: maxActive,
    selected_practice_ids: selected.map((s) => s.practice_id),
    selection_rationale: selected,
  };
}
