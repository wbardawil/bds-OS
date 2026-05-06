// BDS OS — Database type for Supabase JS client
//
// Mirrors the schema after all framework migrations have been applied:
//   - Lovable's existing tables: companies, company_members, profiles,
//     evaluation_rounds, round_responses, leads
//   - Framework tables: universal_pillars, customer_pillars, templates,
//     question_sets, practices, maturity_rubrics, metric_sets, metrics,
//     metric_values, dashboards, widgets, alerts, decisions, decision_votes,
//     chat_messages, feedback, pmf_responses, platform_admins, practice_assignments
//   - bds-OS tables (from earlier migrations): audit_log, invitations,
//     opi_scores, focus_portfolios, initiatives, artifacts, evidence,
//     score_change_requests, approvals, meetings, kpis, adoption_metrics,
//     practice_dependencies, lifecycle_weights
//
// Use with: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
//
// Lovable's Supabase integration may auto-generate its own types into
// src/integrations/supabase/types.ts. If so, prefer that. This file is
// the canonical reference Lovable can copy if its auto-generation lags.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ───────────────────────────────────────────────────────────────────

export type LifecycleStage = 'startup' | 'growth' | 'scale' | 'mature';

export type RoundMode = 'quick' | 'full';

export type WidgetType =
  | 'number'
  | 'sparkline'
  | 'line_chart'
  | 'bar_chart'
  | 'radar'
  | 'gauge'
  | 'list'
  | 'table'
  | 'vega_spec';

export type MetricSource =
  | 'manual'
  | 'webhook'
  | 'connector_stripe'
  | 'connector_hubspot'
  | 'connector_quickbooks'
  | 'connector_xero'
  | 'connector_salesforce'
  | 'connector_other'
  | 'derived';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'snoozed';

export type DecisionStatus = 'proposed' | 'approved' | 'rejected' | 'superseded';

export type RoleLens =
  | 'ceo'
  | 'coo'
  | 'cfo'
  | 'cro'
  | 'chro'
  | 'cio'
  | 'cmo'
  | 'legal'
  | 'manager'
  | 'viewer';

export type CompanyRole = 'owner' | 'admin' | 'member';

export type RoundStatus = 'active' | 'closed';

export type InitiativeStatus =
  | 'backlog'
  | 'planned'
  | 'in_progress'
  | 'evidence_ready'
  | 'ai_pre_graded'
  | 'pending_verification'
  | 'approved';

export type ScoreChangeStatus = 'pending' | 'approved' | 'rejected';

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

// ─── Database type for createClient<Database>() ──────────────────────────────

export interface Database {
  public: {
    Tables: {
      // === Lovable's existing tables ===

      companies: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
          // Added by 20260506000001_create_framework.sql
          lifecycle_stage: LifecycleStage | null;
          industry: string | null;
          revenue_range: string | null;
          employee_count: number | null;
          years_in_operation: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
          lifecycle_stage?: LifecycleStage | null;
          industry?: string | null;
          revenue_range?: string | null;
          employee_count?: number | null;
          years_in_operation?: number | null;
        };
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };

      company_members: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: CompanyRole;
          invited_by: string | null;
          created_at: string;
          // Added by framework migration
          role_lens: RoleLens | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role: CompanyRole;
          invited_by?: string | null;
          created_at?: string;
          role_lens?: RoleLens | null;
        };
        Update: Partial<Database['public']['Tables']['company_members']['Insert']>;
      };

      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };

      evaluation_rounds: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          title: string;
          status: RoundStatus;
          created_by: string;
          created_at: string;
          // Added by framework migration
          mode: RoundMode;
        };
        Insert: {
          id?: string;
          company_id: string;
          code: string;
          title: string;
          status?: RoundStatus;
          created_by: string;
          created_at?: string;
          mode?: RoundMode;
        };
        Update: Partial<Database['public']['Tables']['evaluation_rounds']['Insert']>;
      };

      round_responses: {
        Row: {
          id: string;
          round_id: string;
          respondent_name: string;
          respondent_email: string;
          category_scores: Json;
          overall_score: number | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          round_id: string;
          respondent_name: string;
          respondent_email: string;
          category_scores: Json;
          overall_score?: number | null;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['round_responses']['Insert']>;
      };

      leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          company: string;
          wants_call: boolean;
          language: string;
          worst_category: string | null;
          overall_score: number | null;
          category_scores: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          company: string;
          wants_call?: boolean;
          language?: string;
          worst_category?: string | null;
          overall_score?: number | null;
          category_scores?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };

      // === Framework tables ===

      universal_pillars: {
        Row: { id: number; code: string; name: string; description: string; sort_order: number };
        Insert: never;
        Update: never;
      };

      customer_pillars: {
        Row: {
          id: string;
          company_id: string;
          universal_pillar_id: number | null;
          label: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          is_other: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          universal_pillar_id?: number | null;
          label: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          is_other?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customer_pillars']['Insert']>;
      };

      templates: {
        Row: {
          id: string;
          name: string;
          description: string;
          industry: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
      };

      question_sets: {
        Row: {
          id: string;
          company_id: string;
          source_template_id: string | null;
          name: string;
          is_active: boolean;
          is_customised: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          source_template_id?: string | null;
          name: string;
          is_active?: boolean;
          is_customised?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['question_sets']['Insert']>;
      };

      practices: {
        Row: {
          id: string;
          question_set_id: string | null;
          template_id: string | null;
          customer_pillar_id: string | null;
          universal_pillar_id: number | null;
          external_id: string | null;
          statement: string;
          description: string | null;
          is_system_level: boolean;
          sort_order: number;
          is_active: boolean;
          source_practice_id: string | null;
          is_customised: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_set_id?: string | null;
          template_id?: string | null;
          customer_pillar_id?: string | null;
          universal_pillar_id?: number | null;
          external_id?: string | null;
          statement: string;
          description?: string | null;
          is_system_level?: boolean;
          sort_order?: number;
          is_active?: boolean;
          source_practice_id?: string | null;
          is_customised?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practices']['Insert']>;
      };

      maturity_rubrics: {
        Row: {
          id: string;
          practice_id: string;
          level: number;
          descriptor: string;
          evidence_criteria: string;
          expiry_period_days: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          level: number;
          descriptor: string;
          evidence_criteria: string;
          expiry_period_days?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['maturity_rubrics']['Insert']>;
      };

      metric_sets: {
        Row: {
          id: string;
          company_id: string;
          source_template_id: string | null;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          source_template_id?: string | null;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['metric_sets']['Insert']>;
      };

      metrics: {
        Row: {
          id: string;
          metric_set_id: string | null;
          template_id: string | null;
          customer_pillar_id: string | null;
          universal_pillar_id: number | null;
          external_id: string | null;
          name: string;
          description: string | null;
          unit: string | null;
          target_value: number | null;
          threshold_red: number | null;
          threshold_yellow: number | null;
          source: MetricSource;
          source_config: Json | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          metric_set_id?: string | null;
          template_id?: string | null;
          customer_pillar_id?: string | null;
          universal_pillar_id?: number | null;
          external_id?: string | null;
          name: string;
          description?: string | null;
          unit?: string | null;
          target_value?: number | null;
          threshold_red?: number | null;
          threshold_yellow?: number | null;
          source?: MetricSource;
          source_config?: Json | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['metrics']['Insert']>;
      };

      metric_values: {
        Row: {
          id: string;
          metric_id: string;
          company_id: string;
          value: number;
          period: string | null;
          observed_at: string;
          source: MetricSource;
          source_payload: Json | null;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          metric_id: string;
          company_id: string;
          value: number;
          period?: string | null;
          observed_at?: string;
          source?: MetricSource;
          source_payload?: Json | null;
          notes?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: never;
      };

      dashboards: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          is_default: boolean;
          role_default: RoleLens | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          is_default?: boolean;
          role_default?: RoleLens | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dashboards']['Insert']>;
      };

      widgets: {
        Row: {
          id: string;
          dashboard_id: string;
          type: WidgetType;
          title: string | null;
          metric_id: string | null;
          vega_spec: Json | null;
          config: Json | null;
          position_x: number;
          position_y: number;
          width: number;
          height: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          dashboard_id: string;
          type: WidgetType;
          title?: string | null;
          metric_id?: string | null;
          vega_spec?: Json | null;
          config?: Json | null;
          position_x?: number;
          position_y?: number;
          width?: number;
          height?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['widgets']['Insert']>;
      };

      alerts: {
        Row: {
          id: string;
          company_id: string;
          metric_id: string | null;
          practice_id: string | null;
          severity: AlertSeverity;
          status: AlertStatus;
          title: string;
          detail: string | null;
          context: Json | null;
          fired_at: string;
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          metric_id?: string | null;
          practice_id?: string | null;
          severity: AlertSeverity;
          status?: AlertStatus;
          title: string;
          detail?: string | null;
          context?: Json | null;
          fired_at?: string;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };

      decisions: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          description: string | null;
          status: DecisionStatus;
          proposed_by: string | null;
          decided_by: string | null;
          rationale: string | null;
          data_links: Json | null;
          superseded_by: string | null;
          proposed_at: string;
          decided_at: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          description?: string | null;
          status?: DecisionStatus;
          proposed_by?: string | null;
          decided_by?: string | null;
          rationale?: string | null;
          data_links?: Json | null;
          superseded_by?: string | null;
          proposed_at?: string;
          decided_at?: string | null;
          metadata?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['decisions']['Insert']>;
      };

      decision_votes: {
        Row: {
          id: string;
          decision_id: string;
          voter_id: string;
          vote: string;
          comment: string | null;
          voted_at: string;
        };
        Insert: {
          id?: string;
          decision_id: string;
          voter_id: string;
          vote: string;
          comment?: string | null;
          voted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['decision_votes']['Insert']>;
      };

      chat_messages: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          vega_spec: Json | null;
          citations: Json | null;
          tokens_input: number | null;
          tokens_output: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          vega_spec?: Json | null;
          citations?: Json | null;
          tokens_input?: number | null;
          tokens_output?: number | null;
          created_at?: string;
        };
        Update: never;
      };

      feedback: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          screen: string | null;
          category: string | null;
          content: string;
          metadata: Json | null;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          screen?: string | null;
          category?: string | null;
          content: string;
          metadata?: Json | null;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>;
      };

      pmf_responses: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          disappointment: 'very_disappointed' | 'somewhat_disappointed' | 'not_disappointed' | 'na';
          primary_benefit: string | null;
          who_benefits_most: string | null;
          improvement: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          disappointment: 'very_disappointed' | 'somewhat_disappointed' | 'not_disappointed' | 'na';
          primary_benefit?: string | null;
          who_benefits_most?: string | null;
          improvement?: string | null;
          created_at?: string;
        };
        Update: never;
      };

      platform_admins: {
        Row: { user_id: string; granted_at: string; granted_by: string | null };
        Insert: { user_id: string; granted_at?: string; granted_by?: string | null };
        Update: never;
      };

      practice_assignments: {
        Row: {
          id: string;
          round_id: string;
          company_id: string;
          practice_id: string | null;
          customer_pillar_id: string | null;
          assignee_email: string;
          assignee_name: string | null;
          assignee_user_id: string | null;
          share_token: string;
          assigned_by: string | null;
          message: string | null;
          due_at: string | null;
          reminded_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          company_id: string;
          practice_id?: string | null;
          customer_pillar_id?: string | null;
          assignee_email: string;
          assignee_name?: string | null;
          assignee_user_id?: string | null;
          share_token?: string;
          assigned_by?: string | null;
          message?: string | null;
          due_at?: string | null;
          reminded_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_assignments']['Insert']>;
      };

      // === bds-OS legacy tables (kept for reference; may be deprecated) ===

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
        Update: never;
      };
    };

    Views: {
      assignment_progress: {
        Row: {
          round_id: string;
          company_id: string;
          assignment_id: string;
          assignee_email: string;
          assignee_name: string | null;
          message: string | null;
          due_at: string | null;
          completed_at: string | null;
          created_at: string;
          status: 'pending' | 'reminded' | 'overdue' | 'complete';
          practice_id: string | null;
          customer_pillar_id: string | null;
          scope_type: 'practice' | 'pillar_block';
        };
      };
    };

    Functions: { [_ in never]: never };

    Enums: {
      lifecycle_stage: LifecycleStage;
      round_mode: RoundMode;
      widget_type: WidgetType;
      metric_source: MetricSource;
      alert_severity: AlertSeverity;
      alert_status: AlertStatus;
      decision_status: DecisionStatus;
      role_lens: RoleLens;
      company_role: CompanyRole;
      round_status: RoundStatus;
      initiative_status: InitiativeStatus;
      score_change_status: ScoreChangeStatus;
      audit_action: AuditAction;
      audit_resource_type: AuditResourceType;
    };
  };
}
