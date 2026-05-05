// Adapter: Lovable's round_responses.category_scores (jsonb) -> OPIInput[].
//
// Lovable stores per-respondent scores in a free-form jsonb column. The OPI
// engine wants flat per-question records merged with practice_metadata.
//
// VERIFIED INPUT SHAPE (from strategy-spark-86/src/pages/RoundAssessment.tsx,
// confirmed 2026-05-05):
//
//   {
//     "<category_key>": {
//       "competencyAvg": number,
//       "importanceAvg": number,
//       "gap": number,
//       "responses": [
//         { "questionId": "<id>", "competency": <1..5>, "importance": <1..5> },
//         ...
//       ]
//     },
//     ...
//   }
//
// We pull from `responses` only. The per-category aggregates (competencyAvg,
// importanceAvg, gap) are ignored because the OPI engine recomputes everything
// per-question using practice_metadata weights.
//
// Note: questionId is camelCase in jsonb; we expose snake_case `question_id`
// in our internal types since that's the column name everywhere downstream.

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
 * Reads from each category's `responses[]` array. Throws if a response item
 * is missing the expected questionId/competency/importance fields.
 */
export function flattenCategoryScores(jsonb: CategoryScores): AggregatedScore[] {
  const out: AggregatedScore[] = [];
  for (const [, catData] of Object.entries(jsonb)) {
    if (!catData || typeof catData !== 'object') continue;
    const responses = (catData as { responses?: unknown }).responses;
    if (!Array.isArray(responses)) continue;
    for (const r of responses as Array<Record<string, unknown>>) {
      if (typeof r?.questionId !== 'string'
        || typeof r?.competency !== 'number'
        || typeof r?.importance !== 'number') {
        throw new Error(`Invalid response shape: ${JSON.stringify(r)}`);
      }
      out.push({
        question_id: r.questionId,
        importance: r.importance,
        competency: r.competency,
      });
    }
  }
  return out;
}

/**
 * Average per-question scores across many respondents. Lovable allows many
 * respondents per round; the OPI engine wants one input per question per round.
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
 * inputs for the OPI engine. The engine uses a numeric `practice_id`; we
 * assign sequential ids and return a Map so the caller can rehydrate the
 * Lovable string `question_id` when persisting `opi_scores`.
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
