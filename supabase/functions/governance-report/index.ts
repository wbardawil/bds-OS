// BDS OS — Edge Function: Governance Report
// POST { org_id, view_type, user_id?, reporting_period? }
// Produces structured governance views: executive, board, or functional leader.
// All responses are structured objects for direct UI rendering.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

type ViewType = 'executive' | 'board' | 'functional';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const body = await req.json();
    const { organization_id, view_type, user_id, reporting_period } = body;

    if (!organization_id || !view_type) {
      return errorResponse('Missing organization_id or view_type');
    }
    if (!['executive', 'board', 'functional'].includes(view_type)) {
      return errorResponse('view_type must be executive, board, or functional');
    }
    if (view_type === 'functional' && !user_id) {
      return errorResponse('user_id required for functional view');
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // ── Shared Data Fetches ──────────────────────────────────────────

    // Organization
    const { data: org } = await supabase
      .from('organizations')
      .select('lifecycle_stage')
      .eq('id', organization_id)
      .single();

    if (!org) return errorResponse('Organization not found', 404);

    // Latest focus portfolio
    const { data: portfolio } = await supabase
      .from('focus_portfolios')
      .select('*')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Practices + areas
    const { data: practices } = await supabase
      .from('practices')
      .select('id, name, area_id, areas!inner(name)');

    const practiceMap = new Map(practices?.map((p: any) => [p.id, p]) ?? []);

    // Latest OPI scores
    const { data: opiScores } = await supabase
      .from('opi_scores')
      .select('practice_id, final_opi, phase_number, risk_floor_triggered')
      .eq('organization_id', organization_id)
      .order('computed_at', { ascending: false });

    // Initiatives
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('id, practice_id, title, status, owner_id, created_at, updated_at')
      .eq('organization_id', organization_id);

    // ── Executive View ───────────────────────────────────────────────

    if (view_type === 'executive') {
      const activePracticeIds = portfolio?.active_practice_ids ?? [];

      const activePractices = activePracticeIds.map((pid: number) => {
        const practice = practiceMap.get(pid);
        const practiceInitiatives = initiatives?.filter((i: any) => i.practice_id === pid) ?? [];
        const opi = opiScores?.find((s: any) => s.practice_id === pid);
        return {
          practice_id: pid,
          practice_name: practice?.name ?? '',
          area_name: practice?.areas?.name ?? '',
          current_level: 0, // Would come from latest round response
          target_level: 0,
          initiative_count: practiceInitiatives.length,
          initiatives_in_progress: practiceInitiatives.filter((i: any) => i.status === 'in_progress').length,
          initiatives_completed: practiceInitiatives.filter((i: any) => i.status === 'approved').length,
        };
      });

      // Top P&L contributors
      const topContributors = (opiScores ?? [])
        .sort((a: any, b: any) => b.final_opi - a.final_opi)
        .slice(0, 5)
        .map((s: any) => ({
          practice_id: s.practice_id,
          practice_name: practiceMap.get(s.practice_id)?.name ?? '',
          pnl_impact: s.final_opi,
          final_opi: s.final_opi,
          phase_number: s.phase_number,
        }));

      // Pending decisions
      const { data: pendingScrs } = await supabase
        .from('score_change_requests')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('status', 'pending');

      // Risk alerts
      const riskAlerts: any[] = [];
      for (const score of opiScores ?? []) {
        if (score.risk_floor_triggered) {
          riskAlerts.push({
            severity: 'critical',
            category: 'risk_floor_breach',
            practice_id: score.practice_id,
            practice_name: practiceMap.get(score.practice_id)?.name ?? '',
            message: `${practiceMap.get(score.practice_id)?.name} is below its risk floor`,
            recommended_action: 'Prioritize immediate remediation of this practice',
          });
        }
      }

      // Stalled initiatives (in_progress for > 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const stalledInitiatives = (initiatives ?? []).filter(
        (i: any) => i.status === 'in_progress' && i.updated_at < thirtyDaysAgo,
      );
      for (const stalled of stalledInitiatives) {
        riskAlerts.push({
          severity: 'medium',
          category: 'stalled_initiative',
          practice_id: stalled.practice_id,
          practice_name: practiceMap.get(stalled.practice_id)?.name ?? '',
          message: `Initiative "${stalled.title}" has been in progress for over 30 days`,
          recommended_action: 'Review initiative scope and blockers',
        });
      }

      return jsonResponse({
        view_type: 'executive',
        data: {
          organization_id,
          generated_at: now,
          lifecycle_stage: org.lifecycle_stage,
          active_practices: activePractices,
          estimated_60_day_pnl_impact: {
            total_score: topContributors.reduce((sum: number, c: any) => sum + c.final_opi, 0),
            top_contributors: topContributors,
          },
          delegation_index: {
            pct_decisions_below_ceo: 0,
            escalations_per_month: 0,
            avg_decision_latency_hours: 0,
            delegation_health: 'moderate',
          },
          decision_cycle: {
            average_hours: 0,
            trend: 'stable',
            pending_decisions: pendingScrs?.length ?? 0,
          },
          risk_alerts: riskAlerts,
        },
      });
    }

    // ── Board View ───────────────────────────────────────────────────

    if (view_type === 'board') {
      // Area maturity deltas
      const { data: areas } = await supabase.from('areas').select('id, name');
      const areaMaturityDelta = (areas ?? []).map((area: any) => {
        const areaPractices = practices?.filter((p: any) => p.area_id === area.id) ?? [];
        return {
          area_id: area.id,
          area_name: area.name,
          previous_average_level: 0,
          current_average_level: 0,
          delta: 0,
          practice_count: areaPractices.length,
        };
      });

      // Phase distribution
      const phase1 = opiScores?.filter((s: any) => s.phase_number === 1) ?? [];
      const phase2 = opiScores?.filter((s: any) => s.phase_number === 2) ?? [];
      const phase3 = opiScores?.filter((s: any) => s.phase_number === 3) ?? [];
      const total = opiScores?.length ?? 1;

      // Meetings adherence
      const { data: meetings } = await supabase
        .from('meetings')
        .select('type, date')
        .eq('organization_id', organization_id);

      const weeklyMeetings = meetings?.filter((m: any) => m.type === 'weekly').length ?? 0;
      const monthlyMeetings = meetings?.filter((m: any) => m.type === 'monthly').length ?? 0;
      const quarterlyMeetings = meetings?.filter((m: any) => m.type === 'quarterly').length ?? 0;

      // Risk floor breaches
      const riskBreaches = (opiScores ?? []).filter((s: any) => s.risk_floor_triggered);

      return jsonResponse({
        view_type: 'board',
        data: {
          organization_id,
          generated_at: now,
          reporting_period: reporting_period ?? 'current',
          area_maturity_delta: areaMaturityDelta,
          phase_distribution: {
            proof: { count: phase1.length, percentage: Math.round((phase1.length / total) * 100) },
            structure: { count: phase2.length, percentage: Math.round((phase2.length / total) * 100) },
            scale: { count: phase3.length, percentage: Math.round((phase3.length / total) * 100) },
          },
          operating_debt: {
            total_debt_score: riskBreaches.length * 3,
            practices_below_level_2: [],
            expired_evidence_count: 0,
            expired_evidence_items: [],
            risk_floor_breaches: riskBreaches.map((s: any) => ({
              practice_id: s.practice_id,
              practice_name: practiceMap.get(s.practice_id)?.name ?? '',
              risk_floor_level: 0,
              current_level: 0,
              gap: 0,
              severity: 'critical',
            })),
            debt_trend: 'stable',
          },
          governance_health: {
            meeting_cadence_adherence: {
              weekly: { expected: 12, actual: weeklyMeetings, adherence_pct: Math.round((weeklyMeetings / 12) * 100) },
              monthly: { expected: 3, actual: monthlyMeetings, adherence_pct: Math.round((monthlyMeetings / 3) * 100) },
              quarterly: { expected: 1, actual: quarterlyMeetings, adherence_pct: Math.round((quarterlyMeetings / 1) * 100) },
            },
            decision_log_completeness: 0,
            action_item_completion_rate: 0,
            overall_health: weeklyMeetings >= 10 ? 'strong' : weeklyMeetings >= 6 ? 'adequate' : 'weak',
          },
          narrative_summary: {
            overall_trajectory: 'on_track',
            key_wins: [],
            key_risks: riskBreaches.map((s: any) => `${practiceMap.get(s.practice_id)?.name} is below risk floor`),
            recommended_actions: riskBreaches.length > 0
              ? ['Address risk floor breaches before next board meeting']
              : ['Continue current execution cadence'],
          },
        },
      });
    }

    // ── Functional Leader View ───────────────────────────────────────

    if (view_type === 'functional') {
      // Fetch user
      const { data: user } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', user_id)
        .single();

      if (!user) return errorResponse('User not found', 404);

      // Find initiatives owned by this user
      const ownedInitiatives = (initiatives ?? []).filter((i: any) => i.owner_id === user_id);
      const ownedPracticeIds = [...new Set(ownedInitiatives.map((i: any) => i.practice_id))];

      const ownedPractices = ownedPracticeIds.map((pid: number) => {
        const practice = practiceMap.get(pid);
        const opi = opiScores?.find((s: any) => s.practice_id === pid);
        const practiceInitiatives = ownedInitiatives.filter((i: any) => i.practice_id === pid);
        const pendingEvidence = practiceInitiatives.filter(
          (i: any) => i.status === 'evidence_ready' || i.status === 'in_progress',
        ).length;

        return {
          practice_id: pid,
          practice_name: practice?.name ?? '',
          area_name: practice?.areas?.name ?? '',
          current_level: 0,
          final_opi: opi?.final_opi ?? 0,
          phase_number: opi?.phase_number ?? 3,
          active_initiatives: practiceInitiatives.filter((i: any) => i.status !== 'approved').length,
          pending_evidence: pendingEvidence,
        };
      });

      // Coaching prompts based on practice state
      const coachingPrompts = ownedPractices.map((op: any) => {
        if (op.pending_evidence > 0) {
          return {
            practice_id: op.practice_id,
            practice_name: op.practice_name,
            prompt_type: 'next_step',
            message: `${op.practice_name} has ${op.pending_evidence} initiative(s) needing evidence`,
            suggested_action: 'Upload evidence artifacts and submit for AI grading',
          };
        }
        return {
          practice_id: op.practice_id,
          practice_name: op.practice_name,
          prompt_type: 'quick_win',
          message: `${op.practice_name} is active — keep momentum`,
          suggested_action: 'Review current initiatives and identify next deliverable',
        };
      });

      return jsonResponse({
        view_type: 'functional',
        data: {
          user_id,
          user_name: user.name,
          generated_at: now,
          owned_practices: ownedPractices,
          evidence_required: [],
          coaching_prompts: coachingPrompts,
          adoption_tracking: ownedPractices.map((op: any) => ({
            practice_id: op.practice_id,
            practice_name: op.practice_name,
            adoption_score: 0,
            trend: 'stable',
            last_activity_date: null,
          })),
        },
      });
    }

    return errorResponse('Unknown view type');
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
