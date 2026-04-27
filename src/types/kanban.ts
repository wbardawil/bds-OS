// BDS OS — Initiative & Kanban Workflow Type Definitions

import type { Initiative, Artifact, Evidence, InitiativeStatus } from './database.js';

// ─── Kanban State Machine ────────────────────────────────────────────────────

// Valid status transitions enforcing the Kanban workflow:
//   backlog → planned → in_progress → evidence_ready → ai_pre_graded → pending_verification → approved
export const KANBAN_TRANSITIONS: Record<InitiativeStatus, InitiativeStatus[]> = {
  backlog: ['planned'],
  planned: ['in_progress', 'backlog'],
  in_progress: ['evidence_ready', 'planned'],
  evidence_ready: ['ai_pre_graded'],
  ai_pre_graded: ['pending_verification'],
  pending_verification: ['approved', 'in_progress'],
  approved: [],
} as const;

// ─── Kanban Transition Validation ────────────────────────────────────────────

export interface KanbanTransitionRequest {
  initiative_id: string;
  from_status: InitiativeStatus;
  to_status: InitiativeStatus;
  transitioned_by: string;
  reason?: string;
}

export interface KanbanTransitionResult {
  success: boolean;
  initiative_id: string;
  previous_status: InitiativeStatus;
  new_status: InitiativeStatus;
  error?: string;
}

export function isValidTransition(
  from: InitiativeStatus,
  to: InitiativeStatus,
): boolean {
  return KANBAN_TRANSITIONS[from].includes(to);
}

// ─── Initiative with Relations ───────────────────────────────────────────────

export interface InitiativeWithRelations extends Initiative {
  artifacts: Artifact[];
  evidence: Evidence[];
  practice_name: string;
  area_name: string;
  owner_name: string | null;
}

// ─── Kanban Board View (structured for UI rendering) ─────────────────────────

export interface KanbanBoardView {
  organization_id: string;
  columns: KanbanColumn[];
  total_initiatives: number;
  active_practices: number;
}

export interface KanbanColumn {
  status: InitiativeStatus;
  display_name: string;
  initiatives: KanbanCard[];
  count: number;
}

export interface KanbanCard {
  initiative_id: string;
  title: string;
  practice_name: string;
  area_name: string;
  owner_name: string | null;
  artifact_count: number;
  evidence_count: number;
  days_in_status: number;
  created_at: string;
  updated_at: string;
}

// ─── Column Display Names ────────────────────────────────────────────────────

export const COLUMN_DISPLAY_NAMES: Record<InitiativeStatus, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  evidence_ready: 'Evidence Ready',
  ai_pre_graded: 'AI Pre-Graded',
  pending_verification: 'Pending Verification',
  approved: 'Approved',
} as const;
