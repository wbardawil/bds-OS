// Edge function: governance-report
// Input:  POST { company_id, view_type: 'executive' | 'board' | 'functional' }
// Output: per view_type, a payload aggregating opi_scores + focus_portfolios +
//         initiatives + recent audit_log entries.
//
// Reads:  evaluation_rounds, opi_scores, focus_portfolios, initiatives, audit_log
//         (RLS-scoped).
// Writes: nothing.
//
// PORT TARGET: strategy-spark-86/supabase/functions/governance-report/index.ts.

import { createClient } from '@supabase/supabase-js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ViewType = 'executive' | 'board' | 'functional';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { company_id, view_type } = await req.json() as { company_id: string; view_type: ViewType };
    if (!company_id || !view_type) return json({ error: 'company_id and view_type required' }, 400);
    if (!['executive', 'board', 'functional'].includes(view_type)) {
      return json({ error: 'view_type must be executive | board | functional' }, 400);
    }

    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );

    const [latestRound, scores, portfolio, initiatives, recentAudit] = await Promise.all([
      userClient.from('evaluation_rounds')
        .select('id, code, title, status, created_at')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      userClient.from('opi_scores')
        .select('question_id, final_opi, phase_number, priority_rank, risk_floor_triggered')
        .eq('company_id', company_id)
        .order('priority_rank', { ascending: true }),
      userClient.from('focus_portfolios')
        .select('id, quarter, lifecycle_stage, wip_cap, active_question_ids, created_at')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      userClient.from('initiatives')
        .select('id, question_id, title, status, owner_id, updated_at')
        .eq('company_id', company_id),
      userClient.from('audit_log')
        .select('action, resource_type, created_at, metadata')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const base = {
      company_id,
      latest_round: latestRound.data,
      generated_at: new Date().toISOString(),
    };

    if (view_type === 'executive') {
      const top5 = (scores.data ?? []).slice(0, 5);
      const phaseCounts = countByPhase(scores.data ?? []);
      const wipUsage = portfolio.data
        ? portfolio.data.active_question_ids.length / portfolio.data.wip_cap
        : null;
      return json({
        ...base, view: 'executive',
        top5_priorities: top5,
        phase_counts: phaseCounts,
        wip_usage: wipUsage,
      });
    }

    if (view_type === 'board') {
      return json({
        ...base, view: 'board',
        phase_counts: countByPhase(scores.data ?? []),
        initiative_status_counts: countByStatus(initiatives.data ?? []),
        risk_floor_practice_count: (scores.data ?? []).filter((s) => s.risk_floor_triggered).length,
        focus_portfolio: portfolio.data,
        recent_activity: recentAudit.data,
      });
    }

    // functional: group by Lovable's 8 categories via question_id prefix
    const byCategory = groupByCategoryPrefix(scores.data ?? []);
    return json({
      ...base, view: 'functional',
      by_category: byCategory,
      initiatives: initiatives.data,
      focus_portfolio: portfolio.data,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

// Lovable question_id prefixes -> category keys
const CATEGORY_PREFIX_MAP: Record<string, string> = {
  sp: 'strategic_planning',
  ma: 'management',
  ko: 'kpi_okr',
  op: 'operations',
  hr: 'human_resources',
  it: 'it',
  mi: 'market_intelligence',
  sm: 'sales_marketing',
};

function countByPhase(scores: Array<{ phase_number: number }>) {
  const c = { proof: 0, structure: 0, scale: 0 };
  for (const s of scores) {
    if (s.phase_number === 1) c.proof++;
    else if (s.phase_number === 2) c.structure++;
    else c.scale++;
  }
  return c;
}

function countByStatus(initiatives: Array<{ status: string }>) {
  const c: Record<string, number> = {};
  for (const i of initiatives) c[i.status] = (c[i.status] ?? 0) + 1;
  return c;
}

function groupByCategoryPrefix<T extends { question_id: string }>(rows: T[]) {
  const map: Record<string, T[]> = {};
  for (const r of rows) {
    const prefix = r.question_id.split('_')[0];
    const cat = CATEGORY_PREFIX_MAP[prefix] ?? prefix;
    (map[cat] ??= []).push(r);
  }
  return map;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
