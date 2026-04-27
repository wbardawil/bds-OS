// BDS OS — Delegation Index Engine
// Measures organizational decision-making distribution.
//
// Inputs: approvals, meetings, user count
// Outputs: structured DelegationMetrics for governance views

import type { Approval, User } from '../types/database.js';
import type { DelegationMetrics } from '../types/governance.js';

export interface DelegationInput {
  approvals: ApprovalWithRole[];
  score_change_requests: ScoreChangeRequestTiming[];
  total_user_count: number;
  measurement_period_days: number;
}

export interface ApprovalWithRole {
  approved_by: string;
  approver_role: 'admin' | 'leader' | 'functional_lead';
  created_at: string;
}

export interface ScoreChangeRequestTiming {
  created_at: string;
  resolved_at: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Calculate the Delegation Index for an organization.
 *
 * Measures:
 *   - pct_decisions_below_ceo: % of approvals made by non-admin users
 *   - escalations_per_month: count of requests that stayed pending > 7 days
 *   - avg_decision_latency_hours: average time from request creation to resolution
 *   - delegation_health: healthy (>60% below CEO), moderate (30-60%), concentrated (<30%)
 */
export function calculateDelegationIndex(input: DelegationInput): DelegationMetrics {
  const { approvals, score_change_requests, measurement_period_days } = input;

  // Metric 1: % decisions below CEO (non-admin approvals)
  const totalApprovals = approvals.length;
  const nonAdminApprovals = approvals.filter((a) => a.approver_role !== 'admin').length;
  const pctDecisionsBelowCeo = totalApprovals > 0
    ? Math.round((nonAdminApprovals / totalApprovals) * 1000) / 10
    : 0;

  // Metric 2: Escalations per month (requests pending > 7 days)
  const escalationThresholdMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const escalations = score_change_requests.filter((scr) => {
    if (scr.status === 'pending') {
      const createdAt = new Date(scr.created_at).getTime();
      return (now - createdAt) > escalationThresholdMs;
    }
    if (scr.resolved_at) {
      const createdAt = new Date(scr.created_at).getTime();
      const resolvedAt = new Date(scr.resolved_at).getTime();
      return (resolvedAt - createdAt) > escalationThresholdMs;
    }
    return false;
  }).length;

  const months = Math.max(1, measurement_period_days / 30);
  const escalationsPerMonth = Math.round((escalations / months) * 10) / 10;

  // Metric 3: Average decision latency (hours)
  const resolvedRequests = score_change_requests.filter(
    (scr) => scr.resolved_at !== null,
  );
  let avgDecisionLatencyHours = 0;
  if (resolvedRequests.length > 0) {
    const totalLatencyMs = resolvedRequests.reduce((sum, scr) => {
      const created = new Date(scr.created_at).getTime();
      const resolved = new Date(scr.resolved_at!).getTime();
      return sum + (resolved - created);
    }, 0);
    avgDecisionLatencyHours = Math.round((totalLatencyMs / resolvedRequests.length / (1000 * 60 * 60)) * 10) / 10;
  }

  // Delegation health classification
  let delegationHealth: DelegationMetrics['delegation_health'];
  if (pctDecisionsBelowCeo >= 60) {
    delegationHealth = 'healthy';
  } else if (pctDecisionsBelowCeo >= 30) {
    delegationHealth = 'moderate';
  } else {
    delegationHealth = 'concentrated';
  }

  return {
    pct_decisions_below_ceo: pctDecisionsBelowCeo,
    escalations_per_month: escalationsPerMonth,
    avg_decision_latency_hours: avgDecisionLatencyHours,
    delegation_health: delegationHealth,
  };
}
