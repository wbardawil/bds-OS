// BDS OS — Engine 5: Evidence & Grading Engine
// AI-assisted evaluation of evidence against maturity rubrics.
//
// Produces structured grading results for UI rendering.
// Human verification is always required after AI grading.

import type { Evidence, MaturityLevel, Practice } from '../types/database.js';
import type { AIGradePayload } from '../types/database.js';

// ─── Grading Input ───────────────────────────────────────────────────────────

export interface EvidenceGradingInput {
  evidence: Evidence;
  practice: Practice;
  maturity_levels: MaturityLevel[];
  current_level: number;
}

// ─── Grading Result (structured for UI rendering) ────────────────────────────

export interface EvidenceGradingResult {
  evidence_id: string;
  practice_id: number;
  practice_name: string;

  rubric_mapping: {
    matched_level: number;
    matched_descriptor: string;
    criteria_alignment: CriteriaAlignmentItem[];
  };

  completeness_score: number; // 0–100
  quality_score: number;      // 0–100

  risk_flags: RiskFlag[];

  level_proposal: number; // 1–5
  confidence: number;     // 0–1
  rationale: string;

  recommendation: GradingRecommendation;
}

export interface CriteriaAlignmentItem {
  criterion: string;
  met: boolean;
  evidence_excerpt: string | null;
}

export interface RiskFlag {
  severity: 'high' | 'medium' | 'low';
  category: 'incomplete_evidence' | 'quality_concern' | 'staleness' | 'inconsistency' | 'scope_mismatch';
  message: string;
}

export type GradingRecommendation =
  | { action: 'approve'; reason: string }
  | { action: 'request_more_evidence'; missing: string[] }
  | { action: 'flag_for_review'; concerns: string[] };

// ─── Grading Logic ───────────────────────────────────────────────────────────

/**
 * Grade a piece of evidence against the practice's maturity rubric.
 *
 * This function performs deterministic rubric matching and scoring.
 * In production, the AI coaching layer would augment this with
 * natural language analysis of artifact content.
 */
export function gradeEvidence(input: EvidenceGradingInput): EvidenceGradingResult {
  const { evidence, practice, maturity_levels, current_level } = input;

  // Sort levels ascending
  const sortedLevels = [...maturity_levels].sort((a, b) => a.level - b.level);

  // Determine the target level (one above current)
  const targetLevel = Math.min(current_level + 1, 5);
  const targetRubric = sortedLevels.find((ml) => ml.level === targetLevel);

  if (!targetRubric) {
    return createFailedResult(evidence, practice, 'No rubric found for target level');
  }

  // Parse evidence criteria into individual checkpoints
  const criteria = parseEvidenceCriteria(targetRubric.evidence_criteria);

  // Evaluate each criterion against the evidence description
  const alignmentItems: CriteriaAlignmentItem[] = criteria.map((criterion) => {
    const met = evaluateCriterion(criterion, evidence.description);
    return {
      criterion,
      met,
      evidence_excerpt: met ? extractRelevantExcerpt(evidence.description, criterion) : null,
    };
  });

  const metCount = alignmentItems.filter((a) => a.met).length;
  const totalCriteria = alignmentItems.length;

  // Completeness: what % of criteria are met
  const completenessScore = totalCriteria > 0
    ? Math.round((metCount / totalCriteria) * 100)
    : 0;

  // Quality: base score from completeness, boosted by evidence depth
  const descriptionDepth = Math.min(100, Math.round((evidence.description.length / 500) * 100));
  const qualityScore = Math.round((completenessScore * 0.7) + (descriptionDepth * 0.3));

  // Risk flags
  const riskFlags: RiskFlag[] = [];

  if (completenessScore < 50) {
    riskFlags.push({
      severity: 'high',
      category: 'incomplete_evidence',
      message: `Only ${metCount} of ${totalCriteria} criteria addressed`,
    });
  }

  if (evidence.description.length < 100) {
    riskFlags.push({
      severity: 'medium',
      category: 'quality_concern',
      message: 'Evidence description is very brief; may lack sufficient detail',
    });
  }

  if (targetLevel - current_level > 1) {
    riskFlags.push({
      severity: 'medium',
      category: 'scope_mismatch',
      message: `Attempting to skip from level ${current_level} to level ${targetLevel}`,
    });
  }

  // Confidence: based on completeness and quality
  const confidence = Math.round(Math.min(1, (completenessScore / 100) * 0.6 + (qualityScore / 100) * 0.4) * 1000) / 1000;

  // Level proposal
  let levelProposal: number;
  if (completenessScore >= 80) {
    levelProposal = targetLevel;
  } else if (completenessScore >= 50) {
    levelProposal = current_level; // Not enough for upgrade
  } else {
    levelProposal = current_level;
  }

  // Recommendation
  let recommendation: GradingRecommendation;
  if (completenessScore >= 80 && qualityScore >= 60) {
    recommendation = {
      action: 'approve',
      reason: `Evidence meets ${metCount}/${totalCriteria} criteria with sufficient quality`,
    };
  } else if (completenessScore >= 50) {
    const missing = alignmentItems
      .filter((a) => !a.met)
      .map((a) => a.criterion);
    recommendation = {
      action: 'request_more_evidence',
      missing,
    };
  } else {
    recommendation = {
      action: 'flag_for_review',
      concerns: riskFlags.map((f) => f.message),
    };
  }

  // Rationale
  const rationale = buildRationale(practice.name, targetLevel, completenessScore, qualityScore, metCount, totalCriteria);

  return {
    evidence_id: evidence.id,
    practice_id: practice.id,
    practice_name: practice.name,
    rubric_mapping: {
      matched_level: levelProposal,
      matched_descriptor: sortedLevels.find((ml) => ml.level === levelProposal)?.descriptor ?? '',
      criteria_alignment: alignmentItems,
    },
    completeness_score: completenessScore,
    quality_score: qualityScore,
    risk_flags: riskFlags,
    level_proposal: levelProposal,
    confidence,
    rationale,
    recommendation,
  };
}

/**
 * Convert a grading result into the AI grade payload stored in score_change_requests.
 */
export function toAIGradePayload(result: EvidenceGradingResult): AIGradePayload {
  return {
    rubric_mapping: {
      matched_level: result.rubric_mapping.matched_level,
      matched_descriptor: result.rubric_mapping.matched_descriptor,
    },
    completeness_score: result.completeness_score,
    quality_score: result.quality_score,
    risk_flags: result.risk_flags.map((f) => `[${f.severity}] ${f.message}`),
    level_proposal: result.level_proposal,
    confidence: result.confidence,
    rationale: result.rationale,
  };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function parseEvidenceCriteria(criteria: string): string[] {
  return criteria
    .split(/[;.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function evaluateCriterion(criterion: string, evidenceDescription: string): boolean {
  const keywords = criterion
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const description = evidenceDescription.toLowerCase();
  const matchCount = keywords.filter((kw) => description.includes(kw)).length;
  return keywords.length > 0 && matchCount / keywords.length >= 0.4;
}

function extractRelevantExcerpt(description: string, criterion: string): string | null {
  const keywords = criterion.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const sentences = description.split(/[.!?]+/);
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (keywords.some((kw) => lower.includes(kw))) {
      return sentence.trim().slice(0, 200);
    }
  }
  return null;
}

function buildRationale(
  practiceName: string,
  targetLevel: number,
  completeness: number,
  quality: number,
  metCount: number,
  totalCriteria: number,
): string {
  const status = completeness >= 80 ? 'sufficient' : completeness >= 50 ? 'partial' : 'insufficient';
  return `Evidence for "${practiceName}" targeting Level ${targetLevel}: ${status}. `
    + `${metCount} of ${totalCriteria} criteria addressed (${completeness}% completeness, ${quality}% quality).`;
}

function createFailedResult(
  evidence: Evidence,
  practice: Practice,
  error: string,
): EvidenceGradingResult {
  return {
    evidence_id: evidence.id,
    practice_id: practice.id,
    practice_name: practice.name,
    rubric_mapping: {
      matched_level: 0,
      matched_descriptor: '',
      criteria_alignment: [],
    },
    completeness_score: 0,
    quality_score: 0,
    risk_flags: [{
      severity: 'high',
      category: 'scope_mismatch',
      message: error,
    }],
    level_proposal: 0,
    confidence: 0,
    rationale: error,
    recommendation: {
      action: 'flag_for_review',
      concerns: [error],
    },
  };
}
