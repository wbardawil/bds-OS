// BDS OS — Database type definitions for Lovable
//
// PURPOSE: This file mirrors what `supabase gen types typescript` would produce
// from the migrations under supabase/migrations/. Lovable should:
//   1. Prefer its own auto-generated types if Lovable's Supabase integration is up to date.
//   2. Copy this file in as a fallback if auto-generation lags or is unavailable.
//
// USAGE:
//   import { createClient } from '@supabase/supabase-js';
//   import type { Database } from './types/Database';
//   const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
//
// MAINTENANCE: regenerate whenever a new migration lands. The source of truth is
// always supabase/migrations/, not this file.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'grade'
  | 'approve'
  | 'reject';

export type AuditResourceType =
  | 'round_response'
  | 'opi_score'
  | 'focus_portfolio'
  | 'initiative'
  | 'evidence'
  | 'score_change_request'
  | 'approval'
  | 'invitation';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          industry: string | null;
          revenue_range: string | null;
          employee_count: number | null;
          years_in_operation: number | null;
          lifecycle_stage: LifecycleStage | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry?: string | null;
          revenue_range?: string | null;
          employee_count?: number | null;
          years_in_operation?: number | null;
          lifecycle_stage?: LifecycleStage | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
      };

      users: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          name: string;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };

      areas: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          sort_order: number;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['areas']['Insert']>;
      };

      practices: {
        Row: {
          id: number;
          area_id: number;
          name: string;
          description: string | null;
          version: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          area_id: number;
          name: string;
          description?: string | null;
          version?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practices']['Insert']>;
      };

      practice_metadata: {
        Row: {
          id: number;
          practice_id: number;
          pnl_impact: number;
          speed_to_impact: number;
          dependency_score: number;
          risk_floor: boolean;
          risk_floor_level: number | null;
        };
        Insert: {
          id?: number;
          practice_id: number;
          pnl_impact: number;
          speed_to_impact: number;
          dependency_score: number;
          risk_floor?: boolean;
          risk_floor_level?: number | null;
        };
        Update: Partial<Database['public']['Tables']['practice_metadata']['Insert']>;
      };

      maturity_levels: {
        Row: {
          id: number;
          practice_id: number;
          level: number;
          descriptor: string;
          evidence_criteria: string;
          expiry_period_days: number | null;
        };
        Insert: {
          id?: number;
          practice_id: number;
          level: number;
          descriptor: string;
          evidence_criteria: string;
          expiry_period_days?: number | null;
        };
        Update: Partial<Database['public']['Tables']['maturity_levels']['Insert']>;
      };

      practice_dependencies: {
        Row: {
          id: number;
          practice_id: number;
          depends_on_practice_id: number;
          dependency_type: string;
        };
        Insert: {
          id?: number;
          practice_id: number;
          depends_on_practice_id: number;
          dependency_type?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_dependencies']['Insert']>;
      };

      assessment_rounds: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['assessment_rounds']['Insert']>;
      };

      round_responses: {
        Row: {
          id: string;
          round_id: string;
          organization_id: string;
          practice_id: number;
          importance_score: number;
          competency_score: number;
          responded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          organization_id: string;
          practice_id: number;
          importance_score: number;
          competency_score: number;
          responded_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['round_responses']['Insert']>;
      };

      lifecycle_weights: {
        Row: {
          id: number;
          lifecycle_stage: LifecycleStage;
          w1_gap: number;
          w2_pnl: number;
          w3_speed: number;
          w4_dependency: number;
          w5_risk: number;
        };
        Insert: {
          id?: number;
          lifecycle_stage: LifecycleStage;
          w1_gap: number;
          w2_pnl: number;
          w3_speed: number;
          w4_dependency: number;
          w5_risk: number;
        };
        Update: Partial<Database['public']['Tables']['lifecycle_weights']['Insert']>;
      };

      opi_scores: {
        Row: {
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
        };
        Insert: {
          id?: string;
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
          risk_floor_triggered?: boolean;
          computed_at?: string;
        };
        Update: Partial<Database['public']['Tables']['opi_scores']['Insert']>;
      };

      focus_portfolios: {
        Row: {
          id: string;
          organization_id: string;
          round_id: string;
          quarter: string;
          lifecycle_stage: LifecycleStage;
          max_active: number;
          active_practice_ids: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          round_id: string;
          quarter: string;
          lifecycle_stage: LifecycleStage;
          max_active: number;
          active_practice_ids: number[];
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['focus_portfolios']['Insert']>;
      };

      initiatives: {
        Row: {
          id: string;
          organization_id: string;
          practice_id: number;
          title: string;
          description: string | null;
          status: InitiativeStatus;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          practice_id: number;
          title: string;
          description?: string | null;
          status?: InitiativeStatus;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['initiatives']['Insert']>;
      };

      artifacts: {
        Row: {
          id: string;
          initiative_id: string;
          name: string;
          url: string | null;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          initiative_id: string;
          name: string;
          url?: string | null;
          type: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['artifacts']['Insert']>;
      };

      evidence: {
        Row: {
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
        };
        Insert: {
          id?: string;
          initiative_id: string;
          artifact_id?: string | null;
          description: string;
          quality_score?: number | null;
          ai_grading_rationale?: string | null;
          ai_confidence?: number | null;
          level_proposal?: number | null;
          graded_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['evidence']['Insert']>;
      };

      score_change_requests: {
        Row: {
          id: string;
          organization_id: string;
          practice_id: number;
          round_id: string;
          current_level: number;
          proposed_level: number;
          evidence_ids: string[];
          ai_grade: Json | null;
          status: ScoreChangeStatus;
          reviewer_id: string | null;
          reviewer_comment: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          practice_id: number;
          round_id: string;
          current_level: number;
          proposed_level: number;
          evidence_ids: string[];
          ai_grade?: Json | null;
          status?: ScoreChangeStatus;
          reviewer_id?: string | null;
          reviewer_comment?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['score_change_requests']['Insert']>;
      };

      approvals: {
        Row: {
          id: string;
          score_change_request_id: string;
          approved_by: string;
          decision: string;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          score_change_request_id: string;
          approved_by: string;
          decision: string;
          comment?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['approvals']['Insert']>;
      };

      meetings: {
        Row: {
          id: string;
          organization_id: string;
          type: MeetingType;
          date: string;
          notes: string | null;
          decisions: Json;
          action_items: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          type: MeetingType;
          date: string;
          notes?: string | null;
          decisions?: Json;
          action_items?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['meetings']['Insert']>;
      };

      kpis: {
        Row: {
          id: string;
          organization_id: string;
          metric_name: string;
          value: number;
          period: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          metric_name: string;
          value: number;
          period: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['kpis']['Insert']>;
      };

      adoption_metrics: {
        Row: {
          id: string;
          organization_id: string;
          practice_id: number | null;
          delegation_index: number | null;
          decision_cycle_time_hours: number | null;
          escalations_per_month: number | null;
          measured_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          practice_id?: number | null;
          delegation_index?: number | null;
          decision_cycle_time_hours?: number | null;
          escalations_per_month?: number | null;
          measured_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['adoption_metrics']['Insert']>;
      };

      audit_log: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          action: AuditAction;
          resource_type: AuditResourceType;
          resource_id: string;
          before: Json | null;
          after: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          action: AuditAction;
          resource_type: AuditResourceType;
          resource_id: string;
          before?: Json | null;
          after?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
      };

      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: UserRole;
          token: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        // INSERT/UPDATE not exposed to authenticated clients via PostgREST.
        // Use the invite-user / accept-invitation edge functions instead.
        Insert: never;
        Update: never;
      };
    };

    Views: { [_ in never]: never };

    Functions: { [_ in never]: never };

    Enums: {
      lifecycle_stage: LifecycleStage;
      initiative_status: InitiativeStatus;
      score_change_status: ScoreChangeStatus;
      meeting_type: MeetingType;
      user_role: UserRole;
      opi_phase: OPIPhase;
      audit_action: AuditAction;
      audit_resource_type: AuditResourceType;
    };
  };
}
