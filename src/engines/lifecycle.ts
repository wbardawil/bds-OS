// BDS OS — Engine 0: Lifecycle Stage Determination
// Derives organization lifecycle stage from revenue + employee count.

import type { LifecycleStage } from '../types/database.js';

export interface LifecycleInput {
  revenue_range: string | null;
  employee_count: number | null;
}

// Revenue range parsing: convert string ranges to numeric midpoints
const REVENUE_MIDPOINTS: Record<string, number> = {
  'pre-revenue': 0,
  '0-100k': 50_000,
  '100k-500k': 300_000,
  '500k-1m': 750_000,
  '1m-5m': 3_000_000,
  '5m-10m': 7_500_000,
  '10m-25m': 17_500_000,
  '25m-50m': 37_500_000,
  '50m-100m': 75_000_000,
  '100m+': 150_000_000,
};

function parseRevenue(range: string | null): number {
  if (!range) return 0;
  const normalized = range.toLowerCase().replace(/\s/g, '');
  return REVENUE_MIDPOINTS[normalized] ?? 0;
}

/**
 * Determines the organization's lifecycle stage based on revenue and employee count.
 *
 * Thresholds:
 *   Startup:  < $1M revenue OR < 10 employees
 *   Growth:   $1M–$10M revenue AND 10–50 employees
 *   Scale:    $10M–$50M revenue AND 50–200 employees
 *   Mature:   > $50M revenue OR > 200 employees
 *
 * When revenue and employee signals conflict, the higher stage wins
 * (e.g., $60M revenue with 30 employees → mature, because revenue signals maturity).
 */
export function determineLifecycleStage(input: LifecycleInput): LifecycleStage {
  const revenue = parseRevenue(input.revenue_range);
  const employees = input.employee_count ?? 0;

  // Determine stage by revenue
  let revenueStage: LifecycleStage;
  if (revenue >= 50_000_000) {
    revenueStage = 'mature';
  } else if (revenue >= 10_000_000) {
    revenueStage = 'scale';
  } else if (revenue >= 1_000_000) {
    revenueStage = 'growth';
  } else {
    revenueStage = 'startup';
  }

  // Determine stage by employee count
  let employeeStage: LifecycleStage;
  if (employees > 200) {
    employeeStage = 'mature';
  } else if (employees >= 50) {
    employeeStage = 'scale';
  } else if (employees >= 10) {
    employeeStage = 'growth';
  } else {
    employeeStage = 'startup';
  }

  // Take the higher of the two signals
  const stageOrder: LifecycleStage[] = ['startup', 'growth', 'scale', 'mature'];
  const revenueIndex = stageOrder.indexOf(revenueStage);
  const employeeIndex = stageOrder.indexOf(employeeStage);

  return stageOrder[Math.max(revenueIndex, employeeIndex)];
}
