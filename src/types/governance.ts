// BDS OS — Governance View Type Definitions
// Structured for direct UI rendering (no free-form strings)

import type { LifecycleStage } from './database.js';

// ─── Executive View ──────────────────────────────────────────────────────────

export interface ExecutiveView {
  organization_id: string;
  generated_at: string;
  lifecycle_stage: LifecycleStage;

  active_practices: ActivePracticeSummary[];

  estimated_60_day_pnl_impact: {
    total_score: number;
    top_contributors: PnlContributor[];
  };

  delegation_index: DelegationMetrics;

  decision_cycle: {
    average_hours: number;
    trend: 'improving' | 'stable' | 'degrading';
    pending_decisions: number;
  };

  risk_alerts: RiskAlert[];
}

export interface ActivePracticeSummary {
  practice_id: number;
  practice_name: string;
  area_name: string;
  current_level: number;
  target_level: number;
  initiative_count: number;
  initiatives_in_progress: number;
  initiatives_completed: number;
}

export interface PnlContributor {
  practice_id: number;
  practice_name: string;
  pnl_impact: number;
  final_opi: number;
  phase_number: number;
}

// ─── Board View ──────────────────────────────────────────────────────────────

export interface BoardView {
  organization_id: string;
  generated_at: string;
  reporting_period: string;

  area_maturity_delta: AreaMaturityDelta[];

  phase_distribution: {
    proof: { count: number; percentage: number };
    structure: { count: number; percentage: number };
    scale: { count: number; percentage: number };
  };

  operating_debt: OperatingDebt;

  governance_health: GovernanceHealth;

  narrative_summary: NarrativeSummary;
}

export interface AreaMaturityDelta {
  area_id: number;
  area_name: string;
  previous_average_level: number;
  current_average_level: number;
  delta: number;
  practice_count: number;
}

export interface NarrativeSummary {
  overall_trajectory: 'accelerating' | 'on_track' | 'stalling' | 'declining';
  key_wins: string[];
  key_risks: string[];
  recommended_actions: string[];
}

// ─── Functional Leader View ──────────────────────────────────────────────────

export interface FunctionalLeaderView {
  user_id: string;
  user_name: string;
  generated_at: string;

  owned_practices: OwnedPracticeSummary[];

  evidence_required: EvidenceRequirement[];

  coaching_prompts: CoachingPrompt[];

  adoption_tracking: AdoptionSnapshot[];
}

export interface OwnedPracticeSummary {
  practice_id: number;
  practice_name: string;
  area_name: string;
  current_level: number;
  final_opi: number;
  phase_number: number;
  active_initiatives: number;
  pending_evidence: number;
}

export interface EvidenceRequirement {
  practice_id: number;
  practice_name: string;
  current_level: number;
  target_level: number;
  required_evidence_criteria: string;
  days_until_expiry: number | null;
  urgency: 'overdue' | 'due_soon' | 'on_track';
}

export interface CoachingPrompt {
  practice_id: number;
  practice_name: string;
  prompt_type: 'quick_win' | 'next_step' | 'risk_mitigation' | 'level_up';
  message: string;
  suggested_action: string;
}

export interface AdoptionSnapshot {
  practice_id: number;
  practice_name: string;
  adoption_score: number;
  trend: 'improving' | 'stable' | 'declining';
  last_activity_date: string | null;
}

// ─── Shared Governance Types ─────────────────────────────────────────────────

export interface DelegationMetrics {
  pct_decisions_below_ceo: number;
  escalations_per_month: number;
  avg_decision_latency_hours: number;
  delegation_health: 'healthy' | 'moderate' | 'concentrated';
}

export interface OperatingDebt {
  total_debt_score: number;
  practices_below_level_2: PracticeDebtItem[];
  expired_evidence_count: number;
  expired_evidence_items: ExpiredEvidenceItem[];
  risk_floor_breaches: RiskFloorBreach[];
  debt_trend: 'increasing' | 'stable' | 'decreasing';
}

export interface PracticeDebtItem {
  practice_id: number;
  practice_name: string;
  area_name: string;
  current_level: number;
  risk_floor: boolean;
}

export interface ExpiredEvidenceItem {
  evidence_id: string;
  practice_id: number;
  practice_name: string;
  expired_at: string;
  days_overdue: number;
}

export interface RiskFloorBreach {
  practice_id: number;
  practice_name: string;
  risk_floor_level: number;
  current_level: number;
  gap: number;
  severity: 'critical' | 'warning';
}

export interface GovernanceHealth {
  meeting_cadence_adherence: {
    weekly: { expected: number; actual: number; adherence_pct: number };
    monthly: { expected: number; actual: number; adherence_pct: number };
    quarterly: { expected: number; actual: number; adherence_pct: number };
  };
  decision_log_completeness: number;
  action_item_completion_rate: number;
  overall_health: 'strong' | 'adequate' | 'weak';
}

export interface RiskAlert {
  severity: 'critical' | 'high' | 'medium';
  category: 'risk_floor_breach' | 'evidence_expiry' | 'stalled_initiative' | 'decision_bottleneck';
  practice_id: number | null;
  practice_name: string | null;
  message: string;
  recommended_action: string;
}

// ─── Governance Report Request ───────────────────────────────────────────────

export type GovernanceViewType = 'executive' | 'board' | 'functional';

export interface GovernanceReportRequest {
  organization_id: string;
  view_type: GovernanceViewType;
  user_id?: string;
  reporting_period?: string;
}

export type GovernanceReportResponse =
  | { view_type: 'executive'; data: ExecutiveView }
  | { view_type: 'board'; data: BoardView }
  | { view_type: 'functional'; data: FunctionalLeaderView };
