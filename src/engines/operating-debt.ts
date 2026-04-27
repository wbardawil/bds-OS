// BDS OS — Operating Debt Engine
// Quantifies the organization's "operating debt" — the gap between current state
// and minimum acceptable operational maturity.
//
// Derived from:
//   - Practices below Level 2 (foundational gaps)
//   - Expired evidence (staleness risk)
//   - Risk floor breaches (practices below their minimum acceptable level)

import type { PracticeMetadata, Evidence, MaturityLevel } from '../types/database.js';
import type {
  OperatingDebt,
  PracticeDebtItem,
  ExpiredEvidenceItem,
  RiskFloorBreach,
} from '../types/governance.js';

export interface OperatingDebtInput {
  practice_scores: PracticeScoreSnapshot[];
  practice_metadata: PracticeMetadata[];
  evidence_items: EvidenceWithExpiry[];
  practice_names: Map<number, string>;
  area_names: Map<number, string>;
  practice_area_map: Map<number, number>;
}

export interface PracticeScoreSnapshot {
  practice_id: number;
  competency_score: number;
}

export interface EvidenceWithExpiry {
  evidence_id: string;
  practice_id: number;
  created_at: string;
  expiry_period_days: number | null;
}

/**
 * Calculate the organization's operating debt.
 *
 * Total debt score is a weighted sum:
 *   - Each practice below Level 2: +2 points (foundational)
 *   - Each expired evidence: +1 point (staleness)
 *   - Each risk floor breach: +3 points (critical gap)
 */
export function calculateOperatingDebt(input: OperatingDebtInput): OperatingDebt {
  const {
    practice_scores,
    practice_metadata,
    evidence_items,
    practice_names,
    area_names,
    practice_area_map,
  } = input;

  // 1. Practices below Level 2
  const practicesBelowLevel2: PracticeDebtItem[] = practice_scores
    .filter((ps) => ps.competency_score < 2)
    .map((ps) => {
      const meta = practice_metadata.find((m) => m.practice_id === ps.practice_id);
      const areaId = practice_area_map.get(ps.practice_id) ?? 0;
      return {
        practice_id: ps.practice_id,
        practice_name: practice_names.get(ps.practice_id) ?? `Practice ${ps.practice_id}`,
        area_name: area_names.get(areaId) ?? `Area ${areaId}`,
        current_level: ps.competency_score,
        risk_floor: meta?.risk_floor ?? false,
      };
    });

  // 2. Expired evidence
  const now = Date.now();
  const expiredEvidenceItems: ExpiredEvidenceItem[] = evidence_items
    .filter((ev) => {
      if (!ev.expiry_period_days) return false;
      const createdAt = new Date(ev.created_at).getTime();
      const expiresAt = createdAt + ev.expiry_period_days * 24 * 60 * 60 * 1000;
      return now > expiresAt;
    })
    .map((ev) => {
      const createdAt = new Date(ev.created_at).getTime();
      const expiresAt = createdAt + ev.expiry_period_days! * 24 * 60 * 60 * 1000;
      const daysOverdue = Math.ceil((now - expiresAt) / (24 * 60 * 60 * 1000));
      return {
        evidence_id: ev.evidence_id,
        practice_id: ev.practice_id,
        practice_name: practice_names.get(ev.practice_id) ?? `Practice ${ev.practice_id}`,
        expired_at: new Date(expiresAt).toISOString(),
        days_overdue: daysOverdue,
      };
    });

  // 3. Risk floor breaches
  const riskFloorBreaches: RiskFloorBreach[] = [];
  for (const meta of practice_metadata) {
    if (!meta.risk_floor || meta.risk_floor_level === null) continue;

    const score = practice_scores.find((ps) => ps.practice_id === meta.practice_id);
    if (!score) continue;

    if (score.competency_score < meta.risk_floor_level) {
      const gap = meta.risk_floor_level - score.competency_score;
      riskFloorBreaches.push({
        practice_id: meta.practice_id,
        practice_name: practice_names.get(meta.practice_id) ?? `Practice ${meta.practice_id}`,
        risk_floor_level: meta.risk_floor_level,
        current_level: score.competency_score,
        gap,
        severity: gap >= 2 ? 'critical' : 'warning',
      });
    }
  }

  // Total debt score
  const totalDebtScore =
    practicesBelowLevel2.length * 2 +
    expiredEvidenceItems.length * 1 +
    riskFloorBreaches.length * 3;

  // Debt trend (requires historical comparison — placeholder for single-point calculation)
  const debtTrend: OperatingDebt['debt_trend'] = 'stable';

  return {
    total_debt_score: totalDebtScore,
    practices_below_level_2: practicesBelowLevel2,
    expired_evidence_count: expiredEvidenceItems.length,
    expired_evidence_items: expiredEvidenceItems,
    risk_floor_breaches: riskFloorBreaches,
    debt_trend: debtTrend,
  };
}
