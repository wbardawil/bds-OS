// BDS OS — Edge Function: Submit Delegated Response
//
// POST { token, respondent_name?, scores: [{ question_id, importance, competency }] }
//
// No auth header required — the token IS the auth (matches Lovable's anonymous
// /round/:code pattern). Service-role write because the assignee may not have
// a Supabase Auth account.
//
// Behaviour:
//   1. Look up practice_assignments by share_token. Validate not completed,
//      not past a hard expiry (30 days), and not deleted.
//   2. Validate scores: each score's question_id must be in scope (matches
//      the assigned practice or any practice within the assigned pillar).
//      Each importance/competency must be 1..5.
//   3. Find or create a round_responses row for this assignee_email + round_id.
//      Merge the new scores into category_scores jsonb under the right category key.
//   4. Mark the assignment completed_at = now().
//   5. Audit log entry.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

const HARD_EXPIRY_DAYS = 30;

interface ScoreInput {
  question_id: string; // matches practices.external_id (e.g., 'hospital.delivery.1')
  importance: number; // 1..5
  competency: number; // 1..5
}

interface RequestBody {
  token: string;
  respondent_name?: string;
  scores: ScoreInput[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const supabase = createServiceClient();

    const body = (await req.json()) as RequestBody;
    if (!body?.token) return errorResponse('Missing token');
    if (!Array.isArray(body.scores) || body.scores.length === 0) {
      return errorResponse('Missing or empty scores[]');
    }

    // 1. Look up the assignment.
    const { data: assignment, error: assignError } = await supabase
      .from('practice_assignments')
      .select(
        'id, round_id, company_id, practice_id, customer_pillar_id, assignee_email, assignee_name, completed_at, created_at',
      )
      .eq('share_token', body.token)
      .maybeSingle();

    if (assignError || !assignment) {
      return errorResponse('Assignment not found', 404);
    }

    if (assignment.completed_at) {
      return errorResponse('Assignment already submitted', 410);
    }

    const ageMs = Date.now() - new Date(assignment.created_at).getTime();
    if (ageMs > HARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
      return errorResponse('Assignment expired', 410);
    }

    // 2. Determine which practices are in scope.
    let scopedPractices: Array<{ id: string; external_id: string; universal_pillar_id: number; customer_pillar_id: string | null }> = [];

    if (assignment.practice_id) {
      const { data: practice } = await supabase
        .from('practices')
        .select('id, external_id, universal_pillar_id, customer_pillar_id')
        .eq('id', assignment.practice_id)
        .single();
      if (practice) scopedPractices = [practice];
    } else if (assignment.customer_pillar_id) {
      const { data: practices } = await supabase
        .from('practices')
        .select('id, external_id, universal_pillar_id, customer_pillar_id')
        .eq('customer_pillar_id', assignment.customer_pillar_id)
        .eq('is_active', true);
      scopedPractices = practices ?? [];
    }

    if (scopedPractices.length === 0) {
      return errorResponse('No practices in scope for this assignment', 500);
    }

    const allowedExternalIds = new Set(scopedPractices.map((p) => p.external_id));

    // Validate every submitted score is in scope and within 1..5.
    for (const s of body.scores) {
      if (!s.question_id || !allowedExternalIds.has(s.question_id)) {
        return errorResponse(`Question ${s.question_id} is not in scope for this assignment`);
      }
      if (!Number.isInteger(s.importance) || s.importance < 1 || s.importance > 5) {
        return errorResponse(`Invalid importance for ${s.question_id}: must be 1-5`);
      }
      if (!Number.isInteger(s.competency) || s.competency < 1 || s.competency > 5) {
        return errorResponse(`Invalid competency for ${s.question_id}: must be 1-5`);
      }
    }

    // 3. Group scores by their universal pillar code (Lovable's category key).
    const { data: pillarMap } = await supabase
      .from('universal_pillars')
      .select('id, code');
    const pillarCodeById = new Map((pillarMap ?? []).map((p: any) => [p.id, p.code]));

    const responsesByCategoryKey: Record<string, Array<{ questionId: string; importance: number; competency: number }>> = {};
    for (const s of body.scores) {
      const practice = scopedPractices.find((p) => p.external_id === s.question_id)!;
      const categoryKey = pillarCodeById.get(practice.universal_pillar_id) ?? 'other';
      if (!responsesByCategoryKey[categoryKey]) responsesByCategoryKey[categoryKey] = [];
      responsesByCategoryKey[categoryKey].push({
        questionId: s.question_id,
        importance: s.importance,
        competency: s.competency,
      });
    }

    // Compute per-category aggregates (matching Lovable's existing jsonb shape).
    const categoryScoresJsonb: Record<string, unknown> = {};
    for (const [categoryKey, responses] of Object.entries(responsesByCategoryKey)) {
      const importanceAvg = responses.reduce((sum, r) => sum + r.importance, 0) / responses.length;
      const competencyAvg = responses.reduce((sum, r) => sum + r.competency, 0) / responses.length;
      const gap = competencyAvg - importanceAvg;
      categoryScoresJsonb[categoryKey] = {
        responses,
        importanceAvg,
        competencyAvg,
        gap,
      };
    }

    // 4. Find or create the round_responses row for this assignee.
    const { data: existing } = await supabase
      .from('round_responses')
      .select('id, category_scores')
      .eq('round_id', assignment.round_id)
      .eq('respondent_email', assignment.assignee_email)
      .maybeSingle();

    if (existing) {
      // Merge: keep prior categories the assignee submitted (e.g., from a different
      // assignment on the same round), overwrite the categories in this submission.
      const merged = { ...(existing.category_scores ?? {}), ...categoryScoresJsonb };
      const { error: updateError } = await supabase
        .from('round_responses')
        .update({ category_scores: merged, completed_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) return errorResponse(`Failed to update response: ${updateError.message}`);
    } else {
      const respondentName = body.respondent_name ?? assignment.assignee_name ?? 'Delegated respondent';
      const { error: insertError } = await supabase
        .from('round_responses')
        .insert({
          round_id: assignment.round_id,
          respondent_name: respondentName,
          respondent_email: assignment.assignee_email,
          category_scores: categoryScoresJsonb,
          completed_at: new Date().toISOString(),
        });
      if (insertError) return errorResponse(`Failed to create response: ${insertError.message}`);
    }

    // 5. Mark the assignment completed.
    const { error: markError } = await supabase
      .from('practice_assignments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', assignment.id);
    if (markError) {
      console.warn(`Failed to mark assignment ${assignment.id} complete: ${markError.message}`);
    }

    // 6. Audit log entry.
    await supabase.from('audit_log').insert({
      organization_id: assignment.company_id,
      user_id: null,
      action: 'create',
      resource_type: 'round_response',
      resource_id: assignment.id,
      after: {
        assignment_id: assignment.id,
        assignee_email: assignment.assignee_email,
        scope_practices: scopedPractices.length,
        submitted_scores: body.scores.length,
      },
      metadata: {
        source: 'edge_function:submit-delegated-response',
      },
    });

    return jsonResponse({
      assignment_id: assignment.id,
      round_id: assignment.round_id,
      scores_submitted: body.scores.length,
      categories_updated: Object.keys(responsesByCategoryKey),
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
