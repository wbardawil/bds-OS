// BDS OS — OPI Engine Type Definitions

import type {
  LifecycleStage,
  RoundResponse,
  PracticeMetadata,
} from './database.js';

// ─── OPI Computation Input ───────────────────────────────────────────────────

export interface OPIInput {
  practice_id: number;
  importance_score: number;
  competency_score: number;
  pnl_impact: number;
  speed_to_impact: number;
  dependency_score: number;
  risk_floor: boolean;
  risk_floor_level: number | null;
}

// ─── OPI Weights ─────────────────────────────────────────────────────────────

export interface LifecycleWeights {
  w1_gap: number;
  w2_pnl: number;
  w3_speed: number;
  w4_dependency: number;
  w5_risk: number;
}

// ─── OPI Computation Result ──────────────────────────────────────────────────

export interface OPIResult {
  practice_id: number;
  gap: number;
  weighted_gap: number;
  pnl_score: number;
  speed_score: number;
  dependency_score: number;
  risk_score: number;
  lifecycle_mod: number;
  final_opi: number;
  phase_number: 1 | 2 | 3;
  phase_label: 'Proof' | 'Structure' | 'Scale';
  priority_rank: number;
  risk_floor_triggered: boolean;
}

// ─── OPI Batch Computation Request ───────────────────────────────────────────

export interface ComputeOPIRequest {
  round_id: string;
  organization_id: string;
}

// ─── OPI Batch Computation Response ──────────────────────────────────────────

export interface ComputeOPIResponse {
  organization_id: string;
  round_id: string;
  lifecycle_stage: LifecycleStage;
  lifecycle_mod: number;
  total_practices: number;
  phase_summary: {
    proof: number;
    structure: number;
    scale: number;
  };
  scores: OPIResult[];
  computed_at: string;
}

// ─── Focus Portfolio ─────────────────────────────────────────────────────────

export interface FocusPortfolioConfig {
  lifecycle_stage: LifecycleStage;
  max_active_practices: number;
  min_active_practices: number;
}

export interface FocusPortfolioResult {
  organization_id: string;
  round_id: string;
  quarter: string;
  lifecycle_stage: LifecycleStage;
  max_active: number;
  selected_practice_ids: number[];
  selection_rationale: PracticeSelectionRationale[];
}

export interface PracticeSelectionRationale {
  practice_id: number;
  reason: 'risk_floor_override' | 'phase_1_priority' | 'phase_2_fill' | 'dependency_inclusion';
  final_opi: number;
  phase_number: number;
}

// ─── Helper: Merge response + metadata for OPI computation ───────────────────

export function toOPIInput(
  response: RoundResponse,
  metadata: PracticeMetadata,
): OPIInput {
  return {
    practice_id: response.practice_id,
    importance_score: response.importance_score,
    competency_score: response.competency_score,
    pnl_impact: metadata.pnl_impact,
    speed_to_impact: metadata.speed_to_impact,
    dependency_score: metadata.dependency_score,
    risk_floor: metadata.risk_floor,
    risk_floor_level: metadata.risk_floor_level,
  };
}
