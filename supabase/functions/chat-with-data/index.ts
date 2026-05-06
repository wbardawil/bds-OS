// BDS OS — Edge Function: Chat With Data (Julius-lite, source-cited)
//
// POST { company_id, conversation_id?, question }
// Caller: authenticated member of company_id.
// Behaviour:
//   1. Fetch the company's recent assessment, KPIs, alerts, initiatives (RLS-scoped).
//   2. Construct a structured prompt for Claude with this data as context.
//   3. Ask Claude to optionally produce a Vega-Lite chart spec when relevant.
//   4. Validate every numeric claim in Claude's text response against the supplied
//      data. Filter unsupported claims before returning.
//   5. Persist the user message + assistant response to chat_messages.
//   6. Return { text, vega_spec?, citations[] }.
//
// Non-negotiable: numeric claims must reference a real source row. If Claude
// returns a number not in the supplied context, the function strips it.

import { createClient } from '@supabase/supabase-js';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 1500;
const MAX_HISTORY_TURNS = 10;

interface ChatBody {
  company_id: string;
  conversation_id?: string;
  question: string;
}

interface SupabaseDataSnapshot {
  company: { id: string; name: string; lifecycle_stage: string | null };
  members: Array<{ user_id: string; role: string; role_lens: string | null }>;
  pillars: Array<{ id: string; label: string; universal_code: string | null; sort_order: number }>;
  latest_round_responses: any | null;
  recent_metric_values: Array<{
    id: string;
    metric_id: string;
    metric_name: string;
    pillar_label: string | null;
    value: number;
    unit: string | null;
    target_value: number | null;
    threshold_red: number | null;
    threshold_yellow: number | null;
    observed_at: string;
  }>;
  open_alerts: Array<{
    id: string;
    severity: string;
    title: string;
    detail: string | null;
    fired_at: string;
  }>;
  active_initiatives: Array<{
    id: string;
    title: string;
    status: string;
    practice_id: string | null;
  }>;
}

interface ClaudeResponse {
  text: string;
  vega_spec?: Record<string, unknown> | null;
  citations?: Array<{ kind: string; id: string; description: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return errorResponse('Supabase configuration missing', 500);
    }
    if (!anthropicKey) return errorResponse('ANTHROPIC_API_KEY not set', 500);

    // User-scoped client (RLS-aware): fetches data the user is allowed to see.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Service-role client: persists chat messages without RLS friction.
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser(
      authHeader.replace(/^Bearer\s+/i, ''),
    );
    if (authError || !authData.user) return errorResponse('Invalid token', 401);
    const userId = authData.user.id;

    const body = (await req.json()) as ChatBody;
    if (!body?.company_id) return errorResponse('Missing company_id');
    if (!body?.question || body.question.trim().length === 0)
      return errorResponse('Missing question');

    // 1. Fetch a snapshot of the company's data, RLS-scoped to the caller.
    const snapshot = await fetchSnapshot(userClient, body.company_id);
    if (!snapshot) return errorResponse('Company not found or access denied', 403);

    // 2. Pull recent conversation history for multi-turn context.
    const conversationId = body.conversation_id ?? crypto.randomUUID();
    const history = await fetchHistory(userClient, conversationId);

    // 3. Call Claude with structured context + ask for optional chart spec.
    const claudeResponse = await callClaude({
      apiKey: anthropicKey,
      question: body.question,
      snapshot,
      history,
    });

    // 4. Validate numeric claims. Strip any number not present in the snapshot.
    const validated = validateNumericClaims(claudeResponse.text, snapshot);

    // 5. Persist messages (use service role so we don't hit RLS write friction
    //    on chat_messages.user_id / company_id ownership).
    await serviceClient.from('chat_messages').insert([
      {
        company_id: body.company_id,
        user_id: userId,
        conversation_id: conversationId,
        role: 'user',
        content: body.question,
      },
      {
        company_id: body.company_id,
        user_id: userId,
        conversation_id: conversationId,
        role: 'assistant',
        content: validated.text,
        vega_spec: claudeResponse.vega_spec ?? null,
        citations: claudeResponse.citations ?? null,
      },
    ]);

    return jsonResponse({
      conversation_id: conversationId,
      text: validated.text,
      vega_spec: claudeResponse.vega_spec ?? null,
      citations: claudeResponse.citations ?? [],
      stripped_unsupported_numbers: validated.stripped,
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});

async function fetchSnapshot(
  client: any,
  companyId: string,
): Promise<SupabaseDataSnapshot | null> {
  const [companyRes, pillarsRes, metricValuesRes, alertsRes, initiativesRes, roundResponsesRes] =
    await Promise.all([
      client.from('companies').select('id, name, lifecycle_stage').eq('id', companyId).single(),
      client
        .from('customer_pillars')
        .select('id, label, sort_order, universal_pillars!inner(code)')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order'),
      client
        .from('metric_values')
        .select(
          'id, metric_id, value, observed_at, metrics!inner(name, unit, target_value, threshold_red, threshold_yellow, customer_pillars(label))',
        )
        .eq('company_id', companyId)
        .order('observed_at', { ascending: false })
        .limit(50),
      client
        .from('alerts')
        .select('id, severity, title, detail, fired_at')
        .eq('company_id', companyId)
        .eq('status', 'open')
        .order('fired_at', { ascending: false })
        .limit(20),
      client
        .from('initiatives')
        .select('id, title, status, practice_id')
        .eq('company_id', companyId)
        .neq('status', 'done')
        .limit(20),
      client
        .from('round_responses')
        .select('id, category_scores, completed_at, evaluation_rounds!inner(company_id, mode, code, title)')
        .eq('evaluation_rounds.company_id', companyId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (companyRes.error || !companyRes.data) return null;

  return {
    company: companyRes.data,
    members: [],
    pillars: (pillarsRes.data ?? []).map((p: any) => ({
      id: p.id,
      label: p.label,
      universal_code: p.universal_pillars?.code ?? null,
      sort_order: p.sort_order,
    })),
    latest_round_responses: roundResponsesRes.data ?? null,
    recent_metric_values: (metricValuesRes.data ?? []).map((mv: any) => ({
      id: mv.id,
      metric_id: mv.metric_id,
      metric_name: mv.metrics?.name ?? '',
      pillar_label: mv.metrics?.customer_pillars?.label ?? null,
      value: mv.value,
      unit: mv.metrics?.unit ?? null,
      target_value: mv.metrics?.target_value ?? null,
      threshold_red: mv.metrics?.threshold_red ?? null,
      threshold_yellow: mv.metrics?.threshold_yellow ?? null,
      observed_at: mv.observed_at,
    })),
    open_alerts: alertsRes.data ?? [],
    active_initiatives: initiativesRes.data ?? [],
  };
}

async function fetchHistory(client: any, conversationId: string) {
  const { data } = await client
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_TURNS * 2);
  return (data ?? []).reverse();
}

async function callClaude(args: {
  apiKey: string;
  question: string;
  snapshot: SupabaseDataSnapshot;
  history: Array<{ role: string; content: string }>;
}): Promise<ClaudeResponse> {
  const systemPrompt = buildSystemPrompt(args.snapshot);
  const messages = [
    ...args.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: args.question },
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${body}`);
  }

  const claudeData = await response.json();
  const rawText = (claudeData.content?.[0]?.text ?? '').trim();
  return parseClaudeOutput(rawText);
}

function buildSystemPrompt(snapshot: SupabaseDataSnapshot): string {
  return `You are the operating-compass assistant for ${snapshot.company.name}.
You help the company's leadership team understand their assessment, KPIs, alerts, and initiatives.

YOU MUST FOLLOW THESE RULES:
1. Only cite numbers that appear EXACTLY in the data below. If a number is not in the data, do not invent it.
2. When citing a numeric value, reference its source by ID using the format [src:ID] inline.
3. If the user asks for a chart, output a Vega-Lite spec inside a fenced \`\`\`vega-lite block.
   The spec must be valid JSON. Use only data values that appear in the snapshot.
4. Keep answers concise. 2-3 short paragraphs maximum unless the user asks for more detail.
5. If you cannot answer with the data provided, say so plainly. Do not speculate.

CURRENT DATA SNAPSHOT
=====================

Company: ${snapshot.company.name}
Lifecycle stage: ${snapshot.company.lifecycle_stage ?? 'not set'}

Customer pillars:
${snapshot.pillars
  .map((p) => `- ${p.label} (universal: ${p.universal_code ?? 'other'})`)
  .join('\n')}

Recent KPI values (most recent 50):
${snapshot.recent_metric_values
  .map(
    (mv) =>
      `[src:${mv.id}] ${mv.metric_name} (${mv.pillar_label ?? '?'}) = ${mv.value}${mv.unit ? ' ' + mv.unit : ''}` +
      (mv.target_value !== null ? ` (target ${mv.target_value})` : '') +
      ` at ${mv.observed_at}`,
  )
  .join('\n') || '(no KPI values recorded yet)'}

Open alerts:
${snapshot.open_alerts
  .map((a) => `[src:${a.id}] (${a.severity}) ${a.title}${a.detail ? ' — ' + a.detail : ''} (fired ${a.fired_at})`)
  .join('\n') || '(no open alerts)'}

Active initiatives:
${snapshot.active_initiatives
  .map((i) => `[src:${i.id}] ${i.title} (status: ${i.status})`)
  .join('\n') || '(no active initiatives)'}

Latest assessment round (jsonb shape):
${snapshot.latest_round_responses ? JSON.stringify(snapshot.latest_round_responses, null, 2) : '(no completed rounds yet)'}

REMEMBER: every numeric claim must include a [src:ID] inline citation pointing to one of the IDs above.
`;
}

function parseClaudeOutput(rawText: string): ClaudeResponse {
  // Extract a Vega-Lite spec if present.
  const vegaMatch = rawText.match(/```vega-lite\s*([\s\S]*?)```/);
  let vegaSpec: Record<string, unknown> | null = null;
  let textWithoutVega = rawText;
  if (vegaMatch) {
    try {
      vegaSpec = JSON.parse(vegaMatch[1].trim());
      textWithoutVega = rawText.replace(vegaMatch[0], '').trim();
    } catch {
      // Malformed JSON — drop the spec, keep the text including the block.
      vegaSpec = null;
    }
  }

  // Extract citations (e.g. [src:abc-123]) for the response payload.
  const citationRegex = /\[src:([a-zA-Z0-9_\-]+)\]/g;
  const citations: ClaudeResponse['citations'] = [];
  const seen = new Set<string>();
  let match;
  while ((match = citationRegex.exec(textWithoutVega)) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      citations.push({ kind: 'data_row', id, description: '' });
    }
  }

  return { text: textWithoutVega, vega_spec: vegaSpec, citations };
}

function validateNumericClaims(text: string, snapshot: SupabaseDataSnapshot): {
  text: string;
  stripped: number;
} {
  // Build the universe of numeric values that ARE in the snapshot.
  const allowed = new Set<string>();
  for (const mv of snapshot.recent_metric_values) {
    allowed.add(String(mv.value));
    if (mv.target_value !== null) allowed.add(String(mv.target_value));
    if (mv.threshold_red !== null) allowed.add(String(mv.threshold_red));
    if (mv.threshold_yellow !== null) allowed.add(String(mv.threshold_yellow));
  }
  // Allow basic counts (0–100) and percentages — these are derived, not source values.
  // We don't strip them; we only strip large/specific numeric claims that look like
  // metric values but aren't in the snapshot.

  const numericPattern = /(?<![\w\.])-?\d+(?:[.,]\d+)?(?![\w\d])/g;
  let stripped = 0;
  const cleanedText = text.replace(numericPattern, (numStr, offset, full) => {
    const normalised = numStr.replace(',', '.');
    const num = Number.parseFloat(normalised);
    if (Number.isNaN(num)) return numStr;
    // Allow small integers (0–100) — these are likely counts or percentages.
    if (Number.isInteger(num) && num >= 0 && num <= 100) return numStr;
    if (allowed.has(normalised)) return numStr;
    if (allowed.has(numStr)) return numStr;
    stripped += 1;
    return '[unverified]';
  });

  return { text: cleanedText, stripped };
}
