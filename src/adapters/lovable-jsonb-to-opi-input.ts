// Adapter: Lovable's round_responses.category_scores (jsonb) -> OPIInput[].
//
// Lovable stores per-respondent scores in a free-form jsonb column. The OPI
// engine wants flat per-question records merged with practice_metadata.
//
// ASSUMED INPUT SHAPE (verify against submit-round-response source in M2):
//
//   {
//     "<category_key>": {
//       "<question_id>": { "importance": <1..5>, "competency": <1..5> },
//       ...
//     },
//     ...
//   }
//
// Falls back to a flat shape:
//
//   { "<question_id>": { "importance": <1..5>, "competency": <1..5> } }
//
// Aggregation across respondents (averaging) lives here too because rounds in
// Lovable allow many respondents per round but the OPI engine wants one input
// per question per round.

import type { OPIInput } from '../types/opi.js';

export interface PracticeMetadataRow {
  question_id: string;
  category: string;
  pnl_impact: number;
  speed_to_impact: number;
  dependency_score: number;
  risk_floor: boolean;
  risk_floor_level: number | null;
}

export interface AggregatedScore {
  question_id: string;
  importance: number;
  competency: number;
}

type CategoryScores = Record<string, unknown>;

/**
 * Flatten one respondent's category_scores jsonb into per-question entries.
 * Tolerates both the nested {category: {question: {...}}} shape and the flat
 * {question: {...}} shape. Throws on shapes it doesn't recognize.
 */
export function flattenCategoryScores(jsonb: CategoryScores): AggregatedScore[] {
  const out: AggregatedScore[] = [];
  for (const [key, value] of Object.entries(jsonb)) {
    if (value === null || typeof value !== 'object') continue;

    if (looksLikeScore(value)) {
      out.push({ question_id: key, ...readScore(value) });
      continue;
    }

    for (const [qid, qval] of Object.entries(value as Record<string, unknown>)) {
      if (!looksLikeScore(qval)) {
        throw new Error(`Unrecognized score shape at ${key}.${qid}`);
      }
      out.push({ question_id: qid, ...readScore(qval) });
    }
  }
  return out;
}

function looksLikeScore(v: unknown): v is { importance: number; competency: number } {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.importance === 'number' && typeof o.competency === 'number';
}

function readScore(v: unknown): { importance: number; competency: number } {
  const o = v as { importance: number; competency: number };
  return { importance: o.importance, competency: o.competency };
}

/**
 * Average per-question scores across many respondents.
 */
export function aggregateRespondents(
  respondentScores: AggregatedScore[][],
): AggregatedScore[] {
  const sums = new Map<string, { imp: number; cmp: number; n: number }>();
  for (const round of respondentScores) {
    for (const s of round) {
      const cur = sums.get(s.question_id) ?? { imp: 0, cmp: 0, n: 0 };
      cur.imp += s.importance;
      cur.cmp += s.competency;
      cur.n += 1;
      sums.set(s.question_id, cur);
    }
  }
  return Array.from(sums.entries()).map(([question_id, { imp, cmp, n }]) => ({
    question_id,
    importance: imp / n,
    competency: cmp / n,
  }));
}

/**
 * Merge aggregated per-question scores with practice_metadata to produce
 * inputs for the OPI engine.
 *
 * The OPI engine in src/engines/opi.ts uses a numeric `practice_id` field;
 * Lovable's questions are keyed by string. We assign sequential numeric ids
 * here and return a Map so the caller can rehydrate question_ids when
 * persisting opi_scores.
 *
 * Returns:
 *   - inputs: OPIInput[] for the engine
 *   - idMap:  numeric practice_id -> Lovable question_id
 *   - missingMetadata: question_ids the round mentioned but practice_metadata
 *                      doesn't have (skipped, surfaced for warning)
 */
export function toOPIInputs(
  aggregated: AggregatedScore[],
  metadata: PracticeMetadataRow[],
): { inputs: OPIInput[]; idMap: Map<number, string>; missingMetadata: string[] } {
  const meta = new Map(metadata.map((m) => [m.question_id, m]));
  const inputs: OPIInput[] = [];
  const idMap = new Map<number, string>();
  const missing: string[] = [];

  let nextId = 1;
  for (const s of aggregated) {
    const m = meta.get(s.question_id);
    if (!m) {
      missing.push(s.question_id);
      continue;
    }
    const numericId = nextId++;
    idMap.set(numericId, s.question_id);
    inputs.push({
      practice_id: numericId,
      importance_score: s.importance,
      competency_score: s.competency,
      pnl_impact: m.pnl_impact,
      speed_to_impact: m.speed_to_impact,
      dependency_score: m.dependency_score,
      risk_floor: m.risk_floor,
      risk_floor_level: m.risk_floor_level,
    });
  }

  return { inputs, idMap, missingMetadata: missing };
}
