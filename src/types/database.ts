// BDS OS — Database Type Definitions
// TypeScript interfaces mirroring all PostgreSQL tables

// ─── Enums ───────────────────────────────────────────────────────────────────

export type LifecycleStage = 'startup' | 'growth' | 'scale' | 'mature';

export type InitiativeStatus =
  | 'backlog'
  | 'planned'
  | 'in_progress'
  | 'evidence_ready'
  | 'ai_pre_graded'
  | 'pending_verification'
  | 'approved';

export type ScoreChangeStatus = 'pending' | 'approved' | 'rejected';

export type MeetingType = 'weekly' | 'monthly' | 'quarterly';

export type UserRole = 'admin' | 'leader' | 'functional_lead';

export type OPIPhase = 'proof' | 'structure' | 'scale_phase';

// ─── Core Tables ─────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  revenue_range: string | null;
  employee_count: number | null;
  years_in_operation: number | null;
  lifecycle_stage: LifecycleStage | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Area {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface Practice {
  id: number;
  area_id: number;
  name: string;
  description: string | null;
  version: string;
  sort_order: number;
  created_at: string;
}

export interface PracticeMetadata {
  id: number;
  practice_id: number;
  pnl_impact: number;
  speed_to_impact: number;
  dependency_score: number;
  risk_floor: boolean;
  risk_floor_level: number | null;
}

export interface MaturityLevel {
  id: number;
  practice_id: number;
  level: number;
  descriptor: string;
  evidence_criteria: string;
  expiry_period_days: number | null;
}

export interface PracticeDependency {
  id: number;
  practice_id: number;
  depends_on_practice_id: number;
  dependency_type: string;
}

// ─── Assessment Tables ───────────────────────────────────────────────────────

export interface AssessmentRound {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
  completed_at: string | null;
}

export interface RoundResponse {
  id: string;
  round_id: string;
  organization_id: string;
  practice_id: number;
  importance_score: number;
  competency_score: number;
  responded_by: string | null;
  created_at: string;
}

// ─── OPI Tables ──────────────────────────────────────────────────────────────

export interface LifecycleWeightsRow {
  id: number;
  lifecycle_stage: LifecycleStage;
  w1_gap: number;
  w2_pnl: number;
  w3_speed: number;
  w4_dependency: number;
  w5_risk: number;
}

export interface OPIScore {
  id: string;
  round_id: string;
  organization_id: string;
  practice_id: number;
  gap: number;
  weighted_gap: number;
  pnl_score: number;
  speed_score: number;
  dependency_score: number;
  risk_score: number;
  lifecycle_mod: number;
  final_opi: number;
  phase_number: number;
  priority_rank: number;
  risk_floor_triggered: boolean;
  computed_at: string;
}

export interface FocusPortfolio {
  id: string;
  organization_id: string;
  round_id: string;
  quarter: string;
  lifecycle_stage: LifecycleStage;
  max_active: number;
  active_practice_ids: number[];
  created_at: string;
}

// ─── Execution Tables ────────────────────────────────────────────────────────

export interface Initiative {
  id: string;
  organization_id: string;
  practice_id: number;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  initiative_id: string;
  name: string;
  url: string | null;
  type: string;
  created_at: string;
}

export interface Evidence {
  id: string;
  initiative_id: string;
  artifact_id: string | null;
  description: string;
  quality_score: number | null;
  ai_grading_rationale: string | null;
  ai_confidence: number | null;
  level_proposal: number | null;
  graded_at: string | null;
  created_at: string;
}

export interface ScoreChangeRequest {
  id: string;
  organization_id: string;
  practice_id: number;
  round_id: string;
  current_level: number;
  proposed_level: number;
  evidence_ids: string[];
  ai_grade: AIGradePayload | null;
  status: ScoreChangeStatus;
  reviewer_id: string | null;
  reviewer_comment: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AIGradePayload {
  rubric_mapping: {
    matched_level: number;
    matched_descriptor: string;
  };
  completeness_score: number;
  quality_score: number;
  risk_flags: string[];
  level_proposal: number;
  confidence: number;
  rationale: string;
}

export interface Approval {
  id: string;
  score_change_request_id: string;
  approved_by: string;
  decision: string;
  comment: string | null;
  created_at: string;
}

// ─── Governance Tables ───────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  organization_id: string;
  type: MeetingType;
  date: string;
  notes: string | null;
  decisions: MeetingDecision[];
  action_items: MeetingActionItem[];
  created_at: string;
}

export interface MeetingDecision {
  description: string;
  decided_by: string;
  timestamp: string;
}

export interface MeetingActionItem {
  description: string;
  assigned_to: string;
  due_date: string;
  status: string;
}

export interface KPI {
  id: string;
  organization_id: string;
  metric_name: string;
  value: number;
  period: string;
  created_at: string;
}

export interface AdoptionMetric {
  id: string;
  organization_id: string;
  practice_id: number | null;
  delegation_index: number | null;
  decision_cycle_time_hours: number | null;
  escalations_per_month: number | null;
  measured_at: string;
  created_at: string;
}
