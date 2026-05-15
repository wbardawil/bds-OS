// Edge function: grade-evidence
// Input:  POST { evidence_id }
// Output: { evidence_id, quality_score, level_proposal, ai_confidence, rationale }
//
// Reads:  evidence (+ initiative + maturity_rubrics for the question)
// Writes: evidence (quality_score, level_proposal, ai_confidence, ai_grading_rationale, graded_at)
//         + initiatives.status (evidence_ready -> ai_pre_graded)
//         + audit_log (grade)
//
// LLM call: STUBBED. See gradeWithLLM() -- wire to your provider in M5.
//
// PORT TARGET: strategy-spark-86/supabase/functions/grade-evidence/index.ts.

import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { evidence_id } = await req.json();
    if (!evidence_id) return json({ error: 'evidence_id required' }, 400);

    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: ev, error: ee } = await userClient
      .from('evidence')
      .select(`
        id, description, artifact_id,
        initiative:initiatives ( id, company_id, question_id, status )
      `)
      .eq('id', evidence_id)
      .single();
    if (ee || !ev || !ev.initiative) return json({ error: 'evidence not found or no access' }, 404);
    const init = ev.initiative as { id: string; company_id: string; question_id: string; status: string };

    const { data: rubric } = await service
      .from('maturity_rubrics')
      .select('level, descriptor, evidence_criteria')
      .eq('question_id', init.question_id)
      .order('level', { ascending: true });
    if (!rubric || rubric.length === 0) {
      return json({ error: `no maturity_rubrics for question_id=${init.question_id}` }, 400);
    }

    const grading = await gradeWithLLM({ description: ev.description, rubric });

    const { error: ue } = await service
      .from('evidence')
      .update({
        quality_score: grading.quality_score,
        ai_grading_rationale: grading.rationale,
        ai_confidence: grading.ai_confidence,
        level_proposal: grading.level_proposal,
        graded_at: new Date().toISOString(),
      })
      .eq('id', evidence_id);
    if (ue) return json({ error: ue.message }, 500);

    if (init.status === 'evidence_ready') {
      await service.from('initiatives')
        .update({ status: 'ai_pre_graded' })
        .eq('id', init.id);
      await service.from('audit_log').insert({
        company_id: init.company_id,
        action: 'status_change',
        resource_type: 'initiative',
        resource_id: init.id,
        before: { status: 'evidence_ready' },
        after: { status: 'ai_pre_graded' },
      });
    }

    await service.from('audit_log').insert({
      company_id: init.company_id,
      action: 'grade',
      resource_type: 'evidence',
      resource_id: evidence_id,
      after: { ...grading, question_id: init.question_id },
    });

    return json({ evidence_id, ...grading });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

interface RubricRow { level: number; descriptor: string; evidence_criteria: string }
interface GradingResult {
  quality_score: number;     // 0..100
  level_proposal: number;    // 1..5
  ai_confidence: number;     // 0..1
  rationale: string;
}

async function gradeWithLLM(input: { description: string; rubric: RubricRow[] }): Promise<GradingResult> {
  // TODO M5: replace this stub with a real LLM call. Recommended:
  // Anthropic Claude (Sonnet) with the rubric levels in the system prompt and
  // the evidence description in the user prompt; force JSON via tool use.
  //
  // Skeleton:
  //   const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  //   const res = await fetch('https://api.anthropic.com/v1/messages', {
  //     method: 'POST',
  //     headers: { 'x-api-key': apiKey!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  //     body: JSON.stringify({
  //       model: 'claude-sonnet-4-6',
  //       max_tokens: 1024,
  //       system: buildRubricSystemPrompt(input.rubric),
  //       messages: [{ role: 'user', content: input.description }],
  //       tools: [{ name: 'submit_grade', input_schema: { ... } }],
  //       tool_choice: { type: 'tool', name: 'submit_grade' },
  //     }),
  //   });
  //   return parseGradingFromAnthropicResponse(await res.json());
  //
  // M1 returns a deterministic placeholder so downstream code can be wired and
  // tested without an LLM dependency.

  void input;
  return {
    quality_score: 60,
    level_proposal: 3,
    ai_confidence: 0.5,
    rationale: 'STUB — wire gradeWithLLM() to a real LLM in M5.',
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
