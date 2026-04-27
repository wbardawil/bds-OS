// BDS OS — Edge Function: Grade Evidence
// POST { evidence_id }
// AI-grades evidence against the practice's maturity rubric.
// Returns structured grading result for UI rendering.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const { evidence_id } = await req.json();
    if (!evidence_id) return errorResponse('Missing evidence_id');

    const supabase = createServiceClient();

    // 1. Fetch evidence + linked initiative + practice
    const { data: evidence, error: evError } = await supabase
      .from('evidence')
      .select('*, initiatives!inner(id, organization_id, practice_id, status)')
      .eq('id', evidence_id)
      .single();

    if (evError || !evidence) return errorResponse('Evidence not found', 404);

    const practiceId = evidence.initiatives.practice_id;
    const organizationId = evidence.initiatives.organization_id;

    // 2. Fetch practice details
    const { data: practice, error: practError } = await supabase
      .from('practices')
      .select('id, name, description')
      .eq('id', practiceId)
      .single();

    if (practError || !practice) return errorResponse('Practice not found', 404);

    // 3. Fetch maturity levels for this practice
    const { data: maturityLevels, error: mlError } = await supabase
      .from('maturity_levels')
      .select('level, descriptor, evidence_criteria, expiry_period_days')
      .eq('practice_id', practiceId)
      .order('level', { ascending: true });

    if (mlError) return errorResponse(`Failed to fetch maturity levels: ${mlError.message}`);

    // 4. Determine current competency level from latest round responses
    const { data: latestResponse } = await supabase
      .from('round_responses')
      .select('competency_score')
      .eq('organization_id', organizationId)
      .eq('practice_id', practiceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentLevel = latestResponse?.competency_score ?? 1;
    const targetLevel = Math.min(currentLevel + 1, 5);
    const targetRubric = maturityLevels?.find((ml: any) => ml.level === targetLevel);

    if (!targetRubric) return errorResponse('No rubric found for target level');

    // 5. Grade evidence against rubric
    const criteria = targetRubric.evidence_criteria
      .split(/[;.\n]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const description = evidence.description ?? '';
    const descriptionLower = description.toLowerCase();

    const criteriaAlignment = criteria.map((criterion: string) => {
      const keywords = criterion.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      const matchCount = keywords.filter((kw: string) => descriptionLower.includes(kw)).length;
      const met = keywords.length > 0 && matchCount / keywords.length >= 0.4;

      let excerpt: string | null = null;
      if (met) {
        const sentences = description.split(/[.!?]+/);
        for (const sentence of sentences) {
          if (keywords.some((kw: string) => sentence.toLowerCase().includes(kw))) {
            excerpt = sentence.trim().slice(0, 200);
            break;
          }
        }
      }

      return { criterion, met, evidence_excerpt: excerpt };
    });

    const metCount = criteriaAlignment.filter((a: any) => a.met).length;
    const totalCriteria = criteriaAlignment.length;
    const completenessScore = totalCriteria > 0 ? Math.round((metCount / totalCriteria) * 100) : 0;
    const descriptionDepth = Math.min(100, Math.round((description.length / 500) * 100));
    const qualityScore = Math.round((completenessScore * 0.7) + (descriptionDepth * 0.3));

    // Risk flags
    const riskFlags: Array<{ severity: string; category: string; message: string }> = [];
    if (completenessScore < 50) {
      riskFlags.push({
        severity: 'high',
        category: 'incomplete_evidence',
        message: `Only ${metCount} of ${totalCriteria} criteria addressed`,
      });
    }
    if (description.length < 100) {
      riskFlags.push({
        severity: 'medium',
        category: 'quality_concern',
        message: 'Evidence description is very brief',
      });
    }

    const confidence = Math.round(Math.min(1, (completenessScore / 100) * 0.6 + (qualityScore / 100) * 0.4) * 1000) / 1000;
    const levelProposal = completenessScore >= 80 ? targetLevel : currentLevel;

    // Recommendation
    let recommendation;
    if (completenessScore >= 80 && qualityScore >= 60) {
      recommendation = {
        action: 'approve',
        reason: `Evidence meets ${metCount}/${totalCriteria} criteria with sufficient quality`,
      };
    } else if (completenessScore >= 50) {
      recommendation = {
        action: 'request_more_evidence',
        missing: criteriaAlignment.filter((a: any) => !a.met).map((a: any) => a.criterion),
      };
    } else {
      recommendation = {
        action: 'flag_for_review',
        concerns: riskFlags.map((f) => f.message),
      };
    }

    const rationale = `Evidence for "${practice.name}" targeting Level ${targetLevel}: `
      + `${completenessScore >= 80 ? 'sufficient' : completenessScore >= 50 ? 'partial' : 'insufficient'}. `
      + `${metCount} of ${totalCriteria} criteria addressed (${completenessScore}% completeness, ${qualityScore}% quality).`;

    // 6. Update evidence with grading results
    const { error: updateError } = await supabase
      .from('evidence')
      .update({
        quality_score: qualityScore,
        ai_grading_rationale: rationale,
        ai_confidence: confidence,
        level_proposal: levelProposal,
        graded_at: new Date().toISOString(),
      })
      .eq('id', evidence_id);

    if (updateError) return errorResponse(`Failed to update evidence: ${updateError.message}`);

    // 7. Update initiative status to ai_pre_graded
    const { error: initError } = await supabase
      .from('initiatives')
      .update({ status: 'ai_pre_graded' })
      .eq('id', evidence.initiatives.id);

    if (initError) return errorResponse(`Failed to update initiative status: ${initError.message}`);

    // 8. Return structured grading result
    return jsonResponse({
      evidence_id,
      practice_id: practiceId,
      practice_name: practice.name,
      current_level: currentLevel,
      target_level: targetLevel,
      rubric_mapping: {
        matched_level: levelProposal,
        matched_descriptor: maturityLevels?.find((ml: any) => ml.level === levelProposal)?.descriptor ?? '',
        criteria_alignment: criteriaAlignment,
      },
      completeness_score: completenessScore,
      quality_score: qualityScore,
      risk_flags: riskFlags,
      level_proposal: levelProposal,
      confidence,
      rationale,
      recommendation,
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
